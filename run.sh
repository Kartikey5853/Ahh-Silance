#!/usr/bin/env bash
set -e

echo "========================================================"
echo "     Niera - Academic Evaluation and Grading Platform"
echo "========================================================"
echo ""

# Resolve directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$SCRIPT_DIR"

if [ ! -d "$ROOT_DIR/backend" ]; then
    echo "[ERROR] Could not locate the backend directory inside \"$ROOT_DIR\"."
    echo "Please run this script from the repository root directory."
    exit 1
fi

echo "Root Directory: $ROOT_DIR"
echo ""

# Python requirements manifest
REQ_FILE="$ROOT_DIR/requirements.txt"
if [ ! -f "$REQ_FILE" ]; then
    REQ_FILE="$ROOT_DIR/backend/requirements.txt"
fi

# 1. Detect or Create Python Virtual Environment
VENV_DIR=""
PY_EXE=""

if [ -x "$ROOT_DIR/backend/env/bin/python" ]; then
    VENV_DIR="$ROOT_DIR/backend/env"
    PY_EXE="$ROOT_DIR/backend/env/bin/python"
elif [ -x "$ROOT_DIR/venv/bin/python" ]; then
    VENV_DIR="$ROOT_DIR/venv"
    PY_EXE="$ROOT_DIR/venv/bin/python"
elif [ -x "$ROOT_DIR/.venv/bin/python" ]; then
    VENV_DIR="$ROOT_DIR/.venv"
    PY_EXE="$ROOT_DIR/.venv/bin/python"
fi

if [ -z "$PY_EXE" ]; then
    echo "[Setup] No existing virtual environment found."
    SYS_PY=""
    if command -v python3 >/dev/null 2>&1; then
        if python3 -c "import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)" 2>/dev/null; then
            SYS_PY="python3"
        fi
    fi

    if [ -z "$SYS_PY" ] && command -v python >/dev/null 2>&1; then
        if python -c "import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)" 2>/dev/null; then
            SYS_PY="python"
        fi
    fi

    if [ -z "$SYS_PY" ]; then
        echo "[ERROR] Python 3.10+ was not found on your system PATH!"
        echo "Please install Python 3.10+ (e.g., sudo apt install python3 python3-venv python3-pip) and re-run."
        exit 1
    fi

    echo "[Setup] Creating virtual environment at \"$ROOT_DIR/venv\" ..."
    if ! "$SYS_PY" -m venv "$ROOT_DIR/venv" 2>/dev/null; then
        echo "[ERROR] Failed to create Python virtual environment!"
        echo "Ensure python3-venv is installed on your Linux distribution."
        echo "For Ubuntu/Debian, run: sudo apt update && sudo apt install -y python3-venv python3-pip"
        exit 1
    fi

    VENV_DIR="$ROOT_DIR/venv"
    PY_EXE="$ROOT_DIR/venv/bin/python"
    echo "[Setup] Virtual environment created."
    echo ""
fi

# 2. Verify and Install Python Dependencies
if [ -f "$REQ_FILE" ]; then
    echo "[Check] Verifying Python dependencies..."
    DEPS_OK=0
    "$PY_EXE" -c "
import hashlib, importlib.metadata, pathlib, re, sys
req = pathlib.Path(sys.argv[1])
stamp = pathlib.Path(sys.argv[2])
h = hashlib.sha256(req.read_bytes()).hexdigest()
pkgs = [re.split(r'[\[<>=~!;\s]', l.strip(), 1)[0] for l in req.read_text(encoding='utf-8').splitlines() if l.strip() and not l.strip().startswith('#')]
for p in pkgs:
    if p:
        importlib.metadata.distribution(p)
sys.exit(0 if stamp.exists() and stamp.read_text(encoding='utf-8').strip() == h else 1)
" "$REQ_FILE" "$VENV_DIR/.requirements.sha256" >/dev/null 2>&1 && DEPS_OK=1 || DEPS_OK=0

    if [ "$DEPS_OK" -eq 1 ]; then
        echo "[Check] Python dependencies verified."
    else
        echo "[Setup] Downloading and installing Python dependencies from $(basename "$REQ_FILE") ..."
        "$PY_EXE" -m pip install --upgrade pip 2>/dev/null || echo "[Warning] Could not upgrade pip; continuing..."
        if ! "$PY_EXE" -m pip install -r "$REQ_FILE"; then
            echo "[ERROR] Failed to install Python dependencies!"
            exit 1
        fi
        "$PY_EXE" -c "import hashlib, pathlib, sys; pathlib.Path(sys.argv[2]).write_text(hashlib.sha256(pathlib.Path(sys.argv[1]).read_bytes()).hexdigest(), encoding='utf-8')" "$REQ_FILE" "$VENV_DIR/.requirements.sha256"
        echo "[Setup] Python environment ready!"
        echo ""
    fi
