from typing import TypedDict, List, Optional
from datetime import datetime

class PerformanceMetrics(TypedDict):
    time_passed: float
    answered_questions: int
    correct_answers: int
    skips: int
    spatial: int
    numeric: int
    arithmetic: int
    timestamp: datetime
    
class FeedbackEntry(TypedDict):
    metrics_id: str
    ai_comment: str
    is_good: bool
    feedback_text: Optional[str]
    timestamp: datetime

class SimilarCase(TypedDict):
    metrics: PerformanceMetrics
    metadata: dict
    feedback: Optional[str]

class PsychologistComment(TypedDict):
    metrics_id: str
    comment: str
    timestamp: datetime