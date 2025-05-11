@echo off
echo Starting all servers...

REM Start Frontend
start "Frontend" cmd /k "cd frontend && ng s --o"

REM Start API Gateway
start "API Gateway" cmd /k "cd api-gateway && npm run dev"

REM Start Authentication Service
start "Auth Service" cmd /k "cd authentification-service && npm run dev"

REM Start Test Service
start "Test Service" cmd /k "cd test-service && npm run dev"

REM Start User Management Service
start "User Service" cmd /k "cd user-management-service && npm run dev"

REM Start AI Classification
start "AI Classification" cmd /k "cd ai-classification\ml && venv\Scripts\activate && cd src\api && python server.py"

echo All servers started in separate windows.
pause
