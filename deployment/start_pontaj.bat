@echo off
echo PONTAJ SMART STARTUP
echo --------------------

:: 1. Force move to production folder
cd /d "C:\Apps\Pontaj smart"

:: 2. Set environment
set NODE_ENV=production
set PORT=3005

:: 3. Kill only the process running on port 3005 (Safe for other Node apps!)
echo Killing any existing process on port 3005...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3005" ^| find "LISTENING"') do taskkill /f /pid %%a 2>nul

:: 4. Try to start
echo Starting Node process...
node bridge\server.js

:: 5. If it fails, WAIT so you can see why
echo.
echo Process finished.
pause
