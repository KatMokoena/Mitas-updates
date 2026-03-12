# PowerShell script to generate self-signed SSL certificate for MITAS IPMP
# This will resolve the Chrome "Not secure" warning

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SSL Certificate Generator for MITAS IPMP" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if OpenSSL is available
$opensslPath = $null
$possiblePaths = @(
    "openssl",
    "C:\Program Files\Git\usr\bin\openssl.exe",
    "C:\Program Files\OpenSSL-Win64\bin\openssl.exe",
    "C:\OpenSSL-Win64\bin\openssl.exe"
)

foreach ($path in $possiblePaths) {
    try {
        $result = & $path version 2>&1
        if ($LASTEXITCODE -eq 0) {
            $opensslPath = $path
            break
        }
    } catch {
        continue
    }
}

if (-not $opensslPath) {
    Write-Host "❌ OpenSSL not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install OpenSSL:" -ForegroundColor Yellow
    Write-Host "1. Download from: https://slproweb.com/products/Win32OpenSSL.html" -ForegroundColor Yellow
    Write-Host "2. Or use Git Bash (if Git is installed)" -ForegroundColor Yellow
    Write-Host "3. Or install via Chocolatey: choco install openssl" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host "✅ OpenSSL found: $opensslPath" -ForegroundColor Green
Write-Host ""

# Create ssl directory
$sslDir = Join-Path $PSScriptRoot "ssl"
if (-not (Test-Path $sslDir)) {
    New-Item -ItemType Directory -Path $sslDir | Out-Null
    Write-Host "✅ Created ssl directory" -ForegroundColor Green
} else {
    Write-Host "✅ ssl directory exists" -ForegroundColor Green
}

Write-Host ""
Write-Host "Generating self-signed certificate..." -ForegroundColor Yellow
Write-Host "This will create:" -ForegroundColor Yellow
Write-Host "  - ssl/key.pem (private key)" -ForegroundColor Yellow
Write-Host "  - ssl/cert.pem (certificate)" -ForegroundColor Yellow
Write-Host ""

# Get IP address or domain
$ipOrDomain = Read-Host "Enter your server IP or domain (e.g., 4.221.123.103) [default: 4.221.123.103]"
if ([string]::IsNullOrWhiteSpace($ipOrDomain)) {
    $ipOrDomain = "4.221.123.103"
}

# Generate certificate
$keyPath = Join-Path $sslDir "key.pem"
$certPath = Join-Path $sslDir "cert.pem"

$subject = "/CN=$ipOrDomain"

try {
    & $opensslPath req -x509 -newkey rsa:4096 -keyout $keyPath -out $certPath -days 365 -nodes -subj $subject 2>&1 | Out-Null
    
    if (Test-Path $keyPath -and Test-Path $certPath) {
        Write-Host ""
        Write-Host "✅ SSL certificate generated successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Certificate details:" -ForegroundColor Cyan
        Write-Host "  Subject: CN=$ipOrDomain" -ForegroundColor White
        Write-Host "  Valid for: 365 days" -ForegroundColor White
        Write-Host "  Key size: 4096 bits" -ForegroundColor White
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Yellow
        Write-Host "1. Add to your .env file: USE_HTTPS=true" -ForegroundColor White
        Write-Host "2. Restart your server" -ForegroundColor White
        Write-Host "3. Access via: https://$ipOrDomain`:3000" -ForegroundColor White
        Write-Host ""
        Write-Host "Note: Chrome will show a warning for self-signed certificates." -ForegroundColor Yellow
        Write-Host "Click 'Advanced' → 'Proceed to $ipOrDomain (unsafe)' to continue." -ForegroundColor Yellow
        Write-Host ""
    } else {
        Write-Host "❌ Failed to generate certificate files" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error generating certificate: $_" -ForegroundColor Red
    exit 1
}
