const elements = {
  score: null,
  scoreSummary: null,
  reps: null,
  repsHelp: null,
  streak: null,
  streakHelp: null,
  best: null,
  worst: null,
  trend: null,
  breakdown: null,
};

export function initDashboardUI() {
  elements.score = document.getElementById("scoreVal");
  elements.scoreSummary = document.getElementById("scoreSummary");
  elements.reps = document.getElementById("totalRepsVal");
  elements.repsHelp = document.getElementById("totalRepsHelp");
  elements.streak = document.getElementById("streakVal");
  elements.streakHelp = document.getElementById("streakHelp");
  elements.best = document.getElementById("bestExercise");
  elements.worst = document.getElementById("worstExercise");
  elements.trend = document.getElementById("trendVal");
  elements.breakdown = document.getElementById("exerciseBreakdown");
}

export function renderDashboard(summary, stats) {
  const hasWorkoutData = summary.totalReps > 0;

  if (elements.score) elements.score.innerText = hasWorkoutData ? summary.score : "-";
  if (elements.scoreSummary) {
    elements.scoreSummary.innerText = hasWorkoutData
      ? `${summary.durationText} of work. ${summary.motivation}`
      : "Start your first workout to unlock your score.";
  }

  if (elements.reps) elements.reps.innerText = hasWorkoutData ? summary.totalReps : "-";
  if (elements.repsHelp) {
    elements.repsHelp.innerText = hasWorkoutData
      ? `${summary.totalReps} reps completed this session.`
      : "No reps logged yet. Start a session to see live totals here.";
  }

  if (elements.streak) elements.streak.innerText = summary.streak > 0 ? summary.streak : "-";
  if (elements.streakHelp) {
    elements.streakHelp.innerText = summary.streak > 1
      ? `Nice work. You are on a ${summary.streak}-session streak.`
      : "Show up again tomorrow to build momentum.";
  }

  if (elements.best) elements.best.innerText = summary.best || "Need a session first";
  if (elements.worst) elements.worst.innerText = summary.worst || "No weak spot yet";
  if (elements.trend) elements.trend.innerText = summary.trend || "Waiting for more data";

  renderBreakdown(stats, hasWorkoutData);
}

function renderBreakdown(stats, hasWorkoutData) {
  if (!elements.breakdown) return;
  elements.breakdown.innerHTML = "";

  if (!hasWorkoutData) {
    const emptyCard = document.createElement("div");
    emptyCard.className = "card";
    emptyCard.innerHTML = `
      <h3>Breakdown</h3>
      <p>Start your first workout</p>
      <span class="card-help">Finish one guided session and we will show reps, form score, and weak points here.</span>
    `;
    elements.breakdown.appendChild(emptyCard);
    return;
  }

  Object.values(stats).forEach((stat) => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <h3>${stat.name}</h3>
      <p>${stat.totalReps}</p>
      <span class="card-help">Form ${Math.round(stat.avgForm)}% • ${stat.perfect || 0} strong reps</span>
    `;
    elements.breakdown.appendChild(card);
  });
}
