# Backend Deployment to Render.com - Step by Step

## ✅ Prerequisites (Already Done)
- ✅ Backend code with FastAPI
- ✅ requirements.txt with all dependencies
- ✅ CORS configured for frontend communication
- ✅ Procfile and render.yaml created
- ✅ Code pushed to GitHub

## 🚀 Deploy to Render.com (Free Tier)

### Step 1: Create Render Account
1. Go to: https://render.com
2. Click **"Get Started for Free"**
3. Sign up with **GitHub** (recommended)
4. Authorize Render to access your repositories

### Step 2: Create New Web Service
1. Click **"New +"** button (top right)
2. Select **"Web Service"**
3. Click **"Build and deploy from a Git repository"** → **Next**

### Step 3: Connect Repository
1. Find **ENG-Valtech/SkinSignature** in the list
2. If you don't see it:
   - Click **"Configure account"**
   - Grant access to the repository
   - Return and refresh
3. Click **"Connect"** next to your repository

### Step 4: Configure Web Service

Fill in these settings:

**Basic Settings:**
- **Name**: `skinsignature-backend` (or your choice)
- **Region**: Choose closest to your users (e.g., Oregon, Frankfurt)
- **Branch**: `main`
- **Root Directory**: `React_Wireframe/backend`

**Build Settings:**
- **Runtime**: `Python 3`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

**Plan:**
- Select **"Free"** (0$/month)
- Note: Free tier sleeps after 15 mins of inactivity (cold starts ~30s)

**Advanced Settings (Optional):**
- **Health Check Path**: `/health`
- **Python Version**: `3.10.0` (if available in dropdown)

### Step 5: Deploy
1. Click **"Create Web Service"**
2. Wait for deployment (3-5 minutes)
3. Watch the logs for any errors

### Step 6: Verify Deployment

Once deployed, you'll get a URL like:
```
https://skinsignature-backend.onrender.com
```

Test your endpoints:
1. **Health Check**: 
   ```
   https://skinsignature-backend.onrender.com/health
   ```
   Should return: `{"status": "healthy", ...}`

2. **Root Endpoint**:
   ```
   https://skinsignature-backend.onrender.com/
   ```
   Should return API info

## 📝 Your Backend Endpoints

After deployment, your API will be available at:

- **Health Check**: `GET /health`
- **Root Info**: `GET /`
- **Apply Lipstick**: `POST /v1/apply-lipstick`
- **Apply Foundation**: `POST /v1/apply-foundation-mediapipe`
- **Real-time Analysis**: `POST /v1/real-time-analysis`
- **Comprehensive Analysis**: `POST /v1/comprehensive-analysis`
- **Debug Lip Detection**: `POST /v1/debug-lip-detection`

## 🔧 Connect Frontend to Backend

After backend is deployed:

1. **Get your backend URL** from Render dashboard
   (e.g., `https://skinsignature-backend.onrender.com`)

2. **Update frontend environment variables**:
   
   Create `.env.local` in `React_Wireframe/`:
   ```env
   VITE_API_BASE=https://skinsignature-backend.onrender.com
   ```

3. **No code changes usually needed**:
   
   Frontend API helpers already read `VITE_API_BASE` (with `VITE_API_URL` backward compatibility).

4. **Redeploy frontend**:
   ```bash
   vercel --prod
   ```

## 🐛 Troubleshooting

### Build Fails
- Check logs in Render dashboard
- Verify `requirements.txt` has all packages
- Check Python version compatibility

### 502 Bad Gateway
- Backend is starting (wait 30s on free tier)
- Check start command is correct
- Verify port is `$PORT` not hardcoded

### CORS Errors
- Already configured in `main.py`
- If needed, add your frontend URL to `allow_origins` list

### Cold Starts (Free Tier)
- First request after 15 mins takes ~30s
- Consider upgrading to paid tier ($7/month) for always-on

## 💰 Cost

**Render Free Tier:**
- ✅ 750 hours/month free
- ✅ Automatic SSL
- ✅ Auto-deploy from GitHub
- ⚠️ Sleeps after 15 mins inactivity
- ⚠️ 512MB RAM limit

**If you need more:**
- **Starter**: $7/month (always on, no sleep)
- **Standard**: $25/month (more resources)

## 🎯 Quick Links

- **Render Dashboard**: https://dashboard.render.com
- **Render Docs**: https://render.com/docs
- **Your Frontend**: https://your-project-name.vercel.app
- **Backend Logs**: Available in Render dashboard

## 🆘 Need Help?

If you encounter issues:
1. Check the deployment logs in Render dashboard
2. Verify all files are pushed to GitHub
3. Ensure root directory is set correctly
4. Check Python version compatibility

## ✅ Deployment Checklist

- [ ] Render account created
- [ ] Repository connected
- [ ] Web service created with correct settings
- [ ] Deployment successful (check logs)
- [ ] Health endpoint accessible
- [ ] Frontend environment variable updated
- [ ] Frontend redeployed
- [ ] End-to-end test (upload image, apply lipstick/foundation)

---

**Ready to Deploy?** Start at: https://render.com
