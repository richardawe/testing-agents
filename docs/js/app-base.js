// AI Agent Workflow Frontend JavaScript

// Configuration
const API_BASE = '/api';

// State management
let currentResults = null;
let currentStep = 0;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    checkAPIStatus();
    setupEventListeners();
});

// Check API status
async function checkAPIStatus() {
    try {
        const response = await fetch(`${API_BASE}/status`);
        const data = await response.json();
        
        const statusBadge = document.getElementById('api-status');
        if (data.success) {
            if (data.api_key_valid && data.api_key_format_valid) {
                statusBadge.textContent = '✅ API Configured';
                statusBadge.className = 'status-badge active';
            } else if (data.api_configured) {
                statusBadge.textContent = '⚠️ Invalid API Key';
                statusBadge.className = 'status-badge inactive';
            } else {
                statusBadge.textContent = '❌ API Not Configured';
                statusBadge.className = 'status-badge inactive';
            }
        } else {
            statusBadge.textContent = '❌ Error';
            statusBadge.className = 'status-badge inactive';
        }
    } catch (error) {
        console.error('Error checking API status:', error);
        const statusBadge = document.getElementById('api-status');
        statusBadge.textContent = '❌ Connection Error';
        statusBadge.className = 'status-badge inactive';
    }
}

// Setup event listeners
function setupEventListeners() {
    const form = document.getElementById('task-form');
    const clearBtn = document.getElementById('clear-btn');
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    form.addEventListener('submit', handleFormSubmit);
    clearBtn.addEventListener('click', clearForm);
    
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
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
    
    // Reset UI
    resetUI();
    showWorkflowSteps();
    setStepActive(1);
    
    // Disable form
    const submitBtn = document.getElementById('submit-btn');
    submitBtn.disabled = true;
    submitBtn.querySelector('.btn-text').style.display = 'none';
    submitBtn.querySelector('.btn-spinner').style.display = 'inline';
    
    try {
        // Execute workflow
        const response = await fetch(`${API_BASE}/execute`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                task: task,
                context: {}
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentResults = data.results;
            displayResults(data.results);
        } else {
            showError(data.error || 'An error occurred while executing the workflow');
        }
    } catch (error) {
        console.error('Error:', error);
        showError(`Error: ${error.message}`);
    } finally {
        // Re-enable form
        submitBtn.disabled = false;
        submitBtn.querySelector('.btn-text').style.display = 'inline';
        submitBtn.querySelector('.btn-spinner').style.display = 'none';
    }
}

