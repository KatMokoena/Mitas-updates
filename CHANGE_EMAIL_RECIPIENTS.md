# How to Change Daily Report Email Recipients

## Quick Steps

1. **Edit the `.env` file** in the project root
2. **Update the `EMAIL_TO` line** with new recipients
3. **Restart the server** for changes to take effect

## Detailed Instructions

### Step 1: Edit `.env` File

Open the `.env` file and find this line:
```
EMAIL_TO=katleho@tracesol.co.za, fiona@tracesol.co.za, kyle@tracesol.co.za
```

Change it to your new recipients (comma-separated, no spaces):
```
EMAIL_TO=newperson1@example.com,newperson2@example.com,newperson3@example.com
```

**Important Notes:**
- Use commas to separate multiple email addresses
- **Remove spaces after commas** (best practice)
- No quotes needed around the email addresses

### Step 2: Restart the Server

After saving the `.env` file, restart your server:

**On Windows (local development):**
- Stop the server (Ctrl+C)
- Run `npm start` again

**On Azure/Linux (production):**
- If using PM2: `pm2 restart ipmp`
- Or restart the service/application

### Step 3: Verify Changes

You can verify the new recipients are configured by:

1. **Running the check script:**
   ```bash
   npx ts-node check-email-recipients.ts
   ```

2. **Or checking server logs** on startup - it will show:
   ```
   ✅ Email service configured successfully
      From: kayy2m2@gmail.com
   ```

## Alternative: API Configuration (Temporary)

You can also change recipients via the API, but **this is temporary** and will be lost on server restart:

**Endpoint:** `POST /api/email/config` (Admin only)

**Request Body:**
```json
{
  "host": "smtp.gmail.com",
  "port": 587,
  "secure": false,
  "auth": {
    "user": "kayy2m2@gmail.com",
    "password": "your-password"
  },
  "from": "kayy2m2@gmail.com",
  "fromName": "MITAS - IPMP UPDATES",
  "to": ["newperson1@example.com", "newperson2@example.com"]
}
```

**⚠️ Warning:** API changes are only in memory and will be lost when the server restarts. Always update the `.env` file for permanent changes.

## Current Configuration

- **Send Time:** 17:00 (5:00 PM) daily
- **From Address:** kayy2m2@gmail.com
- **Display Name:** "MITAS - IPMP UPDATES"
- **Recipients:** Set in `EMAIL_TO` environment variable

## Troubleshooting

**Emails not sending after change:**
1. Verify `.env` file was saved correctly
2. Check that server was restarted
3. Verify SMTP credentials are still valid
4. Check server logs for errors

**Recipients not updating:**
- Make sure you restarted the server after changing `.env`
- Check for typos in email addresses
- Verify no extra spaces or special characters
