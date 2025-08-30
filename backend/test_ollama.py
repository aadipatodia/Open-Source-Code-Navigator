import requests
import json

def test_ollama():
    try:
        # Test code generation
        payload = {
            "model": "codellama",
            "prompt": "Write a Python function to calculate factorial",
            "stream": False
        }
        
        response = requests.post("http://localhost:11434/api/generate", json=payload)
        result = response.json()
        print("Generated code:")
        print(result["response"])
        
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    test_ollama()