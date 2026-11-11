@echo off
setlocal
title Niera Launcher

echo ========================================================
echo      Niera - Academic Evaluation and Grading Platform
echo ========================================================
echo.

:: Detect root directory dynamically from script location
set "ROOT_DIR=%~dp0"
if "%ROOT_DIR:~-1%"=="\" set "ROOT_DIR=%ROOT_DIR:~0,-1%"
if not exist "%ROOT_DIR%\backend" (
    echo [ERROR] Could not locate the backend directory inside "%ROOT_DIR%".
    echo Please run this script from the repository root directory.
    pause
    exit /b 1
)

echo Root Directory: %ROOT_DIR%
echo.

:: Locate Python requirements manifest
set "REQ_FILE=%ROOT_DIR%\requirements.txt"
if not exist "%REQ_FILE%" set "REQ_FILE=%ROOT_DIR%\backend\requirements.txt"

:: 1. Detect or Create Python Virtual Environment
set "VENV_DIR="
set "PY_EXE="
if exist "%ROOT_DIR%\backend\env\Scripts\python.exe" (
    set "VENV_DIR=%ROOT_DIR%\backend\env"
    set "PY_EXE=%ROOT_DIR%\backend\env\Scripts\python.exe"
) else if exist "%ROOT_DIR%\venv\Scripts\python.exe" (
    set "VENV_DIR=%ROOT_DIR%\venv"
    set "PY_EXE=%ROOT_DIR%\venv\Scripts\python.exe"
) else if exist "%ROOT_DIR%\.venv\Scripts\python.exe" (
    set "VENV_DIR=%ROOT_DIR%\.venv"
    set "PY_EXE=%ROOT_DIR%\.venv\Scripts\python.exe"
)

if defined PY_EXE goto :check_python_deps

echo [Setup] No existing virtual environment found.
set "SYS_PY="
where python >nul 2>nul
if errorlevel 1 goto :try_py_launcher
python -c "import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)" >nul 2>nul
if errorlevel 1 goto :try_py_launcher
set "SYS_PY=python"
goto :create_venv

:try_py_launcher
where py >nul 2>nul
if errorlevel 1 goto :missing_python
py -3 -c "import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)" >nul 2>nul
if errorlevel 1 goto :missing_python
set "SYS_PY=py -3"
goto :create_venv

:missing_python
echo [ERROR] Python 3.10+ was not found on your system PATH!
echo Please install Python 3.10+ from https://www.python.org/ and re-run.
pause
exit /b 1

:create_venv
echo [Setup] Creating virtual environment at "%ROOT_DIR%\venv" ...
%SYS_PY% -m venv "%ROOT_DIR%\venv"
if errorlevel 1 (
    echo [ERROR] Failed to create Python virtual environment!
    pause
    exit /b 1
)
set "VENV_DIR=%ROOT_DIR%\venv"
set "PY_EXE=%ROOT_DIR%\venv\Scripts\python.exe"
echo [Setup] Virtual environment created.
echo.

:check_python_deps
:: 2. Verify and Download Missing or Updated Python Dependencies
if not exist "%REQ_FILE%" goto :check_node
echo [Check] Verifying Python dependencies...
"%PY_EXE%" -c "import hashlib, importlib.metadata, pathlib, re, sys; req=pathlib.Path(sys.argv[1]); stamp=pathlib.Path(sys.argv[2]); h=hashlib.sha256(req.read_bytes()).hexdigest(); pkgs=[re.split(r'[\[<>=~!;\s]', l.strip(), 1)[0] for l in req.read_text(encoding='utf-8').splitlines() if l.strip() and not l.strip().startswith('#')]; [importlib.metadata.distribution(p) for p in pkgs if p]; sys.exit(0 if stamp.exists() and stamp.read_text(encoding='utf-8').strip()==h else 1)" "%REQ_FILE%" "%VENV_DIR%\.requirements.sha256" >nul 2>nul
if not errorlevel 1 (
    echo [Check] Python dependencies verified.
    goto :check_node
)

