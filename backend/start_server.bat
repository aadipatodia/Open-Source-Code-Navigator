@echo off

echo Starting FastAPI server (Gemini-powered backend)...
uvicorn main:app --host 0.0.0.0 --port 8000