// Display results
function displayResults(results) {
    // Mark all steps as completed
    for (let i = 1; i <= 5; i++) {
        setStepCompleted(i);
    }
    
    // Show results section
    const resultsSection = document.getElementById('results-section');
    resultsSection.style.display = 'block';
    
    // Display summary
    const summaryContent = document.getElementById('summary-content');
    if (results.summary) {
        summaryContent.innerHTML = formatMarkdown(results.summary);
    } else {
        summaryContent.innerHTML = '<p>No summary available</p>';
    }
    
    // Display step results
    if (results.steps) {
        displayStepResult('step1', results.steps.step1_plan);
        displayStepResult('step2', results.steps.step2_research);
        displayStepResult('step3', results.steps.step3_execution);
        displayStepResult('step4', results.steps.step4_review);
        displayStepResult('step5', results.steps.step5_refinement);
    }
    
    // Extract and display final document if available (after a brief delay to ensure step 5 is rendered)
    setTimeout(() => {
        extractFinalDocument(results);
    }, 200);
    
    // Display raw output
    const rawContent = document.getElementById('raw-content');
    rawContent.textContent = JSON.stringify(results, null, 2);
    
    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Extract final document content from results
function extractFinalDocument(results) {
    let finalDoc = '';
    
    // Priority 1: Extract the actual refined_deliverables content (the final document)
    // workflow_context.refined_deliverables = { "refined_deliverables": "...", "step": 5 }
    // We want just the "refined_deliverables" string value
    if (results.workflow_context && results.workflow_context.refined_deliverables) {
        const refined = results.workflow_context.refined_deliverables;
        
        // If it's an object with refined_deliverables field, extract that
        if (typeof refined === 'object' && refined.refined_deliverables) {
            finalDoc = extractDocumentContentFromString(refined.refined_deliverables);
        } else if (typeof refined === 'string') {
            // If it's already a string, extract the document content
            finalDoc = extractDocumentContentFromString(refined);
        }
    }
    
    // Priority 2: Try from step 5 result's refined_deliverables field
    if (!finalDoc && results.steps && results.steps.step5_refinement) {
        const step5 = results.steps.step5_refinement;
        if (step5.result && typeof step5.result === 'object' && step5.result.refined_deliverables) {
            finalDoc = extractDocumentContentFromString(step5.result.refined_deliverables);
        }
    }
    
    // Priority 3: Fallback to regular deliverables (if no refinement happened)
    if (!finalDoc && results.workflow_context && results.workflow_context.deliverables) {
        const deliverables = results.workflow_context.deliverables;
        if (typeof deliverables === 'object' && deliverables.result) {
            if (deliverables.result.deliverables) {
                finalDoc = extractDocumentContentFromString(deliverables.result.deliverables);
            }
        } else if (typeof deliverables === 'string') {
            finalDoc = extractDocumentContentFromString(deliverables);
        }
    }
    
    // Priority 4: Try from step 3 execution (original deliverables)
    if (!finalDoc && results.steps && results.steps.step3_execution) {
        const step3 = results.steps.step3_execution;
        if (step3.result && typeof step3.result === 'object' && step3.result.deliverables) {
            finalDoc = extractDocumentContentFromString(step3.result.deliverables);
        }

    }
    
    // Display final document tab if we have substantial content
    if (finalDoc && finalDoc.trim().length > 50) {
        displayFinalDocumentTab(finalDoc.trim());
    }
}

// Extract the actual document content from a string (handling JSON, markdown, etc.)
function extractDocumentContentFromString(text) {
    if (!text || typeof text !== 'string') return '';
    
    // Check if it's wrapped in JSON code blocks
    const jsonCodeBlockMatch = text.match(/```json\s*([\s\S]*?)```/);
    if (jsonCodeBlockMatch) {
        try {
            const jsonData = JSON.parse(jsonCodeBlockMatch[1]);
            // Convert entire JSON structure to readable document
            return convertJsonToReadableDocument(jsonData);
        } catch (e) {
            // If JSON parse fails, try to extract readable content
            return extractReadableContentFromJsonString(jsonCodeBlockMatch[1]);
        }
    }
    
    // Check if entire string is JSON
    try {
        const jsonData = JSON.parse(text);
        return convertJsonToReadableDocument(jsonData);
    } catch (e) {
        // Not JSON, return as-is (it's already readable text)
        return text;
    }
}

// Convert entire JSON structure to readable document format
function convertJsonToReadableDocument(obj) {
    if (!obj || typeof obj !== 'object') return '';
    
    let doc = '';
    
    // Handle refined_deliverables wrapper
    if (obj.refined_deliverables) {
        if (typeof obj.refined_deliverables === 'string') {
            return extractDocumentContentFromString(obj.refined_deliverables);
        } else if (typeof obj.refined_deliverables === 'object') {
            obj = obj.refined_deliverables; // Process the inner structure
        }
    }
    
    // Handle EXECUTION_SUMMARY section
    if (obj.EXECUTION_SUMMARY) {
        doc += '# Execution Summary\n\n';
        const summary = obj.EXECUTION_SUMMARY;
        
        if (summary.status) {
            doc += `**Status:** ${summary.status}\n\n`;
        }
        
        if (summary.completed_subtasks && Array.isArray(summary.completed_subtasks)) {
            doc += '## Completed Subtasks\n\n';
            summary.completed_subtasks.forEach((task, idx) => {
                doc += `${idx + 1}. ${task}\n`;
            });
            doc += '\n';
        }
        
        if (summary.timeline_alignment) {
            doc += `**Timeline Alignment:** ${summary.timeline_alignment}\n\n`;
        }
        
        if (summary.scope_adherence) {
            doc += `**Scope Adherence:** ${summary.scope_adherence}\n\n`;
        }
        
        if (summary.note) {
            doc += `**Note:** ${summary.note}\n\n`;
        }
        
        doc += '\n---\n\n';
    }
    
    // Handle KEY_DECISIONS section
    if (obj.KEY_DECISIONS) {
        doc += '# Key Decisions\n\n';
        const decisions = obj.KEY_DECISIONS;
        
        for (const [key, decision] of Object.entries(decisions)) {
            if (decision && typeof decision === 'object') {
                const decisionName = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                doc += `## ${decisionName}\n\n`;
                
                if (decision.decision) {
                    doc += `**Decision:** ${decision.decision}\n\n`;
                }
                
                if (decision.rationale) {
                    doc += `**Rationale:** ${decision.rationale}\n\n`;
                }
                
                if (decision.deviation) {
                    doc += `**Deviation from Plan:** ${decision.deviation}\n\n`;
                }
                
                if (decision.assumption) {
                    doc += `**Assumption:** ${decision.assumption}\n\n`;
                }
                
                doc += '\n';
            }
        }
        
        doc += '---\n\n';
    }
    
    // Handle DELIVERABLES section
    if (obj.DELIVERABLES) {
        doc += '# Deliverables\n\n';
        const deliverables = obj.DELIVERABLES;
        
        for (const [key, deliverable] of Object.entries(deliverables)) {
            if (deliverable && typeof deliverable === 'object') {
                // Deliverable name
                if (deliverable.name) {
                    doc += `## ${deliverable.name}\n\n`;
                } else {
                    const deliverableName = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    doc += `## ${deliverableName}\n\n`;
                }
                
                // Format
                if (deliverable.format) {
                    doc += `*Format: ${deliverable.format}*\n\n`;
                }
                
                // Sections
                if (deliverable.sections && Array.isArray(deliverable.sections)) {
                    doc += '### Sections:\n\n';
                    deliverable.sections.forEach((section, idx) => {
                        if (typeof section === 'string') {
                            doc += `${idx + 1}. ${section}\n`;
                        } else if (section && typeof section === 'object' && section.section) {
                            doc += `${idx + 1}. ${section.section}\n`;
                        }
                    });
                    doc += '\n';
                }
                
                // Key features
                if (deliverable.key_features && Array.isArray(deliverable.key_features)) {
                    doc += '### Key Features:\n\n';
                    deliverable.key_features.forEach((feature) => {
                        doc += `- ${feature}\n`;
                    });
                    doc += '\n';
                }
                
                // Procedures
                if (deliverable.procedures && Array.isArray(deliverable.procedures)) {
                    doc += '### Procedures:\n\n';
                    deliverable.procedures.forEach((procedure) => {
                        doc += `- ${procedure}\n`;
                    });
                    doc += '\n';
                }
                
                // Checkpoints
                if (deliverable.checkpoints && Array.isArray(deliverable.checkpoints)) {
                    doc += '### Compliance Checkpoints:\n\n';
                    deliverable.checkpoints.forEach((checkpoint) => {
                        if (checkpoint && typeof checkpoint === 'object') {
                            if (checkpoint.stage) {
                                doc += `#### ${checkpoint.stage}\n\n`;
                            }
                            if (checkpoint.checks && Array.isArray(checkpoint.checks)) {
                                checkpoint.checks.forEach((check) => {
                                    doc += `- ${check}\n`;
                                });
                                doc += '\n';
                            }
                        }
                    });
                }
                
                // Components (for technology plans)
                if (deliverable.components && Array.isArray(deliverable.components)) {
                    doc += '### Components:\n\n';
                    deliverable.components.forEach((component) => {
                        if (component && typeof component === 'object') {
                            if (component.system) {
                                doc += `#### ${component.system}\n\n`;
                            }
                            if (component.purpose) {
                                doc += `**Purpose:** ${component.purpose}\n\n`;
                            }
                            if (component.timeline) {
                                doc += `**Timeline:** ${component.timeline}\n\n`;
                            }
                            if (component.owner) {
                                doc += `**Owner:** ${component.owner}\n\n`;
                            }
                            doc += '\n';
                        }
                    });
                }
                
                // Risk categories
                if (deliverable.risk_categories && Array.isArray(deliverable.risk_categories)) {
                    doc += '### Risk Categories:\n\n';
                    deliverable.risk_categories.forEach((category) => {
                        if (category && typeof category === 'object') {
                            if (category.category) {
                                doc += `#### ${category.category}\n\n`;
                            }
                            if (category.risks && Array.isArray(category.risks)) {
                                doc += '**Risks:**\n';
                                category.risks.forEach((risk) => {
                                    doc += `- ${risk}\n`;
                                });
                                doc += '\n';
                            }
                            if (category.mitigation && Array.isArray(category.mitigation)) {
                                doc += '**Mitigation:**\n';
                                category.mitigation.forEach((mit) => {
                                    doc += `- ${mit}\n`;
                                });
                                doc += '\n';
                            }
                            if (category.owner) {
                                doc += `**Owner:** ${category.owner}\n\n`;
                            }
                        }
                    });
                }
                
                // Stakeholders
                if (deliverable.internal_stakeholders || deliverable.external_stakeholders) {
                    doc += '### Stakeholders:\n\n';
                    if (deliverable.internal_stakeholders && Array.isArray(deliverable.internal_stakeholders)) {
                        doc += '#### Internal Stakeholders:\n\n';
                        deliverable.internal_stakeholders.forEach((stakeholder) => {
                            if (stakeholder && typeof stakeholder === 'object') {
                                if (stakeholder.role) {
                                    doc += `**${stakeholder.role}**\n`;
                                    if (stakeholder.engagement) doc += `- Engagement: ${stakeholder.engagement}\n`;
                                    if (stakeholder.expectations) doc += `- Expectations: ${stakeholder.expectations}\n`;
                                    doc += '\n';
                                }
                            }
                        });
                    }
                    if (deliverable.external_stakeholders && Array.isArray(deliverable.external_stakeholders)) {
                        doc += '#### External Stakeholders:\n\n';
                        deliverable.external_stakeholders.forEach((stakeholder) => {
                            if (stakeholder && typeof stakeholder === 'object') {
                                if (stakeholder.role) {
                                    doc += `**${stakeholder.role}**\n`;
                                    if (stakeholder.engagement) doc += `- Engagement: ${stakeholder.engagement}\n`;
                                    if (stakeholder.expectations) doc += `- Expectations: ${stakeholder.expectations}\n`;
                                    doc += '\n';
                                }
                            }
                        });
                    }
                }
                
                // Team structure
                if (deliverable.team_structure && Array.isArray(deliverable.team_structure)) {
                    doc += '### Team Structure:\n\n';
                    deliverable.team_structure.forEach((member) => {
                        if (member && typeof member === 'object') {
                            if (member.role) {
                                doc += `**${member.role}**\n`;
                                if (member.FTE) doc += `- FTE: ${member.FTE}\n`;
                                if (member.skills) doc += `- Skills: ${member.skills}\n`;
                                if (member.responsibilities) doc += `- Responsibilities: ${member.responsibilities}\n`;
                                doc += '\n';
                            }
                        }
                    });
                }
                
                // Scope (for pilot design)
                if (deliverable.scope && typeof deliverable.scope === 'object') {
                    doc += '### Scope:\n\n';
                    for (const [key, value] of Object.entries(deliverable.scope)) {
                        const scopeKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                        doc += `**${scopeKey}:** ${value}\n\n`;
                    }
                }
                
                // Objectives
                if (deliverable.objectives && Array.isArray(deliverable.objectives)) {
                    doc += '### Objectives:\n\n';
                    deliverable.objectives.forEach((objective) => {
                        doc += `- ${objective}\n`;
                    });
                    doc += '\n';
                }
                
                // Success metrics
                if (deliverable.success_metrics && Array.isArray(deliverable.success_metrics)) {
                    doc += '### Success Metrics:\n\n';
                    deliverable.success_metrics.forEach((metric) => {
                        if (metric && typeof metric === 'object') {
                            if (metric.metric) {
                                doc += `#### ${metric.metric}\n\n`;
                                if (metric.target) doc += `- Target: ${metric.target}\n`;
                                if (metric.measurement) doc += `- Measurement: ${metric.measurement}\n`;
                                doc += '\n';
                            }
                        }
                    });
                }
                
                // Training modules
                if (deliverable.training_modules && Array.isArray(deliverable.training_modules)) {
                    doc += '### Training Modules:\n\n';
                    deliverable.training_modules.forEach((module) => {
                        if (module && typeof module === 'object') {
                            if (module.module) {
                                doc += `#### ${module.module}\n\n`;
                                if (module.audience) doc += `- Audience: ${module.audience}\n`;
                                if (module.format) doc += `- Format: ${module.format}\n`;
                                if (module.duration) doc += `- Duration: ${module.duration}\n`;
                                if (module.content) doc += `- Content: ${module.content}\n`;
                                doc += '\n';
                            }
                        }
                    });
                }
                
                // Any other string fields
                for (const [fieldKey, fieldValue] of Object.entries(deliverable)) {
                    if (typeof fieldValue === 'string' && fieldValue.length > 50 && 
                        !['name', 'format'].includes(fieldKey)) {
                        const fieldName = fieldKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                        doc += `### ${fieldName}\n\n${fieldValue}\n\n`;
                    }
                }
                
                doc += '\n---\n\n';
            }
        }
    }
    
    // Handle any remaining top-level fields
    for (const [key, value] of Object.entries(obj)) {
        if (!['EXECUTION_SUMMARY', 'KEY_DECISIONS', 'DELIVERABLES', 'refined_deliverables'].includes(key)) {
            if (typeof value === 'string' && value.length > 50) {
                const sectionName = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                doc += `## ${sectionName}\n\n${value}\n\n---\n\n`;
            } else if (typeof value === 'object' && value !== null) {
                // Recursively handle nested objects
                const nested = convertJsonToReadableDocument(value);
                if (nested) {
                    const sectionName = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    doc += `## ${sectionName}\n\n${nested}\n\n---\n\n`;
                }
            }
        }
    }
    
    return doc.trim();
}

// Extract document from improved_deliverables structure
function extractDocumentFromImprovedDeliverables(improved) {
    if (!improved || typeof improved !== 'object') return '';
    
    let doc = '';
    
    if (improved.execution_summary) {
        doc = extractDocumentFromExecutionSummary(improved.execution_summary);
        if (doc) return doc;
    }
    
    // Try direct extraction
    if (improved.refined_deliverables && typeof improved.refined_deliverables === 'string') {
        return extractDocumentContentFromString(improved.refined_deliverables);
    }
    
    return '';
}

// Extract document from execution_summary structure
function extractDocumentFromExecutionSummary(summary) {
    if (!summary || typeof summary !== 'object') return '';
    
    let doc = '';
    
    // If there's an overview, use that as introduction
    if (summary.overview) {
        doc += `${summary.overview}\n\n`;
    }
    
    // Extract from deliverables array
    if (summary.deliverables && Array.isArray(summary.deliverables)) {
        for (const deliverable of summary.deliverables) {
            if (deliverable.name) {
                doc += `# ${deliverable.name}\n\n`;
            }
            
            if (deliverable.notes) {
                doc += `${deliverable.notes}\n\n`;
            }
            
            // Extract section content
            if (deliverable.sections && Array.isArray(deliverable.sections)) {
                for (const section of deliverable.sections) {
                    if (typeof section === 'string') {
                        doc += `## ${section}\n\n`;
                    } else if (section && typeof section === 'object') {
                        if (section.section) {
                            doc += `## ${section.section}\n\n`;
                        }
                        // Prefer completion_notes over placeholder_guidance (final vs draft)
                        if (section.completion_notes) {
                            doc += `${section.completion_notes}\n\n`;
                        } else if (section.placeholder_guidance) {
                            doc += `${section.placeholder_guidance}\n\n`;
                        }
                        if (section.content) {
                            doc += `${section.content}\n\n`;
                        }
                    }
                }
            }
        }
    }
    
    return doc.trim();
}

// Build document from object when no structured format found
function buildDocumentFromObject(obj) {
    if (!obj || typeof obj !== 'object') return '';
    
    // Look for any large text fields that might be the document
    let longestText = '';
    
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string' && value.length > longestText.length) {
            longestText = value;
        } else if (typeof value === 'object' && value !== null) {
            const nested = buildDocumentFromObject(value);
            if (nested.length > longestText.length) {
                longestText = nested;
            }
        }
    }
    
    return longestText;
}

