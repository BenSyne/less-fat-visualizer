# Product Requirements Document (PRD)
## GLP-1 Weight Loss Visualization Landing Page

### Overview
A simple, single-page landing page for ad campaigns that shows users what they'd look like 20 pounds lighter using AI transformation.

### Purpose
- **Target**: Users clicking on GLP-1 weight loss ads
- **Goal**: Visualize weight loss results to increase conversion
- **Use Case**: Quick visualization tool requiring no signup

### Key Features

#### 1. Photo Upload
- Drag & drop interface
- Click to browse files
- Supports JPEG, PNG, WebP
- Maximum 10MB file size
- Real-time preview in circular frame

#### 2. AI Transformation
- Uses Gemini Flash AI via OpenRouter
- Shows face approximately 20 pounds lighter
- Processing time: ~60 seconds
- Real-time progress indicators
- Status updates during processing

#### 3. Results Display
- Side-by-side before/after comparison
- Circular image frames for aesthetic appeal
- "Today" vs "Your Future You" labels
- Download button for result image
- Try another photo option

#### 4. User Experience
- Mobile-responsive design
- Clean, modern UI with Tailwind CSS
- Smooth transitions and animations
- Progress bar with time estimates
- Error handling with friendly messages

### Technical Requirements

#### Frontend
- Pure HTML/CSS/JavaScript (no frameworks)
- Tailwind CSS via CDN
- Vanilla JS for API interactions
- Works on all modern browsers
- Mobile-first responsive design

#### Backend
- Node.js + Express server
- Multer for file uploads
- OpenRouter API integration
- File-based storage (uploads & results)
- Logging system

#### API Integration
- OpenRouter API for Gemini Flash access
- Image-to-image transformation
- Async job processing
- Status polling mechanism

### Non-Functional Requirements

#### Performance
- Page load: < 2 seconds
- Image upload: < 5 seconds
- AI processing: ~60 seconds
- Supports up to 10MB images

#### Scalability
- Handles 100+ concurrent users (with proper hosting)
- Async job processing to prevent blocking
- File cleanup for disk space management

#### Security
- File type validation
- File size limits
- No persistent user data storage
- Secure API key management
- CORS configuration

#### Deployment
- Easy to deploy anywhere (Vercel, Railway, Render, VPS)
- Minimal dependencies
- Environment-based configuration
- Single-file backend for simplicity

### User Flow

1. **Landing** ’ User sees upload area with clear CTA
2. **Upload** ’ Drag/drop or click to upload photo
3. **Preview** ’ See uploaded photo, click "Transform"
4. **Processing** ’ Watch progress bar with status updates
5. **Results** ’ View before/after comparison
6. **Action** ’ Download result or try another photo

### Success Metrics
- Upload completion rate
- Transformation success rate
- Average processing time
- Download/conversion rate
- User retention (try again)

### Future Enhancements (Not in MVP)
- User authentication
- Save transformations to account
- Multiple transformation options (10, 30, 50 lbs)
- Email results
- Social sharing
- A/B testing different prompts
- Cloud storage integration (S3/Cloudinary)

### Constraints & Assumptions
- Users have modern browsers with JavaScript enabled
- OpenRouter API is available and functional
- Gemini Flash model produces acceptable quality transformations
- Users understand this is a visualization, not medical advice
- One transformation per session (no user accounts)

### Legal/Compliance
- Disclaimer about AI visualization vs medical advice
- No medical claims or guarantees
- Privacy-focused: no long-term storage
- GDPR/CCPA compliant (no personal data retention)

### Cost Considerations
- OpenRouter API: ~$0.001-0.005 per transformation
- Hosting: Free tiers available, $5-20/month for production
- No database costs (file-based storage)
- Total: < $1 per 1000 transformations

### Dependencies
- Node.js 18+
- OpenRouter API account
- Hosting platform (any Node.js host)
- Domain name (optional)

### Risk Mitigation
- **AI quality**: Test with diverse photos, adjust prompts
- **API downtime**: Implement retry logic and fallbacks
- **Storage overflow**: Implement automatic file cleanup
- **Abuse**: Add rate limiting in production
- **Privacy**: Auto-delete files after 24 hours

---

**Status**:  Implemented & Deployed
**Version**: 1.0.0
**Last Updated**: 2025-10-14
