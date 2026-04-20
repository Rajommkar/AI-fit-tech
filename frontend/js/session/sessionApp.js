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
}

/**
 * Application entry: load exercises, MediaPipe, webcam loop.
 */
export async function startSessionApp() {
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
