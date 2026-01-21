// AI Agent Workflow Frontend for GitHub Pages
// This version uses GitHub API instead of Flask backend

// Configuration - Update these for your repository
const GITHUB_REPO = window.GITHUB_REPO || 'your-username/your-repo'; // Set in HTML or via config
const GITHUB_TOKEN = localStorage.getItem('github_token') || ''; // User provides token
const POLL_INTERVAL = 3000; // 3 seconds
const MAX_POLL_ATTEMPTS = 60; // 2 minutes total

// State management
let currentResults = null;
let currentStep = 0;
let currentRequestId = null;
let pollInterval = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    checkGitHubConfig();
    setupEventListeners();
    setupTokenInput();
});

// Check GitHub configuration
function checkGitHubConfig() {
    const statusBadge = document.getElementById('api-status');
    
    if (!GITHUB_TOKEN) {
        statusBadge.textContent = '⚠️ GitHub Token Required';
        statusBadge.className = 'status-badge inactive';
        showTokenPrompt();
    } else {
        statusBadge.textContent = '✅ Ready';
        statusBadge.className = 'status-badge active';
    }
}

// Show token input prompt
function showTokenPrompt() {
    const prompt = document.createElement('div');
    prompt.id = 'token-prompt';
    prompt.className = 'token-prompt';
    prompt.innerHTML = `
        <div class="token-prompt-content">
            <h3>GitHub Token Required</h3>
            <p>To use this application, you need a GitHub Personal Access Token with <code>repo</code> scope.</p>
            <input type="password" id="token-input" placeholder="ghp_xxxxxxxxxxxx" />
            <div class="token-actions">
                <button onclick="saveToken()">Save Token</button>
                <a href="https://github.com/settings/tokens/new?scopes=repo&description=AI%20Workflow%20App" target="_blank">Create Token</a>
            </div>
            <p class="token-note">Token is stored locally in your browser only.</p>
        </div>
    `;
    document.body.appendChild(prompt);
}

// Save GitHub token
function saveToken() {
    const tokenInput = document.getElementById('token-input');
    const token = tokenInput.value.trim();
    
    if (!token) {
        alert('Please enter a token');
        return;
    }
    
    localStorage.setItem('github_token', token);
    location.reload();
}

// Setup event listeners
function setupEventListeners() {
    const form = document.getElementById('task-form');
    const clearBtn = document.getElementById('clear-btn');
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    if (form) form.addEventListener('submit', handleFormSubmit);
    if (clearBtn) clearBtn.addEventListener('click', clearForm);
    
    if (tabButtons) {
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => switchTab(btn.dataset.tab));
        });
    }
}

// Setup token input (if needed)
function setupTokenInput() {
    // Add token management UI if needed
}

