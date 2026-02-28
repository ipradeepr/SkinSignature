# Vercel Deployment Guide

## Files Added/Updated ✅

1. **vercel.json** - Simplified and configured for Vite
2. **.vercelignore** - Tells Vercel which files to ignore during deployment

## Next Steps to Deploy

### 1. Push Changes to GitHub
```bash
git push origin main
```

### 2. Deploy to Vercel

#### Option A: Via Vercel Dashboard (Recommended)
1. Go to [vercel.com](https://vercel.com)
2. Sign in with your GitHub account
3. Click **"Add New Project"**
4. Select **"Import Git Repository"**
5. Find and select **ENG-Valtech/SkinSignature**
6. Vercel will auto-detect the settings:
   - **Framework Preset**: Vite
   - **Root Directory**: `React_Wireframe` (if needed, change this)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
7. Click **Deploy**

#### Option B: Via Vercel CLI
```bash
# Install Vercel CLI globally
npm install -g vercel

# Navigate to project directory
cd "c:\Valtech Engg\SkinSignature\React_Wireframe"

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

### 3. Configure Root Directory (If Needed)

If your repository root is not the React_Wireframe folder:
1. In Vercel dashboard, go to Project Settings
2. Under **Build & Development Settings**
3. Set **Root Directory** to: `React_Wireframe`
4. Save and redeploy

### 4. Environment Variables (If Any)

If your app needs environment variables:
1. Go to Project Settings → Environment Variables
2. Add any required variables (e.g., API keys)
3. Redeploy

## Vercel Configuration Explained

```json
{
  "buildCommand": "npm run build",      // Builds your Vite app
  "outputDirectory": "dist",            // Where Vite outputs built files
  "framework": "vite",                  // Auto-detection for Vite
  "rewrites": [                         // SPA routing support
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

## Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify Node version compatibility

### 404 Errors on Routes
- The rewrite rule handles this (already configured)

### API/Backend Issues
- Note: This deploys only the frontend
- Backend (`backend/` folder) needs separate deployment
- Consider deploying backend to Vercel Serverless Functions or separate service

## Your App URLs

After deployment, you'll get:
- **Production**: `https://your-project-name.vercel.app`
- **Preview**: Automatic preview URLs for each PR

## Custom Domain (Optional)

To use `www.skinsignature.com`:
1. Go to Project Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions
