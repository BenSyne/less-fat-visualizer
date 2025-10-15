# Quick Deployment Guide

## ✅ What You Have

A complete, working landing page system with:
- **Frontend**: Beautiful HTML landing page with drag & drop image upload
- **Backend**: Node.js API server that handles uploads and AI transformation
- **AI Integration**: Uses Gemini Flash via OpenRouter (already configured)

## 🚀 To Run Locally Right Now

```bash
# 1. Fix npm cache (if you get permission errors)
sudo chown -R $(whoami) "$HOME/.npm"

# 2. Install dependencies (already done, but if needed)
npm install

# 3. Start the server
# Real AI mode (requires internet + API key)
npm start

# OR: Mock AI mode (offline; simulates API)
MOCK_AI=true npm start

# 4. Open in browser
open http://localhost:3000/index.html
```

**Your server is currently running!** Open http://localhost:3000/index.html

## 📦 What's Included

```
less-fat/
├── index.html          ✅ Landing page (already existed)
├── server.js           ✅ NEW: Backend API server
├── package.json        ✅ NEW: Dependencies
├── .env                ✅ Already has your OpenRouter API key
├── README.md           ✅ NEW: Full documentation
├── DEPLOYMENT.md       ✅ NEW: This file
├── .gitignore          ✅ NEW: Git ignore rules
├── start.sh            ✅ NEW: Quick start script
└── uploads/            ✅ For uploaded images
└── results/            ✅ For transformed images
└── logs/               ✅ Server logs
```

## 🌐 Deploy to Production (Choose One)

### Option 1: Railway (Recommended - Easiest)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy
railway init
railway up

# Add environment variable in Railway dashboard:
# OPENROUTER_API_KEY=sk-or-v1-...
```
**Result**: Live in 2 minutes at `https://your-app.up.railway.app`

### Option 2: Render (Free Tier Available)
1. Push code to GitHub
2. Go to https://render.com
3. Click "New +" → "Web Service"
4. Connect your GitHub repo
5. Add environment variable: `OPENROUTER_API_KEY`
6. Click "Deploy"

**Result**: Live at `https://your-app.onrender.com`

### Option 3: Vercel (Serverless)
```bash
npm install -g vercel
vercel

# Add environment variable when prompted:
# OPENROUTER_API_KEY=sk-or-v1-...
```
**Result**: Live at `https://your-app.vercel.app`

### Option 4: DigitalOcean App Platform
1. Push to GitHub
2. Create new app from repo
3. Set environment variable: `OPENROUTER_API_KEY`
4. Deploy

**Result**: Live at `https://your-app-*.ondigitalocean.app`

### Option 5: Your Own VPS
```bash
# SSH into your server
ssh user@your-server.com

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Upload your code
scp -r less-fat/ user@your-server.com:/var/www/

# Install PM2 for process management
cd /var/www/less-fat
npm install
sudo npm install -g pm2

# Start with PM2
pm2 start server.js --name less-fat
pm2 startup
pm2 save

# Setup Nginx as reverse proxy (optional)
sudo apt install nginx
# Configure Nginx to proxy localhost:3000
```

## 🔧 Custom Domain Setup

After deploying, to use your own domain:

1. **Update DNS**: Point your domain to the deployment platform
2. **SSL Certificate**: Most platforms (Railway, Render, Vercel) auto-generate SSL
3. **Update CORS**: Edit `server.js` if you need specific CORS rules

## 📝 Important Notes

### Before Going Live:
- [ ] The `.env` file is in `.gitignore` (already done)
- [ ] Set `OPENROUTER_API_KEY` as environment variable on hosting platform
- [ ] Test the full upload → transform → download flow
- [ ] Check that images are being processed correctly
- [ ] Set `OPENROUTER_MODEL` if you want a specific model (default uses `google/gemini-2.5-flash-image-preview`)
- [ ] Consider adding rate limiting for production traffic

### Current Limitations:
- Images stored on server filesystem (works for low traffic)
- No authentication (public landing page)
- No automatic cleanup of old images (add cron job if needed)

### For High Traffic:
Consider upgrading to:
- **Cloud Storage**: S3, Cloudinary, or Google Cloud Storage for images
- **Queue System**: Redis + Bull for job processing
- **Database**: PostgreSQL/MongoDB for job tracking
- **CDN**: Cloudflare for static assets

## 💰 Cost Breakdown

- **OpenRouter API**: ~$0.001-0.005 per transformation (Gemini Flash is cheap!)
- **Hosting**:
  - Railway: Free tier, then $5/month
  - Render: Free tier, then $7/month
  - Vercel: Free tier, then $20/month
  - DigitalOcean: $6/month minimum

**Estimated**: First 1000 transformations < $10 total

## 🧪 Testing

Test the full flow:
1. Upload a photo
2. Watch the processing animation
3. See the before/after result
4. Download the result

Test with different:
- Image formats (JPEG, PNG, WebP)
- Image sizes (small to 10MB)
- Different faces (to see AI transformation quality)

## 🐛 Troubleshooting

**"npm install" fails with permission error**
```bash
sudo chown -R $(whoami) ~/.npm
npm install
```

**Server won't start on port 3000**
```bash
# Check if something is using port 3000
lsof -i :3000

# Or use a different port
PORT=8080 npm start
```

**AI transformation not working**
- Check OpenRouter API key is valid
- Check you have credits at https://openrouter.ai/account
- Look at `logs/server.log` for errors

**Images not displaying**
- Check `uploads/` and `results/` directories exist
- Check file permissions (should be writable)
- Look at browser console for errors

## 📞 Support

- **OpenRouter Issues**: https://openrouter.ai/docs
- **Gemini Model Issues**: https://ai.google.dev/docs
- **Deployment Help**: Check your platform's documentation

## 🎉 You're Ready!

Your landing page is **complete and working**. Just:
1. Choose a deployment platform
2. Push your code
3. Add the API key
4. Go live!

The entire app is self-contained and can be deployed anywhere that runs Node.js.

---

## 🐳 Docker & Coolify Deployment

This repo includes a Dockerfile and docker-compose.yml.

### Build & run locally

```bash
# Build image
docker build -t less-fat:latest .

# Run (replace with your key)
docker run --rm -p 3000:3000 \
  -e HOST=0.0.0.0 \
  -e OPENROUTER_API_KEY=sk-or-v1-... \
  less-fat:latest

# Open
open http://localhost:3000/index.html
```

Or via Compose:

```bash
OPENROUTER_API_KEY=sk-or-v1-... docker compose up --build
```

Environment variables:
- `OPENROUTER_API_KEY` (required for real generation)
- `OPENROUTER_MODEL` (optional)
- `ALLOW_FALLBACK_ORIGINAL` (optional; default false)
- `MOCK_AI` (optional; default false)
- `JOB_TTL_MS` (optional; default 600000)

### Deploy with Coolify

Option A — Dockerfile App:
- Create an App → connect this Git repo → Build Pack: Dockerfile.
- Set `OPENROUTER_API_KEY` in Secrets.
- Exposes port `3000` (already in Dockerfile).
- Deploy.

Option B — Docker Compose:
- New Docker Compose resource → paste `docker-compose.yml`.
- Add `OPENROUTER_API_KEY` as a secret/env.
- Deploy.

Healthcheck: container GETs `/api/health` automatically.
