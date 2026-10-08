<#
.SYNOPSIS
Deploys the Pontaj Smart application to the production server.

.DESCRIPTION
This script builds the Vite React application and then uses SCP to transfer the bundled
files to the remote Nginx production server. You must have SSH access configured.

.EXAMPLE
.\deploy.ps1
#>

# ==============================================================================
# CONFIGURATION - Update these variables with your actual server details
# ==============================================================================
$SERVER_USER="root"
$SERVER_IP="your_server_ip_or_domain"
$REMOTE_PATH="/var/www/pontaj-smart"
$SSH_KEY_PATH="~/.ssh/id_rsa" # Optional: Path to your SSH key if not using default agent
# ==============================================================================

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "🚀 Starting Deployment for Pontaj Smart..." -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan

# 1. Build the project
Write-Host "`n[1/3] Building the production assets..." -ForegroundColor Yellow
try {
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "npm build failed" }
} catch {
    Write-Host "❌ Error during build process. Deployment aborted." -ForegroundColor Red
    exit 1
}

# 2. Check if dist folder exists
if (-Not (Test-Path -Path ".\dist")) {
    Write-Host "❌ Error: 'dist' folder not found. Build may have failed." -ForegroundColor Red
    exit 1
}

# 3. Transfer files via SCP
Write-Host "`n[2/3] Transferring files to $SERVER_IP..." -ForegroundColor Yellow
try {
    # If using a specific SSH key, uncomment the line below and comment the standard scp line
    # scp -i $SSH_KEY_PATH -r .\dist\* "$($SERVER_USER)@$($SERVER_IP):$REMOTE_PATH"
    
    scp -r .\dist\* "$($SERVER_USER)@$($SERVER_IP):$REMOTE_PATH"
    
    if ($LASTEXITCODE -ne 0) { throw "scp transfer failed" }
} catch {
    Write-Host "❌ Error during file transfer. Check your SSH connection and permissions." -ForegroundColor Red
    exit 1
}

Write-Host "`n[3/3] Deployment Successful! 🎉" -ForegroundColor Green
Write-Host "The latest version of Pontaj Smart is now live." -ForegroundColor Green
