import os
import csv
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv, find_dotenv

# ✅ LIGHTWEIGHT IMPORTS
from langchain_community.vectorstores import FAISS
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.tools import tool
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_core.messages import HumanMessage, AIMessage 
# ✅ SAFETY IMPORTS
from langchain_google_genai import HarmBlockThreshold, HarmCategory

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
AGENT_MODEL = "gemini-2.0-flash"
VECTORSTORE_PATH = "vectorstore/db_faiss"
DOCTORS_CSV = "data/doctors.csv"

# 🟢 DISABLE SAFETY FILTERS (So it answers medical questions from your book)
SAFETY_SETTINGS = {
    HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
}

# 🧠 MEMORY
chat_history = [] 

# =============================
# 2. Load Models
# =============================
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
    """Find a doctor by specialty and city from the database."""
    if not user_specialty or not city:
        return {"error": "Please provide both specialty and city."}

    city_in = city.lower().strip()
    spec_in = user_specialty.lower().strip()
    
    results = []
    try:
        with open(DOCTORS_CSV, mode='r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            for row in reader:
                if spec_in in row['specialty'].lower() and city_in == row['city'].lower():
                    results.append(row)

        if not results:
            return {"error": f"No {user_specialty} found in {city}."}

        rec_text = f"Found matches:\n"
        for r in results[:3]:
            rec_text += f"- {r['name']} ({r['address']})\n"
        return {"recommendations": rec_text, "specialty_found": user_specialty}

    except Exception as e:
        return {"error": str(e)}

@tool
def disease_info(query: str) -> str:
    """
    Use this tool to find information about diseases, symptoms, and treatments 
    FROM THE UPLOADED ENCYCLOPEDIA. 
    Input should be the disease name or question (e.g. 'What is flu?').
    """
    if not retriever: return "Knowledge base not loaded."
    
    # RAG: Fetch documents from your book
    docs = retriever.invoke(query)
    
    if not docs: 
        return "I checked the encyclopedia but found no information on that."
    
    # Return the exact content from the book
    return f"**From Encyclopedia:**\n{docs[0].page_content}"

@tool
def list_diseases() -> str:
    """Returns a list of diseases the bot can discuss."""
    return "I can discuss diseases found in the uploaded Gale Encyclopedia."

# =============================
# 4. Initialize Agent (STRICT PROMPT)
# =============================
llm = ChatGoogleGenerativeAI(model=AGENT_MODEL, google_api_key=GOOGLE_API_KEY, safety_settings=SAFETY_SETTINGS)
tools = [doctor_lookup, disease_info, list_diseases]

# 🔥 STRICT RAG PROMPT
system_prompt = """
You are Medibot, an AI assistant powered by a specific Medical Encyclopedia.

**STRICT RULES:**
1. **Always Check the Book:** If the user asks "What is [Disease]?", you MUST use the `disease_info` tool to read from the encyclopedia. Do NOT generate an answer from your own knowledge unless the tool returns nothing.
2. **Finding Doctors:** If the user asks to find a doctor, use `doctor_lookup`.
3. **Medical Safety:** If you provide symptoms or treatments, verify they come from the context provided by `disease_info`.
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

        # Specialty Extraction
        specialty = None
        lower_res = output_text.lower()
        keywords = {
            "cardiologist": "Cardiologist", "dermatologist": "Dermatologist", 
            "dentist": "Dentist", "neurologist": "Neurologist", 
            "orthopedic": "Orthopedic Surgeon", "gastroenterologist": "Gastroenterologist",
            "gynecologist": "Gynecologist", "pediatrician": "Pediatrician", 
            "urologist": "Urologist", "pulmonologist": "Pulmonologist", "ent": "ENT Specialist"
        }
        
        for k, v in keywords.items():
            if k in lower_res:
                specialty = v
                break

        return {"text": output_text, "specialty": specialty}

    except Exception as e:
        print(f"Error: {e}")
        return {"text": "Error processing your request.", "specialty": None}