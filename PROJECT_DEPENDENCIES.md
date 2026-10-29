# GUARDIAN-AI — COMPLETE PROJECT DEPENDENCY MANIFEST

This document provides a comprehensive dependency inventory, architectural requirements, runtime environment specifications, and setup instructions for the **Guardian-AI** project.

---

## 1. Complete Dependency Inventory Table

| Dependency | Type | Version | Required | Used By | Auto Installable |
|------------|------|---------|----------|---------|------------------|
| **Windows 10 / 11** | OS Prerequisite | 64-bit | Required | System Host OS | No (OS Environment) |
| **Python** | Runtime Language | 3.11+ (Tested: 3.14.7) | Required | Backend Flask camera server & AI pipelines | No (Manual Installer) |
| **Node.js** | Runtime Language | v20+ (Tested: v24.21.0) | Required | Frontend web application & SSR server | No (Manual Installer) |
| **npm** | Package Manager | 10.x - 11.19.0 | Required | Frontend dependency management | No (Included with Node) |
| **Git** | Developer Tool | 2.x+ | Optional | Version control & repository cloning | No (Manual Installer) |
| **Flask** | Python Package | 3.1.3 | Required | `backend/guardianai_server.py` | Yes (`setup_windows.ps1` / `pip`) |
| **opencv-python** | Python Package | 5.0.0.93 | Required | Video capture, frame processing, MJPEG streaming | Yes (`setup_windows.ps1` / `pip`) |
| **ultralytics** | AI/ML Framework | 8.4.163 | Required | YOLOv8 object, person & fall detection | Yes (`setup_windows.ps1` / `pip`) |
| **torch** | AI/ML Framework | 2.14.0 | Required | PyTorch neural network runtime backend for YOLO | Yes (`setup_windows.ps1` / `pip`) |
| **torchvision** | AI/ML Framework | 0.29.0 | Required | Computer vision models & transforms for PyTorch | Yes (`setup_windows.ps1` / `pip`) |
| **numpy** | Python Package | 2.5.3 | Required | Array math & tracking in `detection_core.py` | Yes (`setup_windows.ps1` / `pip`) |
| **requests** | Python Package | 2.34.2 | Required | HTTP API requests to Roboflow & backend | Yes (`setup_windows.ps1` / `pip`) |
| **firebase-admin** | Python Package | 7.7.0 | Required | Backend Firestore & Cloud Storage integration | Yes (`setup_windows.ps1` / `pip`) |
| **react / react-dom** | Frontend Framework | ^19.2.0 | Required | Core UI component engine | Yes (`npm ci`) |
| **@tanstack/react-router** | Routing Library | 1.170.18 | Required | Type-safe single-page routing | Yes (`npm ci`) |
| **@tanstack/react-start** | Fullstack Framework | 1.168.32 | Required | Server-side rendering (SSR) & server functions | Yes (`npm ci`) |
| **firebase** | Frontend SDK | ^12.17.1 | Required | Client Auth, Firestore real-time sync, Storage | Yes (`npm ci`) |
| **leaflet / @types/leaflet** | Mapping Library | ^1.9.4 | Required | Map tile rendering fallback | Yes (`npm ci`) |
| **framer-motion** | Animation Library | ^13.0.0 | Required | Smooth UI transitions & animation primitives | Yes (`npm ci`) |
| **lucide-react** | Icon Library | ^0.575.0 | Required | Modern UI icon set | Yes (`npm ci`) |
| **tailwindcss** | Styling System | ^4.2.1 | Required | Responsive design system & CSS engine | Yes (`npm ci`) |
| **vite** | Build Tool | ^8.2.0 | Required | Frontend bundler & dev server | Yes (`npm ci`) |
| **typescript** | Compiler | ^5.8.3 | Required | Static type safety | Yes (`npm ci`) |
| **backend/best.pt** | AI Model File | Custom YOLO | Required | Local sit/stand/fall model in `guardianai_server.py` | No (Included in repo) |
| **backend/ai_module/yolov8n.pt** | AI Model File | YOLOv8 Nano | Required | Person detection in `ai_module/detection_core.py` | No (Included in repo) |
| **DroidCam Client** | System Software | Latest | Optional | Smartphone webcam streaming to `cv2.VideoCapture(1)` | No (Manual download) |
| **Google Maps API Key** | External Cloud Service | JS, Places, Geocoding | Required | Live incident map & route navigation | No (User API Key) |
| **Firebase Project Credentials** | External Cloud Service | Firestore, Auth | Required | Real-time incident alert database | No (User Service Account JSON) |

