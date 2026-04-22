import { PoseLandmarker } from "@mediapipe/tasks-vision";
import { fetchExerciseDefinitions } from "./exercisesApi.js";
import {
  createPoseLandmarker,
  detectPoseForVideoFrame,
  drawPoseOverlay,
  syncCanvasSizeToVideo,
} from "./poseDetection.js";
import { createJointGetter } from "./landmarks.js";
import { stepRepExercise } from "./repExercise.js";
import { generateCoachAdvice } from "./coachEngine.js";

// UI Module Imports
import * as liveUI from "../ui/liveWorkoutUI.js";
import * as dashboardUI from "../ui/dashboardUI.js";
import * as coachUI from "../ui/coachUI.js";
import * as planUI from "../ui/planUI.js";
import * as profileUI from "../ui/profileUI.js";

let poseLandmarker;
let webcamRunning = false;
let lastVideoTime = -1;

let exerciseData = [];
let currentExercise = null;
let globalSessionStartTime = Date.now();

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
  repCounted: 0
};

let video, canvasElement, canvasCtx;

/**
 * Main Application State Controller
 */
const AppState = {
  LANDING: "entry_point",
  SETUP: "setup_screen",
  LIVE: "live_workout"
};

function setAppState(state) {
  console.log(`[Flow] Transitioning to state: ${state}`);
  Object.values(AppState).forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add("hidden");
    } else {
      console.warn(`[Flow] Element not found: ${id}`);
    }
  });
  
  const target = document.getElementById(state);
  if (target) {
    target.classList.remove("hidden");
    console.log(`[Flow] Successfully showed: ${state}`);
  } else {
    console.error(`[Flow] Target state element not found: ${state}`);
  }
}

function processMotionFromLandmarks(landmarks) {
  if (!currentExercise) return;

  if (currentExercise.type === "rep") {
    const getJoint = createJointGetter(landmarks);
    const result = stepRepExercise(currentExercise, getJoint, repSession, {});

    if (result) {
      const feedbackType =
        result.color === "#00ff00"
          ? "good"
          : result.color === "#ff4444" || result.color === "#ffff00"
            ? "bad"
            : "neutral";

      liveUI.updateRepDisplay(result.reps);
      liveUI.updateFeedback(result.feedback, feedbackType);
      liveUI.updateMetrics(result.speed, result.rating);
    }
  }
}

function startExercise(exerciseId) {
  const exercise = exerciseData.find((ex) => ex.id === exerciseId);
  if (!exercise) return;

  currentExercise = exercise;
  
  // Reset session metrics
  repSession.count = 0;
  repSession.repAngles = [];
  repSession.repHistory = [];
  repSession.totalScore = 0;
  repSession.repCounted = 0;
  repSession.repPhase = exercise.rep_accuracy?.start_phase || "extended";

  liveUI.updateActiveExercise(exercise.name);
  liveUI.resetLiveUI();

  // Highlight active button in setup
  document.querySelectorAll(".exercise-card").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.id === exerciseId);
  });
}

async function enableWebcam() {
  if (!video) return;
  const constraints = { video: { width: 1280, height: 720 } };
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream;
    webcamRunning = true;
    runWebcamPredictionLoop();
  } catch (err) {
    console.error("Webcam access denied", err);
    alert("Camera access is required for AI tracking.");
  }
}

function populateExerciseSelector() {
  const container = document.getElementById("exercise_selector");
  if (!container) return;
  
  container.innerHTML = "";
  // SHOW ALL EXERCISES
  exerciseData.forEach(ex => {
    const btn = document.createElement("div");
    btn.className = "exercise-card";
    btn.dataset.id = ex.id;
    btn.innerHTML = `
      <div style="font-size: 2rem; margin-bottom: 1rem;">💪</div>
      <div style="font-weight: 800;">${ex.name}</div>
    `;
    btn.onclick = () => startExercise(ex.id);
    container.appendChild(btn);
  });
}

async function runWebcamPredictionLoop() {
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
      }
      canvasCtx.restore();
    }
  }
  if (webcamRunning) requestAnimationFrame(runWebcamPredictionLoop);
}

