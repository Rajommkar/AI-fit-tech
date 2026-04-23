import os
import json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from typing import List

app = FastAPI(title="AI Fit-Tech | Biomechanical API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "AI Fit-Tech Baseline API"}

@app.get("/exercises")
async def get_exercises():
    try:
        file_path = os.path.join(os.path.dirname(__file__), "common", "exercises.json")
        with open(file_path, "r") as f:
            data = json.load(f)
            return data["exercises"]
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
