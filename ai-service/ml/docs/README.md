# 📊 Question Classification Using K-Means Clustering  

<div align="center">
  <img src="https://img.shields.io/badge/Python-3.10%2B-blue?logo=python" alt="Python Version">
  <img src="https://img.shields.io/badge/Library-scikit--learn-orange?logo=scikit-learn" alt="scikit-learn">
  <img src="https://img.shields.io/badge/Algorithm-K--Means-9cf" alt="K-Means">
</div>

---

## 🌟 Introduction  
This project classifies test questions into three difficulty levels (**Easy**, **Medium**, **Hard**) using unsupervised machine learning. The classification is based on:  
- **Response Time** (seconds)  
- **Skipped Count** (times skipped)  
- **Correctness Rate** (accuracy percentage)  

We use the **K-Means clustering algorithm** to group similar questions based on these features.

---

## 🛠️ Project Setup  

### 📂 Directory Structure  
```
ml/  
├── data/                   # Datasets (raw, preprocessed, classified)  
├── models/                 # Machine learning scripts  
├── notebooks/              # Jupyter notebooks for experimentation  
├── docs/                   # Documentation and visualizations  
└── requirements.txt        # Dependencies  
```

### 🔧 Dependencies  
```bash
# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install requirements
pip install numpy pandas scikit-learn matplotlib seaborn
```

---

## 📈 Data Simulation  
We generated synthetic data for 100 questions to simulate real-world behavior.  

### 📄 File: `ml/data/generate_synthetic_data.py`  
```python
import pandas as pd
import numpy as np

np.random.seed(42)  # For reproducibility
data = pd.DataFrame({
    'question_id': range(1, 101),
    'response_time': np.random.normal(loc=30, scale=5, size=100),
    'skipped_count': np.random.randint(0, 5, size=100),
    'correctness_rate': np.random.uniform(0.5, 1.0, size=100)
})
data.to_csv("../data/synthetic_questions.csv", index=False)
```

---

## 🔄 Preprocessing  
Features are normalized to ensure equal weighting in clustering.  

### 📄 File: `ml/notebooks/preprocessing.py`  
```python
from sklearn.preprocessing import StandardScaler

# Load and preprocess data
data = pd.read_csv("../data/synthetic_questions.csv")
features = data[['response_time', 'skipped_count', 'correctness_rate']]
scaler = StandardScaler()
features_scaled = scaler.fit_transform(features)
pd.DataFrame(features_scaled).to_csv("../data/preprocessed_questions.csv", index=False)
```

---

## 🧠 K-Means Clustering  

### ❓ What is K-Means?  
An unsupervised algorithm that groups data into `K` clusters. For this project:  
- **K = 3** (Easy, Medium, Hard)  
- Uses Euclidean distance to assign points to the nearest centroid  

### 📄 File: `ml/models/question_classification.py`  
```python
from sklearn.cluster import KMeans
import matplotlib.pyplot as plt
import seaborn as sns

# Load preprocessed data
data = pd.read_csv("../data/preprocessed_questions.csv")

# Apply K-Means
kmeans = KMeans(n_clusters=3, random_state=42)
data['difficulty'] = kmeans.fit_predict(data).map({0: "Easy", 1: "Medium", 2: "Hard"})

# Visualize clusters
plt.figure(figsize=(10, 6))
sns.scatterplot(
    x=data['response_time'], 
    y=data['correctness_rate'], 
    hue=data['difficulty'], 
    palette="viridis"
)
plt.title("Question Difficulty Clusters")
plt.xlabel("Normalized Response Time")
plt.ylabel("Normalized Correctness Rate")
plt.savefig("../docs/cluster_visualization.png")  # Save plot
```

---

## 📊 Results  
### Sample Output (`classified_questions.csv`)  
| response_time | skipped_count | correctness_rate | difficulty |  
|---------------|---------------|-------------------|------------|  
| 0.6646        | -1.26         | 0.55              | Medium     |  
| -0.038        | 1.74          | 0.41              | Hard       |  
| 1.800         | 0.24          | 0.62              | Hard       |  

![Cluster Visualization](../docs/cluster_visualization.png)  

---

## 🚀 Usage  
1. Generate synthetic data:  
   ```bash
   python ml/data/generate_synthetic_data.py
   ```  
2. Preprocess data:  
   ```bash
   python ml/notebooks/preprocessing.py
   ```  
3. Run classification:  
   ```bash
   python ml/models/question_classification.py
   ```  

---

## 🔮 Future Improvements  
- Experiment with `n_clusters=4` for finer difficulty levels  
- Add features like "average candidate score"  
- Validate against expert-labeled data  

---

## 👥 Authors  
- Mohamed Amine Jabou  
- Mohamed Taleb Mouelhi  

📅 Last Updated: 23/02/2025  

