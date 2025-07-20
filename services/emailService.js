// services/emailService.js
const nodemailer = require('nodemailer');
const { promisify } = require('util');

// Email templates
const emailTemplates = {
  hospitalVerification: (token, data) => ({
    subject: `Welcome to DovaCare - Verify Your Hospital Registration`,
    html: `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Hospital Registration</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f8fafc;
            }
            .container {
                background: white;
                border-radius: 12px;
                padding: 40px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 40px;
            }
            .logo {
                width: 60px;
                height: 60px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 20px;
                color: white;
                font-size: 24px;
                font-weight: bold;
            }
            .verification-code {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 20px;
                border-radius: 8px;
                text-align: center;
                margin: 30px 0;
                font-size: 32px;
                font-weight: bold;
                letter-spacing: 8px;
                font-family: 'Courier New', monospace;
            }
            .hospital-info {
                background: #f1f5f9;
                border-radius: 8px;
                padding: 20px;
                margin: 25px 0;
            }
            .hospital-info h3 {
                margin: 0 0 15px 0;
                color: #1e293b;
            }
            .info-row {
                display: flex;
                justify-content: space-between;
                margin: 8px 0;
                padding: 8px 0;
                border-bottom: 1px solid #e2e8f0;
            }
            .info-row:last-child {
                border-bottom: none;
            }
            .info-label {
                font-weight: 600;
                color: #64748b;
            }
            .info-value {
                color: #1e293b;
                font-weight: 500;
            }
            .warning {
                background: #fef3c7;
                border: 1px solid #f59e0b;
                border-radius: 6px;
                padding: 15px;
                margin: 20px 0;
                color: #92400e;
            }
            .footer {
                text-align: center;
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #e2e8f0;
                color: #64748b;
                font-size: 14px;
            }
            .security-notice {
                background: #ecfdf5;
                border: 1px solid #10b981;
                border-radius: 6px;
                padding: 15px;
                margin: 20px 0;
                color: #064e3b;
                font-size: 14px;
            }
            @media (max-width: 600px) {
                body {
                    padding: 10px;
                }
                .container {
                    padding: 20px;
                }
                .verification-code {
                    font-size: 24px;
                    letter-spacing: 4px;
                }
                .info-row {
                    flex-direction: column;
                    gap: 4px;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">DC</div>
                <h1 style="color: #1e293b; margin: 0;">Welcome to DovaCare</h1>
                <p style="color: #64748b; margin: 10px 0 0 0;">Healthcare Management Platform</p>
            </div>

            <div style="margin-bottom: 30px;">
                <h2 style="color: #1e293b;">Hi ${data.adminName},</h2>
                <p>Welcome to DovaCare! We're excited to have <strong>${data.hospitalName}</strong> join our healthcare management platform.</p>
                <p>To complete your hospital registration and access your dashboard, please verify your email address using the code below:</p>
            </div>

            <div class="verification-code">
                ${token}
            </div>

            <div class="hospital-info">
                <h3>Registration Details</h3>
                <div class="info-row">
                    <span class="info-label">Hospital:</span>
                    <span class="info-value">${data.hospitalName}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Hospital ID:</span>
                    <span class="info-value">${data.hospitalId}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Admin:</span>
                    <span class="info-value">${data.adminName}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Status:</span>
                    <span class="info-value">Pending Verification</span>
                </div>
            </div>

            <div class="warning">
                <strong>⏰ Important:</strong> This verification code will expire in 10 minutes for security reasons.
            </div>

            <div style="text-align: center; margin: 30px 0;">
                <p><strong>Enter this code in your registration page to complete the setup.</strong></p>
                <p style="color: #64748b;">Can't see the registration page? <a href="${process.env.FRONTEND_URL}/register" style="color: #667eea;">Click here to continue</a></p>
            </div>

            <div class="security-notice">
                <strong>🔒 Security Notice:</strong> If you didn't request this registration, please ignore this email. Your security is important to us.
            </div>

            <div style="margin: 30px 0;">
                <h3 style="color: #1e293b;">What's Next?</h3>
                <ol style="color: #64748b;">
                    <li>Enter the verification code above</li>
                    <li>Complete your hospital profile setup</li>
                    <li>Start managing your healthcare operations</li>
                    <li>Invite staff members to join your platform</li>
                </ol>
            </div>

            <div class="footer">
                <p><strong>DovaCare Support Team</strong></p>
                <p>Questions? Contact us at <a href="mailto:support@dovacare.com" style="color: #667eea;">support@dovacare.com</a></p>
                <p style="margin-top: 20px; font-size: 12px;">
                    This email was sent to ${data.adminName} at the request of ${data.hospitalName}.<br>
                    © 2025 DovaCare. All rights reserved.
                </p>
            </div>
        </div>
    </body>
    </html>
    `,
    text: `
    Welcome to DovaCare!

    Hi ${data.adminName},

    Welcome to DovaCare! We're excited to have ${data.hospitalName} join our healthcare management platform.

    Your verification code is: ${token}

    Registration Details:
    - Hospital: ${data.hospitalName}
    - Hospital ID: ${data.hospitalId}
    - Admin: ${data.adminName}
    - Status: Pending Verification

    This code will expire in 10 minutes for security reasons.

    Enter this code in your registration page to complete the setup.

    What's Next?
    1. Enter the verification code above
    2. Complete your hospital profile setup
    3. Start managing your healthcare operations
    4. Invite staff members to join your platform

    If you didn't request this registration, please ignore this email.

    Questions? Contact us at support@dovacare.com

    DovaCare Support Team
    © 2025 DovaCare. All rights reserved.
    `
  })
};

