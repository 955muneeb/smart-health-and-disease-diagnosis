import os
import csv
import re
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv, find_dotenv

# =============================
# ✅ FIXED IMPORTS (No more langchain_classic)
# =============================
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.tools import tool
# Fixed: Import from standard langchain, not classic
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_google_genai import ChatGoogleGenerativeAI
from sentence_transformers import SentenceTransformer, util
from langchain_core.messages import HumanMessage, AIMessage 

# =============================
# 1. Config & Setup
# =============================
load_dotenv(find_dotenv())

app = FastAPI()

# Allow React to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://your-react-app.netlify.app"], # Add your Netlify URL here later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")
AGENT_MODEL = "gemini-2.0-flash"
VECTORSTORE_PATH = "vectorstore/db_faiss"
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
DOCTORS_CSV = "data/doctors.csv"
SAFETY_SETTINGS = {0: 0, 1: 0, 2: 0, 3: 0}

# 🧠 GLOBAL MEMORY
chat_history = [] 

# Load Models
embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)

try:
    vectorstore = FAISS.load_local(VECTORSTORE_PATH, embeddings, allow_dangerous_deserialization=True)
    retriever = vectorstore.as_retriever(search_kwargs={"k": 5})
except Exception as e:
    print(f"Warning: Could not load vectorstore. Error: {e}")
    retriever = None

# =============================
# 2. Tools
# =============================

SPECIALTY_DESCRIPTIONS = {
    "Cardiologist": "Heart specialist, cardiology, cardiac doctor, heart problems, chest pain, heart attack",
    "Dentist": "Teeth doctor, dental care, tooth problems, gum issues, cavities, oral health",
    "Dermatologist": "Skin doctor, acne, rash, eczema, skin problems, dermatology, moles",
    "Pediatrician": "Child doctor, pediatrician, baby, kids, children, infant care, vaccinations",
    "Gynecologist": "Women doctor, pregnancy, gynecologist, obgyn, women's health, menstrual issues",
    "Neurologist": "Brain specialist, nerve doctor, headache, seizure, neurologist, stroke, epilepsy",
    "Orthopedic Surgeon": "Bone, joint, fracture, orthopedic surgeon, back pain, arthritis, sports injuries",
    "ENT Specialist": "Ear, nose, throat, ENT, hearing, tonsils, sinus, allergies",
    "Urologist": "Urinary, kidney, bladder, urologist, urine problems, prostate, incontinence",
    "Endocrinologist": "Hormone, thyroid, diabetes, endocrinologist, metabolism, glands",
    "Psychiatrist": "Mental health, depression, anxiety, stress, psychiatrist, therapy, counseling",
    "Pulmonologist": "Lung specialist, breathing problems, asthma, pulmonologist, COPD, pneumonia",
    "Oncologist": "Cancer, tumor, oncologist, oncology, chemotherapy, radiation"
}

def map_input_to_specialty_semantic(user_input: str) -> str:
    user_emb = embedding_model.encode(user_input, convert_to_tensor=True)
    best_score = 0
    best_specialty = None
    for specialty, desc in SPECIALTY_DESCRIPTIONS.items():
        desc_emb = embedding_model.encode(desc, convert_to_tensor=True)
        score = util.pytorch_cos_sim(user_emb, desc_emb).item()
        if score > best_score:
            best_score = score
            best_specialty = specialty
    if best_score >= 0.4:
        return best_specialty
    return None

