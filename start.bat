@echo off
title Nexoryn Certificate System - Boot Sequence
color 0B

echo ===================================================
echo    NEXORYN ENTERPRISE CERTIFICATE SYSTEM
echo    Initializing Secure Environment...
echo ===================================================
echo.

node -v >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js Engine is not detected on this system!
    echo Please install Node.js (LTS version) to proceed.
    pause
    exit
)

echo [INFO] Node.js Engine Detected.
echo [INFO] Verifying System Dependencies (This may take a moment on first run)...
call npm install --silent

IF NOT EXIST "database" mkdir database
IF NOT EXIST "keys" mkdir keys
IF NOT EXIST "public\assets\certificates" mkdir "public\assets\certificates"

echo [INFO] Environment successfully configured.
echo [INFO] Launching Nexoryn Core Server...
echo.
echo ===================================================
echo   System is LIVE. Open your browser and navigate to:
echo   http://localhost:3000
echo ===================================================
echo.

node server.js
pause