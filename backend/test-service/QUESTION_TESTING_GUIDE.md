# Question Creation Testing Guide

This guide provides comprehensive instructions for testing question creation functionality for all question types (DominoQuestion, ArrowQuestion, MultipleChoiceQuestion) and their associated templates.

## Prerequisites

1. **Start the services:**

   ```powershell
   # Navigate to the project root
   cd E:\PFE\GithubProject\Digital-Recruitment-Platform-Logical-Reasoning-Tests

   # Start all services
   .\startall.bat
   ```

2. **Ensure you have a test database running**
3. **Get authentication tokens** (admin/psychologist role required for question creation)

## Testing Methods

### 1. Automated Testing (Recommended)

#### Run All Tests

```powershell
# Navigate to test-service
cd backend\test-service

# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode (for development)
npm run test:watch
```

#### Run Specific Test Files

```powershell
# Test question controller only
npm test -- question.controller.test.js

# Test question templates only
npm test -- questionTemplate.test.js

# Test with verbose output
npm test -- --verbose
```

### 2. Manual API Testing

#### A. Setup - Create a Test First

**Endpoint:** `POST /api/tests`
**Headers:**

```json
{
  "Authorization": "Bearer YOUR_JWT_TOKEN",
  "Content-Type": "application/json"
}
```

**Body:**

```json
{
  "title": "Test for Question Creation",
  "description": "A test to validate question creation functionality",
  "difficulty": "medium",
  "duration": 60,
  "isActive": true
}
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "_id": "TEST_ID_HERE",
    "title": "Test for Question Creation",
    "difficulty": "medium",
    "duration": 60,
    "questionCount": 0,
    "isActive": true,
    "createdAt": "2025-06-08T...",
    "updatedAt": "2025-06-08T..."
  }
}
```

#### B. Test DominoQuestion Creation

**Endpoint:** `POST /api/questions/tests/{TEST_ID}/questions`
**Headers:**

```json
{
  "Authorization": "Bearer YOUR_JWT_TOKEN",
  "Content-Type": "application/json"
}
```

**Test Case 1: Valid DominoQuestion**

```json
{
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
      "topValue": 2,
      "bottomValue": 3,
      "isEditable": false,
      "exactX": 150,
      "exactY": 100
    },
    {
      "id": 3,
      "row": 0,
      "col": 2,
      "topValue": null,
      "bottomValue": null,
      "isEditable": true,
      "exactX": 250,
      "exactY": 100
    }
  ],
  "correctAnswer": {
    "dominoId": 3,
    "topValue": 3,
    "bottomValue": 4
  }
}
```

**Expected Success Response:**

```json
{
  "success": true,
  "data": {
    "_id": "QUESTION_ID_HERE",
    "questionType": "DominoQuestion",
    "testId": "TEST_ID_HERE",
    "instruction": "Find the missing domino in the sequence",
    "difficulty": "medium",
    "questionNumber": 1,
    "isActive": true,
    "dominos": [...],
    "correctAnswer": {...},
    "analytics": {
      "averageTimeSpent": 0,
      "visitCountAverage": 0
    },
    "createdAt": "2025-01-23T...",
    "updatedAt": "2025-01-23T..."
  }
}
```

**Test Case 2: Invalid DominoQuestion (Missing Required Fields)**

```json
{
  "questionType": "DominoQuestion",
  "instruction": "Find the missing domino",
  "difficulty": "medium"
  // Missing dominos and correctAnswer - should fail with validation error
}
```

**Expected Error Response:**

```json
{
  "success": false,
  "error": "Domino questions require dominos and correctAnswer fields"
}
```

**Test Case 3: Invalid DominoQuestion (Invalid Dot Values)**

```json
{
  "questionType": "DominoQuestion",
  "instruction": "Find the missing domino",
  "difficulty": "medium",
  "dominos": [
    {
      "id": 1,
      "row": 0,
      "col": 0,
      "topValue": 7, // Invalid: should be 0-6 or null
      "bottomValue": 2,
      "isEditable": true,
      "exactX": 50,
      "exactY": 100
    }
  ],
  "correctAnswer": {
    "dominoId": 1,
    "topValue": 3,
    "bottomValue": 4
  }
}
```

**Expected Error Response:**

