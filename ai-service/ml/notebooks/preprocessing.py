import pandas as pd
from sklearn.preprocessing import StandardScaler

# Load the synthetic data
data = pd.read_csv("synthetic_questions.csv")

# Display the first few rows to inspect the data
print(data.head())

# Choose features for clustering
features = data[['response_time', 'skipped_count', 'correctness_rate']]

# Normalize the features
scaler = StandardScaler()
features_scaled = scaler.fit_transform(features)

# Optionally, save the preprocessed data for later use
preprocessed_data = pd.DataFrame(features_scaled, columns=features.columns)
preprocessed_data.to_csv("preprocessed_questions.csv", index=False)
print("Data preprocessed and saved as 'preprocessed_questions.csv'.")
