import pandas as pd
import numpy as np

# Set a seed for reproducibility
np.random.seed(42)

# Simulate data for 100 questions
data = pd.DataFrame({
    'question_id': range(1, 101),
    'response_time': np.random.normal(loc=30, scale=5, size=100),  # average around 30 seconds
    'skipped_count': np.random.randint(0, 5, size=100),  # 0 to 4 skips
    'correctness_rate': np.random.uniform(0.5, 1.0, size=100)  # between 50% and 100%
})

# Save the simulated data to a CSV file
data.to_csv("synthetic_questions.csv", index=False)
print("Synthetic dataset created and saved as 'synthetic_questions.csv'.")
