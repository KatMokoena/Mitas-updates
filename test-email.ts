import 'reflect-metadata';
import dotenv from 'dotenv';
import { initializeDatabase } from './src/database/config';
import { EmailService } from './src/services/emailService';
import { PdfService } from './src/services/pdfService';
import { SchedulerService } from './src/services/schedulerService';

// Load environment variables from .env file
dotenv.config();

/**
 * Test script to manually trigger email sending with PDF reports
 * 
 * Usage: npx ts-node test-email.ts
 */
async function testEmailSending() {
  try {
    console.log('='.repeat(60));
    console.log('Email Test Script - Starting...');
    console.log('='.repeat(60));
    console.log('');

    // Step 1: Initialize database
    console.log('📊 Step 1: Initializing database...');
    await initializeDatabase();
    console.log('✅ Database initialized successfully\n');

    // Step 2: Initialize email service
    console.log('📧 Step 2: Initializing email service...');
    const emailService = new EmailService();
    emailService.configureFromEnv();
    
    const emailConfig = emailService.getConfig();
    if (!emailConfig) {
      console.error('❌ Email service not configured!');
      console.error('Please check your .env file and ensure the following are set:');
      console.error('  - SMTP_USER');
      console.error('  - SMTP_PASSWORD');
      console.error('  - EMAIL_FROM');
      console.error('  - EMAIL_TO');
      process.exit(1);
    }
    
    console.log('✅ Email service configured');
    console.log(`   From: ${emailConfig.from}`);
    console.log(`   To: ${Array.isArray(emailConfig.to) ? emailConfig.to.join(', ') : emailConfig.to}`);
    console.log('');

    // Step 3: Test email connection
    console.log('🔌 Step 3: Testing SMTP connection...');
    try {
      const connectionTest = await emailService.testConnection();
      if (!connectionTest) {
        console.error('❌ SMTP connection test failed!');
        console.error('Please check your SMTP credentials in the .env file');
        console.error('');
        console.error('Common issues:');
        console.error('  1. Password contains special characters - try quoting it in .env file');
        console.error('  2. If MFA is enabled, use an App Password instead');
        console.error('  3. Check that SMTP_USER is your full email address');
        process.exit(1);
      }
      console.log('✅ SMTP connection test successful\n');
    } catch (error) {
      console.error('❌ SMTP connection test failed with error:');
      if (error instanceof Error) {
        console.error(`   Error: ${error.message}`);
        if (error.message.includes('Application-specific password required') || error.message.includes('App-specific password')) {
          console.error('');
          console.error('   🔐 GMAIL REQUIRES AN APP PASSWORD');
          console.error('   Even without 2-Step Verification, Gmail requires App Passwords for SMTP.');
          console.error('');
          console.error('   Steps to fix:');
          console.error('   1. Go to: https://myaccount.google.com/apppasswords');
          console.error('   2. Enable 2-Step Verification (temporarily, if not already enabled)');
          console.error('   3. Generate an App Password for "Mail"');
          console.error('   4. Copy the 16-character password');
          console.error('   5. Update SMTP_PASSWORD in your .env file');
          console.error('');
          console.error('   See GMAIL_APP_PASSWORD_SETUP.md for detailed instructions.');
        } else if (error.message.includes('EAUTH') || error.message.includes('LOGIN')) {
          console.error('');
          console.error('   Authentication failed. Possible causes:');
          console.error('   - Incorrect password');
          console.error('   - Password contains special characters that need escaping');
          console.error('   - MFA is enabled - you need to use an App Password');
          console.error('   - Account may be locked or require additional security');
        }
      }
      process.exit(1);
    }

    // Step 4: Initialize PDF service
    console.log('📄 Step 4: Initializing PDF service...');
    const pdfService = new PdfService();
    console.log('✅ PDF service initialized\n');

    // Step 5: Initialize scheduler service
    console.log('⏰ Step 5: Initializing scheduler service...');
    const schedulerService = new SchedulerService(emailService, pdfService);
    console.log('✅ Scheduler service initialized\n');

    // Step 6: Trigger email sending
    console.log('🚀 Step 6: Triggering email sending...');
    console.log('   This will:');
    console.log('   1. Fetch all orders from the database');
    console.log('   2. Generate PDF reports for each order');
    console.log('   3. Send email with all PDF attachments');
    console.log('');
    
    await schedulerService.sendDailyReports();
    
    console.log('');
    console.log('='.repeat(60));
    console.log('✅ Email test completed successfully!');
    console.log('='.repeat(60));
    console.log('');
    console.log('📬 Check the recipient email inbox for the reports.');
    console.log('   Recipient:', Array.isArray(emailConfig.to) ? emailConfig.to.join(', ') : emailConfig.to);
    console.log('');

  } catch (error) {
    console.error('');
    console.error('='.repeat(60));
    console.error('❌ Error during email test:');
    console.error('='.repeat(60));
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
    } else {
      console.error('Unknown error:', error);
    }
    console.error('');
    process.exit(1);
  } finally {
    // Give a moment for any async operations to complete
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  }
}

// Run the test
testEmailSending();

