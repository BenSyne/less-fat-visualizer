#!/bin/bash

echo "🚀 Starting GLP-1 Weight Loss Visualization Server..."
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# If running in mock mode, .env is optional
if [ "${MOCK_AI}" != "true" ] && [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found!"
    echo "Create a .env with OPENROUTER_API_KEY or run in mock mode:"
    echo "  MOCK_AI=true ./start.sh"
    exit 1
fi

# Start the server
PORT=${PORT:-3000}
HOST=${HOST:-127.0.0.1}
echo "✅ Starting server on http://${HOST}:${PORT}..."
echo "📱 Open http://${HOST}:${PORT}/index.html in your browser"
echo ""
HOST=${HOST} PORT=${PORT} npm start
