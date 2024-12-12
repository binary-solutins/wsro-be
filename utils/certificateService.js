const { createCanvas, loadImage, registerFont } = require('canvas');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs').promises;

// Configure email transporter
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


async function generateCertificate(participantData) {
  const {
    name,
    competitionName,
    position = '',
    date = new Date().toLocaleDateString(),
    certificateId
  } = participantData;

  // Create canvas
  const width = 1920;
  const height = 1080;
  const canvas = createCanvas(width, height);
  const context = canvas.getContext('2d');

  // Set background
  context.fillStyle = '#FFFFFF';
  context.fillRect(0, 0, width, height);

  // Add border
  context.strokeStyle = '#4F46E5';
  context.lineWidth = 20;
  context.strokeRect(40, 40, width - 80, height - 80);

  // Add inner border
  context.strokeStyle = '#4F46E5';
  context.lineWidth = 2;
  context.strokeRect(60, 60, width - 120, height - 120);

  // Add certificate title
 
  context.fillStyle = '#4F46E5';
  context.textAlign = 'center';
  context.fillText('Certificate of Achievement', width / 2, 200);

  // Add participant name

  context.fillStyle = '#000000';
  context.fillText(name, width / 2, height / 2 - 50);

  // Add competition details
 
  context.fillText(`for successfully participating in`, width / 2, height / 2 + 30);

  context.fillText(competitionName, width / 2, height / 2 + 100);

  // Add position if provided
  if (position) {
    context.fillText(`Securing ${position} Position`, width / 2, height / 2 + 170);
  }

  // Add date
 
  context.fillText(`Date: ${date}`, width / 2, height - 200);

  // Add certificate ID
  
  context.fillText(`Certificate ID: ${certificateId}`, width / 2, height - 150);

  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(__dirname, 'uploads');
  await fs.mkdir(uploadsDir, { recursive: true });

  // Save certificate
  const certificatePath = path.join(uploadsDir, `certificate-${certificateId}.png`);
  const buffer = canvas.toBuffer('image/png');
  await fs.writeFile(certificatePath, buffer);

  return certificatePath;
}

async function sendCertificateEmail(emailData) {
  const {
    email,
    name,
    competitionName,
    certificatePath,
    certificateId
  } = emailData;

  const mailOptions = {
    from: 'binarysolutions0000@gmail.com',
    to: email,
    subject: `Your Certificate - ${competitionName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">Congratulations!</h2>
        <p>Dear ${name},</p>
        <p>Thank you for participating in ${competitionName}. We are pleased to present you with your certificate of achievement.</p>
        
        <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Certificate Details:</h3>
          <ul style="list-style: none; padding: 0;">
            <li><strong>Name:</strong> ${name}</li>
            <li><strong>Event:</strong> ${competitionName}</li>
            <li><strong>Certificate ID:</strong> ${certificateId}</li>
            <li><strong>Date Issued:</strong> ${new Date().toLocaleDateString()}</li>
          </ul>
        </div>
        
        <p>Your certificate is attached to this email. You can download and print it for your records.</p>
        
        <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">
          If you have any questions, please don't hesitate to contact us.
        </p>
      </div>
    `,
    attachments: [
      {
        filename: `${name}-Certificate.png`,
        path: certificatePath
      }
    ]
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
}

module.exports = {
  generateCertificate,
  sendCertificateEmail
};