import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

# Load preprocessed data
data = pd.read_csv("preprocessed_questions.csv")

# Apply K-means clustering with 3 clusters (for Easy, Medium, Hard)
kmeans = KMeans(n_clusters=3, random_state=42)
data['cluster'] = kmeans.fit_predict(data)

# Analyze the cluster centers
centers = kmeans.cluster_centers_
print("Cluster Centers:", centers)

# Map clusters to difficulty labels (this mapping may require manual adjustment)
mapping = {0: "Easy", 1: "Medium", 2: "Hard"}
data['difficulty'] = data['cluster'].map(mapping)
print(data.head())

# Save the classified data
data.to_csv("classified_questions.csv", index=False)
print("Classified questions saved as 'classified_questions.csv'.")
