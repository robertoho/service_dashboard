@echo off
setlocal

:: Services Dashboard Startup Script for Windows

:: Check if npm is installed
where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error: npm is not installed. Please install Node.js and npm first.
    pause
    exit /b 1
)

:: Variables
set SCRIPT_DIR=%~dp0
set FRONTEND_DIR=%SCRIPT_DIR%
set SERVER_DIR=%SCRIPT_DIR%server

:: Print header
echo ================================================================
echo              Services Dashboard Startup Script                  
echo ================================================================

:: Check if this is the first run by checking if node_modules exists
if not exist "%FRONTEND_DIR%node_modules\" (
    echo First run detected. Installing dependencies...
    
    :: Install frontend dependencies
    echo Installing frontend dependencies...
    cd /d "%FRONTEND_DIR%" && npm install
    
    if %ERRORLEVEL% NEQ 0 (
        echo Error installing frontend dependencies!
        pause
        exit /b 1
    )
)

if not exist "%SERVER_DIR%\node_modules\" (
    :: Install server dependencies
    echo Installing server dependencies...
    cd /d "%SERVER_DIR%" && npm install
    
    if %ERRORLEVEL% NEQ 0 (
        echo Error installing server dependencies!
        pause
        exit /b 1
    )
    
    echo Dependencies installed successfully!
)

:: Start the application
echo Starting the Services Dashboard...
cd /d "%FRONTEND_DIR%" && npm run dev:all

:: Exit message (this will only execute if npm run dev:all is terminated)
echo Services Dashboard has been stopped.
pause 