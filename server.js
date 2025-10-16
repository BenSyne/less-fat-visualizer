const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
require('dotenv').config();

// Optional mock mode to avoid external API calls during local testing
const USE_MOCK = [
  process.env.MOCK_AI,
  process.env.USE_MOCK,
  process.env.MOCK
].some(v => typeof v === 'string' && /^(1|true|yes)$/i.test(v));

const app = express();
const PORT = process.env.PORT || 3000;
const RAW_OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash-image-preview';
const OPENROUTER_MODEL = /gemini-flash-1.5-8b/i.test(RAW_OPENROUTER_MODEL)
  ? 'google/gemini-2.5-flash-image-preview'
  : RAW_OPENROUTER_MODEL;
const HOST = process.env.HOST || '127.0.0.1';
const ALLOW_FALLBACK = [process.env.ALLOW_FALLBACK_ORIGINAL].some(
  v => typeof v === 'string' && /^(1|true|yes)$/i.test(v)
);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files from current directory

// Storage configuration: keep images in memory only (no disk writes)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  }
});

// In-memory job storage (use Redis/DB for production)
const jobs = new Map();
const images = new Map();
const cleanupTimers = new Map();
const JOB_TTL_MS = parseInt(process.env.JOB_TTL_MS || '600000', 10); // default 10 minutes

// Ensure directories exist
async function ensureDirectories() {
  // Only logs directory is required now
  const dirs = ['logs'];
  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (err) {
      console.error(`Error creating ${dir}:`, err);
    }
  }
}

// Generate unique ID
function generateId() {
  return crypto.randomBytes(16).toString('hex');
}

// Log to file
async function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - ${message}\n`;
  console.log(logMessage.trim());
  try {
    await fs.appendFile('logs/server.log', logMessage);
  } catch (err) {
    console.error('Failed to write log:', err);
  }
}

// API Routes

// Upload photo
app.post('/api/upload-photo', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No photo uploaded' });
    }

    const imageId = generateId();
    // Build a data URL from the in-memory buffer
    const buffer = req.file.buffer;
    const base64Image = buffer.toString('base64');
    const dataUrl = `data:${req.file.mimetype};base64,${base64Image}`;

    // Store image metadata
    images.set(imageId, {
      id: imageId,
      buffer,
      dataUrl,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      uploadedAt: new Date()
    });

    await log(`Photo uploaded: ${imageId} (${req.file.originalname})`);

    res.json({
      success: true,
      imageId: imageId,
      message: 'Photo uploaded successfully'
    });
  } catch (error) {
    await log(`Upload error: ${error.message}`);
    res.status(500).json({ error: 'Upload failed', details: error.message });
  }
});

// Start transformation
app.post('/api/transform', async (req, res) => {
  try {
    const { imageId, transformationType, amount } = req.body;

    if (!imageId || !images.has(imageId)) {
      return res.status(400).json({ error: 'Invalid image ID' });
    }

    const jobId = generateId();
    const image = images.get(imageId);

    // Create job
    jobs.set(jobId, {
      id: jobId,
      imageId: imageId,
      status: 'processing',
      transformationType: transformationType || 'weight-loss',
      amount: amount || 20,
      createdAt: new Date(),
      // Use a data URL instead of a file path
      originalUrl: image.dataUrl,
      resultUrl: null,
      error: null
    });

    await log(`Transformation started: Job ${jobId} for image ${imageId}`);

    // Start async processing
    processTransformation(jobId, image);

    res.json({
      success: true,
      jobId: jobId,
      message: 'Transformation started'
    });
  } catch (error) {
    await log(`Transform error: ${error.message}`);
    res.status(500).json({ error: 'Failed to start transformation', details: error.message });
  }
});

// Get job status
app.get('/api/job-status/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = jobs.get(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({
      jobId: job.id,
      status: job.status,
      originalUrl: job.originalUrl,
      resultUrl: job.resultUrl,
      error: job.error,
      progress: job.progress || 0
    });
  } catch (error) {
    await log(`Status check error: ${error.message}`);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// Process transformation with AI
async function processTransformation(jobId, image) {
  const job = jobs.get(jobId);

  try {
    await log(`Processing transformation for job ${jobId}`);

    // Read image as base64
    const imageBuffer = image.buffer;
    const base64Image = imageBuffer.toString('base64');
    const mimeType = image.mimetype;
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    // Update progress
    job.progress = 30;
    jobs.set(jobId, job);

    // If running in mock mode, simulate processing without calling external APIs
    if (USE_MOCK) {
      await log(`MOCK mode enabled; simulating AI transformation for job ${jobId}`);
      // Simulate staged progress
      await new Promise(r => setTimeout(r, 600));
      job.progress = 60;
      jobs.set(jobId, job);
      await new Promise(r => setTimeout(r, 600));

      // For mock: return the original image as the result (data URL)
      job.resultUrl = dataUrl;
      await log(`MOCK: Returning simulated result as data URL for job ${jobId}`);

      job.status = 'completed';
      job.progress = 100;
      job.completedAt = new Date();
      jobs.set(jobId, job);
      await log(`MOCK transformation completed for job ${jobId}`);
      scheduleCleanup(jobId, job.imageId);
      return;
    }

    // Call OpenRouter API (Gemini for image preview/edit)
    const prompt = `You are an expert AI photo retoucher.