// Extract readable content from a JSON string
function extractReadableContentFromJsonString(jsonStr) {
    try {
        const obj = JSON.parse(jsonStr);
        return extractFinalDocumentFromJson(obj);
    } catch (e) {
        // If still can't parse, return cleaned string
        return jsonStr.replace(/[{}[\]]/g, '').replace(/"/g, '').trim();
    }
}

// Extract readable text from string (handling JSON code blocks)
function extractReadableTextFromString(text) {
    if (!text || typeof text !== 'string') return '';
    
    // Check for JSON code blocks
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/);
    if (jsonMatch) {
        try {
            const jsonData = JSON.parse(jsonMatch[1]);
            return convertJsonToReadableDocument(jsonData);
        } catch (e) {
            // If parsing fails, try to extract from the JSON string
            return extractDocumentSectionsFromJsonString(jsonMatch[1]);
        }
    }
    
    // Try parsing entire string as JSON
    try {
        const jsonData = JSON.parse(text);
        return convertJsonToReadableDocument(jsonData);
    } catch (e) {
        // Not JSON, return as-is
        return text;
    }
}

// Extract document sections from JSON string
function extractDocumentSectionsFromJsonString(jsonStr) {
    try {
        const obj = JSON.parse(jsonStr);
        return convertJsonToReadableDocument(obj);
    } catch (e) {
        // Try to extract readable content from the string
        return jsonStr;
    }
}

