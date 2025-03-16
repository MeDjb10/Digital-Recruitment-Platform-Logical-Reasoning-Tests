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
        self.load_resources()

    def load_resources(self):
        """Load model and metadata"""
        try:
            # Load model
            self.model = joblib.load(self.model_dir / 'random_forest_model.joblib')
            logging.info("Model loaded successfully")

            # Load metadata
            with open(self.model_dir / 'model_metadata.json', 'r', encoding='utf-8') as f:
                self.metadata = json.load(f)
                self.features = self.metadata['features']
                self.category_mapping = self.metadata['category_mapping']
            logging.info("Metadata loaded successfully")

            # Load scaler
            scaler_path = self.model_dir.parent / 'data/processed/standard_scaler.joblib'
            self.scaler = joblib.load(scaler_path)
            logging.info("Scaler loaded successfully")

        except Exception as e:
            logging.error(f"Error loading resources: {e}")
            raise

    def predict(self, features: dict) -> dict:
        """Make a prediction with confidence scores and interpretation"""
        try:
            # Create DataFrame with base features only
            input_features = {k: features[k] for k in self.features}
            input_df = pd.DataFrame([input_features])
            
            # Scale features
            scaled_features = self.scaler.transform(input_df)
            
            # Get prediction and probabilities
            prediction_idx = int(self.model.predict(scaled_features)[0])  # Convert to int
            probabilities = self.model.predict_proba(scaled_features)[0]
            
            # Get ordered categories
            categories = sorted(self.category_mapping.keys(), 
                             key=lambda x: self.category_mapping[x])
            
            # Get predicted category using the index
            predicted_category = categories[prediction_idx]
            
            # Create result dictionary
            result = {
                'predicted_category': predicted_category,
                'confidence_scores': dict(zip(categories, map(float, probabilities))),
                'interpretation': self._generate_interpretation(
                    features, 
                    predicted_category,
                    float(probabilities[prediction_idx])
                )
            }
            
            return result

        except Exception as e:
            logging.error(f"Error making prediction: {e}")
            raise

    def _generate_interpretation(self, features: dict, category: str, confidence: float) -> dict:
        """Generate human-readable interpretation of the results"""
        strength_indicators = []
        improvement_areas = []
        
        # Analyze accuracy
        if features['accuracy'] >= 75:
            strength_indicators.append("High accuracy in answers")
        elif features['accuracy'] <= 30:
            improvement_areas.append("Focus on answer accuracy")

        # Analyze skip rate
        skip_rate = features['skips'] / (features['skips'] + features['answered_questions'])
        if skip_rate > 0.5:
            improvement_areas.append("High number of skipped questions")
        elif skip_rate < 0.2:
            strength_indicators.append("Good question completion rate")

        # Analyze speed
        if features['speed'] > 1.0:
            strength_indicators.append("Quick response time")
        elif features['speed'] < 0.3:
            improvement_areas.append("Work on time management")

        return {
            'summary': f"Performance indicates {category} level with {confidence:.1%} confidence",
            'strengths': strength_indicators,
            'improvements': improvement_areas
        }

def main():
    # Example usage with more realistic values
    model_dir = "../models"
    predictor = PerformancePredictor(model_dir)
    
    # Example test performance with normalized values
    test_features = {
        'time_passed': 45.0,  # Average time in seconds
        'skips': 3,          # Number of skipped questions
        'answered_questions': 20,  # Total questions answered
        'correct_answers': 15,    # Number of correct answers
        'accuracy': 75.0,        # Accuracy percentage
        'speed': 0.44           # Questions per second
    }
    
    try:
        result = predictor.predict(test_features)
        
        # Print results
        print("\n=== Test Performance Analysis ===")
        print("\nInput Metrics:")
        for k, v in test_features.items():
            print(f"{k.replace('_', ' ').title()}: {v}")
        
        print("\nPrediction Results:")
        print(f"Performance Level: {result['predicted_category']}")
        
        print("\nConfidence Scores:")
        for category, score in sorted(result['confidence_scores'].items(), 
                                    key=lambda x: x[1], reverse=True):
            print(f"{category:12}: {score:.1%}")
        
        print("\nAnalysis:")
        print(f"Summary: {result['interpretation']['summary']}")
        
        if result['interpretation']['strengths']:
            print("\nStrengths:")
            for strength in result['interpretation']['strengths']:
                print(f"✓ {strength}")
                
        if result['interpretation']['improvements']:
            print("\nAreas for Improvement:")
            for improvement in result['interpretation']['improvements']:
                print(f"• {improvement}")

    except Exception as e:
        logging.error(f"Prediction failed: {str(e)}")
        logging.error(f"Current working directory: {Path.cwd()}")

if __name__ == "__main__":
    main()
