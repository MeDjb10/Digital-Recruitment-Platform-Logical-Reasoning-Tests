import requests
import json
import logging
from typing import Dict

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class AICommentGenerator:
    def __init__(self):
        self.url = "http://localhost:11434/api/chat"
        self.model = "deepseek-r1:8b"

    def generate_comment(self, performance_data: Dict) -> str:
        """Generate an AI performance analysis comment."""
        try:
            # Calculate derived metrics
            performance_data['accuracy'] = (
                performance_data['Correct Answers'] / performance_data['Answered Questions'] * 100
                if performance_data['Answered Questions'] > 0 else 0
            )
            
            performance_data['speed'] = (
                performance_data['Answered Questions'] / performance_data['Time Passed (min)']
                if performance_data['Time Passed (min)'] > 0 else 0
            )

            # Create and send prompt
            prompt = self._create_prompt(performance_data)
            data = {
                "model": self.model,
                "messages": [{
                    "role": "user",
                    "content": prompt
                }],
                "stream": False
            }

            response = requests.post(self.url, json=data)
            response_json = json.loads(response.text)
            return response_json["message"]["content"]

        except Exception as e:
            logging.error(f"Error generating AI comment: {e}")
            return self._generate_fallback_comment(performance_data)

    def _create_prompt(self, data: Dict) -> str:
        """Create a detailed prompt analyzing thinking styles and performance."""
        # Calculate thinking style percentages
        total_style = data['Spatial'] + data['Numeric'] + data['Arithmetic']
        spatial_percent = (data['Spatial'] / total_style * 100) if total_style > 0 else 0
        numeric_percent = (data['Numeric'] / total_style * 100) if total_style > 0 else 0
        arithmetic_percent = (data['Arithmetic'] / total_style * 100) if total_style > 0 else 0

        prompt = f"""
        Analyze the following candidate's test performance and thinking style:

        Performance Metrics:
        - Time Taken: {data['Time Passed (min)']:.1f} minutes
        - Questions Answered: {data['Answered Questions']}
        - Correct Answers: {data['Correct Answers']}
        - Accuracy: {data['accuracy']:.1f}%
        - Speed: {data['speed']:.2f} questions per minute
        - Skips: {data['Skips']}

        Thinking Style Distribution:
        - Spatial Reasoning: {spatial_percent:.1f}%
        - Numerical Analysis: {numeric_percent:.1f}%
        - Arithmetic Computation: {arithmetic_percent:.1f}%
        
        Overall Performance Level: {data['Performance']}

        Generate a comprehensive evaluation that:
        1. Analyzes the candidate's dominant thinking style (spatial, numeric, or arithmetic)
        2. Evaluates their problem-solving approach based on the style distribution
        3. Assesses their efficiency (speed vs accuracy)
        4. Comments on their test-taking strategy (considering skips)
        5. Provides insights about their strengths and potential areas for development
        6. Relates their thinking style to potential career strengths

        Format the response as two paragraphs:
        - First paragraph: Performance analysis
        - Second paragraph: Thinking style analysis and career implications
        """
        return prompt

    def _generate_fallback_comment(self, data: Dict) -> str:
        """Generate a basic comment if AI generation fails."""
        # Calculate thinking style dominance
        styles = {
            'Spatial': data['Spatial'],
            'Numeric': data['Numeric'],
            'Arithmetic': data['Arithmetic']
        }
        dominant_style = max(styles.items(), key=lambda x: x[1])[0]
        
        accuracy = (data['Correct Answers'] / data['Answered Questions'] * 100 
                   if data['Answered Questions'] > 0 else 0)
        
        performance_levels = {
            'Très Fort': 'exceptional',
            'Fort': 'strong',
            'Moyen': 'moderate',
            'Faible': 'developing',
            'Très Faible': 'limited'
        }
        
        performance_desc = performance_levels.get(data['Performance'], 'moderate')
        
        return (f"The candidate demonstrated {performance_desc} performance with {accuracy:.1f}% accuracy, "
                f"completing {data['Answered Questions']} questions in {data['Time Passed (min)']:.1f} minutes. "
                f"Their test results indicate a predominant {dominant_style.lower()} thinking style, "
                f"suggesting strong capabilities in {dominant_style.lower()}-based problem-solving.")

def main():
    # Example usage
    generator = AICommentGenerator()
    
    # Test data with thinking styles
    test_data = {
        'Time Passed (min)': 30.0,
        'Answered Questions': 25,
        'Correct Answers': 20,
        'Skips': 5,
        'Spatial': 8,
        'Numeric': 6,
        'Arithmetic': 6,
        'Performance': 'Fort'
    }
    
    try:
        comment = generator.generate_comment(test_data)
        
        print("\n=== Candidate Performance Analysis ===")
        print("\nTest Metrics:")
        for k, v in test_data.items():
            if isinstance(v, float):
                print(f"{k}: {v:.2f}")
            else:
                print(f"{k}: {v}")
        
        print("\nGenerated Analysis:")
        print(comment)
        
    except Exception as e:
        logging.error(f"Failed to generate comment: {e}")

if __name__ == "__main__":
    main()
