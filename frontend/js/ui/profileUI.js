/**
 * Profile UI Module
 * Handles athlete profile data, history timeline, and streaks with a visual layout.
 */

const elements = {
    overlay: null,
    nameInput: null,
    ageInput: null,
    weightInput: null,
    goalInput: null,
    saveBtn: null,
    weeklySessions: null,
    weeklyReps: null,
    weeklyScore: null,
    streak: null,
    historyFeed: null
};

export function initProfileUI(saveCallback) {
    elements.overlay = document.getElementById("profile_overlay");
    elements.nameInput = document.getElementById("prof_name");
    elements.ageInput = document.getElementById("prof_age");
    elements.weightInput = document.getElementById("prof_weight");
    elements.goalInput = document.getElementById("prof_goal");
    elements.saveBtn = document.getElementById("save_profile_btn");
    
    elements.weeklySessions = document.getElementById("prof_weekly_sessions");
    elements.weeklyReps = document.getElementById("prof_weekly_reps");
    elements.weeklyScore = document.getElementById("prof_weekly_score");
    elements.streak = document.getElementById("prof_streak_count");
    
    elements.historyFeed = document.getElementById("prof_history_feed");

    elements.saveBtn?.addEventListener("click", () => {
        const data = {
            name: elements.nameInput.value,
            age: parseInt(elements.ageInput.value),
            weight: parseInt(elements.weightInput.value),
            goal: elements.goalInput.value
        };
        saveCallback(data);
    });

    document.getElementById("close_profile_btn")?.addEventListener("click", hideProfile);
}

export function renderProfileData(profile) {
    if (elements.nameInput) elements.nameInput.value = profile.name;
    if (elements.ageInput) elements.ageInput.value = profile.age;
    if (elements.weightInput) elements.weightInput.value = profile.weight;
    if (elements.goalInput) elements.goalInput.value = profile.goal;
}

export function renderWeeklyStats(stats) {
    if (elements.weeklySessions) {
        elements.weeklySessions.innerHTML = `
            <div class="stat-card">
                <span class="label">Weekly Sessions</span>
                <strong style="display: block; font-size: 1.5rem; color: var(--color-neon);">${stats.sessions}</strong>
            </div>`;
    }
    if (elements.weeklyReps) {
        elements.weeklyReps.innerHTML = `
            <div class="stat-card">
                <span class="label">Total Reps</span>
                <strong style="display: block; font-size: 1.5rem; color: var(--color-neon);">${stats.reps}</strong>
            </div>`;
    }
    if (elements.weeklyScore) {
        elements.weeklyScore.innerHTML = `
            <div class="stat-card">
                <span class="label">Avg Form</span>
                <strong style="display: block; font-size: 1.5rem; color: var(--color-neon);">${stats.avgScore}%</strong>
            </div>`;
    }
    if (elements.streak) {
        elements.streak.innerHTML = `
            <div class="stat-card" style="border-color: #ffaa00; background: rgba(255, 170, 0, 0.05);">
                <span class="label">Current Streak</span>
                <strong style="display: block; font-size: 1.5rem; color: #ffaa00;">${stats.streak} Days 🔥</strong>
            </div>`;
    }
}

export function renderHistory(historyHtml) {
    if (elements.historyFeed) elements.historyFeed.innerHTML = historyHtml;
}

export function showProfile() {
    elements.overlay?.classList.remove("hidden");
}

export function hideProfile() {
    elements.overlay?.classList.add("hidden");
}

export function showSaveSuccess() {
    if (elements.saveBtn) {
        const orig = elements.saveBtn.innerText;
        elements.saveBtn.innerText = "Saved!";
        setTimeout(() => { elements.saveBtn.innerText = orig; }, 2000);
    }
}
