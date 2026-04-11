import { PoseLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";

// UI Elements
const video = document.getElementById("webcam");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");
const repCountEl = document.getElementById("rep_count");
const powerMeterEl = document.getElementById("power_meter");
const feedbackEl = document.getElementById("feedback_msg");
const coachingTextEl = document.getElementById("coaching_text");
const exerciseSelector = document.getElementById("exercise_selector");
const startBtn = document.getElementById("start_btn");
const sideToggle = document.getElementById("side_toggle");
const toggleBtns = document.querySelectorAll(".toggle-btn");
const ghostOverlay = document.getElementById("ghost_overlay");

// State Vars
let poseLandmarker = undefined;
let webcamRunning = false;
let lastVideoTime = -1;
let exerciseData = [];
let currentExercise = null;
let currentState = "";
let currentStageIndex = 0; // For sequences
let count = 0;
let holdStartTime = null;
let currentSide = "left";
let socket = null;

// Initialization
const init = async () => {
    try {
        const response = await fetch("http://localhost:8000/exercises");
        exerciseData = await response.json();
        
        // Populate Selector
        exerciseSelector.innerHTML = exerciseData.map(ex => 
            `<option value="${ex.id}">${ex.name}</option>`
        ).join("");
        
        updateExerciseUI();
    } catch (e) {
        console.error("Failed to load exercises", e);
    }

    connectWebSocket();

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

    startBtn.disabled = false;
};

const connectWebSocket = () => {
    socket = new WebSocket("ws://localhost:8000/ws/coaching");
    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        coachingTextEl.innerText = data.coaching;
    };
};

// UI Handlers
const updateExerciseUI = () => {
    currentExercise = exerciseData.find(ex => ex.id === exerciseSelector.value);
    if (!currentExercise) return;

    document.getElementById("exercise_name").innerText = currentExercise.name;
    
    // Reset Counters
    count = 0;
    repCountEl.innerText = count;
    feedbackEl.innerText = "Position yourself";
    
    // Handle Unilateral
    if (currentExercise.unilateral) {
        sideToggle.classList.remove("hidden");
    } else {
        sideToggle.classList.add("hidden");
    }

    // Reset State Machines
    if (currentExercise.type === "rep") {
        currentState = Object.keys(currentExercise.states)[0];
    } else if (currentExercise.type === "sequence") {
        currentStageIndex = 0;
    } else if (currentExercise.type === "isometric") {
        holdStartTime = null;
        powerMeterEl.innerText = "0s";
    }

    // Show/Hide Ghost for floor exercises
    const floorExercises = [
        "plank", "glute_bridge", "situp", "crunch",
        "bird_dog", "superman", "dead_bug", "cobra_stretch", 
        "childs_pose", "boat_pose", "glute_kickback",
        "db_floor_press", "turkish_getup", "spiderman_pushup",
        "windshield_wipers", "hollow_body_hold", "hollow_rock", "donkey_kicks"
    ];
    if (floorExercises.includes(currentExercise.id)) {
        ghostOverlay.classList.remove("hidden");
    } else {
        ghostOverlay.classList.add("hidden");
    }
};

exerciseSelector.addEventListener("change", updateExerciseUI);

toggleBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        toggleBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentSide = btn.dataset.side;
        updateExerciseUI();
    });
});

const enableCam = () => {
    if (!poseLandmarker) return;
    webcamRunning = !webcamRunning;
    startBtn.innerText = webcamRunning ? "STOP SESSION" : "START SESSION";

    if (webcamRunning) {
        navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
            video.srcObject = stream;
            video.addEventListener("loadeddata", predictWebcam);
        });
    } else {
        const stream = video.srcObject;
        if (stream) stream.getTracks().forEach(track => track.stop());
        video.srcObject = null;
    }
};

startBtn.addEventListener("click", enableCam);

// Math
const calculateAngle = (a, b, c) => {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs((radians * 180.0) / Math.PI);
    if (angle > 180.0) angle = 360 - angle;
    return angle;
};

