# GitHub Pages Setup Guide

## Quick Start

This guide will help you deploy the AI Agent Workflow System to GitHub Pages using GitHub Actions.

## Prerequisites

1. A GitHub repository
2. OpenRouter API key
3. GitHub Personal Access Token (for private repos or to trigger workflows)

## Step-by-Step Setup

### 1. Prepare Repository Structure

```
your-repo/
├── .github/
│   └── workflows/
│       └── workflow-executor.yml
├── docs/                          # GitHub Pages source
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── app.js                 # Use github-pages-app.js
├── results/                       # Results storage
│   └── .gitkeep
└── [all your Python files]
```

### 2. Set Up GitHub Secrets

1. Go to your repository → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add:
   - **Name**: `OPENROUTER_API_KEY`
   - **Value**: Your OpenRouter API key (starts with `sk-or-`)

### 3. Configure GitHub Pages

1. Go to **Settings** → **Pages**
2. **Source**: Select `Deploy from a branch`
3. **Branch**: Select `main` (or your default branch)
4. **Folder**: Select `/docs`
5. Click **Save**

### 4. Update Frontend Configuration

In `docs/index.html`, add:

```html
<script>
    // Set your repository
    window.GITHUB_REPO = 'your-username/your-repo';
</script>
<script src="js/github-pages-app.js"></script>
```

### 5. Copy Files to `docs/` Directory

```bash
# Create docs directory structure
mkdir -p docs/css docs/js

# Copy frontend files
cp templates/index.html docs/
cp static/css/style.css docs/css/
cp docs/js/github-pages-app.js docs/js/app.js  # Use the GitHub Pages version
```

### 6. Update `docs/index.html`

Make sure it references the correct paths:

```html
<link rel="stylesheet" href="css/style.css">
<script src="js/app.js"></script>
```

### 7. Test Locally (Optional)

You can test the GitHub Pages version locally:

```bash
cd docs
python -m http.server 8000
# Or use any static file server
```

### 8. Commit and Push

```bash
git add .
git commit -m "Set up GitHub Pages deployment"
git push
```

### 9. Verify Deployment

1. Wait a few minutes for GitHub Pages to build
2. Visit: `https://your-username.github.io/your-repo/`
3. You should see the application

## Authentication Setup

### For Public Repositories

If your repository is public, you can use it without authentication, but:
- Results will be public
- You'll need to use `workflow_dispatch` manually or set up a GitHub App

### For Private Repositories

Users need to provide a GitHub Personal Access Token:

1. Go to https://github.com/settings/tokens
2. Click **Generate new token (classic)**
3. Select scope: `repo`
4. Copy the token
5. Enter it in the application when prompted

## Troubleshooting

### Workflow Not Triggering

- Check that `repository_dispatch` is enabled
- Verify GitHub token has `repo` scope
- Check Actions tab for errors

### Results Not Appearing

- Check that results directory exists
- Verify workflow completed successfully
- Check file paths match in frontend
- Ensure results are committed to repository

### Rate Limit Errors

- GitHub API has rate limits (60/hour unauthenticated, 5000/hour authenticated)
- Increase polling interval in `github-pages-app.js`
- Implement exponential backoff

### CORS Issues

- GitHub's raw.githubusercontent.com should work
- If issues persist, use a CORS proxy or GitHub API directly

## Alternative: Manual Trigger

If `repository_dispatch` doesn't work, you can trigger manually:

1. Go to **Actions** tab
2. Select **Execute AI Workflow**
3. Click **Run workflow**
4. Enter task and request_id
5. Click **Run workflow**

Then poll for results using the request_id.

## Monitoring

- Check **Actions** tab for workflow runs
- Check `results/` directory for output files
- Monitor GitHub API rate limits in response headers

## Security Considerations

1. **API Keys**: Store in GitHub Secrets, never commit
2. **Tokens**: Users store locally in browser (localStorage)
3. **Results**: Public if using public repo
4. **Rate Limits**: Implement proper error handling

## Next Steps

- Add result cleanup (delete old results)
- Implement better error handling
- Add progress indicators
- Set up notifications
- Add result caching
