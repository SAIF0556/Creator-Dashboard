const nodemailer = require('nodemailer');
const logger = require('./logger');

class EmailService {
  constructor() {
    this.setupTransporter();
  }

  /**
   * Setup email transporter
   */
  setupTransporter() {
    this.transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  /**
   * Send an email
   * @param {Object} mailOptions - Email options
   * @returns {Promise} Sending result
   */
  async sendEmail(mailOptions) {
    try {
      // Set default from address if not provided
      if (!mailOptions.from) {
        mailOptions.from = process.env.EMAIL_FROM || 'Creator Dashboard <noreply@creatordashboard.com>';
      }

      // Don't send emails in test environment
      if (process.env.NODE_ENV === 'test') {
        logger.info('Test environment: Email not actually sent', mailOptions);
        return { success: true, messageId: 'test-email-id' };
      }

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent: ${result.messageId}`);
      return result;
    } catch (error) {
      logger.error('Error sending email:', error);
      throw error;
    }
  }

  /**
   * Send verification email
   * @param {string} to - Recipient email
   * @param {string} token - Verification token
   * @returns {Promise} Sending result
   */
  async sendVerificationEmail(to, token) {
    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    
    const mailOptions = {
      to,
      subject: 'Verify Your Email - Creator Dashboard',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Verify Your Email Address</h2>
          <p>Thank you for signing up for Creator Dashboard! Please verify your email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationLink}" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify Email</a>
          </div>
          <p>If the button doesn't work, you can also copy and paste the following link into your browser:</p>
          <p>${verificationLink}</p>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't create an account with us, please ignore this email.</p>
          <hr style="margin: 30px 0;">
          <p style="font-size: 12px; color: #666;">© ${new Date().getFullYear()} Creator Dashboard. All rights reserved.</p>
        </div>
      `
    };

    return this.sendEmail(mailOptions);
  }

  /**
   * Send password reset email
   * @param {string} to - Recipient email
   * @param {string} token - Reset token
   * @returns {Promise} Sending result
   */
  async sendPasswordResetEmail(to, token) {
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    
    const mailOptions = {
      to,
      subject: 'Reset Your Password - Creator Dashboard',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Reset Your Password</h2>
          <p>You recently requested to reset your password. Click the button below to create a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #2196F3; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
          </div>
          <p>If the button doesn't work, you can also copy and paste the following link into your browser:</p>
          <p>${resetLink}</p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request a password reset, please ignore this email or contact support if you're concerned about the security of your account.</p>
          <hr style="margin: 30px 0;">
          <p style="font-size: 12px; color: #666;">© ${new Date().getFullYear()} Creator Dashboard. All rights reserved.</p>
        </div>
      `
    };

    return this.sendEmail(mailOptions);
  }

  /**
   * Send notification email
   * @param {string} to - Recipient email
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @param {string} actionUrl - Optional action URL
   * @returns {Promise} Sending result
   */
  async sendNotificationEmail(to, title, message, actionUrl = null) {
    let actionButton = '';
    if (actionUrl) {
      actionButton = `
        <div style="text-align: center; margin: 20px 0;">
          <a href="${actionUrl}" style="background-color: #673AB7; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; font-weight: bold;">View Details</a>
        </div>
      `;
    }
    
    const mailOptions = {
      to,
      subject: `${title} - Creator Dashboard`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>${title}</h2>
          <p>${message}</p>
          ${actionButton}
          <hr style="margin: 20px 0;">
          <p style="font-size: 12px; color: #666;">
            You received this email because you've signed up for Creator Dashboard notifications.
            <br>
            To update your notification preferences, visit your <a href="${process.env.FRONTEND_URL}/settings">account settings</a>.
          </p>
          <p style="font-size: 12px; color: #666;">© ${new Date().getFullYear()} Creator Dashboard. All rights reserved.</p>
        </div>
      `
    };

    return this.sendEmail(mailOptions);
  }

  /**
   * Send welcome email
   * @param {string} to - Recipient email
   * @param {string} firstName - User's first name
   * @returns {Promise} Sending result
   */
  async sendWelcomeEmail(to, firstName = '') {
    const mailOptions = {
      to,
      subject: 'Welcome to Creator Dashboard',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to Creator Dashboard${firstName ? ', ' + firstName : ''}!</h2>
          <p>Thank you for joining Creator Dashboard. We're excited to have you as part of our community.</p>
          <p>With Creator Dashboard, you can:</p>
          <ul style="padding-left: 20px;">
            <li>Stay updated with content from your favorite platforms in one place</li>
            <li>Save and organize content for later reference</li>
            <li>Earn credits by engaging with the platform</li>
            <li>And much more!</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/dashboard" style="background-color: #FF5722; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Visit Your Dashboard</a>
          </div>
          <p>If you have any questions or feedback, please don't hesitate to contact our support team.</p>
          <hr style="margin: 30px 0;">
          <p style="font-size: 12px; color: #666;">© ${new Date().getFullYear()} Creator Dashboard. All rights reserved.</p>
        </div>
      `
    };

    return this.sendEmail(mailOptions);
  }
}

module.exports = new EmailService();