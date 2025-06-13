import pandas as pd
import numpy as np
from pathlib import Path
import logging
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.preprocessing import LabelEncoder, StandardScaler
import matplotlib.pyplot as plt
import seaborn as sns
import json

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class RandomForestTrainer:
    def __init__(self, data_path: str, output_dir: str):
        self.data_path = Path(data_path)
        self.output_dir = Path(output_dir)
        self.model = None
        self.label_encoder = LabelEncoder()
        self.scaler = StandardScaler()
        
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
        """Load and prepare the data for training with scaling and encoding"""
        try:
            # Read CSV with new column names
            df = pd.read_csv(self.data_path, names=[
                'questionsAnswered',
                'correct answers',
                'timeSpent',
                'halfCorrect',
                'reversed',
                'questionsSkipped',
                'answerChanges',
                'flaggedQuestions',
                'label'
            ])
            
            logging.info(f"Loaded {len(df)} records from {self.data_path}")

            # Display original data sample
            logging.info("\nOriginal data sample:")
            logging.info(df.head())
            
            # Label encoding
            logging.info("\nPerforming label encoding...")
            original_labels = df['label'].unique()
            df['encoded_label'] = self.label_encoder.fit_transform(df['label'])
            
            # Show label encoding mapping
            logging.info("\nLabel encoding mapping:")
            for orig, encoded in zip(original_labels, self.label_encoder.transform(original_labels)):
                logging.info(f"{orig} -> {encoded}")

            # Feature scaling
            X = df[self.features]
            logging.info("\nFeature statistics before scaling:")
            logging.info(X.describe())
            
            X_scaled = self.scaler.fit_transform(X)
            
            logging.info("\nFeature statistics after scaling:")
            scaled_df = pd.DataFrame(X_scaled, columns=self.features)
            logging.info(scaled_df.describe())

            # Create feature matrix X and target vector y
            y = df['encoded_label']

            # Save feature names and metadata
            metadata = {
                'features': self.features,
                'label_mapping': dict(zip(original_labels, self.label_encoder.transform(original_labels))),
                'scaler_means': self.scaler.mean_.tolist(),
                'scaler_scales': self.scaler.scale_.tolist()
            }
            
            with open(self.output_dir / 'model_metadata.json', 'w') as f:
                json.dump(metadata, f, indent=2)

            return train_test_split(X_scaled, y, test_size=0.2, random_state=42, stratify=y)
            
        except Exception as e:
            logging.error(f"Error preparing data: {e}")
            raise

    def train_model(self, X_train, y_train):
        """Train the model using GridSearchCV for hyperparameter tuning"""
        param_grid = {
            'n_estimators': [100, 200],
            'max_depth': [10, 20, None],
            'min_samples_split': [2, 5],
            'min_samples_leaf': [1, 2],
            'class_weight': ['balanced', None]
        }

        rf = RandomForestClassifier(random_state=42)
        grid_search = GridSearchCV(
            estimator=rf,
            param_grid=param_grid,
            cv=5,
            n_jobs=-1,
            scoring='accuracy',
            verbose=1
        )

        grid_search.fit(X_train, y_train)
        
        logging.info(f"\nBest parameters: {grid_search.best_params_}")
        logging.info(f"Best cross-validation score: {grid_search.best_score_:.3f}")
        
        self.model = grid_search.best_estimator_

    def evaluate_model(self, X_test, y_test):
        """Evaluate the model and generate visualizations"""
        y_pred = self.model.predict(X_test)
        
        # Convert encoded labels back to original categories for reporting
        y_test_original = self.label_encoder.inverse_transform(y_test)
        y_pred_original = self.label_encoder.inverse_transform(y_pred)
        
        # Generate classification report
        report = classification_report(y_test_original, y_pred_original)
        logging.info(f"\nClassification Report:\n{report}")
        
        # Generate and save confusion matrix
        self._plot_confusion_matrix(y_test_original, y_pred_original)
        
        # Generate and save feature importance plot
        self._plot_feature_importance()

    def _plot_confusion_matrix(self, y_test, y_pred):
        """Plot confusion matrix with category labels"""
        cm = confusion_matrix(y_test, y_pred)
        category_labels = np.unique(y_test)
        
        plt.figure(figsize=(12, 8))
        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                   xticklabels=category_labels,
                   yticklabels=category_labels)
        plt.title('Confusion Matrix')
        plt.ylabel('True Label')
        plt.xlabel('Predicted Label')
        plt.tight_layout()
        plt.savefig(self.output_dir / 'confusion_matrix.png')
        plt.close()

    def _plot_feature_importance(self):
        """Plot feature importance scores"""
        importances = self.model.feature_importances_
        indices = np.argsort(importances)[::-1]
        
        plt.figure(figsize=(12, 6))
        plt.title('Feature Importances')
        plt.bar(range(len(importances)), importances[indices])
        plt.xticks(range(len(importances)), [self.features[i] for i in indices], rotation=45)
        plt.tight_layout()
        plt.savefig(self.output_dir / 'feature_importance.png')
        plt.close()

    def save_model(self):
        """Save the trained model and metadata"""
        import joblib
        model_path = self.output_dir / 'd2000_model_scaled.joblib'
        joblib.dump({
            'model': self.model,
            'label_encoder': self.label_encoder,
            'scaler': self.scaler
        }, model_path)
        logging.info(f"Model and transformers saved to {model_path}")

def main():
    # Get the absolute path based on the script's location
    script_dir = Path(__file__).resolve().parent
    src_dir = script_dir.parent  # Go up one level to reach src
    
    data_path = src_dir / "data" / "d2000_dataset_balanced.csv"
    output_dir = script_dir  # models directory is the same as script directory
    
    logging.info(f"Looking for data file at: {data_path}")
    logging.info(f"Output directory: {output_dir}")
    
    # Verify paths exist
    if not data_path.exists():
        raise FileNotFoundError(
            f"Data file not found at: {data_path}\n"
            f"Please ensure the data file exists in the ML/SRC/DATA directory."
        )
    
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    trainer = RandomForestTrainer(data_path, output_dir)
    
    try:
        data = trainer.prepare_data()
        if data is None:
            raise Exception("Failed to prepare data")
        
        X_train, X_test, y_train, y_test = data
        
        logging.info("Training model...")
        trainer.train_model(X_train, y_train)
        
        logging.info("Evaluating model...")
        trainer.evaluate_model(X_test, y_test)
        
        trainer.save_model()
        
        logging.info("✅ Training completed successfully")
        
    except Exception as e:
        logging.error(f"❌ Training failed: {str(e)}")

if __name__ == "__main__":
    main()
