# Safe Deployment Script for IPMP (Windows PowerShell)
# This script safely updates the application while preserving database data

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  IPMP Safe Deployment Script" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Backup Database
Write-Host "Step 1: Creating database backup..." -ForegroundColor Yellow
$BACKUP_DIR = "backups"
if (-not (Test-Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR | Out-Null
}
if (Test-Path "ipmp.db") {
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $BACKUP_FILE = "$BACKUP_DIR\ipmp.db.$timestamp"
    Copy-Item "ipmp.db" $BACKUP_FILE
    Write-Host "✅ Backup created: $BACKUP_FILE" -ForegroundColor Green
} else {
    Write-Host "⚠️  Database file not found (first deployment?)" -ForegroundColor Yellow
}
Write-Host ""

# Step 2: Stop Application (if running)
Write-Host "Step 2: Checking for running processes..." -ForegroundColor Yellow
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "⚠️  Node.js processes detected. Please stop the application manually (Ctrl+C or close terminal)" -ForegroundColor Yellow
} else {
    Write-Host "ℹ️  No Node.js processes detected" -ForegroundColor Gray
}
Write-Host ""

# Step 3: Update Code (if using Git)
Write-Host "Step 3: Updating code..." -ForegroundColor Yellow
if (Test-Path ".git") {
    Write-Host "Pulling latest changes from Git..."
    try {
        git pull origin main
        Write-Host "✅ Code updated" -ForegroundColor Green
    } catch {
        try {
            git pull origin master
            Write-Host "✅ Code updated" -ForegroundColor Green
        } catch {
            Write-Host "⚠️  Git pull failed or no remote configured" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "ℹ️  Not a Git repository, skipping pull" -ForegroundColor Gray
    Write-Host "⚠️  Make sure you've updated the files manually" -ForegroundColor Yellow
}
Write-Host ""

# Step 4: Install Dependencies
Write-Host "Step 4: Installing dependencies..." -ForegroundColor Yellow
npm install
Write-Host "✅ Dependencies installed" -ForegroundColor Green
Write-Host ""

# Step 5: Rebuild Native Modules
Write-Host "Step 5: Rebuilding native modules..." -ForegroundColor Yellow
npm rebuild better-sqlite3
Write-Host "✅ Native modules rebuilt" -ForegroundColor Green
Write-Host ""

# Step 6: Build Application
Write-Host "Step 6: Building application..." -ForegroundColor Yellow
npm run build
Write-Host "✅ Application built successfully" -ForegroundColor Green
Write-Host ""

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Deployment Complete!" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Start the application: npm start" -ForegroundColor White
Write-Host "2. Check console output for migration messages" -ForegroundColor White
Write-Host "3. Test the application to ensure everything works" -ForegroundColor White
Write-Host "4. If issues occur, restore backup from: $BACKUP_DIR" -ForegroundColor White
Write-Host ""
