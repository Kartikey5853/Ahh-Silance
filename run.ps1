# Ahh Silance Launcher Script for PowerShell
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $Root) { $Root = "f:\neira" }

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "       Ahh Silance!!! - Automated JEE Evaluation" -ForegroundColor White
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/2] Starting Backend API Server on http://localhost:8000 ..." -ForegroundColor Green
Start-Process cmd.exe -ArgumentList "/k cd /d `"$Root`" && `"$Root\backend\env\Scripts\python.exe`" -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000"

Write-Host "[2/2] Starting Frontend Vite App on http://localhost:5173 ..." -ForegroundColor Green
Start-Process cmd.exe -ArgumentList "/k cd /d `"$Root\frontend`" && npm run dev -- --open"

Write-Host ""
Write-Host "Services started! Frontend: http://localhost:5173" -ForegroundColor Yellow
Write-Host "Test user: 'test' / 'test123'" -ForegroundColor White
