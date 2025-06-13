# Quick Backend Testing

## Prerequisites

1. Ensure MongoDB is running
2. Ensure backend services are running
3. Have a valid JWT token
4. Have a test created with a valid testId

## Quick Test Commands

### 1. Check if services are running

```bash
# Check test-service
curl -X GET http://localhost:3003/api/health

# Check if you can get tests (requires auth)
curl -X GET http://localhost:3003/api/tests \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Create a Test First (if needed)

```bash
curl -X POST http://localhost:3003/api/tests \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test for Question Creation",
    "description": "Testing the new question model structure",
    "duration": 30,
    "isActive": true
  }'
```

### 3. Test DominoQuestion Creation

```bash
curl -X POST http://localhost:3003/api/questions/tests/YOUR_TEST_ID/questions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "questionType": "DominoQuestion",
    "instruction": "Find the missing domino in the sequence",
    "difficulty": "medium",
    "dominos": [
      {
        "id": 1,
        "row": 0,
        "col": 0,
        "topValue": 1,
        "bottomValue": 2,
        "isEditable": false,
        "exactX": 50,
        "exactY": 100
      },
      {
        "id": 2,
        "row": 0,
        "col": 1,
        "topValue": null,
        "bottomValue": null,
        "isEditable": true,
        "exactX": 150,
        "exactY": 100
      }
    ],
    "correctAnswer": {
      "dominoId": 2,
      "topValue": 2,
      "bottomValue": 3
    }
  }'
```

### 4. Test ArrowQuestion Creation

```bash
curl -X POST http://localhost:3003/api/questions/tests/YOUR_TEST_ID/questions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "questionType": "ArrowQuestion",
    "instruction": "Follow the arrows to find the missing domino",
    "difficulty": "hard",
    "dominos": [
      {
        "id": 1,
        "row": 0,
        "col": 0,
        "topValue": 1,
        "bottomValue": 2,
        "isEditable": false,
        "exactX": 50,
        "exactY": 100
      },
      {
        "id": 2,
        "row": 0,
        "col": 1,
        "topValue": null,
        "bottomValue": null,
        "isEditable": true,
        "exactX": 150,
        "exactY": 100
      }
    ],
    "arrows": [
      {
        "id": 1,
        "row": 0,
        "col": 0,
        "exactX": 100,
        "exactY": 100,
        "angle": 0,
        "uniqueId": "arrow1",
        "scale": 1,
        "length": 40,
        "arrowColor": "#FF0000",
        "headSize": 8,
        "curved": false,
        "curvature": 0
      }
    ],
    "correctAnswer": {
      "dominoId": 2,
      "topValue": 2,
      "bottomValue": 3
    }
  }'
```

### 5. Test MultipleChoiceQuestion Creation

```bash
curl -X POST http://localhost:3003/api/questions/tests/YOUR_TEST_ID/questions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "questionType": "MultipleChoiceQuestion",
    "instruction": "Evaluate each statement as True (V), False (F), or Unknown (?)",
    "difficulty": "easy",
    "propositions": [
      {
        "text": "All birds can fly",
        "correctEvaluation": "F"
      },
      {
        "text": "The sky is blue",
        "correctEvaluation": "V"
      }
    ]
  }'
```

## Expected Success Response Format

```json
{
  "success": true,
  "data": {
    "_id": "...",
    "questionType": "...",
    "testId": "...",
    "instruction": "...",
    "difficulty": "...",
    "questionNumber": 1,
    "isActive": true,
    "dominos": [...],  // For domino-based questions
    "arrows": [...],   // For ArrowQuestion only
    "propositions": [...], // For MultipleChoiceQuestion only
    "correctAnswer": {...},
    "analytics": {
      "averageTimeSpent": 0,
      "visitCountAverage": 0
    },
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

## Field Validation Reminders

### For DominoQuestion and ArrowQuestion:

- Each domino must have: `id`, `topValue`, `bottomValue`, `isEditable`, `exactX`, `exactY`
- `topValue` and `bottomValue`: 0-6 or null
- Exactly one domino must have `isEditable: true`
- `correctAnswer` must reference an existing domino `id`

### For ArrowQuestion (additional):

- Arrows are optional but if provided need: `id`, `exactX`, `exactY`
- Additional arrow properties: `angle`, `uniqueId`, `scale`, `length`, `arrowColor`, `headSize`, `curved`, `curvature`

### For MultipleChoiceQuestion:

- Each proposition must have: `text`, `correctEvaluation`
- `correctEvaluation` must be: "V", "F", or "?"
