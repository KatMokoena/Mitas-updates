# Email Troubleshooting Guide

## Common Issues and Solutions

### Issue: "Missing credentials for 'LOGIN'" Error

**Solution:** This has been fixed in the code. The issue was that nodemailer requires `pass` instead of `password` in the auth object.

### Issue: Password with Special Characters

If your password contains special characters (like `#`, `&`, `$`, etc.), you may need to quote it in your `.env` file:

**Option 1: Use quotes**
```env
SMTP_PASSWORD="Mit-Kat#679&"
```

**Option 2: Use single quotes**
```env
SMTP_PASSWORD='Mit-Kat#679&'
```

**Option 3: Escape special characters**
```env
SMTP_PASSWORD=Mit-Kat\#679\&
```

### Issue: MFA (Multi-Factor Authentication) Enabled

If your Office 365 account has MFA enabled, you **must** use an App Password instead of your regular password.

**Steps to create an App Password:**
1. Go to https://account.microsoft.com/security
2. Navigate to "Security info" → "App passwords"
3. Generate a new app password
4. Use that app password in your `.env` file

### Issue: Authentication Failed

**Check:**
1. ✅ Your email address is correct (full address: `user@domain.com`)
2. ✅ Your password is correct (or app password if MFA is enabled)
3. ✅ The password doesn't have extra spaces (the code now trims whitespace)
4. ✅ Your account isn't locked or suspended

### Issue: Connection Timeout

**Check:**
1. ✅ Port 587 is not blocked by firewall
2. ✅ Your network allows SMTP connections
3. ✅ SMTP server address is correct: `smtp.office365.com`

## Testing

Run the test script:
```bash
npm run test:email
```

This will:
- Check if credentials are loaded
- Test SMTP connection
- Show detailed error messages if something fails

## Current Configuration

Your current `.env` settings:
- **Host:** `smtp.office365.com`
- **Port:** `587`
- **Secure:** `false` (uses STARTTLS)
- **User:** `katleho@tracesol.co.za`
- **From:** `katleho@tracesol.co.za`
- **To:** `kayy2m2@gmail.com`

## Next Steps

1. Try running the test again: `npm run test:email`
2. If it still fails, try quoting the password in `.env`:
   ```env
   SMTP_PASSWORD="Mit-Kat#679&"
   ```
3. If MFA is enabled, create and use an App Password
4. Check the detailed error messages in the test output




