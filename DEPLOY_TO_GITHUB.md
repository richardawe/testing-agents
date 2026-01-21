# Deploy to GitHub Pages - Step by Step

## Quick Deploy Instructions

### 1. Create GitHub Repository

```bash
# If you haven't already, create a new repository on GitHub
# Go to: https://github.com/new
# Name it: testing-agents (or your preferred name)
# Make it Public (for free GitHub Pages) or Private (requires token)
```

### 2. Initialize Git and Push

```bash
# Navigate to your project directory
cd /Users/3d7tech/testing-agents

# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: AI Agent Workflow with GitHub Pages support"

# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/testing-agents.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### 3. Set Up GitHub Secrets

1. Go to your repository on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add:
   - **Name**: `OPENROUTER_API_KEY`
   - **Value**: Your OpenRouter API key (starts with `sk-or-`)
5. Click **Add secret**

### 4. Enable GitHub Pages

1. Go to **Settings** → **Pages**
2. Under **Source**, select:
   - **Branch**: `main`
   - **Folder**: `/docs`
3. Click **Save**
4. Wait 1-2 minutes for GitHub Pages to build
5. Your site will be available at: `https://YOUR_USERNAME.github.io/testing-agents/`

### 5. Update Repository Name in HTML

Edit `docs/index.html` and update the repository name:

```html
<script>
    // Set your GitHub repository here
    window.GITHUB_REPO = 'YOUR_USERNAME/testing-agents';
</script>
```

Then commit and push:

```bash
git add docs/index.html
git commit -m "Update GitHub repository name"
git push
```

### 6. Test the Application

1. Visit your GitHub Pages URL
2. You'll be prompted for a GitHub Personal Access Token
3. Create a token at: https://github.com/settings/tokens/new
   - Select scope: `repo`
   - Copy the token (starts with `ghp_`)
4. Enter the token in the application
5. Submit a test task!

## Troubleshooting

### Workflow Not Triggering

- Check that your GitHub token has `repo` scope
- Verify the repository name in `docs/index.html` matches your GitHub repo
- Check the **Actions** tab in your repository for errors

### Results Not Appearing

- Check that the `results/` directory exists in your repository
- Verify the workflow completed successfully in the **Actions** tab
- Check that results files are being committed (they should appear in the repository)

### Rate Limit Errors

- GitHub API has limits: 60 requests/hour (unauthenticated), 5000/hour (authenticated)
- Increase `POLL_INTERVAL` in `docs/js/app.js` if needed
- Wait a bit and try again

## Next Steps

- Customize the UI in `docs/css/style.css`
- Add more features to the workflow
- Set up automatic cleanup of old results
- Add error notifications

## Files Structure

```
your-repo/
├── .github/
│   └── workflows/
│       └── workflow-executor.yml    ← GitHub Actions workflow
├── docs/                             ← GitHub Pages source
│   ├── index.html                   ← Main HTML file
│   ├── css/
│   │   └── style.css               ← Styles
│   └── js/
│       └── app.js                   ← Frontend JavaScript
├── results/                          ← Results storage
│   └── .gitkeep
├── github_workflow_runner.py         ← Workflow execution script
└── [your Python files]
```

## Important Notes

- **Public Repos**: Results will be public. Anyone can see them.
- **Private Repos**: Users need a GitHub token with `repo` scope.
- **API Keys**: Never commit `.env` files or API keys to the repository.
- **Results**: Consider adding results cleanup to avoid repository bloat.
