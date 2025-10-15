# GLP-1 Weight Loss Visualization Landing Page

A simple, self-contained landing page that uses AI to show people what they'd look like 20 pounds lighter. Built for ad campaigns and quick deployment.

See PRD: PRD.md

## Features

- 📸 **Drag & drop photo upload** with preview
- 🤖 **AI-powered transformation** using Gemini Flash via OpenRouter
- ⚡ **Real-time progress tracking** with status updates
- 🎨 **Beautiful before/after comparison** with circular image frames
- ⬇️ **Download results** instantly
- 🔒 **Privacy-focused** - images processed and stored temporarily

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Your `.env` file is already set up with:
```
OPENROUTER_API_KEY=sk-or-v1-...
```

### 3. Run the Server

```bash
# Real AI mode (requires internet + valid API key)
npm start

# OR: Mock AI mode (offline; simulates API)
MOCK_AI=true npm start
```

The server starts on http://localhost:3000

### 4. Open in Browser

Visit http://localhost:3000/index.html

## How It Works

1. **Upload**: User uploads their photo (JPEG, PNG, WebP up to 10MB)
2. **Process**: Server sends image to Gemini AI with weight-loss transformation prompt
3. **Poll**: Frontend polls for job status every 3 seconds
4. **Result**: Display before/after comparison with download option

## API Endpoints

### `POST /api/upload-photo`
Upload a photo for transformation
- **Body**: FormData with `photo` field
- **Response**: `{ imageId: string }`

### `POST /api/transform`
Start AI transformation
- **Body**: `{ imageId, transformationType, amount }`
- **Response**: `{ jobId: string }`

### `GET /api/job-status/:jobId`
Check transformation status
- **Response**: `{ status, originalUrl, resultUrl, error }`

### `GET /api/health`
Health check endpoint

### `GET /api/config`
Returns current server configuration
- Response: `{ model, mock, host, port }`

## Deployment

### Option 1: Railway
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

### Option 2: Render
1. Push to GitHub
2. Create new Web Service on Render
3. Connect your repo
4. Add environment variable: `OPENROUTER_API_KEY`
5. Deploy!

### Option 3: Vercel (Serverless)
```bash
npm install -g vercel
vercel
```

### Option 4: DigitalOcean App Platform
1. Push to GitHub
2. Create new app from repo
3. Set environment variables
4. Deploy!

### Option 5: Basic VPS (Ubuntu)
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone/upload your code
cd /var/www/less-fat
npm install

# Run with PM2
sudo npm install -g pm2
pm2 start server.js --name less-fat
pm2 startup
pm2 save

# Setup Nginx reverse proxy
sudo apt install nginx
# Configure Nginx to proxy port 3000
```

## File Structure

```
less-fat/
├── index.html          # Frontend landing page
├── server.js           # Node.js backend API
├── package.json        # Dependencies
├── .env               # API keys (DO NOT COMMIT)
├── uploads/           # Uploaded images (temp)
├── results/           # Transformed images (temp)
└── logs/              # Server logs
```

## Configuration

### Environment Variables

- `OPENROUTER_API_KEY` - Your OpenRouter API key (required)
- `PORT` - Server port (default: 3000)
- `HOST` - Bind address (default: 127.0.0.1)
- `MOCK_AI` - Set to `true` to simulate AI locally
- `OPENROUTER_MODEL` - Override model (default: `google/gemini-2.5-flash-image-preview`)

### Customization

**Change transformation amount**: Edit the `amount` value in index.html:164 (default: 20 lbs)

**Change AI model**: Set the `OPENROUTER_MODEL` env var (default: `google/gemini-2.5-flash-image-preview`)

**Adjust upload limits**: Edit multer config in server.js:17 (currently: 10MB)

## Security Notes

⚠️ **Production Checklist**:
- [ ] Never commit `.env` file to git
- [ ] Add rate limiting (express-rate-limit)
- [ ] Implement file cleanup (delete old uploads/results)
- [ ] Add authentication if needed
- [ ] Use HTTPS in production
- [ ] Consider using cloud storage (S3, Cloudinary) instead of local files
- [ ] Add CORS restrictions for your domain
- [ ] Implement proper error handling and logging

## Tech Stack

- **Frontend**: Vanilla JS + Tailwind CSS
- **Backend**: Node.js + Express
- **AI**: Gemini Flash 1.5 via OpenRouter
- **Storage**: Local filesystem (swap with S3/Cloudinary for production)

## Cost Estimate

- **OpenRouter API**: ~$0.001-0.005 per transformation (Gemini Flash is very cheap)
- **Hosting**: Free tier on most platforms (Railway, Render, Vercel)
- **Total**: < $1 for first 1000 transformations

## Troubleshooting

**Server won't start**
- Check if port 3000 is available
- Verify `.env` file exists with valid API key

**Image upload fails**
- Check file size (max 10MB)
- Verify image format (JPEG, PNG, WebP only)
- Check uploads/ directory permissions

**Transformation fails**
- Verify OpenRouter API key is valid
- Check server logs in `logs/server.log`
- Ensure you have credits on OpenRouter
- For offline/local testing, use `MOCK_AI=true`

**No image returned from AI**
- Gemini sometimes returns text instead of images
- Check the API response in server logs
- May need to adjust the prompt or use a different model

## Support

For issues with:
- **OpenRouter API**: https://openrouter.ai/docs
- **Gemini Models**: https://ai.google.dev/docs

## License

MIT - Use freely for commercial and personal projects

---

Built with ❤️ for weight loss marketing campaigns
