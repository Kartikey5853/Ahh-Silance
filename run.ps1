# Niera Launcher Script for PowerShell
param(
    [switch]$SetupOnly
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $Root -or -not (Test-Path "$Root\backend")) {
    Write-Host "[ERROR] Could not locate backend folder inside $Root" -ForegroundColor Red
    Exit 1
}

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "     Niera - Academic Evaluation and Grading Platform" -ForegroundColor White
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Root Directory: $Root" -ForegroundColor DarkGray
Write-Host ""

$ReqFile = if (Test-Path "$Root\requirements.txt") { "$Root\requirements.txt" } else { "$Root\backend\requirements.txt" }

# 1. Detect or Create Python Environment
$VenvDir = $null
$PyExe = $null
if (Test-Path "$Root\backend\env\Scripts\python.exe") {
    $VenvDir = "$Root\backend\env"
    $PyExe = "$VenvDir\Scripts\python.exe"
} elseif (Test-Path "$Root\venv\Scripts\python.exe") {
    $VenvDir = "$Root\venv"
    $PyExe = "$VenvDir\Scripts\python.exe"
} elseif (Test-Path "$Root\.venv\Scripts\python.exe") {
    $VenvDir = "$Root\.venv"
    $PyExe = "$VenvDir\Scripts\python.exe"
} else {
    Write-Host "[Setup] No virtual environment found. Checking system python..." -ForegroundColor Yellow
    $sysPy = $null
    $prevPref = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    if (Get-Command python -ErrorAction SilentlyContinue) {
        & python -c "import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)" 2>$null
        if ($LASTEXITCODE -eq 0) { $sysPy = @("python") }
    }
    if (-not $sysPy -and (Get-Command py -ErrorAction SilentlyContinue)) {
        & py -3 -c "import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)" 2>$null
        if ($LASTEXITCODE -eq 0) { $sysPy = @("py", "-3") }
    }
    $ErrorActionPreference = $prevPref

    if (-not $sysPy) {
        Write-Host "[ERROR] Python 3.10+ was not found on your system PATH! Please install Python from https://www.python.org/" -ForegroundColor Red
        Exit 1
    }
    Write-Host "[Setup] Creating virtual environment at $Root\venv ..." -ForegroundColor Cyan
    if ($sysPy.Count -gt 1) {
        & $sysPy[0] $sysPy[1] -m venv "$Root\venv"
    } else {
        & $sysPy[0] -m venv "$Root\venv"
    }
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Failed to create Python virtual environment!" -ForegroundColor Red
        Exit 1
    }
    $VenvDir = "$Root\venv"
    $PyExe = "$VenvDir\Scripts\python.exe"
}

# 2. Verify and Download Missing or Updated Python Dependencies
if (Test-Path $ReqFile) {
    Write-Host "[Check] Verifying Python dependencies..." -ForegroundColor Cyan
    $StampFile = "$VenvDir\.requirements.sha256"
    $checkCode = "import hashlib, importlib.metadata, pathlib, re, sys; req=pathlib.Path(sys.argv[1]); stamp=pathlib.Path(sys.argv[2]); h=hashlib.sha256(req.read_bytes()).hexdigest(); pkgs=[re.split(r'[\[<>=~!;\s]', l.strip(), 1)[0] for l in req.read_text(encoding='utf-8').splitlines() if l.strip() and not l.strip().startswith('#')]; [importlib.metadata.distribution(p) for p in pkgs if p]; sys.exit(0 if stamp.exists() and stamp.read_text(encoding='utf-8').strip()==h else 1)"

    $prevPref = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    & "$PyExe" -c $checkCode "$ReqFile" "$StampFile" 2>$null
    $pyCheckExit = $LASTEXITCODE
    $ErrorActionPreference = $prevPref

    if ($pyCheckExit -ne 0) {
        Write-Host "[Setup] Downloading and installing Python requirements..." -ForegroundColor Cyan
        & "$PyExe" -m pip install --upgrade pip
        & "$PyExe" -m pip install -r "$ReqFile"
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[ERROR] Failed to install Python requirements!" -ForegroundColor Red
            Exit 1
        }
        & "$PyExe" -c "import hashlib, pathlib, sys; pathlib.Path(sys.argv[2]).write_text(hashlib.sha256(pathlib.Path(sys.argv[1]).read_bytes()).hexdigest(), encoding='utf-8')" "$ReqFile" "$StampFile"
        Write-Host "[Setup] Python environment ready!" -ForegroundColor Green
        Write-Host ""
    } else {
        Write-Host "[Check] Python dependencies verified." -ForegroundColor Green
    }
}

