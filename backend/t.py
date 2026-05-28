import google.generativeai as genai
import os

# Replace 'YOUR_API_KEY' with your actual Gemini API key
genai.configure(api_key="AIzaSyC9EDrIv5tQkSNVkSOHRAO3ezsvSnBavwk")

def list_all_supported_models():
    print(f"{'Model Name (ID)':<40} | {'Description'}")
    print("-" * 100)
    
    try:
        # Fetch all models available to your API key
        for m in genai.list_models():
            # Most users are looking for models that support 'generateContent'
            if 'generateContent' in m.supported_generation_methods:
                print(f"{m.name:<40} | {m.description}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    list_all_supported_models()