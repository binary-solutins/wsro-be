const nodemailer = require('nodemailer');
const qrcode = require('qrcode');
const path = require('path');
const fs = require('fs').promises;

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'binarysolutions0000@gmail.com',
    pass: 'volw mohh opdb llpi'
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Function to generate and save QR code
const generateQRCode = async (data, teamCode) => {
  try {
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, 'uploads');
    try {
      await fs.mkdir(uploadsDir, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }

    // Generate QR code file path
    const qrCodePath = path.join(uploadsDir, `qr-${teamCode}.png`);
    
    // Generate QR code
    await qrcode.toFile(qrCodePath, JSON.stringify(data), {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 300,
      color: {
        dark: '#4F46E5',  // QR code color
        light: '#FFFFFF'  // Background color
      }
    });

    return qrCodePath;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
};

const sendRegistrationEmail = async (
  leaderEmail,
  teamName,
  teamCode,
  competitionName,
  regionName
) => {
  try {
    // Prepare data for QR code
    const qrData = {
      teamName,
      teamCode,
      competitionName,
      regionName,
      registrationDate: new Date().toISOString()
    };

    // Generate QR code and get file path
    const qrCodePath = await generateQRCode(qrData, teamCode);

    const mailOptions = {
      from: 'binarysolutions0000@gmail.com',
      to: leaderEmail,
      subject: `Registration Confirmation - ${competitionName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">Registration Confirmed!</h2>
          <p>Dear Team Leader,</p>
          <p>Your team has been successfully registered for the ${competitionName} competition.</p>
          
          <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Registration Details:</h3>
            <ul style="list-style: none; padding: 0;">
              <li><strong>Team Name:</strong> ${teamName}</li>
              <li><strong>Team Code:</strong> ${teamCode}</li>
              <li><strong>Region:</strong> ${regionName}</li>
              <li><strong>Registration Date:</strong> ${new Date().toLocaleDateString()}</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <p><strong>Your registration QR code is attached to this email.</strong></p>
            <p style="font-size: 12px; color: #6B7280;">
              The QR code contains your complete registration information.<br>
              Please save it for future reference.
            </p>
          </div>
          
          <p>Please keep your team code and QR code safe as they will be required for future reference.</p>
          
          <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">
            If you have any questions, please don't hesitate to contact us.
          </p>
        </div>
      `,
      attachments: [
        {
          filename: `${teamName}-QRCode.png`,
          path: qrCodePath,
          cid: 'registration-qr'
        }
      ]
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.response);

    // Clean up: Delete the QR code file after sending
    try {
      await fs.unlink(qrCodePath);
    } catch (err) {
      console.error('Error deleting QR code file:', err);
    }

    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send registration confirmation email');
  }
};

const verifyEmailConnection = async () => {
  try {
    const verification = await transporter.verify();
    console.log('SMTP connection verified:', verification);
    return verification;
  } catch (error) {
    console.error('SMTP verification failed:', error);
    throw error;
  }
};

module.exports = {
  sendRegistrationEmail,
  verifyEmailConnection
};