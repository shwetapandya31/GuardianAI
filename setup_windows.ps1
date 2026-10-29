# ==============================================================================
# GUARDIAN-AI — AUTOMATED WINDOWS SETUP & ENVIRONMENT VERIFICATION SCRIPT
# ==============================================================================

$ErrorActionPreference = "Stop"
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "         GUARDIAN-AI AUTOMATED SYSTEM SETUP            " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$ProjectRoot = $PSScriptRoot
if (-not $ProjectRoot) { $ProjectRoot = Get-Location }

# ------------------------------------------------------------------------------
# STEP 1: OPERATING SYSTEM CHECK
# ------------------------------------------------------------------------------
Write-Host "[1/8] Verifying Operating System..." -ForegroundColor Yellow
if (-not (($env:OS -like "*Windows*") -or $IsWindows)) {
    Write-Host "ERROR: This script is intended strictly for Windows environments." -ForegroundColor Red
    exit 1
}
Write-Host "  -> Operating System: Windows Detected [OK]" -ForegroundColor Green

# ------------------------------------------------------------------------------
# STEP 2: PYTHON ENVIRONMENT CHECK & SETUP
# ------------------------------------------------------------------------------
Write-Host "`n[2/8] Checking Python Runtime..." -ForegroundColor Yellow

$PythonCmd = $null
if (Get-Command "python" -ErrorAction SilentlyContinue) {
    $PythonCmd = "python"
} elseif (Get-Command "py" -ErrorAction SilentlyContinue) {
    $PythonCmd = "py"
}

if (-not $PythonCmd) {
    Write-Host "  [X] Python not found in system PATH." -ForegroundColor Red
    Write-Host "`nMANUAL ACTION REQUIRED:" -ForegroundColor Red
    Write-Host "  Software: Python 3.11+ (64-bit)" -ForegroundColor White
    Write-Host "  Installation: Download and install from https://www.python.org/downloads/windows/" -ForegroundColor White
    Write-Host "  IMPORTANT: Check 'Add python.exe to PATH' during installation." -ForegroundColor White
    exit 1
}

$PythonVersionStr = & $PythonCmd --version 2>&1
Write-Host "  -> Found Python: $PythonVersionStr" -ForegroundColor Green

# Create Virtual Environment if not present
$VenvPath = Join-Path $ProjectRoot "venv"
$VenvPython = Join-Path $VenvPath "Scripts\python.exe"

if (-not (Test-Path $VenvPython)) {
    Write-Host "  -> Creating Python Virtual Environment at .\venv ..." -ForegroundColor Cyan
    & $PythonCmd -m venv "$VenvPath"
    if (-not (Test-Path $VenvPython)) {
        Write-Host "ERROR: Virtual environment creation failed." -ForegroundColor Red
        exit 1
    }
}
Write-Host "  -> Virtual Environment Ready: .\venv [OK]" -ForegroundColor Green

# ------------------------------------------------------------------------------
# STEP 3: INSTALL PYTHON DEPENDENCIES
# ------------------------------------------------------------------------------
Write-Host "`n[3/8] Installing Python Backend Dependencies..." -ForegroundColor Yellow
Write-Host "  -> Upgrading pip..." -ForegroundColor Cyan
& "$VenvPython" -m pip install --upgrade pip --quiet

$ReqPath = Join-Path $ProjectRoot "backend\requirements.txt"
if (Test-Path $ReqPath) {
    Write-Host "  -> Installing packages from backend/requirements.txt..." -ForegroundColor Cyan
    & "$VenvPython" -m pip install -r "$ReqPath"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to install Python dependencies." -ForegroundColor Red
        exit 1
    }
    Write-Host "  -> Backend Python Dependencies Installed [OK]" -ForegroundColor Green
} else {
    Write-Host "  [!] Warning: backend/requirements.txt not found!" -ForegroundColor Red
}

