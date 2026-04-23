const elements = {
  planContainer: null,
  copyButton: null,
  todayFocusText: null,
  currentPlan: [],
};

export function initPlanUI() {
  elements.planContainer = document.getElementById("planContent");
  elements.copyButton = document.getElementById("copyPlanBtn");
  elements.todayFocusText = document.getElementById("todayFocusText");
  elements.copyButton?.addEventListener("click", copyPlan);
}

export function renderPlan(planData) {
  if (!elements.planContainer) return;

  elements.currentPlan = Array.isArray(planData) ? planData : [];
  elements.planContainer.innerHTML = "";

  if (!elements.currentPlan.length) {
    if (elements.todayFocusText) {
      elements.todayFocusText.innerText = "Finish one session and we will highlight the right move for today.";
    }
    elements.planContainer.innerHTML = `
      <div class="plan-day">
        <h3>Start with one workout</h3>
        <p class="card-help">Finish a guided session and we will build your next 7 days here.</p>
      </div>
    `;
    return;
  }

  if (elements.todayFocusText) {
    const todayExercise = elements.currentPlan[0]?.exercises?.[0];
    elements.todayFocusText.innerText = todayExercise
      ? `${todayExercise.name} • ${todayExercise.sets} sets x ${todayExercise.reps} reps`
      : "Movement quality first.";
  }

  elements.currentPlan.forEach((day, index) => {
    const div = document.createElement("div");
    div.className = "plan-day";
    const statusClass = index === 0 ? "pill is-today" : index < 2 ? "pill is-complete" : "pill";
    const statusLabel = index === 0 ? "Today" : index < 2 ? "Completed" : "Upcoming";

    const itemsHTML = (day.exercises || [])
      .map((exercise) => `
        <div class="plan-item">
          <strong>${exercise.name}</strong>
          <span>${exercise.sets} sets x ${exercise.reps} reps</span>
        </div>
      `)
      .join("");

    div.innerHTML = `
      <h3>Day ${day.day || index + 1}</h3>
      <div class="plan-day__meta">
        <span class="pill">${day.goal || "GENERAL"}</span>
        <span class="pill">${day.focus || "Movement Quality"}</span>
        <span class="${statusClass} plan-day__status">${statusLabel}</span>
      </div>
      <div class="plan-day__details ${index === 0 ? "" : "hidden"}">${itemsHTML}</div>
      <button type="button" class="btn btn-outline plan-day__toggle">${index === 0 ? "Hide details" : "Show details"}</button>
    `;

    div.querySelector(".plan-day__toggle")?.addEventListener("click", () => {
      const details = div.querySelector(".plan-day__details");
      const isHidden = details?.classList.toggle("hidden");
      const toggle = div.querySelector(".plan-day__toggle");
      if (toggle) {
        toggle.innerText = isHidden ? "Show details" : "Hide details";
      }
    });

    elements.planContainer.appendChild(div);
  });
}

async function copyPlan() {
  if (!elements.currentPlan.length) return;

  const text = elements.currentPlan
    .map((day, index) => {
      const exercises = (day.exercises || [])
        .map((exercise) => `${exercise.name} - ${exercise.sets} sets x ${exercise.reps} reps`)
        .join("\n");

      return `Day ${day.day || index + 1}\n${exercises}`;
    })
    .join("\n\n");

  try {
    await navigator.clipboard.writeText(text);
    if (elements.copyButton) elements.copyButton.innerText = "Copied";
    window.setTimeout(() => {
      if (elements.copyButton) elements.copyButton.innerText = "Copy Plan";
    }, 1500);
  } catch (error) {
    console.error("Copy failed", error);
  }
}
