# PontajSmart - Build and Dev Workflow
Write-Host "--- PontajSmart: Build & Dev ---" -ForegroundColor Cyan

Write-Host "Step 1: Lint & Type Check..." -ForegroundColor Yellow
npm run lint
if ($LASTEXITCODE -ne 0) { Write-Host "!!! TYPE CHECK FAILED !!!" -ForegroundColor Red; exit $LASTEXITCODE }

Write-Host "Step 2: Build productie..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "!!! BUILD FAILED !!!" -ForegroundColor Red; exit $LASTEXITCODE }

Write-Host "Step 3: Pornire backend (port 3005) intr-o fereastra separata..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run server" -WorkingDirectory (Get-Location)

Write-Host "Step 4: Pornire frontend Vite (http://localhost:3000/pontaj/)..." -ForegroundColor Yellow
npm run dev
