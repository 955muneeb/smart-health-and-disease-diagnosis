import os
import csv
import difflib
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv, find_dotenv

# ✅ LIGHTWEIGHT IMPORTS
from langchain_community.vectorstores import FAISS
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.tools import tool
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings, HarmBlockThreshold, HarmCategory
from langchain_core.messages import HumanMessage, AIMessage 

# =============================
# 1. Config & Setup
# =============================
load_dotenv(find_dotenv())

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")

# 🟢 FIXED: Use the standard stable model
AGENT_MODEL = "gemini-flash-latest"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
VECTORSTORE_PATH = os.path.join(BASE_DIR, "vectorstore", "db_faiss")
DOCTORS_CSV = os.path.join(BASE_DIR, "data", "doctors.csv")

# Disable Safety Filters
SAFETY_SETTINGS = {
    HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
}

chat_history = [] 

# =============================
# 2. Load Models
# =============================
# 🟢 FIXED: Use the standard stable embedding model
embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")

try:
    vectorstore = FAISS.load_local(VECTORSTORE_PATH, embeddings, allow_dangerous_deserialization=True)
    retriever = vectorstore.as_retriever(search_kwargs={"k": 5})
except Exception as e:
    print(f"Warning: Could not load vectorstore. Error: {e}")
    retriever = None

# =============================
# 3. Tools
# =============================

@tool
def doctor_lookup(user_specialty: str, city: str) -> dict:
    """Find a doctor by specialty and city from the database. Handles spelling errors."""
    if not user_specialty or not city:
        return {"error": "Please provide both specialty and city."}

    city_in = city.lower().strip()
    spec_in = user_specialty.lower().strip()
    
    results = []
    all_cities = set() 

    try:
        with open(DOCTORS_CSV, mode='r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            rows = list(reader)
            
            for row in rows:
                if row['city']:
                    all_cities.add(row['city'].lower())

            # Fuzzy Match City
            if city_in not in all_cities:
                matches = difflib.get_close_matches(city_in, list(all_cities), n=1, cutoff=0.6)
                if matches:
                    city_in = matches[0]

            for row in rows:
                if spec_in in row['specialty'].lower() and city_in == row['city'].lower():
                    results.append(row)

        if not results:
            return {"error": f"No {user_specialty} found in {city_in.title()}."}

        rec_text = f"Found matches in {city_in.title()}:\n"
        for r in results[:3]:
            phone = r.get('phone', 'N/A')
            rec_text += f"- {r['name']} ({r['address']}) - 📞 {phone}\n"
        
        # Return clean specialty for button logic
        found_specialty = results[0]['specialty'] if results else user_specialty
        return {"recommendations": rec_text, "specialty_found": found_specialty}

    except Exception as e:
        return {"error": str(e)}

@tool
def disease_info(query: str) -> str:
    """Find disease info from the encyclopedia."""
    if not retriever: return "Knowledge base not loaded."
    docs = retriever.invoke(query)
    if not docs: return "I checked the encyclopedia but found no information."
    return f"**From Encyclopedia:**\n{docs[0].page_content}"

@tool
def list_diseases() -> str:
    """Returns a list of diseases found in the uploaded Encyclopedia."""
    return "I can discuss diseases found in the uploaded Encyclopedia."

# =============================
# 4. Initialize Agent
# =============================
llm = ChatGoogleGenerativeAI(model=AGENT_MODEL, google_api_key=GOOGLE_API_KEY, safety_settings=SAFETY_SETTINGS)
tools = [doctor_lookup, disease_info, list_diseases]

system_prompt = """
You are Medibot, an empathetic AI medical assistant. 

**Rules:**
1. If the user asks about a disease, use `disease_info`.
2. If the user asks for a doctor, use `doctor_lookup`. 
   - Fix severe typos (e.g. "insmlbd" -> "Islamabad") before calling the tool.
   - Always display the Name, Address, and Phone Number from the tool.
3. If the user describes symptoms, ask clarification questions first.
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
# 5. API Endpoint
# =============================
class UserQuery(BaseModel):
    message: str

@app.post("/chat")
async def chat_endpoint(query: UserQuery):
    try:
        global chat_history
        if len(chat_history) > 10:
            chat_history = chat_history[-10:]

        response = agent_executor.invoke({
            "input": query.message,
            "chat_history": chat_history 
        })
        
        output_text = response.get("output", "I could not process that.")

        chat_history.append(HumanMessage(content=query.message))
        chat_history.append(AIMessage(content=output_text))

        specialty = None
        lower_res = output_text.lower()
        keywords = {
            "cardiolog": "Cardiologist", "dermatolog": "Dermatologist", 
            "dentist": "Dentist", "neurolog": "Neurologist", 
            "orthopedic": "Orthopedic Surgeon", "gastro": "Gastroenterologist", "stomach": "Gastroenterologist",
            "gynecol": "Gynecologist", "women": "Gynecologist",
            "pediatric": "Pediatrician", "child": "Pediatrician",
            "urolog": "Urologist", "kidney": "Urologist",
            "pulmonolog": "Pulmonologist", "lung": "Pulmonologist",
            "ent": "ENT Specialist", "throat": "ENT Specialist", "ear": "ENT Specialist"
        }
        
        for k, v in keywords.items():
            if k in lower_res:
                specialty = v
                break

        return {"text": output_text, "specialty": specialty}

    except Exception as e:
        print(f"Error: {e}")
        return {"text": "Error processing your request.", "specialty": None}