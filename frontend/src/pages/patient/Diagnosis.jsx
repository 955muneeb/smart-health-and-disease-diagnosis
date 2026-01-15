// src/pages/patient/Diagnosis.js
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FaPaperPlane, FaUserMd, FaRobot, FaStethoscope,
  FaHeadSideVirus, FaHeartbeat, FaTooth, FaRunning 
} from "react-icons/fa";

const styles = {
  container: { maxWidth: "800px", margin: "30px auto", fontFamily: "sans-serif", display: "flex", flexDirection: "column", height: "85vh", border: "1px solid #ddd", borderRadius: "12px", overflow: "hidden", backgroundColor: "white", boxShadow: "0 10px 30px rgba(0,0,0,0.1)" },
  
  // Header
  header: { padding: "20px", backgroundColor: "#007bff", color: "white", display: "flex", alignItems: "center", gap: "15px" },
  title: { margin: 0, fontSize: "1.2rem" },
  subtitle: { margin: 0, fontSize: "0.9rem", opacity: 0.8 },

  // Chat Area
  chatBox: { flex: 1, padding: "20px", overflowY: "auto", backgroundColor: "#f4f7f6", display: "flex", flexDirection: "column", gap: "15px" },
  
  // Messages
  messageRow: (isBot) => ({ display: "flex", justifyContent: isBot ? "flex-start" : "flex-end" }),
  bubble: (isBot) => ({
    maxWidth: "70%", padding: "12px 16px", borderRadius: "12px", lineHeight: "1.5", fontSize: "15px",
    backgroundColor: isBot ? "white" : "#007bff", 
    color: isBot ? "#333" : "white",
    borderTopLeftRadius: isBot ? "0" : "12px",
    borderTopRightRadius: isBot ? "12px" : "0",
    boxShadow: "0 2px 5px rgba(0,0,0,0.05)"
  }),

  // Input Area
  inputArea: { padding: "20px", backgroundColor: "white", borderTop: "1px solid #eee" },
  quickChips: { display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "15px", marginBottom: "10px" },
  chip: { padding: "8px 15px", borderRadius: "20px", backgroundColor: "#e3f2fd", color: "#007bff", border: "none", cursor: "pointer", whiteSpace: "nowrap", fontSize: "13px", fontWeight: "600", display: "flex", alignItems: "center", gap: "5px" },
  inputRow: { display: "flex", gap: "10px" },
  input: { flex: 1, padding: "12px", borderRadius: "25px", border: "1px solid #ddd", outline: "none", fontSize: "16px" },
  sendBtn: { width: "50px", height: "50px", borderRadius: "50%", backgroundColor: "#007bff", color: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },

  // Action Button inside Chat
  bookButton: {
    marginTop: "10px", display: "inline-block", padding: "10px 20px", backgroundColor: "#28a745", color: "white", 
    borderRadius: "5px", textDecoration: "none", fontSize: "14px", fontWeight: "bold", cursor: "pointer", border: "none"
  }
};

function Diagnosis() {
  const navigate = useNavigate();
  const bottomRef = useRef(null);
  
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { id: 1, sender: "bot", text: "Hello! I am your AI Health Assistant. Describe your symptoms or click a quick option below." }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ✅ UPDATED: Connects to your Python API
  const handleSend = async (textOverride) => {
    const text = textOverride || input;
    if (!text.trim()) return;

    // 1. Add User Message to UI
    const userMsg = { id: Date.now(), sender: "user", text: text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      // 2. Send Data to Python Server
      const API_BASE =
        process.env.REACT_APP_API_URL || "http://localhost:8000";

      const response = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: text }),
      });

      const data = await response.json();

      // 3. Display AI Response
      const botMsg = { 
        id: Date.now() + 1, 
        sender: "bot", 
        text: data.text,        // Text from Python
        specialty: data.specialty // Specialty from Python
      };
      
      setMessages(prev => [...prev, botMsg]);

    } catch (error) {
      console.error("Error connecting to Chatbot:", error);
      const errorMsg = { 
        id: Date.now() + 1, 
        sender: "bot", 
        text: "⚠️ Error: Could not connect to the AI Server. Make sure your Python backend is running!" 
      };
      setMessages(prev => [...prev, errorMsg]);
    }
    
    setIsTyping(false);
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{backgroundColor: "white", padding: "8px", borderRadius: "50%", color: "#007bff"}}>
          <FaRobot size={24} />
        </div>
        <div>
          <h2 style={styles.title}>AI Diagnosis Chat</h2>
          <p style={styles.subtitle}>Powered by Medibot</p>
        </div>
      </div>

      {/* Chat Area */}
      <div style={styles.chatBox}>
        {messages.map((msg) => (
          <div key={msg.id} style={styles.messageRow(msg.sender === "bot")}>
            {msg.sender === "bot" && <FaStethoscope style={{marginRight: "10px", marginTop: "5px", color: "#007bff"}} />}
            
            <div style={styles.bubble(msg.sender === "bot")}>
              {msg.text}
              
              {/* Button inside Chat */}
              {msg.specialty && (
                <div style={{marginTop: "10px"}}>
                  <button 
                    style={styles.bookButton}
                    onClick={() => navigate(`/find-doctors?specialty=${encodeURIComponent(msg.specialty)}`)}
                  >
                    Find {msg.specialty}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isTyping && <div style={{color: "#888", fontSize: "14px", marginLeft: "40px"}}>AI is typing...</div>}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div style={styles.inputArea}>
        
        {/* Quick Chips */}
        <div style={styles.quickChips}>
          <button style={styles.chip} onClick={() => handleSend("I have a severe headache")}>
            <FaHeadSideVirus /> Headache
          </button>
          <button style={styles.chip} onClick={() => handleSend("I feel chest pain")}>
            <FaHeartbeat /> Chest Pain
          </button>
          <button style={styles.chip} onClick={() => handleSend("My tooth hurts")}>
            <FaTooth /> Toothache
          </button>
          <button style={styles.chip} onClick={() => handleSend("My knee hurts")}>
            <FaRunning /> Joint Pain
          </button>
        </div>

        {/* Text Input */}
        <div style={styles.inputRow}>
          <input 
            style={styles.input} 
            placeholder="Type your symptoms here..." 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          />
          <button style={styles.sendBtn} onClick={() => handleSend()}>
            <FaPaperPlane size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default Diagnosis;