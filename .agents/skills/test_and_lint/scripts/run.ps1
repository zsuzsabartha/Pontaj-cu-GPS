# PontajSmart - Test and Lint Workflow
# Runs type-checking, authorization policy tests, the production build and (optionally) the end-to-end test.
param([switch]$E2E)

Write-Host "--- Inceperea procesului de Testare si Lint PontajSmart ---" -ForegroundColor Cyan

function Invoke-Step($title, $command, $failMessage) {
    Write-Host $title -ForegroundColor Yellow
    Invoke-Expression $command
    if ($LASTEXITCODE -ne 0) {
        Write-Host "!!! $failMessage !!!" -ForegroundColor Red
        exit $LASTEXITCODE
    }
}

Invoke-Step "Step 1: Lint & Type Check..." "npm run lint" "TYPE CHECK FAILED: exista erori TypeScript care trebuie rezolvate."
Invoke-Step "Step 2: Teste politica de acces (bridge/auth)..." "npm run test:auth" "POLICY TESTS FAILED: regulile de acces nu mai respecta matricea asteptata."
Invoke-Step "Step 3: Build productie..." "npm run build" "BUILD FAILED: aplicatia nu se compileaza."

if ($E2E) {
    Invoke-Step "Step 4: Test end-to-end (SQL dev, AUTH_MODE=enforce)..." "npm run test:e2e" "E2E FAILED: vezi liniile FAIL de mai sus."
}

Write-Host "--- Teste si Lint Finalizate cu Succes! ---" -ForegroundColor Green
exit 0