```json
{
  "success": false,
  "error": "topValue must be null or an integer between 0 and 6"
}
```

**Test Case 4: Invalid DominoQuestion (No Editable Domino)**

```json
{
  "questionType": "DominoQuestion",
  "instruction": "Find the missing domino",
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
      "topValue": 2,
      "bottomValue": 3,
      "isEditable": false,
      "exactX": 150,
      "exactY": 100
    }
  ],
  "correctAnswer": {
    "dominoId": 1,
    "topValue": 3,
    "bottomValue": 4
  }
}
```

**Expected Error Response:**

```json
{
  "success": false,
  "error": "Exactly one domino must be editable"
}
```

#### C. Test ArrowQuestion Creation

**Test Case 1: Valid ArrowQuestion (with arrows)**

```json
{
  "questionType": "ArrowQuestion",
  "instruction": "Follow the arrows to find the missing domino",
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
      "topValue": 2,
      "bottomValue": 3,
      "isEditable": false,
      "exactX": 150,
      "exactY": 100
    },
    {
      "id": 3,
      "row": 0,
      "col": 2,
      "topValue": null,
      "bottomValue": null,
      "isEditable": true,
      "exactX": 250,
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
      "arrowColor": "#000000",
      "headSize": 8,
      "curved": false,
      "curvature": 0
    }
  ],
  "correctAnswer": {
    "dominoId": 3,
    "topValue": 3,
    "bottomValue": 4
  }
}
```

**Test Case 2: Valid ArrowQuestion (without arrows - like DominoQuestion)**

```json
{
  "questionType": "ArrowQuestion",
  "instruction": "Find the missing domino in the sequence",
  "difficulty": "easy",
  "dominos": [
    {
      "id": 1,
      "row": 0,
      "col": 0,
      "topValue": 0,
      "bottomValue": 1,
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
    "topValue": 1,
    "bottomValue": 2
  }
}
```

**Expected Success Response:**

```json
{
  "success": true,
  "data": {
    "_id": "QUESTION_ID_HERE",
    "questionType": "ArrowQuestion",
    "testId": "TEST_ID_HERE",
    "instruction": "Follow the arrows to find the missing domino",
    "difficulty": "medium",
    "questionNumber": 2,
    "isActive": true,
    "dominos": [...],
    "arrows": [...],
    "correctAnswer": {...},
    "analytics": {
      "averageTimeSpent": 0,
      "visitCountAverage": 0
    },
    "createdAt": "2025-01-23T...",
    "updatedAt": "2025-01-23T..."
  }
}
```

#### D. Test MultipleChoiceQuestion Creation

**Test Case 1: Valid MultipleChoiceQuestion**

```json
{
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
    },
    {
      "text": "There might be life on Mars",
      "correctEvaluation": "?"
    }
  ]
}rrowQuestion",
  "instruction": "Follow the arrow pattern to find the missing domino",
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
      "topValue": 2,
      "bottomValue": 4,
      "isEditable": false,
      "exactX": 150,
      "exactY": 100
    },
    {
      "id": 3,
      "row": 0,
      "col": 2,
      "topValue": null,
      "bottomValue": null,
      "isEditable": true,
      "exactX": 250,
      "exactY": 100
    }
  ],
  "arrows": [
    {
      "id": 1,
      "row": 0,
      "col": 0,
      "exactX": 75,
      "exactY": 125,
      "angle": 45
    },
    {
      "id": 2,
      "row": 0,
      "col": 1,
      "exactX": 175,
      "exactY": 125,
      "angle": 90
    }
  ],
  "correctAnswer": {
    "dominoId": 3,
    "topValue": 4,
    "bottomValue": 8
  }
}
```

**Test Case 2: Invalid ArrowQuestion (Missing Arrow Properties)**

```json
{
  "questionType": "ArrowQuestion",
  "instruction": "Follow the arrow pattern",
  "difficulty": "hard",
  "dominos": [
    {
      "id": 1,
      "row": 0,
      "col": 0,
      "topValue": 1,
      "bottomValue": 2,
      "isEditable": true,
      "exactX": 50,
      "exactY": 100
    }
  ],
  "arrows": [
    {
      "id": 1,
      "exactX": 75,
      "exactY": 125
      // Missing angle - should fail arrow validation
    }
  ],
  "correctAnswer": {
    "dominoId": 1,
    "topValue": 2,
    "bottomValue": 4
  }
}
```