// Display final document in its own tab
function displayFinalDocumentTab(finalDoc) {
    // Add final document tab if it doesn't exist
    const tabsContainer = document.querySelector('.results-tabs');
    if (!document.querySelector('.tab-btn[data-tab="final"]')) {
        const finalTab = document.createElement('button');
        finalTab.className = 'tab-btn';
        finalTab.setAttribute('data-tab', 'final');
        finalTab.textContent = '📄 Final Document';
        finalTab.addEventListener('click', () => switchTab('final'));
        // Insert before raw tab
        const rawTab = document.querySelector('.tab-btn[data-tab="raw"]');
        if (rawTab) {
            tabsContainer.insertBefore(finalTab, rawTab);
        } else {
            tabsContainer.appendChild(finalTab);
        }
    }
    
    // Add final document pane if it doesn't exist
    const tabContent = document.querySelector('.tab-content');
    if (!document.getElementById('tab-final')) {
        const finalPane = document.createElement('div');
        finalPane.id = 'tab-final';
        finalPane.className = 'tab-pane';
        
        // Create header with download button
        const header = document.createElement('div');
        header.className = 'final-doc-header';
        header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #e0e0e0;';
        
        const title = document.createElement('h3');
        title.textContent = 'Final Document';
        title.style.cssText = 'margin: 0; color: #667eea;';
        
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'display: flex; gap: 10px;';
        
        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'btn btn-primary';
        downloadBtn.innerHTML = '📥 Download';
        downloadBtn.onclick = () => downloadFinalDocument(finalDoc);
        
        const copyBtn = document.createElement('button');
        copyBtn.className = 'btn btn-secondary';
        copyBtn.innerHTML = '📋 Copy';
        copyBtn.onclick = () => copyFinalDocument(finalDoc);
        
        buttonContainer.appendChild(downloadBtn);
        buttonContainer.appendChild(copyBtn);
        header.appendChild(title);
        header.appendChild(buttonContainer);
        
        const finalContent = document.createElement('div');
        finalContent.id = 'final-content';
        finalContent.className = 'formatted-content final-document';
        
        finalPane.appendChild(header);
        finalPane.appendChild(finalContent);
        
        // Insert before raw pane
        const rawPane = document.getElementById('tab-raw');
        if (rawPane) {
            tabContent.insertBefore(finalPane, rawPane);
        } else {
            tabContent.appendChild(finalPane);
        }
    }
    
    // Display the final document
    const finalContent = document.getElementById('final-content');
    if (finalDoc && finalDoc.trim()) {
        finalContent.innerHTML = formatMarkdown(finalDoc.trim());
    } else {
        finalContent.innerHTML = '<p>No final document content found. Check individual steps for details.</p>';
    }
}

