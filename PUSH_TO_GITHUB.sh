#!/bin/bash
# Script to push AI Agent Workflow to GitHub

echo "🚀 Preparing to push to GitHub..."
echo ""

# Check if git is initialized
if [ ! -d .git ]; then
    echo "📦 Initializing git repository..."
    git init
fi

# Check if remote exists
if ! git remote | grep -q origin; then
    echo "⚠️  No remote 'origin' found."
    echo "Please add your GitHub repository as remote:"
    echo "  git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git"
    echo ""
    read -p "Do you want to add it now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Enter your GitHub username: " username
        read -p "Enter your repository name: " repo
        git remote add origin "https://github.com/${username}/${repo}.git"
        echo "✅ Remote added!"
    else
        echo "❌ Please add remote manually and run this script again."
        exit 1
    fi
fi

# Add all files
echo "📝 Adding files..."
git add .

# Check if there are changes
if git diff --staged --quiet; then
    echo "✅ No changes to commit."
else
    echo "💾 Committing changes..."
    git commit -m "Setup GitHub Pages deployment with GitHub Actions"
fi

# Push to GitHub
echo "⬆️  Pushing to GitHub..."
git branch -M main
git push -u origin main

echo ""
echo "✅ Done! Next steps:"
echo "1. Go to your repository on GitHub"
echo "2. Settings → Secrets → Actions → Add OPENROUTER_API_KEY"
echo "3. Settings → Pages → Source: /docs → Save"
echo "4. Update docs/index.html with your repository name"
echo "5. Visit: https://YOUR_USERNAME.github.io/YOUR_REPO/"
echo ""
echo "See DEPLOY_TO_GITHUB.md for detailed instructions."
