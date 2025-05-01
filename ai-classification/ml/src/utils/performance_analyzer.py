from predict import PerformancePredictor
import chromadb
from chromadb.utils import embedding_functions
from typing import List
import requests 
import json
from bson import json_util
import logging
from pathlib import Path
from typing import Dict, Any, List as TypeList
from datetime import datetime
from db_schema import PerformanceMetrics, FeedbackEntry, PsychologistComment
from pprint import pprint
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class PerformanceAnalyzer:
    def __init__(self, model_dir: str = ""):
        self.predictor = PerformancePredictor(model_dir)
        self.ollama_url = "http://localhost:11434/api/chat"
        self.chroma_client = chromadb.PersistentClient(path="../chroma_db")
        
        # Add error handling for sentence transformer initialization
        try:
            logging.info("Initializing sentence transformer...")
            sentence_transformer_ef = embedding_functions.SentenceTransformerEmbeddingFunction(
                model_name="all-mpnet-base-v2"  # better model than the default one
            )
            logging.info("Sentence transformer initialized successfully")
        except Exception as e:
            logging.error(f"Failed to initialize sentence transformer: {e}")
            # Fallback to default embedding function
            logging.info("Falling back to default embedding function")
            sentence_transformer_ef = embedding_functions.DefaultEmbeddingFunction()
        
        self.comments_collection = self.chroma_client.get_or_create_collection(
            name="psychologist_comments",
            metadata={"hnsw:space": "cosine"},
            embedding_function=sentence_transformer_ef
        )    
        self.feedback_collection = self.chroma_client.get_or_create_collection(
            name="performance_feedback",
            metadata={"hnsw:space": "cosine"},
            embedding_function=sentence_transformer_ef
        )
        self.metrics_collection = self.chroma_client.get_or_create_collection(
            name="performance_metrics",
            metadata={"hnsw:space": "cosine"},
            embedding_function=sentence_transformer_ef
        )

    def analyze(self, metrics: PerformanceMetrics, desired_position: str = "", education_level: str = "") -> Dict[str, Any]:
        """Analyze performance metrics and generate AI commentary"""
        try:
            # Get prediction
            prediction_result = self.predictor.predict(metrics)
            
            # Generate AI comment using RAG with position and education context
            ai_comment = self._generate_ai_comment(metrics, prediction_result, desired_position, education_level)
              
            # Store interaction
            self._store_interaction(metrics, ai_comment)
            
            # Combine results
            return {
                "metrics": metrics,
                "prediction": prediction_result,
                "ai_analysis": ai_comment
            }
            
        except Exception as e:
            logging.error(f"Analysis failed: {e}")
            raise

    def _store_interaction(self, metrics: PerformanceMetrics,  feedback: FeedbackEntry = None, comment:PsychologistComment = None):
        """Store the interaction in ChromaDB"""
        timestamp = datetime.now().isoformat()
        
        # Store metrics and AI response
        metrics_str = json.dumps(metrics, default=json_util.default)
        self.metrics_collection.add(
            documents=[metrics_str],
            metadatas=[{
                "timestamp": timestamp,
            }],
            ids=[f"metrics_{timestamp}"]
        )
        
        # Store feedback if provided
        if feedback:
            feedback_text = feedback["feedback_text"] if isinstance(feedback, dict) else feedback
            self.feedback_collection.add(
                documents=[feedback_text],
                metadatas=[{
                    "timestamp": timestamp,
                    "metrics_id": f"metrics_{timestamp}"
                }],
                ids=[f"feedback_{timestamp}"]
            )

        if comment:
            comment_text = comment["comment"] if isinstance(comment, dict) else comment
            self.comments_collection.add(
                documents=[comment_text],
                metadatas=[{
                    "timestamp": timestamp,
                    "metrics_id": f"metrics_{timestamp}"
                }],
                ids=[f"comment_{timestamp}"]
            )

    def _retrieve_similar_cases(self, metrics: PerformanceMetrics, limit: int = 3) -> List[Dict[str, Any]]:
        """Retrieve similar metrics and corresponding feedback and psychologist comments from ChromaDB"""
        query_metrics = json.dumps(metrics, default=json_util.default)
        results = self.metrics_collection.query(
            query_texts=[query_metrics],
            n_results=limit
        )
        
        similar_cases = []
        for i, (doc, metadata) in enumerate(zip(results['documents'][0], results['metadatas'][0])):
            metrics_id = results['ids'][0][i]
            
            # Get feedback for this metrics
            feedback_results = self.feedback_collection.query(
                query_texts=[""],
                where={"metrics_id": metrics_id},
                n_results=1
            )
            
            # Get psychologist comment for this metrics
            psych_comments = self.comments_collection.query(
                query_texts=[""],
                where={"metrics_id": metrics_id},
                n_results=1
            )
            
            similar_cases.append({
                "metrics": json.loads(doc),
                "feedback": feedback_results['documents'][0][0] if feedback_results['documents'][0] else None,
                "psychologist_comment": psych_comments['documents'][0][0] if psych_comments['documents'][0] else None
            })
        
        return similar_cases

    def _generate_ai_comment(self, metrics: PerformanceMetrics, prediction: Dict[str, Any], 
                            desired_position: str, education_level: str) -> str:
        """Generate AI commentary using RAG"""
        similar_cases = self._retrieve_similar_cases(metrics)
        
        similar_cases_text = "\n\n".join([
            f"Similar Case {i+1}:\n" +
            f"Metrics: {case['metrics']}\n" +
            (f"Previous Feedback: {case['feedback']}\n" if case['feedback'] else "No feedback available\n") +
            (f"Psychologist Comment: {case['psychologist_comment']}" if case['psychologist_comment'] else "No psychologist comment available")
            for i, case in enumerate(similar_cases)
        ])
        
        # Add test-specific information
        test_type = metrics.get('test_type', '').lower()
        test_info = {
            'd70': {
                'total_questions': 44,
                'time_limit': 25,
                'description': 'D-70 Test (44 questions, 25 minutes time limit)'
            },
            'd2000': {
                'total_questions': 40,
                'time_limit': 20,
                'description': 'D-2000 Test (40 questions, 20 minutes time limit)'
            }
        }.get(test_type, {})

        prompt = f"""
        Analyze the following test performance data for a candidate, considering:
        
        Test Information:
        {test_info['description']}
        - Total Questions: {test_info['total_questions']}
        - Time Limit: {test_info['time_limit']} minutes
        
        Candidate Profile:
        - Desired Position: {desired_position}
        - Education Level: {education_level}

        Current Performance:
        {json.dumps(metrics, indent=2)}

        Predicted Level: {prediction['predicted_category']}
        Confidence of the prediction: {prediction['confidence']:.1%}

        Historical Similar Cases:
        {similar_cases_text}

        Based on the test requirements, current metrics, similar historical cases, and the candidate's profile, provide a detailed analysis that:
        1. Evaluates overall performance relative to test requirements (time management and completion rate)
        2. Points out key strengths
        3. Identifies areas for improvement
        4. Assesses suitability for the desired position considering:
           - Required cognitive abilities for the role
           - Educational background alignment
           - Performance compared to role expectations and test benchmarks
        5. Provide a clear recommendation (Suitable/Not Suitable) with justification
        
        Keep the tone professional and constructive.
        """

        # Prepare request
        try:
            data = {
                "model": "deepseek-r1:1.5b",
                "messages": [{"role": "user", "content": prompt}],
                "stream": False
            }
            
            # Make API request
            response = requests.post(self.ollama_url, json=data)
            # response.raise_for_status()
            
            # Extract and return comment
            return response.json()["message"]["content"].strip()
            
        except Exception as e:
            logging.error(f"Failed to generate AI comment: {e}")
            return "Unable to generate AI analysis at this time."

    def provide_feedback(self, metrics: PerformanceMetrics, ai_comment: str, is_good: bool, feedback_text: str = ""):
        """Provide feedback on AI comment quality and get improved response"""
        try:
            # Store feedback directly in ChromaDB
            self._store_interaction(metrics, feedback={"feedback_text": feedback_text})

            feedback_prompt = f"""
            Previous performance analysis for these metrics:
            {json.dumps(metrics, indent=2)}

            Previous AI comment:
            "{ai_comment}"

            This comment was marked as {'GOOD' if is_good else 'NEEDS IMPROVEMENT'}.
            Additional feedback: {feedback_text}

            Please provide a {'similar style of analysis' if is_good else 'revised analysis addressing the feedback'}.
            """

            # Make new API request with feedback context
            data = {
                "model": "deepseek-r1:1.5b",
                "messages": [{"role": "user", "content": feedback_prompt}],
                "stream": False
            }
            
            response = requests.post(self.ollama_url, json=data)
            response.raise_for_status()
            
            improved_analysis = response.json()["message"]["content"].strip()
            
            return improved_analysis
        
        except Exception as e:
            logging.error(f"Failed to process feedback: {e}")
            return "Unable to generate improved analysis at this time."

    def save_feedback_history(self):
        pass

    def save_human_feedback(self, metrics: PerformanceMetrics, feedback_text: str):
        """Store feedback directly in ChromaDB"""
        self._store_interaction(metrics, feedback={"feedback_text": feedback_text})
        return True

    def add_psychologist_comment(self, metrics: PerformanceMetrics, comment: str) -> bool:
        """Add a psychologist's comment for specific performance metrics"""
        try:
            timestamp = datetime.now().isoformat()
            metrics_str = json.dumps(metrics, default=json_util.default)
            
            # Store the professional comment with reference to metrics
            self.comments_collection.add(
                documents=[comment],
                metadatas=[{
                    "timestamp": timestamp,
                    "metrics_id": f"metrics_{timestamp}",
                    "type": "psychologist_comment"
                }],
                ids=[f"psych_comment_{timestamp}"]
            )
            
            logging.info(f"Psychologist comment stored successfully with ID: psych_comment_{timestamp}")
            return True
            
        except Exception as e:
            logging.error(f"Failed to store psychologist comment: {e}")
            return False
    
    def clear_database(self):
        """Clear all data from ChromaDB collections"""
        try:
            # Delete collections
            self.chroma_client.delete_collection("performance_feedback")
            self.chroma_client.delete_collection("performance_metrics")
            self.chroma_client.delete_collection("psychologist_comments")
            
            # Recreate collections
            self.feedback_collection = self.chroma_client.get_or_create_collection(
                name="performance_feedback",
                metadata={"hnsw:space": "cosine"}
            )
            self.metrics_collection = self.chroma_client.get_or_create_collection(
                name="performance_metrics",
                metadata={"hnsw:space": "cosine"}
            )
            self.comments_collection = self.chroma_client.get_or_create_collection(
                name="psychologist_comments",
                metadata={"hnsw:space": "cosine"}
            )
            
            logging.info("Database cleared successfully")
            return True
        except Exception as e:
            logging.error(f"Failed to clear database: {e}")
            return False