function endWorkoutSession() {
  const history = repSession.repHistory || [];
  const exerciseStats = {};
  let totalDuration = 0;

  history.forEach(rep => {
    const id = rep.exerciseId;
    if (!exerciseStats[id]) {
      exerciseStats[id] = { name: rep.exerciseName, totalReps: 0, totalScore: 0, totalDuration: 0, perfect: 0, bad: 0 };
    }
    const stat = exerciseStats[id];
    stat.totalReps++;
    stat.totalScore += rep.formScore;
    stat.totalDuration += rep.duration;
    totalDuration += rep.duration;
    if (rep.rating === "Perfect Rep") stat.perfect++;
    if (rep.rating === "Bad Rep") stat.bad++;
  });

  let totalReps = 0, totalScore = 0, bestExercise = null, worstExercise = null;
  Object.entries(exerciseStats).forEach(([id, stat]) => {
    stat.avgForm = stat.totalScore / stat.totalReps;
    stat.avgSpeed = stat.totalDuration / stat.totalReps;
    totalReps += stat.totalReps;
    totalScore += stat.totalScore;
    if (!bestExercise || stat.avgForm > bestExercise.avgForm) bestExercise = { id, ...stat };
    if (!worstExercise || stat.avgForm < worstExercise.avgForm) worstExercise = { id, ...stat };
  });

  const sessionScore = totalReps > 0 ? Math.round(totalScore / totalReps) : 0;
  const durationMs = Date.now() - globalSessionStartTime;
  const mins = Math.floor(durationMs / 60000);
  const secs = Math.floor((durationMs % 60000) / 1000);
  
  const savedProfile = JSON.parse(localStorage.getItem("userProfile"));
  const sessions = JSON.parse(localStorage.getItem("sessions")) || [];
  sessions.push({ date: new Date(), overallScore: sessionScore, stats: exerciseStats });
  localStorage.setItem("sessions", JSON.stringify(sessions));

  const streak = calculateStreak(sessions);
  const avgPreviousScore =
    sessions.length > 1
      ? Math.round(
          sessions
            .slice(0, -1)
            .reduce((acc, session) => acc + (session.overallScore || 0), 0) /
            (sessions.length - 1)
        )
      : sessionScore;
  const trend =
    sessionScore > avgPreviousScore
      ? "Improving"
      : sessionScore < avgPreviousScore
        ? "Needs consistency"
        : "Steady";

  const summary = {
    score: sessionScore,
    totalReps,
    streak,
    best: bestExercise?.name,
    worst: worstExercise?.name,
    trend,
    durationText: `${mins}m ${secs}s`
  };

  dashboardUI.renderDashboard(summary, exerciseStats);

  const coach = generateCoachAdvice(savedProfile, sessions, exerciseStats);
  coachUI.renderCoach(coach);
  planUI.renderPlan(coach.weeklyPlan);

  dashboardUI.showDashboard();
}

export async function startSessionApp() {
  // 1. Initialize UI Modules
  liveUI.initLiveWorkoutUI();
  dashboardUI.initDashboardUI();
  coachUI.initCoachUI();
  planUI.initPlanUI();
  profileUI.initProfileUI(saveProfile);

  // 2. Setup DOM Event Listeners
  video = document.getElementById("videoFeed");
  canvasElement = document.getElementById("poseCanvas");
  canvasCtx = canvasElement.getContext("2d");

  document.getElementById("start_workout_cta")?.addEventListener("click", () => setAppState(AppState.SETUP));
  document.getElementById("begin_session_btn")?.addEventListener("click", () => {
    if (!currentExercise) {
      alert("Please select an exercise first!");
      return;
    }
    setAppState(AppState.LIVE);
    enableWebcam(); // START CAMERA
    globalSessionStartTime = Date.now();
  });
  
  // Back buttons
  document.getElementById("back_to_landing")?.addEventListener("click", () => setAppState(AppState.LANDING));
  document.getElementById("finishBtn")?.addEventListener("click", endWorkoutSession);
  
  document.getElementById("nav_profile")?.addEventListener("click", (e) => {
    e.preventDefault();
    openProfileDashboard();
  });

  // 3. Load Data
  try {
    exerciseData = await fetchExerciseDefinitions();
    populateExerciseSelector();
  } catch (e) { console.error("Data load failed", e); }

  poseLandmarker = await createPoseLandmarker();
  
  // Start Webcam
  navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
    video.srcObject = stream;
    video.addEventListener("loadeddata", runWebcamPredictionLoop, { once: true });
    webcamRunning = true;
  });
}

function saveProfile(data) {
  localStorage.setItem("userProfile", JSON.stringify(data));
  profileUI.showSaveSuccess();
}

function openProfileDashboard() {
  const profile = JSON.parse(localStorage.getItem("userProfile")) || { name: "User", age: 21, weight: 70, goal: "maintenance" };
  profileUI.renderProfileData(profile);
  profileUI.showProfile();
  
  const sessions = JSON.parse(localStorage.getItem("sessions")) || [];
  const streak = calculateStreak(sessions);
  
  profileUI.renderWeeklyStats({
    sessions: sessions.length,
    reps: sessions.reduce((acc, s) => acc + (s.totalReps || 0), 0),
    avgScore: Math.round(sessions.reduce((acc, s) => acc + s.overallScore, 0) / (sessions.length || 1)),
    streak
  });
}

function calculateStreak(sessions) {
  if (sessions.length === 0) return 0;
  let streak = 1;
  const sorted = [...sessions].sort((a, b) => new Date(b.date) - new Date(a.date));
  for (let i = 0; i < sorted.length - 1; i++) {
    const d1 = new Date(sorted[i].date).setHours(0,0,0,0);
    const d2 = new Date(sorted[i+1].date).setHours(0,0,0,0);
    const diff = (d1 - d2) / (1000 * 60 * 60 * 24);
    if (diff === 1) streak++;
    else if (diff === 0) continue;
    else break;
  }
  return streak;
}