// Download final document
function downloadFinalDocument(content) {
    // Ensure content is in readable format (not JSON)
    let readableContent = content;
    
    // If content looks like JSON, try to convert it
    if (content.trim().startsWith('{') || content.trim().startsWith('[') || content.includes('"refined_deliverables"')) {
        try {
            // Try to parse and convert
            const jsonMatch = content.match(/```json\s*([\s\S]*?)```/);
            const jsonStr = jsonMatch ? jsonMatch[1] : content;
            const jsonData = JSON.parse(jsonStr);
            readableContent = convertJsonToReadableDocument(jsonData);
        } catch (e) {
            // If conversion fails, use original
            readableContent = content;
        }
    }
    
    const blob = new Blob([readableContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `final-document-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Copy final document to clipboard
function copyFinalDocument(content) {
    // Create temporary textarea
    const textarea = document.createElement('textarea');
    textarea.value = content;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
        document.execCommand('copy');
        // Show feedback
        const btn = event.target;
        const originalText = btn.innerHTML;
        btn.innerHTML = '✓ Copied!';
        btn.style.background = '#4caf50';
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.background = '';
        }, 2000);
    } catch (err) {
        alert('Failed to copy. Please select and copy manually.');
    }
    
    document.body.removeChild(textarea);
}

// Extract document content from nested structures
function extractDocumentContent(data) {
    if (!data) return '';
    
    let content = '';
    
    // If it's a string, try to parse JSON code blocks
    if (typeof data === 'string') {
        // Check for JSON code blocks
        const jsonMatch = data.match(/```json\s*([\s\S]*?)```/);
        if (jsonMatch) {
            try {
                const jsonData = JSON.parse(jsonMatch[1]);
                content = extractContentFromObject(jsonData, true);
            } catch (e) {
                // If JSON parse fails, try to extract readable content
                content = extractReadableContent(data);
            }
        } else {
            content = extractReadableContent(data);
        }
    }
    
    // If it's an object, extract content
    else if (typeof data === 'object') {
        // Check if result contains the data
        if (data.result) {
            if (typeof data.result === 'string') {
                return extractDocumentContent(data.result);
            } else if (typeof data.result === 'object') {
                content = extractContentFromObject(data.result, true);
            }
        } else {
            content = extractContentFromObject(data, true);
        }
    }
    
    return content;
}

// Extract readable content from text (removing JSON wrappers)
function extractReadableContent(text) {
    if (!text) return '';
    
    // Remove JSON code block markers
    text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // Try to parse as JSON
    try {
        const parsed = JSON.parse(text);
        return extractContentFromObject(parsed, true);
    } catch (e) {
        // Not JSON, return as-is
        return text;
    }
}

// Extract content from nested object structure and convert to readable text
function extractContentFromObject(obj, convertToText = false) {
    if (!obj) return '';
    
    let content = '';
    
    // If we need to convert to text, build a readable document
    if (convertToText) {
        content = convertJsonToReadableDocument(obj);
        if (content && content.length > 100) {
            return content;
        }
    }
    
    // Look for common content keys
    const contentKeys = [
        'refined_deliverables', 'deliverables', 'document', 'content', 
        'proposal', 'text', 'output', 'result', 'plan', 'research', 'review'
    ];
    
    for (const key of contentKeys) {
        if (obj[key]) {
            if (typeof obj[key] === 'string') {
                if (obj[key].length > content.length) {
                    content = obj[key];
                }
            } else if (typeof obj[key] === 'object') {
                const nested = extractContentFromObject(obj[key], convertToText);
                if (nested.length > content.length) {
                    content = nested;
                }
            }
        }
    }
    
    // If no specific content keys found, look for string values
    if (!content || content.length < 50) {
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string' && value.length > 100) {
                // Prefer longer string values (likely the actual content)
                if (value.length > content.length) {
                    content = value;
                }
            } else if (typeof value === 'object' && value !== null) {
                const nested = extractContentFromObject(value, convertToText);
                if (nested.length > content.length) {
                    content = nested;
                }
            }
        }
    }
    
    // If still no content, try to format the object as readable text
    if (!content || content.length < 50) {
        content = formatObjectAsDocument(obj);
    }
    
    return content;
}

// Convert JSON structure to readable document text
function convertJsonToReadableDocument(obj) {
    if (!obj || typeof obj !== 'object') return '';
    
    let doc = '';
    
    // Handle refined deliverables structure
    if (obj.refined_deliverables || obj.improved_deliverables) {
        const improved = obj.improved_deliverables || obj.refined_deliverables;
        if (improved && improved.execution_summary) {
            const summary = improved.execution_summary;
            
            if (summary.overview) {
                doc += `${summary.overview}\n\n`;
            }
            
            if (summary.deliverables && Array.isArray(summary.deliverables)) {
                for (const deliverable of summary.deliverables) {
                    if (deliverable.name) {
                        doc += `# ${deliverable.name}\n\n`;
                    }
                    
                    if (deliverable.notes) {
                        doc += `${deliverable.notes}\n\n`;
                    }
                    
                    if (deliverable.sections && Array.isArray(deliverable.sections)) {
                        for (const section of deliverable.sections) {
                            if (typeof section === 'string') {
                                doc += `## ${section}\n\n`;
                            } else if (section && typeof section === 'object') {
                                if (section.section) {
                                    doc += `## ${section.section}\n\n`;
                                }
                                if (section.placeholder_guidance) {
                                    doc += `${section.placeholder_guidance}\n\n`;
                                }
                                if (section.completion_notes) {
                                    doc += `${section.completion_notes}\n\n`;
                                }
                                if (section.content) {
                                    doc += `${section.content}\n\n`;
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    // Handle execution summary
    if (obj.execution_summary) {
        const summary = obj.execution_summary;
        if (summary.overview && !doc.includes(summary.overview)) {
            doc += `# ${summary.overview}\n\n`;
        }
        
        if (summary.deliverables && Array.isArray(summary.deliverables)) {
            for (const deliverable of summary.deliverables) {
                if (deliverable.name) {
                    doc += `## ${deliverable.name}\n\n`;
                }
                if (deliverable.notes) {
                    doc += `${deliverable.notes}\n\n`;
                }
            }
        }
    }
    
    // Handle key decisions
    if (obj.key_decisions && Array.isArray(obj.key_decisions)) {
        doc += `## Key Decisions\n\n`;
        for (const decision of obj.key_decisions) {
            if (decision.decision) {
                doc += `### ${decision.decision}\n\n`;
            }
            if (decision.rationale) {
                doc += `**Rationale:** ${decision.rationale}\n\n`;
            }
            if (decision.impact) {
                doc += `**Impact:** ${decision.impact}\n\n`;
            }
        }
    }
    
    // Handle progress notes
    if (obj.progress_notes) {
        if (obj.progress_notes.completed_work) {
            doc += `## Completed Work\n\n${obj.progress_notes.completed_work}\n\n`;
        }
        if (obj.progress_notes.remaining_work) {
            doc += `## Remaining Work\n\n${obj.progress_notes.remaining_work}\n\n`;
        }
        if (obj.progress_notes.next_immediate_actions && Array.isArray(obj.progress_notes.next_immediate_actions)) {
            doc += `## Next Immediate Actions\n\n`;
            for (const action of obj.progress_notes.next_immediate_actions) {
                if (action.action) {
                    doc += `- **${action.priority || 'Normal'} Priority:** ${action.action}`;
                    if (action.timeframe) {
                        doc += ` (${action.timeframe})`;
                    }
                    doc += `\n`;
                }
            }
            doc += `\n`;
        }
    }
    
    return doc.trim();
}

// Format object as readable document content
function formatObjectAsDocument(obj) {
    if (typeof obj === 'string') return obj;
    if (!obj || typeof obj !== 'object') return '';
    
    // First try to convert JSON to readable document
    let output = convertJsonToReadableDocument(obj);
    
    // If that didn't work, try other structures
    if (!output || output.length < 50) {
        // Look for structured document sections
        if (obj.deliverables && Array.isArray(obj.deliverables)) {
            for (const deliverable of obj.deliverables) {
                if (deliverable.name) {
                    output += `## ${deliverable.name}\n\n`;
                }
                if (deliverable.sections && Array.isArray(deliverable.sections)) {
                    for (const section of deliverable.sections) {
                        if (typeof section === 'string') {
                            output += `### ${section}\n\n`;
                        } else if (section && typeof section === 'object') {
                            if (section.section) {
                                output += `### ${section.section}\n\n`;
                            }
                            if (section.content) {
                                output += `${section.content}\n\n`;
                            }
                            if (section.placeholder_guidance) {
                                output += `${section.placeholder_guidance}\n\n`;
                            }
                        }
                    }
                }
            }
        }
        
        // Look for execution summary or other document-like structures
        if (obj.execution_summary) {
            if (obj.execution_summary.overview) {
                output += `## Execution Summary\n\n${obj.execution_summary.overview}\n\n`;
            }
        }
    }
    
    // If we have refined deliverables with improved content
    if (!output || output.length < 50) {
        if (obj.improved_deliverables) {
            return formatObjectAsDocument(obj.improved_deliverables);
        }
        if (obj.refined_deliverables) {
            return formatObjectAsDocument(obj.refined_deliverables);
        }
    }
    
    // Return readable document or empty string (don't show raw JSON)
    return output.trim() || '';
}

// Display step result
function displayStepResult(stepId, stepData) {
    const contentElement = document.getElementById(`${stepId}-content`);
    if (!contentElement) return;
    
    if (stepData && stepData.result) {
        let content = extractDocumentContent(stepData.result);
        
        // If we didn't get good content, try direct extraction
        if (!content || content.length < 50) {
            if (typeof stepData.result === 'string') {
                content = stepData.result;
            } else if (typeof stepData.result === 'object') {
                // Format object result - check specific keys
                if (stepData.result.plan) {
                    content = stepData.result.plan;
                } else if (stepData.result.research) {
                    content = stepData.result.research;
                } else if (stepData.result.deliverables) {
                    content = stepData.result.deliverables;
                } else if (stepData.result.review) {
                    content = stepData.result.review;
                } else if (stepData.result.refined_deliverables) {
                    content = stepData.result.refined_deliverables;
                } else {
                    // Try to find any string value
                    const stringValues = Object.values(stepData.result).filter(v => typeof v === 'string' && v.length > 50);
                    content = stringValues.join('\n\n') || JSON.stringify(stepData.result, null, 2);
                }
            }
        }
        
        // Format and display
        contentElement.innerHTML = formatMarkdown(content);
    } else {
        contentElement.innerHTML = '<p>No content available for this step</p>';
    }
}

// Format markdown-like text to HTML
function formatMarkdown(text) {
    if (!text) return '<p>No content</p>';
    
    let html = String(text);
    
    // First, handle JSON code blocks - try to extract readable content
    const jsonBlockRegex = /```json\s*([\s\S]*?)```/g;
    const jsonMatches = [...html.matchAll(jsonBlockRegex)];
    
    if (jsonMatches.length > 0) {
        // Try to parse and format JSON as readable document
        for (const match of jsonMatches) {
            try {
                const jsonData = JSON.parse(match[1]);
                const formatted = formatJsonAsDocument(jsonData);
                if (formatted && formatted.length > 100) {
                    // Replace JSON block with formatted content
                    html = html.replace(match[0], `\n\n${formatted}\n\n`);
                }
            } catch (e) {
                // Keep original if parsing fails
            }
        }
    }
    
    // Remove remaining code block markers if they contain JSON we've already processed
    html = html.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // Escape HTML first
    html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    // Headers (process in order from most specific to least)
    html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    
    // Bold (before italic to avoid conflicts)
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
    
    // Italic (avoid single asterisks that are part of bold)
    html = html.replace(/(?<!\*)\*(?!\*)([^*]+?)\*(?!\*)/g, '<em>$1</em>');
    html = html.replace(/(?<!_)_(?!_)([^_]+?)_(?!_)/g, '<em>$1</em>');
    
    // Code blocks (after processing JSON)
    html = html.replace(/```(\w+)?\s*([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
    
    // Inline code
    html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    
    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    
    // Numbered lists
    html = html.replace(/^\d+\.\s+(.*$)/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => {
        if (!match.includes('</ul>') && !match.includes('</ol>')) {
            return '<ol>' + match + '</ol>';
        }
        return match;
    });
    
    // Bullet lists
    html = html.replace(/^[-*]\s+(.*$)/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => {
        if (!match.includes('</ul>') && !match.includes('</ol>')) {
            return '<ul>' + match + '</ul>';
        }
        return match;
    });
    
    // Paragraphs (split by double newlines)
    const lines = html.split('\n\n');
    html = lines.map(line => {
        line = line.trim();
        if (!line) return '';
        // Don't wrap if it's already a block element
        if (line.match(/^<(h[1-6]|ul|ol|li|p|pre|code|div|blockquote)/)) {
            return line;
        }
        return '<p>' + line + '</p>';
    }).filter(l => l).join('\n\n');
    
    // Clean up empty paragraphs
    html = html.replace(/<p>\s*<\/p>/g, '');
    
    // Single line breaks (within paragraphs)
    html = html.replace(/(<\/p>)\n([^<])/g, '$1<br>$2');
    html = html.replace(/([^>])\n(<p>)/g, '$1<br>$2');
    
    // Unescape code blocks (they were escaped)
    html = html.replace(/&lt;pre&gt;&lt;code&gt;(.*?)&lt;\/code&gt;&lt;\/pre&gt;/gs, (match, code) => {
        code = code.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
        return '<pre><code>' + code + '</code></pre>';
    });
    
    // Unescape inline code
    html = html.replace(/&lt;code&gt;(.*?)&lt;\/code&gt;/g, '<code>$1</code>');
    
    return html;
}

// Format JSON object as readable document
function formatJsonAsDocument(obj) {
    if (!obj || typeof obj !== 'object') return '';
    
    let output = '';
    
    // Look for document-like structures
    if (obj.improved_deliverables) {
        const improved = obj.improved_deliverables.execution_summary;
        if (improved && improved.deliverables) {
            for (const deliverable of improved.deliverables) {
                if (deliverable.name) {
                    output += `# ${deliverable.name}\n\n`;
                }
                if (deliverable.sections) {
                    for (const section of deliverable.sections) {
                        if (typeof section === 'string') {
                            output += `## ${section}\n\n`;
                        } else if (section.section) {
                            output += `## ${section.section}\n\n`;
                            if (section.placeholder_guidance) {
                                output += `**Guidance:** ${section.placeholder_guidance}\n\n`;
                            }
                            if (section.completion_notes) {
                                output += `**Notes:** ${section.completion_notes}\n\n`;
                            }
                        }
                    }
                }
            }
        }
    }
    
    // Look for execution summary
    if (obj.execution_summary) {
        if (obj.execution_summary.overview) {
            output += `## Overview\n\n${obj.execution_summary.overview}\n\n`;
        }
        if (obj.execution_summary.deliverables && Array.isArray(obj.execution_summary.deliverables)) {
            output += `## Deliverables\n\n`;
            for (const deliverable of obj.execution_summary.deliverables) {
                if (deliverable.name) {
                    output += `### ${deliverable.name}\n\n`;
                    if (deliverable.notes) {
                        output += `${deliverable.notes}\n\n`;
                    }
                }
            }
        }
    }
    
    return output;
}

// Show workflow steps
function showWorkflowSteps() {
    const stepsSection = document.getElementById('workflow-steps');
    stepsSection.style.display = 'block';
    stepsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Set step as active
function setStepActive(stepNumber) {
    const step = document.querySelector(`.step[data-step="${stepNumber}"]`);
    if (step) {
        step.classList.add('active');
        step.querySelector('.step-status').textContent = 'In Progress...';
    }
}

// Set step as completed
function setStepCompleted(stepNumber) {
    const step = document.querySelector(`.step[data-step="${stepNumber}"]`);
    if (step) {
        step.classList.remove('active');
        step.classList.add('completed');
        step.querySelector('.step-status').textContent = 'Completed ✓';
    }
}

// Set step as error
function setStepError(stepNumber) {
    const step = document.querySelector(`.step[data-step="${stepNumber}"]`);
    if (step) {
        step.classList.remove('active');
        step.classList.add('error');
        step.querySelector('.step-status').textContent = 'Error ✗';
    }
}

// Switch tab
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`.tab-btn[data-tab="${tabName}"]`).classList.add('active');
    
    // Update tab panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    document.getElementById(`tab-${tabName}`).classList.add('active');
}

// Show error
function showError(message) {
    const errorSection = document.getElementById('error-section');
    const errorText = document.getElementById('error-text');
    
    errorText.textContent = message;
    errorSection.style.display = 'block';
    errorSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Clear form
function clearForm() {
    document.getElementById('task-input').value = '';
    resetUI();
}

// Reset UI
function resetUI() {
    // Hide results and errors
    document.getElementById('results-section').style.display = 'none';
    document.getElementById('error-section').style.display = 'none';
    
    // Reset workflow steps
    document.querySelectorAll('.step').forEach(step => {
        step.classList.remove('active', 'completed', 'error');
        step.querySelector('.step-status').textContent = 'Pending';
    });
    
    // Reset to summary tab
    switchTab('summary');
    
    currentResults = null;
    currentStep = 0;
}

// Update app.py to pass model name to template
// This will be done in the template rendering
