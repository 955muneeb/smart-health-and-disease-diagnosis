import os
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI

# 1. Load the API Key
load_dotenv()
api_key = os.environ.get("GOOGLE_API_KEY")

print("🔑 Checking API Key availability...")

if not api_key:
    print("❌ ERROR: No API Key found in .env file!")
    exit()

# 2. List of models to try
models_to_test = [
    "gemini-2.0-flash-exp",  # The experimental one you used before
    "gemini-1.5-flash",      # The current standard fast model
    "gemini-pro",            # The old reliable stable model
    "gemini-1.5-pro"         # The high-intelligence model
]

print(f"\n🧪 Testing {len(models_to_test)} models with your Key...\n")

# 3. Loop through and test each one
for model_name in models_to_test:
    print(f"👉 Testing: {model_name.ljust(20)} ...", end=" ")
    
    try:
        llm = ChatGoogleGenerativeAI(model=model_name, google_api_key=api_key)
        # Try to send a simple "Hi"
        response = llm.invoke("Hi")
        print(f"✅ SUCCESS! (Use this one)")
    except Exception as e:
        # If it fails, print FAILED (usually 404 or 400 error)
        print(f"❌ FAILED.")

print("\n------------------------------------------------")
print("📝 INSTRUCTION: Open api.py and update AGENT_MODEL with a green one.")