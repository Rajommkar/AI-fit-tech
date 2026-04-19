# AI Fit-Tech | Pro Biometrics & Coaching

AI Fit-Tech is a high-performance fitness tracking platform that uses computer vision to provide real-time biomechanical analysis and AI-powered coaching feedback.

## ✨ Key Features
- **Real-time Pose Estimation**: Uses MediaPipe to track 33 body landmarks with high precision.
- **Biomechanical Analytics**: Automatically calculates joint angles for accurate form tracking.
- **AI Coach**: Integrated with Gemini 1.5 Flash to provide context-aware, motivating feedback via WebSockets.
- **Multi-Exercise Support**:
    - **Rep-based**: Squats, Pushups, Bicep Curls, Lunges, etc.
    - **Isometric**: Plank, Wall Sit, Side Plank.
    - **Sequences**: Multi-stage movements like Burpees.
- **Premium HUD**: Neon-accented, glassmorphic UI for a sleek workout experience.

## 🚀 Tech Stack
- **Frontend**: HTML5, Vanilla CSS, JavaScript (ES6+), MediaPipe Tasks Vision.
- **Backend**: FastAPI (Python), WebSockets, Google Generative AI (Gemini).
- **Common**: Shared exercise definitions in JSON format.

## 📁 Session tracker layout (Week 1 · Day 1 refactor)

The camera session is split by responsibility under `frontend/js/session/`:

- **`poseDetection.js`** — MediaPipe pose landmarker setup, per-frame `detectForVideo`, skeleton overlay, canvas size matched to video.
- **`landmarks.js`** — Maps joint names from `common/exercises.json` to MediaPipe landmark indices.
- **`geometry.js`** — Joint angle in degrees and evaluation of simple angle conditions from JSON.
- **`repExercise.js`** — Rep state machine for exercises with `type: "rep"`.
- **`sequenceExercise.js`** — Stage progression for `type: "sequence"` (e.g. burpee).
- **`consistency.js`** — Rep-to-rep angle variance shown as the consistency percentage.
- **`exercisesApi.js`** — Fetches exercise definitions from the backend (`VITE_API_BASE_URL`, default `http://localhost:8000`).
- **`sessionApp.js`** — DOM references, webcam loop, and wiring from landmarks → rep or sequence logic.

The Vite entry file `frontend/main.js` only imports `startSessionApp()` from `sessionApp.js`.

### Example: how one pushup rep is counted (~30 seconds)

1. **Data** — In `common/exercises.json`, the pushup entry is `type: "rep"` with three joints (shoulder → elbow → wrist) and a **state machine** (`UP` / `DOWN`) where each state has a string condition on the elbow angle, e.g. `angle < 80`, and a `next` state. One state may set `count_on` so a rep increments when that transition happens.

2. **Pose** — Each frame, MediaPipe in `poseDetection.js` returns normalized landmarks. `sessionApp.js` passes them into the rep pipeline.

3. **Angle** — `repExercise.js` resolves the three joint positions, then `geometry.js` computes the **interior angle at the elbow** in degrees (2D in x/y, same as before the refactor).

4. **Rep** — If the current state’s condition is true, the machine advances to `next`. If `count_on` matches the state you are leaving, the rep counter increases and the angle is stored for the **consistency** meter (`consistency.js`).

No separate “pushup detector”: behavior is entirely **JSON + shared geometry + one rep state machine**.

### Rep accuracy tuning (Week 1 · Day 2)

For `type: "rep"` entries you can add optional **`rep_accuracy`** so counting uses **separate flex vs extend angle limits**, **consecutive stable frames** (noise rejection), and a **cooldown** between counted reps. Exercises without `rep_accuracy` still use the legacy `states` machine.

| Field | Meaning |
|--------|---------|
| `flexed_max_angle` | Angle must stay **below** this to register the “deep” part of the rep (stable frames accumulate). |
| `extended_min_angle` | Angle must stay **above** this for the “top” / lockout part. |
| `required_frames` | How many consecutive frames in-bucket before a phase change (default `3`). |
| `cooldown_ms` | Minimum milliseconds between **incremented** reps (default `500`). Phase still resets so you do not get stuck. |
| `start_phase` | `"extended"` or `"flexed"` (default `"extended"`). |

One full rep = **extended → flexed → extended** with stable frames at each end; the rep increments when returning to extended after a cooldown check.

## 🛠️ Setup Instructions

### Backend
1. Initialize a Python virtual environment: `python -m venv venv`
2. Activate venv: `.\venv\Scripts\activate` (Windows)
3. Install dependencies: `pip install fastapi uvicorn google-generativeai motor`
4. Set your environment variables:
   - `GEMINI_API_KEY`: Your Google AI API Key.
5. Run the server: `python main.py`

### Frontend
1. Install dependencies: `npm install`
2. Optional: copy `frontend/.env.example` to `frontend/.env` and set `VITE_API_BASE_URL` if the API is not on `http://localhost:8000`.
3. Run the dev server: `npm run dev`

## 📊 Exercise Database
The platform supports 100 total exercises out of the box, with rules defined in `common/exercises.json`.

---
Developed by [Rajommkar](https://github.com/Rajommkar)
