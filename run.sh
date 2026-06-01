#!/bin/bash
# KinesioEMG Development Server Launcher

echo "🏥 Starting KinesioEMG Development Server..."
echo "📡 Server will run on http://localhost:8000"
echo "🛑 Press Ctrl+C to stop the server"
echo ""

# Check if Python 3 is available
if command -v python3 &> /dev/null; then
    echo "🐍 Using Python 3..."
    python3 -m http.server 8000
elif command -v python &> /dev/null; then
    echo "🐍 Using Python..."
    python -m http.server 8000
else
    echo "❌ Python not found. Please install Python 3."
    echo "💡 Alternative: npm install -g serve && serve ."
    exit 1
fi