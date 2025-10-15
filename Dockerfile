FROM node:20-alpine AS base
WORKDIR /app

# Copy only package files first for better layer caching
COPY package*.json ./

# Install production deps
# Prefer lockfile build; fall back to install if lockfile is absent
RUN npm ci --omit=dev || npm install --omit=dev

# Copy app source
COPY . .

# Environment
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000

# Expose the HTTP port
EXPOSE 3000

# Healthcheck hits the health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null 2>&1 || exit 1

# Start the server
CMD ["node","server.js"]
