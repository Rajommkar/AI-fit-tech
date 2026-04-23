const elements = {
  repCount: null,
  feedback: null,
  feedbackCard: null,
  speed: null,
  rating: null,
  activeEx: null,
  movementState: null,
  trackingStatus: null,
  guidanceText: null,
  guidanceBanner: null,
  progressPercent: null,
  progressFill: null,
};

export function initLiveWorkoutUI() {
  elements.repCount = document.getElementById("repCount");
  elements.feedback = document.getElementById("feedbackText");
  elements.feedbackCard = document.getElementById("feedbackCard");
  elements.speed = document.getElementById("speedVal");
  elements.rating = document.getElementById("ratingVal");
  elements.activeEx = document.getElementById("exerciseName");
  elements.movementState = document.getElementById("movementState");
  elements.trackingStatus = document.getElementById("trackingStatus");
  elements.guidanceText = document.getElementById("guidanceText");
  elements.guidanceBanner = document.getElementById("cameraGuidanceBanner");
  elements.progressPercent = document.getElementById("progressPercent");
  elements.progressFill = document.getElementById("progressFill");
}

export function updateRepDisplay(count) {
  if (!elements.repCount) return;

  const current = Number(elements.repCount.innerText || "0");
  elements.repCount.innerText = count;

  if (count > current) {
    elements.repCount.classList.remove("rep-pop");
    void elements.repCount.offsetWidth;
    elements.repCount.classList.add("rep-pop");
  }
}

export function updateFeedback(text, type = "neutral") {
  if (elements.feedback) {
    elements.feedback.innerText = text;
  }

  if (!elements.feedbackCard) return;
  elements.feedbackCard.classList.remove("is-good", "is-warning", "is-bad");

  if (type === "good") elements.feedbackCard.classList.add("is-good");
  if (type === "warning") elements.feedbackCard.classList.add("is-warning");
  if (type === "bad") elements.feedbackCard.classList.add("is-bad");
}

export function updateMetrics(speed, rating) {
  if (elements.speed) elements.speed.innerText = speed || "-";
  if (elements.rating) elements.rating.innerText = rating || "-";
}

export function updateActiveExercise(name) {
  if (elements.activeEx) elements.activeEx.innerText = name;
}

export function updateStatus(status) {
  if (elements.movementState) {
    elements.movementState.innerText = status.movementState || "Hold";
  }

  if (elements.trackingStatus) {
    elements.trackingStatus.innerText = status.trackingStatus || "Waiting";
  }

  if (elements.guidanceText) {
    elements.guidanceText.innerText = status.guidance || "Step into frame to begin tracking.";
  }

  if (elements.guidanceBanner) {
    elements.guidanceBanner.innerText = status.guidance || "Step into frame to begin tracking.";
  }

  const progress = Math.max(0, Math.min(100, Math.round(status.progressPercent || 0)));
  if (elements.progressPercent) {
    elements.progressPercent.innerText = `${progress}%`;
  }
  if (elements.progressFill) {
    elements.progressFill.style.width = `${progress}%`;
  }
}

export function resetLiveUI() {
  updateRepDisplay(0);
  updateFeedback("Ready when you are. Get into position.", "neutral");
  updateMetrics("-", "-");
  updateStatus({
    movementState: "Hold",
    trackingStatus: "Waiting",
    guidance: "Step into frame to begin tracking.",
    progressPercent: 0,
  });
}
