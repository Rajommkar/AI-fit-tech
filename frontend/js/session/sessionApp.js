import { PoseLandmarker } from "@mediapipe/tasks-vision";
import { fetchExerciseDefinitions } from "./exercisesApi.js";
import {
  createPoseLandmarker,
  detectPoseForVideoFrame,
  drawPoseOverlay,
  syncCanvasSizeToVideo,
} from "./poseDetection.js";
import { createJointGetter } from "./landmarks.js";
import { getRepDebugSnapshot, stepRepExercise } from "./repExercise.js";
import { stepSequenceExercise } from "./sequenceExercise.js";

/** @type {import('@mediapipe/tasks-vision').PoseLandmarker | undefined} */
let poseLandmarker;
let webcamRunning = false;
let lastVideoTime = -1;

/** @type {object[]} */
let exerciseData = [];
/** @type {object | null} */
let currentExercise = null;

let globalSessionStartTime = Date.now();

const repSession = {
  currentState: "",
  count: 0,
  /** @type {number[]} */
  repAngles: [],
  /** "extended" | "flexed" — used when exercise.rep_accuracy is set */
  repPhase: "extended",
  flexedStableFrames: 0,
  extendedStableFrames: 0,
  lastRepTimeMs: 0,
  
  // For Speed + Score tracking
  repStartTime: 0,
  formScore: 100,
  repFlags: { badPosture: false, incompleteRep: false, unstable: false },
  repHistory: [],
  
  // Session Performance Tracking
  totalScore: 0,
  repCounted: 0
};

const sequenceSession = {
  currentStageIndex: 0,
  count: 0,
};

/** @type {HTMLVideoElement} */
let video;
/** @type {HTMLCanvasElement} */
let canvasElement;
/** @type {CanvasRenderingContext2D} */
let canvasCtx;
/** @type {HTMLElement} */
let repCountEl;
/** @type {HTMLElement} */
let consistencyMeterEl;
/** @type {HTMLElement} */
let coachingTextEl;
/** @type {HTMLElement} */
let exerciseButtonsContainerEl;
/** @type {HTMLElement} */
let activeExerciseTitleEl;
/** @type {HTMLElement} */
let activeExerciseHudEl;

/** @type {HTMLElement} */
let repSpeedHudEl;
/** @type {HTMLElement} */
let repRatingHudEl;

/** @type {HTMLElement | null} */
let repDebugOverlay = null;

/**
 * Pose landmarks → exercise-specific rep / sequence logic.
 * @param {import('@mediapipe/tasks-vision').NormalizedLandmark[]} landmarks
 */
function processMotionFromLandmarks(landmarks) {
  if (!currentExercise) return;

  const type = currentExercise.type;
  if (type === "rep") {
    const getJoint = createJointGetter(landmarks);
    const result = stepRepExercise(currentExercise, getJoint, repSession, {
      repCountEl,
      consistencyMeterEl
    });

    if (result && result.feedback) {
      coachingTextEl.innerText = result.feedback;
      coachingTextEl.style.color = result.color || "#ffffff";
    }

    if (result && result.rating) {
      if (repRatingHudEl) repRatingHudEl.innerText = result.rating;
    }
    
    if (result && result.speed) {
      if (repSpeedHudEl) repSpeedHudEl.innerText = result.speed;
    }
    if (repDebugOverlay) {
      const snap = getRepDebugSnapshot(currentExercise, getJoint, repSession);
      const angleStr =
        snap.angle === null ? "—" : `${snap.angle.toFixed(1)}°`;
      repDebugOverlay.innerHTML = [
        `angle: ${angleStr}`,
        `phase: ${snap.phase}`,
        `state: ${snap.state}`,
        `mode: ${snap.mode}`,
        `fFrames: ${snap.flexedStableFrames} · eFrames: ${snap.extendedStableFrames}`,
      ].join("<br>");
    }
    return;
  }
  if (type === "sequence") {
    stepSequenceExercise(currentExercise, landmarks, sequenceSession, {
      repCountEl,
    });
    if (repDebugOverlay) {
      repDebugOverlay.innerHTML = [
        "angle: —",
        "phase: —",
        `state: stage ${sequenceSession.currentStageIndex}`,
        "mode: sequence",
      ].join("<br>");
    }
  }
}

function setupRepDebugOverlay() {
  if (!new URLSearchParams(window.location.search).has("repDebug")) return;
  const el = document.createElement("div");
  el.className = "rep-debug-overlay";
  el.setAttribute("aria-hidden", "true");
  el.textContent = "rep debug — select exercise";
  document.body.appendChild(el);
  repDebugOverlay = el;
}

