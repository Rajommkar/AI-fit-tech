const elements = {
  repCount: null,
  feedback: null,
  feedbackCard: null,
  speed: null,
  rating: null,
  activeEx: null,
  movementState: null,
  trackingStatus: null,
  trackingConfidence: null,
  guidanceText: null,
  guidanceBanner: null,
  progressPercent: null,
  progressFill: null,
  liveHintOverlay: null,
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
  elements.trackingConfidence = document.getElementById("trackingConfidence");
  elements.guidanceText = document.getElementById("guidanceText");
  elements.guidanceBanner = document.getElementById("cameraGuidanceBanner");
  elements.progressPercent = document.getElementById("progressPercent");
  elements.progressFill = document.getElementById("progressFill");
  elements.liveHintOverlay = document.getElementById("liveHintOverlay");
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
    elements.trackingStatus.classList.toggle("pulse-status", Boolean(status.trackingActive));
  }

  if (elements.trackingConfidence) {
    elements.trackingConfidence.innerText = status.confidenceLabel || "Calibrating";
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

export function updateLiveHint(text, position) {
  if (!elements.liveHintOverlay) return;

  if (!text || !position) {
    elements.liveHintOverlay.classList.add("hidden");
    return;
  }

  elements.liveHintOverlay.classList.remove("hidden");
  elements.liveHintOverlay.innerText = text;
  elements.liveHintOverlay.style.left = `${Math.max(8, Math.min(92, position.x * 100))}%`;
  elements.liveHintOverlay.style.top = `${Math.max(10, Math.min(88, position.y * 100))}%`;
}

export function resetLiveUI() {
  updateRepDisplay(0);
  updateFeedback("Ready when you are. Get into position.", "neutral");
  updateMetrics("-", "-");
  updateStatus({
    movementState: "Hold",
    trackingStatus: "Waiting",
    confidenceLabel: "Calibrating",
    trackingActive: false,
    guidance: "Step into frame to begin tracking.",
    progressPercent: 0,
  });
  updateLiveHint(null, null);
}
