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
from utils.broker import broker

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
    attemptId: str  # Add this field
    test_type: str
    questionsAnswered: int
    correct_answers: int
    timeSpent: float
    halfCorrect: int
    reversed: int
    questionsSkipped: int
    answerChanges: int
    flaggedQuestions: int
    desired_position: str
    education_level: str

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
            **metrics.model_dump(),
            "timestamp": datetime.now().isoformat()
        }
        
        # Get analysis with position and education
        result = analyzer.analyze(
            performance_metrics,
            metrics.desired_position,
            metrics.education_level
        )
        return result
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/feedback")
async def provide_feedback(request: FeedbackRequest):
    try:
        # Convert to PerformanceMetrics with timestamp
        performance_metrics: PerformanceMetrics = {
            **request.metrics.model_dump(),
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
            **request.metrics.model_dump(),
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

@app.post("/classify")
async def classify_performance(metrics: MetricsRequest):
    try:
        metrics_dict = metrics.model_dump()
        attempt_id = metrics_dict.pop('attemptId')
        del metrics_dict['desired_position']
        del metrics_dict['education_level']
        
        performance_metrics: PerformanceMetrics = {
            **metrics_dict,
            "timestamp": datetime.now().isoformat()
        }
        
        prediction_result = analyzer.predictor.predict(performance_metrics)
        
        # Publish to message broker
        await broker.publish_classification(attempt_id, prediction_result)
        
        return {
            "prediction": prediction_result["predicted_category"],
            "confidence": prediction_result["confidence"]
        }
    
    except Exception as e:
        print(f"Error in classification: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def publish_classification_result(attempt_id: str, prediction_result: dict):
    # Implementation depends on your message broker setup
    # This is a placeholder for the actual implementation
    message = {
        "attemptId": attempt_id,
        "prediction": prediction_result["predicted_category"],
        "confidence": prediction_result["confidence"],
        "timestamp": datetime.now().isoformat()
    }
    # Publish to message broker
    # await broker.publish("test.attempts.classified", message)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
