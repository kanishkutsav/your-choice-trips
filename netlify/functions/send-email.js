const nodemailer = require('nodemailer');

exports.handler = async (event) => {
  console.log('send-email function invoked');
  console.log('Method:', event.httpMethod);

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({
        success: false,
        message: 'Method not allowed.'
      })
    };
  }

  try {
    console.log('Parsing request body...');

    const payload = JSON.parse(event.body || '{}');

    console.log('Form type:', payload.formType);
    console.log('Customer name:', payload.name || payload.contactName);
    console.log('Customer email received:', !!(payload.email || payload.contactEmail));

    // Check whether Netlify can see the SMTP variables.
    console.log('SMTP_HOST exists:', !!process.env.SMTP_HOST);
    console.log('SMTP_PORT exists:', !!process.env.SMTP_PORT);
    console.log('SMTP_USER exists:', !!process.env.SMTP_USER);
    console.log('SMTP_PASSWORD exists:', !!process.env.SMTP_PASSWORD);

    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = Number(process.env.SMTP_PORT || 465);
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;

    if (!smtpUser || !smtpPassword) {
      throw new Error(
        'SMTP_USER or SMTP_PASSWORD is missing from Netlify environment variables.'
      );
    }

    console.log('Creating SMTP transporter...');

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPassword
      }
    });

    console.log('Testing SMTP connection...');

    await transporter.verify();

    console.log('SMTP connection successful');

    const isTripEnquiry = payload.formType === 'enquiry';

    const customerName =
      isTripEnquiry
        ? payload.name
        : payload.contactName;

    const customerEmail =
      isTripEnquiry
        ? payload.email
        : payload.contactEmail;

    const subject = isTripEnquiry
      ? `New Trip Enquiry - ${customerName}`
      : `New Contact Request - ${customerName}`;

    let text;

    if (isTripEnquiry) {
      text = `
New Trip Enquiry - Your Choice Trips

Name: ${customerName}
Email: ${customerEmail}
Destination: ${payload.destination || 'Not specified'}
Travel Date: ${payload.date || 'Not specified'}
      `;
    } else {
      text = `
New Contact Request - Your Choice Trips

Name: ${customerName}
Email: ${customerEmail}
Destination Interest: ${payload.interest || 'Not specified'}

Message:
${payload.message || 'No message provided'}
      `;
    }

    console.log('Sending email...');

    await transporter.sendMail({
      from: `"Your Choice Trips" <${smtpUser}>`,
      to: smtpUser,
      replyTo: customerEmail,
      subject,
      text
    });

    console.log('EMAIL SENT SUCCESSFULLY');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        message: isTripEnquiry
          ? 'Thank you! We have received your enquiry and will contact you shortly.'
          : 'Thanks! We have received your request and will be in touch shortly.'
      })
    };

  } catch (error) {

    console.error('SEND EMAIL ERROR');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        message: `Email error: ${error.message}`
      })
    };
  }
};
