@echo off
echo Starting AI Classification Service...

REM Set environment variables
set OPENROUTER_API_KEY=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

REM Navigate to the correct directory
cd /d "%~dp0ai-classification\ml"

REM Activate virtual environment
call venv\Scripts\activate

REM Verify environment variable is set
echo Environment variable OPENROUTER_API_KEY is set to: %OPENROUTER_API_KEY%

REM Change to API directory
cd src\api

REM Start the server
echo Starting Python server...
python server.py

pause
