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
2. Run the dev server: `npm run dev`

## 📊 Exercise Database
The platform supports 75+ exercises out of the box, with rules defined in `common/exercises.json`.

---
Developed by [Rajommkar](https://github.com/Rajommkar)
