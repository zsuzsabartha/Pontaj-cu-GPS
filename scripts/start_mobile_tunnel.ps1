# Porneste tunelul HTTPS Cloudflare pentru aplicatia mobila de pontaj (fara drepturi Entra Global Admin)
# si salveaza automat URL-ul generat in SQL Server (app_settings.mobileAppUrl) pentru Codul QR din aplicatie.

param(
    [string]$TargetUrl = "http://be-apl01:3005"
)

$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent $PSScriptRoot
$CloudflaredPath = Join-Path $RootDir "bridge\cloudflared.exe"
$LogFile = Join-Path $RootDir "bridge\tunnel.log"

if (-not (Test-Path $CloudflaredPath)) {
    Write-Host "[1/3] Se descarca conectorul oficial Cloudflare Tunnel (cloudflared.exe)..." -ForegroundColor Cyan
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" -OutFile $CloudflaredPath -UseBasicParsing
    Write-Host "   ✓ cloudflared.exe descarcat in bridge\cloudflared.exe" -ForegroundColor Green
}

# Verificam daca rulam chiar pe be-apl01 sau de pe o statie din retea
try {
    $pingLocal = Invoke-WebRequest -Uri "http://localhost:3005/api/v1/ping" -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
    if ($pingLocal.StatusCode -eq 200) {
        $TargetUrl = "http://localhost:3005"
    }
} catch {}

if (Test-Path $LogFile) { Remove-Item $LogFile -Force -ErrorAction SilentlyContinue }

Write-Host "[2/3] Se porneste tunelul HTTPS catre $TargetUrl ..." -ForegroundColor Cyan
$proc = Start-Process -FilePath $CloudflaredPath -ArgumentList @("tunnel", "--url", $TargetUrl, "--no-autoupdate", "--logfile", $LogFile) -PassThru -WindowStyle Hidden

$PublicUrl = $null
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 1
    if (Test-Path $LogFile) {
        $content = Get-Content $LogFile -Raw -ErrorAction SilentlyContinue
        if ($content -match "(https://[a-z0-9-]+\.trycloudflare\.com)") {
            $PublicUrl = $Matches[1]
            break
        }
    }
}

if (-not $PublicUrl) {
    Write-Host "Eroare: Nu s-a putut obtine URL-ul tunelului in 30 de secunde." -ForegroundColor Red
    exit 1
}

$MobileAppUrl = "$PublicUrl/pontaj/?mode=mobile"
Write-Host "[3/3] Tunel HTTPS activ! Se actualizeaza Codul QR in baza de date SQL (be-sql01)..." -ForegroundColor Cyan

try {
    $conn = New-Object System.Data.SqlClient.SqlConnection("Server=be-sql01;Database=PontajSmart;Integrated Security=True;TrustServerCertificate=True;")
    $conn.Open()
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = @"
IF EXISTS (SELECT 1 FROM app_settings WHERE setting_key = 'mobileAppUrl')
    UPDATE app_settings SET setting_value = @url, updated_at = SYSDATETIME() WHERE setting_key = 'mobileAppUrl';
ELSE
    INSERT INTO app_settings (setting_key, setting_value, updated_at) VALUES ('mobileAppUrl', @url, SYSDATETIME());
"@
    $null = $cmd.Parameters.AddWithValue("@url", $MobileAppUrl)
    $null = $cmd.ExecuteNonQuery()
    $conn.Close()
    Write-Host "   ✓ URL-ul mobil a fost salvat automat in SQL Server (app_settings.mobileAppUrl)." -ForegroundColor Green
} catch {
    Write-Host "   ! Atentie: Nu s-a putut actualiza automat SQL Server ($($_.Exception.Message)). Copiati URL-ul manual in fereastra Cod QR." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==================================================================" -ForegroundColor Green
Write-Host " 📱 APLICATIE MOBILA PONTAJ ACTIVA PE INTERNET (4G / 5G):" -ForegroundColor Green
Write-Host "    $MobileAppUrl" -ForegroundColor White
Write-Host "    PID Tunel: $($proc.Id)" -ForegroundColor Gray
Write-Host "==================================================================" -ForegroundColor Green
