# Gmail App Password Setup Guide

## Why App Passwords Are Required

Gmail requires App Passwords for third-party applications (like this email service) to access your account via SMTP, even if you don't have 2-Step Verification enabled. This is a security feature.

## Solution: Generate an App Password

### Step 1: Enable 2-Step Verification (Temporarily)

Even if you don't want to use 2-Step Verification for regular logins, you need to enable it temporarily to generate an App Password:

1. Go to: https://myaccount.google.com/security
2. Sign in with your Gmail account (`kayy2m2@gmail.com`)
3. Under "Signing in to Google", find "2-Step Verification"
4. Click "Get started" and follow the prompts to enable it
   - You'll need to verify your phone number
   - This is a one-time setup

### Step 2: Generate App Password

1. Go to: https://myaccount.google.com/apppasswords
   - Or navigate: Google Account → Security → 2-Step Verification → App passwords
2. Sign in if prompted
3. Select "Mail" as the app type
4. Select "Other (Custom name)" as the device
5. Enter a name like "MITAS IPMP Email Service"
6. Click "Generate"
7. **Copy the 16-character password** (it will look like: `abcd efgh ijkl mnop`)
   - ⚠️ **Important:** You can only see this password once! Copy it immediately.

### Step 3: Update .env File

Replace the password in your `.env` file with the App Password:

```env
SMTP_PASSWORD=abcdefghijklmnop
```

(Remove the spaces from the generated password)

### Step 4: Test Again

Run the test:
```bash
npm run test:email
```

## Alternative: Check Account Security Settings

If you really don't want to enable 2-Step Verification, you can try:

1. Go to: https://myaccount.google.com/security
2. Check if "Less secure app access" is available (most accounts don't have this anymore)
3. If available, enable it (not recommended for security reasons)

**Note:** Google has deprecated "Less secure app access" for most accounts, so App Passwords are the recommended and most secure solution.

## Why This Happens

Gmail blocks regular password authentication for security reasons. App Passwords are:
- More secure than regular passwords
- Can be revoked individually
- Don't give full account access
- Required for SMTP access in modern Gmail accounts

## After Setup

Once you have the App Password working, you can:
- Keep 2-Step Verification enabled (recommended for security)
- Or disable it if you prefer (but you'll need to keep the App Password)

The App Password will continue to work even if you disable 2-Step Verification later.