#### D. Test MultipleChoiceQuestion Creation

**Test Case 1: Valid MultipleChoiceQuestion**

```json
{
  "questionType": "MultipleChoiceQuestion",
  "instruction": "Determine if each proposition is True (V), False (F), or Uncertain (?)",
  "difficulty": "easy",
  "propositions": [
    {
      "text": "All birds can fly",
      "correctEvaluation": "F"
    },
    {
      "text": "Some birds are penguins",
      "correctEvaluation": "V"
    },
    {
      "text": "The weather tomorrow will be sunny",
      "correctEvaluation": "?"
    }
  ]
}
```

**Test Case 2: Invalid MultipleChoiceQuestion (Empty Propositions)**

```json
{
  "questionType": "MultipleChoiceQuestion",
  "instruction": "Answer the propositions",
  "difficulty": "easy",
  "propositions": [] // Empty array - should fail
}
```

**Test Case 3: Invalid MultipleChoiceQuestion (Invalid Answer)**

```json
{
  "questionType": "MultipleChoiceQuestion",
  "instruction": "Answer the propositions",
  "difficulty": "easy",
  "propositions": [
    {
      "text": "Test proposition",
      "correctEvaluation": "X" // Invalid: should be V, F, or ?
    }
  ]
}
```

**Test Case 4: Invalid MultipleChoiceQuestion (Missing Propositions)**

```json
{
  "questionType": "MultipleChoiceQuestion",
  "instruction": "Evaluate each statement",
  "difficulty": "easy"
  // Missing propositions - should fail
}
```

**Expected Error Response:**

```json
{
  "success": false,
  "error": "Multiple choice questions require propositions field"
}
```

**Test Case 5: Invalid MultipleChoiceQuestion (Invalid Evaluation)**

```json
{
  "questionType": "MultipleChoiceQuestion",
  "instruction": "Evaluate each statement",
  "difficulty": "easy",
  "propositions": [
    {
      "text": "Test statement",
      "correctEvaluation": "X" // Invalid: should be V, F, or ?
    }
  ]
}
```

**Expected Error Response:**

```json
{
  "success": false,
  "error": "Each proposition correctEvaluation must be one of: V, F, ?"
}
```

---

## 3. Template Testing

### A. Create Templates

**Endpoint:** `POST /api/templates`
**Headers:**

```json
{
  "Authorization": "Bearer YOUR_JWT_TOKEN",
  "Content-Type": "application/json"
}
```

#### Test Case 1: Create DominoTemplate

```json
{
  "name": "Basic Domino Grid Template",
  "description": "A 2x2 grid layout for domino questions",
  "category": "domino",
  "isPublic": false,
  "tags": ["grid", "basic", "2x2"],
  "templateData": {
    "layoutType": "grid",
    "gridLayout": {
      "rows": 2,
      "cols": 2,
      "width": 400,
      "height": 200
    },
    "dominoPositions": [
      {
        "id": 1,
        "row": 0,
        "col": 0,
        "isEditable": false,
        "exactX": 50,
        "exactY": 50
      },
      {
        "id": 2,
        "row": 0,
        "col": 1,
        "isEditable": false,
        "exactX": 150,
        "exactY": 50
      },
      {
        "id": 3,
        "row": 1,
        "col": 0,
        "isEditable": false,
        "exactX": 50,
        "exactY": 150
      },
      {
        "id": 4,
        "row": 1,
        "col": 1,
        "isEditable": true,
        "exactX": 150,
        "exactY": 150
      }
    ]
  }
}
```

#### Test Case 2: Create ArrowTemplate

