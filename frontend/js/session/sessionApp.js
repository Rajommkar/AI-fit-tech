import { PoseLandmarker } from "@mediapipe/tasks-vision";
import { fetchExerciseDefinitions } from "./exercisesApi.js";
import {
  createPoseLandmarker,
  detectPoseForVideoFrame,
  drawPoseOverlay,
  syncCanvasSizeToVideo,
} from "./poseDetection.js";
import { createJointGetter } from "./landmarks.js";
import { stepRepExercise, getRepDebugSnapshot } from "./repExercise.js";
import { generateCoachAdvice } from "./coachEngine.js";

import * as liveUI from "../ui/liveWorkoutUI.js";
import * as dashboardUI from "../ui/dashboardUI.js";
import * as coachUI from "../ui/coachUI.js";
import * as planUI from "../ui/planUI.js";
import * as profileUI from "../ui/profileUI.js";

const AppView = {
  LANDING: "landing",
  SETUP: "setup",
  LIVE: "live",
  DASHBOARD: "dashboard",
  COACH: "coach",
  PLAN: "plan",
  PROFILE: "profile",
};

let poseLandmarker;
let webcamRunning = false;
let cameraStream = null;
let lastVideoTime = -1;

let exerciseData = [];
let currentExercise = null;
let currentCoach = null;
let globalSessionStartTime = Date.now();

const appState = {
  currentView: AppView.LANDING,
  previousView: AppView.LANDING,
};

const repSession = {
  count: 0,
  repAngles: [],
  repPhase: "extended",
  flexedStableFrames: 0,
  extendedStableFrames: 0,
  lastRepTimeMs: 0,
  repStartTime: 0,
  formScore: 100,
  repFlags: { badPosture: false, incompleteRep: false, unstable: false },
  repHistory: [],
  totalScore: 0,
  repCounted: 0,
  lastAngle: null,
};

let video;
let canvasElement;
let canvasCtx;

function renderView(view) {
  document.querySelectorAll("[data-view]").forEach((section) => {
    section.classList.toggle("hidden", section.dataset.view !== view);
  });
  appState.currentView = view;
}

function navigateTo(view) {
  appState.previousView = appState.currentView;
  renderView(view);
}

function resetSessionState() {
  repSession.count = 0;
  repSession.repAngles = [];
  repSession.repHistory = [];
  repSession.totalScore = 0;
  repSession.repCounted = 0;
  repSession.flexedStableFrames = 0;
  repSession.extendedStableFrames = 0;
  repSession.lastRepTimeMs = 0;
  repSession.repStartTime = 0;
  repSession.formScore = 100;
  repSession.repFlags.badPosture = false;
  repSession.repFlags.incompleteRep = false;
  repSession.repFlags.unstable = false;
  repSession.lastAngle = null;
  repSession.repPhase = currentExercise?.rep_accuracy?.start_phase || "extended";
}

function startExercise(exerciseId) {
  const exercise = exerciseData.find((item) => item.id === exerciseId);
  if (!exercise) return;

  currentExercise = exercise;
  resetSessionState();

  liveUI.updateActiveExercise(exercise.name);
  liveUI.resetLiveUI();

  document.querySelectorAll(".exercise-card").forEach((card) => {
    card.classList.toggle("active", card.dataset.id === exerciseId);
  });
}

async function startWorkoutFlow(exerciseId = "pushup") {
  if (!currentExercise || currentExercise.id !== exerciseId) {
    startExercise(exerciseId);
  }

  navigateTo(AppView.LIVE);
  globalSessionStartTime = Date.now();
  liveUI.resetLiveUI();
  liveUI.updateActiveExercise(currentExercise?.name || "Pushup");
  await enableWebcam();
}

async function enableWebcam() {
  if (!video) return;

  if (cameraStream) {
    if (!webcamRunning) {
      webcamRunning = true;
      requestAnimationFrame(runWebcamPredictionLoop);
    }
    return;
  }

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { width: 1280, height: 720 },
    });
    video.srcObject = cameraStream;
    webcamRunning = true;
    video.addEventListener(
      "loadeddata",
      () => {
        lastVideoTime = -1;
        requestAnimationFrame(runWebcamPredictionLoop);
      },
      { once: true },
    );
  } catch (error) {
    console.error("Webcam access denied", error);
    liveUI.updateFeedback("Camera access is required to coach your form.", "bad");
    liveUI.updateStatus({
      movementState: "Hold",
      trackingStatus: "Camera blocked",
      guidance: "Allow camera access, then start again.",
      progressPercent: 0,
    });
  }
}

