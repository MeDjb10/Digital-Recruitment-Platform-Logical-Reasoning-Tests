@echo off
echo Starting all servers...

REM Start Frontend
start "Frontend" cmd /k "cd frontend && ng s --o"

REM Start API Gateway
start "API Gateway" cmd /k "cd backend/api-gateway && npm run dev"

REM Start Authentication Service
start "Auth Service" cmd /k "cd backend/authentification-service && npm run dev"

REM Start Test Service
start "Test Service" cmd /k "cd backend/test-service && npm run dev"

REM Start User Management Service
start "User Service" cmd /k "cd backend/user-management-service && npm run dev"

REM Start Test Assignment Service
start "Test Assignement Service" cmd /k "cd backend/test-assignment-service && npm run dev"

REM Start Notification Service
start "Notification Service" cmd /k "cd backend/notification-service && npm run dev"

REM Start Security Alert Service
start "Security Alert Service" cmd /k "cd backend/security-alert-service && npm start"

REM Start AI Classification
start "AI Classification" cmd /k "cd ai-classification\ml && venv\Scripts\activate && cd src\api && python server.py"

echo All servers started in separate windows.
pause