// Create transporter based on environment
const createTransport = () => {
  const emailConfig = {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production'
    }
  };

  // For development, you can use ethereal email or mailtrap
  if (process.env.NODE_ENV === 'development' && process.env.USE_ETHEREAL === 'true') {
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: process.env.ETHEREAL_USER,
        pass: process.env.ETHEREAL_PASS
      }
    });
  }

  return nodemailer.createTransport(emailConfig);
};

// Send verification email
const sendVerificationEmail = async (email, token, data) => {
  try {
    const transporter = createTransport();
    
    // Verify transporter configuration
    await transporter.verify();
    
    const template = emailTemplates.hospitalVerification(token, data);
    
    const mailOptions = {
      from: {
        name: 'DovaCare Support',
        address: process.env.FROM_EMAIL || 'noreply@dovacare.com'
      },
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high'
      }
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('Email sent successfully:', {
      messageId: info.messageId,
      to: email,
      subject: template.subject,
      preview: process.env.NODE_ENV === 'development' ? nodemailer.getTestMessageUrl(info) : undefined
    });

    return {
      success: true,
      messageId: info.messageId,
      preview: process.env.NODE_ENV === 'development' ? nodemailer.getTestMessageUrl(info) : undefined
    };

  } catch (error) {
    console.error('Email sending failed:', error);
    throw new Error(`Email sending failed: ${error.message}`);
  }
};

// Send welcome email after successful verification
const sendWelcomeEmail = async (email, data) => {
  try {
    const transporter = createTransport();
    
    const mailOptions = {
      from: {
        name: 'DovaCare Support',
        address: process.env.FROM_EMAIL || 'noreply@dovacare.com'
      },
      to: email,
      subject: `Welcome to DovaCare - ${data.hospitalName} Registration Complete`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to DovaCare, ${data.adminName}!</h2>
          <p>Congratulations! ${data.hospitalName} has been successfully registered on DovaCare.</p>
          <p><strong>Hospital ID:</strong> ${data.hospitalId}</p>
          <p>You can now access your dashboard and start managing your healthcare operations.</p>
          <p><a href="${process.env.FRONTEND_URL}/dashboard" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Access Dashboard</a></p>
          <p>If you have any questions, feel free to contact our support team.</p>
          <hr>
          <p><small>DovaCare Support Team<br>support@dovacare.com</small></p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error('Welcome email sending failed:', error);
    // Don't throw error for welcome email failure
    return { success: false, error: error.message };
  }
};

// Test email configuration
const testEmailConfig = async () => {
  try {
    const transporter = createTransport();
    await transporter.verify();
    console.log('✅ Email configuration is valid');
    return true;
  } catch (error) {
    console.error('❌ Email configuration test failed:', error.message);
    return false;
  }
};

module.exports = {
  sendVerificationEmail,
  sendWelcomeEmail,
  testEmailConfig
};