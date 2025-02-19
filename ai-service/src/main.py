from flask import Flask, request, jsonify
from sklearn.externals import joblib  # Assuming you are using scikit-learn for ML models

app = Flask(__name__)

# Load your trained model (update the path as necessary)
model = joblib.load('path/to/your/model.pkl')

@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json(force=True)
    # Assuming the input data is in the correct format
    prediction = model.predict([data['features']])
    return jsonify({'prediction': prediction.tolist()})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)