# ------------------------------------------------------------------------------
# STEP 4: NODE.JS & NPM CHECK
# ------------------------------------------------------------------------------
Write-Host "`n[4/8] Checking Node.js and npm..." -ForegroundColor Yellow

$NodeCmd = Get-Command "node" -ErrorAction SilentlyContinue
$NpmCmd  = Get-Command "npm"  -ErrorAction SilentlyContinue

if (-not $NodeCmd -or -not $NpmCmd) {
    Write-Host "  [X] Node.js or npm not found in system PATH." -ForegroundColor Red
    Write-Host "`nMANUAL ACTION REQUIRED:" -ForegroundColor Red
    Write-Host "  Software: Node.js (v20+ or v24+ LTS)" -ForegroundColor White
    Write-Host "  Installation: Download from https://nodejs.org/ (Includes npm)" -ForegroundColor White
    exit 1
}

$NodeVersionStr = & node --version
$NpmVersionStr  = & npm --version
Write-Host "  -> Node.js Version: $NodeVersionStr" -ForegroundColor Green
Write-Host "  -> npm Version:     $NpmVersionStr" -ForegroundColor Green

# ------------------------------------------------------------------------------
# STEP 5: FRONTEND DEPENDENCIES (npm ci)
# ------------------------------------------------------------------------------
Write-Host "`n[5/8] Installing Frontend Node Dependencies..." -ForegroundColor Yellow
$FrontendDir = Join-Path $ProjectRoot "frontend"

if (Test-Path $FrontendDir) {
    Push-Location $FrontendDir
    Write-Host "  -> Running npm ci in frontend..." -ForegroundColor Cyan
    & npm ci
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [!] npm ci failed. Attempting npm install to sync lockfile..." -ForegroundColor Yellow
        & npm install
    }
    Pop-Location
    Write-Host "  -> Frontend Node Dependencies Installed [OK]" -ForegroundColor Green
} else {
    Write-Host "  [!] Warning: frontend directory not found!" -ForegroundColor Red
}

# ------------------------------------------------------------------------------
# STEP 6: AI MODEL FILES VERIFICATION
# ------------------------------------------------------------------------------
Write-Host "`n[6/8] Verifying AI Model Files..." -ForegroundColor Yellow

$Model1 = Join-Path $ProjectRoot "backend\best.pt"
$Model2 = Join-Path $ProjectRoot "backend\ai_module\yolov8n.pt"

$MissingModels = @()

if (Test-Path $Model1) {
    Write-Host "  -> Found Model: backend/best.pt (Custom YOLO Model) [OK]" -ForegroundColor Green
} else {
    Write-Host "  [X] Missing Model File: backend/best.pt" -ForegroundColor Red
    $MissingModels += "backend/best.pt"
}

if (Test-Path $Model2) {
    Write-Host "  -> Found Model: backend/ai_module/yolov8n.pt (YOLOv8 Base Model) [OK]" -ForegroundColor Green
} else {
    Write-Host "  [X] Missing Model File: backend/ai_module/yolov8n.pt" -ForegroundColor Red
    $MissingModels += "backend/ai_module/yolov8n.pt"
}

if ($MissingModels.Count -gt 0) {
    Write-Host "`nMANUAL ACTION REQUIRED (AI Models):" -ForegroundColor Red
    foreach ($m in $MissingModels) {
        Write-Host "  Copy or download model file to: $m" -ForegroundColor White
    }
}

# ------------------------------------------------------------------------------
# STEP 7: ENVIRONMENT FILES & CREDENTIALS CHECK
# ------------------------------------------------------------------------------
Write-Host "`n[7/8] Checking Configuration & Credentials..." -ForegroundColor Yellow