// Processing Loop
async function predictWebcam() {
    if (lastVideoTime !== video.currentTime) {
        lastVideoTime = video.currentTime;
        const result = poseLandmarker.detectForVideo(video, performance.now());
        
        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        
        if (result.landmarks.length > 0) {
            const landmarks = result.landmarks[0];
            const drawingUtils = new DrawingUtils(canvasCtx);
            drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, { color: "#7000ff", lineWidth: 4 });
            drawingUtils.drawLandmarks(landmarks, { color: "#00f2ff", lineWidth: 2 });
            
            processMotion(landmarks);
        }
        canvasCtx.restore();
    }
    if (webcamRunning) window.requestAnimationFrame(predictWebcam);
}

const processMotion = (landmarks) => {
    const sidePrefix = currentSide === "left" ? "left_" : "right_";
    
    // Joint Mapping
    const getL = (name) => {
        const indices = {
            "shoulder": currentSide === "left" ? 11 : 12,
            "elbow": currentSide === "left" ? 13 : 14,
            "wrist": currentSide === "left" ? 15 : 16,
            "hip": currentSide === "left" ? 23 : 24,
            "knee": currentSide === "left" ? 25 : 26,
            "ankle": currentSide === "left" ? 27 : 28,
            "foot": currentSide === "left" ? 31 : 32
        };
        const cleanName = name.replace("left_", "").replace("right_", "");
        return landmarks[indices[cleanName]];
    };

    if (currentExercise.type === "rep") {
        handleRepExercise(getL);
    } else if (currentExercise.type === "isometric") {
        handleIsometricExercise(getL);
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
            repCountEl.innerText = count;
            sendSessionUpdate();
        }
        currentState = config.next;
        feedbackEl.innerText = currentState;
    }
};

const handleIsometricExercise = (getL) => {
    const joints = currentExercise.joints.map(j => getL(j));
    if (!joints.every(j => j)) return;

    const angle = calculateAngle(joints[0], joints[1], joints[2]);
    const diff = Math.abs(angle - currentExercise.target_angle);
    
    if (diff < currentExercise.tolerance) {
        if (!holdStartTime) holdStartTime = Date.now();
        const duration = Math.floor((Date.now() - holdStartTime) / 1000);
        powerMeterEl.innerText = `${duration}s`;
        feedbackEl.innerText = "HOLDING!";
    } else {
        holdStartTime = null;
        feedbackEl.innerText = currentExercise.message || "Adjust your position";
    }
};

const handleSequenceExercise = (landmarks) => {
    // Simplified Burpee Logic: Standing (y < 0.3) -> Squat (y > 0.6) -> Plank (Shoulder-Hip aligned)
    const headY = landmarks[0].y;
    const stage = currentExercise.stages[currentStageIndex];
    
    let stageReached = false;
    if (stage === "STANDING" && headY < 0.4) stageReached = true;
    if (stage === "SQUAT" && headY > 0.7) stageReached = true;
    if (stage === "PLANK" && Math.abs(landmarks[11].y - landmarks[23].y) < 0.1) stageReached = true;
    if (stage === "JUMP" && headY < 0.2) stageReached = true;
    if (stage === "OVERHEAD" && landmarks[15].y < landmarks[0].y) stageReached = true; // Wrist above head
    if (stage === "FLOOR" && headY > 0.8) stageReached = true;
    if (stage === "RACK" && landmarks[15].y < landmarks[11].y) stageReached = true;
    if (stage === "ELBOW" && headY > 0.7) stageReached = true;
    if (stage === "HAND" && headY > 0.5) stageReached = true;
    if (stage === "KNEE" && headY > 0.3) stageReached = true;
    if (stage === "PIKE" && landmarks[23].y < landmarks[11].y + 0.1) stageReached = true;

    if (stageReached) {
        if (stage === currentExercise.count_on) {
            count++;
            repCountEl.innerText = count;
        }
        currentStageIndex = (currentStageIndex + 1) % currentExercise.stages.length;
        feedbackEl.innerText = currentExercise.stages[currentStageIndex];
    }
};

const evalCondition = (cond, angle) => {
    if (cond.includes(">")) return angle > parseFloat(cond.split(">")[1]);
    if (cond.includes("<")) return angle < parseFloat(cond.split("<")[1]);
    return false;
};

const sendSessionUpdate = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            exercise: currentExercise.name,
            reps: count,
            type: currentExercise.type
        }));
    }
};

init();
