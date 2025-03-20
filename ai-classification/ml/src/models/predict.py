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
            # Load model
            self.model = joblib.load(self.model_dir / 'random_forest_model.joblib')
            logging.info("Model loaded successfully")

            # Load metadata
            with open(self.model_dir / 'model_metadata.json', 'r', encoding='utf-8') as f:
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
            
            # Map numerical prediction to category (handling both string and integer predictions)
            if isinstance(prediction, (int, np.integer)):
                # If prediction is numeric, look up the category
                predicted_category = next(
                    (k for k, v in self.category_mapping.items() if v == int(prediction)),
                    'Unknown'
                )
            else:
                # If prediction is already a string, use it directly
                predicted_category = prediction
                
            logging.info(f"Mapped category: {predicted_category}")
            
            # Analyze thinking style
            thinking_style = self._analyze_thinking_style(features)
            
            # Generate comprehensive result
            result = {
                'predicted_category': predicted_category,
                'confidence': float(max(probabilities)),
                'metrics': {
                    'accuracy': features['accuracy'],
                    'speed': features['speed'],
                    'completion_rate': (features['answered_questions'] / 
                                     (features['answered_questions'] + features['skips'])) * 100
                },
                'thinking_style': thinking_style,
                'interpretation': self._generate_interpretation(features, predicted_category)
            }
            
            return result

        except Exception as e:
            logging.error(f"Error making prediction: {e}")
            raise

    def _analyze_thinking_style(self, features: dict) -> dict:
        """Analyze the candidate's thinking style based on question type performance"""
        total_correct = features['spatial'] + features['numeric'] + features['arithmetic']
        if total_correct == 0:
            return {'dominant': 'Unknown', 'distribution': {}}

        distribution = {
            'spatial': (features['spatial'] / total_correct) * 100,
            'numeric': (features['numeric'] / total_correct) * 100,
            'arithmetic': (features['arithmetic'] / total_correct) * 100
        }

        dominant_style = max(distribution.items(), key=lambda x: x[1])[0]

        return {
            'dominant': dominant_style.title(),
            'distribution': distribution,
            'recommendation': self._get_career_recommendation(dominant_style)
        }

    def _generate_interpretation(self, features: dict, category: str) -> dict:
        """Generate detailed performance interpretation"""
        # Calculate key metrics
        accuracy = features['accuracy']
        speed = features['speed']
        skip_rate = (features['skips'] / (features['skips'] + features['answered_questions'])) * 100

        # Generate insights
        insights = []
        if accuracy >= 70:
            insights.append("Shows high precision in problem-solving")
        elif accuracy <= 40:
            insights.append("Needs improvement in accuracy")

        if speed >= 1.0:
            insights.append("Demonstrates quick decision-making")
        elif speed <= 0.3:
            insights.append("Could improve on time management")

        if skip_rate >= 40:
            insights.append("Shows selective question approach")
        elif skip_rate <= 10:
            insights.append("Attempts most questions systematically")

        return {
            'performance_level': category,
            'insights': insights,
            'key_metrics': {
                'accuracy': f"{accuracy:.1f}%",
                'speed': f"{speed:.2f} questions/minute",
                'skip_rate': f"{skip_rate:.1f}%"
            }
        }

    def _get_career_recommendation(self, dominant_style: str) -> str:
        """Provide career recommendations based on thinking style"""
        recommendations = {
            'spatial': "Strong in visual and spatial reasoning - Well-suited for architecture, engineering, or design roles",
            'numeric': "Excel in numerical analysis - Consider data analysis, financial planning, or research positions",
            'arithmetic': "Strong computational skills - Well-suited for accounting, programming, or mathematical roles"
        }
        return recommendations.get(dominant_style.lower(), "Consider diverse roles that match your balanced skill set")

def main():
    try:
        predictor = PerformancePredictor("../models")
        
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
        print(f"Completion Rate: {result['metrics']['completion_rate']:.1f}%")
        
        print("\nThinking Style Analysis:")
        print(f"Dominant Style: {result['thinking_style']['dominant']}")
        print("\nStyle Distribution:")
        for style, percentage in result['thinking_style']['distribution'].items():
            print(f"{style.title()}: {percentage:.1f}%")
        
        print("\nCareer Recommendation:")
        print(result['thinking_style']['recommendation'])
        
        print("\nKey Insights:")
        for insight in result['interpretation']['insights']:
            print(f"- {insight}")

    except Exception as e:
        logging.error(f"Prediction failed: {str(e)}")
        logging.error(f"Current working directory: {Path.cwd()}")

if __name__ == "__main__":
    main()