Goal: Produce a dynamic, photorealistic body‑slimming transformation of the primary person in the photo so they look much thinner and fitter — while the photo remains the same in every other way.

Composition lock (non‑negotiable):
- Do NOT change crop, zoom, perspective, subject position/scale, or canvas size.
- Keep the same background, lighting, clothing style/color/logos, and pose. No outpainting, no recentering.

Dynamic adaptation — analyze the input and apply slimming to what is actually visible:
- If face/headshot: reduce cheek fullness, jowls, under‑chin (remove or nearly remove double chin); create a crisp jawline; slim the neck; slightly narrow mid‑face width while keeping bone structure natural.
- If upper‑body: also reduce chest/upper‑torso circumference, gently flatten abdomen under clothing, slim upper arms; maintain garment folds, seams, textures, and fit.
- If full‑body: also slim waist/hips/thighs/calves and arms, keeping limb proportions and stance intact; preserve natural shadows/reflections and perspective.
- If seated/cropped/unusual angle: apply consistent slimming with perspective; never move body parts or change pose.
- If multiple people: transform only the main subject (largest/central face), leave others untouched.

Fitness cues (subtle, realistic):
- Slight contour definition along jawline/collarbones/shoulder & arm outlines; no exaggerated muscles, no makeup/beautification, no skin smoothing.

Identity & detail preservation:
- Hair and facial hair shape/line/density unchanged (do not trim or blur).
- Eyes, nose, mouth proportions unchanged; keep natural skin texture and existing lighting/shadows.
- Clothing, background, pose, crop, and zoom must be identical to the original.