```json
{
  "name": "Arrow Pattern Template",
  "description": "Template with dominos and directional arrows",
  "category": "arrow",
  "isPublic": true,
  "tags": ["arrows", "pattern", "advanced"],
  "templateData": {
    "layoutType": "custom",
    "gridLayout": {
      "rows": 1,
      "cols": 3,
      "width": 350,
      "height": 100
    },
    "dominoPositions": [
      {
        "id": 1,
        "row": 0,
        "col": 0,
        "isEditable": false,
        "exactX": 50,
        "exactY": 50
      },
      {
        "id": 2,
        "row": 0,
        "col": 1,
        "isEditable": false,
        "exactX": 150,
        "exactY": 50
      },
      {
        "id": 3,
        "row": 0,
        "col": 2,
        "isEditable": true,
        "exactX": 250,
        "exactY": 50
      }
    ],
    "arrowPositions": [
      {
        "id": 1,
        "row": 0,
        "col": 0,
        "exactX": 100,
        "exactY": 50,
        "angle": 0,
        "uniqueId": "arrow1",
        "scale": 1,
        "length": 40,
        "arrowColor": "#FF0000",
        "headSize": 8,
        "curved": false,
        "curvature": 0
      }
    ]
  }
}
```

#### Test Case 3: Create MultipleChoiceTemplate

```json
{
  "name": "Basic True/False Template",
  "description": "Simple template for true/false questions",
  "category": "multiple-choice",
  "isPublic": true,
  "tags": ["true-false", "basic", "evaluation"],
  "templateData": {
    "propositionCount": 3,
    "propositionStructure": [
      {
        "placeholder": "Statement 1",
        "expectedEvaluation": "V"
      },
      {
        "placeholder": "Statement 2",
        "expectedEvaluation": "F"
      },
      {
        "placeholder": "Statement 3",
        "expectedEvaluation": "?"
      }
    ]
  }
}
```

### B. Get Templates

#### Test Case 1: Get All Templates

**Endpoint:** `GET /api/templates`
**Query Parameters:** `?page=1&limit=10`

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "templates": [...],
    "pagination": {
      "total": 5,
      "page": 1,
      "limit": 10,
      "pages": 1
    }
  }
}
```

#### Test Case 2: Get Templates by Category

**Endpoint:** `GET /api/templates?category=domino`

#### Test Case 3: Get Public Templates Only

**Endpoint:** `GET /api/templates?isPublic=true`

### C. Use Template to Create Question

**Endpoint:** `POST /api/questions/tests/{TEST_ID}/questions/from-template`

```json
{
  "templateId": "TEMPLATE_ID_HERE",
  "instruction": "Find the missing domino using the template pattern",
  "difficulty": "medium",
  "dominos": [
    {
      "id": 1,
      "topValue": 1,
      "bottomValue": 2
    },
    {
      "id": 2,
      "topValue": 2,
      "bottomValue": 3
    },
    {
      "id": 3,
      "topValue": 3,
      "bottomValue": 4
    },
    {
      "id": 4,
      "topValue": null,
      "bottomValue": null
    }
  ],
  "correctAnswer": {
    "dominoId": 4,
    "topValue": 4,
    "bottomValue": 5
  }
}
```

---

## 4. Testing Script Examples

### PowerShell Testing Script

Create a file called `test-questions.ps1`:

```powershell
# Question Testing Script
$baseUrl = "http://localhost:3003/api"
$token = "YOUR_JWT_TOKEN_HERE"
$testId = "YOUR_TEST_ID_HERE"

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Test 1: Create DominoQuestion
Write-Host "Testing DominoQuestion Creation..." -ForegroundColor Yellow
$dominoQuestion = @{
    questionType = "DominoQuestion"
    instruction = "Find the missing domino in the sequence"
    difficulty = "medium"
    dominos = @(
        @{
            id = 1
            row = 0
            col = 0
            topValue = 1
            bottomValue = 2
            isEditable = $false
            exactX = 50
            exactY = 100
        },
        @{
            id = 2
            row = 0
            col = 1
            topValue = $null
            bottomValue = $null
            isEditable = $true
            exactX = 150
            exactY = 100
        }
    )
    correctAnswer = @{
        dominoId = 2
        topValue = 2
        bottomValue = 3
    }
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/questions/tests/$testId/questions" -Method POST -Headers $headers -Body $dominoQuestion
    Write-Host "✅ DominoQuestion created successfully" -ForegroundColor Green
    Write-Host "Question ID: $($response.data._id)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ DominoQuestion creation failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host $_.Exception.Response.StatusDescription -ForegroundColor Red
}

