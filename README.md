# AI Fit-Tech

Real-time workout coaching powered by pose detection, form analysis, session scoring, and adaptive training guidance.

AI Fit-Tech turns a webcam into a lightweight training assistant. It tracks movement, counts reps, detects basic form issues, gives live workout feedback, and follows up with a dashboard, AI coach insights, and a day-wise workout plan.

## Highlights

- Live workout screen with rep counting, movement state, progress, tracking status, and on-video hints
- Form-aware coaching for rep-based exercises using joint-angle thresholds and state transitions
- Session dashboard with score, reps, streak, trend, and per-exercise breakdown
- AI coach summary with strengths, problems, next action, and focus exercises
- Structured 7-day plan with day-wise sets and reps
- Profile and session history stored in browser local storage

## Product Flow

`Landing -> Workout Setup -> Live Workout -> Dashboard -> AI Coach -> Plan`

## Tech Stack

- Frontend: HTML, CSS, JavaScript, Vite
- Vision: MediaPipe Tasks Vision (`@mediapipe/tasks-vision`)
- Backend: FastAPI
- Data: JSON exercise definitions + browser local storage

## Repository Structure

```text
backend/
  common/exercises.json      Exercise definitions and thresholds
  main.py                    FastAPI app and exercise API

frontend/
  index.html                 App shell and screen structure
  style.css                  Visual system and interaction styling
  main.js                    Frontend entry point
  public/logo-mark.svg       Brand logo
  js/session/                Tracking, scoring, coaching, planning logic
  js/ui/                     Screen-specific UI modules
```

## Core Features

### Live Coaching

- Camera-based pose tracking
- Rep counting with stable state transitions
- Real-time feedback like `Go lower`, `Push up`, and `Nice control`
- Tracking confidence and camera guidance
- Rep progress and movement state feedback

### Post-Workout Analysis

- Session score
- Total reps and streak
- Best exercise, weak area, and trend
- Exercise breakdown cards with rep and form summaries

### AI Guidance

- Human-style coach summary
- Focus areas based on weaker movement quality
- Goal-aware next action
- Auto-generated 7-day plan

## How It Works

### 1. Exercise Definitions

Exercises are loaded from [`backend/common/exercises.json`](./backend/common/exercises.json). These definitions include:

- tracked joints
- rep thresholds
- scoring ranges
- form feedback messages

### 2. Rep Engine

For rep-based movements, the app uses angle-based state transitions with stability-frame checks. That helps avoid noisy counting and supports simple form feedback like incomplete depth or poor posture.

### 3. Session Intelligence

Each completed rep contributes to session history. After the workout, the app generates:

- a summary dashboard
- coach advice
- a day-wise plan

## Local Setup

### Prerequisites

- Node.js 18+
- Python 3.10+

### 1. Clone the Repository

```bash
git clone https://github.com/Rajommkar/AI-fit-tech.git
cd AI-fit-tech
```

### 2. Start the Backend

```bash
cd backend
python main.py
```

The API runs on `http://localhost:8000`.

### 3. Start the Frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:5173`.

## Environment Notes

The frontend fetches exercises from:

`http://localhost:8000/exercises`

You can override that by setting `VITE_API_BASE_URL`.

Example:

```bash
VITE_API_BASE_URL=http://localhost:8000
```

## Available Scripts

In `frontend/`:

```bash
npm run dev
npm run build
npm run preview
```

## API

### `GET /`

Returns a simple API status message.

### `GET /exercises`

Returns the exercise definitions used by the frontend tracker and planner.

## Current Focus

This project currently emphasizes:

- rep-based movement tracking
- feedback-driven UX
- clean training flow
- lightweight local-first persistence

## Roadmap

- richer on-video form overlays
- broader exercise coverage
- better sequence exercise support
- stronger session analytics
- deployment-ready configuration
- mobile-friendly coaching experience

## Screens

- Landing
- Workout Setup
- Live Workout
- Dashboard
- AI Coach
- Plan
- Profile

## Author

Built by [Rajommkar](https://github.com/Rajommkar).
