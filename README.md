# AI Fitness Coach

Real-time posture correction + personalized coaching powered by sophisticated local arrays and 33-point geometric tracking.

## 🔹 Features
- **Real-time pose detection:** Instantaneous skeletal tracking plotting exactly 33 active spatial landmarks per frame.
- **Form correction:** Native feedback loop detecting poor execution thresholds and alerting for live depth+control adjustments.
- **Multi-exercise support:** Natively tracks arrays of dynamic JSON states for Squats, Pushups, Lunges, and static holds.
- **Analytics dashboard:** Glassmorphic layout explicitly ranking performance, session durations, and color-coded trends.
- **AI coach recommendations:** Actionable heuristic arrays executing sequential recovery prompts and targeting "Needs Work" geometry routines.

## 🔹 Tech Stack
- **JavaScript**: Core ES6 array handling logic mapping pure WebGL rendering capabilities. 
- **MediaPipe / OpenCV**: State-of-the-art vision engine executing the pure landmark mathematics.
- *(Note: Built entirely on native DOM rendering / Vanilla JS; React-less for maximum camera performance).*

## 🔹 How to Run

1. Open a terminal directly in the `frontend` directory.
2. Ensure you have Node installed, then execute:

```bash
npm install
npm run dev
```
*(Optionally: map the `backend` tracking states locally if python is required by executing `uvicorn main:app --reload` within the fastAPI folder).*

## 🔹 Screenshots

### 🖥️ Dashboard View
![Dashboard View](./frontend/public/mock-dash.jpg)
*Extensive performance analytics displaying trend computation over historical sessions.*

### 🤖 AI Coach Analytics
![Coach Engine](./frontend/public/mock-coach.jpg)
*Rule-based mathematical predictions filtering through confidence mapping arrays.*

### 📷 Live Tracking HUD
![Tracking](./frontend/public/mock-tracker.jpg)
*33-point posture rendering identifying complex joint structures instantly in the browser environment.*
