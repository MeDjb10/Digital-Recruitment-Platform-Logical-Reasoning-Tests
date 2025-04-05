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
        self.model_dir = Path(model_dir)
        self.features = [
            'time_passed', 
            'answered_questions',
            'correct_answers',
            'skips',
            'spatial',
            'numeric',
            'arithmetic'
        ]
        self.load_resources()

    def load_resources(self):
        """Load model and metadata"""
        try:
            model_path = self.model_dir / 'random_forest_model.joblib'
            print(f"Looking for model at: {model_path} (Exists: {os.path.exists(model_path)})")
            # Load model
            self.model = joblib.load("C:/Users/tbfee/OneDrive/Desktop/pfe/Digital-Recruitment-Platform-Logical-Reasoning-Tests/ai-classification/ml/src/utils/random_forest_model.joblib")
            
            logging.info("Model loaded successfully")

            # Load metadata
            with open(self.model_dir / "C:/Users/tbfee/OneDrive/Desktop/pfe/Digital-Recruitment-Platform-Logical-Reasoning-Tests/ai-classification/ml/src/utils/model_metadata.json", 'r', encoding='utf-8') as f:
                self.metadata = json.load(f)
                self.category_mapping = self.metadata['category_mapping']
            logging.info("Metadata loaded successfully")

        except Exception as e:
            logging.error(f"Error loading resources: {e}")
            raise

    def predict(self, features: dict) -> dict:
        """Make a prediction based on test performance metrics"""
        try:
            # Calculate derived metrics
            features['accuracy'] = (
                (features['correct_answers'] / features['answered_questions']) * 100 
                if features['answered_questions'] > 0 else 0
            )
            features['speed'] = (
                features['answered_questions'] / features['time_passed'] 
                if features['time_passed'] > 0 else 0
            )

            # Create DataFrame with required features
            input_df = pd.DataFrame([{k: features[k] for k in self.features}])
            
            # Make prediction
            prediction = self.model.predict(input_df)[0]
            probabilities = self.model.predict_proba(input_df)[0]
            
            # Debug logging
            logging.info(f"Raw prediction: {prediction}")
            logging.info(f"Category mapping: {self.category_mapping}")
            
            # Generate comprehensive result
            result = {
                'predicted_category': prediction,
                #confidence of the ai getting the right prediction
                'confidence': float(max(probabilities)),
                'metrics': {
                    'accuracy': features['accuracy'],
                    'speed': features['speed'],
                },
            }
            return result

        except Exception as e:
            logging.error(f"Error making prediction: {e}")
            raise

def main():
    try:
        predictor = PerformancePredictor("")
        
        # Example test data
        test_features = {
            'time_passed': 15,
            'answered_questions': 44,
            'correct_answers': 30,
            'skips':0,
            'spatial':10,
            'numeric': 10,
            'arithmetic': 10
        }
        
        result = predictor.predict(test_features)
        
        # Display results
        print("\n=== Performance Analysis ===")
        print(f"\nPredicted Level: {result['predicted_category']}")
        print(f"Confidence: {result['confidence']:.1%}")
        
        print("\nPerformance Metrics:")
        print(f"Accuracy: {result['metrics']['accuracy']:.1f}%")
        print(f"Speed: {result['metrics']['speed']:.2f} questions/minute")
        
    except Exception as e:
        logging.error(f"Prediction failed: {str(e)}")
        logging.error(f"Current working directory: {Path.cwd()}")

if __name__ == "__main__":
    main()
