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
  to: string | string[]; // Email address(es) to send to
}

export class EmailService {
  private transporter: Transporter | null = null;
  private config: EmailConfig | null = null;

  /**
   * Configure the email service with SMTP settings
   */
  configure(config: EmailConfig): void {
    this.config = config;
    
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
      from: this.config.from,
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
      from: this.config.from,
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

    if (reports.length === 0) {
      console.log('No reports to send');
      return;
    }

    const attachments = reports.map((report) => ({
      filename: `Order-${report.orderNumber}-${new Date().toISOString().split('T')[0]}.pdf`,
      content: report.pdfBuffer,
    }));

    const mailOptions = {
      from: this.config.from,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject: `Daily Order Reports - ${new Date().toLocaleDateString()}`,
      html: `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background-color: #f97316; padding: 20px; border-radius: 5px 5px 0 0;">
                <h1 style="color: white; margin: 0;">MITAS Corporation</h1>
              </div>
              <div style="background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none;">
                <h2 style="color: #333; margin-top: 0;">Daily Order Reports</h2>
                <p>Dear Team,</p>
                <p>Please find attached ${reports.length} order report(s) for today:</p>
                <ul>
                  ${reports.map((r) => `<li>Order ${r.orderNumber}</li>`).join('')}
                </ul>
                <p>These reports were generated on ${new Date().toLocaleString()}.</p>
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
}

