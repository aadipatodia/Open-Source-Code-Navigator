import uvicorn
import httpx
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from contextlib import asynccontextmanager

# The Ollama server address
OLLAMA_BASE_URL = "http://localhost:11434"

# A dictionary to hold our application's state, including the HTTP client
app_state = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    This function runs on application startup and shutdown.
    It creates a single, persistent httpx client that lives
    as long as the application is running.
    """
    # On startup, create the client and store it in the app_state
    app_state["client"] = httpx.AsyncClient(timeout=None)
    yield
    # On shutdown, close the client
    await app_state["client"].aclose()

# Pass the lifespan manager to the FastAPI app
app = FastAPI(lifespan=lifespan)

@app.post("/api/generate")
async def generate(request: Request):
    """
    Receives a request, forwards it to Ollama using the persistent
    client, and streams the response back.
    """
    try:
        data = await request.json()
        ollama_url = f"{OLLAMA_BASE_URL}/api/generate"
        
        # Get the persistent client from our app_state
        client = app_state["client"]
        
        async def stream_generator():
            async with client.stream("POST", ollama_url, json=data) as response:
                async for chunk in response.aiter_bytes():
                    yield chunk

        return StreamingResponse(stream_generator())

    except Exception as e:
        print(f"Error in simple_mcp_server: {e}")
        return {"error": "Failed to connect to Ollama"}, 500

if __name__ == "__main__":
    print("Starting Simple MCP Server on http://localhost:8080")
    uvicorn.run(app, host="0.0.0.0", port=8080)