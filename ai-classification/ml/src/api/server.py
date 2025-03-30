from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
import sys
from pathlib import Path

# Add parent directory to path to import utils
sys.path.append(str(Path(__file__).parent.parent))
from utils.performance_analyzer import PerformanceAnalyzer
from utils.db_schema import PerformanceMetrics

app = FastAPI(title="Performance Analysis API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize analyzer with the model directory path
model_dir = str(Path(__file__).parent.parent / "Models")
analyzer = PerformanceAnalyzer(model_dir)

class MetricsRequest(BaseModel):
    time_passed: float
    answered_questions: int
    correct_answers: int
    skips: int
    spatial: int
    numeric: int
    arithmetic: int

class FeedbackRequest(BaseModel):
    metrics: MetricsRequest
    ai_comment: str
    is_good: bool
    feedback_text: Optional[str] = ""

class PsychologistCommentRequest(BaseModel):
    metrics: MetricsRequest
    comment: str

@app.post("/analyze")
async def analyze_performance(metrics: MetricsRequest):
    try:
        # Convert to PerformanceMetrics with timestamp
        performance_metrics: PerformanceMetrics = {
            **metrics.dict(),
            "timestamp": datetime.now()
        }
        
        # Get analysis
        result = analyzer.analyze(performance_metrics)
        return result
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/feedback")
async def provide_feedback(request: FeedbackRequest):
    try:
        # Convert to PerformanceMetrics with timestamp
        performance_metrics: PerformanceMetrics = {
            **request.metrics.dict(),
            "timestamp": datetime.now().isoformat()
        }
        
        # Process feedback
        improved_analysis = analyzer.provide_feedback(
            performance_metrics,
            request.ai_comment,
            request.is_good,
            request.feedback_text
        )
        
        return {"improved_analysis": improved_analysis}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/comment")
async def add_psychologist_comment(request: PsychologistCommentRequest):
    try:
        # Convert to PerformanceMetrics with timestamp
        performance_metrics: PerformanceMetrics = {
            **request.metrics.dict(),
            "timestamp": datetime.now().isoformat()
        }
        
        # Add psychologist comment
        success = analyzer.add_psychologist_comment(
            performance_metrics,
            request.comment
        )
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to store psychologist comment")
            
        return {"message": "Psychologist comment stored successfully"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/clear-database")
async def clear_database():
    try:
        success = analyzer.clear_database()
        if success:
            return {"message": "Database cleared successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to clear database")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
