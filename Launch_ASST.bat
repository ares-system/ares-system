@echo off
setlocal enabledelayedexpansion

:: ================================================
:: ARES CLI Launcher (v2.0 - TUI Edition)
:: Automated Resilience Evaluation System
:: ================================================

set "ROOT=%~dp0"
set "CLI_DIR=%ROOT%apps\asst-cli"

:: Enable UTF-8 for box-drawing characters
chcp 65001 >nul 2>&1

:: Enable ANSI colors in CMD
reg add HKCU\Console /v VirtualTerminalLevel /t REG_DWORD /d 1 /f >nul 2>&1

:: Pass the project root to the CLI (stripping the trailing backslash to prevent \" escaping issues)
set "ARES_REPO_ROOT=%ROOT:~0,-1%"

cd /d "%CLI_DIR%"

:: Default to 'chat' if no arguments provided
if "%~1"=="" (
    cmd /k "node dist/asst.js chat --repo "%ARES_REPO_ROOT%""
) else (
    cmd /k "node dist/asst.js %*"
)
