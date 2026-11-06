@echo off
setlocal enabledelayedexpansion
title Ahh Silance Launcher

echo ========================================================
echo        Ahh Silance!!! - Automated JEE Evaluation
echo ========================================================
echo.

:: Detect root directory dynamically from script location
set "ROOT_DIR=%~dp0"
if "%ROOT_DIR:~-1%"=="\" set "ROOT_DIR=%ROOT_DIR:~0,-1%"
if not exist "%ROOT_DIR%\backend" set "ROOT_DIR=f:\neira"

echo Root Directory: %ROOT_DIR%
echo.

:: 1. Detect or Create Python Virtual Environment
set "PY_EXE="
if exist "%ROOT_DIR%\backend\env\Scripts\python.exe" (
    set "PY_EXE=%ROOT_DIR%\backend\env\Scripts\python.exe"
) else if exist "%ROOT_DIR%\venv\Scripts\python.exe" (
    set "PY_EXE=%ROOT_DIR%\venv\Scripts\python.exe"
) else (
    echo [Setup] No existing virtual environment found.
    where python >nul 2>nul
    if %errorlevel% neq 0 (
        echo [ERROR] Python was not found on your system PATH!
        echo Please install Python 3.10+ from https://www.python.org/ and re-run.
        pause
        exit /b 1
    )
    echo [Setup] Creating virtual environment at "%ROOT_DIR%\venv" ...
    python -m venv "%ROOT_DIR%\venv"
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to create virtual environment!
        pause
        exit /b 1
    )
    set "PY_EXE=%ROOT_DIR%\venv\Scripts\python.exe"
    echo [Setup] Installing Python dependencies from requirements.txt ...
    "%PY_EXE%" -m pip install --upgrade pip
    "%PY_EXE%" -m pip install -r "%ROOT_DIR%\requirements.txt"
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install Python requirements!
        pause
        exit /b 1
    )
    echo [Setup] Python environment ready!
    echo.
)

:: 2. Check and Install Frontend Node Modules if Missing
if not exist "%ROOT_DIR%\frontend\node_modules" (
    echo [Setup] frontend\node_modules missing.
    where npm >nul 2>nul
    if %errorlevel% neq 0 (
        echo [ERROR] Node.js / npm was not found on your system PATH!
        echo Please install Node.js 18+ from https://nodejs.org/ and re-run.
        pause
        exit /b 1
    )
    echo [Setup] Installing frontend dependencies via npm install ...
    pushd "%ROOT_DIR%\frontend"
    call npm install
    popd
    echo [Setup] Frontend packages installed!
    echo.
)

:: 3. Launch Backend API Server
echo [1/2] Starting Backend API Server on http://localhost:8000 ...
start "Ahh-Silance Backend (FastAPI)" /d "%ROOT_DIR%" cmd /k ""!PY_EXE!" -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000"

:: 4. Launch Frontend Vite Dev Server
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
pause
