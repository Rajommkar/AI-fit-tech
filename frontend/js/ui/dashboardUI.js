const elements = {
    overlay: null,
    dashboard: null,
    coachSection: null,
    planSection: null,
    score: null,
    reps: null,
    streak: null,
    best: null,
    worst: null,
    trend: null,
    breakdown: null,
};

export function initDashboardUI() {
    elements.overlay = document.getElementById("dashboard_overlay");
    elements.dashboard = document.getElementById("dashboard");
    elements.coachSection = document.getElementById("coachSection");
    elements.planSection = document.getElementById("planSection");
    elements.score = document.getElementById("scoreVal");
    elements.reps = document.getElementById("totalRepsVal");
    elements.streak = document.getElementById("streakVal");
    elements.best = document.getElementById("bestExercise");
    elements.worst = document.getElementById("worstExercise");
    elements.trend = document.getElementById("trendVal");
    elements.breakdown = document.getElementById("exerciseBreakdown");

    document.getElementById("close_dashboard_btn")?.addEventListener("click", hideDashboard);
    document.getElementById("openCoachBtn")?.addEventListener("click", openCoach);
    document.getElementById("openPlanBtn")?.addEventListener("click", openPlan);
    document.getElementById("backToDashboardBtn")?.addEventListener("click", showDashboardHome);
    document.getElementById("backToDashboardBtnPlan")?.addEventListener("click", showDashboardHome);
}

export function renderDashboard(summary, stats) {
    if (elements.score) elements.score.innerText = summary.score;
    if (elements.reps) elements.reps.innerText = summary.totalReps;
    if (elements.streak) elements.streak.innerText = summary.streak;
    if (elements.best) elements.best.innerText = summary.best || "—";
    if (elements.worst) elements.worst.innerText = summary.worst || "—";
    if (elements.trend) elements.trend.innerText = summary.trend || "—";

    renderBreakdown(stats);
    showDashboardHome();
}

function renderBreakdown(stats) {
    if (!elements.breakdown) return;
    elements.breakdown.innerHTML = "";

    Object.values(stats).forEach((stat) => {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <h3>${stat.name}</h3>
            <p>Reps: ${stat.totalReps}</p>
            <p>Form: ${Math.round(stat.avgForm)}%</p>
        `;
        elements.breakdown.appendChild(card);
    });
}

export function showDashboard() {
    elements.overlay?.classList.remove("hidden");
    showDashboardHome();
}

export function hideDashboard() {
    elements.overlay?.classList.add("hidden");
}

export function showDashboardHome() {
    elements.coachSection?.classList.add("hidden");
    elements.planSection?.classList.add("hidden");
}

export function openCoach() {
    elements.coachSection?.classList.remove("hidden");
    elements.planSection?.classList.add("hidden");
}

export function openPlan() {
    elements.planSection?.classList.remove("hidden");
    elements.coachSection?.classList.add("hidden");
}

window.openCoach = openCoach;
window.openPlan = openPlan;
