import os
from dotenv import load_dotenv
from langchain_google_genai import GoogleGenerativeAIEmbeddings

# 1. Load the Key
load_dotenv()
api_key = os.environ.get("GOOGLE_API_KEY")

print(f"🔑 Checking Key: {api_key[:5]}... (Hidden)")

if not api_key:
    print("❌ ERROR: No API Key found in .env file!")
    exit()

# 2. Try to Embed ONE word
print("🔌 Connecting to Google...")
try:
    embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
    vector = embeddings.embed_query("Hello World")
    print("✅ SUCCESS! The API Key is working perfectly.")
    print(f"   Received vector of length: {len(vector)}")
except Exception as e:
    print("\n❌ FAILURE! The API Key is blocked or invalid.")
    print(f"   Error Message: {e}")