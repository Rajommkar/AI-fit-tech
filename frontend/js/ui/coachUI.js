const elements = {
  positive: null,
  problem: null,
  action: null,
  focusList: null,
  confidence: null,
};

export function initCoachUI() {
  elements.positive = document.getElementById("coachPositive");
  elements.problem = document.getElementById("coachProblem");
  elements.action = document.getElementById("coachAction");
  elements.focusList = document.getElementById("focusList");
  elements.confidence = document.getElementById("coachConfidence");
}

export function renderCoach(coachData) {
  if (elements.positive) {
    elements.positive.innerHTML = highlightText(coachData.positive || "You showed up and got the work done.");
  }

  if (elements.problem) {
    elements.problem.innerHTML = highlightText(coachData.problem || "Nothing major to fix yet. Keep building reps.");
  }

  if (elements.action) {
    elements.action.innerHTML = highlightText(coachData.action || "Repeat this session and keep your pace controlled.");
  }

  if (elements.confidence) {
    elements.confidence.innerText = coachData.confidence || "High";
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

function highlightText(text) {
  return text
    .replace(/\b(solid progress|confidence|depth|control|momentum|next step)\b/gi, '<span class="coach-highlight">$1</span>')
    .replace(/\b(great|nice|strong)\b/gi, '<span class="coach-highlight">$1</span>');
}
