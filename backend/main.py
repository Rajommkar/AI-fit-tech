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

class Exercise(BaseModel):
    id: str
    name: str
    type: str
    joints: Optional[List[str]] = []
    states: Optional[dict] = None
    stages: Optional[List[str]] = None
    unilateral: Optional[bool] = False
    form_checks: Optional[List[dict]] = []

@app.get("/exercises", response_model=List[Exercise])
async def get_exercises():
    # Load from common/exercises.json
    try:
        with open("../common/exercises.json", "r") as f:
            data = json.load(f)
            return data["exercises"]
    except Exception as e:
        return []

@app.websocket("/ws/coaching")
async def websocket_coaching(websocket: WebSocket):
    await websocket.accept()
    print("AI Coach Connected")
    
    try:
        while True:
            # Receive session summary from frontend
            # The frontend should send data every N seconds or after every set
            data = await websocket.receive_json()
            
            # Context-aware coaching using Gemini
            if model:
                prompt = f"""
                You are a professional AI Fitness Coach. 
                Analyze the following session data and provide 1-2 sentences of specific, motivating feedback.
                Session Data: {json.dumps(data)}
                
                Keep it short, punchy, and focused on biomechanics.
                """
                response = model.generate_content(prompt)
                await websocket.send_json({"coaching": response.text})
            else:
                await websocket.send_json({"coaching": "Great work! Keep pushing your limits."})
                
    except WebSocketDisconnect:
        print("AI Coach Disconnected")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
