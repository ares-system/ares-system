# ================================================
# ASST CLI Agent Launcher (v2.0 - TUI Edition)
# PowerShell version — best TUI experience
# ================================================

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$CliDir = Join-Path $Root "apps\asst-cli"

# Ensure UTF-8 output for box-drawing characters
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# Change to CLI directory
Set-Location $CliDir

# Pass any arguments through (e.g., .\Launch_ASST.ps1 scan)
if ($args.Count -gt 0) {
    node dist/asst.js @args
} else {
    # Default: show banner + command menu
    node dist/asst.js
}
