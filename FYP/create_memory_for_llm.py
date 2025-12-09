import os
import time
from dotenv import load_dotenv
from langchain_community.document_loaders import TextLoader, DirectoryLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_google_genai import GoogleGenerativeAIEmbeddings
import google.api_core.exceptions

load_dotenv()
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")

DATA_PATH = "data/"
DB_FAISS_PATH = "vectorstore/db_faiss"

def create_vector_db():
    print("📂 Loading diseases.txt...")
    loader = DirectoryLoader(DATA_PATH, glob="*.txt", loader_cls=TextLoader)
    documents = loader.load()
    
    print("✂️ Splitting text...")
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    texts = text_splitter.split_documents(documents)
    print(f"📊 Total Chunks: {len(texts)}")

    print("🔌 Connecting to Google Cloud...")
    if not GOOGLE_API_KEY:
        print("❌ Error: GOOGLE_API_KEY not found in .env file")
        return

    # 🟢 FIXED: Use the modern standard embedding model
    embeddings = GoogleGenerativeAIEmbeddings(model="models/text-embedding-004")

    # 🟢 ULTRA-SAFE MODE: 1 Chunk at a time
    vector_db = None
    
    print("🚀 Starting processing (Slow & Safe Mode)...")

    for i, text in enumerate(texts):
        success = False
        retry_count = 0
        
        while not success and retry_count < 3:
            try:
                print(f"   Processing chunk {i+1}/{len(texts)}...", end="\r")
                
                # Send just ONE chunk
                if vector_db is None:
                    vector_db = FAISS.from_documents([text], embeddings)
                else:
                    vector_db.add_documents([text])
                
                success = True
                
                # 🟢 WAIT 2 SECONDS (Safe for text files)
                time.sleep(2) 

            except google.api_core.exceptions.ResourceExhausted:
                print(f"\n⚠️ Speed Limit Hit. Waiting 30 seconds...")
                time.sleep(30)
                retry_count += 1
            except Exception as e:
                print(f"\n❌ Error: {e}")
                break

    if vector_db:
        vector_db.save_local(DB_FAISS_PATH)
        print("\n✅ Success! Memory created without crashing.")
    else:
        print("\n❌ Failed to create memory.")

if __name__ == "__main__":
    create_vector_db()