echo [Setup] Downloading and installing Python dependencies from requirements.txt ...
"%PY_EXE%" -m pip install --upgrade pip
if errorlevel 1 echo [Warning] Could not upgrade pip; continuing with dependency installation...
"%PY_EXE%" -m pip install -r "%REQ_FILE%"
if errorlevel 1 (
    echo [ERROR] Failed to install Python dependencies!
    pause
    exit /b 1
)
"%PY_EXE%" -c "import hashlib, pathlib, sys; pathlib.Path(sys.argv[2]).write_text(hashlib.sha256(pathlib.Path(sys.argv[1]).read_bytes()).hexdigest(), encoding='utf-8')" "%REQ_FILE%" "%VENV_DIR%\.requirements.sha256"
echo [Setup] Python environment ready!
echo.

:check_node
:: 3. Verify Node.js and Download Missing Frontend Dependencies
where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js was not found on your system PATH!
    echo Please install Node.js 18+ from https://nodejs.org/ and re-run.
    pause
    exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (
    echo [ERROR] npm was not found on your system PATH!
    echo Please install Node.js 18+ from https://nodejs.org/ and re-run.
    pause
    exit /b 1
)

echo [Check] Verifying frontend Node.js dependencies...
set "NEED_NPM_INSTALL=0"
if not exist "%ROOT_DIR%\frontend\node_modules" (
    set "NEED_NPM_INSTALL=1"
    goto :install_npm_if_needed
)

pushd "%ROOT_DIR%\frontend"
node -e "const fs=require('fs'),crypto=require('crypto'),path=require('path');const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));const lock=fs.existsSync('package-lock.json')?fs.readFileSync('package-lock.json'):'';const h=crypto.createHash('sha256').update(JSON.stringify(pkg)).update(lock).digest('hex');const sp=path.join('node_modules','.deps.sha256');const deps=[...Object.keys(pkg.dependencies||{}),...Object.keys(pkg.devDependencies||{})];const ok=deps.every(d=>fs.existsSync(path.join('node_modules',...d.split('/'),'package.json')));const st=fs.existsSync(sp)&&fs.readFileSync(sp,'utf8').trim()===h;process.exit(ok&&st?0:1);" >nul 2>nul
if errorlevel 1 set "NEED_NPM_INSTALL=1"
popd

:install_npm_if_needed
if "%NEED_NPM_INSTALL%"=="0" (
    echo [Check] Frontend dependencies verified.
    goto :check_setup_mode
)

echo [Setup] Downloading and installing frontend dependencies via npm install ...
pushd "%ROOT_DIR%\frontend"
call npm install
if errorlevel 1 (
    popd
    echo [ERROR] Failed to install frontend dependencies!
    pause
    exit /b 1
)
node -e "const fs=require('fs'),crypto=require('crypto'),path=require('path');const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));const lock=fs.existsSync('package-lock.json')?fs.readFileSync('package-lock.json'):'';const h=crypto.createHash('sha256').update(JSON.stringify(pkg)).update(lock).digest('hex');fs.writeFileSync(path.join('node_modules','.deps.sha256'),h);"
popd
echo [Setup] Frontend packages installed!
echo.

:check_setup_mode
if /i "%~1"=="--setup-only" (
    echo.
    echo [Done] All dependencies are verified and ready.
    exit /b 0
)

if not exist "%ROOT_DIR%\.env" (
    echo [Notice] No .env file found in "%ROOT_DIR%".
    echo          Copy .env.example to .env and add GEMINI_API_KEY to enable Gemini API scanning.
    echo.
)

:: 4. Launch Backend API Server
echo [1/2] Starting Backend API Server on http://localhost:8000 ...
start "Niera Backend (FastAPI)" /d "%ROOT_DIR%" cmd /k ""%PY_EXE%" -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000"

:: 5. Launch Frontend Vite Dev Server
echo [2/2] Starting Frontend Vite App on http://localhost:5173 ...
start "Niera Frontend (React TSX)" /d "%ROOT_DIR%\frontend" cmd /k "npm run dev -- --open"

echo.
echo ========================================================
echo   Services are running!
echo   * Web Frontend: http://localhost:5173
echo   * Backend Docs: http://localhost:8000/docs
echo ========================================================
echo.
pause
