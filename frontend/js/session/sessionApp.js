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
/** @type {HTMLSelectElement} */
let exerciseSelect;

/**
 * Pose landmarks → exercise-specific rep / sequence logic.
 * @param {import('@mediapipe/tasks-vision').NormalizedLandmark[]} landmarks
 */
function processMotionFromLandmarks(landmarks) {
  if (!currentExercise) return;

  const type = currentExercise.type;
  if (type === "rep") {
    const getJoint = createJointGetter(landmarks);
    stepRepExercise(currentExercise, getJoint, repSession, {
      repCountEl,
      consistencyMeterEl,
    });
    return;
  }
  if (type === "sequence") {
    stepSequenceExercise(currentExercise, landmarks, sequenceSession, {
      repCountEl,
    });
  }
}

function startExercise(exerciseId) {
  const exercise = exerciseData.find((ex) => ex.id === exerciseId);
  if (!exercise) return;

  currentExercise = exercise;

  repSession.count = 0;
  repSession.repAngles = [];
  repSession.currentState = "";
  sequenceSession.count = 0;
  sequenceSession.currentStageIndex = 0;

  repCountEl.innerText = "0";
  consistencyMeterEl.innerText = "100%";
  coachingTextEl.innerText = `Starting ${exercise.name}. Ready?`;

  if (exercise.type === "rep") {
    repSession.currentState = Object.keys(exercise.states)[0];
  }
}

function populateExerciseSelect() {
  exerciseSelect.innerHTML = '<option value="">Select Exercise</option>';
  for (const ex of exerciseData) {
    const opt = document.createElement("option");
    opt.value = ex.id;
    opt.innerText = ex.name;
    exerciseSelect.appendChild(opt);
  }

  exerciseSelect.onchange = (e) => {
    const target = /** @type {HTMLSelectElement} */ (e.target);
    const id = target.value;
    if (id) startExercise(id);
  };
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
  exerciseSelect = document.getElementById("exercise_select");
}

/**
 * Application entry: load exercises, MediaPipe, webcam loop.
 */
export async function startSessionApp() {
  cacheDomReferences();

  try {
    exerciseData = await fetchExerciseDefinitions();
    populateExerciseSelect();
  } catch (e) {
    console.error("Failed to load exercises", e);
  }

  poseLandmarker = await createPoseLandmarker();
  enableWebcam();
}
