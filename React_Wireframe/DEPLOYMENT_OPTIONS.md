# Deploy Backend - Simple Guide

Since you're having issues with organization-level GitHub access, here are your **3 best options**:

## ✅ OPTION 1: Railway.app (RECOMMENDED - Easiest)

Railway allows deployment via CLI without GitHub connection:

### Steps:
1. **Login to Railway** (browser will open):
   ```powershell
   railway login
   ```
   - Type **y** when asked "Open the browser?"
   - Complete login in browser
   - Come back to terminal

2. **Initialize and Deploy**:
   ```powershell
   cd "C:\Valtech Engg\SkinSignature\React_Wireframe\backend"
   railway init
   railway up
   ```

3. **Get your URL**:
   ```powershell
   railway domain
   ```

**Cost**: Free $5 credit/month

---

## ✅ OPTION 2: Use Your Personal GitHub Account

Create a fork of the repository to your personal account:

### Steps:
1. Go to: https://github.com/ENG-Valtech/SkinSignature
2. Click **Fork** (top right)
3. Fork to your personal account
4. Now connect Render/Railway to YOUR forked repo
5. Deploy from there

**Advantage**: Full GitHub integration works

---

## ✅ OPTION 3: Run Backend Locally + ngrok (FASTEST for Testing)

Skip cloud hosting for now and run backend locally with public URL:

### Steps:
1. **Install ngrok**:
   ```powershell
   winget install --id ngrok.ngrok
   ```

2. **Start your backend**:
   ```powershell
   cd "C:\Valtech Engg\SkinSignature\React_Wireframe\backend"
   uvicorn main:app --reload --port 3001
   ```

3. **In another terminal, expose it**:
   ```powershell
   ngrok http 3001
   ```

4. **Copy the ngrok URL** (e.g., https://abc123.ngrok.io)

5. **Update Vercel env variable**:
   - Go to Vercel settings
   - Set `VITE_API_BASE` to your ngrok URL
   - Redeploy

**Advantage**: Works immediately, no sign-up needed
**Disadvantage**: Only works while your computer is on

---

## 🎯 MY RECOMMENDATION

**Try Option 1 (Railway CLI)** - Let me guide you:

1. Open PowerShell
2. Run: `railway login`
3. Type **y** and press Enter
4. Complete login in browser
5. Come back and I'll continue

**Or tell me which option you prefer: 1, 2, or 3?**
