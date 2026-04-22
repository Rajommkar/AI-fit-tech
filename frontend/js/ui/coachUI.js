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
        elements.positive.innerText = coachData.positive || "Good consistency overall.";
    }

    if (elements.problem) {
        elements.problem.innerText = coachData.problem || "No major issues detected.";
    }

    if (elements.action) {
        elements.action.innerText = coachData.action || "Maintain your current training level.";
    }

    renderFocus(coachData.focus || []);
}

function renderFocus(focusArray) {
    if (!elements.focusList) return;
    elements.focusList.innerHTML = "";

    focusArray.forEach((item) => {
        const li = document.createElement("li");
        li.innerText = item;
        elements.focusList.appendChild(li);
    });
}
