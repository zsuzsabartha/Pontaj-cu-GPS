@echo off
echo BIOEEL AI STARTUP (SAFE VERSION)
echo --------------------------------

:: 1. Force move to production folder
cd /d "C:\Apps\Campanii inteligente"

:: 2. Kill only the process on port 3002 (Safe for other Node apps!)
echo Killing any existing process on port 3002...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3002" ^| find "LISTENING"') do taskkill /f /pid %%a 2>nul

:: 3. Set environment
set NODE_ENV=production

:: 4. Try to start
echo Starting Node process...
node dist-server\server.cjs

:: 5. If it fails, WAIT so you can see why
echo.
echo Process finished.
pause
