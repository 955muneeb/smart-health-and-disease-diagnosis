import google.generativeai as genai
import os
from dotenv import load_dotenv

# 1. Load Key
load_dotenv()
api_key = os.environ.get("GOOGLE_API_KEY")

if not api_key:
    print("❌ Error: No API Key found.")
    exit()

# 2. Configure
genai.configure(api_key=api_key)

print(f"🔑 Key found. Asking Google for available models...\n")

try:
    # 3. List Models
    found_any = False
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            found_any = True
            print(f"✅ AVAILABLE: {m.name}")
            # The name usually comes like 'models/gemini-pro'. 
            # We need to grab the part after the slash.
            clean_name = m.name.replace("models/", "")
            print(f"   👉 Use this in api.py: AGENT_MODEL = \"{clean_name}\"\n")

    if not found_any:
        print("⚠️ No chat models found. Your API key might be restricted.")

except Exception as e:
    print(f"❌ Error: {e}")