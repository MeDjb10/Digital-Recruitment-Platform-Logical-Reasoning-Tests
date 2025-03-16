import pandas as pd
import numpy as np
from pathlib import Path
import logging
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns
import json

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class RandomForestTrainer:
    def __init__(self, data_path: str, output_dir: str):
        self.data_path = Path(data_path)
        self.output_dir = Path(output_dir)
        self.model = None
        
        # Use ordered category mapping
        self.category_mapping = {
            'Très Faible': 0,
            'Faible': 1,
            'Moyen': 2,
            'Fort': 3,
            'Très Fort': 4
        }
        
        # Try to load custom mapping if it exists
        custom_mapping = self._load_category_mapping()
        if (custom_mapping):
            self.category_mapping = custom_mapping
        
        # Define features to use
        self.features = [
            'time_passed', 'skips', 'answered_questions',
            'correct_answers', 'accuracy', 'speed'
        ]

    def _load_category_mapping(self):
        """Try to load custom category mapping, return None if file doesn't exist"""
        try:
            mapping_path = self.data_path.parent / 'category_mapping.json'
            if mapping_path.exists():
                with open(mapping_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            return None
        except Exception as e:
            logging.warning(f"Using default category mapping: {e}")
            return None

    def _get_category_labels(self):
        """Get category labels sorted by their numerical values"""
        return [k for k, v in sorted(self.category_mapping.items(), key=lambda x: x[1])]

    def prepare_data(self):
        """Load and prepare the data for training"""
        try:
            df = pd.read_csv(self.data_path)
            logging.info(f"Loaded {len(df)} records from {self.data_path}")

            X = df[self.features]
            y = df['category']

            return train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
        except Exception as e:
            logging.error(f"Error preparing data: {e}")
            return None

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
        
        logging.info(f"Best parameters: {grid_search.best_params_}")
        logging.info(f"Best cross-validation score: {grid_search.best_score_:.3f}")
        
        self.model = grid_search.best_estimator_

    def evaluate_model(self, X_test, y_test):
        """Evaluate the model and generate visualizations"""
        y_pred = self.model.predict(X_test)
        
        # Get category labels for the report
        category_labels = self._get_category_labels()
        
        # Generate classification report
        report = classification_report(y_test, y_pred, target_names=category_labels)
        logging.info(f"\nClassification Report:\n{report}")
        
        # Generate and save confusion matrix
        self._plot_confusion_matrix(y_test, y_pred)
        
        # Generate and save feature importance plot
        self._plot_feature_importance()

    def _plot_confusion_matrix(self, y_test, y_pred):
        """Plot confusion matrix with category labels"""
        cm = confusion_matrix(y_test, y_pred)
        category_labels = self._get_category_labels()
        
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
        if self.model is None:
            logging.error("No model to save!")
            return

        # Save model
        import joblib
        model_path = self.output_dir / 'random_forest_model.joblib'
        joblib.dump(self.model, model_path)
        logging.info(f"Model saved to {model_path}")

        # Save model metadata
        metadata = {
            'features': self.features,
            'category_mapping': self.category_mapping,
            'model_params': self.model.get_params()
        }
        
        with open(self.output_dir / 'model_metadata.json', 'w') as f:
            json.dump(metadata, f, indent=2)

def main():
    # Setup paths
    data_path = "../data/processed/processed_data.csv"
    output_dir = "../models"
    
    # Create output directory if it doesn't exist
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    
    # Create trainer instance
    trainer = RandomForestTrainer(data_path, output_dir)
    
    try:
        # Prepare data
        data = trainer.prepare_data()
        if data is None:
            raise Exception("Failed to prepare data")
        
        X_train, X_test, y_train, y_test = data
        
        # Train model
        logging.info("Training model...")
        trainer.train_model(X_train, y_train)
        
        # Evaluate model
        logging.info("Evaluating model...")
        trainer.evaluate_model(X_test, y_test)
        
        # Save model
        trainer.save_model()
        
        logging.info("✅ Training completed successfully")
        
    except Exception as e:
        logging.error(f"❌ Training failed: {str(e)}")

if __name__ == "__main__":
    main()
