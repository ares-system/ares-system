@echo off
title ASST CLI Agent
cd /d "%~dp0\apps\asst-cli"
echo Starting ASST CLI Agent...
npx tsx src/asst.ts chat
pause
