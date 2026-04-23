const elements = {
  screen: null,
  nameInput: null,
  ageInput: null,
  weightInput: null,
  goalInput: null,
  saveBtn: null,
  weeklySessions: null,
  weeklyReps: null,
  weeklyScore: null,
  streak: null,
  historyFeed: null,
};

export function initProfileUI(saveCallback) {
  elements.screen = document.getElementById("profile_screen");
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
      name: elements.nameInput?.value || "User",
      age: parseInt(elements.ageInput?.value || "21", 10),
      weight: parseInt(elements.weightInput?.value || "70", 10),
      goal: elements.goalInput?.value || "maintenance",
    };
    saveCallback(data);
  });
}

export function renderProfileData(profile) {
  if (elements.nameInput) elements.nameInput.value = profile.name || "";
  if (elements.ageInput) elements.ageInput.value = profile.age || "";
  if (elements.weightInput) elements.weightInput.value = profile.weight || "";
  if (elements.goalInput) elements.goalInput.value = profile.goal || "maintenance";
}

export function renderWeeklyStats(stats) {
  if (elements.weeklySessions) {
    elements.weeklySessions.innerHTML = statMarkup("Weekly Sessions", stats.sessions);
  }
  if (elements.weeklyReps) {
    elements.weeklyReps.innerHTML = statMarkup("Total Reps", stats.reps);
  }
  if (elements.weeklyScore) {
    elements.weeklyScore.innerHTML = statMarkup("Avg Form", `${stats.avgScore}%`);
  }
  if (elements.streak) {
    elements.streak.innerHTML = statMarkup("Current Streak", `${stats.streak} days`);
  }
}

export function renderHistory(items) {
  if (!elements.historyFeed) return;

  if (!items?.length) {
    elements.historyFeed.innerHTML = "Your session history will appear here.";
    return;
  }

  elements.historyFeed.innerHTML = items
    .map((item) => `
      <div class="plan-item">
        <strong>${item.title}</strong>
        <span>${item.subtitle}</span>
      </div>
    `)
    .join("");
}

export function showSaveSuccess() {
  if (!elements.saveBtn) return;

  const original = elements.saveBtn.innerText;
  elements.saveBtn.innerText = "Saved";
  window.setTimeout(() => {
    elements.saveBtn.innerText = original;
  }, 1500);
}

function statMarkup(label, value) {
  return `
    <div class="plan-item">
      <strong>${value}</strong>
      <span>${label}</span>
    </div>
  `;
}
