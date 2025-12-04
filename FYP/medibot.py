import os
import csv
import re
import streamlit as st
from dotenv import load_dotenv, find_dotenv
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_classic.chains import create_retrieval_chain
from langchain_classic.chains.combine_documents import create_stuff_documents_chain
from langchain_core.tools import Tool, tool
from langchain_classic.agents import create_tool_calling_agent, AgentExecutor
from langchain_core.messages import HumanMessage, AIMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from sentence_transformers import SentenceTransformer, util
import pandas as pd

# =============================
# Environment & Config
# =============================
load_dotenv(find_dotenv())

GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")
AGENT_MODEL = "gemini-2.0-flash"
VECTORSTORE_PATH = "vectorstore/db_faiss"
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
DOCTORS_CSV = "data/doctors.csv"

SAFETY_SETTINGS = {0: 0, 1: 0, 2: 0, 3: 0}

# =============================
# Semantic Mapping Model (Enhanced)
# =============================
embedding_model = SentenceTransformer('all-MiniLM-L6-v2')

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
    if best_score >= 0.4:  # Lowered threshold for better matching
        return best_specialty
    return None

# =============================
# Helper Functions (Updated: Removed is_irrelevant, Added Relevance Check via Vectorstore)
# =============================
def is_greeting(text: str) -> bool:
    greetings = ["hi", "hello", "hey", "good morning", "good afternoon", "good evening", "howdy"]
    return any(greet in text.lower() for greet in greetings)

def check_relevance_via_vectorstore(query: str, retrieval_chain) -> bool:
    """Check if the query is relevant by querying the vectorstore."""
    try:
        response = retrieval_chain.invoke({"input": query})
        answer = response.get("answer", "").strip()
        # Consider relevant if answer is substantial and not "I don't know"
        if len(answer) > 50 and "i don't know" not in answer.lower():
            return True
        return False
    except Exception:
        return False

def extract_disease_name(query: str) -> str:
    """Extract disease name from queries like 'tell about the X' or 'what is X'."""
    patterns = [
        r"(?:tell|can you tell) (?:me )?about (?:the )?([a-zA-Z\s]+)",
        r"what is ([a-zA-Z\s]+)",
        r"information on ([a-zA-Z\s]+)",
        r"about ([a-zA-Z\s]+)"
    ]
    for pattern in patterns:
        match = re.search(pattern, query.lower())
        if match:
            disease = match.group(1).strip()
            if len(disease.split()) <= 4:  # Limit to reasonable length
                return disease
    return None

