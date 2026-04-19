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
