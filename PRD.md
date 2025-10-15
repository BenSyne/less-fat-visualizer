# Product Requirements Document (PRD)
## GLP-1 Weight Loss Visualization Landing Page

### Overview
A simple, single‑page landing page that shows users what they'd look like ~20 pounds lighter using an AI transformation.

### Purpose
- Target: Users clicking on GLP‑1 weight loss ads
- Goal: Visualize weight‑loss results to improve conversion
- Use Case: Quick visualization tool requiring no signup

### Key Features

#### 1) Photo Upload
- Drag & drop and click‑to‑browse
- Formats: JPEG, PNG, WebP
- Max size: 10MB
- Real‑time preview in a circular frame

#### 2) AI Transformation
- Uses Google Gemini via OpenRouter
- Prompted to show the face ~20 lbs lighter
- Typical processing: ~60 seconds
- Real‑time progress indicators and status updates

#### 3) Results Display
- Side‑by‑side before/after comparison
- Circular frames, “Today” vs “Your Future You” labels
- Download button for result
- Try another photo

#### 4) User Experience
- Mobile‑responsive, vanilla JS + Tailwind CSS (CDN)
- Smooth transitions
- Progress bar with time estimate
- Friendly error states

### Technical Requirements

#### Frontend
- Pure HTML/CSS/JS (no frameworks)
- Tailwind via CDN
- Vanilla JS for API calls
- Works in all modern browsers
- Mobile‑first responsive design

#### Backend
- Node.js + Express
- Multer for file uploads
- OpenRouter API integration (Gemini models)
- Local file storage for uploads/results
- Basic logging to `logs/server.log`

#### API Integration (OpenRouter)
- Provider base URL: `https://openrouter.ai/api/v1`
- Recommended model: `google/gemini-2.5-flash-image-preview`
  - Alternatives: `google/gemini-2.5-flash`, `google/gemini-2.5-pro`, `google/gemini-flash-1.5`
  - Do NOT use: `google/gemini-flash-1.5-8b` (invalid on OpenRouter; returns 404)
- Preferred endpoint: `POST /v1/responses` (with structured input)
  - Request body (conceptual):
    - `model`: model name (see above)
    - `input`: array with one user message containing:
      - `{ type: "input_text", text: <prompt> }`
      - `{ type: "input_image", image_url: <data URL of uploaded image> }`
    - `max_output_tokens`, `temperature` as needed
- Fallback endpoint: `POST /v1/chat/completions`
  - With `messages: [{ role: 'user', content: [ { type: 'text', text: <prompt> }, { type: 'image_url', image_url: { url: <data URL> } } ] }]`
- Expected output: an image URL or a `data:image/...;base64,...` string
  - If a data URL is returned, the server saves it into `results/` and serves it at `/results/...`
- Server behavior:
  - Creates an async job per request and exposes `GET /api/job-status/:jobId`
  - Tries a safe model list in order if the preferred model is unavailable
  - Treats “No endpoints found” (404) as model invalid and retries with the next model

#### Environment & Runtime
- `OPENROUTER_API_KEY` — required for real AI mode
- `OPENROUTER_MODEL` — optional override; default is `google/gemini-2.5-flash-image-preview`
- `HOST` — bind address (default: `127.0.0.1`)
- `PORT` — port (default: `3000`)
- `MOCK_AI` — set `true` to simulate AI locally (no network)

#### Verification Endpoints
- `GET /api/health` → `{ status: "ok" }`
- `GET /api/config` → `{ model, mock, host, port }` (helps confirm model selection and mode)

### Non‑Functional Requirements

#### Performance
- Page load: < 2s
- Image upload: < 5s
- AI processing: ~60s
- Supports images up to 10MB

#### Scalability
- Handles 100+ concurrent users (with appropriate hosting)
- Async job processing avoids blocking
- Periodic file cleanup for storage longevity

#### Security
- Validate MIME and file size
- Temporary local storage only; no long‑term retention
- Keep API keys in environment (never commit `.env`)
- CORS configured appropriately for production domains

#### Deployment
- Works on Railway, Render, Vercel, VPS
- Minimal dependencies
- Single‑file backend for simplicity
- Environment‑based configuration

### User Flow
1) Landing → see upload CTA
2) Upload → drag/drop or browse
3) Preview → click “Transform”
4) Processing → progress/status updates
5) Results → before/after comparison
6) Action → download result or try again

### Success Metrics
- Upload completion rate
- Transformation success rate
- Avg processing time
- Download/conversion rate
- Retention (try‑again rate)

### Future Enhancements (Not in MVP)
- Auth + saved transformations
- Multiple options (10/30/50 lbs)
- Email results
- Social sharing
- A/B test prompts
- Cloud storage (S3/Cloudinary)

### Constraints & Assumptions
- Modern browsers with JavaScript enabled
- OpenRouter available and functional
- Gemini model output is of acceptable quality
- One transformation per session (no accounts)

### Legal/Compliance
- AI visualization is not medical advice
- No medical claims or guarantees
- Privacy‑forward: auto‑delete files; no persistent PII
- GDPR/CCPA aligned (no personal data retention)

### Cost Considerations
- OpenRouter API: ~$0.001–0.005 per transformation
- Hosting: $0–$20/month depending on platform and scale
- No DB cost in MVP (file‑based)

### Dependencies
- Node.js 18+
- OpenRouter account + API key
- Hosting platform (any Node.js host)
- Domain (optional)

### Risk Mitigation
- AI quality: test with varied inputs; refine prompts
- API downtime: retry + model fallback
- Storage overflow: scheduled cleanup tasks
- Abuse: add rate limiting in production
- Privacy: auto‑delete files within 24h

---

Status: Implemented
Version: 1.0.1
Last Updated: 2025‑10‑14

