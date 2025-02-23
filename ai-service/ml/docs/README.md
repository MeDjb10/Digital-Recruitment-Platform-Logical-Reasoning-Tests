📄 README.md (Question Classification Documentation)
# 📌 Question Classification Using K-Means Clustering

## **1. Introduction**
The goal of this step is to classify test questions into different difficulty levels (**Easy, Medium, Hard**) based on various factors such as:
- **Response Time** (how long candidates take to answer a question).
- **Skipped Count** (how many times a question is skipped).
- **Correctness Rate** (how often candidates answer correctly).

To achieve this, we use **unsupervised machine learning** with the **K-Means clustering algorithm**, which helps group similar questions into categories based on their features.

---

## **2. Project Setup**
Before implementing the classification, we set up the ML environment as follows:

📂 **ml/** (Root folder for ML-related code)  
┣ 📂 **data/** → Stores datasets (synthetic, preprocessed, classified)  
┣ 📂 **models/** → Contains the classification script  
┣ 📂 **notebooks/** → Jupyter notebooks for experimentation  
┣ 📂 **docs/** → Documentation files  

### **🔹 Virtual Environment & Dependencies**
To ensure reproducibility, a virtual environment was created and necessary dependencies installed:

```bash
cd ml
python -m venv venv
source venv/bin/activate  # (Windows: venv\Scripts\activate)
pip install numpy pandas scikit-learn matplotlib seaborn
________________________________________
3. Data Simulation
Since no real dataset was available, a synthetic dataset was generated with relevant features.
📄 File: ml/data/generate_synthetic_data.py
🔹 Features in the Dataset
Feature	Description
response_time	Time taken to answer the question (in seconds).
skipped_count	Number of times the question was skipped.
correctness_rate	Percentage of candidates who answered correctly.
🔹 Code for Data Simulation
import pandas as pd
import numpy as np

# Set a seed for reproducibility
np.random.seed(42)

# Simulate data for 100 questions
data = pd.DataFrame({
    'question_id': range(1, 101),
    'response_time': np.random.normal(loc=30, scale=5, size=100),
    'skipped_count': np.random.randint(0, 5, size=100),
    'correctness_rate': np.random.uniform(0.5, 1.0, size=100)
})

# Save to CSV
data.to_csv("../data/synthetic_questions.csv", index=False)
print("Synthetic dataset created!")
________________________________________
4. Preprocessing Data
Before applying K-Means, the dataset needed normalization to ensure equal weightage for all features.
📄 File: ml/notebooks/preprocessing.py
import pandas as pd
from sklearn.preprocessing import StandardScaler

# Load the synthetic dataset
data = pd.read_csv("../data/synthetic_questions.csv")

# Select features for clustering
features = data[['response_time', 'skipped_count', 'correctness_rate']]

# Normalize the features
scaler = StandardScaler()
features_scaled = scaler.fit_transform(features)

# Save preprocessed data
preprocessed_data = pd.DataFrame(features_scaled, columns=features.columns)
preprocessed_data.to_csv("../data/preprocessed_questions.csv", index=False)
print("Preprocessed data saved!")
________________________________________
5. K-Means Clustering Algorithm: Explanation
🔹 What is K-Means Clustering?
K-Means is an unsupervised learning algorithm that groups data points into K clusters based on similarity.
•	We set K = 3 (Easy, Medium, Hard difficulty levels).
•	The model assigns each data point to the nearest centroid and recalculates centroids iteratively.
🔹 How K-Means Works
1.	Choose K: Define the number of clusters (here, K=3).
2.	Initialize Centroids: Randomly pick K points as initial cluster centers.
3.	Assign Points to Clusters: Each data point is assigned to the nearest centroid based on Euclidean distance.
4.	Recalculate Centroids: Update the centroid of each cluster as the mean of its assigned points.
5.	Repeat Until Convergence: Steps 3 and 4 repeat until clusters no longer change.
________________________________________
6. Applying K-Means to Our Dataset
📄 File: ml/models/question_classification.py
import pandas as pd
from sklearn.cluster import KMeans
import matplotlib.pyplot as plt
import seaborn as sns

# Load preprocessed data
data = pd.read_csv("../data/preprocessed_questions.csv")

# Apply K-Means clustering
kmeans = KMeans(n_clusters=3, random_state=42)
data['cluster'] = kmeans.fit_predict(data)

# Cluster Centers
print("Cluster Centers:\n", kmeans.cluster_centers_)

# Map clusters to difficulty levels
cluster_mapping = {0: "Easy", 1: "Medium", 2: "Hard"}
data['difficulty'] = data['cluster'].map(cluster_mapping)

# Save the classified data
data.to_csv("../data/classified_questions.csv", index=False)
print("Classified questions saved!")

# Visualization of Clusters
plt.figure(figsize=(8, 6))
sns.scatterplot(x=data['response_time'], y=data['correctness_rate'], hue=data['difficulty'], palette="viridis")
plt.title("K-Means Clustering of Question Difficulty")
plt.xlabel("Response Time")
plt.ylabel("Correctness Rate")
plt.show()
________________________________________
7. Results & Interpretation
After running the script, we generated classified_questions.csv, which contains:
•	response_time (normalized)
•	skipped_count (normalized)
•	correctness_rate (normalized)
•	cluster (0, 1, or 2)
•	difficulty (Easy, Medium, Hard)
🔹 Example Output
response_time,skipped_count,correctness_rate,cluster,difficulty
0.6646,-1.26,0.55,1,Medium
-0.038,1.74,0.41,2,Hard
1.800,0.24,0.62,2,Hard
-0.144,-0.51,-1.07,0,Easy
...
✅ This means our model successfully classified questions into different difficulty levels!
________________________________________
8. Future Improvements
•	Fine-tuning Clusters: 
o	Experiment with n_clusters=4 or n_clusters=5 to improve classification accuracy.
•	Feature Engineering: 
o	Add more features (e.g., average candidate test scores).
•	Validation: 
o	Compare the clustering results with expert-labeled data (if available).
________________________________________
✅ This concludes the full documentation for question classification.
🔜 Next Step: Automated Report Generation Using Ollama/DeepSeek R1.
________________________________________
📌 How to Use This Code
1.	Run generate_synthetic_data.py to create the dataset.
2.	Run preprocessing.py to normalize the data.
3.	Run question_classification.py to apply K-Means clustering.
4.	Inspect classified_questions.csv to analyze the classification results.
🚀 Contributions & Future Work If you'd like to improve this model, feel free to open a pull request or suggest new features!
________________________________________
📝 Authors
•	Mohamed Amine Jabou
•	Mohamed Taleb Mouelhi
📅 Date: 23/02/2025



