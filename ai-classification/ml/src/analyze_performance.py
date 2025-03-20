from models.predict import PerformancePredictor
import requests
import json
import logging
from pathlib import Path
from typing import Dict, Any
from datetime import datetime

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class PerformanceAnalyzer:
    def __init__(self, model_dir: str = "models"):
        self.predictor = PerformancePredictor(model_dir)
        self.ollama_url = "http://localhost:11434/api/chat"
        self.feedback_history = []

    def analyze(self, metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze performance metrics and generate AI commentary"""
        try:
            # Get prediction
            prediction_result = self.predictor.predict(metrics)
            
            # Generate AI comment
            ai_comment = self._generate_ai_comment(metrics, prediction_result)
            
            # Combine results
            return {
                "metrics": metrics,
                "prediction": prediction_result,
                "ai_analysis": ai_comment
            }
            
        except Exception as e:
            logging.error(f"Analysis failed: {e}")
            raise

    def _generate_ai_comment(self, metrics: Dict[str, Any], prediction: Dict[str, Any]) -> str:
        """Generate detailed AI commentary using Ollama"""
        try:
            # Create detailed prompt
            prompt = f"""
            Analyze the following test performance data and provide a professional but brief assessment:

            Test Performance:
            - Time Taken: {metrics['time_passed']:.1f} minutes
            - Questions Answered: {metrics['answered_questions']}
            - Correct Answers: {metrics['correct_answers']}
            - Questions Skipped: {metrics['skips']}
            - Spatial Questions Correct: {metrics['spatial']}
            - Numeric Questions Correct: {metrics['numeric']}
            - Arithmetic Questions Correct: {metrics['arithmetic']}

            Performance Level: {prediction['predicted_category']}
            Confidence: {prediction['confidence']:.1%}

            Provide a detailed but concise analysis that:
            1. Evaluates overall performance
            2. Points out key strengths
            3. Identifies areas for improvement
            4. Suggests specific steps for enhancement
            
            Keep the tone professional and constructive.
            """

            # Prepare request
            data = {
                "model": "deepseek-r1:8b",
                "messages": [{"role": "user", "content": prompt}],
                "stream": False
            }
            
            # Make API request
            response = requests.post(self.ollama_url, json=data)
            response.raise_for_status()
            
            # Extract and return comment
            return response.json()["message"]["content"].strip()
            
        except Exception as e:
            logging.error(f"Failed to generate AI comment: {e}")
            return "Unable to generate AI analysis at this time."

    def provide_feedback(self, metrics: Dict[str, Any], ai_comment: str, is_good: bool, feedback_text: str = "") -> str:
        """Provide feedback on AI comment quality and get improved response"""
        try:
            feedback_prompt = f"""
            Previous performance analysis for these metrics:
            {json.dumps(metrics, indent=2)}

            Previous AI comment:
            "{ai_comment}"

            This comment was marked as {'GOOD' if is_good else 'NEEDS IMPROVEMENT'}.
            Additional feedback: {feedback_text}

            Please provide a {'similar style of analysis' if is_good else 'revised analysis addressing the feedback'}.
            """

            # Store feedback for learning
            self.feedback_history.append({
                "metrics": metrics,
                "original_comment": ai_comment,
                "is_good": is_good,
                "feedback": feedback_text,
                "timestamp": datetime.now().isoformat()
            })

            # Make new API request with feedback context
            data = {
                "model": "deepseek-r1:8b",
                "messages": [{"role": "user", "content": feedback_prompt}],
                "stream": False
            }
            
            response = requests.post(self.ollama_url, json=data)
            response.raise_for_status()
            
            return response.json()["message"]["content"].strip()

        except Exception as e:
            logging.error(f"Failed to process feedback: {e}")
            return "Unable to generate improved analysis at this time."

    def save_feedback_history(self, filepath: str = "feedback_history.json"):
        """Save feedback history to a file"""
        try:
            with open(filepath, 'w') as f:
                json.dump(self.feedback_history, f, indent=2)
            logging.info(f"Feedback history saved to {filepath}")
        except Exception as e:
            logging.error(f"Failed to save feedback history: {e}")

def main():
    analyzer = PerformanceAnalyzer()
    
    test_metrics = {
        'time_passed': 25,
        'answered_questions': 40,
        'correct_answers': 35,
        'skips': 5,
        'spatial': 8,
        'numeric': 10,
        'arithmetic': 17
    }
    
    try:
        # Initial analysis
        result = analyzer.analyze(test_metrics)
        
        print("\n=== Initial Performance Analysis ===")
        print("\nAI Analysis:")
        print(result['ai_analysis'])
        
        # Get feedback from user
        while True:
            feedback = input("\nWas this analysis good? (y/n/q to quit): ").lower()
            if feedback == 'q':
                break
                
            if feedback in ['y', 'n']:
                if feedback == 'n':
                    feedback_text = input("Please provide specific feedback: ")
                else:
                    feedback_text = "Good analysis, maintain this style"
                
                # Get improved analysis
                improved_analysis = analyzer.provide_feedback(
                    test_metrics,
                    result['ai_analysis'],
                    feedback == 'y',
                    feedback_text
                )
                
                print("\n=== Improved Analysis ===")
                print(improved_analysis)
                
                # Save feedback history
                analyzer.save_feedback_history()
                
                # Ask if user wants to provide more feedback
                continue_feedback = input("\nWould you like to provide feedback on this new analysis? (y/n): ").lower()
                if continue_feedback != 'y':
                    break
                
                result['ai_analysis'] = improved_analysis
            else:
                print("Please enter 'y' for yes, 'n' for no, or 'q' to quit")
        
    except Exception as e:
        logging.error(f"Analysis failed: {str(e)}")

if __name__ == "__main__":
    main()