function populateExerciseSelector() {
  const container = document.getElementById("exercise_selector");
  if (!container) return;

  container.innerHTML = "";
  const shortlist = exerciseData
    .filter((exercise) => exercise.type === "rep")
    .slice(0, 4);

  shortlist.forEach((exercise) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "exercise-card";
    card.dataset.id = exercise.id;
    card.innerHTML = `
      <div class="exercise-card__icon">+</div>
      <div class="exercise-card__name">${exercise.name}</div>
    `;
    card.addEventListener("click", () => startExercise(exercise.id));
    container.appendChild(card);
  });
}

function assessTracking(landmarks) {
  if (!landmarks?.length) {
    return {
      trackingStatus: "Tracking lost",
      guidance: "Step into frame so your whole body is visible.",
      stateTone: "warning",
      active: false,
    };
  }

  const xs = landmarks.map((point) => point.x);
  const ys = landmarks.map((point) => point.y);
  const width = Math.max(...xs) - Math.min(...xs);
  const height = Math.max(...ys) - Math.min(...ys);
  const clippedTop = Math.min(...ys) < 0.02;
  const clippedBottom = Math.max(...ys) > 0.98;

  if (clippedTop || clippedBottom || height > 0.92) {
    return {
      trackingStatus: "Tracking warning",
      guidance: "Move back. Full body not visible.",
      stateTone: "warning",
      active: true,
    };
  }

  if (height < 0.35 || width < 0.18) {
    return {
      trackingStatus: "Tracking warning",
      guidance: "Move a little closer so I can track your joints.",
      stateTone: "warning",
      active: true,
    };
  }

  return {
    trackingStatus: "Tracking active",
    guidance: "Locked in. Keep moving.",
    stateTone: "good",
    active: true,
  };
}

function mapFeedbackType(color) {
  if (color === "#00ff00") return "good";
  if (color === "#ff4444") return "bad";
  if (color === "#ffff00") return "warning";
  return "neutral";
}

function humanizeFeedback(rawFeedback, feedbackType, movementState, tracking) {
  if (!tracking.active) return "Step into frame";

  const normalized = (rawFeedback || "").toLowerCase();
  if (normalized.includes("good rep")) return "Perfect rep!";
  if (normalized.includes("keep your back straight")) return "Brace your core and keep your back long";
  if (normalized.includes("go lower")) return "Go lower";
  if (normalized.includes("go deeper")) return "Go lower";
  if (normalized.includes("camera")) return "Allow camera access";
  if (feedbackType === "bad") return "Reset your form";
  if (feedbackType === "warning") return tracking.guidance === "Locked in. Keep moving." ? "Stay controlled" : tracking.guidance;
  if (movementState === "Going down") return "Go lower";
  if (movementState === "Going up") return "Push up";
  return "Nice control";
}

function deriveMovementState(exercise, debugSnapshot, tracking) {
  if (!tracking.active || !exercise?.rep_accuracy || debugSnapshot.angle == null) {
    return {
      movementState: "Hold",
      progressPercent: 0,
    };
  }

  const { flexed_max_angle: flexMax, extended_min_angle: extMin } = exercise.rep_accuracy;
  const totalRange = Math.max(1, extMin - flexMax);
  const currentAngle = debugSnapshot.angle;
  const angleDelta = repSession.lastAngle == null ? 0 : currentAngle - repSession.lastAngle;
  let progressPercent = 0;
  let movementState = "Hold";

  if (debugSnapshot.phase === "extended") {
    progressPercent = ((extMin - currentAngle) / totalRange) * 100;
    movementState = angleDelta < -1.5 ? "Going down" : "Hold";
    if (progressPercent > 90) movementState = "Hold";
  } else {
    progressPercent = ((currentAngle - flexMax) / totalRange) * 100;
    movementState = angleDelta > 1.5 ? "Going up" : "Hold";
    if (progressPercent > 92) movementState = "Hold";
  }

  repSession.lastAngle = currentAngle;

  return {
    movementState,
    progressPercent: Math.max(0, Math.min(100, progressPercent)),
  };
}

function processMotionFromLandmarks(landmarks) {
  if (!currentExercise) return;

  const tracking = assessTracking(landmarks);
  const getJoint = createJointGetter(landmarks);

  if (currentExercise.type !== "rep") {
    liveUI.updateStatus({
      movementState: "Tracking",
      progressPercent: 0,
      trackingStatus: tracking.trackingStatus,
      guidance: tracking.guidance,
    });
    liveUI.updateFeedback("Sequence tracking is on the way. Start with a rep-based movement for now.", "warning");
    return;
  }

  const result = stepRepExercise(currentExercise, getJoint, repSession);
  const debugSnapshot = getRepDebugSnapshot(currentExercise, getJoint, repSession);
  const movement = deriveMovementState(currentExercise, debugSnapshot, tracking);
  const feedbackType = mapFeedbackType(result.color);
  const feedback = humanizeFeedback(result.feedback, feedbackType, movement.movementState, tracking);

  liveUI.updateRepDisplay(result.reps);
  liveUI.updateFeedback(feedback, tracking.stateTone === "warning" && feedbackType !== "bad" ? "warning" : feedbackType);
  liveUI.updateMetrics(result.speed, result.rating);
  liveUI.updateStatus({
    movementState: movement.movementState,
    progressPercent: movement.progressPercent,
    trackingStatus: tracking.trackingStatus,
    guidance: tracking.guidance,
  });
}

