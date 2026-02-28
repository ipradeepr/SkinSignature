# Python Backend Deployment Guide

## ⚠️ Important: Vercel Limitations for Your Backend

Your backend uses **MediaPipe**, **OpenCV**, and **computer vision** which have significant limitations on Vercel:

### Issues with Vercel Serverless:
1. **Size Limits**: Vercel serverless functions have a 50MB limit (uncompressed)
2. **MediaPipe & OpenCV**: These libraries are ~200MB+ and won't work on Vercel
3. **Cold Starts**: Serverless functions have 10-second timeout for cold starts
4. **Memory**: Limited to 1GB RAM (your CV operations need more)

## ✅ Recommended Solutions

### Option 1: Deploy Backend Separately (RECOMMENDED)

Deploy your Python backend to a platform that supports full Python applications:

#### **A. Render.com (Free Tier Available)**
1. Go to [render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repo
4. Configure:
   - **Root Directory**: `React_Wireframe/backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Environment**: Python 3.10
5. Deploy!

**Pros**: Free tier, supports large Python packages, no size limits
**Cons**: Cold starts on free tier

#### **B. Railway.app (Free $5 Monthly Credit)**
1. Go to [railway.app](https://railway.app)
2. Click "Start a New Project"
3. Select your GitHub repo
4. Configure:
   - **Root Directory**: `React_Wireframe/backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Deploy!

**Pros**: Fast, reliable, no cold starts
**Cons**: Paid after $5 credit

#### **C. Fly.io (Free Tier)**
```bash
# Install flyctl
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"

# Navigate to backend
cd "C:\Valtech Engg\SkinSignature\React_Wireframe\backend"

# Login and deploy
fly auth login
fly launch
fly deploy
```

**Pros**: Fast, Docker-based, good free tier
**Cons**: Requires Docker knowledge

#### **D. Google Cloud Run (Always Free Tier)**
1. Install Google Cloud CLI
2. Build and deploy:
```bash
gcloud run deploy skinsignature-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

**Pros**: Scalable, Google infrastructure
**Cons**: More complex setup

### Option 2: Vercel for Frontend + Backend Separately

Keep your current setup:
- **Frontend on Vercel**: ✅ Already deployed
- **Backend on Render/Railway/Fly**: Deploy separately

Then update your frontend to point to the backend URL.

## 📝 Current Backend Requirements

Your backend needs these packages (won't work on Vercel):
```
fastapi==0.120.4
uvicorn==0.38.0
opencv-python==4.12.0.88
mediapipe==0.10.21
numpy==2.2.6
pillow==12.0.0
pydantic==2.12.3
```

## 🔧 Connect Frontend to Backend

After deploying backend, update your frontend:

1. Create `.env.local` in React_Wireframe:
```env
VITE_API_BASE=https://your-backend-url.onrender.com
```

2. Frontend already supports `VITE_API_BASE` via `src/config/api.ts`.

## 🚀 Quick Start: Deploy to Render.com

1. **Fix backend requirements.txt:**
```bash
cd "C:\Valtech Engg\SkinSignature\React_Wireframe\backend"
pip freeze > requirements.txt
```

2. **Commit and push:**
```bash
git add backend/requirements.txt
git commit -m "Update backend requirements"
git push origin main
```

3. **Deploy on Render:**
   - Visit [render.com](https://render.com)
   - Sign up with GitHub
   - Create "New Web Service"
   - Select your repo
   - Set root to `React_Wireframe/backend`
   - Deploy!

4. **Update Frontend:**
   - Get backend URL from Render
   - Update API endpoints in your React app
   - Redeploy frontend: `vercel --prod`

## 🎯 Recommended Architecture

```
┌─────────────────────┐
│  Vercel (Frontend)  │
│  - React App        │
│  - Static Assets    │
└──────────┬──────────┘
           │ API Calls
           ▼
┌─────────────────────┐
│ Render (Backend)    │
│ - FastAPI           │
│ - MediaPipe         │
│ - OpenCV            │
│ - Computer Vision   │
└─────────────────────┘
```

This is the industry-standard approach for deploying CV/ML applications!

## Need Help?

Let me know which platform you'd like to use and I can help you deploy!