@tool
def doctor_lookup(user_specialty: str, city: str) -> dict:
    """Find a doctor by specialty and city from the database."""
    if not user_specialty or not city:
        return {"error": "Please provide both the specialty and city."}

    city_input = city.lower().strip()
    specialty_mapped = map_input_to_specialty_semantic(user_specialty)
    
    if not specialty_mapped:
        return {"error": f"Could not match specialty '{user_specialty}'."}

    results = []
    try:
        with open(DOCTORS_CSV, mode='r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            for row in reader:
                if specialty_mapped.lower() in row['specialty'].lower() and city_input == row['city'].lower():
                    results.append(row)

        if not results:
            return {"error": f"No doctors found for {specialty_mapped} in {city_input}."}

        rec_text = f"Found {len(results)} {specialty_mapped}s in {city_input}:\n"
        for r in results[:3]:
            rec_text += f"- {r['name']} ({r['address']})\n"
        return {"recommendations": rec_text, "specialty_found": specialty_mapped}

    except Exception as e:
        return {"error": str(e)}

@tool
def disease_info(disease_name: str) -> str:
    """Retrieve detailed medical information about a disease."""
    if not retriever: return "Knowledge base not loaded."
    docs = retriever.invoke(f"What is {disease_name}?")
    if not docs: return f"I don't have info on {disease_name}."
    return f"**Info on {disease_name}:**\n{docs[0].page_content}"

@tool
def list_diseases() -> str:
    """Returns a list of diseases the bot can discuss."""
    return "I can discuss Diabetes, Heart Disease, Flu, and more."

# =============================
# 3. Initialize Agent
# =============================
llm = ChatGoogleGenerativeAI(model=AGENT_MODEL, google_api_key=GOOGLE_API_KEY, safety_settings=SAFETY_SETTINGS)
tools = [doctor_lookup, disease_info, list_diseases]

system_prompt = """
You are Medibot, an empathetic and professional AI medical assistant. 

**Logic for answering:**
1. If the user asks about a disease (symptoms, causes), use the 'disease_info' tool.
2. If the user asks for a doctor (e.g. "Find a cardiologist in Lahore"), use the 'doctor_lookup' tool.
3. If the user describes symptoms ("I have leg pain"), ASK clarification questions first. Do NOT use tools immediately.
"""

agent_prompt = ChatPromptTemplate.from_messages([
    ("system", system_prompt),
    MessagesPlaceholder(variable_name="chat_history"),
    ("human", "{input}"),
    ("placeholder", "{agent_scratchpad}"),
])

agent = create_tool_calling_agent(llm, tools, agent_prompt)
agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)

# =============================
# 4. API Endpoint (Optimized)
# =============================
class UserQuery(BaseModel):
    message: str

@app.post("/chat")
async def chat_endpoint(query: UserQuery):
    try:
        # 1. OPTIMIZATION: Sliding Window
        global chat_history
        if len(chat_history) > 10:
            chat_history = chat_history[-10:]

        # 2. Run Agent
        response = agent_executor.invoke({
            "input": query.message,
            "chat_history": chat_history 
        })
        
        output_text = response.get("output", "I could not process that.")

        # 3. Update Memory
        chat_history.append(HumanMessage(content=query.message))
        chat_history.append(AIMessage(content=output_text))

        # 4. Extract Specialty Logic
        specialty = None
        lower_res = output_text.lower()
        
        if "cardiologist" in lower_res: specialty = "Cardiologist"
        elif "dermatologist" in lower_res: specialty = "Dermatologist"
        elif "dentist" in lower_res: specialty = "Dentist"
        elif "neurologist" in lower_res: specialty = "Neurologist"
        elif "orthopedic" in lower_res: specialty = "Orthopedic Surgeon"
        elif "gastroenterologist" in lower_res: specialty = "Gastroenterologist"
        elif "gynecologist" in lower_res: specialty = "Gynecologist"
        elif "pediatrician" in lower_res: specialty = "Pediatrician"
        elif "urologist" in lower_res: specialty = "Urologist"
        elif "pulmonologist" in lower_res: specialty = "Pulmonologist"
        elif "ent" in lower_res: specialty = "ENT Specialist"

        return {
            "text": output_text,
            "specialty": specialty
        }

    except Exception as e:
        print(f"Error: {e}")
        return {"text": "Error processing your request.", "specialty": None}