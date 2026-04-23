const elements = {
  positive: null,
  problem: null,
  action: null,
  focusList: null,
};

export function initCoachUI() {
  elements.positive = document.getElementById("coachPositive");
  elements.problem = document.getElementById("coachProblem");
  elements.action = document.getElementById("coachAction");
  elements.focusList = document.getElementById("focusList");
}

export function renderCoach(coachData) {
  if (elements.positive) {
    elements.positive.innerText = coachData.positive || "You showed up and got the work done.";
  }

  if (elements.problem) {
    elements.problem.innerText = coachData.problem || "Nothing major to fix yet. Keep building reps.";
  }

  if (elements.action) {
    elements.action.innerText = coachData.action || "Repeat this session and keep your pace controlled.";
  }

  renderFocus(coachData.focus || []);
}

function renderFocus(focusArray) {
  if (!elements.focusList) return;
  elements.focusList.innerHTML = "";

  const items = focusArray.length ? focusArray : ["Pushups", "Squats"];
  items.slice(0, 3).forEach((item) => {
    const li = document.createElement("li");
    li.innerText = item;
    elements.focusList.appendChild(li);
  });
}