function handleTrackingLost() {
  repSession.lastAngle = null;
  liveUI.updateFeedback("Step into frame", "warning");
  liveUI.updateStatus({
    movementState: "Hold",
    progressPercent: 0,
    trackingStatus: "Tracking lost",
    guidance: "Step back so your full body is visible.",
  });
  liveUI.updateMetrics("-", "-");
}

async function runWebcamPredictionLoop() {
  if (!webcamRunning || !video) return;

  if (lastVideoTime !== video.currentTime) {
    lastVideoTime = video.currentTime;
    syncCanvasSizeToVideo(video, canvasElement);

    if (poseLandmarker) {
      const result = detectPoseForVideoFrame(poseLandmarker, video);
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

      if (result.landmarks.length > 0) {
        const landmarks = result.landmarks[0];
        drawPoseOverlay(canvasCtx, landmarks, PoseLandmarker);
        processMotionFromLandmarks(landmarks);
      } else {
        handleTrackingLost();
      }

      canvasCtx.restore();
    }
  }

  requestAnimationFrame(runWebcamPredictionLoop);
}

function endWorkoutSession() {
  const history = repSession.repHistory || [];
  const exerciseStats = {};
  let totalDuration = 0;

  history.forEach((rep) => {
    const id = rep.exerciseId;
    if (!exerciseStats[id]) {
      exerciseStats[id] = {
        name: rep.exerciseName,
        totalReps: 0,
        totalScore: 0,
        totalDuration: 0,
        perfect: 0,
        bad: 0,
      };
    }

    const stat = exerciseStats[id];
    stat.totalReps += 1;
    stat.totalScore += rep.formScore;
    stat.totalDuration += rep.duration;
    totalDuration += rep.duration;
    if (rep.rating === "Perfect Rep") stat.perfect += 1;
    if (rep.rating === "Bad Rep") stat.bad += 1;
  });

  let totalReps = 0;
  let totalScore = 0;
  let bestExercise = null;
  let worstExercise = null;

  Object.entries(exerciseStats).forEach(([id, stat]) => {
    stat.avgForm = stat.totalReps > 0 ? stat.totalScore / stat.totalReps : 0;
    stat.avgSpeed = stat.totalReps > 0 ? stat.totalDuration / stat.totalReps : 0;
    totalReps += stat.totalReps;
    totalScore += stat.totalScore;

    if (!bestExercise || stat.avgForm > bestExercise.avgForm) bestExercise = { id, ...stat };
    if (!worstExercise || stat.avgForm < worstExercise.avgForm) worstExercise = { id, ...stat };
  });

  const sessionScore = totalReps > 0 ? Math.round(totalScore / totalReps) : 0;
  const durationMs = Date.now() - globalSessionStartTime;
  const mins = Math.floor(durationMs / 60000);
  const secs = Math.floor((durationMs % 60000) / 1000);

  const savedProfile = JSON.parse(localStorage.getItem("userProfile") || "null");
  const sessions = JSON.parse(localStorage.getItem("sessions") || "[]");
  sessions.push({
    date: new Date().toISOString(),
    overallScore: sessionScore,
    totalReps,
    stats: exerciseStats,
  });
  localStorage.setItem("sessions", JSON.stringify(sessions));

  const streak = calculateStreak(sessions);
  const previousScores = sessions.slice(0, -1).map((session) => session.overallScore || 0);
  const avgPreviousScore = previousScores.length
    ? Math.round(previousScores.reduce((sum, value) => sum + value, 0) / previousScores.length)
    : sessionScore;

  const trend = totalReps === 0
    ? "Start with one guided rep"
    : sessionScore > avgPreviousScore
      ? "Improving"
      : sessionScore < avgPreviousScore
        ? "Needs consistency"
        : "Steady";

  const summary = {
    score: sessionScore,
    totalReps,
    streak,
    best: bestExercise?.name || "",
    worst: worstExercise?.name || "",
    trend,
    durationText: `${mins}m ${secs}s`,
    motivation: totalReps > 0
      ? "Great session - you improved today."
      : "You finished setup. Now log your first full rep.",
  };

  dashboardUI.renderDashboard(summary, exerciseStats);
  currentCoach = generateCoachAdvice(savedProfile, sessions, exerciseStats);
  coachUI.renderCoach(currentCoach);
  planUI.renderPlan(currentCoach.weeklyPlan);

  navigateTo(AppView.DASHBOARD);
}

