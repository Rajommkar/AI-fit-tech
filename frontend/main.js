import { PoseLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";

// View Elements
const video = document.getElementById("webcam");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");
const repCountEl = document.getElementById("rep_count");
const consistencyMeterEl = document.getElementById("consistency_meter");
const coachingTextEl = document.getElementById("coaching_text");
const exerciseSelect = document.getElementById("exercise_select");

// App State
let poseLandmarker = undefined;
let webcamRunning = false;
let lastVideoTime = -1;
let exerciseData = [];
let currentExercise = null;
let latestLandmarks = null;

// Biometric State
let count = 0;
let currentState = "";
let currentStageIndex = 0;
let repAngles = []; 
let consistencyScore = 100;

// Initialization
const init = async () => {
    try {
        const response = await fetch("http://localhost:8000/exercises");
        exerciseData = await response.json();
        populateExerciseSelect();
    } catch (e) {
        console.error("Failed to load exercises", e);
    }

    setupMediaPipe();
    enableCam();
};

const populateExerciseSelect = () => {
    exerciseSelect.innerHTML = '<option value="">Select Exercise</option>';
    exerciseData.forEach(ex => {
        const opt = document.createElement("option");
        opt.value = ex.id;
        opt.innerText = ex.name;
        exerciseSelect.appendChild(opt);
    });

    exerciseSelect.onchange = (e) => {
        const exId = e.target.value;
        if (exId) startExercise(exId);
    };
};

const setupMediaPipe = async () => {
    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );
    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
            delegate: "GPU"
        },
        runningMode: "VIDEO",
        numPoses: 1
    });
};

const startExercise = (exerciseId) => {
    currentExercise = exerciseData.find(ex => ex.id === exerciseId);
    if (!currentExercise) return;

    count = 0;
    repAngles = [];
    consistencyScore = 100;
    repCountEl.innerText = "0";
    consistencyMeterEl.innerText = "100%";
    coachingTextEl.innerText = `Starting ${currentExercise.name}. Ready?`;

    if (currentExercise.type === "rep") {
        currentState = Object.keys(currentExercise.states)[0];
    } else if (currentExercise.type === "sequence") {
        currentStageIndex = 0;
    }
};

const enableCam = () => {
    if (navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
            video.srcObject = stream;
            video.addEventListener("loadeddata", predictWebcam);
            webcamRunning = true;
        });
    }
};

async function predictWebcam() {
    if (lastVideoTime !== video.currentTime) {
        lastVideoTime = video.currentTime;
        if (poseLandmarker) {
            const result = poseLandmarker.detectForVideo(video, performance.now());
            
            canvasCtx.save();
            canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
            
            if (result.landmarks.length > 0) {
                latestLandmarks = result.landmarks[0];
                const drawingUtils = new DrawingUtils(canvasCtx);
                
                drawingUtils.drawConnectors(latestLandmarks, PoseLandmarker.POSE_CONNECTIONS, { 
                    color: "#00FF00", 
                    lineWidth: 3 
                });
                drawingUtils.drawLandmarks(latestLandmarks, { color: "#FF0000", lineWidth: 1, radius: 2 });
                
                if (currentExercise) processMotion(latestLandmarks);
            }
            canvasCtx.restore();
        }
    }
    if (webcamRunning) window.requestAnimationFrame(predictWebcam);
}

const processMotion = (landmarks) => {
    const getL = (name) => {
        const indices = {
            "left_shoulder": 11, "right_shoulder": 12,
            "left_elbow": 13, "right_elbow": 14,
            "left_wrist": 15, "right_wrist": 16,
            "left_hip": 23, "right_hip": 24,
            "left_knee": 25, "right_knee": 26,
            "left_ankle": 27, "right_ankle": 28
        };
        return landmarks[indices[name]];
    };

    if (currentExercise.type === "rep") {
        handleRepExercise(getL);
    } else if (currentExercise.type === "sequence") {
        handleSequenceExercise(landmarks);
    }
};

const handleRepExercise = (getL) => {
    const joints = currentExercise.joints.map(j => getL(j));
    if (!joints.every(j => j)) return;

    const angle = calculateAngle(joints[0], joints[1], joints[2]);
    const config = currentExercise.states[currentState];
    const conditionMet = evalCondition(config.condition, angle);
    
    if (conditionMet) {
        if (config.count_on === currentState) {
            count++;
            repAngles.push(angle);
            calculateConsistency();
            repCountEl.innerText = count;
        }
        currentState = config.next;
    }
};

const handleSequenceExercise = (landmarks) => {
    const headY = landmarks[0].y;
    const stage = currentExercise.stages[currentStageIndex];
    let stageReached = false;
    
    if (stage === "STANDING" && headY < 0.4) stageReached = true;
    if (stage === "SQUAT" && headY > 0.7) stageReached = true;
    if (stage === "PLANK" && Math.abs(landmarks[11].y - landmarks[23].y) < 0.1) stageReached = true;
    if (stage === "JUMP" && headY < 0.2) stageReached = true;

    if (stageReached) {
        if (stage === currentExercise.count_on) {
            count++;
            repCountEl.innerText = count;
        }
        currentStageIndex = (currentStageIndex + 1) % currentExercise.stages.length;
    }
};

const calculateAngle = (a, b, c) => {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs((radians * 180.0) / Math.PI);
    if (angle > 180.0) angle = 360 - angle;
    return angle;
};

const calculateConsistency = () => {
    if (repAngles.length < 2) return;
    const avg = repAngles.reduce((a, b) => a + b) / repAngles.length;
    const variance = repAngles.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / repAngles.length;
    const stdDev = Math.sqrt(variance);
    consistencyScore = Math.max(0, 100 - (stdDev * 5));
    consistencyMeterEl.innerText = `${Math.floor(consistencyScore)}%`;
};

const evalCondition = (cond, angle) => {
    if (cond.includes(">")) return angle > parseFloat(cond.split(">")[1]);
    if (cond.includes("<")) return angle < parseFloat(cond.split("<")[1]);
    return false;
};

init();