fi

# 3. Verify Node.js and Install Frontend Dependencies
if ! command -v node >/dev/null 2>&1; then
    echo "[ERROR] Node.js was not found on your system PATH!"
    echo "Please install Node.js 18+ and re-run."
    exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
    echo "[ERROR] npm was not found on your system PATH!"
    echo "Please install npm / Node.js and re-run."
    exit 1
fi

echo "[Check] Verifying frontend Node.js dependencies..."
NEED_NPM_INSTALL=0
if [ ! -d "$ROOT_DIR/frontend/node_modules" ]; then
    NEED_NPM_INSTALL=1
else
    cd "$ROOT_DIR/frontend"
    node -e "
const fs = require('fs'), crypto = require('crypto'), path = require('path');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const lock = fs.existsSync('package-lock.json') ? fs.readFileSync('package-lock.json') : '';
const h = crypto.createHash('sha256').update(JSON.stringify(pkg)).update(lock).digest('hex');
const sp = path.join('node_modules', '.deps.sha256');
const deps = [...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.devDependencies || {})];
const ok = deps.every(d => fs.existsSync(path.join('node_modules', ...d.split('/'), 'package.json')));
const st = fs.existsSync(sp) && fs.readFileSync(sp, 'utf8').trim() === h;
process.exit(ok && st ? 0 : 1);
" >/dev/null 2>&1 || NEED_NPM_INSTALL=1
    cd "$ROOT_DIR"
fi

if [ "$NEED_NPM_INSTALL" -eq 1 ]; then
    echo "[Setup] Installing frontend dependencies via npm install ..."
    cd "$ROOT_DIR/frontend"
    if ! npm install; then
        echo "[ERROR] Failed to install frontend dependencies!"
        exit 1
    fi
    node -e "
const fs = require('fs'), crypto = require('crypto'), path = require('path');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const lock = fs.existsSync('package-lock.json') ? fs.readFileSync('package-lock.json') : '';
const h = crypto.createHash('sha256').update(JSON.stringify(pkg)).update(lock).digest('hex');
fs.writeFileSync(path.join('node_modules', '.deps.sha256'), h);
"
    cd "$ROOT_DIR"
    echo "[Setup] Frontend packages installed!"
    echo ""
else
    echo "[Check] Frontend dependencies verified."
fi

if [ "$1" == "--setup-only" ]; then
    echo ""
    echo "[Done] All dependencies are verified and ready."
    exit 0
fi

if [ ! -f "$ROOT_DIR/.env" ]; then
    if [ -f "$ROOT_DIR/.env.example" ]; then
        cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
        echo "[Notice] Created .env from .env.example."
    else
        echo "[Notice] No .env file found in \"$ROOT_DIR\"."
    fi
    echo "         Update .env with your GEMINI_API_KEY if needed."
    echo ""
fi

# Cleanup child processes on exit (Ctrl+C, etc.)
cleanup() {
    echo ""
    echo "[Shutdown] Stopping background servers..."
    if [ -n "$BACKEND_PID" ]; then kill "$BACKEND_PID" 2>/dev/null || true; fi
    if [ -n "$FRONTEND_PID" ]; then kill "$FRONTEND_PID" 2>/dev/null || true; fi
    wait 2>/dev/null || true
    echo "[Shutdown] All services stopped."
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# 4. Launch Backend API Server
echo "[1/2] Starting Backend API Server on http://localhost:8000 ..."
(cd "$ROOT_DIR" && "$PY_EXE" -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000) &
BACKEND_PID=$!

# 5. Launch Frontend Vite Dev Server
echo "[2/2] Starting Frontend Vite App on http://localhost:5173 ..."
(cd "$ROOT_DIR/frontend" && npm run dev -- --open) &
FRONTEND_PID=$!

echo ""
echo "========================================================"
echo "  Services are running!"
echo "  * Web Frontend: http://localhost:5173"
echo "  * Backend Docs: http://localhost:8000/docs"
echo "  Press Ctrl+C to stop all services."
echo "========================================================"
echo ""

# Keep running and wait for background processes
wait
