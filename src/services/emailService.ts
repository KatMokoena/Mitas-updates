import nodemailer, { Transporter } from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean; // true for 465, false for other ports
  auth: {
    user: string;
    password: string;
  };
  from: string; // Email address to send from
  fromName?: string; // Display name for the sender (e.g., "MITAS - IPMP UPDATES")
  to: string | string[]; // Email address(es) to send to
}

export class EmailService {
  private transporter: Transporter | null = null;
  private config: EmailConfig | null = null;

  /**
   * Get formatted "from" address with display name
   * Format: "Display Name <email@address.com>" or just "email@address.com" if no display name
   */
  private getFormattedFromAddress(): string {
    if (!this.config) {
      throw new Error('Email service not configured');
    }
    
    const email = this.config.from;
    const displayName = this.config.fromName || 'MITAS - IPMP UPDATES';
    
    // If email already contains a display name format, use it as-is
    if (email.includes('<') && email.includes('>')) {
      return email;
    }
    
    // Format as "Display Name <email@address.com>"
    return `${displayName} <${email}>`;
  }

  /**
   * Configure the email service with SMTP settings
   */
  configure(config: EmailConfig): void {
    this.config = {
      ...config,
      fromName: config.fromName || 'MITAS - IPMP UPDATES', // Default display name
    };
    
    // For Office 365, we need requireTLS when using port 587
    const transporterOptions: any = {
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.auth.user,
        pass: config.auth.password, // nodemailer uses 'pass' not 'password'
      },
    };
    
    // For Office 365, iCloud, and Gmail on port 587 (STARTTLS), require TLS
    if ((config.host === 'smtp.office365.com' || config.host === 'smtp.mail.me.com' || config.host === 'smtp.gmail.com') && config.port === 587 && !config.secure) {
      transporterOptions.requireTLS = true;
      transporterOptions.tls = {
        rejectUnauthorized: false, // Allow self-signed certificates if needed
      };
    }
    
