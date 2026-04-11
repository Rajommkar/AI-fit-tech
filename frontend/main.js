import { PoseLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";

// View Elements
const portalView = document.getElementById("portal_view");
const sessionView = document.getElementById("session_view");
const workoutGrid = document.getElementById("workout_grid");
const filterBar = document.getElementById("filter_bar");

// Session Elements
const video = document.getElementById("webcam");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");
const repCountEl = document.getElementById("rep_count");
const consistencyMeterEl = document.getElementById("consistency_meter");
const coachingTextEl = document.getElementById("coaching_text");
const unilateralToggle = document.getElementById("unilateral_toggle");
const sideBtns = document.querySelectorAll(".side-btn");
const exitBtn = document.getElementById("exit_session");
const saveGhostBtn = document.getElementById("save_ghost");

// App State
let poseLandmarker = undefined;
let webcamRunning = false;
let lastVideoTime = -1;
let exerciseData = [];
let currentExercise = null;
let currentView = "portal"; // "portal" or "session"
let currentSide = "left";
let socket = null;

// Biometric State
let count = 0;
let currentState = "";
let currentStageIndex = 0;
let holdStartTime = null;
let lastStateChangeTime = Date.now();
let repAngles = []; 
let consistencyScore = 100; // Start perfect
let stabilityPoints = []; // Track mid-hip for stability index
let stabilityScore = 100;
let ghostLandmarks = null; // Stored PR skeleton

// Initialization
const init = async () => {
    try {
        const response = await fetch("http://localhost:8000/exercises");
        exerciseData = await response.json();
        renderWorkoutCards("all");
    } catch (e) {
        console.error("Failed to load exercises", e);
    }

    connectWebSocket();
    setupMediaPipe();
    setupEventListeners();
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

const connectWebSocket = () => {
    socket = new WebSocket("ws://localhost:8000/ws/coaching");
    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        coachingTextEl.innerText = data.coaching;
    };
};

// Portal Logic
const renderWorkoutCards = (filter) => {
    workoutGrid.innerHTML = "";
    
    const filtered = exerciseData.filter(ex => {
        if (filter === "all") return true;
        if (filter === "yoga") return ex.id.includes("yoga") || ex.id.includes("stretch");
        if (filter === "core") return ex.id.includes("plank") || ex.id.includes("situp") || ex.id.includes("crunch");
        // Simple heuristic for demo, could be better tagged in JSON
        return true; 
    });

    filtered.forEach(ex => {
        const card = document.createElement("div");
        card.className = "workout-card animate-fade";
        card.innerHTML = `
            <div class="card-thumb">
                <div class="difficulty-tag">LEVEL ${Math.floor(Math.random() * 3) + 1}</div>
                <i class="exercise-icon">⚡</i>
            </div>
            <div class="card-content">
                <h3>${ex.name}</h3>
                <div class="card-meta">
                    <div class="meta-item"><span>⏱️</span> 5-10m</div>
                    <div class="meta-item"><span>💪</span> ${ex.type.toUpperCase()}</div>
                </div>
            </div>
        `;
        card.onclick = () => startSession(ex.id);
        workoutGrid.appendChild(card);
    });
};

// Session Logic
const startSession = async (exerciseId) => {
    currentExercise = exerciseData.find(ex => ex.id === exerciseId);
    if (!currentExercise) return;

    // Reset Session state
    count = 0;
    repAngles = [];
    consistencyScore = 100;
    repCountEl.innerText = "0";
    consistencyMeterEl.innerText = "0%";
    coachingTextEl.innerText = `Starting ${currentExercise.name}. Ready?`;

    // Tier 2: Load Ghost if exists
    const savedGhost = localStorage.getItem(`ghost_${currentExercise.id}`);
    if (savedGhost) {
        ghostLandmarks = JSON.parse(savedGhost);
    } else {
        ghostLandmarks = null;
    }

    // Handle View Transition
    portalView.classList.add("hidden");
    sessionView.classList.remove("hidden");
    currentView = "session";

    // Handle Unilateral
    if (currentExercise.unilateral) {
        unilateralToggle.classList.remove("hidden");
    } else {
        unilateralToggle.classList.add("hidden");
    }

    // Reset State Machines
    if (currentExercise.type === "rep") {
        currentState = Object.keys(currentExercise.states)[0];
    } else if (currentExercise.type === "sequence") {
        currentStageIndex = 0;
    }

    // Start Webcam
    enableCam();
};

const exitSession = () => {
    stopCam();
    sessionView.classList.add("hidden");
    portalView.classList.remove("hidden");
    currentView = "portal";
};

const enableCam = () => {
    if (!poseLandmarker) return;
    webcamRunning = true;
    navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
        video.srcObject = stream;
        video.addEventListener("loadeddata", predictWebcam);
    });
};

const stopCam = () => {
    webcamRunning = false;
    const stream = video.srcObject;
    if (stream) stream.getTracks().forEach(track => track.stop());
    video.srcObject = null;
};

// Event Listeners
const setupEventListeners = () => {
    // Filters
    filterBar.querySelectorAll(".filter-btn").forEach(btn => {
        btn.onclick = () => {
            filterBar.querySelector(".active").classList.remove("active");
            btn.classList.add("active");
            renderWorkoutCards(btn.dataset.filter);
        };
    });

    // Exit
    exitBtn.onclick = exitSession;

    // Tier 2: Save Ghost
    saveGhostBtn.onclick = () => {
        if (currentExercise && latestLandmarks) {
            ghostLandmarks = latestLandmarks;
            localStorage.setItem(`ghost_${currentExercise.id}`, JSON.stringify(ghostLandmarks));
            coachingTextEl.innerText = "GHOST PR SAVED!";
            playFeedbackSound("success");
        }
    };

    // Side Toggle
    sideBtns.forEach(btn => {
        btn.onclick = () => {
            unilateralToggle.querySelector(".active").classList.remove("active");
            btn.classList.add("active");
            currentSide = btn.dataset.side;
        };
    });
};