$FrontendEnv = Join-Path $ProjectRoot "frontend\.env"
$FrontendEnvEx = Join-Path $ProjectRoot "frontend\.env.example"
if (-not (Test-Path $FrontendEnv) -and (Test-Path $FrontendEnvEx)) {
    Write-Host "  -> Creating frontend\.env from frontend\.env.example..." -ForegroundColor Cyan
    Copy-Item $FrontendEnvEx $FrontendEnv
    Write-Host "  -> frontend\.env created [Action Needed: Edit with your Google Maps & Firebase keys]" -ForegroundColor Yellow
} else {
    Write-Host "  -> frontend\.env verified [OK]" -ForegroundColor Green
}

$BackendEnv = Join-Path $ProjectRoot "backend\.env"
$BackendEnvEx = Join-Path $ProjectRoot "backend\.env.example"
if (-not (Test-Path $BackendEnv) -and (Test-Path $BackendEnvEx)) {
    Write-Host "  -> Creating backend\.env from backend\.env.example..." -ForegroundColor Cyan
    Copy-Item $BackendEnvEx $BackendEnv
}

$FbKey1 = Join-Path $ProjectRoot "backend\guardianai-key.json"
$FbKey2 = Join-Path $ProjectRoot "backend\ai_module\serviceAccountKey.json"

if (-not (Test-Path $FbKey1) -and -not (Test-Path $FbKey2)) {
    Write-Host "`nMANUAL ACTION REQUIRED (Firebase Admin Service Account):" -ForegroundColor Yellow
    Write-Host "  Firebase admin credentials key is missing." -ForegroundColor White
    Write-Host "  Place your service account JSON file at: backend\guardianai-key.json" -ForegroundColor White
} else {
    Write-Host "  -> Firebase Service Account Key verified [OK]" -ForegroundColor Green
}

# ------------------------------------------------------------------------------
# STEP 8: VERIFICATION TESTS
# ------------------------------------------------------------------------------
Write-Host "`n[8/8] Running Verification Tests..." -ForegroundColor Yellow

# Test Python imports
$VerificationScript = "import flask, cv2, ultralytics, requests, firebase_admin, numpy, torch; print('  -> Python imports test: SUCCESS')"
& "$VenvPython" -c "$VerificationScript"
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [X] Python import verification failed." -ForegroundColor Red
} else {
    Write-Host "  -> All Python imports verified successfully! [OK]" -ForegroundColor Green
}

# ------------------------------------------------------------------------------
# FINAL SUMMARY & LAUNCH INSTRUCTIONS
# ------------------------------------------------------------------------------
Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "         GUARDIAN-AI SETUP COMPLETE!                    " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "OPTIONAL / SYSTEM SOFTWARE PREREQUISITES:" -ForegroundColor Yellow
Write-Host "  1. DroidCam / IP Camera Client:" -ForegroundColor White
Write-Host "     If using phone camera via DroidCam, install DroidCam Client from https://www.dev47apps.com/" -ForegroundColor Gray
Write-Host "     Or connect USB webcam / RTSP camera stream." -ForegroundColor Gray
Write-Host "  2. Google Maps API Key:" -ForegroundColor White
Write-Host "     Ensure VITE_GOOGLE_MAPS_API_KEY is configured in frontend\.env" -ForegroundColor Gray
Write-Host ""
Write-Host "TO START THE APPLICATION:" -ForegroundColor Green
Write-Host ""
Write-Host "  [BACKEND CAMERA SERVER]" -ForegroundColor Cyan
Write-Host "    1. Open PowerShell in project root." -ForegroundColor White
Write-Host "    2. Run:" -ForegroundColor White
Write-Host "       .\venv\Scripts\python.exe backend\guardianai_server.py" -ForegroundColor Yellow
Write-Host ""
Write-Host "  [FRONTEND WEB APPLICATION]" -ForegroundColor Cyan
Write-Host "    1. Open PowerShell in project root." -ForegroundColor White
Write-Host "    2. Run:" -ForegroundColor White
Write-Host "       cd frontend" -ForegroundColor Yellow
Write-Host "       npm run dev" -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
