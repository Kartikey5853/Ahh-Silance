# Ahh Silance Launcher Script for PowerShell
$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $Root -or -not (Test-Path "$Root\backend")) { $Root = "f:\neira" }

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "       Ahh Silance!!! - Automated JEE Evaluation" -ForegroundColor White
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Root Directory: $Root" -ForegroundColor DarkGray
Write-Host ""

# 1. Detect or Create Python Environment
$PyExe = $null
if (Test-Path "$Root\backend\env\Scripts\python.exe") {
    $PyExe = "$Root\backend\env\Scripts\python.exe"
} elseif (Test-Path "$Root\venv\Scripts\python.exe") {
    $PyExe = "$Root\venv\Scripts\python.exe"
} else {
    Write-Host "[Setup] No virtual environment found. Checking system python..." -ForegroundColor Yellow
    $sysPython = Get-Command python -ErrorAction SilentlyContinue
    if (-not $sysPython) {
        Write-Host "[ERROR] Python was not found on your system PATH! Please install Python 3.10+ from https://www.python.org/" -ForegroundColor Red
        Exit 1
    }
    Write-Host "[Setup] Creating virtual environment at $Root\venv ..." -ForegroundColor Cyan
    & python -m venv "$Root\venv"
    $PyExe = "$Root\venv\Scripts\python.exe"
    Write-Host "[Setup] Installing requirements from requirements.txt ..." -ForegroundColor Cyan
    & "$PyExe" -m pip install --upgrade pip
    & "$PyExe" -m pip install -r "$Root\requirements.txt"
    Write-Host "[Setup] Python environment ready!" -ForegroundColor Green
    Write-Host ""
}

# 2. Check and Install Frontend Node Modules if Missing
if (-not (Test-Path "$Root\frontend\node_modules")) {
    Write-Host "[Setup] frontend\node_modules missing. Checking npm..." -ForegroundColor Yellow
    $sysNpm = Get-Command npm -ErrorAction SilentlyContinue
    if (-not $sysNpm) {
        Write-Host "[ERROR] npm was not found on your system PATH! Please install Node.js 18+ from https://nodejs.org/" -ForegroundColor Red
        Exit 1
    }
    Write-Host "[Setup] Installing frontend dependencies via npm install ..." -ForegroundColor Cyan
    Push-Location "$Root\frontend"
    npm install
    Pop-Location
    Write-Host "[Setup] Frontend dependencies installed!" -ForegroundColor Green
    Write-Host ""
}

# 3. Launch Backend
Write-Host "[1/2] Starting Backend API Server on http://localhost:8000 ..." -ForegroundColor Green
Start-Process cmd.exe -ArgumentList "/k cd /d `"$Root`" && `"$PyExe`" -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000"

# 4. Launch Frontend
Write-Host "[2/2] Starting Frontend Vite App on http://localhost:5173 ..." -ForegroundColor Green
Start-Process cmd.exe -ArgumentList "/k cd /d `"$Root\frontend`" && npm run dev -- --open"

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Services are running!" -ForegroundColor White
Write-Host "  * Web Frontend: http://localhost:5173" -ForegroundColor Yellow
Write-Host "  * Backend Docs: http://localhost:8000/docs" -ForegroundColor Yellow
Write-Host "  * Test Login:   username `"test`"  /  password `"test123`"" -ForegroundColor White
Write-Host "========================================================" -ForegroundColor Cyan
