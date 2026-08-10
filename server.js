const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const nodemailer = require('nodemailer');
require('dotenv').config();

const rootDir = __dirname;
const dataFile = path.join(rootDir, 'data', 'submissions.json');
const port = process.env.PORT || 3000;
const recipientEmail = process.env.TO_EMAIL || 'yourchoicetrips@gmail.com';

function ensureDataStore() {
  if (!fs.existsSync(dataFile)) {
    fs.mkdirSync(path.dirname(dataFile), { recursive: true });
    fs.writeFileSync(dataFile, '[]', 'utf8');
  }
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.js':
      return 'application/javascript; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.svg':
      return 'image/svg+xml';
    default:
      return 'application/octet-stream';
  }
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function serveFile(res, filePath) {
  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    res.writeHead(200, { 'Content-Type': getContentType(filePath) });
    res.end(content);
  });
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) {
        req.destroy();
      }
    });

    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        resolve({});
      }
    });
  });
}

function formatSubmissionDetails(payload) {
  return Object.entries(payload)
    .map(([key, value]) => {
      const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase());
      return `${label}: ${value || 'N/A'}`;
    })
    .join('\n');
}

async function sendSubmissionEmail(type, payload) {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpUser || !smtpPass) {
    throw new Error('SMTP credentials are missing. Set SMTP_USER and SMTP_PASS in your environment before sending emails.');
  }

  const senderName = 'Your Choice Trips';
  const sender = smtpUser;
  const name = payload.name || payload.contactName || 'Customer';
  const email = payload.email || payload.contactEmail || 'Not provided';
  const subject = type === 'enquiry'
    ? `New travel enquiry from ${name}`
    : `New contact request from ${name}`;
  const content = formatSubmissionDetails(payload);

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  await transporter.sendMail({
    from: `${senderName} <${sender}>`,
    to: recipientEmail,
    replyTo: email,
    subject,
    text: `You have a new ${type === 'enquiry' ? 'travel enquiry' : 'contact request'} from ${name}.\n\n${content}`,
    html: `
      <h2>New ${type === 'enquiry' ? 'travel enquiry' : 'contact request'}</h2>
      <p><strong>From:</strong> ${name} (${email})</p>
      <pre style="white-space: pre-wrap; font-family: Arial, sans-serif;">${content}</pre>
    `,
  });
}

const server = http.createServer(async (req, res) => {
  ensureDataStore();

  const requestUrl = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'POST' && requestUrl.pathname === '/api/enquiry') {
    const payload = await parseBody(req);
    const submissions = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    submissions.push({ type: 'enquiry', ...payload, createdAt: new Date().toISOString() });
    fs.writeFileSync(dataFile, JSON.stringify(submissions, null, 2), 'utf8');

    try {
      await sendSubmissionEmail('enquiry', payload);
      sendJson(res, 200, { ok: true, message: 'Thank you! We have received your enquiry.' });
    } catch (error) {
      console.error('Failed to send enquiry email:', error.message);
      sendJson(res, 500, {
        ok: false,
        message: 'Your enquiry was saved, but the email notification could not be sent. Please contact us directly at yourchoicetrips@gmail.com.',
      });
    }
    return;
  }

  if (req.method === 'POST' && requestUrl.pathname === '/api/contact') {
    const payload = await parseBody(req);
    const submissions = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    submissions.push({ type: 'contact', ...payload, createdAt: new Date().toISOString() });
    fs.writeFileSync(dataFile, JSON.stringify(submissions, null, 2), 'utf8');

    try {
      await sendSubmissionEmail('contact', payload);
      sendJson(res, 200, { ok: true, message: 'Thanks! We will be in touch shortly.' });
    } catch (error) {
      console.error('Failed to send contact email:', error.message);
      sendJson(res, 500, {
        ok: false,
        message: 'Your request was saved, but the email notification could not be sent. Please contact us directly at yourchoicetrips@gmail.com.',
      });
    }
    return;
  }

  let requestedPath = requestUrl.pathname === '/' ? '/index.html' : requestUrl.pathname;
  let filePath = path.join(rootDir, requestedPath.replace(/^\/+/, ''));

  if (!filePath.startsWith(rootDir)) {
    sendJson(res, 403, { error: 'Forbidden' });
    return;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  serveFile(res, filePath);
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
