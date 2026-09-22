@echo off
setlocal
:: --- SETEAZA CALEA CATRE SHARE-UL SERVERULUI AICI ---
set "SERVER_PATH=\\be-apl01\Apps\Pontaj smart"
:: ---------------------------------------------------

echo [1/3] Building the production assets locally...
call npm run build
if %errorlevel% neq 0 (
    echo [!] Eroare: Build-ul frontend-ului a eșuat.
    pause
    exit /b 1
)

echo.
echo [1.5/3] Rulare Smoke Test automat de Runtime & MIME...
call npm test
if %errorlevel% neq 0 (
    echo [!] EROARE CRITICĂ: Smoke test-ul de runtime a eșuat!
    echo Lansarea în producție a fost blocată pentru a preveni erorile în browser.
    pause
    exit /b 1
)

echo.
echo [TEST] Checking connection to server...
if not exist "%SERVER_PATH%" (
    echo [!] ERROR: Network path not found: %SERVER_PATH%
    echo Please verify:
    echo 1. The server 'be-apl01' is reachable ^(try: ping be-apl01^).
    echo 2. The share 'Apps' exists on that server.
    echo 3. You have the correct permissions.
    echo.
    echo TIP: Try using the IP address instead of 'be-apl01'.
    pause
    exit /b 1
)

echo [OK] Connection to server verified.
echo.

:: 1. Copiere Frontend (dist -> dist)
echo 🚚 Copiere Frontend (Spre folderul 'dist' al Nginx)...
robocopy "dist" "%SERVER_PATH%\dist" /E /R:5 /W:5 /TBD /NP /V /MT:16

:: 2. Copiere Backend (bridge -> bridge)
echo 🚚 Copiere Backend (Spre folderul aplicatiei Node)...
robocopy "bridge" "%SERVER_PATH%\bridge" /E /R:5 /W:5 /TBD /NP /V /MT:16

:: 3. Copiere fisiere baza
echo 🚚 Copiere package.json...
copy "package.json" "%SERVER_PATH%\package.json" /Y
if exist "package-lock.json" copy "package-lock.json" "%SERVER_PATH%\package-lock.json" /Y

echo 🚚 Copiere .env...
if exist "bridge\.env" copy "bridge\.env" "%SERVER_PATH%\.env" /Y

:: 4. Copiere Script de Pornire
echo 🚚 Copiere start_pontaj.bat...
copy "deployment\start_pontaj.bat" "%SERVER_PATH%\start_pontaj.bat" /Y

echo.
echo ✅ Copiere finalizata cu succes!
echo ⚠️  IMPORTANT: Dupa copiere, trebuie sa restartezi aplicatia pe server pentru backend-ul pontaj (ex: pm2 restart pontaj sau npm start in folderul bridge).
echo.
pause
