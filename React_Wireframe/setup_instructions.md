# SkinSignature Project Setup Guide

## 1. Prerequisites

- **Node.js** (v16+ recommended)
- **npm** or **yarn**
- **Python** (3.10 recommended for backend/mediapipe compatibility)
- (Optional) **pyenv** or **conda** for managing multiple Python versions

---

## 2. Python Environment Setup

> **Important:** mediapipe does NOT support Python 3.11+ (including 3.13).  
> Use Python 3.10 for backend and mediapipe.

### If you need both Python 3.10 and 3.13:

- **Windows:**  
  - Install Python 3.10 from https://www.python.org/downloads/release/python-3100/
  - Install Python 3.13 if needed for other tools.
  - Use the full path or `py -3.10` to run Python 3.10.

- **macOS/Linux:**  
  - Use [pyenv](https://github.com/pyenv/pyenv) to install and manage multiple Python versions:
    ```
    pyenv install 3.10.14
    pyenv global 3.10.14
    ```

### Create and activate a virtual environment (using Python 3.10):

```sh
# Windows
py -3.10 -m venv .venv
.venv\Scripts\activate

# macOS/Linux
python3.10 -m venv .venv
source .venv/bin/activate
```

### Install backend dependencies (including mediapipe):

```sh
pip install fastapi uvicorn mediapipe
# Add any other backend dependencies here
```

---

## 3. Frontend Setup

```sh
npm install
# or
yarn install
```

---

## 4. Running the Project

### Start the backend (from the backend directory):

```sh
# Make sure your virtual environment is activated!
uvicorn backend.main:app --reload
```

### Start the frontend (from the root directory):

```sh
npm run dev
# or
yarn dev
```

---

## 5. Notes

- If you get errors about `mediapipe` not found, double-check you are using Python 3.10 in your virtual environment.
- If you need to switch Python versions, deactivate your current venv and create a new one with the correct Python.
- The frontend uses `@mediapipe/face_mesh` and `@mediapipe/camera_utils` for browser-based features, which are installed via `npm`.

---

## 6. Example Directory Structure

```
SkinSignature/
  backend/
    main.py
    ...other backend files...
  src/
    components/
    ...other frontend files...
  package.json
  setup_instructions.md
  ...
```
