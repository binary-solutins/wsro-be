const PDFDocument = require('pdfkit');
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

  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(__dirname, 'uploads');
  await fs.mkdir(uploadsDir, { recursive: true });

  // Create certificate PDF
  const certificatePath = path.join(uploadsDir, `certificate-${certificateId}.pdf`);
  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape'
  });

  // Pipe PDF to file
  const writeStream = fs.createWriteStream(certificatePath);
  doc.pipe(writeStream);

  // Set up PDF styling
  doc.fontSize(24)
     .font('Helvetica-Bold')
     .fillColor('#4F46E5')
     .text('Certificate of Achievement', { 
       align: 'center', 
       underline: true 
     });

  // Add border
  doc.lineWidth(2)
     .strokeColor('#4F46E5')
     .rect(50, 50, doc.page.width - 100, doc.page.height - 100)
     .stroke();

  // Participant details
  doc.fontSize(36)
     .font('Helvetica')
     .fillColor('black')
     .text(name, { 
       align: 'center',
       moveDown: 2
     });

  doc.fontSize(18)
     .text('for successfully participating in', { align: 'center' })
     .fontSize(24)
     .fillColor('#4F46E5')
     .text(competitionName, { align: 'center' });

  // Add position if provided
  if (position) {
    doc.fontSize(18)
       .fillColor('black')
       .text(`Securing ${position} Position`, { align: 'center' });
  }

  // Add date and certificate ID
  doc.fontSize(12)
     .text(`Date: ${date}`, { 
       align: 'center', 
       moveDown: 2 
     })
     .text(`Certificate ID: ${certificateId}`, { align: 'center' });

  // Finalize PDF
  doc.end();

  // Wait for write stream to finish
  await new Promise((resolve, reject) => {
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
  });

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
        filename: `${name}-Certificate.pdf`,
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