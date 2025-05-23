from .predict import PerformancePredictor
import chromadb
from chromadb.utils import embedding_functions
from typing import List
import requests 
import json
from bson import json_util, ObjectId
import logging
from pathlib import Path
from typing import Dict, Any, List as TypeList
from datetime import datetime
from .db_schema import PerformanceMetrics, FeedbackEntry, PsychologistComment
from pprint import pprint
from pymongo import MongoClient
import os

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class PerformanceAnalyzer:
    def __init__(self, model_dir: str = ""):
        self.predictor = PerformancePredictor(model_dir)
        self.ollama_url = "http://localhost:11434/api/chat"
        self.chroma_client = chromadb.PersistentClient(path="../chroma_db")
        
        # Initialize MongoDB connection
        self.mongo_client = MongoClient(os.getenv('MONGODB_URI', 'mongodb://localhost:27017'))
        self.db = self.mongo_client['test-metrics']
        
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

    def analyze(self, metrics: PerformanceMetrics, testId: str = None, candidateId: str = None, attemptId: str = None, 
                desired_position: str = "", education_level: str = "") -> Dict[str, Any]:
        """Analyze performance metrics and generate AI commentary"""
        try:
            # Get prediction
            prediction_result = self.predictor.predict(metrics)
            
            # Generate AI comment using RAG with position and education context
            ai_comment = self._generate_ai_comment(metrics, prediction_result, desired_position, education_level)
            
            # Store in MongoDB
            if testId and candidateId and attemptId:
                analysis_doc = {
                    'candidateId': candidateId,
                    'testId': ObjectId(testId),
                    'testType': metrics.get('test_type', 'unknown'),
                    'metrics': metrics,
                    'aiClassification': {
                        'prediction': prediction_result,
                        'comment': ai_comment,
                        'timestamp': datetime.now()
                    },
                    'attemptId': ObjectId(attemptId)
                }
                
                try:
                    # Using upsert to update if exists or insert if not
                    result = self.db.performance_analysis.update_one(
                        {'attemptId': ObjectId(attemptId)},
                        {'$set': analysis_doc},
                        upsert=True
                    )
                    logging.info(f"MongoDB operation successful. Modified count: {result.modified_count}")
                except Exception as mongo_error:
                    logging.error(f"MongoDB operation failed: {mongo_error}")
              
            # Store in ChromaDB for RAG purposes
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

    def _store_interaction(self, metrics: PerformanceMetrics, ai_comment: str = None, feedback: FeedbackEntry = None, comment: PsychologistComment = None):
        """Store the interaction in ChromaDB"""
        timestamp = datetime.now().isoformat()
        
        # Store metrics and AI response
        metrics_str = json.dumps(metrics, default=json_util.default)
        self.metrics_collection.add(
            documents=[metrics_str],
            metadatas=[{
                "timestamp": timestamp,
                "ai_comment": ai_comment
            }],
            ids=[f"metrics_{timestamp}"]
        )
        
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
                "psychologist_comment": psych_comments['documents'][0][0] if psych_comments['documents'][0] else None,
                "ai_comment": metadata.get("ai_comment")
            })
        
        return similar_cases

    def _generate_ai_comment(self, metrics: PerformanceMetrics, prediction: Dict[str, Any], 
                           desired_position: str, education_level: str) -> str:
        """Generate AI commentary using RAG"""
        similar_cases = self._retrieve_similar_cases(metrics)
        
        # Generate similar cases text including AI comments
        similar_cases_text = "\n\n".join([
            f"Similar Case {i+1}:\n" +
            f"Metrics: {case['metrics']}\n" +
            f"Previous AI Analysis: {case['ai_comment']}\n" +
            (f"Human Feedback: {case['feedback']}\n" if case['feedback'] else "No feedback available\n") +
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
        {test_info.get('description', 'Unknown test type')}
        - Total Questions: {test_info.get('total_questions', 'N/A')}
        - Time Limit: {test_info.get('time_limit', 'N/A')} minutes
        
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
            response.raise_for_status()
            
            # Extract and return comment
            return response.json()["message"]["content"].strip()
            
        except Exception as e:
            logging.error(f"Failed to generate AI comment: {e}")
            return "Unable to generate AI analysis at this time."

    def provide_feedback(self, metrics: PerformanceMetrics, ai_comment: str, is_good: bool, feedback_text: str = ""):
        """Provide feedback on AI comment quality and get improved response"""
        try:
            # Store feedback
            feedback_entry = {"feedback_text": feedback_text, "is_good": is_good}
            self._store_interaction(metrics, ai_comment, feedback=feedback_entry)
            
            # Store feedback in MongoDB if metrics has attemptId
            if metrics.get('attemptId'):
                try:
                    self.db.performance_analysis.update_one(
                        {'attemptId': ObjectId(metrics['attemptId'])},
                        {
                            '$push': {
                                'feedback': {
                                    'text': feedback_text,
                                    'isGood': is_good,
                                    'timestamp': datetime.now()
                                }
                            }
                        }
                    )
                except Exception as mongo_error:
                    logging.error(f"Failed to store feedback in MongoDB: {mongo_error}")

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
            
            # Update MongoDB with improved analysis if attemptId exists
            if metrics.get('attemptId'):
                try:
                    self.db.performance_analysis.update_one(
                        {'attemptId': ObjectId(metrics['attemptId'])},
                        {
                            '$set': {
                                'aiClassification.improvedComment': improved_analysis,
                                'aiClassification.lastUpdated': datetime.now()
                            }
                        }
                    )
                except Exception as mongo_error:
                    logging.error(f"Failed to update improved analysis in MongoDB: {mongo_error}")
            
            return improved_analysis
        
        except Exception as e:
            logging.error(f"Failed to process feedback: {e}")
            return "Unable to generate improved analysis at this time."

    def add_psychologist_comment(self, metrics: PerformanceMetrics, comment: str) -> bool:
        """Add a psychologist's comment for specific performance metrics"""
        try:
            timestamp = datetime.now().isoformat()
            
            # Store in ChromaDB
            self._store_interaction(metrics, comment={"comment": comment})
            
            # Store in MongoDB if attemptId exists
            if metrics.get('attemptId'):
                try:
                    self.db.performance_analysis.update_one(
                        {'attemptId': ObjectId(metrics['attemptId'])},
                        {
                            '$push': {
                                'psychologistComments': {
                                    'comment': comment,
                                    'timestamp': datetime.now()
                                }
                            }
                        }
                    )
                except Exception as mongo_error:
                    logging.error(f"Failed to store psychologist comment in MongoDB: {mongo_error}")
            
            return True
            
        except Exception as e:
            logging.error(f"Failed to store psychologist comment: {e}")
            return False
    
    def clear_database(self):
        """Clear all data from ChromaDB collections and MongoDB"""
        try:
            # Clear ChromaDB collections
            self.chroma_client.delete_collection("performance_feedback")
            self.chroma_client.delete_collection("performance_metrics")
            self.chroma_client.delete_collection("psychologist_comments")
            
            # Clear MongoDB collection
            self.db.performance_analysis.delete_many({})
            
            # Recreate ChromaDB collections
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
            
            logging.info("Databases cleared successfully")
            return True
        except Exception as e:
            logging.error(f"Failed to clear databases: {e}")
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
            'timestamp': datetime.now().isoformat(),
            'desired_position': 'Software Engineer',  # Added position field
            'education_level': 'Bachelor in Computer Science'  # Added education field
        }
        
        result = analyzer.analyze(test_metrics, test_metrics.get('desired_position', ''), 
                                test_metrics.get('education_level', ''))
        
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

