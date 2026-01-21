# GitHub Pages + GitHub Actions Solution

## Overview

This document outlines how to adapt the AI Agent Workflow System to work on GitHub Pages using GitHub Actions as the backend processor.

## Architecture

### Current Architecture (Flask)
```
Frontend (Browser) → Flask Server (/api/execute) → Workflow Execution → Results
```

### GitHub Pages Architecture
```
Frontend (GitHub Pages) → GitHub API → GitHub Actions → Workflow Execution → Store Results → Frontend Polls for Results
```

## Key Components

### 1. Frontend (GitHub Pages)
- **Location**: Static files in `docs/` or `gh-pages` branch
- **Communication**: Uses GitHub API instead of Flask endpoints
- **Polling**: Checks for results via GitHub API (files or Issues)

### 2. GitHub Actions Workflow
- **Trigger**: `repository_dispatch` event (from frontend) or `workflow_dispatch` (manual)
- **Execution**: Runs Python workflow code
- **Storage**: Writes results to repository files or GitHub Issues
- **Status**: Updates status via workflow run status

### 3. Data Storage Options

**Option A: Repository Files (Recommended)**
- Store results in `results/{request_id}.json`
- Frontend polls for file existence
- Pros: Simple, versioned, easy to access
- Cons: Requires write access to repo

**Option B: GitHub Issues**
- Create/update issues with results
- Frontend reads issue comments/body
- Pros: Built-in UI, notifications
- Cons: Rate limits, less structured

**Option C: GitHub Artifacts**
- Store results as workflow artifacts
- Frontend downloads via API
- Pros: Temporary storage, clean
- Cons: Requires download, not ideal for display

## Implementation Steps

### Step 1: Set Up GitHub Pages Structure

```
repository/
├── .github/
│   └── workflows/
│       └── workflow-executor.yml
├── docs/                    # GitHub Pages source
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── app.js
├── results/                 # Results storage (gitignored or committed)
│   └── .gitkeep
└── [existing Python files]
```

### Step 2: Create GitHub Actions Workflow

**`.github/workflows/workflow-executor.yml`**

```yaml
name: Execute AI Workflow

on:
  repository_dispatch:
    types: [execute-workflow]
  workflow_dispatch:
    inputs:
      task:
        description: 'Task to execute'
        required: true
        type: string
      request_id:
        description: 'Request ID for tracking'
        required: true
        type: string

jobs:
  execute:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.9'
      
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
      
      - name: Execute workflow
        env:
          OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
        run: |
          python -c "
          import json
          import sys
          from workflow import WorkflowOrchestrator
          
          # Get task from event
          task = '${{ github.event.inputs.task || github.event.client_payload.task }}'
          request_id = '${{ github.event.inputs.request_id || github.event.client_payload.request_id }}'
          
          # Execute workflow
          orchestrator = WorkflowOrchestrator()
          results = orchestrator.execute_workflow(task, {})
          
          # Save results
          os.makedirs('results', exist_ok=True)
          with open(f'results/{request_id}.json', 'w') as f:
              json.dump({
                  'success': True,
                  'request_id': request_id,
                  'results': results
              }, f, indent=2)
          
          # Also save status
          with open(f'results/{request_id}.status.json', 'w') as f:
              json.dump({
                  'status': 'completed',
                  'request_id': request_id
              }, f, indent=2)
          "
      
      - name: Commit results
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add results/
          git commit -m "Add workflow results for ${{ github.event.inputs.request_id || github.event.client_payload.request_id }}" || exit 0
          git push
```

### Step 3: Modify Frontend JavaScript

**Key Changes:**
1. Replace `/api/execute` with GitHub API calls
2. Use `repository_dispatch` to trigger workflow
3. Poll for results using GitHub API
4. Handle authentication (GitHub Personal Access Token)

**New API Functions:**

```javascript
// Configuration
const GITHUB_REPO = 'your-username/your-repo'; // Set dynamically
const GITHUB_TOKEN = ''; // User provides or use public repo

// Generate unique request ID
function generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Trigger workflow via repository_dispatch
async function triggerWorkflow(task) {
    const requestId = generateRequestId();
    
    const response = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/dispatches`,
        {
            method: 'POST',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                event_type: 'execute-workflow',
                client_payload: {
                    task: task,
                    request_id: requestId
                }
            })
        }
    );
    
    if (!response.ok) {
        throw new Error(`Failed to trigger workflow: ${response.statusText}`);
    }
    
    return requestId;
}

