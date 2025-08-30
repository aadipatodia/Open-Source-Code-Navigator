@echo off

echo Starting Ollama service...
start "" "C:\Program Files\Ollama\ollama.exe" serve

echo Waiting a few seconds for Ollama to start...
timeout /t 5 >nul

echo Starting FastAPI server...
uvicorn main:app --host 0.0.0.0 --port 8000