function startExercise(exerciseId) {
  const exercise = exerciseData.find((ex) => ex.id === exerciseId);
  if (!exercise) return;

  currentExercise = exercise;

  repSession.count = 0;
  repSession.repAngles = [];
  repSession.currentState = "";
  repSession.flexedStableFrames = 0;
  repSession.extendedStableFrames = 0;
  repSession.lastRepTimeMs = 0;
  repSession.repPhase = "extended";
  sequenceSession.count = 0;
  sequenceSession.currentStageIndex = 0;

  repCountEl.innerText = "0";
  consistencyMeterEl.innerText = "100%";
  if (activeExerciseTitleEl) {
    activeExerciseTitleEl.innerText = `${exercise.name} Tracker`;
  }
  if (activeExerciseHudEl) {
    activeExerciseHudEl.innerText = exercise.name;
  }
  coachingTextEl.innerText = `Switched to ${exercise.name}. Ready?`;
  coachingTextEl.style.color = "#ffffff";
  if (repSpeedHudEl) repSpeedHudEl.innerText = "—";
  if (repRatingHudEl) repRatingHudEl.innerText = "—";

  // Update button active states
  if (exerciseButtonsContainerEl) {
    for (const btn of exerciseButtonsContainerEl.children) {
      if (btn.dataset.id === exerciseId) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    }
  }

  if (exercise.type === "rep") {
    if (exercise.rep_accuracy) {
      const start = exercise.rep_accuracy.start_phase || "extended";
      repSession.repPhase = start === "flexed" ? "flexed" : "extended";
    } else {
      repSession.currentState = Object.keys(exercise.states)[0];
    }
  }
}

function populateExerciseButtons() {
  if (!exerciseButtonsContainerEl) return;
  exerciseButtonsContainerEl.innerHTML = '';
  
  const targetExercises = ["pushup", "squat", "lunge", "bicep_curl"];
  const filteredData = exerciseData.filter((ex) => targetExercises.includes(ex.id));

  for (const ex of filteredData) {
    const btn = document.createElement("button");
    btn.className = "exercise-btn";
    btn.dataset.id = ex.id;
    btn.innerText = ex.name;
    btn.onclick = () => startExercise(ex.id);
    exerciseButtonsContainerEl.appendChild(btn);
  }
}

function enableWebcam() {
  if (!navigator.mediaDevices?.getUserMedia) return;

  navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
    video.srcObject = stream;
    video.addEventListener("loadeddata", runWebcamPredictionLoop, { once: true });
    webcamRunning = true;
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
      } else if (repDebugOverlay && currentExercise?.type === "rep") {
        repDebugOverlay.textContent = "no pose";
      }
      canvasCtx.restore();
    }
  }
  if (webcamRunning) {
    window.requestAnimationFrame(runWebcamPredictionLoop);
  }
}

function cacheDomReferences() {
  video = document.getElementById("webcam");
  canvasElement = document.getElementById("output_canvas");
  const ctx = canvasElement.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");
  canvasCtx = ctx;
  repCountEl = document.getElementById("rep_count");
  consistencyMeterEl = document.getElementById("consistency_meter");
  coachingTextEl = document.getElementById("coaching_text");
  exerciseButtonsContainerEl = document.getElementById("exercise_buttons");
  activeExerciseTitleEl = document.getElementById("active_exercise_title");
  activeExerciseHudEl = document.getElementById("active_exercise_hud");
  repSpeedHudEl = document.getElementById("rep_speed_hud");
  repRatingHudEl = document.getElementById("rep_rating_hud");

  document.getElementById("end_session_btn")?.addEventListener("click", endWorkoutSession);
  document.getElementById("close_dashboard_btn")?.addEventListener("click", () => {
    document.getElementById("dashboard_overlay")?.classList.add("hidden");
  });
}

/**
 * Stop tracking and generate analytics dashboard payload
 */