    this.transporter = nodemailer.createTransport(transporterOptions);
  }

  /**
   * Load configuration from environment variables
   * Defaults to Outlook/Office 365 settings
   */
  configureFromEnv(): void {
    const smtpUser = process.env.SMTP_USER || '';
    const smtpPassword = process.env.SMTP_PASSWORD || '';
    
    // Debug: Check if credentials are being read (but don't log the password)
    if (!smtpUser || !smtpPassword) {
      console.warn('Email service not configured: SMTP_USER and SMTP_PASSWORD must be set');
      console.warn(`SMTP_USER is ${smtpUser ? 'set' : 'missing'}`);
      console.warn(`SMTP_PASSWORD is ${smtpPassword ? 'set' : 'missing'}`);
      return;
    }
    
    const config: EmailConfig = {
      host: process.env.SMTP_HOST || 'smtp.office365.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: smtpUser.trim(),
        password: smtpPassword.trim(), // Trim whitespace that might cause issues
      },
      from: (process.env.EMAIL_FROM || smtpUser).trim(),
      fromName: (process.env.EMAIL_FROM_NAME || 'MITAS - IPMP UPDATES').trim(),
      to: (process.env.EMAIL_TO || '').trim(),
    };

    this.configure(config);
  }

  /**
   * Test the email configuration
   */
  async testConnection(): Promise<boolean> {
    if (!this.transporter) {
      throw new Error('Email service not configured');
    }

    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Email connection test failed:', error);
      return false;
    }
  }

  /**
   * Send an email with PDF attachment
   */
  async sendOrderReport(
    orderNumber: string,
    pdfBuffer: Buffer,
    recipientEmail?: string
  ): Promise<void> {
    if (!this.transporter || !this.config) {
      throw new Error('Email service not configured');
    }

    const to = recipientEmail || this.config.to;
    if (!to) {
      throw new Error('No recipient email address specified');
    }

    const mailOptions = {
      from: this.getFormattedFromAddress(),
      to: Array.isArray(to) ? to.join(', ') : to,
      subject: `Daily Order Report - ${orderNumber} - ${new Date().toLocaleDateString()}`,
      html: `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background-color: #f97316; padding: 20px; border-radius: 5px 5px 0 0;">
                <h1 style="color: white; margin: 0;">MITAS Corporation</h1>
              </div>
              <div style="background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none;">
                <h2 style="color: #333; margin-top: 0;">Daily Order Report</h2>
                <p>Dear Team,</p>
                <p>Please find attached the daily order report for <strong>${orderNumber}</strong>.</p>
                <p>This report was generated on ${new Date().toLocaleString()}.</p>
                <p>Best regards,<br>MITAS IPMP System</p>
              </div>
              <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px; color: #666; border: 1px solid #ddd; border-top: none; border-radius: 0 0 5px 5px;">
                <p>This is an automated email from the MITAS Internal Project Management Platform.</p>
              </div>
            </div>
          </body>
        </html>
      `,
      attachments: [
        {
          filename: `Order-${orderNumber}-${new Date().toISOString().split('T')[0]}.pdf`,
          content: pdfBuffer,
        },
      ],
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', info.messageId);
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  }

  /**
   * Send a generic email
   */
  async sendEmail(
    to: string | string[],
    subject: string,
    htmlContent: string
  ): Promise<void> {
    if (!this.transporter || !this.config) {
      throw new Error('Email service not configured');
    }

    const recipients = Array.isArray(to) ? to.join(', ') : to;
    if (!recipients) {
      throw new Error('No recipient email address specified');
    }

    const mailOptions = {
      from: this.getFormattedFromAddress(),
      to: recipients,
      subject,
      html: htmlContent,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Email sent successfully to ${recipients}`);
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  }

  /**
   * Send email with multiple order reports
   */
  async sendDailyReports(
    reports: Array<{ orderNumber: string; pdfBuffer: Buffer }>,
    recipientEmail?: string
  ): Promise<void> {
    if (!this.transporter || !this.config) {
      throw new Error('Email service not configured');
    }

    const to = recipientEmail || this.config.to;
    if (!to) {
      throw new Error('No recipient email address specified');
    }

    const attachments = reports.length > 0 
      ? reports.map((report) => ({
          filename: `Order-${report.orderNumber}-${new Date().toISOString().split('T')[0]}.pdf`,
          content: report.pdfBuffer,
        }))
      : [];

    // Determine email content based on whether there are reports
    const emailContent = reports.length > 0
      ? `
        <h2 style="color: #333; margin-top: 0;">Daily Order Reports</h2>
        <p>Dear Team,</p>
        <p>Please find attached ${reports.length} order report(s) for today:</p>
        <ul>
          ${reports.map((r) => `<li>Order ${r.orderNumber}</li>`).join('')}
        </ul>
        <p>These reports were generated on ${new Date().toLocaleString()}.</p>
      `
      : `
        <h2 style="color: #333; margin-top: 0;">Daily Project Status Update</h2>
        <p>Dear Team,</p>
        <p>This is your daily project status update for ${new Date().toLocaleDateString()}.</p>
        <div style="background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 5px; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #856404; font-weight: 600;">
            ℹ️ There are no active projects ongoing at this time.
          </p>
        </div>
        <p>This update was generated on ${new Date().toLocaleString()}.</p>
      `;

    const mailOptions = {
      from: this.getFormattedFromAddress(),
      to: Array.isArray(to) ? to.join(', ') : to,
      subject: reports.length > 0 
        ? `Daily Order Reports - ${new Date().toLocaleDateString()}`
        : `Daily Project Status Update - ${new Date().toLocaleDateString()}`,
      html: `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background-color: #f97316; padding: 20px; border-radius: 5px 5px 0 0;">
                <h1 style="color: white; margin: 0;">MITAS Corporation</h1>
              </div>
              <div style="background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none;">
                ${emailContent}
                <p>Best regards,<br>MITAS IPMP System</p>
              </div>
              <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px; color: #666; border: 1px solid #ddd; border-top: none; border-radius: 0 0 5px 5px;">
                <p>This is an automated email from the MITAS Internal Project Management Platform.</p>
              </div>
            </div>
          </body>
        </html>
      `,
      attachments,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Daily reports email sent successfully:', info.messageId);
    } catch (error) {
      console.error('Failed to send daily reports email:', error);
      throw error;
    }
  }

  /**
   * Get current email configuration (without password)
   */
  getConfig(): Omit<EmailConfig, 'auth'> & { auth: { user: string; password: string } } | null {
    if (!this.config) {
      return null;
    }

    return {
      ...this.config,
      auth: {
        user: this.config.auth.user,
        password: '***', // Hide password
      },
    };
  }

  /**
   * Check if email service is configured and ready to send emails
   */
  isConfigured(): boolean {
    return this.transporter !== null && this.config !== null;
  }

  /**
   * Send task invitation email
   */
  async sendTaskInvitationEmail(
    inviteeEmail: string,
    inviteeName: string,
    inviterName: string,
    taskTitle: string,
    orderNumber?: string,
    message?: string
  ): Promise<void> {
    if (!this.transporter || !this.config) {
      console.warn('Email service not configured, skipping task invitation email');
      return;
    }

    const orderInfo = orderNumber ? ` for order <strong>${orderNumber}</strong>` : '';
    const messageSection = message ? `<p><strong>Message from ${inviterName}:</strong></p><p style="background: #f5f5f5; padding: 10px; border-radius: 5px; font-style: italic;">${message}</p>` : '';

    const htmlContent = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f97316; padding: 20px; border-radius: 5px 5px 0 0;">
              <h1 style="color: white; margin: 0;">MITAS Corporation</h1>
            </div>
            <div style="background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none;">
              <h2 style="color: #333; margin-top: 0;">Task Invitation</h2>
              <p>Dear ${inviteeName},</p>
              <p><strong>${inviterName}</strong> has invited you to work on a task${orderInfo}:</p>
              <div style="background: white; padding: 15px; border-left: 4px solid #3498db; margin: 15px 0;">
                <h3 style="margin: 0; color: #3498db;">${taskTitle}</h3>
              </div>
              ${messageSection}
              <p>Please log in to the MITAS IPMP system to accept or decline this invitation.</p>
              <p style="margin-top: 20px;">
                <a href="#" style="background-color: #2ECC71; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Invitation</a>
              </p>
              <p>Best regards,<br>MITAS IPMP System</p>
            </div>
            <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px; color: #666; border: 1px solid #ddd; border-top: none; border-radius: 0 0 5px 5px;">
              <p>This is an automated email from the MITAS Internal Project Management Platform.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    try {
      await this.sendEmail(inviteeEmail, `Task Invitation: ${taskTitle}`, htmlContent);
      console.log(`Task invitation email sent to ${inviteeEmail}`);
    } catch (error) {
      console.error('Failed to send task invitation email:', error);
      // Don't throw - email failure shouldn't break invitation creation
    }
  }

  /**
   * Send project ownership transfer invitation email
   */
  async sendProjectOwnershipInvitationEmail(
    inviteeEmail: string,
    inviteeName: string,
    inviterName: string,
    projectTitle: string,
    message?: string
  ): Promise<void> {
    if (!this.transporter || !this.config) {
      console.warn('Email service not configured, skipping project ownership invitation email');
      return;
    }

    const messageSection = message ? `<p><strong>Message from ${inviterName}:</strong></p><p style="background: #f5f5f5; padding: 10px; border-radius: 5px; font-style: italic;">${message}</p>` : '';

    const htmlContent = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f97316; padding: 20px; border-radius: 5px 5px 0 0;">
              <h1 style="color: white; margin: 0;">MITAS Corporation</h1>
            </div>
            <div style="background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none;">
              <h2 style="color: #333; margin-top: 0;">Project Ownership Transfer</h2>
              <p>Dear ${inviteeName},</p>
              <p><strong>${inviterName}</strong> wants to transfer project ownership to you:</p>
              <div style="background: white; padding: 15px; border-left: 4px solid #8b5cf6; margin: 15px 0;">
                <h3 style="margin: 0; color: #8b5cf6;">${projectTitle}</h3>
              </div>
              ${messageSection}
              <p>Please log in to the MITAS IPMP system to accept or decline this ownership transfer.</p>
              <p style="margin-top: 20px;">
                <a href="#" style="background-color: #8b5cf6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Invitation</a>
              </p>
              <p>Best regards,<br>MITAS IPMP System</p>
            </div>
            <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px; color: #666; border: 1px solid #ddd; border-top: none; border-radius: 0 0 5px 5px;">
              <p>This is an automated email from the MITAS Internal Project Management Platform.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    try {
      await this.sendEmail(inviteeEmail, `Project Ownership Transfer: ${projectTitle}`, htmlContent);
      console.log(`Project ownership invitation email sent to ${inviteeEmail}`);
    } catch (error) {
      console.error('Failed to send project ownership invitation email:', error);
      // Don't throw - email failure shouldn't break invitation creation
    }
  }

  /**
   * Send order ownership transfer invitation email
   */
  async sendOrderOwnershipInvitationEmail(
    inviteeEmail: string,
    inviteeName: string,
    inviterName: string,
    orderNumber: string,
    message?: string
  ): Promise<void> {
    if (!this.transporter || !this.config) {
      console.warn('Email service not configured, skipping order ownership invitation email');
      return;
    }

    const messageSection = message ? `<p><strong>Message from ${inviterName}:</strong></p><p style="background: #f5f5f5; padding: 10px; border-radius: 5px; font-style: italic;">${message}</p>` : '';

    const htmlContent = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f97316; padding: 20px; border-radius: 5px 5px 0 0;">
              <h1 style="color: white; margin: 0;">MITAS Corporation</h1>
            </div>
            <div style="background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none;">
              <h2 style="color: #333; margin-top: 0;">Project Ownership Transfer</h2>
              <p>Dear ${inviteeName},</p>
              <p><strong>${inviterName}</strong> wants to transfer project ownership to you:</p>
              <div style="background: white; padding: 15px; border-left: 4px solid #8b5cf6; margin: 15px 0;">
                <h3 style="margin: 0; color: #8b5cf6;">${orderNumber}</h3>
              </div>
              ${messageSection}
              <p>Please log in to the MITAS IPMP system to accept or decline this ownership transfer.</p>
              <p style="margin-top: 20px;">
                <a href="#" style="background-color: #8b5cf6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Invitation</a>
              </p>
              <p>Best regards,<br>MITAS IPMP System</p>
            </div>
            <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px; color: #666; border: 1px solid #ddd; border-top: none; border-radius: 0 0 5px 5px;">
              <p>This is an automated email from the MITAS Internal Project Management Platform.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    try {
      await this.sendEmail(inviteeEmail, `Project Ownership Transfer: ${orderNumber}`, htmlContent);
      console.log(`Order ownership invitation email sent to ${inviteeEmail}`);
    } catch (error) {
      console.error('Failed to send order ownership invitation email:', error);
      // Don't throw - email failure shouldn't break invitation creation
    }
  }

  /**
   * Send task assignment email
   */
  async sendTaskAssignmentEmail(
    assigneeEmail: string,
    assigneeName: string,
    assignerName: string,
    taskTitle: string,
    projectTitle?: string,
    orderNumber?: string
  ): Promise<void> {
    if (!this.transporter || !this.config) {
      console.warn('Email service not configured, skipping task assignment email');
      return;
    }

    const projectInfo = projectTitle ? ` in project <strong>${projectTitle}</strong>` : '';
    const orderInfo = orderNumber ? ` for order <strong>${orderNumber}</strong>` : '';

    const htmlContent = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f97316; padding: 20px; border-radius: 5px 5px 0 0;">
              <h1 style="color: white; margin: 0;">MITAS Corporation</h1>
            </div>
            <div style="background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none;">
              <h2 style="color: #333; margin-top: 0;">Task Assignment</h2>
              <p>Dear ${assigneeName},</p>
              <p><strong>${assignerName}</strong> has assigned you a new task${projectInfo}${orderInfo}:</p>
              <div style="background: white; padding: 15px; border-left: 4px solid #3498db; margin: 15px 0;">
                <h3 style="margin: 0; color: #3498db;">${taskTitle}</h3>
              </div>
              <p>Please log in to the MITAS IPMP system to view the task details and get started.</p>
              <p style="margin-top: 20px;">
                <a href="#" style="background-color: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Task</a>
              </p>
              <p>Best regards,<br>MITAS IPMP System</p>
            </div>
            <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px; color: #666; border: 1px solid #ddd; border-top: none; border-radius: 0 0 5px 5px;">
              <p>This is an automated email from the MITAS Internal Project Management Platform.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    try {
      await this.sendEmail(assigneeEmail, `Task Assigned: ${taskTitle}`, htmlContent);
      console.log(`Task assignment email sent to ${assigneeEmail}`);
    } catch (error) {
      console.error('Failed to send task assignment email:', error);
      // Don't throw - email failure shouldn't break task assignment
    }
  }

  /**
   * Send requisition notification email to approvers
   */
  async sendRequisitionNotificationEmail(
    approverEmail: string,
    approverName: string,
    requesterName: string,
    orderNumber: string,
    requisitionId: string
  ): Promise<void> {
    if (!this.transporter || !this.config) {
      console.warn('Email service not configured, skipping requisition notification email');
      return;
    }

    const htmlContent = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f97316; padding: 20px; border-radius: 5px 5px 0 0;">
              <h1 style="color: white; margin: 0;">MITAS Corporation</h1>
            </div>
            <div style="background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none;">
              <h2 style="color: #333; margin-top: 0;">Requisition Approval Required</h2>
              <p>Dear ${approverName},</p>
              <p><strong>${requesterName}</strong> has submitted a requisition that requires your approval:</p>
              <div style="background: white; padding: 15px; border-left: 4px solid #f39c12; margin: 15px 0;">
                <h3 style="margin: 0; color: #f39c12;">Order: ${orderNumber}</h3>
                <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">Requisition ID: ${requisitionId}</p>
              </div>
              <p>Please log in to the MITAS IPMP system to review and approve or decline this requisition.</p>
              <p style="margin-top: 20px;">
                <a href="#" style="background-color: #f39c12; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Review Requisition</a>
              </p>
              <p>Best regards,<br>MITAS IPMP System</p>
            </div>
            <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px; color: #666; border: 1px solid #ddd; border-top: none; border-radius: 0 0 5px 5px;">
              <p>This is an automated email from the MITAS Internal Project Management Platform.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    try {
      await this.sendEmail(approverEmail, `Requisition Approval Required: ${orderNumber}`, htmlContent);
      console.log(`Requisition notification email sent to ${approverEmail}`);
    } catch (error) {
      console.error('Failed to send requisition notification email:', error);
      // Don't throw - email failure shouldn't break requisition creation
    }
  }

  /**
   * Send task completion email
   */
  async sendTaskCompletionEmail(
    assigneeEmail: string,
    assigneeName: string,
    taskTitle: string,
    projectTitle?: string,
    orderNumber?: string
  ): Promise<void> {
    if (!this.transporter || !this.config) {
      console.warn('Email service not configured, skipping task completion email');
      return;
    }

    const projectInfo = projectTitle ? ` in project <strong>${projectTitle}</strong>` : '';
    const orderInfo = orderNumber ? ` for order <strong>${orderNumber}</strong>` : '';

    const htmlContent = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f97316; padding: 20px; border-radius: 5px 5px 0 0;">
              <h1 style="color: white; margin: 0;">MITAS Corporation</h1>
            </div>
            <div style="background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none;">
              <h2 style="color: #333; margin-top: 0;">Task Completed</h2>
              <p>Dear ${assigneeName},</p>
              <p>Great work! The following task has been marked as completed:</p>
              <div style="background: white; padding: 15px; border-left: 4px solid #2ECC71; margin: 15px 0;">
                <h3 style="margin: 0; color: #2ECC71;">${taskTitle}</h3>
                ${projectInfo || orderInfo ? `<p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">${projectInfo || orderInfo}</p>` : ''}
              </div>
              <p>Thank you for your contribution to this project.</p>
              <p>Best regards,<br>MITAS IPMP System</p>
            </div>
            <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px; color: #666; border: 1px solid #ddd; border-top: none; border-radius: 0 0 5px 5px;">
              <p>This is an automated email from the MITAS Internal Project Management Platform.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    try {
      await this.sendEmail(assigneeEmail, `Task Completed: ${taskTitle}`, htmlContent);
      console.log(`Task completion email sent to ${assigneeEmail}`);
    } catch (error) {
      console.error('Failed to send task completion email:', error);
      // Don't throw - email failure shouldn't break task completion
    }
  }

  /**
   * Send project/order completion email
   */
  async sendProjectCompletionEmail(
    recipientEmail: string,
    recipientName: string,
    projectTitle: string,
    projectType: 'project' | 'order',
    orderNumber?: string
  ): Promise<void> {
    if (!this.transporter || !this.config) {
      console.warn('Email service not configured, skipping project completion email');
      return;
    }

    const projectLabel = projectType === 'order' ? 'Order' : 'Project';
    const displayTitle = projectType === 'order' && orderNumber ? orderNumber : projectTitle;

    const htmlContent = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f97316; padding: 20px; border-radius: 5px 5px 0 0;">
              <h1 style="color: white; margin: 0;">MITAS Corporation</h1>
            </div>
            <div style="background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none;">
              <h2 style="color: #333; margin-top: 0;">${projectLabel} Completed</h2>
              <p>Dear ${recipientName},</p>
              <p>Congratulations! The following ${projectLabel.toLowerCase()} has been completed:</p>
              <div style="background: white; padding: 15px; border-left: 4px solid #2ECC71; margin: 15px 0;">
                <h3 style="margin: 0; color: #2ECC71;">${displayTitle}</h3>
              </div>
              <p>All tasks have been completed successfully. Thank you for your hard work!</p>
              <p style="margin-top: 20px;">
                <a href="#" style="background-color: #2ECC71; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View ${projectLabel}</a>
              </p>
              <p>Best regards,<br>MITAS IPMP System</p>
            </div>
            <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px; color: #666; border: 1px solid #ddd; border-top: none; border-radius: 0 0 5px 5px;">
              <p>This is an automated email from the MITAS Internal Project Management Platform.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    try {
      await this.sendEmail(recipientEmail, `${projectLabel} Completed: ${displayTitle}`, htmlContent);
      console.log(`${projectLabel} completion email sent to ${recipientEmail}`);
    } catch (error) {
      console.error(`Failed to send ${projectLabel.toLowerCase()} completion email:`, error);
      // Don't throw - email failure shouldn't break project completion
    }
  }
}