# 3. Verify Node.js and Install Missing Frontend Node Modules
if (-not (Get-Command node -ErrorAction SilentlyContinue) -or -not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js / npm was not found on your system PATH! Please install Node.js 18+ from https://nodejs.org/" -ForegroundColor Red
    Exit 1
}

Write-Host "[Check] Verifying frontend dependencies..." -ForegroundColor Cyan
$needNpmInstall = $false
Push-Location "$Root\frontend"
if (-not (Test-Path "node_modules")) {
    $needNpmInstall = $true
} else {
    $nodeCheck = "const fs=require('fs'),crypto=require('crypto'),path=require('path');const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));const lock=fs.existsSync('package-lock.json')?fs.readFileSync('package-lock.json'):'';const h=crypto.createHash('sha256').update(JSON.stringify(pkg)).update(lock).digest('hex');const sp=path.join('node_modules','.deps.sha256');const deps=[...Object.keys(pkg.dependencies||{}),...Object.keys(pkg.devDependencies||{})];const ok=deps.every(d=>fs.existsSync(path.join('node_modules',...d.split('/'),'package.json')));const st=fs.existsSync(sp)&&fs.readFileSync(sp,'utf8').trim()===h;process.exit(ok&&st?0:1);"
    $prevPref = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    & node -e $nodeCheck 2>$null
    $nodeCheckExit = $LASTEXITCODE
    $ErrorActionPreference = $prevPref
    if ($nodeCheckExit -ne 0) { $needNpmInstall = $true }
}

if ($needNpmInstall) {
    Write-Host "[Setup] Downloading and installing frontend dependencies via npm install ..." -ForegroundColor Cyan
    npm install
    if ($LASTEXITCODE -ne 0) {
        Pop-Location
        Write-Host "[ERROR] Failed to install frontend dependencies!" -ForegroundColor Red
        Exit 1
    }
    $nodeStamp = "const fs=require('fs'),crypto=require('crypto'),path=require('path');const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));const lock=fs.existsSync('package-lock.json')?fs.readFileSync('package-lock.json'):'';const h=crypto.createHash('sha256').update(JSON.stringify(pkg)).update(lock).digest('hex');fs.writeFileSync(path.join('node_modules','.deps.sha256'),h);"
    & node -e $nodeStamp
    Write-Host "[Setup] Frontend dependencies installed!" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "[Check] Frontend dependencies verified." -ForegroundColor Green
}
Pop-Location

if ($SetupOnly) {
    Write-Host "[Done] All dependencies are verified and ready." -ForegroundColor Green
    Exit 0
}

if (-not (Test-Path "$Root\.env")) {
    Write-Host "[Notice] No .env file found. Copy .env.example to .env and configure GEMINI_API_KEY." -ForegroundColor Yellow
    Write-Host ""
}

# 4. Launch Backend
Write-Host "[1/2] Starting Backend API Server on http://localhost:8000 ..." -ForegroundColor Green
Start-Process cmd.exe -ArgumentList "/k cd /d `"$Root`" && `"$PyExe`" -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000"

# 5. Launch Frontend
Write-Host "[2/2] Starting Frontend Vite App on http://localhost:5173 ..." -ForegroundColor Green
Start-Process cmd.exe -ArgumentList "/k cd /d `"$Root\frontend`" && npm run dev -- --open"

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Services are running!" -ForegroundColor White
Write-Host "  * Web Frontend: http://localhost:5173" -ForegroundColor Yellow
Write-Host "  * Backend Docs: http://localhost:8000/docs" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan
