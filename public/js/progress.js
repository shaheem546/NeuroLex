// Simple load results function
function loadResults() {
    console.log('=== loadResults START ===');

    try {
        const resultsContent = document.getElementById('resultsContent');
        const studentNameDisplay = document.getElementById('studentNameDisplay');

        if (!resultsContent || !studentNameDisplay) {
            console.error('Elements not found:', { resultsContent, studentNameDisplay });
            return;
        }

        const gameResults = JSON.parse(localStorage.getItem('gameResults') || '[]');
        const filterName = localStorage.getItem('userName') || '';

        console.log('gameResults from localStorage:', gameResults);
        console.log('filterName from localStorage:', filterName);
        console.log('gameResults length:', gameResults.length);

        if (gameResults.length > 0) {
            console.log('First result playerName:', gameResults[0].playerName);
            console.log('Comparison: filterName === gameResults[0].playerName:', filterName === gameResults[0].playerName);
        }

        if (filterName) {
            studentNameDisplay.textContent = `Results for: ${filterName}`;
        } else {
            studentNameDisplay.textContent = 'All Results';
        }

        // Filter results - show ALL if no filter, otherwise filter by name
        let filteredResults = gameResults;
        if (filterName && filterName.length > 0) {
            filteredResults = gameResults.filter(r => {
                const match = r.playerName === filterName;
                console.log(`Checking: "${r.playerName}" === "${filterName}" = ${match}`);
                return match;
            });
        }

        console.log('filteredResults after filter:', filteredResults);
        console.log('filteredResults length:', filteredResults.length);

        // Sort by date descending
        filteredResults.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (filteredResults.length === 0) {
            console.log('No results found');
            resultsContent.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <i class="fas fa-inbox"></i>
                    </div>
                    <div class="empty-state-text">
                        <h3 style="margin-bottom: 0.5rem;">No Results Yet</h3>
                        <p>Complete an assessment to see your progress here.</p>
                        <p style="font-size: 0.85rem; margin-top: 0.5rem;">Debug: Looking for "${filterName}" in ${gameResults.length} results</p>
                    </div>
                    <button class="btn-back" onclick="goBack()">
                        <i class="fas fa-arrow-left"></i>
                        Back to Students
                    </button>
                </div>
            `;
            return;
        }

        // Create result cards
        const resultsHTML = filteredResults.map(result => {
            const date = new Date(result.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            const gradeLabel = {
                'grade12': 'Grade 1-2',
                'grade34': 'Grade 3-4',
                'grade56': 'Grade 5-6'
            }[result.ageGroup] || result.ageGroup;



            const disordersHTML = result.disorders && result.disorders.length > 0
                ? `
                    <div class="disorders-section">
                        <div class="disorders-title">
                            <i class="fas fa-exclamation-triangle"></i>
                            Learning Disorder Assessment
                        </div>
                        ${result.disorders.map(disorder => `
                            <div class="disorder-item">
                                <div class="disorder-name">${disorder.icon} ${disorder.name}</div>
                                <div class="disorder-desc">${disorder.description}</div>
                                <span class="disorder-severity severity-${disorder.severity.toLowerCase()}">
                                    ${disorder.severity} - ${disorder.percentage}%
                                </span>
                            </div>
                        `).join('')}
                        <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(255, 255, 255, 0.1); font-size: 0.85rem; color: var(--text-secondary);">
                            <strong>Note:</strong> These assessments are screening tools. Please consult with an educational specialist for a comprehensive evaluation.
                        </div>
                    </div>
                `
                : `
                    <div class="disorders-section" style="background: rgba(76, 175, 80, 0.1); border-color: rgba(76, 175, 80, 0.2);">
                        <div class="disorders-title" style="color: #4caf50;">
                            <i class="fas fa-check-circle"></i>
                            No Learning Disorders Detected
                        </div>
                        <p style="font-size: 0.85rem; color: var(--text-secondary);">Great work! Based on this assessment, no significant learning disorders were detected.</p>
                    </div>
                `;

            // Round values for display to avoid long decimals
            const displayScore = typeof result.score === 'number' ? Math.round(result.score * 10) / 10 : result.score;
            const displayTotal = typeof result.totalPossible === 'number' ? Math.round(result.totalPossible * 10) / 10 : result.totalPossible;
            const displayPercentage = typeof result.percentage === 'number' ? Math.round(result.percentage) : '0';

            // Round talent scores
            const talentRows = Object.entries(result.talentScores || {}).map(([talent, score]) => {
                const displayTalentScore = typeof score === 'number' ? Math.round(score * 10) / 10 : score;
                return `
                    <div class="talent-item">
                        <div class="talent-icon">${getTalentIcon(talent)}</div>
                        <div class="talent-info">
                            <div class="talent-name">${formatTalentName(talent)}</div>
                            <div class="talent-score">${displayTalentScore}</div>
                        </div>
                    </div>
                `;
            }).join('');

            return `
                <div class="result-card">
                    <div class="result-header">
                        <div>
                            <div style="font-size: 1.1rem; font-weight: 600; color: var(--text-primary);">${result.playerName}</div>
                            <div class="result-date">${date}</div>
                            <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.25rem;">${gradeLabel}</div>
                        </div>
                        <div class="result-score">
                            <div class="score-value">${displayPercentage}%</div>
                            <div class="score-label">Score</div>
                        </div>
                    </div>

                    <div class="result-details">
                        <div class="detail-item">
                            <div class="detail-icon">📊</div>
                            <div class="detail-content">
                                <div class="detail-label">Total Score</div>
                                <div class="detail-value">${displayScore}/${displayTotal}</div>
                            </div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-icon">✅</div>
                            <div class="detail-content">
                                <div class="detail-label">Questions</div>
                                <div class="detail-value">${result.challengesCompleted}</div>
                            </div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-icon">⏱️</div>
                            <div class="detail-content">
                                <div class="detail-label">Duration</div>
                                <div class="detail-value">${formatDuration(result.totalTime, result.challengesCompleted)}</div>
                            </div>
                        </div>
                    </div>

                    <div style="font-weight: 600; margin-bottom: 0.75rem; color: var(--text-primary);">Talent Scores</div>
                    <div class="talents-grid">
                        ${talentRows}
                    </div>

                    ${disordersHTML}
                </div>
            `;
        }).join('');

        console.log('Setting resultsContent HTML');
        resultsContent.innerHTML = resultsHTML;
        console.log('=== loadResults END ===');
    } catch (error) {
        console.error('Error in loadResults:', error);
        document.getElementById('resultsContent').innerHTML = `<div style="color: red; padding: 2rem;">Error: ${error.message}</div>`;
    }
}

function getTalentDisplayName(talent) {
    const names = {
        creativity: '🎨 Creativity',
        logic: '🧩 Logic',
        memory: '🧠 Memory',
        observation: '🔍 Observation',
        problemSolving: '💡 Problem Solving',
        dyscalculia: '🔢 Dyscalculia',
        dysphasia: '🗣️ Dysphasia',
        dysgraphia: '✏️ Dysgraphia'
    };
    return names[talent] || talent;
}

function getTalentIcon(talent) {
    const icons = {
        creativity: '🎨',
        logic: '🧩',
        memory: '🧠',
        observation: '🔍',
        problemSolving: '💡',
        dyscalculia: '🔢',
        dysphasia: '🗣️',
        dysgraphia: '✏️'
    };
    return icons[talent] || '✨';
}

function formatTalentName(talent) {
    const names = {
        creativity: 'Creativity',
        logic: 'Logic',
        memory: 'Memory',
        observation: 'Observation',
        problemSolving: 'Problem Solving',
        dyscalculia: 'Dyscalculia',
        dysphasia: 'Dysphasia',
        dysgraphia: 'Dysgraphia'
    };
    return names[talent] || talent;
}

function goBack() {
    // Try to go back in history if available
    if (window.history.length > 1) {
        window.history.back();
    } else {
        // Fallback to students page
        window.location.href = 'students.html';
    }
}

// Initialize on page load
console.log('Script loaded, document.readyState:', document.readyState);

function setupLogoutButton() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // Clear session data
            localStorage.removeItem('consultantLoggedIn');
            localStorage.removeItem('consultantEmail');
            // Redirect to login
            window.location.href = 'login.html';
        });
    }
}

function initPage() {
    loadResults();

    // Set up back button
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        console.log('Back button found, adding listener');
        backBtn.addEventListener('click', (e) => {
            e.preventDefault();
            goBack();
        });
    } else {
        console.warn('Back button not found');
    }

    // Set up logout button if present
    setupLogoutButton();
}

// Helper to format duration
function formatDuration(ms, questionCount) {
    if (!ms || typeof ms !== 'number') {
        // Fallback for old records without time tracking
        return `~${Math.round(questionCount * 2)} min`;
    }

    const seconds = Math.round(ms / 1000);
    if (seconds < 60) {
        return `${seconds} sec`;
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}min ${remainingSeconds}s`;
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPage);
} else {
    // DOM is already loaded
    initPage();
}