---

## 2. Environment Configuration Templates

### Frontend (`frontend/.env`)
Create `frontend/.env` by copying `frontend/.env.example`:
```env
VITE_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY_HERE
VITE_GOOGLE_API_KEY=YOUR_GOOGLE_MAPS_API_KEY_HERE
VITE_FIREBASE_API_KEY=YOUR_FIREBASE_API_KEY_HERE
VITE_FIREBASE_AUTH_DOMAIN=guardianai-a57df.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=guardianai-a57df
VITE_FIREBASE_STORAGE_BUCKET=guardianai-a57df.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=748269518133
VITE_FIREBASE_APP_ID=1:748269518133:web:48c299483b60591242e07c
GOOGLE_API_KEY=YOUR_FIREBASE_API_KEY_HERE
```

### Backend (`backend/.env`)
Create `backend/.env` by copying `backend/.env.example`:
```env
FLASK_PORT=8000
CAMERA_INDEX=1
ROBOFLOW_API_KEY=YOUR_ROBOFLOW_API_KEY_HERE
FIREBASE_CREDENTIALS_FILE=guardianai-key.json
FIREBASE_STORAGE_BUCKET=guardianai-a57df.firebasestorage.app
```

---

## 3. Step-by-Step User Setup & Execution Workflow

### A. Automatic One-Command Setup
On a fresh Windows PC:
1. Clone / Download the Guardian-AI repository.
2. Open PowerShell in the project root directory.
3. Run the automated setup script:
   ```powershell
   .\setup_windows.ps1
   ```
   This script automatically:
   - Verifies Windows OS, Python, Node.js, and npm.
   - Creates a clean Python virtual environment at `.\venv`.
   - Upgrades `pip` and installs all pinned packages from `backend/requirements.txt`.
   - Runs `npm ci` inside `frontend/` to install all frontend packages.
   - Verifies AI model files (`best.pt` & `yolov8n.pt`).
   - Prepares `.env` templates.
   - Runs Python import verification tests.

### B. Running Guardian-AI

#### 1. Start Backend Camera & AI Server
Open PowerShell in the project root and run:
```powershell
.\venv\Scripts\python.exe backend\guardianai_server.py
```
*Camera Server streams live AI annotated feed at `http://127.0.0.1:8000/video_feed`.*

#### 2. Start Frontend Web Application
Open a second PowerShell window in the project root and run:
```powershell
cd frontend
npm run dev
```
*Access the Web Application at `http://localhost:3000` (or `http://localhost:5173`).*

---

## 4. Manual Prerequisites & Hardware Setup
If any system prerequisite is missing, complete these steps manually:
1. **Python Installation**: Download Python 3.11+ 64-bit from [python.org](https.www.python.org/downloads/windows/). Ensure **"Add python.exe to PATH"** is enabled.
2. **Node.js Installation**: Download Node.js v20+ / v24+ LTS from [nodejs.org](https://nodejs.org/).
3. **Camera Setup**:
   - **Phone Camera**: Install DroidCam Windows Client from [dev47apps.com](https://www.dev47apps.com/). Connect phone via USB or Wi-Fi.
   - **USB Webcam**: Plug in webcam (detected by `cv2.VideoCapture(1)` or `cv2.VideoCapture(0)`).
   - **IP Camera**: Edit camera RTSP URL in `backend/hybrid_demo.py` if using IP security cameras.
