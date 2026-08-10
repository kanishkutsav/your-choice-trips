const nodemailer = require('nodemailer');

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        message: 'Method not allowed.',
      }),
    };
  }

  try {
    const payload = JSON.parse(event.body || '{}');

    const {
      formType,
      name,
      email,
      destination,
      date,
      contactName,
      contactEmail,
      interest,
      message,
    } = payload;

    const isTripEnquiry = formType === 'enquiry';

    const customerName = isTripEnquiry
      ? name
      : contactName;

    const customerEmail = isTripEnquiry
      ? email
      : contactEmail;

    if (!customerName || !customerEmail) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success: false,
          message: 'Name and email are required.',
        }),
      };
    }

    const smtpUser = (process.env.SMTP_USER || '').trim();
    const smtpPassword = (process.env.SMTP_PASSWORD || '').replace(/\s/g, '');
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = Number(process.env.SMTP_PORT || 465);

    if (!smtpUser || !smtpPassword) {
      console.error('SMTP credentials are missing.');

      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success: false,
          message: 'Email service is not configured.',
        }),
      };
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    });

    let subject;
    let emailHtml;
    let emailText;

    if (isTripEnquiry) {
      subject = `New Trip Enquiry - ${customerName}`;

      emailHtml = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #17212b;">
          <h2 style="color: #0f7a6b;">New Trip Enquiry</h2>

          <p>
            Someone has submitted a new trip enquiry through
            <strong>Your Choice Trips</strong>.
          </p>

          <hr>

          <p><strong>Name:</strong> ${escapeHtml(customerName)}</p>
          <p><strong>Email:</strong> ${escapeHtml(customerEmail)}</p>
          <p><strong>Destination:</strong> ${escapeHtml(destination || 'Not specified')}</p>
          <p><strong>Travel Date:</strong> ${escapeHtml(date || 'Not specified')}</p>

          <hr>

          <p>
            You can reply directly to this email to contact the customer.
          </p>
        </div>
      `;

      emailText = `
New Trip Enquiry - Your Choice Trips

Name: ${customerName}
Email: ${customerEmail}
Destination: ${destination || 'Not specified'}
Travel Date: ${date || 'Not specified'}

Reply to this email to contact the customer.
      `;
    } else {
      subject = `New Contact Request - ${customerName}`;

      emailHtml = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #17212b;">
          <h2 style="color: #0f7a6b;">New Contact Request</h2>

          <p>
            Someone has submitted a callback/contact request through
            <strong>Your Choice Trips</strong>.
          </p>

          <hr>

          <p><strong>Name:</strong> ${escapeHtml(customerName)}</p>
          <p><strong>Email:</strong> ${escapeHtml(customerEmail)}</p>
          <p><strong>Destination Interest:</strong> ${escapeHtml(interest || 'Not specified')}</p>
          <p><strong>Message:</strong></p>

          <div style="
            background: #f5f7f7;
            padding: 12px;
            border-radius: 8px;
            white-space: pre-wrap;
          ">${escapeHtml(message || 'No message provided')}</div>

          <hr>

          <p>
            You can reply directly to this email to contact the customer.
          </p>
        </div>
      `;

      emailText = `
New Contact Request - Your Choice Trips

Name: ${customerName}
Email: ${customerEmail}
Destination Interest: ${interest || 'Not specified'}

Message:
${message || 'No message provided'}

Reply to this email to contact the customer.
      `;
    }

    await transporter.sendMail({
      from: `"Your Choice Trips" <${smtpUser}>`,
      to: smtpUser,
      replyTo: customerEmail,
      subject,
      text: emailText,
      html: emailHtml,
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        message: isTripEnquiry
          ? 'Thank you! We have received your enquiry and will contact you shortly.'
          : 'Thanks! We have received your request and will be in touch shortly.',
      }),
    };

  } catch (error) {
    console.error('Email sending failed:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        message: 'Something went wrong while sending your request. Please try again.',
      }),
    };
  }
};
