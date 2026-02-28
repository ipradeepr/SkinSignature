# Frontend-Backend Connection Guide

## ✅ What I've Done

I've configured your frontend to connect to your backend API with environment variables:

### Files Created/Updated:

1. **`src/config/api.ts`** - API configuration helper
2. **`.env.local`** - Local environment variables (not committed to git)
3. **`.env.example`** - Example environment file (committed to git)
4. **Updated Services:**
   - `src/services/skinAnalysisService.ts`
   - `src/components/FoundationTryOnInterface.tsx`
   - `src/components/LipstickTryOnInterface.tsx`

All API calls now use the `VITE_API_BASE` environment variable (with `VITE_API_URL` backward compatibility).

## 🚀 Deployment Steps

### Step 1: Deploy Backend to Render (if not done yet)

Follow the guide in `RENDER_DEPLOYMENT_GUIDE.md`

Your backend will be deployed at a URL like:
```
https://skinsignature-backend.onrender.com
```

### Step 2: Update Frontend Environment Variable

Once your backend is deployed on Render:

1. **Copy your backend URL** from Render dashboard

2. **Update `.env.local`**:
   ```env
   VITE_API_BASE=https://skinsignature-backend.onrender.com
   ```
   (Replace with your actual Render URL)

3. **For Vercel Production**, add environment variable:
   - Go to: Vercel Project Settings → Environment Variables
   - Add new variable:
     - **Name**: `VITE_API_BASE`
     - **Value**: `https://skinsignature-backend.onrender.com` (your Render URL)
     - **Environment**: Production, Preview, Development (select all)
   - Click **Save**

### Step 3: Redeploy Frontend

```powershell
# Make sure you're in the project directory
cd "C:\Valtech Engg\SkinSignature\React_Wireframe"

# Deploy to Vercel
vercel --prod
```

Or simply push to GitHub and Vercel will auto-deploy (if connected).

## 🧪 Testing Locally

To test the connection locally:

1. **Start Backend** (in one terminal):
   ```powershell
   cd "C:\Valtech Engg\SkinSignature\React_Wireframe\backend"
   uvicorn main:app --reload --port 3001
   ```

2. **Start Frontend** (in another terminal):
   ```powershell
   cd "C:\Valtech Engg\SkinSignature\React_Wireframe"
   npm run dev
   ```

3. **Test the features**:
   - Skin analysis
   - Lipstick try-on
   - Foundation try-on

## 🔍 Verifying the Connection

### Check Frontend:
1. Open browser console (F12)
2. Go to Network tab
3. Try a feature (lipstick/foundation)
4. You should see API requests to your backend URL

### Check Backend:
1. Open your backend URL in browser:
   - https://skinsignature-backend.onrender.com/health
   - Should return: `{"status": "healthy", ...}`

## 📊 Architecture Overview

```
┌─────────────────────────────────────┐
│         User's Browser              │
│  (Vercel Frontend)                  │
│  skin-signature-*.vercel.app        │
└─────────────┬───────────────────────┘
              │
              │ API Requests
              │ (VITE_API_BASE)
              │
              ▼
┌─────────────────────────────────────┐
│      Backend API Server             │
│  (Render.com)                       │
│  skinsignature-backend.onrender.com │
│                                     │
│  Endpoints:                         │
│  - POST /v1/apply-lipstick          │
│  - POST /v1/apply-foundation-...    │
│  - POST /v1/real-time-analysis      │
│  - POST /v1/comprehensive-analysis  │
└─────────────────────────────────────┘
```

## 🛠️ Environment Variables Reference

### Development (.env.local):
```env
VITE_API_BASE=http://localhost:3001
```

### Production (Vercel Dashboard):
```env
VITE_API_BASE=https://skinsignature-backend.onrender.com
```

## ⚠️ Important Notes

1. **Cold Starts**: Render free tier sleeps after 15 mins of inactivity
   - First request may take 20-30 seconds
   - Show loading state to users

2. **CORS**: Already configured in backend to accept requests from:
   - Your Vercel domain
   - localhost (for development)

3. **Environment Variables**: 
   - `.env.local` is NOT committed to git (in .gitignore)
   - `.env.example` is committed as reference
   - Vercel variables set in dashboard

## 🐛 Troubleshooting

### "Failed to fetch" Error:
- Check if backend is running (visit `/health` endpoint)
- Verify VITE_API_BASE is set correctly
- Check browser console for CORS errors

### CORS Error:
- Verify frontend URL is in backend's `allow_origins` list
- Redeploy backend if you added new frontend URL

### "Network Error":
- Backend might be sleeping (cold start)
- Wait 30 seconds and retry
- Consider upgrading Render to paid tier

### API Returns 404:
- Verify endpoint path is correct
- Check backend logs in Render dashboard

## 📱 Quick Commands

```powershell
# Check current environment variable
echo $env:VITE_API_BASE

# Test backend health
Invoke-WebRequest -Uri "https://skinsignature-backend.onrender.com/health"

# Deploy frontend
vercel --prod

# View Vercel logs
vercel logs
```

## ✅ Deployment Checklist

- [ ] Backend deployed to Render
- [ ] Backend health check accessible
- [ ] `.env.local` updated with Render URL
- [ ] Vercel environment variable added
- [ ] Frontend redeployed
- [ ] Test lipstick try-on feature
- [ ] Test foundation try-on feature
- [ ] Test skin analysis feature
- [ ] Check browser console for errors
- [ ] Verify API calls in Network tab

---

**Need help?** Check the logs:
- **Backend**: Render Dashboard → Logs
- **Frontend**: Browser Console (F12) or `vercel logs`
