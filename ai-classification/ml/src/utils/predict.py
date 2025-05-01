import os
import joblib
import pandas as pd
import numpy as np
import json
from pathlib import Path
import logging

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
            'correct answers', 
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
                raise FileNotFoundError("No models found!")

            # Load metadata
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
            if test_type == 'd70':
                model = self.d70_model
            elif test_type == 'd2000':
                model = self.d2000_model
            else:
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

def main():
    try:
        predictor = PerformancePredictor("")
        
        # Example test data matching the features from metadata
        test_features = {
            'test_type': 'd2000',  # or 'd2000'
            'questionsAnswered':40,
            'correct answers': 20,
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
