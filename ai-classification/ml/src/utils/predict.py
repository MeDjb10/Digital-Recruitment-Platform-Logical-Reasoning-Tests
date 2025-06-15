from typing import Dict, Any
import logging
import os
import joblib
import pandas as pd
import numpy as np
import json
from pathlib import Path

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class PerformancePredictor:
    def __init__(self, model_dir: str):
        # Set absolute model paths
        self.d70_path = r"C:\Users\tbfee\OneDrive\Desktop\pfe\Digital-Recruitment-Platform-Logical-Reasoning-Tests\ai-classification\ml\src\models\d70_model.joblib"
        self.d2000_path = r"C:\Users\tbfee\OneDrive\Desktop\pfe\Digital-Recruitment-Platform-Logical-Reasoning-Tests\ai-classification\ml\src\models\d2000_model.joblib"
        self.metadata_path = Path(self.d70_path).parent / "model_metadata.json"
        # Features match the metadata
        self.features = [
            'questionsAnswered',
            'correct_answers', 
            'timeSpent',
            'halfCorrect',
            'reversed',
            'questionsSkipped',
            'answerChanges',
            'flaggedQuestions'
        ]
        # Initialize both models as None
        self.d70_model = None
        self.d2000_model = None
        self.metadata = None
        self.load_resources()

    def load_resources(self):
        """Load models and metadata"""
        try:
            # Load d70 model
            if os.path.exists(self.d70_path):
                self.d70_model = joblib.load(self.d70_path)
                logging.info("D70 model loaded successfully")
            
            # Load d2000 model
            if os.path.exists(self.d2000_path):
                self.d2000_model = joblib.load(self.d2000_path)
                logging.info("D2000 model loaded successfully")

            if not self.d70_model and not self.d2000_model:
                raise FileNotFoundError("No models found!")            # Load metadata
            if not os.path.exists(self.metadata_path):
                raise FileNotFoundError(f"Metadata file not found at {self.metadata_path}")
            
            with open(self.metadata_path, 'r', encoding='utf-8') as f:
                self.metadata = json.load(f)
                self.category_mapping = self.metadata['category_mapping']
            logging.info("Metadata loaded successfully")

        except Exception as e:
            logging.error(f"Error loading resources: {e}")
            raise

    def predict(self, features: dict) -> dict:
        """Make a prediction based on test performance metrics"""
        try:
            # Determine which model to use based on test type
            test_type = features.get('test_type', '').lower()
            logging.info(f"Original test type: {features.get('test_type', '')}")
            
            # Convert test type to lowercase and remove any spaces or dashes
            normalized_test_type = test_type.lower().replace('-', '').replace(' ', '')
            logging.info(f"Normalized test type: {normalized_test_type}")
            
            # Check if contains 'd' and either '70' or '2000'
            if 'd' in normalized_test_type and '70' in normalized_test_type:
                model = self.d70_model
                logging.info("Using D70 model")
            elif 'd' in normalized_test_type and '2000' in normalized_test_type:
                model = self.d2000_model
                logging.info("Using D2000 model")
            else:
                logging.error(f"No matching model found for test type: {test_type} (normalized: {normalized_test_type})")
                raise ValueError(f"Unknown test type: {test_type}")

            if not model:
                raise ValueError(f"Model for test type {test_type} not loaded")

            # Create DataFrame with required features
            input_features = {k: features[k] for k in self.features if k in features}
            input_df = pd.DataFrame([input_features])
            
            # Make prediction
            prediction = model.predict(input_df)[0]
            probabilities = model.predict_proba(input_df)[0]
            
            # Debug logging
            logging.info(f"Test type: {test_type}")
            logging.info(f"Raw prediction: {prediction}")
            logging.info(f"Category mapping: {self.category_mapping}")
            
            # Generate comprehensive result
            result = {
                'test_type': test_type,
                'predicted_category': prediction,
                'confidence': float(max(probabilities)),
                'raw_features': features
            }
            return result

        except Exception as e:
            logging.error(f"Error making prediction: {e}")
            raise

    def basic_predict(self, metrics: Dict[str, Any]) -> Dict[str, Any]:
        """
        Predict performance category based on metrics.
        Currently uses a simple rule-based approach.
        """
        try:
            # Extract key metrics
            questions_answered = metrics.get('questionsAnswered', 0)
            correct_answers = metrics.get('correct_answers', 0)
            time_spent = metrics.get('timeSpent', 0)
            
            # Calculate basic metrics
            accuracy = correct_answers / questions_answered if questions_answered > 0 else 0
            completion_rate = questions_answered / 44  # Assuming D70 test with 44 questions
            
            # Simple rule-based categorization
            if accuracy >= 0.8 and completion_rate >= 0.9:
                category = "Excellent"
                confidence = 0.9
            elif accuracy >= 0.6 and completion_rate >= 0.7:
                category = "Good"
                confidence = 0.8
            elif accuracy >= 0.4 and completion_rate >= 0.5:
                category = "Average"
                confidence = 0.7
            else:
                category = "Below Average"
                confidence = 0.6
                
            return {
                "predicted_category": category,
                "confidence": confidence,
                "metrics": {
                    "accuracy": accuracy,
                    "completion_rate": completion_rate
                }
            }
            
        except Exception as e:
            logging.error(f"Prediction failed: {e}")
            return {
                "predicted_category": "Unable to predict",
                "confidence": 0.0,
                "error": str(e)
            }

def main():
    try:
        predictor = PerformancePredictor("")
        
        # Example test data matching the features from metadata
        test_features = {
            'test_type': 'd2000',  # or 'd2000'
            'questionsAnswered':40,
            'correct_answers': 20,
            'timeSpent': 20,
            'halfCorrect': 0,
            'reversed': 0,
            'questionsSkipped': 0,
            'answerChanges': 3,
            'flaggedQuestions': 2
        }
        
        result = predictor.predict(test_features)
        
        # Display results
        print("\n=== Performance Analysis ===")
        print(f"\nPredicted Level: {result['predicted_category']}")
        print(f"Confidence: {result['confidence']:.1%}")
        
    except Exception as e:
        logging.error(f"Prediction failed: {str(e)}")
        logging.error(f"Current working directory: {Path.cwd()}")

if __name__ == "__main__":
    main()