Output: return only the transformed image (no text, borders, watermarks, or collage).`;

    await log(`Calling OpenRouter API for job ${jobId} with model ${OPENROUTER_MODEL}`);

    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY is not set. Set it in .env or use MOCK_AI=true for local testing.');
    }

    // Prefer the Responses API; fall back to chat/completions if needed.
    // Also try multiple model names if the first one is unsupported.
    const commonHeaders = {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'HTTP-Referer': 'https://less-fat.app',
      'X-Title': 'GLP-1 Weight Loss Visualizer',
      'User-Agent': 'less-fat-app/1.0 (+https://less-fat.app)'
    };

    const sanitize = (m) => (m && m.trim()) || '';
    const envModel = sanitize(process.env.OPENROUTER_MODEL || '');
    const candidateModels = [
      sanitize(OPENROUTER_MODEL),
      sanitize(envModel),
      'google/gemini-2.5-flash-image-preview',
      'google/gemini-2.5-flash',
      'google/gemini-2.5-pro',
      'google/gemini-flash-1.5'
    ]
      .filter(Boolean)
      .filter((m, idx, arr) => arr.indexOf(m) === idx)
      .filter(m => !/gemini-flash-1.5-8b/i.test(m)); // explicitly drop invalid model

    let data = null;
    let lastErrorText = '';
    let usedModel = null;

    for (const modelName of candidateModels) {
      await log(`Trying model: ${modelName}`);
      try {
        const responsesBody = {
          model: modelName,
          input: [
            {
              role: 'user',
              content: [
                { type: 'input_text', text: prompt },
                { type: 'input_image', image_url: dataUrl }
              ]
            }
          ],
          max_output_tokens: 2000,
          temperature: 0.7
        };

        let response = await fetch('https://openrouter.ai/api/v1/responses', {
          method: 'POST',
          headers: commonHeaders,
          body: JSON.stringify(responsesBody)
        });

        const ct1 = response.headers.get('content-type') || '';
        if (!response.ok || !/application\/json/i.test(ct1)) {
          const txt = await response.text().catch(() => '');
          lastErrorText = `status=${response.status} ct=${ct1} body=${txt.slice(0,200)}`;
          await log(`Responses API non-JSON or error for ${modelName}: ${lastErrorText}`);
          const isNotFound = response.status === 404 || /No endpoints found/i.test(txt);
          if (!isNotFound) {
            // Try chat/completions before abandoning
            const chatBody = {
              model: modelName,
              messages: [
                { role: 'user', content: [ { type: 'text', text: prompt }, { type: 'image_url', image_url: { url: dataUrl } } ] }
              ],
              max_tokens: 2000,
              temperature: 0.7
            };
            response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
              method: 'POST', headers: commonHeaders, body: JSON.stringify(chatBody)
            });
            const ct2 = response.headers.get('content-type') || '';
            if (!response.ok || !/application\/json/i.test(ct2)) {
              const txt2 = await response.text().catch(() => '');
              lastErrorText = `status=${response.status} ct=${ct2} body=${txt2.slice(0,200)}`;
              await log(`Chat API non-JSON or error for ${modelName}: ${lastErrorText}`);
              const chatNotFound = response.status === 404 || /No endpoints found/i.test(txt2);
              if (chatNotFound) continue; // try next model
              // Any other error: try next model as well
              continue;
            }
          } else {
            // If it's a model-not-found, try next model
            continue;
          }
        }

        data = await response.json();
        usedModel = modelName;
        await log(`OpenRouter API response received for job ${jobId} using model ${modelName}`);
        break; // success
      } catch (e) {
        lastErrorText = e.message || String(e);
        await log(`Model ${modelName} failed with error: ${lastErrorText}`);
        continue; // try next model
      }
    }

    if (!data) {
      throw new Error(`OpenRouter API error: ${lastErrorText || 'All model attempts failed'}`);
    }

    // Update progress
    job.progress = 70;
    jobs.set(jobId, job);

    // Extract image result from Responses or Chat payloads
    let resultImageUrl = null;

    function trySaveBase64(dataUrlString) {
      const m = dataUrlString && dataUrlString.match(/^data:image\/[^;]+;base64,(.+)$/);
      return (async () => {
        if (!m) return null;
        const b64 = m[1];
        const buf = Buffer.from(b64, 'base64');
        const resultPath = `results/${jobId}.png`;
        await fs.writeFile(resultPath, buf);
        await log(`Saved result image to ${resultPath}`);
        return `/${resultPath}`;
      })();
    }

    function extractFromMessageContent(msgContent) {
      if (!msgContent) return null;
      // If string: scan for URL or data URL
      if (typeof msgContent === 'string') {
        const urlMatch = msgContent.match(/https?:\/\/[^\s]+\.(jpg|jpeg|png|webp)/i);
        if (urlMatch) return urlMatch[0];
        const dataUrlMatch = msgContent.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/);
        if (dataUrlMatch) return dataUrlMatch[0];
        return null;
      }
      // If array: look for image-bearing parts
      if (Array.isArray(msgContent)) {
        for (const part of msgContent) {
          if (!part) continue;
          // Common shapes: { type: 'output_image', image_url: '...' } or { type: 'image_url', image_url: { url } }
          if (part.image_url && typeof part.image_url === 'string') return part.image_url;
          if (part.image_url && part.image_url.url) return part.image_url.url;
          if (part.url && typeof part.url === 'string') return part.url;
          if (part.type && typeof part.type === 'string') {
            if (part.type.includes('image') && typeof part.text === 'string') {
              const m = part.text.match(/https?:\/\/[^\s]+\.(jpg|jpeg|png|webp)/i);
              if (m) return m[0];
            }
          }
          if (typeof part.text === 'string') {
            const urlMatch = part.text.match(/https?:\/\/[^\s]+\.(jpg|jpeg|png|webp)/i);
            if (urlMatch) return urlMatch[0];
            const dataUrlMatch = part.text.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/);
            if (dataUrlMatch) return dataUrlMatch[0];
          }
        }
      }
      return null;
    }

    // Generic deep extractor to handle multiple provider shapes
    function toDataUrlFromBase64(b64, mime) {
      const mt = (mime && /^image\//.test(mime)) ? mime : 'image/png';
      return `data:${mt};base64,${b64}`;
    }

    function deepFindImage(node, depth = 0) {
      if (!node || depth > 6) return null;
      if (typeof node === 'string') {
        const dataUrlMatch = node.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/);
        if (dataUrlMatch) return { kind: 'dataUrl', value: dataUrlMatch[0] };
        const urlMatch = node.match(/https?:\/\/[^\s]+\.(png|jpg|jpeg|webp|gif)/i);
        if (urlMatch) return { kind: 'url', value: urlMatch[0] };
        if (node.startsWith('{') || node.startsWith('[')) {
          try { return deepFindImage(JSON.parse(node), depth + 1); } catch {}
        }
        return null;
      }
      if (Array.isArray(node)) {
        for (const item of node) {
          const found = deepFindImage(item, depth + 1);
          if (found) return found;
        }
        return null;
      }
      if (typeof node === 'object') {
        if (typeof node.image_url === 'string') return { kind: 'url', value: node.image_url };
        if (node.image_url && typeof node.image_url.url === 'string') return { kind: 'url', value: node.image_url.url };
        if (typeof node.url === 'string' && /https?:\/\//i.test(node.url)) {
          const m = node.url.match(/\.(png|jpg|jpeg|webp|gif)(\?|$)/i);
          if (m) return { kind: 'url', value: node.url };
        }
        if (typeof node.image_base64 === 'string') return { kind: 'dataUrl', value: toDataUrlFromBase64(node.image_base64, node.mime_type || node.mimetype) };
        if (typeof node.b64_json === 'string') return { kind: 'dataUrl', value: toDataUrlFromBase64(node.b64_json, node.mime_type || node.mimetype) };
        if (node.inline_data && typeof node.inline_data.data === 'string') {
          return { kind: 'dataUrl', value: toDataUrlFromBase64(node.inline_data.data, node.inline_data.mime_type) };
        }
        for (const k of Object.keys(node)) {
          const found = deepFindImage(node[k], depth + 1);
          if (found) return found;
        }
      }
      return null;
    }

    // Try typical locations
    if (data && data.choices && data.choices[0] && data.choices[0].message) {
      const content = data.choices[0].message.content;
      resultImageUrl = extractFromMessageContent(content);
      if (!resultImageUrl) {
        const found = deepFindImage(content);
        if (found) resultImageUrl = found.value;
      }
    }
    // Alternative shape: data.output[0].content
    if (!resultImageUrl && data && Array.isArray(data.output) && data.output[0] && Array.isArray(data.output[0].content)) {
      resultImageUrl = extractFromMessageContent(data.output[0].content);
      if (!resultImageUrl) {
        const found = deepFindImage(data.output[0].content);
        if (found) resultImageUrl = found.value;
      }
    }
    // As a last resort, perform a deep scan over the whole payload
    if (!resultImageUrl) {
      const found = deepFindImage(data);
      if (found) resultImageUrl = found.value;
    }

    // Convert result to data URL if necessary (no disk storage)
    if (resultImageUrl && resultImageUrl.startsWith('data:image/')) {
      job.resultUrl = resultImageUrl; // already a data URL
    } else if (resultImageUrl && /^https?:\/\//i.test(resultImageUrl)) {
      try {
        const r = await fetch(resultImageUrl);
        if (!r.ok) throw new Error(`Failed to fetch image URL: ${r.status}`);
        const ct = (r.headers.get('content-type') || 'image/png').split(';')[0];
        const ab = await r.arrayBuffer();
        const buf = Buffer.from(ab);
        job.resultUrl = `data:${ct};base64,${buf.toString('base64')}`;
        await log(`Fetched remote result and converted to data URL for job ${jobId}`);
      } catch (e) {
        await log(`Failed to fetch remote result for job ${jobId}: ${e.message}`);
        job.resultUrl = job.originalUrl; // fallback to original
      }
    }

    // If no image was generated, use a fallback approach
    if (!job.resultUrl) {
      await log(`No image generated by API for job ${jobId}, using fallback`);
      if (ALLOW_FALLBACK) {
        job.resultUrl = job.originalUrl; // optional fallback
      } else {
        throw new Error('No image generated by AI');
      }
    }

    // Update job as completed
    job.status = 'completed';
    job.progress = 100;
    job.completedAt = new Date();
    jobs.set(jobId, job);

    await log(`Transformation completed for job ${jobId}`);
    scheduleCleanup(jobId, job.imageId);
  } catch (error) {
    await log(`Transformation failed for job ${jobId}: ${error.message}`);
    job.status = 'failed';
    job.error = error.message;
    jobs.set(jobId, job);
  }
}

// Do not serve uploads/results — no on-disk storage

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Config check
app.get('/api/config', (req, res) => {
  res.json({
    model: OPENROUTER_MODEL,
    mock: !!USE_MOCK,
    host: HOST,
    port: PORT,
    storage: 'memory',
    ttl_ms: JOB_TTL_MS
  });
});

// Client-requested cleanup to ensure no server-side retention
app.delete('/api/job/:jobId', async (req, res) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);
  if (job) {
    jobs.delete(jobId);
    images.delete(job.imageId);
    const t = cleanupTimers.get(jobId);
    if (t) clearTimeout(t);
    cleanupTimers.delete(jobId);
    await log(`Explicit cleanup for job ${jobId} and image ${job?.imageId}`);
  }
  res.status(204).end();
});

// Start server
async function start() {
  await ensureDirectories();
  app.listen(PORT, HOST, () => {
    const hostForLog = HOST === '0.0.0.0' ? 'localhost' : HOST;
    console.log(`\n🚀 Server running on http://${hostForLog}:${PORT}`);
    console.log(`📸 Landing page: http://${hostForLog}:${PORT}/index.html`);
    console.log(`🔧 API endpoint: http://${hostForLog}:${PORT}/api`);
    console.log(`📝 Logs: ./logs/server.log\n`);
    if (/gemini-flash-1.5-8b/i.test(RAW_OPENROUTER_MODEL)) {
      log(`Invalid OPENROUTER_MODEL '${RAW_OPENROUTER_MODEL}' overridden to '${OPENROUTER_MODEL}'`);
    }
    log(`Server started (MOCK_AI=${USE_MOCK ? 'true' : 'false'}, OPENROUTER_MODEL=${OPENROUTER_MODEL})`);
  });
}

start();

function scheduleCleanup(jobId, imageId) {
  if (cleanupTimers.has(jobId)) return; // already scheduled
  const timer = setTimeout(async () => {
    jobs.delete(jobId);
    images.delete(imageId);
    cleanupTimers.delete(jobId);
    await log(`Cleaned up job ${jobId} and image ${imageId} (TTL ${JOB_TTL_MS}ms)`);
  }, JOB_TTL_MS);
  cleanupTimers.set(jobId, timer);
}
