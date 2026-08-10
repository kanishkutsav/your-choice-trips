const nodemailer = require("nodemailer");

exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "Method not allowed",
      }),
    };
  }

  try {
    const { name, email, destination, date } = JSON.parse(event.body || "{}");

    // Basic validation
    if (!name || !email) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "Name and email are required.",
        }),
      };
    }

    // Gmail SMTP configuration
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    // Send enquiry email to your Gmail account
    await transporter.sendMail({
      from: `"Your Choice Trips Website" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER,
      replyTo: email,
      subject: `New Trip Enquiry - ${destination || "Destination not specified"}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>New Trip Enquiry</h2>

          <p>Someone has submitted a new enquiry through the Your Choice Trips website.</p>

          <hr>

          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Destination:</strong> ${destination || "Not specified"}</p>
          <p><strong>Travel Date:</strong> ${date || "Not specified"}</p>

          <hr>

          <p>
            You can reply directly to this email to contact the customer.
          </p>
        </div>
      `,
      text: `
New Trip Enquiry - Your Choice Trips

Name: ${name}
Email: ${email}
Destination: ${destination || "Not specified"}
Travel Date: ${date || "Not specified"}

Reply to this email to contact the customer.
      `,
    });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        success: true,
        message: "Thank you! We have received your enquiry and will contact you shortly.",
      }),
    };
  } catch (error) {
    console.error("Email sending failed:", error);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        success: false,
        message: "Unable to send your enquiry right now. Please try again.",
      }),
    };
  }
};
