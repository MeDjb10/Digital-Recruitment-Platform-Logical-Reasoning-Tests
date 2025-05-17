const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PerformanceAnalysisSchema = new Schema({
    candidateId: {
        type: String,
        required: true,
        index: true
    },
    testId: {
        type: Schema.Types.ObjectId,
        required: true,
        index: true
    },
    testType: {
        type: String,
        required: true
    },
    metrics: {
        questionsAnswered: Number,
        correctAnswers: Number,
        timeSpent: Number,
        halfCorrect: Number,
        reversed: Number,
        questionsSkipped: Number,
        answerChanges: Number,
        flaggedQuestions: Number,
        desiredPosition: String,
        educationLevel: String
    },
    aiClassification: {
        prediction: Schema.Types.Mixed,
        comment: String,
        timestamp: {
            type: Date,
            default: Date.now
        }
    },
    attemptId: {
        type: Schema.Types.ObjectId,
        required: true,
        unique: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('PerformanceAnalysis', PerformanceAnalysisSchema);
