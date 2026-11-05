@echo off
setlocal
title Ahh Silance Launcher

echo ========================================================
echo        Ahh Silance!!! - Automated JEE Evaluation
echo ========================================================
echo.

:: Detect root directory or fallback to f:\neira
set "ROOT_DIR=f:\neira"
if exist "%~dp0backend" set "ROOT_DIR=%~dp0"
if "%ROOT_DIR:~-1%"=="\" set "ROOT_DIR=%ROOT_DIR:~0,-1%"

echo Root Directory: %ROOT_DIR%
echo.

echo [1/2] Starting Backend API Server on http://localhost:8000 ...
start "Ahh-Silance Backend (FastAPI)" /d "%ROOT_DIR%" cmd /k ""%ROOT_DIR%\backend\env\Scripts\python.exe" -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000"

echo [2/2] Starting Frontend Vite App on http://localhost:5173 ...
start "Ahh-Silance Frontend (React TSX)" /d "%ROOT_DIR%\frontend" cmd /k "npm run dev -- --open"

echo.
echo ========================================================
echo   Services are running!
echo   * Web Frontend: http://localhost:5173
echo   * Backend Docs: http://localhost:8000/docs
echo   * Test Login:   username "test"  /  password "test123"
echo ========================================================
echo.