// Poll for results
async function pollForResults(requestId, maxAttempts = 60, interval = 2000) {
    for (let i = 0; i < maxAttempts; i++) {
        try {
            const response = await fetch(
                `https://raw.githubusercontent.com/${GITHUB_REPO}/main/results/${requestId}.json`
            );
            
            if (response.ok) {
                const data = await response.json();
                return data;
            }
        } catch (error) {
            console.log(`Attempt ${i + 1}: Results not ready yet...`);
        }
        
        await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    throw new Error('Timeout waiting for results');
}
```

### Step 4: Authentication Options

**Option A: Public Repository (No Auth)**
- Use `repository_dispatch` with public repo
- Results stored in public files
- Pros: No auth needed
- Cons: Results are public

**Option B: GitHub Personal Access Token**
- User provides token in frontend
- Stored in localStorage (not secure, but works)
- Pros: Private repos, secure
- Cons: User must provide token

**Option C: GitHub App**
- More complex setup
- Better for production
- Pros: Proper OAuth flow
- Cons: Complex setup

### Step 5: Handle Rate Limits

GitHub API has rate limits:
- **Unauthenticated**: 60 requests/hour
- **Authenticated**: 5,000 requests/hour

**Strategies:**
1. Use exponential backoff for polling
2. Increase polling interval (2-5 seconds)
3. Show user-friendly messages about rate limits
4. Cache results locally

## Alternative: Serverless Functions

If GitHub Actions proves too complex, consider:

### Option 1: Vercel/Netlify Functions
- Deploy frontend to Vercel/Netlify
- Use serverless functions for API
- Pros: Simple, fast, free tier
- Cons: Not GitHub Pages

### Option 2: Cloudflare Workers
- Deploy to Cloudflare Pages
- Use Workers for API
- Pros: Fast, global, free tier
- Cons: Not GitHub Pages

### Option 3: GitHub Codespaces + Port Forwarding
- Run Flask in Codespace
- Port forward to public URL
- Pros: Works with existing code
- Cons: Requires active Codespace

## Limitations & Considerations

### GitHub Actions Limitations:
1. **No Real-time Response**: Actions are async, requires polling
2. **Rate Limits**: GitHub API has limits
3. **Execution Time**: Actions have time limits (6 hours max)
4. **Cost**: Free tier has limits (2000 minutes/month)
5. **Secrets**: Must store API keys in GitHub Secrets

### Frontend Limitations:
1. **CORS**: GitHub API CORS is limited
2. **Authentication**: Token management in browser
3. **Polling**: Not ideal UX, but necessary
4. **Public Results**: If using public repo, results are visible

## Recommended Approach

**For MVP/Prototype:**
1. Use **Option A** (Public Repo + Repository Files)
2. Simple polling with 2-3 second intervals
3. Store results in `results/` directory
4. Frontend reads from `raw.githubusercontent.com`

**For Production:**
1. Use **Vercel/Netlify** with serverless functions
2. Or use **GitHub App** for proper OAuth
3. Implement proper error handling and retries
4. Add result cleanup (delete old results)

## Migration Checklist

- [ ] Create `.github/workflows/workflow-executor.yml`
- [ ] Set up GitHub Secrets (`OPENROUTER_API_KEY`)
- [ ] Move frontend files to `docs/` directory
- [ ] Update `app.js` to use GitHub API
- [ ] Add request ID generation
- [ ] Implement polling logic
- [ ] Add error handling for rate limits
- [ ] Test with public repository
- [ ] Update README with GitHub Pages instructions
- [ ] Enable GitHub Pages in repo settings

## Example Flow

1. **User submits task** → Frontend generates `request_id`
2. **Frontend calls** → `POST /repos/{owner}/{repo}/dispatches`
3. **GitHub Actions triggered** → Executes workflow
4. **Workflow completes** → Saves results to `results/{request_id}.json`
5. **Frontend polls** → `GET https://raw.githubusercontent.com/.../results/{request_id}.json`
6. **Results found** → Frontend displays results
7. **Cleanup** → (Optional) Delete old result files

## Next Steps

1. Review this architecture
2. Decide on authentication approach
3. Implement GitHub Actions workflow
4. Modify frontend JavaScript
5. Test end-to-end flow
6. Deploy to GitHub Pages
