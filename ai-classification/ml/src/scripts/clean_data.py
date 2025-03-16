import pandas as pd
import os

# Define input and output file paths
INPUT_FILE = "../data/candidate_performance_human_like.csv"  # Change this to your actual dataset file path
OUTPUT_FILE = "data/cleaned_dataset.csv"

def clean_data(input_path, output_path):
    """
    Cleans the dataset by keeping only relevant features and category column.
    Saves the cleaned dataset as a new CSV file.

    Parameters:
    - input_path (str): Path to the raw dataset.
    - output_path (str): Path to save the cleaned dataset.
    """
    # Load dataset
    df = pd.read_csv(input_path)

    # Select relevant features and category column
    selected_columns = ["Time Passed", "Skips", "Answered Questions","Correct Answers", "Accuracy (%)", "Speed", "Category"]  # Update with real column names
    df = df[selected_columns]

    # Handle missing values (Remove rows with missing values)
    df.dropna(inplace=True)

    # Checks if the category column contains text (object type)
    #Converts text categories to numerical codes
    #Example: ["low", "medium", "high"] → [0, 1, 2]
    if df["category"].dtype == "object":
        df["category"] = df["category"].astype("category").cat.codes  

    # Save the cleaned dataset
    os.makedirs(os.path.dirname(output_path), exist_ok=True)  # Ensure the directory exists
    df.to_csv(output_path, index=False)
    print(f"✅ Cleaned data saved to {output_path}")

# Run the cleaning function
if __name__ == "__main__":
    clean_data(INPUT_FILE, OUTPUT_FILE)