function endWorkoutSession() {
  const history = repSession.repHistory || [];
  const exerciseStats = {};

  history.forEach(rep => {
    const ex = rep.exerciseName;
    if (!exerciseStats[ex]) {
      exerciseStats[ex] = {
        totalReps: 0,
        totalScore: 0,
        totalDuration: 0,
        perfect: 0,
        bad: 0
      };
    }
    const stat = exerciseStats[ex];
    stat.totalReps++;
    stat.totalScore += rep.formScore;
    stat.totalDuration += rep.duration;

    if (rep.rating === "Perfect Rep") stat.perfect++;
    if (rep.rating === "Bad Rep") stat.bad++;
  });

  let totalReps = 0;
  let totalScore = 0;
  let bestExercise = null;
  let worstExercise = null;

  Object.entries(exerciseStats).forEach(([ex, stat]) => {
    stat.avgForm = stat.totalScore / stat.totalReps;
    stat.avgSpeed = stat.totalDuration / stat.totalReps;
    
    totalReps += stat.totalReps;
    totalScore += stat.totalScore;

    if (!bestExercise || stat.avgForm > bestExercise.avgForm) {
      bestExercise = { name: ex, ...stat };
    }
    if (!worstExercise || stat.avgForm < worstExercise.avgForm) {
      worstExercise = { name: ex, ...stat };
    }
  });

  const overallScore = totalReps > 0 ? (totalScore / totalReps) : 0;
  const sessionScore = Math.round(overallScore);
  
  // Persist into memory
  let sessions = JSON.parse(localStorage.getItem("sessions")) || [];
  
  // 1. Trend Calculation
  let trendStr = "—";
  if (sessions.length > 0) {
    const lastSession = sessions[sessions.length - 1]; // Wait, if we push *after* getting, the last is index - 1
    const improvement = sessionScore - Math.round(lastSession.overallScore);
    if (improvement > 0) {
      trendStr = `<span style="color: #00ff00;">+${improvement}% improvement</span>`;
    } else if (improvement < 0) {
      trendStr = `<span style="color: #ff4444;">${improvement}% dropped</span>`;
    } else {
      trendStr = "No Change";
    }
  }

  sessions.push({
    date: new Date(),
    stats: exerciseStats,
    overallScore
  });
  localStorage.setItem("sessions", JSON.stringify(sessions));

  // 7. Session Duration Computation
  const durationMs = Date.now() - globalSessionStartTime;
  const mins = Math.floor(durationMs / 60000);
  const secs = Math.floor((durationMs % 60000) / 1000);

  // Render UI with Color Coding and Insight
  let insight = "Focus on form";
  let messageColor = "#ff4444"; // Red for poor
  
  if (overallScore > 85) {
    insight = "Excellent session!";
    messageColor = "#00ff00"; // Green for good
  } else if (overallScore > 65) {
    insight = "Good, but improve consistency";
    messageColor = "#ffff00"; // Yellow for medium
  }

  const msgBox = document.getElementById("perf_message_box");
  if (msgBox) {
    msgBox.innerText = totalReps > 0 ? insight : "No reps recorded.";
    msgBox.style.color = messageColor;
    msgBox.style.borderColor = messageColor;
    msgBox.style.background = `rgba(${messageColor === "#00ff00" ? '0,255,0' : messageColor === '#ffff00' ? '255,255,0' : '255,68,68'}, 0.1)`;
  }
  
  document.getElementById("dash_session_duration").innerText = `${mins}m ${secs}s`;
  document.getElementById("dash_session_trend").innerHTML = trendStr;
  
  document.getElementById("dash_total_reps").innerText = totalReps;
  document.getElementById("dash_total_exercises").innerText = Object.keys(exerciseStats).length;
  document.getElementById("dash_overall_score").innerText = `${sessionScore}/100`;

  // 2. Ranking Format overrides
  document.getElementById("dash_best_ex").innerText = bestExercise ? `${bestExercise.name} (${Math.round(bestExercise.avgForm)}%)` : "—";
  document.getElementById("dash_worst_ex").innerText = worstExercise ? `${worstExercise.name} (${Math.round(worstExercise.avgForm)}%)` : "—";

  const grid = document.getElementById("per_exercise_grid");
  if (grid) {
    grid.innerHTML = "";
    
    // 6. Sort Exercise array natively
    const sortedStats = Object.entries(exerciseStats).sort((a, b) => b[1].avgForm - a[1].avgForm);
    
    sortedStats.forEach(([ex, stat]) => {
      grid.innerHTML += `
        <div class="exercise-card">
          <h4>${ex}</h4>
          <p><span>Reps</span> <strong>${stat.totalReps}</strong></p>
          <p><span>Avg Form</span> <strong>${Math.round(stat.avgForm)}%</strong></p>
          <p><span>Avg Speed</span> <strong>${Math.round(stat.avgSpeed)}ms</strong></p>
          <p><span>Perfect</span> <strong>${stat.perfect}</strong></p>
          <p><span>Needs Work</span> <strong>${stat.bad}</strong></p>
        </div>
      `;
    });
  }

  // Finally show overlay
  document.getElementById("dashboard_overlay")?.classList.remove("hidden");
}

/**
 * Application entry: load exercises, MediaPipe, webcam loop.
 */
export async function startSessionApp() {
  globalSessionStartTime = Date.now();
  cacheDomReferences();
  setupRepDebugOverlay();

  try {
    exerciseData = await fetchExerciseDefinitions();
    populateExerciseButtons();
  } catch (e) {
    console.error("Failed to load exercises", e);
  }

  poseLandmarker = await createPoseLandmarker();
  enableWebcam();
}
