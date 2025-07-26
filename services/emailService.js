// services/emailService.js
const nodemailer = require('nodemailer');
const { promisify } = require('util');

// Email templates
const emailTemplates = {
  hospitalVerification: (token, data) => ({
    subject: `Welcome to HMS - Verify Your Hospital Registration`,
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
                <h1 style="color: #1e293b; margin: 0;">Welcome to HMS</h1>
                <p style="color: #64748b; margin: 10px 0 0 0;">Healthcare Management Platform</p>
            </div>

            <div style="margin-bottom: 30px;">
                <h2 style="color: #1e293b;">Hi ${data.adminName},</h2>
                <p>Welcome to HMS! We're excited to have <strong>${data.hospitalName}</strong> join our healthcare management platform.</p>
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
                <p><strong>HMS Support Team</strong></p>
                <p>Questions? Contact us at <a href="mailto:support@HMS.com" style="color: #667eea;">support@HMS.com</a></p>
                <p style="margin-top: 20px; font-size: 12px;">
                    This email was sent to ${data.adminName} at the request of ${data.hospitalName}.<br>
                    © 2025 HMS. All rights reserved.
                </p>
            </div>
        </div>
    </body>
    </html>
    `,
    text: `
    Welcome to HMS!

    Hi ${data.adminName},

    Welcome to HMS! We're excited to have ${data.hospitalName} join our healthcare management platform.

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

    Questions? Contact us at support@HMS.com

    HMS Support Team
    © 2025 HMS. All rights reserved.
    `
  }),

 userInvitation: (temporaryPassword, data) => ({
  subject: `${data.isPasswordReset ? 'Password Reset' : 'Welcome to'} ${data.hospitalName} - HMS Access`,
  html: `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${data.isPasswordReset ? 'Password Reset' : 'Welcome to'} ${data.hospitalName}</title>
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
          .logo svg {
              width: 40px;
              height: 40px;
              fill: white;
          }
          .credentials-box {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 25px;
              border-radius: 8px;
              text-align: center;
              margin: 30px 0;
          }
          .credential-item {
              margin: 15px 0;
              padding: 10px;
              background: rgba(255, 255, 255, 0.1);
              border-radius: 6px;
          }
          .credential-label {
              font-size: 14px;
              opacity: 0.9;
              margin-bottom: 5px;
          }
          .credential-value {
              font-size: 18px;
              font-weight: bold;
              font-family: 'Courier New', monospace;
              letter-spacing: 1px;
          }
          .user-info {
              background: #f1f5f9;
              border-radius: 8px;
              padding: 20px;
              margin: 25px 0;
          }
          .user-info h3 {
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
          .login-button {
              display: inline-block;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 8px;
              font-weight: bold;
              text-align: center;
              margin: 20px 0;
              transition: all 0.3s ease;
          }
          .login-button:hover {
              background: linear-gradient(135deg, #5a67d8 0%, #667eea 100%);
              transform: translateY(-1px);
              box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
          }
          .warning {
              background: #fef3c7;
              border: 1px solid #f59e0b;
              border-radius: 6px;
              padding: 15px;
              margin: 20px 0;
              color: #92400e;
          }
          .security-notice {
              background: #fef2f2;
              border: 1px solid #f87171;
              border-radius: 6px;
              padding: 15px;
              margin: 20px 0;
              color: #7f1d1d;
              font-size: 14px;
          }
          .footer {
              text-align: center;
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e2e8f0;
              color: #64748b;
              font-size: 14px;
          }
          @media (max-width: 600px) {
              body {
                  padding: 10px;
              }
              .container {
                  padding: 20px;
              }
              .credentials-box {
                  padding: 20px;
              }
              .credential-value {
                  font-size: 16px;
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
              <div class="logo">
                 <img src="HMS\hmslogo.svg" alt="" />
              </div>
              <h1 style="color: #1e293b; margin: 0;">
                  ${data.isPasswordReset ? 'Password Reset' : 'Welcome to HMS'}
              </h1>
              <p style="color: #64748b; margin: 10px 0 0 0;">${data.hospitalName}</p>
          </div>

          <div style="margin-bottom: 30px;">
              <h2 style="color: #1e293b;">Hi ${data.firstName},</h2>
              ${data.isPasswordReset ? 
                `<p>Your password has been reset by your administrator. Please use the temporary credentials below to log in and change your password.</p>` :
                `<p>You've been invited to join <strong>${data.hospitalName}</strong> on HMS! Your administrator has created an account for you with the role of <strong>${data.role}</strong>.</p>
                 <p>Please use the temporary credentials below to log in and get started:</p>`
              }
          </div>

          <div class="credentials-box">
              <h3 style="margin: 0 0 20px 0; opacity: 0.9;">Your Login Credentials</h3>
              <div class="credential-item">
                  <div class="credential-label">Email Address</div>
                  <div class="credential-value">${data.email}</div>
              </div>
              <div class="credential-item">
                  <div class="credential-label">Temporary Password</div>
                  <div class="credential-value">${temporaryPassword}</div>
              </div>
          </div>

          <div class="user-info">
              <h3>Your Account Details</h3>
              <div class="info-row">
                  <span class="info-label">Full Name:</span>
                  <span class="info-value">${data.firstName} ${data.lastName}</span>
              </div>
              <div class="info-row">
                  <span class="info-label">Employee ID:</span>
                  <span class="info-value">${data.employeeId}</span>
              </div>
              <div class="info-row">
                  <span class="info-label">Role:</span>
                  <span class="info-value">${data.role.charAt(0).toUpperCase() + data.role.slice(1)}</span>
              </div>
              <div class="info-row">
                  <span class="info-label">Hospital:</span>
                  <span class="info-value">${data.hospitalName}</span>
              </div>
              <div class="info-row">
                  <span class="info-label">Hospital ID:</span>
                  <span class="info-value">${data.hospitalId}</span>
              </div>
          </div>

          <div style="text-align: center; margin: 30px 0;">
              <a href="${data.loginUrl}" class="login-button">
                  🔐 Login to HMS Dashboard
              </a>
              <p style="color: #64748b; margin-top: 10px;">
                  Or copy this link: <a href="${data.loginUrl}" style="color: #667eea;">${data.loginUrl}</a>
              </p>
          </div>

          <div class="security-notice">
              <strong>🔒 Important Security Notice:</strong><br>
              • This is a temporary password - you'll be prompted to change it on first login<br>
              • Never share your login credentials with anyone<br>
              • If you didn't expect this ${data.isPasswordReset ? 'password reset' : 'invitation'}, contact your administrator immediately
          </div>

          ${!data.isPasswordReset ? `
          <div style="margin: 30px 0;">
              <h3 style="color: #1e293b;">Getting Started</h3>
              <ol style="color: #64748b;">
                  <li>Click the login button above to access HMS</li>
                  <li>Use your email address and temporary password to sign in</li>
                  <li>Change your password when prompted</li>
                  <li>Complete your profile information</li>
                  <li>Start managing your healthcare tasks</li>
              </ol>
          </div>
          ` : ''}

          <div class="footer">
              <p><strong>${data.hospitalName} - HMS</strong></p>
              <p>Questions? Contact your administrator or HMS support at <a href="mailto:support@HMS.com" style="color: #667eea;">support@HMS.com</a></p>
              <p style="margin-top: 20px; font-size: 12px;">
                  This email was sent to ${data.firstName} ${data.lastName} by ${data.hospitalName}.<br>
                  © 2025 HMS. All rights reserved.
              </p>
          </div>
      </div>
  </body>
  </html>
  `,
  text: `
  ${data.isPasswordReset ? 'Password Reset' : 'Welcome to HMS'} - ${data.hospitalName}

  Hi ${data.firstName} ${data.lastName},

  ${data.isPasswordReset ? 
    'Your password has been reset by your administrator. Please use the temporary credentials below to log in and change your password.' :
    `You've been invited to join ${data.hospitalName} on HMS! Your administrator has created an account for you with the role of ${data.role}.`
  }

  Your Login Credentials:
  Email: ${data.email}
  Temporary Password: ${temporaryPassword}

  Account Details:
  - Full Name: ${data.firstName} ${data.lastName}
  - Employee ID: ${data.employeeId}
  - Role: ${data.role.charAt(0).toUpperCase() + data.role.slice(1)}
  - Hospital: ${data.hospitalName}
  - Hospital ID: ${data.hospitalId}

  Login URL: ${data.loginUrl}

  Important Security Notice:
  • This is a temporary password - you'll be prompted to change it on first login
  • Never share your login credentials with anyone
  • If you didn't expect this ${data.isPasswordReset ? 'password reset' : 'invitation'}, contact your administrator immediately

  ${!data.isPasswordReset ? `
  Getting Started:
  1. Visit the login URL above to access HMS
  2. Use your email address and temporary password to sign in
  3. Change your password when prompted
  4. Complete your profile information
  5. Start managing your healthcare tasks
  ` : ''}

  Questions? Contact your administrator or HMS support at support@HMS.com

  ${data.hospitalName} - HMS
  © 2025 HMS. All rights reserved.
  `
})
};

// Create transporter with improved configuration and fallback options
const createTransport = () => {
  // Primary Gmail configuration with enhanced security and timeout settings
  const gmailConfig = {
    service: 'gmail', // Using service instead of host/port for better reliability
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    secure: false, // Use STARTTLS
    requireTLS: true,
    connectionTimeout: 60000, // 60 seconds
    greetingTimeout: 30000,   // 30 seconds
    socketTimeout: 60000,     // 60 seconds
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateLimit: 14, // messages per second
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production',
      ciphers: 'SSLv3'
    },
    debug: process.env.NODE_ENV === 'development',
    logger: process.env.NODE_ENV === 'development'
  };

  // Fallback configuration using direct SMTP settings
  const fallbackConfig = {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    requireTLS: true,
    connectionTimeout: 60000,
    greetingTimeout: 30000,
    socketTimeout: 60000,
    tls: {
      rejectUnauthorized: false, // Allow self-signed certificates in development
      servername: 'smtp.gmail.com'
    },
    debug: process.env.NODE_ENV === 'development'
  };

  // For development, use ethereal email or gmail
  if (process.env.NODE_ENV === 'development' && process.env.USE_ETHEREAL === 'true') {
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: process.env.ETHEREAL_USER,
        pass: process.env.ETHEREAL_PASS
      }
    });
  }

  // Try Gmail service first, then fallback to direct SMTP
  try {
    return nodemailer.createTransport(gmailConfig);
  } catch (error) {
    console.warn('⚠️ Gmail service config failed, using fallback configuration');
    return nodemailer.createTransport(fallbackConfig);
  }
};

// Enhanced send verification email with retry logic
const sendVerificationEmail = async (email, token, data, retries = 3) => {
  let lastError;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`📧 Attempting to send verification email (attempt ${attempt}/${retries})`);
      
      const transporter = createTransport();
      
      // Test connection with timeout
      const verifyPromise = transporter.verify();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection verification timeout')), 30000)
      );
      
      await Promise.race([verifyPromise, timeoutPromise]);
      console.log('✅ SMTP connection verified');
      
      const template = emailTemplates.hospitalVerification(token, data);
      
      const mailOptions = {
        from: {
          name: 'HMS Support',
          address: process.env.FROM_EMAIL || 'noreply@HMS.com'
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

      // Send email with timeout
      const sendPromise = transporter.sendMail(mailOptions);
      const sendTimeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Email sending timeout')), 60000)
      );
      
      const info = await Promise.race([sendPromise, sendTimeoutPromise]);
      
      console.log('✅ Verification email sent successfully:', {
        messageId: info.messageId,
        to: email,
        subject: template.subject,
        attempt: attempt,
        preview: process.env.NODE_ENV === 'development' ? nodemailer.getTestMessageUrl(info) : undefined
      });

      // Close transporter
      transporter.close();

      return {
        success: true,
        messageId: info.messageId,
        attempt: attempt,
        preview: process.env.NODE_ENV === 'development' ? nodemailer.getTestMessageUrl(info) : undefined
      };

    } catch (error) {
      lastError = error;
      console.error(`❌ Verification email attempt ${attempt} failed:`, error.message);
      
      // Wait before retry (exponential backoff)
      if (attempt < retries) {
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        console.log(`⏳ Waiting ${delay/1000}s before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // All attempts failed
  console.error('❌ All verification email attempts failed:', lastError.message);
  throw new Error(`Verification email sending failed after ${retries} attempts: ${lastError.message}`);
};

// Send user invitation email with retry logic
const sendUserInvitationEmail = async (email, temporaryPassword, data, retries = 3) => {
  let lastError;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`📧 Attempting to send user invitation email (attempt ${attempt}/${retries})`);
      
      const transporter = createTransport();
      
      // Test connection with timeout
      const verifyPromise = transporter.verify();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection verification timeout')), 30000)
      );
      
      await Promise.race([verifyPromise, timeoutPromise]);
      console.log('✅ SMTP connection verified for user invitation');
      
      const template = emailTemplates.userInvitation(temporaryPassword, data);
      
      const mailOptions = {
        from: {
          name: `HMS - ${data.hospitalName}`,
          address: process.env.FROM_EMAIL || 'noreply@HMS.com'
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

      // Send email with timeout
      const sendPromise = transporter.sendMail(mailOptions);
      const sendTimeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Email sending timeout')), 60000)
      );
      
      const info = await Promise.race([sendPromise, sendTimeoutPromise]);
      
      console.log('✅ User invitation email sent successfully:', {
        messageId: info.messageId,
        to: email,
        subject: template.subject,
        attempt: attempt,
        isPasswordReset: data.isPasswordReset || false,
        preview: process.env.NODE_ENV === 'development' ? nodemailer.getTestMessageUrl(info) : undefined
      });

      // Close transporter
      transporter.close();

      return {
        success: true,
        messageId: info.messageId,
        attempt: attempt,
        preview: process.env.NODE_ENV === 'development' ? nodemailer.getTestMessageUrl(info) : undefined
      };

    } catch (error) {
      lastError = error;
      console.error(`❌ User invitation email attempt ${attempt} failed:`, error.message);
      
      // Wait before retry (exponential backoff)
      if (attempt < retries) {
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        console.log(`⏳ Waiting ${delay/1000}s before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // All attempts failed
  console.error('❌ All user invitation email attempts failed:', lastError.message);
  throw new Error(`User invitation email sending failed after ${retries} attempts: ${lastError.message}`);
};

// Send welcome email after successful verification
const sendWelcomeEmail = async (email, data) => {
  try {
    const transporter = createTransport();
    
    const mailOptions = {
      from: {
        name: 'HMS Support',
        address: process.env.FROM_EMAIL || 'noreply@HMS.com'
      },
      to: email,
      subject: `Welcome to HMS - ${data.hospitalName} Registration Complete`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to HMS, ${data.adminName}!</h2>
          <p>Congratulations! ${data.hospitalName} has been successfully registered on HMS.</p>
          <p><strong>Hospital ID:</strong> ${data.hospitalId}</p>
          <p>You can now access your dashboard and start managing your healthcare operations.</p>
          <p><a href="${process.env.FRONTEND_URL}/dashboard" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Access Dashboard</a></p>
          <p>If you have any questions, feel free to contact our support team.</p>
          <hr>
          <p><small>HMS Support Team<br>support@HMS.com</small></p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    transporter.close();
    
    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error('Welcome email sending failed:', error);
    // Don't throw error for welcome email failure
    return { success: false, error: error.message };
  }
};

// Enhanced test email configuration with detailed diagnostics
const testEmailConfig = async () => {
  try {
    console.log('🔍 Testing email configuration...');
    console.log('📋 SMTP Settings:');
    console.log(`   Host: ${process.env.SMTP_HOST || 'gmail service'}`);
    console.log(`   Port: ${process.env.SMTP_PORT || '587'}`);
    console.log(`   User: ${process.env.SMTP_USER}`);
    console.log(`   From: ${process.env.FROM_EMAIL}`);
    
    const transporter = createTransport();
    
    // Test connection with timeout
    const verifyPromise = transporter.verify();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout - check firewall/network')), 30000)
    );
    
    await Promise.race([verifyPromise, timeoutPromise]);
    
    console.log('✅ Email configuration is valid and connection successful');
    transporter.close();
    return true;
    
  } catch (error) {
    console.error('❌ Email configuration test failed:', error.message);
    
    // Provide specific troubleshooting advice
    if (error.message.includes('ETIMEDOUT') || error.message.includes('timeout')) {
      console.log('💡 Troubleshooting tips for timeout errors:');
      console.log('   1. Check your internet connection');
      console.log('   2. Verify firewall/antivirus is not blocking port 587');
      console.log('   3. Try using port 465 with secure: true');
      console.log('   4. Check if your ISP blocks SMTP ports');
      console.log('   5. Try using Gmail App Password instead of regular password');
    }
    
    if (error.message.includes('authentication') || error.message.includes('auth')) {
      console.log('💡 Authentication troubleshooting:');
      console.log('   1. Enable 2-factor authentication on Gmail');
      console.log('   2. Generate an App Password for this application');
      console.log('   3. Use the App Password instead of your Gmail password');
    }
    
    return false;
  }
};

// Utility function to generate App Password instructions
const getGmailSetupInstructions = () => {
  return `
📧 Gmail SMTP Setup Instructions:

1. Enable 2-Factor Authentication:
   - Go to myaccount.google.com
   - Security → 2-Step Verification → Turn On

2. Generate App Password:
   - Go to myaccount.google.com
   - Security → 2-Step Verification → App Passwords
   - Select app: Mail
   - Select device: Other (custom name) → "HMS Backend"
   - Copy the 16-character password

3. Update your .env file:
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-16-character-app-password
   FROM_EMAIL=your-email@gmail.com

Alternative: Use Gmail service (recommended):
   Remove SMTP_HOST and SMTP_PORT, keep others the same.
`;
};

module.exports = {
  sendVerificationEmail,
  sendUserInvitationEmail,
  sendWelcomeEmail,
  testEmailConfig,
  getGmailSetupInstructions
};