const nodemailer = require('nodemailer');

/**
 * Creates or retrieves a Nodemailer transporter.
 * Supports:
 * 1. Gmail or Custom SMTP if EMAIL_USER / EMAIL_PASS or SMTP_HOST are set in server/.env
 * 2. Ethereal Mail sandbox fallback for zero-config local testing
 */
async function getTransporter() {
  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.EMAIL_PASS || process.env.SMTP_PASS;
  const host = process.env.SMTP_HOST || (user && user.includes('@gmail.com') ? 'smtp.gmail.com' : null);

  if (user && pass) {
    const port = Number(process.env.SMTP_PORT) || 465;
    const isSecure = port === 465;
    console.log(`✉️ Real Email Dispatcher active: ${user} via ${host || 'smtp.gmail.com'}:${port}`);
    return nodemailer.createTransport({
      host: host || 'smtp.gmail.com',
      port,
      secure: isSecure,
      auth: { user, pass }
    });
  }

  // Fallback: Generate Ethereal sandbox test account for local testing
  const testAccount = await nodemailer.createTestAccount();
  console.log('ℹ️ EMAIL_USER & EMAIL_PASS not configured in server/.env.');
  console.log('✉️ Using Ethereal Mail sandbox for test delivery (view emails at preview link in console).');
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
}

let transporterPromise = null;
function getTransporterSingleton() {
  if (!transporterPromise) {
    transporterPromise = getTransporter();
  }
  return transporterPromise;
}

async function sendScorecardEmail(candidate, submission, test) {
  try {
    const transporter = await getTransporterSingleton();

    const tierColors = {
      'Platinum (100% Scholarship)': '#8b5cf6',
      'Gold (50% Scholarship)': '#f59e0b',
      'Silver (25% Scholarship)': '#06b6d4',
      'Certificate of Participation': '#64748b'
    };
    const badgeColor = tierColors[submission.scholarshipTier] || '#3b82f6';

    const categoryBreakdown = typeof submission.categoryScores === 'string' 
      ? JSON.parse(submission.categoryScores) 
      : submission.categoryScores;

    const breakdownHtml = Object.entries(categoryBreakdown).map(([category, stats]) => `
      <tr style="border-bottom: 1px solid #334155;">
        <td style="padding: 10px 14px; color: #f8fafc; font-weight: 500;">${category}</td>
        <td style="padding: 10px 14px; color: #94a3b8; text-align: center;">${stats.totalQuestions}</td>
        <td style="padding: 10px 14px; color: #10b981; font-weight: 600; text-align: center;">${stats.correct}</td>
        <td style="padding: 10px 14px; color: #38bdf8; font-weight: 600; text-align: right;">${stats.percentage}%</td>
      </tr>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #e2e8f0; margin: 0; padding: 20px; }
          .container { max-width: 620px; margin: 0 auto; background: #131b2e; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
          .header { background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%); padding: 32px 24px; text-align: center; border-bottom: 1px solid #3730a3; }
          .badge { display: inline-block; padding: 8px 18px; border-radius: 9999px; background: ${badgeColor}; color: #ffffff; font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 12px; }
          .content { padding: 28px 24px; }
          .score-card { background: #1e293b; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0; border: 1px solid #334155; }
          .score-number { font-size: 42px; font-weight: 800; color: #38bdf8; margin: 0; }
          .table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 14px; }
          .footer { background: #0f172a; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #1e293b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">IT Career Readiness Assessment</h1>
            <p style="color: #c7d2fe; margin: 6px 0 0 0; font-size: 14px;">Official Proctored CBT Scorecard & Scholarship Result</p>
            <div class="badge">${submission.scholarshipTier}</div>
          </div>
          
          <div class="content">
            <p style="font-size: 16px; line-height: 1.5; color: #cbd5e1;">Dear <strong>${candidate.fullName}</strong>,</p>
            <p style="font-size: 14px; line-height: 1.6; color: #94a3b8;">
              Congratulations on completing the <strong>IT Career Readiness & Scholarship Assessment (L1 Support Role)</strong> under full AI proctoring surveillance.
            </p>

            <div class="score-card">
              <div style="font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 600;">Overall Score</div>
              <div class="score-number">${submission.totalScore} / ${submission.maxScore}</div>
              <div style="font-size: 15px; color: #10b981; font-weight: 600; margin-top: 4px;">Accuracy: ${submission.percentage}%</div>
            </div>

            <h3 style="color: #f1f5f9; font-size: 16px; margin: 24px 0 8px 0;">Candidate & Verification Summary</h3>
            <table style="width: 100%; font-size: 13px; color: #94a3b8; line-height: 1.8;">
              <tr><td style="width: 40%; color: #64748b;">Verification ID:</td><td style="color: #f8fafc; font-family: monospace;">${submission.id}</td></tr>
              <tr><td style="color: #64748b;">Assigned Coach:</td><td style="color: #f8fafc;">${candidate.coach || 'General'}</td></tr>
              <tr><td style="color: #64748b;">Submission Time:</td><td style="color: #f8fafc;">${new Date().toLocaleString()}</td></tr>
              <tr><td style="color: #64748b;">Proctoring Status:</td><td style="color: #10b981; font-weight: 600;">Verified & Authenticated</td></tr>
            </table>

            <h3 style="color: #f1f5f9; font-size: 16px; margin: 24px 0 8px 0;">Domain Competency Breakdown</h3>
            <table class="table">
              <thead>
                <tr style="background: #0f172a; text-align: left; color: #64748b; font-size: 12px; text-transform: uppercase;">
                  <th style="padding: 10px 14px;">Domain</th>
                  <th style="padding: 10px 14px; text-align: center;">Questions</th>
                  <th style="padding: 10px 14px; text-align: center;">Correct</th>
                  <th style="padding: 10px 14px; text-align: right;">Accuracy</th>
                </tr>
              </thead>
              <tbody>
                ${breakdownHtml}
              </tbody>
            </table>

            <div style="margin-top: 28px; padding: 16px; background: rgba(59, 130, 246, 0.1); border-left: 4px solid #3b82f6; border-radius: 6px;">
              <h4 style="margin: 0 0 6px 0; color: #60a5fa; font-size: 15px;">Next Steps:</h4>
              <p style="margin: 0; font-size: 13px; color: #bfdbfe; line-height: 1.5;">
                Your assigned career coach (<strong>${candidate.coach || 'Admissions Team'}</strong>) will contact you regarding enrollment and scholarship allocation.
              </p>
            </div>
          </div>

          <div class="footer">
            <p style="margin: 0;">Scholarship CBT System &bull; Secure Anti-Cheat Assessment Engine</p>
            <p style="margin: 6px 0 0 0;">This is an automated system-generated report.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Scholarship Assessment Portal" <no-reply@scholarshipcbt.com>',
      to: candidate.email,
      subject: `🎓 Your Scholarship Assessment Result & Scorecard [${submission.scholarshipTier}]`,
      html: htmlContent,
    });

    console.log(`Email dispatched to ${candidate.email}. Message ID: ${info.messageId}`);
    let previewUrl = null;
    if (nodemailer.getTestMessageUrl) {
      previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log(`Test Email Preview URL: ${previewUrl}`);
      }
    }

    return { success: true, messageId: info.messageId, previewUrl };
  } catch (error) {
    console.error('Error sending scorecard email:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendScorecardEmail,
};
