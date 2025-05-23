from typing import TypedDict, List, Optional
from datetime import datetime

class PerformanceMetrics(TypedDict):
    answered_questions: int
    correct_answers: int
    timeSpent: int
    halfCorrect: int
    reversed: int
    questionsSkipped: int
    answerChanges: int
    flaggedQuestions: int
    timestamp: str
    desired_position: Optional[str]
    education_level: Optional[str]
    
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