// Generate unique request ID
function generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Trigger workflow via repository_dispatch
async function triggerWorkflow(task) {
    const requestId = generateRequestId();
    
    if (!GITHUB_TOKEN) {
        throw new Error('GitHub token is required. Please provide a token.');
    }
    
    const [owner, repo] = GITHUB_REPO.split('/');
    if (!owner || !repo) {
        throw new Error('Invalid GitHub repository. Please set GITHUB_REPO.');
    }
    
    const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/dispatches`,
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
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(`Failed to trigger workflow: ${error.message || response.statusText}`);
    }
    
    return requestId;
}

// Poll for results
async function pollForResults(requestId) {
    const [owner, repo] = GITHUB_REPO.split('/');
    const resultUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/results/${requestId}.json`;
    const statusUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/results/${requestId}.status.json`;
    
    let attempts = 0;
    
    return new Promise((resolve, reject) => {
        pollInterval = setInterval(async () => {
            attempts++;
            
            try {
                // Check status first
                const statusResponse = await fetch(statusUrl, { cache: 'no-cache' });
                if (statusResponse.ok) {
                    const status = await statusResponse.json();
                    updateWorkflowStatus(status);
                }
                
                // Check for results
                const resultResponse = await fetch(resultUrl, { cache: 'no-cache' });
                if (resultResponse.ok) {
                    const data = await resultResponse.json();
                    clearInterval(pollInterval);
                    resolve(data);
                    return;
                }
            } catch (error) {
                console.error('Polling error:', error);
            }
            
            if (attempts >= MAX_POLL_ATTEMPTS) {
                clearInterval(pollInterval);
                reject(new Error('Timeout waiting for results. The workflow may still be running.'));
            }
        }, POLL_INTERVAL);
    });
}

// Update workflow status during execution
function updateWorkflowStatus(status) {
    // Update UI to show workflow is running
    const statusElement = document.getElementById('workflow-status');
    if (statusElement) {
        statusElement.textContent = `Status: ${status.status}`;
    }
}

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const taskInput = document.getElementById('task-input');
    const task = taskInput.value.trim();
    
    if (!task) {
        showError('Please enter a task');
        return;
    }
    
    if (!GITHUB_TOKEN) {
        showError('GitHub token is required. Please provide a token.');
        showTokenPrompt();
        return;
    }
    
    // Reset UI
    resetUI();
    showWorkflowSteps();
    setStepActive(1);
    
    // Disable form
    const submitBtn = document.getElementById('submit-btn');
    if (submitBtn) {
        submitBtn.disabled = true;
        const btnText = submitBtn.querySelector('.btn-text');
        const btnSpinner = submitBtn.querySelector('.btn-spinner');
        if (btnText) btnText.style.display = 'none';
        if (btnSpinner) btnSpinner.style.display = 'inline';
    }
    
    try {
        // Show "Triggering workflow..." message
        showMessage('Triggering workflow... This may take a few minutes.');
        
        // Trigger workflow
        currentRequestId = await triggerWorkflow(task);
        console.log('Workflow triggered with request ID:', currentRequestId);
        
        // Show "Waiting for results..." message
        showMessage('Workflow triggered. Waiting for results...');
        
        // Poll for results
        const data = await pollForResults(currentRequestId);
        
        if (data.success) {
            currentResults = data.results;
            displayResults(data.results);
            showMessage('Workflow completed successfully!');
        } else {
            showError(data.error || 'Workflow execution failed');
        }
    } catch (error) {
        console.error('Error:', error);
        showError(`Error: ${error.message}`);
    } finally {
        // Re-enable form
        if (submitBtn) {
            submitBtn.disabled = false;
            const btnText = submitBtn.querySelector('.btn-text');
            const btnSpinner = submitBtn.querySelector('.btn-spinner');
            if (btnText) btnText.style.display = 'inline';
            if (btnSpinner) btnSpinner.style.display = 'none';
        }
        
        if (pollInterval) {
            clearInterval(pollInterval);
        }
    }
}

// Display results (reuse existing function from app.js)
function displayResults(results) {
    // Mark all steps as completed
    for (let i = 1; i <= 5; i++) {
        setStepCompleted(i);
    }
    
    // Display summary
    displaySummary(results);
    
    // Display step details
    displayStepDetails(results);
    
    // Show results section
    const resultsSection = document.getElementById('results-section');
    if (resultsSection) {
        resultsSection.style.display = 'block';
    }
    
    // Switch to summary tab
    switchTab('summary');
}

// Helper functions (reuse from original app.js)
function resetUI() {
    // Reset workflow steps
    for (let i = 1; i <= 5; i++) {
        const step = document.getElementById(`step-${i}`);
        if (step) {
            step.classList.remove('active', 'completed');
        }
    }
    
    // Clear results
    const resultsSection = document.getElementById('results-section');
    if (resultsSection) {
        resultsSection.style.display = 'none';
    }
    
    // Clear error messages
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
}

function showWorkflowSteps() {
    const stepsContainer = document.getElementById('workflow-steps');
    if (stepsContainer) {
        stepsContainer.style.display = 'flex';
    }
}

function setStepActive(stepNumber) {
    const step = document.getElementById(`step-${stepNumber}`);
    if (step) {
        step.classList.add('active');
    }
}

function setStepCompleted(stepNumber) {
    const step = document.getElementById(`step-${stepNumber}`);
    if (step) {
        step.classList.remove('active');
        step.classList.add('completed');
    }
}

function showError(message) {
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    } else {
        alert(message);
    }
}

function showMessage(message) {
    const messageDiv = document.getElementById('status-message');
    if (messageDiv) {
        messageDiv.textContent = message;
        messageDiv.style.display = 'block';
    }
}

function clearForm() {
    const taskInput = document.getElementById('task-input');
    if (taskInput) {
        taskInput.value = '';
    }
    resetUI();
}

function switchTab(tabName) {
    // Hide all tab contents
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        content.classList.remove('active');
    });
    
    // Remove active class from all buttons
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    const selectedTab = document.getElementById(`${tabName}-tab`);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Activate button
    const selectedBtn = document.querySelector(`[data-tab="${tabName}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('active');
    }
}

// Import display functions from original app.js if available
// For now, these are placeholders - you'll need to copy the actual implementations
function displaySummary(results) {
    // Copy implementation from original app.js
    console.log('Display summary:', results);
}

function displayStepDetails(results) {
    // Copy implementation from original app.js
    console.log('Display step details:', results);
}