# Test 2: Create ArrowQuestion
Write-Host "`nTesting ArrowQuestion Creation..." -ForegroundColor Yellow
$arrowQuestion = @{
    questionType = "ArrowQuestion"
    instruction = "Follow the arrows to find the missing domino"
    difficulty = "hard"
    dominos = @(
        @{
            id = 1
            row = 0
            col = 0
            topValue = 1
            bottomValue = 2
            isEditable = $false
            exactX = 50
            exactY = 100
        },
        @{
            id = 2
            row = 0
            col = 1
            topValue = $null
            bottomValue = $null
            isEditable = $true
            exactX = 150
            exactY = 100
        }
    )
    arrows = @(
        @{
            id = 1
            row = 0
            col = 0
            exactX = 100
            exactY = 100
            angle = 0
            uniqueId = "arrow1"
            scale = 1
            length = 40
            arrowColor = "#FF0000"
            headSize = 8
            curved = $false
            curvature = 0
        }
    )
    correctAnswer = @{
        dominoId = 2
        topValue = 2
        bottomValue = 3
    }
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/questions/tests/$testId/questions" -Method POST -Headers $headers -Body $arrowQuestion
    Write-Host "✅ ArrowQuestion created successfully" -ForegroundColor Green
    Write-Host "Question ID: $($response.data._id)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ ArrowQuestion creation failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Create MultipleChoiceQuestion
Write-Host "`nTesting MultipleChoiceQuestion Creation..." -ForegroundColor Yellow
$multipleChoiceQuestion = @{
    questionType = "MultipleChoiceQuestion"
    instruction = "Evaluate each statement as True (V), False (F), or Unknown (?)"
    difficulty = "easy"
    propositions = @(
        @{
            text = "All birds can fly"
            correctEvaluation = "F"
        },
        @{
            text = "The sky is blue"
            correctEvaluation = "V"
        }
    )
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/questions/tests/$testId/questions" -Method POST -Headers $headers -Body $multipleChoiceQuestion
    Write-Host "✅ MultipleChoiceQuestion created successfully" -ForegroundColor Green
    Write-Host "Question ID: $($response.data._id)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ MultipleChoiceQuestion creation failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎉 Testing completed!" -ForegroundColor Green
```

### Usage Instructions

1. **Update Configuration:**

   - Replace `YOUR_JWT_TOKEN_HERE` with a valid JWT token
   - Replace `YOUR_TEST_ID_HERE` with an existing test ID

2. **Run the Script:**

   ```powershell
   .\test-questions.ps1
   ```

3. **Manual Testing with Postman:**
   - Import the provided Postman collection
   - Update the environment variables
   - Run the test cases in sequence

---

## 5. Troubleshooting

### Common Errors and Solutions

1. **"Exactly one domino must be editable"**

   - Ensure exactly one domino has `isEditable: true`

2. **"Each domino must have a numeric id"**

   - Verify all dominos have unique numeric `id` fields

3. **"topValue must be null or an integer between 0 and 6"**

   - Use values 0-6 or `null` for missing dominos

4. **"correctAnswer must have a numeric dominoId"**

   - Ensure `dominoId` matches one of the domino `id` values

5. **"Each domino must specify isEditable as boolean"**

   - Set `isEditable` to `true` or `false` for all dominos

6. **"Arrow exactX must be a number"**
   - Ensure arrow coordinates are numeric values

### Validation Checklist

Before creating a question, verify:

- [ ] `questionType` is one of: "DominoQuestion", "ArrowQuestion", "MultipleChoiceQuestion"
- [ ] `instruction` is provided and not empty
- [ ] `difficulty` is one of: "easy", "medium", "hard", "expert"
- [ ] All required fields for the question type are included
- [ ] Domino values are between 0-6 or null
- [ ] Exactly one domino is editable (for domino-based questions)
- [ ] Arrow coordinates are numeric (for ArrowQuestion)
- [ ] Proposition evaluations are "V", "F", or "?" (for MultipleChoiceQuestion)

---

## 6. Next Steps

After successful testing:

1. **Frontend Integration:** Update frontend components to handle the new question structure
2. **Performance Testing:** Test with larger datasets
3. **User Acceptance Testing:** Validate with real users
4. **Documentation:** Update API documentation
5. **Monitoring:** Set up monitoring for question creation metrics