// Processing Loop
let latestLandmarks = null;

async function predictWebcam() {
    if (lastVideoTime !== video.currentTime) {
        lastVideoTime = video.currentTime;
        const result = poseLandmarker.detectForVideo(video, performance.now());
        
        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        
        if (result.landmarks.length > 0) {
            latestLandmarks = result.landmarks[0];
            const landmarks = latestLandmarks;
            const drawingUtils = new DrawingUtils(canvasCtx);
            
            // Tier 2: Chrono-Skeleton (Color-coded by performance)
            let skeletonColor = "#2ED0D8"; // Perfect
            if (consistencyScore < 85) skeletonColor = "#FFB000"; // Warning
            if (consistencyScore < 65 || stabilityScore < 70) skeletonColor = "#FF5A5F"; // Error
            
            // Draw Ghost if exists
            if (ghostLandmarks) {
                drawingUtils.drawConnectors(ghostLandmarks, PoseLandmarker.POSE_CONNECTIONS, { 
                    color: "rgba(255, 255, 255, 0.2)", 
                    lineWidth: 2 
                });
            }

            drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, { 
                color: skeletonColor, 
                lineWidth: 5 
            });
            drawingUtils.drawLandmarks(landmarks, { color: "#ffffff", lineWidth: 2, radius: 2 });
            
            processMotion(landmarks);
        }
        canvasCtx.restore();
    }
    if (webcamRunning) window.requestAnimationFrame(predictWebcam);
}

const processMotion = (landmarks) => {
    // Tier 2: Track Stability (Mid-Hip Variance)
    const midHip = {
        x: (landmarks[23].x + landmarks[24].x) / 2,
        y: (landmarks[23].y + landmarks[24].y) / 2
    };
    stabilityPoints.push(midHip);
    if (stabilityPoints.length > 30) {
        calculateStability();
        stabilityPoints.shift();
    }

    // Joint Mapping Wrapper
    const getL = (name) => {
        const indices = {
            "shoulder": currentSide === "left" ? 11 : 12,
            "elbow": currentSide === "left" ? 13 : 14,
            "wrist": currentSide === "left" ? 15 : 16,
            "hip": currentSide === "left" ? 23 : 24,
            "knee": currentSide === "left" ? 25 : 26,
            "ankle": currentSide === "left" ? 27 : 28
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
            repAngles.push(angle);
            calculateConsistency();
            
            // Tier 2: Rep Success Sounds
            playFeedbackSound("success");
            
            repCountEl.innerText = count;
            sendSessionUpdate();
        }
        currentState = config.next;
        lastStateChangeTime = Date.now();
    } else {
        // Tier 2: TUT Check (If stuck in a state too long)
        const timeInState = (Date.now() - lastStateChangeTime) / 1000;
        if (timeInState > 4) {
            coachingTextEl.innerText = "Keep moving! Don't stall.";
        }
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
        repCountEl.innerText = `${duration}s`;
    } else {
        holdStartTime = null;
    }
};

const handleSequenceExercise = (landmarks) => {
    const headY = landmarks[0].y;
    const stage = currentExercise.stages[currentStageIndex];
    let stageReached = false;
    
    // Stage logic (simplified for flow)
    if (stage === "STANDING" && headY < 0.4) stageReached = true;
    if (stage === "SQUAT" && headY > 0.7) stageReached = true;
    if (stage === "PLANK" && Math.abs(landmarks[11].y - landmarks[23].y) < 0.1) stageReached = true;
    if (stage === "JUMP" && headY < 0.2) stageReached = true;
    if (stage === "OVERHEAD" && landmarks[15].y < landmarks[0].y) stageReached = true;
    if (stage === "PUSHUP" && landmarks[13].y > landmarks[11].y + 0.05) stageReached = true;

    if (stageReached) {
        if (stage === currentExercise.count_on) {
            count++;
            repCountEl.innerText = count;
        }
        currentStageIndex = (currentStageIndex + 1) % currentExercise.stages.length;
    }
};

// Biometric Math & Audio
const calculateStability = () => {
    const avgX = stabilityPoints.reduce((sum, p) => sum + p.x, 0) / stabilityPoints.length;
    const variance = stabilityPoints.reduce((sum, p) => sum + Math.pow(p.x - avgX, 2), 0) / stabilityPoints.length;
    const stdDev = Math.sqrt(variance);
    
    stabilityScore = Math.max(0, 100 - (stdDev * 1000)); // Highly sensitive to side wobble
    if (stabilityScore < 70) {
        playFeedbackSound("warning");
    }
};

const playFeedbackSound = (type) => {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    if (type === "success") {
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // High A
        osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
    } else {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(110, audioCtx.currentTime); // Low A
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    }
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
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
    
    // Normalize to 0-100 score (lower stdDev is better)
    consistencyScore = Math.max(0, 100 - (stdDev * 5));
    consistencyMeterEl.innerText = `${Math.floor(consistencyScore)}%`;
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
            consistency: consistencyScore,
            type: currentExercise.type
        }));
    }
};

init();
