/**
 * Dashboard UI Module
 * Premium post-workout analytics.
 */

const elements = {
    overlay: null,
    score: null,
    reps: null,
    duration: null,
    grid: null,
    message: null
};

export function initDashboardUI() {
    elements.overlay = document.getElementById("dashboard_overlay");
    elements.score = document.getElementById("dash_overall_score");
    elements.reps = document.getElementById("dash_total_reps");
    elements.duration = document.getElementById("dash_session_duration");
    elements.grid = document.getElementById("per_exercise_grid");
    elements.message = document.getElementById("perf_message_box");

    document.getElementById("close_dashboard_btn")?.addEventListener("click", hideDashboard);
}

export function renderDashboard(summary) {
    if (elements.score) {
        elements.score.innerHTML = `
            <div class="metric-card">
                <span class="label">PERFORMANCE SCORE</span>
                <strong style="font-size: 3rem; color: var(--color-neon);">${summary.sessionScore}</strong>
            </div>`;
    }
    if (elements.reps) {
        elements.reps.innerHTML = `
            <div class="metric-card">
                <span class="label">TOTAL REPS</span>
                <strong style="font-size: 3rem;">${summary.totalReps}</strong>
            </div>`;
    }
    if (elements.duration) {
        elements.duration.innerHTML = `
            <div class="metric-card">
                <span class="label">SESSION DURATION</span>
                <strong style="font-size: 3rem;">${summary.durationText}</strong>
            </div>`;
    }

    if (elements.message) {
        elements.message.innerHTML = `
            <div class="pill" style="width: 100%; justify-content: center; padding: 2rem; font-size: 1.5rem;">
                ${summary.insight}
            </div>`;
    }
}

export function renderExerciseBreakdown(stats) {
    if (!elements.grid) return;
    elements.grid.innerHTML = "";
    elements.grid.style.display = "grid";
    elements.grid.style.gridTemplateColumns = "repeat(auto-fill, minmax(300px, 1fr))";
    elements.grid.style.gap = "2rem";

    Object.entries(stats).forEach(([id, stat]) => {
        const card = document.createElement("div");
        card.className = "metric-card";
        card.style.textAlign = "left";
        card.innerHTML = `
            <h4 style="margin-bottom: 1.5rem; color: var(--color-neon); font-size: 1.2rem;">${stat.name}</h4>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.75rem;">
                <span class="label">Count</span>
                <strong>${stat.totalReps} Reps</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.75rem;">
                <span class="label">Accuracy</span>
                <strong style="color: ${stat.avgForm > 80 ? '#00ff00' : '#ffff00'}">${Math.round(stat.avgForm)}%</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <span class="label">Perfect Reps</span>
                <strong style="color: #00ff00;">${stat.perfect}</strong>
            </div>
        `;
        elements.grid.appendChild(card);
    });
}

export function showDashboard() {
    elements.overlay?.classList.remove("hidden");
}

export function hideDashboard() {
    elements.overlay?.classList.add("hidden");
}
