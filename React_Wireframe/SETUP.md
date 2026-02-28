# Skin Signature Setup (Recommended)

This guide is the fastest way to run the app on Windows/macOS/Linux.

## 1) Prerequisites

- Node.js 18+
- npm 9+
- Python 3.10 (recommended for backend compatibility)

## 2) Frontend Setup

From `React_Wireframe`:

```bash
npm install
npm run dev
```

Frontend runs on the Vite URL shown in terminal (usually `http://localhost:5173`).

## 3) Backend Setup (Windows - recommended)

From `React_Wireframe/backend`:

```powershell
py -3.10 -m venv .venv
.\.venv\Scripts\Activate.ps1
py -3.10 -m pip install --upgrade pip
py -3.10 -m pip install -r requirements.txt
py -3.10 -m uvicorn main:app --reload --port 3001
```

## 4) Backend Setup (macOS/Linux)

From `React_Wireframe/backend`:

```bash
python3.10 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload --port 3001
```

## 5) Why use `python -m uvicorn` / `py -m uvicorn`?

If you see this error:

```text
uvicorn : The term 'uvicorn' is not recognized...
```

it means the uvicorn executable is not on your shell PATH. Running uvicorn as a Python module always uses the active interpreter environment and avoids this issue.

## 6) Windows Troubleshooting (common)

### A) `python` command opens Microsoft Store / "Python was not found"

Use `py` instead:

```powershell
py --version
py -3.10 --version
```

Then run backend commands with `py -3.10 -m ...`.

### B) Verify uvicorn is installed in the active environment

```powershell
py -3.10 -m pip show uvicorn
```

If missing:

```powershell
py -3.10 -m pip install uvicorn fastapi
```

### B2) Optional: enable direct `uvicorn` command on Windows

By default, this guide uses `py -3.10 -m uvicorn ...` (recommended and most reliable).

If you want `uvicorn ...` to work directly, add Python Scripts to your **User PATH**:

```powershell
$pythonScripts = 'C:\Users\<your-user>\AppData\Local\Programs\Python\Python310\Scripts'
$current = [Environment]::GetEnvironmentVariable('Path', 'User')
[Environment]::SetEnvironmentVariable('Path', "$current;$pythonScripts", 'User')
```

Then restart terminal/VS Code and verify:

```powershell
uvicorn --version
```

Note: this updates **User PATH** only (not machine-wide System PATH), which is usually preferred.

### B3) Optional: machine-wide System PATH (admin only)

Use this only if you want `uvicorn` available for all users on the machine.
Run PowerShell as Administrator:

```powershell
$pythonScripts = 'C:\Users\<your-user>\AppData\Local\Programs\Python\Python310\Scripts'
$machinePath = [Environment]::GetEnvironmentVariable('Path', 'Machine')
[Environment]::SetEnvironmentVariable('Path', "$machinePath;$pythonScripts", 'Machine')
```

Then restart terminal/VS Code and verify:

```powershell
uvicorn --version
```

### C) Activation policy error in PowerShell

If script execution is blocked when activating `.venv`:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

## 7) Quick Health Checks

In a new terminal:

```powershell
curl http://127.0.0.1:3001/docs
```

If backend is running correctly, FastAPI Swagger UI should load.

## 8) Optional: Conda Setup

From `React_Wireframe`:

```bash
conda env create -f environment.yml
conda activate skin-signature-env
cd backend
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload --port 3001
```

