import os
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI(title="AI Fit-Tech Backend")

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration (Load from environment in production)
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
client = AsyncIOMotorClient(MONGO_URI)
db = client.fit_tech

# Gemini Setup
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-1.5-flash') # Using Flash for speed/low-latency
else:
    model = None

class SessionData(BaseModel):
    user_id: str
    exercise_name: str
    total_reps: int
    avg_consistency: float
    stability_score: float
    timestamp: Optional[str] = None

@app.get("/exercises", response_model=List[Exercise])
async def get_exercises():
    try:
        with open("../common/exercises.json", "r") as f:
            data = json.load(f)
            return data["exercises"]
    except Exception as e:
        return []

@app.post("/sessions")
async def save_session(session: SessionData):
    try:
        session_dict = session.dict()
        if not session_dict["timestamp"]:
            from datetime import datetime
            session_dict["timestamp"] = datetime.utcnow().isoformat()
        
        await db.sessions.insert_one(session_dict)
        return {"status": "success", "id": str(session_dict.get("_id", ""))}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/sessions/history/{user_id}")
async def get_session_history(user_id: str):
    try:
        cursor = db.sessions.find({"user_id": user_id}).sort("timestamp", -1).limit(50)
        sessions = await cursor.to_list(length=50)
        # Convert ObjectId to string
        for s in sessions:
            s["_id"] = str(s["_id"])
        return sessions
    except Exception as e:
        return []

@app.websocket("/ws/coaching")
async def websocket_coaching(websocket: WebSocket):
    await websocket.accept()
    
    try:
        while True:
            data = await websocket.receive_json()
            
            # Post-Workout Analysis Synthesis
            if data.get("type") == "session_summary":
                if model:
                    prompt = f"""
                    You are a professional AI Biomechanics Coach. 
                    Analyze this completed workout session and provide a 2-3 sentence 'Post-Game Assessment'.
                    Be clinical, professional, and slightly encouraging.
                    Session Data: {json.dumps(data['summary'])}
                    """
                    response = model.generate_content(prompt)
                    await websocket.send_json({"summary_analysis": response.text})
                else:
                    await websocket.send_json({"summary_analysis": "Excellent performance. Your form consistency is elite."})
                continue

            # Real-time Coaching
            if model:
                prompt = f"Analyze and coach briefly: {json.dumps(data)}"
                response = model.generate_content(prompt)
                await websocket.send_json({"coaching": response.text})
            else:
                await websocket.send_json({"coaching": "Good form. Keep it up!"})
                
    except WebSocketDisconnect:
        pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