function openProfileDashboard() {
  const profile = JSON.parse(localStorage.getItem("userProfile") || "null") || {
    name: "User",
    age: 21,
    weight: 70,
    goal: "maintenance",
  };
  const sessions = JSON.parse(localStorage.getItem("sessions") || "[]");
  const streak = calculateStreak(sessions);

  profileUI.renderProfileData(profile);
  profileUI.renderWeeklyStats({
    sessions: sessions.length,
    reps: sessions.reduce((acc, session) => acc + (session.totalReps || 0), 0),
    avgScore: Math.round(sessions.reduce((acc, session) => acc + (session.overallScore || 0), 0) / (sessions.length || 1)),
    streak,
  });
  profileUI.renderHistory(
    sessions
      .slice(-5)
      .reverse()
      .map((session) => ({
        title: `${new Date(session.date).toLocaleDateString()} • Score ${session.overallScore || 0}`,
        subtitle: `${session.totalReps || 0} reps completed`,
      })),
  );

  navigateTo(AppView.PROFILE);
}

function saveProfile(data) {
  localStorage.setItem("userProfile", JSON.stringify(data));
  profileUI.showSaveSuccess();
}

function normalizeExerciseName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function startPlanWorkout() {
  const firstExerciseName = currentCoach?.weeklyPlan?.[0]?.exercises?.[0]?.name || "Pushup";
  const match = exerciseData.find((exercise) => {
    return normalizeExerciseName(exercise.name) === normalizeExerciseName(firstExerciseName)
      || normalizeExerciseName(exercise.id) === normalizeExerciseName(firstExerciseName);
  });

  startWorkoutFlow(match?.id || "pushup");
}

export async function startSessionApp() {
  liveUI.initLiveWorkoutUI();
  dashboardUI.initDashboardUI();
  coachUI.initCoachUI();
  planUI.initPlanUI();
  profileUI.initProfileUI(saveProfile);

  video = document.getElementById("videoFeed");
  canvasElement = document.getElementById("poseCanvas");
  canvasCtx = canvasElement.getContext("2d");

  document.getElementById("start_workout_cta")?.addEventListener("click", () => startWorkoutFlow("pushup"));
  document.getElementById("open_setup_cta")?.addEventListener("click", () => navigateTo(AppView.SETUP));
  document.getElementById("quick_start_btn")?.addEventListener("click", () => startWorkoutFlow("pushup"));
  document.getElementById("back_to_landing")?.addEventListener("click", () => navigateTo(AppView.LANDING));
  document.getElementById("begin_session_btn")?.addEventListener("click", () => {
    if (!currentExercise) {
      startExercise("pushup");
    }
    startWorkoutFlow(currentExercise?.id || "pushup");
  });
  document.getElementById("finishBtn")?.addEventListener("click", endWorkoutSession);
  document.getElementById("exit_live_btn")?.addEventListener("click", () => navigateTo(AppView.SETUP));

  document.getElementById("close_dashboard_btn")?.addEventListener("click", () => navigateTo(AppView.LANDING));
  document.getElementById("openCoachBtn")?.addEventListener("click", () => navigateTo(AppView.COACH));
  document.getElementById("openPlanBtn")?.addEventListener("click", () => navigateTo(AppView.PLAN));
  document.getElementById("backToDashboardBtn")?.addEventListener("click", () => navigateTo(AppView.DASHBOARD));
  document.getElementById("backToDashboardBtnPlan")?.addEventListener("click", () => navigateTo(AppView.DASHBOARD));
  document.getElementById("startPlanBtn")?.addEventListener("click", startPlanWorkout);
  document.getElementById("close_profile_btn")?.addEventListener("click", () => navigateTo(AppView.LANDING));

  try {
    exerciseData = await fetchExerciseDefinitions();
    populateExerciseSelector();
    startExercise("pushup");
  } catch (error) {
    console.error("Data load failed", error);
  }

  poseLandmarker = await createPoseLandmarker();
  renderView(AppView.LANDING);

  window.openProfileDashboard = openProfileDashboard;
}

function calculateStreak(sessions) {
  if (sessions.length === 0) return 0;

  let streak = 1;
  const sorted = [...sessions].sort((a, b) => new Date(b.date) - new Date(a.date));

  for (let i = 0; i < sorted.length - 1; i += 1) {
    const d1 = new Date(sorted[i].date).setHours(0, 0, 0, 0);
    const d2 = new Date(sorted[i + 1].date).setHours(0, 0, 0, 0);
    const diff = (d1 - d2) / (1000 * 60 * 60 * 24);

    if (diff === 1) streak += 1;
    else if (diff !== 0) break;
  }

  return streak;
}
