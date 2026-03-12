# Testing Email Functionality

## Prerequisites
1. Make sure your `.env` file has valid email credentials configured
2. Start the server: `npm run dev`
3. You need to be logged in as an **Admin** user

## Test Steps

### Step 1: Test Email Connection
First, verify your SMTP connection works:

**Using curl:**
```bash
curl -X POST http://localhost:3001/api/email/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

**Using Postman or similar:**
- Method: `POST`
- URL: `http://localhost:3001/api/email/test`
- Headers:
  - `Content-Type: application/json`
  - `Authorization: Bearer YOUR_AUTH_TOKEN`

### Step 2: Manually Trigger Email with PDF Reports
Send a test email with PDF reports:

**Using curl:**
```bash
curl -X POST http://localhost:3001/api/email/send-reports \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

**Using Postman or similar:**
- Method: `POST`
- URL: `http://localhost:3001/api/email/send-reports`
- Headers:
  - `Content-Type: application/json`
  - `Authorization: Bearer YOUR_AUTH_TOKEN`

## What Happens When You Trigger the Email

1. **Fetches Orders**: The system retrieves all orders from the database
2. **Generates PDFs**: For each order, a PDF report is generated
3. **Sends Email**: All PDFs are bundled into a single email and sent to the recipient(s) specified in `EMAIL_TO`

## Expected Response

**Success:**
```json
{
  "message": "Daily reports email sent successfully. Check the server logs for details."
}
```

**Error (if email not configured):**
```json
{
  "error": "Email service not configured. Please configure email settings first."
}
```

## Check Server Logs

After triggering, check your server console for detailed logs:
- `Starting daily report generation...`
- `Generating PDFs for X order(s)...`
- `Generated PDF for order ORDER_NUMBER`
- `Successfully sent daily reports email with X order report(s).`

## Troubleshooting

1. **No orders found**: Make sure you have orders in the database
2. **Email not configured**: Verify your `.env` file has all required fields
3. **SMTP connection failed**: Check your email credentials and network connection
4. **PDF generation failed**: Check server logs for specific error messages












