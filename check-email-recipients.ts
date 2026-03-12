/**
 * Script to check who currently receives project PDF emails
 * Run this script to see the current email configuration
 */

import { EmailService } from './src/services/emailService';

async function checkEmailRecipients() {
  console.log('='.repeat(60));
  console.log('📧 Checking Current Email Recipients for Project PDFs');
  console.log('='.repeat(60));
  console.log('');

  const emailService = new EmailService();
  emailService.configureFromEnv();
  
  const config = emailService.getConfig();
  
  if (!config) {
    console.log('❌ Email service is NOT configured.');
    console.log('');
    console.log('No one is currently receiving project PDF emails.');
    console.log('');
    console.log('To configure email recipients, you can:');
    console.log('1. Set environment variable EMAIL_TO (comma-separated for multiple)');
    console.log('   Example: EMAIL_TO=manager@mitascorp.co.za,team@mitascorp.co.za');
    console.log('');
    console.log('2. Use the API endpoint POST /api/email/config (Admin only)');
    console.log('   Endpoint: POST /api/email/config');
    console.log('   Body: { "to": ["email1@example.com", "email2@example.com"], ... }');
    console.log('');
    return;
  }

  console.log('✅ Email service is configured.');
  console.log('');
  console.log('📤 Sender (FROM):');
  console.log(`   ${config.from}`);
  console.log('');
  console.log('📥 Recipients (TO):');
  
  if (Array.isArray(config.to)) {
    if (config.to.length === 0) {
      console.log('   ⚠️  No recipients configured!');
    } else {
      config.to.forEach((email, index) => {
        console.log(`   ${index + 1}. ${email}`);
      });
      console.log('');
      console.log(`   Total: ${config.to.length} recipient(s)`);
    }
  } else {
    if (!config.to || config.to.trim() === '') {
      console.log('   ⚠️  No recipients configured!');
    } else {
      // Handle comma-separated string
      const recipients = config.to.split(',').map(e => e.trim()).filter(e => e);
      if (recipients.length === 0) {
        console.log('   ⚠️  No recipients configured!');
      } else {
        recipients.forEach((email, index) => {
          console.log(`   ${index + 1}. ${email}`);
        });
        console.log('');
        console.log(`   Total: ${recipients.length} recipient(s)`);
      }
    }
  }
  
  console.log('');
  console.log('📋 SMTP Configuration:');
  console.log(`   Host: ${config.host}`);
  console.log(`   Port: ${config.port}`);
  console.log(`   Secure: ${config.secure}`);
  console.log(`   User: ${config.auth.user}`);
  console.log('');
  console.log('='.repeat(60));
  console.log('');
  console.log('💡 Note: These recipients receive daily order/project PDF reports');
  console.log('   at 6:55 PM (18:55) Johannesburg time every day.');
  console.log('');
}

// Run the check
checkEmailRecipients().catch((error) => {
  console.error('Error checking email recipients:', error);
  process.exit(1);
});


