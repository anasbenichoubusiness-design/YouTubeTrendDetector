// YouTube Outlier Detector - Frontend JavaScript

const API_BASE = 'http://localhost:5001/api';

// DOM Elements
const formCard = document.getElementById('formCard');
const progressCard = document.getElementById('progressCard');
const resultsCard = document.getElementById('resultsCard');
const errorCard = document.getElementById('errorCard');

const detectionForm = document.getElementById('detectionForm');
const submitBtn = document.getElementById('submitBtn');

const progressBar = document.getElementById('progressBar');
const progressPercentage = document.getElementById('progressPercentage');
const currentStep = document.getElementById('currentStep');

const newDetectionBtn = document.getElementById('newDetectionBtn');
const retryBtn = document.getElementById('retryBtn');

let currentJobId = null;
let statusCheckInterval = null;

// Form submission
detectionForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(detectionForm);
    const params = {
        query: formData.get('query'),
        max_pages: parseInt(formData.get('max_pages')),
        published_days: parseInt(formData.get('published_days')),
        min_views: parseInt(formData.get('min_views')),
        region: formData.get('region'),
    };

    // Add sheet_id only if provided
    const sheetId = formData.get('sheet_id');
    if (sheetId && sheetId.trim()) {
        params.sheet_id = sheetId.trim();
    }

    await startDetection(params);
});

// Start detection
async function startDetection(params) {
    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-text">Starting...</span>';

        const response = await fetch(`${API_BASE}/detect`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(params),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to start detection');
        }

        const data = await response.json();
        currentJobId = data.job_id;

        // Switch to progress view
        showCard('progress');

        // Start polling for status
        startStatusPolling();

    } catch (error) {
        showError(error.message);
        submitBtn.disabled = false;
        submitBtn.innerHTML = `
            <span class="btn-text">Start Detection</span>
            <svg class="btn-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M4 10H16M16 10L11 5M16 10L11 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
    }
}

// Poll for job status
function startStatusPolling() {
    statusCheckInterval = setInterval(checkStatus, 2000); // Check every 2 seconds
    checkStatus(); // Check immediately
}

function stopStatusPolling() {
    if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
        statusCheckInterval = null;
    }
}

async function checkStatus() {
    if (!currentJobId) return;

    try {
        const response = await fetch(`${API_BASE}/status/${currentJobId}`);

        if (!response.ok) {
            throw new Error('Failed to get status');
        }

        const data = await response.json();

        updateProgress(data);

        if (data.status === 'completed') {
            stopStatusPolling();
            showResults(data.results);
        } else if (data.status === 'failed') {
            stopStatusPolling();
            showError(data.error || 'Detection failed');
        }

    } catch (error) {
        console.error('Status check error:', error);
    }
}

// Update progress UI
function updateProgress(data) {
    const progress = data.progress || 0;

    // Update progress bar
    progressBar.style.width = `${progress}%`;
    progressPercentage.textContent = `${progress}%`;

    // Update current step text
    currentStep.textContent = data.current_step || 'Processing...';

    // Update step indicators
    const steps = document.querySelectorAll('.step');
    steps.forEach((step, index) => {
        const stepNumber = index + 1;
        const stepProgress = (stepNumber / 6) * 100;

        if (progress >= stepProgress) {
            step.classList.add('completed');
            step.classList.remove('active');
        } else if (progress >= (stepProgress - 16)) {
            step.classList.add('active');
            step.classList.remove('completed');
        } else {
            step.classList.remove('active', 'completed');
        }
    });
}

// Show results
function showResults(results) {
    showCard('results');

    // Update summary stats
    document.getElementById('totalVideos').textContent = results.total_videos || 0;
    document.getElementById('outlierCount').textContent = results.outliers?.length || 0;
    document.getElementById('ideaCount').textContent = results.ideas?.length || 0;

    // Update sheet link
    const sheetLink = document.getElementById('sheetLink');
    sheetLink.href = results.sheet_url;

    // Display outliers
    const outliersList = document.getElementById('outliersList');
    outliersList.innerHTML = '';

    if (results.outliers && results.outliers.length > 0) {
        results.outliers.forEach(outlier => {
            const item = createOutlierItem(outlier);
            outliersList.appendChild(item);
        });
    } else {
        outliersList.innerHTML = '<p style="color: var(--text-secondary);">No outliers found</p>';
    }

    // Display ideas
    const ideasList = document.getElementById('ideasList');
    ideasList.innerHTML = '';

    if (results.ideas && results.ideas.length > 0) {
        results.ideas.forEach(idea => {
            const item = createIdeaItem(idea);
            ideasList.appendChild(item);
        });
    } else {
        ideasList.innerHTML = '<p style="color: var(--text-secondary);">No ideas generated</p>';
    }
}

// Create outlier item element
function createOutlierItem(outlier) {
    const div = document.createElement('div');
    div.className = 'outlier-item';

    const gradeClass = `grade-${outlier.grade?.toLowerCase().replace('+', '-plus') || 'c'}`;

    div.innerHTML = `
        <div class="outlier-title">${escapeHtml(outlier.title || 'Untitled')}</div>
        <div class="outlier-meta">
            <span class="grade ${gradeClass}">${outlier.grade || 'N/A'}</span>
            <span>👁️ ${formatNumber(outlier.views || 0)} views</span>
            <span>📊 Score: ${(outlier.composite_score || 0).toFixed(2)}</span>
            ${outlier.channel_name ? `<span>📺 ${escapeHtml(outlier.channel_name)}</span>` : ''}
        </div>
    `;

    return div;
}

// Create idea item element
function createIdeaItem(idea) {
    const div = document.createElement('div');
    div.className = 'idea-item';

    div.innerHTML = `
        <div class="outlier-title">${escapeHtml(idea.title || idea.suggested_title || 'Idea')}</div>
        <div class="outlier-meta">
            ${idea.strategy ? `<span>💡 ${escapeHtml(idea.strategy)}</span>` : ''}
            ${idea.confidence ? `<span>📈 Confidence: ${idea.confidence}</span>` : ''}
            ${idea.rationale ? `<span>${escapeHtml(idea.rationale)}</span>` : ''}
        </div>
    `;

    return div;
}

// Show error
function showError(message) {
    showCard('error');
    document.getElementById('errorMessage').textContent = message;
}

// Show specific card
function showCard(cardType) {
    formCard.classList.add('hidden');
    progressCard.classList.add('hidden');
    resultsCard.classList.add('hidden');
    errorCard.classList.add('hidden');

    switch (cardType) {
        case 'form':
            formCard.classList.remove('hidden');
            break;
        case 'progress':
            progressCard.classList.remove('hidden');
            break;
        case 'results':
            resultsCard.classList.remove('hidden');
            break;
        case 'error':
            errorCard.classList.remove('hidden');
            break;
    }
}

// New detection button
newDetectionBtn.addEventListener('click', () => {
    currentJobId = null;
    detectionForm.reset();
    submitBtn.disabled = false;
    submitBtn.innerHTML = `
        <span class="btn-text">Start Detection</span>
        <svg class="btn-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M4 10H16M16 10L11 5M16 10L11 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
    `;
    showCard('form');
});

// Retry button
retryBtn.addEventListener('click', () => {
    showCard('form');
});

// Utility functions
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    stopStatusPolling();
});
