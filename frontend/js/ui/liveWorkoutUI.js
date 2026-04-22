const elements = {
    repCount: null,
    feedback: null,
    speed: null,
    rating: null,
    activeEx: null,
};

export function initLiveWorkoutUI() {
    elements.repCount = document.getElementById("repCount");
    elements.feedback = document.getElementById("feedbackText");
    elements.speed = document.getElementById("speedVal");
    elements.rating = document.getElementById("ratingVal");
    elements.activeEx = document.getElementById("exerciseName");
}

export function updateRepDisplay(count) {
    if (elements.repCount) {
        elements.repCount.innerText = count;
    }

    const btn = document.getElementById("finishBtn");
    if (btn) btn.disabled = !(count > 0);
}

export function updateFeedback(text, type = "neutral") {
    if (elements.feedback) {
        elements.feedback.innerText = text;

        if (type === "good") elements.feedback.style.color = "#00ff88";
        else if (type === "bad") elements.feedback.style.color = "#ff4d4d";
        else elements.feedback.style.color = "#aaa";
    }
}

export function updateMetrics(speed, rating) {
    if (elements.speed) {
        elements.speed.innerText = speed || "—";
    }

    if (elements.rating) {
        elements.rating.innerText = rating || "—";
    }
}

export function updateActiveExercise(name) {
    if (elements.activeEx) elements.activeEx.innerText = name;
}

export function resetLiveUI() {
    updateRepDisplay(0);
    updateFeedback("Ready? Start your first rep.");
    updateMetrics("—", "—");
}
