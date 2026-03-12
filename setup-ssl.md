# SSL/HTTPS Setup Guide

This guide explains how to set up HTTPS for your MITAS IPMP application to resolve Chrome's "Not secure" warning.

## Option 1: Self-Signed Certificate (For Development/Internal Use)

### Step 1: Generate Self-Signed Certificate

Run this command in your project root directory:

**Windows (PowerShell):**
```powershell
# Create ssl directory
New-Item -ItemType Directory -Force -Path ssl

# Generate self-signed certificate (valid for 365 days)
openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes -subj "/CN=4.221.123.103"
```

**Linux/Mac:**
```bash
# Create ssl directory
mkdir -p ssl

# Generate self-signed certificate (valid for 365 days)
openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes -subj "/CN=4.221.123.103"
```

**Note:** If you don't have OpenSSL installed:
- **Windows:** Download from https://slproweb.com/products/Win32OpenSSL.html or use Git Bash
- **Mac:** Already installed, or use `brew install openssl`
- **Linux:** `sudo apt-get install openssl` (Ubuntu/Debian) or `sudo yum install openssl` (CentOS/RHEL)

### Step 2: Update .env File

Add this line to your `.env` file:

```bash
USE_HTTPS=true
```

### Step 3: Restart Server

Restart your server. It will automatically detect the SSL certificates and use HTTPS.

### Step 4: Access via HTTPS

Access your application at: `https://4.221.123.103:3000`

**Important:** Chrome will show a warning for self-signed certificates. Click "Advanced" → "Proceed to 4.221.123.103 (unsafe)" to continue.

## Option 2: Custom Certificate Paths

If your certificates are in a different location, specify them in `.env`:

```bash
USE_HTTPS=true
SSL_KEY_PATH=/path/to/your/key.pem
SSL_CERT_PATH=/path/to/your/cert.pem
```

## Option 3: Production SSL Certificate (Recommended for Production)

For production use, obtain a proper SSL certificate from:

1. **Let's Encrypt** (Free):
   - Use Certbot: https://certbot.eff.org/
   - Automatically renews certificates

2. **Commercial SSL Providers**:
   - DigiCert
   - GlobalSign
   - GoDaddy SSL

3. **Cloud Provider SSL**:
   - AWS Certificate Manager
   - Azure App Service Certificates
   - Google Cloud SSL

### Using Let's Encrypt (Example)

```bash
# Install Certbot
sudo apt-get install certbot

# Generate certificate for your domain
sudo certbot certonly --standalone -d yourdomain.com

# Certificates will be in:
# /etc/letsencrypt/live/yourdomain.com/privkey.pem
# /etc/letsencrypt/live/yourdomain.com/fullchain.pem

# Update .env:
USE_HTTPS=true
SSL_KEY_PATH=/etc/letsencrypt/live/yourdomain.com/privkey.pem
SSL_CERT_PATH=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
```

## Troubleshooting

### Certificate Not Found
- Ensure the `ssl/` directory exists in your project root
- Check that `key.pem` and `cert.pem` files are present
- Verify file permissions (should be readable by the Node.js process)

### Chrome Still Shows "Not Secure"
- Make sure you're accessing via `https://` not `http://`
- For self-signed certificates, you need to accept the warning
- Clear browser cache and cookies
- Try incognito/private browsing mode

### Port Issues
- HTTPS typically uses port 443 (default)
- If using a different port, specify it: `https://4.221.123.103:3000`
- Ensure firewall allows HTTPS traffic on your chosen port

## Security Notes

1. **Self-Signed Certificates:**
   - Only suitable for development/internal networks
   - Users will see security warnings
   - Not trusted by browsers by default

2. **Production Certificates:**
   - Always use proper SSL certificates in production
   - Keep certificates updated and renewed
   - Use strong encryption (RSA 2048+ or ECC)

3. **Best Practices:**
   - Never commit private keys to version control
   - Use environment variables for certificate paths
   - Implement certificate auto-renewal
   - Monitor certificate expiration dates
