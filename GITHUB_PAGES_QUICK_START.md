# GitHub Pages Quick Start

## TL;DR

**Goal**: Run AI workflow on GitHub Pages using GitHub Actions as backend.

**Solution**: Frontend triggers GitHub Actions → Actions runs Python → Results saved to repo → Frontend polls for results.

## 5-Minute Setup

### 1. Add GitHub Secret
```
Settings → Secrets → Actions → New secret
Name: OPENROUTER_API_KEY
Value: sk-or-your-key-here
```

### 2. Enable GitHub Pages
```
Settings → Pages → Source: /docs → Save
```

### 3. Copy Files
```bash
mkdir -p docs/css docs/js
cp templates/index.html docs/
cp static/css/style.css docs/css/
cp docs/js/github-pages-app.js docs/js/app.js
```

### 4. Update HTML
In `docs/index.html`, add before `</body>`:
```html
<script>
    window.GITHUB_REPO = 'your-username/your-repo';
</script>
```

### 5. Commit & Push
```bash
git add .
git commit -m "Setup GitHub Pages"
git push
```

### 6. Test
Visit: `https://your-username.github.io/your-repo/`

## File Structure

```
your-repo/
├── .github/
│   └── workflows/
│       └── workflow-executor.yml    ← GitHub Actions workflow
├── docs/                             ← GitHub Pages source
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js                     ← Use github-pages-app.js
├── results/                          ← Results storage
│   └── .gitkeep
├── github_workflow_runner.py         ← Workflow execution script
└── [your existing Python files]
```

## How It Works

1. **User submits task** → Frontend calls GitHub API
2. **GitHub Actions triggered** → Runs `github_workflow_runner.py`
3. **Workflow executes** → Saves to `results/{request_id}.json`
4. **Frontend polls** → Reads results from GitHub
5. **Results displayed** → User sees formatted output

## Authentication

**For Public Repos**: Works without auth (but results are public)

**For Private Repos**: Users need GitHub Personal Access Token:
1. Go to https://github.com/settings/tokens
2. Generate token with `repo` scope
3. Enter in app when prompted

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Workflow not triggering | Check GitHub token has `repo` scope |
| Results not appearing | Check `results/` directory exists and files are committed |
| Rate limit errors | Increase polling interval in `github-pages-app.js` |
| CORS errors | Use `raw.githubusercontent.com` URLs |

## Next Steps

- Read `GITHUB_PAGES_SOLUTION.md` for detailed architecture
- Read `GITHUB_PAGES_SETUP.md` for complete setup guide
- Read `GITHUB_PAGES_SUMMARY.md` for overview

## Alternative: Vercel/Netlify

If GitHub Actions is too complex, consider:
- **Vercel**: Deploy frontend + serverless functions
- **Netlify**: Similar to Vercel
- Both are simpler and better for production
