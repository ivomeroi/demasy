#!/bin/bash

# 🚀 KinesioEMG Deployment Script
# This script helps you deploy your KinesioEMG application to the web

echo "🚀 KinesioEMG Deployment Helper"
echo "================================"
echo ""

# Check if we're in the right directory
if [ ! -f "index.html" ]; then
    echo "❌ Error: index.html not found. Make sure you're in the tesis directory."
    exit 1
fi

echo "✅ Found KinesioEMG application files"
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Menu
echo "Choose deployment method:"
echo "1) 🌟 GitHub Pages (recommended for permanent hosting)"
echo "2) ⚡ Netlify CLI (quick and easy)"  
echo "3) 🚀 Vercel CLI (fast and professional)"
echo "4) 🔥 Firebase Hosting (Google infrastructure)"
echo "5) 📦 Create deployment package for manual upload"
echo "6) 🧪 Test locally first"
echo ""
read -p "Enter your choice (1-6): " choice

case $choice in
    1)
        echo ""
        echo "🌟 GitHub Pages Deployment"
        echo "========================="
        echo ""
        
        if ! command_exists git; then
            echo "❌ Git is not installed. Please install git first."
            echo "📥 Download from: https://git-scm.com/"
            exit 1
        fi
        
        echo "Setting up Git repository..."
        
        # Initialize git if not already done
        if [ ! -d ".git" ]; then
            git init
            echo "✅ Git repository initialized"
        fi
        
        # Add all files
        git add .
        
        # Check if there are changes to commit
        if git diff --staged --quiet; then
            echo "ℹ️  No changes to commit. Repository is up to date."
        else
            git commit -m "Deploy KinesioEMG application - $(date)"
            echo "✅ Changes committed"
        fi
        
        echo ""
        echo "📋 Next steps:"
        echo "1. Create a repository on GitHub.com"
        echo "2. Copy this command and run it:"
        echo "   git remote add origin https://github.com/YOUR-USERNAME/kinesio-emg.git"
        echo "3. Then run:"
        echo "   git branch -M main"
        echo "   git push -u origin main"
        echo "4. Go to your repo → Settings → Pages → Deploy from main branch"
        echo ""
        echo "🌐 Your app will be available at:"
        echo "   https://YOUR-USERNAME.github.io/kinesio-emg/"
        ;;
        
    2)
        echo ""
        echo "⚡ Netlify CLI Deployment"
        echo "========================"
        echo ""
        
        if ! command_exists netlify; then
            echo "Installing Netlify CLI..."
            if command_exists npm; then
                npm install -g netlify-cli
            else
                echo "❌ npm is not installed. Please install Node.js first."
                echo "📥 Download from: https://nodejs.org/"
                exit 1
            fi
        fi
        
        echo "Deploying to Netlify..."
        netlify deploy --prod --dir .
        echo ""
        echo "✅ Deployed to Netlify!"
        echo "🌐 Check your deployment URL above"
        ;;
        
    3)
        echo ""
        echo "🚀 Vercel Deployment"
        echo "==================="
        echo ""
        
        if ! command_exists vercel; then
            echo "Installing Vercel CLI..."
            if command_exists npm; then
                npm install -g vercel
            else
                echo "❌ npm is not installed. Please install Node.js first."
                echo "📥 Download from: https://nodejs.org/"
                exit 1
            fi
        fi
        
        echo "Deploying to Vercel..."
        vercel --prod
        echo ""
        echo "✅ Deployed to Vercel!"
        echo "🌐 Check your deployment URL above"
        ;;
        
    4)
        echo ""
        echo "🔥 Firebase Hosting Deployment"
        echo "=============================="
        echo ""
        
        if ! command_exists firebase; then
            echo "Installing Firebase CLI..."
            if command_exists npm; then
                npm install -g firebase-tools
            else
                echo "❌ npm is not installed. Please install Node.js first."
                echo "📥 Download from: https://nodejs.org/"
                exit 1
            fi
        fi
        
        echo "Setting up Firebase..."
        firebase login
        firebase init hosting
        echo ""
        echo "Deploying to Firebase..."
        firebase deploy
        echo ""
        echo "✅ Deployed to Firebase!"
        ;;
        
    5)
        echo ""
        echo "📦 Creating Deployment Package"
        echo "=============================="
        echo ""
        
        # Create deployment directory
        DEPLOY_DIR="kinesio-emg-deploy-$(date +%Y%m%d-%H%M%S)"
        mkdir -p "$DEPLOY_DIR"
        
        # Copy all necessary files
        echo "Copying files..."
        cp *.html *.css *.js *.md "$DEPLOY_DIR/" 2>/dev/null
        
        # Copy directories if they exist
        [ -d "assets" ] && cp -r assets "$DEPLOY_DIR/"
        [ -d "docs" ] && cp -r docs "$DEPLOY_DIR/"
        
        # Create zip file
        if command_exists zip; then
            zip -r "${DEPLOY_DIR}.zip" "$DEPLOY_DIR"
            echo "✅ Created ${DEPLOY_DIR}.zip"
        else
            echo "✅ Created directory: $DEPLOY_DIR"
            echo "   (zip not available, manual compression needed)"
        fi
        
        echo ""
        echo "📋 Manual upload instructions:"
        echo "1. Upload the contents to your web server"
        echo "2. Or drag & drop the folder to:"
        echo "   • netlify.com (drag & drop)"
        echo "   • surge.sh"
        echo "   • Any static hosting service"
        ;;
        
    6)
        echo ""
        echo "🧪 Testing Locally"
        echo "=================="
        echo ""
        
        if command_exists python3; then
            echo "Starting Python server..."
            echo "🌐 Open your browser and go to: http://localhost:8000"
            echo "⏹️  Press Ctrl+C to stop the server"
            echo ""
            python3 -m http.server 8000
        elif command_exists python; then
            echo "Starting Python server..."
            echo "🌐 Open your browser and go to: http://localhost:8000"
            echo "⏹️  Press Ctrl+C to stop the server" 
            echo ""
            python -m http.server 8000
        elif command_exists npx; then
            echo "Starting Node.js server..."
            echo "🌐 Open your browser and go to: http://localhost:3000"
            echo "⏹️  Press Ctrl+C to stop the server"
            echo ""
            npx serve . -p 3000
        else
            echo "❌ No suitable server found."
            echo "Please install Python or Node.js to run a local server."
        fi
        ;;
        
    *)
        echo "❌ Invalid choice. Please run the script again."
        exit 1
        ;;
esac

echo ""
echo "🎉 Deployment process completed!"
echo ""
echo "📚 For detailed instructions, check: deploy-guide.md"
echo "🆘 Need help? Check the troubleshooting section in the guide"