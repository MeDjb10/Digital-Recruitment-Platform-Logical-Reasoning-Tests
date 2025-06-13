import pandas as pd
import numpy as np
from pathlib import Path
import logging
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.svm import SVC
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns
import json

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class SVMTrainer:
    def __init__(self, data_path: str, output_dir: str):
        self.data_path = Path(data_path)
        self.output_dir = Path(output_dir)
        self.model = None
        self.scaler = StandardScaler()
        
        self.category_mapping = {
            'très faible': 0,
            'faible': 1,
            'moyen': 2,
            'fort': 3,
            'très fort': 4
        }
        
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

    def prepare_data(self):
        """Load and prepare the data for training"""
        try:
            df = pd.read_csv(self.data_path, names=[
                'questionsAnswered', 'correct answers', 'timeSpent',
                'halfCorrect', 'reversed', 'questionsSkipped',
                'answerChanges', 'flaggedQuestions', 'label'
            ]
            , skiprows=1)  # Skip the first row if it contains headers
            
            X = df[self.features]
            y = df['label']
            
            # Scale the features for SVM
            X = self.scaler.fit_transform(X)
            
            return train_test_split(X, y, test_size=0.2, random_state=42)
            
        except Exception as e:
            logging.error(f"Error preparing data: {e}")
            raise

    def train_model(self, X_train, y_train):
        """Train the model using GridSearchCV for hyperparameter tuning"""
        param_grid = {
            'C': [0.1, 1, 10],
            'kernel': ['rbf', 'linear'],
            'gamma': ['scale', 'auto', 0.1],
            'class_weight': ['balanced', None]
        }

        svm = SVC(random_state=42)
        grid_search = GridSearchCV(
            estimator=svm,
            param_grid=param_grid,
            cv=5,
            n_jobs=-1,
            scoring='accuracy',
            verbose=1
        )

        grid_search.fit(X_train, y_train)
        
        logging.info(f"Best parameters: {grid_search.best_params_}")
        logging.info(f"Best cross-validation score: {grid_search.best_score_:.3f}")
        
        self.model = grid_search.best_estimator_

    def evaluate_model(self, X_test, y_test):
        """Evaluate the model and generate visualizations"""
        y_pred = self.model.predict(X_test)
        report = classification_report(y_test, y_pred)
        logging.info(f"\nClassification Report:\n{report}")
        
        # Save confusion matrix with green colormap
        cm = confusion_matrix(y_test, y_pred)
        plt.figure(figsize=(10, 8))
        sns.heatmap(cm, annot=True, fmt='d', cmap='Greens', 
                   cbar_kws={'label': 'Number of Predictions'})
        plt.title('SVM Confusion Matrix')
        plt.ylabel('True Label')
        plt.xlabel('Predicted Label')
        plt.savefig(self.output_dir / 'svm_confusion_matrix.png', 
                   bbox_inches='tight', 
                   dpi=300)
        plt.close()

    def save_model(self):
        """Save the trained model and scaler"""
        import joblib
        model_path = self.output_dir / 'd2000_svm_model.joblib'
        scaler_path = self.output_dir / 'd2000_svm_scaler.joblib'
        joblib.dump(self.model, model_path)
        joblib.dump(self.scaler, scaler_path)
        logging.info(f"Model and scaler saved to {self.output_dir}")

def main():
    data_path = "../data/d2000_dataset_balanced.csv"
    output_dir = "../models"
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    
    trainer = SVMTrainer(data_path, output_dir)
    try:
        X_train, X_test, y_train, y_test = trainer.prepare_data()
        trainer.train_model(X_train, y_train)
        trainer.evaluate_model(X_test, y_test)
        trainer.save_model()
        logging.info("✅ Training completed successfully")
    except Exception as e:
        logging.error(f"❌ Training failed: {str(e)}")

if __name__ == "__main__":
    main()
