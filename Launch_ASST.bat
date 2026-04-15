@echo off
setlocal enabledelayedexpansion

:: ==========================================
:: ASST CLI Agent Launcher (V3)
:: ==========================================

:: Define paths
set "PROJECT_ROOT=C:\Users\FTHMo\OneDrive\Documents\ASST\apps\asst-cli"
set "ROOT_ENV=C:\Users\FTHMo\OneDrive\Documents\ASST\.env"
set "CLI_ENV=%PROJECT_ROOT%\.env"

echo [ASST] -----------------------------------------
echo [ASST] Validating environment...

:: 1. Check PROJECT_ROOT
if not exist "%PROJECT_ROOT%" (
    echo [ERROR] Project root not found at: %PROJECT_ROOT%
    pause
    exit /b 1
)

:: 2. Check for .env
if not exist "%CLI_ENV%" (
    if exist "%ROOT_ENV%" (
        echo [INFO] Copying .env from root to CLI folder...
        copy "%ROOT_ENV%" "%CLI_ENV%"
    ) else (
        echo [WARNING] No .env file found! Agent will likely fail.
        echo Please ensure OPENROUTER_API_KEY is set.
    )
)

:: 3. Navigate
echo [ASST] Navigating to %PROJECT_ROOT%
cd /d "%PROJECT_ROOT%"

:: 4. Verify src/asst.ts
if not exist "src\asst.ts" (
    echo [ERROR] Found directory but src\asst.ts is missing!
    dir /b
    pause
    exit /b 1
)

:: 5. Run using npx tsx directly
echo [ASST] Launching ASST Chat...
echo [ASST] Executing: npx tsx src/asst.ts chat
echo.

npx tsx src/asst.ts chat

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] ASST crashed with Exit Code %ERRORLEVEL%
)

echo.
echo [ASST] Session ended.
pause