# =============================
# Doctor Lookup Tool (Simplified: Only Priority Sorting, Text Recommendations)
# =============================
@tool(description="Find a doctor by specialty and city. Returns recommendations based on priority (higher priority shown first).")
def doctor_lookup(user_specialty: str, city: str) -> dict:
    if not user_specialty or not city:
        return {"error": "Please provide both the specialty and city."}

    city_input = city.lower().strip()
    specialty_mapped = map_input_to_specialty_semantic(user_specialty)
    
    if not specialty_mapped:
        return {"error": f"Sorry, I could not understand the specialty from '{user_specialty}'. Try being more specific, e.g., 'heart doctor'."}

    results = []

    try:
        with open(DOCTORS_CSV, mode='r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            for row in reader:
                if specialty_mapped.lower() in row['specialty'].lower() and city_input == row['city'].lower():
                    row_priority = int(row.get("priority", 0))  # Numeric priority, higher = better
                    
                    results.append({
                        "name": row["name"],
                        "specialty": row["specialty"],
                        "city": row["city"],
                        "address": row["address"],
                        "phone": row["phone"],
                        "priority": row_priority
                    })

        if not results:
            # Suggest alternatives
            alt_cities = set()
            with open(DOCTORS_CSV, mode='r', encoding='utf-8') as file:
                reader = csv.DictReader(file)
                for row in reader:
                    if specialty_mapped.lower() in row['specialty'].lower():
                        alt_cities.add(row['city'].title())
            alt_msg = f" No doctors found for '{specialty_mapped}' in '{city_input.title()}'. Try nearby cities: {', '.join(list(alt_cities)[:3])}." if alt_cities else ""
            return {"error": f"No doctors found for '{specialty_mapped}' in '{city_input.title()}'.{alt_msg}"}

        # Sort by priority descending (higher number first)
        results.sort(key=lambda x: -x["priority"])

        # Create DataFrame for internal use (but not displayed)
        df = pd.DataFrame(results)
        df = df[["name", "specialty", "city", "address", "phone", "priority"]]

        # Recommendations: Top 3 with labels based on priority
        top_recs = results[:3]
        rec_lines = []
        for r in top_recs:
            if r["priority"] == 5:
                label = "Most Recommended"
            elif r["priority"] == 4:
                label = "Recommended"
            elif r["priority"] == 3:
                label = "Good Option"
            else:
                label = "Available"
            rec_lines.append(f"- {r['name']} ({r['specialty']}, {label}) - Address: {r['address']}, Phone: {r['phone']}")
        rec_text = "Top Recommendations:\n" + "\n".join(rec_lines)

        return {
            "recommendations": rec_text
        }

    except Exception as e:
        return {"error": f"Error reading doctor data: {e}"}

# =============================
# Medical Knowledge Retrieval (Enhanced)
# =============================
# Load vectorstore for medical Q&A
embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
vectorstore = FAISS.load_local(VECTORSTORE_PATH, embeddings, allow_dangerous_deserialization=True)
retriever = vectorstore.as_retriever(search_kwargs={"k": 5})

qa_prompt = ChatPromptTemplate.from_template("""
You are a professional medical assistant. Answer the following medical question based ONLY on the provided context. Be informative, accurate, and professional. If the context does not contain relevant information about the query, respond with "I don't know" and do not make up information.

Context: {context}
Question: {input}

Answer:
""")

combine_docs_chain = create_stuff_documents_chain(ChatGoogleGenerativeAI(model=AGENT_MODEL, google_api_key=GOOGLE_API_KEY, safety_settings=SAFETY_SETTINGS), qa_prompt)
retrieval_chain = create_retrieval_chain(retriever, combine_docs_chain)

# New Tool for Disease Information (Updated to Query Sections Separately)
@tool(description="Retrieve detailed information about a specific disease from the medical knowledge base. If the disease is not in the database, it will say 'I don't know'.")
def disease_info(disease_name: str) -> str:
    """Retrieve information about a disease by querying each section separately."""
    if not disease_name:
        return "Please specify a disease name."
    
    sections = {
        "Description": f"What is the description of {disease_name}?",
        "Causes": f"What are the causes of {disease_name}?",
        "Symptoms": f"What are the symptoms of {disease_name}?",
        "Prevention": f"What are the prevention methods for {disease_name}?"
    }
    
    structured_info = []
    
    try:
        for section, query in sections.items():
            response = retrieval_chain.invoke({"input": query})
            answer = response.get("answer", "").strip()
            # Only include if answer is meaningful and not "I don't know"
            if answer and len(answer) > 10 and "i don't know" not in answer.lower():
                structured_info.append(f"**{section}:**\n{answer}")
        
        if not structured_info:
            return f"I don't have information on '{disease_name}' in my knowledge base."
        
        # Combine sections
        full_answer = "\n\n".join(structured_info)
        
        # Add source disclaimer
        return f"**Information on {disease_name.title()}:**\n\n{full_answer}\n\n*Note: This is based on general medical knowledge. Consult a doctor for personalized advice.*"
    except Exception as e:
        return f"Error retrieving information: {e}"

# Tool to List All Diseases in Vectorstore (for completeness)
@tool(description="List all diseases available in the medical knowledge base.")
def list_diseases() -> str:
    """List all diseases in the vectorstore."""
    try:
        # This is a simplified way; in practice, you might need to index or store disease names separately
        # For now, assume diseases are queried via similarity
        # Placeholder: In a real scenario, maintain a list of diseases.
        diseases = ["Diabetes", "Cancer", "Heart Disease", "Asthma", "Flu", "COVID-19", "Hypertension", "Arthritis"]  # Example; replace with actual from your data
        return "Diseases in my knowledge base: " + ", ".join(diseases)
    except Exception as e:
        return f"Error listing diseases: {e}"

# =============================
# Streamlit App (Chatbot Only, Text Recommendations, Relevance Check via Vectorstore, Disease Detection)
# =============================
def main():
    st.set_page_config(page_title="Medibot Pro", page_icon="🧑‍⚕️")
    st.title("Medibot Pro")
    st.markdown("AI assistant for medical questions, symptoms, doctor lookup, and more. Ask me anything!")

    if "messages" not in st.session_state:
        st.session_state.messages = []
    if "chat_history" not in st.session_state:
        st.session_state.chat_history = []

    # Initialize agent with all tools
    llm = ChatGoogleGenerativeAI(model=AGENT_MODEL, google_api_key=GOOGLE_API_KEY, safety_settings=SAFETY_SETTINGS)
    doctor_tool = doctor_lookup
    disease_tool = disease_info
    list_diseases_tool = list_diseases
    tools = [doctor_tool, disease_tool, list_diseases_tool]

    system_prompt = "You are Medibot, a professional medical assistant. Answer medical queries, provide doctor info, and use tools when needed. For doctor lookups, extract specialty and city from user input. For disease queries, use the disease_info tool. If unsure, say 'I don't know'. Always provide helpful responses."
    agent_prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{input}"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ])

    agent = create_tool_calling_agent(llm, tools, agent_prompt)
    agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)

    # Display chat messages
    for msg in st.session_state.messages:
        with st.chat_message(msg["role"]):
            st.markdown(msg["content"])
            # If the message has extra data (like recommendations), display it
            if "extra" in msg:
                if "recommendations" in msg["extra"]:
                    st.write(msg["extra"]["recommendations"])

    # Handle user input
    if user_input := st.chat_input("Enter your query..."):
        st.session_state.messages.append({"role": "user", "content": user_input})
        with st.chat_message("user"):
            st.markdown(user_input)

        with st.chat_message("assistant"):
            with st.spinner("Processing..."):
                try:
                    extra_data = None  # Initialize to avoid UnboundLocalError
                    if is_greeting(user_input):
                        reply = "Hello! How can I help you with a medical query, doctor search, or disease information today?"
                    else:
                        # Check relevance via vectorstore pre-query
                        if not check_relevance_via_vectorstore(user_input, retrieval_chain):
                            reply = "I can only answer medical-related questions, assist with doctor lookups, or provide disease information. Please ask something related to health or medicine."
                        else:
                            # Check for disease query and handle directly
                            disease_name = extract_disease_name(user_input)
                            if disease_name:
                                reply = disease_info.invoke({"disease_name": disease_name})
                            else:
                                # Use agent for other queries
                                response = agent_executor.invoke({
                                    "input": user_input,
                                    "chat_history": st.session_state.chat_history
                                })
                                reply = response.get("output", "I could not process your request.")
                                
                                # Check if tool was used and parse for display
                                if "doctor_lookup" in str(response) or "doctor" in user_input.lower():
                                    # Attempt to extract tool result (simplified; in practice, inspect response more deeply)
                                    # For now, if it's a doctor query, call the tool directly for display
                                    specialty_match = re.search(r"(\w+) doctor", user_input.lower())
                                    city_match = re.search(r"in (\w+)", user_input.lower())
                                    if specialty_match and city_match:
                                        tool_result = doctor_lookup.invoke({"user_specialty": specialty_match.group(1), "city": city_match.group(1)})
                                        if "error" not in tool_result:
                                            extra_data = tool_result
                                            reply = "Here are the doctors I found based on your query:"
                                        else:
                                            reply = tool_result["error"]
                                elif "disease" in user_input.lower() and "info" in user_input.lower():
                                    # For disease info, the agent should handle it, but ensure display
                                    pass  # Agent output should suffice

                    # Append to messages with extra data if any
                    msg_dict = {"role": "assistant", "content": reply}
                    if extra_data:
                        msg_dict["extra"] = extra_data
                    st.session_state.messages.append(msg_dict)
                    st.session_state.chat_history.append(HumanMessage(content=user_input))
                    st.session_state.chat_history.append(AIMessage(content=reply))
                    
                    # Display reply
                    st.markdown(reply)
                    if extra_data:
                        if "recommendations" in extra_data:
                            st.write(extra_data["recommendations"])

                except Exception as e:
                    st.error(f"Error: {e}")

if __name__ == "__main__":
    main()