def main():
    try:
        analyzer = PerformanceAnalyzer()
        client = chromadb.PersistentClient(path="../chroma_db")
        # Add database clearing option
        clear_option = input("Do you want to clear the database before starting? (y/n): ").lower()
        if clear_option == 'y':
            if analyzer.clear_database():
                print("Database cleared successfully!")
            else:
                print("Failed to clear database.")
                return
        
        test_metrics: PerformanceMetrics = {
            'test_type': 'd70',
            'questionsAnswered': 40,
            'correct answers': 20,
            'timeSpent': 20,
            'halfCorrect': 0,
            'reversed': 0,
            'questionsSkipped': 0,
            'answerChanges': 3,
            'flaggedQuestions': 2,
            'timestamp': datetime.now().isoformat()
        }
        
        # Add position and education inputs
        position = input("Enter desired position: ")
        education = input("Enter education level: ")
        
        result = analyzer.analyze(test_metrics, position, education)
        
        print("\n=== Initial Performance Analysis ===")
        print("\nAI Analysis:")
        print(result['ai_analysis'])
        
        feedback_iteration = 1
        while True:
            print(f"\n=== Feedback Iteration {feedback_iteration} ===")
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
                
                # Ask for psychologist comment
                add_comment = input("\nWould you like to add a psychologist's comment? (y/n): ").lower()
                if add_comment == 'y':
                    psych_comment = input("Enter psychologist's comment: ")
                    if analyzer.add_psychologist_comment(test_metrics, psych_comment):
                        print("Psychologist comment stored successfully!")
                    else:
                        print("Failed to store psychologist comment.")
                
                # Update current analysis for next iteration
                result['ai_analysis'] = improved_analysis
                feedback_iteration += 1
                
                print("\nFeedback stored successfully!")
                
            else:
                print("Please enter 'y' for yes, 'n' for no, or 'q' to quit")
                
    except Exception as e:
        logging.error(f"Analysis failed: {str(e)}")
        raise

if __name__ == "__main__":
    main()

