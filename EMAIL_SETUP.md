# Email Scheduler Setup Guide

The MITAS IPMP system can automatically send daily order reports via email at 8:00 AM every day.

## Configuration

### Option 1: Environment Variables (Recommended for Production)

Set the following environment variables before starting the server:

```bash
SMTP_HOST=smtp.office365.com      # Outlook/Office 365 SMTP server
SMTP_PORT=587                     # SMTP port (587 for STARTTLS, 465 for SSL)
SMTP_SECURE=false                 # true for SSL (port 465), false for STARTTLS (port 587)
SMTP_USER=yourname@mitascorp.co.za # Your Outlook email address
SMTP_PASSWORD=your-password       # Your Outlook password or app password (if MFA enabled)
EMAIL_FROM=yourname@mitascorp.co.za # Email address to send from
EMAIL_TO=recipient@example.com     # Email address(es) to send to (comma-separated for multiple)
```

**Example for Outlook/Office 365:**
```bash
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=yourname@mitascorp.co.za
SMTP_PASSWORD=your-password
EMAIL_FROM=yourname@mitascorp.co.za
EMAIL_TO=manager@mitascorp.co.za,team@mitascorp.co.za
```

**Note for Outlook/Office 365:**
- Use your full email address as the username (e.g., `yourname@mitascorp.co.za`)
- Use your regular account password
- If you have Multi-Factor Authentication (MFA) enabled, you may need to use an App Password instead
- Port 587 with `SMTP_SECURE=false` uses STARTTLS (recommended)
- Port 465 with `SMTP_SECURE=true` uses SSL (alternative option)

### Option 2: API Configuration (Admin Only)

You can also configure email settings via the API after logging in as an admin:

**Endpoint:** `POST /api/email/config`

**Request Body (Outlook/Office 365):**
```json
{
  "host": "smtp.office365.com",
  "port": 587,
  "secure": false,
  "auth": {
    "user": "yourname@mitascorp.co.za",
    "password": "your-password"
  },
  "from": "yourname@mitascorp.co.za",
  "to": ["manager@mitascorp.co.za", "team@mitascorp.co.za"]
}
```

**Get Current Configuration:**
```bash
GET /api/email/config
```

**Test Email Connection:**
```bash
POST /api/email/test
```

## How It Works

1. **Scheduler**: The system uses `node-cron` to schedule daily emails at 8:00 AM (Africa/Johannesburg timezone).

2. **PDF Generation**: For each order in the system, a PDF report is generated with:
   - Order information
   - Timeline status
   - Required solutions & equipment
   - Task details
   - Critical path analysis

3. **Email Sending**: All order reports are bundled into a single email with multiple PDF attachments.

4. **Automatic Start**: The scheduler automatically starts when the server starts, if email configuration is available.

## Manual Trigger (Testing)

To manually trigger the daily reports for testing, you can call the scheduler service directly. This requires access to the server code or creating a test endpoint.

## Troubleshooting

### Email Not Sending

1. **Check Configuration**: Verify that all SMTP settings are correct
2. **Test Connection**: Use `POST /api/email/test` to verify SMTP connectivity
3. **Check Logs**: Look for error messages in the server console
4. **Firewall**: Ensure the server can connect to the SMTP server on the specified port

### Outlook/Office 365 Issues

- **Authentication Failed**: 
  - Ensure you're using your full email address (e.g., `user@mitascorp.co.za`) as the username
  - Verify your password is correct
  - If MFA is enabled, you may need to create an App Password in your Office 365 account settings

- **Connection Timeout**:
  - Check firewall settings - port 587 (STARTTLS) or 465 (SSL) must be open
  - Verify SMTP server address: `smtp.office365.com`
  - Some networks block SMTP ports - check with your IT department

- **App Passwords for MFA**:
  - Go to Office 365 Security Settings
  - Navigate to "Security info" → "App passwords"
  - Generate a new app password and use it instead of your regular password

### Scheduler Not Running

- Check that email configuration is set (either via env vars or API)
- Verify the server logs for initialization messages
- The scheduler only starts if email configuration is valid

## Timezone

The scheduler runs at 8:00 AM in the `Africa/Johannesburg` timezone. To change this, modify the timezone in `src/services/schedulerService.ts`:

```typescript
timezone: 'Africa/Johannesburg', // Change to your desired timezone
```

## Cron Expression

The current cron expression is `0 8 * * *` which means:
- `0` - At minute 0
- `8` - At hour 8 (8 AM)
- `*` - Every day of the month
- `*` - Every month
- `*` - Every day of the week

To change the schedule, modify the cron expression in `src/services/schedulerService.ts`.

## Security Notes

- Never commit SMTP passwords to version control
- Use environment variables or secure configuration management
- For Office 365 with MFA, use App Passwords instead of regular passwords
- Regularly rotate SMTP credentials
- Consider using Azure AD authentication for enhanced security (requires additional setup)

