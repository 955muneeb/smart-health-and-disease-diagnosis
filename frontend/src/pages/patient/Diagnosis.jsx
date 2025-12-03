// src/pages/patient/Diagnosis.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
// ✅ IMPORTING ONLY SAFE, STANDARD ICONS
import { 
  FaUserMd, FaArrowRight, FaStethoscope, FaThermometerThreeQuarters, 
  FaHeartbeat, FaTooth, FaEye, FaBone, FaBrain, FaAllergies, 
  FaWind, FaDeaf, FaWalking, FaMedkit, FaWeight, FaDizzy
} from "react-icons/fa";

const styles = {
  container: { padding: "40px 20px", maxWidth: "900px", margin: "0 auto", fontFamily: "sans-serif", textAlign: "center" },
  header: { marginBottom: "40px" },
  title: { fontSize: "2.5rem", color: "#333", marginBottom: "10px" },
  subtitle: { color: "#666", fontSize: "1.1rem" },
  
  // Card Grid
  grid: { 
    display: "grid", 
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", 
    gap: "20px", 
    marginTop: "30px" 
  },
  symptomCard: (isSelected) => ({
    padding: "20px", 
    borderRadius: "15px", 
    border: isSelected ? "2px solid #007bff" : "1px solid #eee",
    backgroundColor: isSelected ? "#e3f2fd" : "white", 
    cursor: "pointer", 
    transition: "transform 0.2s, box-shadow 0.2s",
    boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "10px",
    color: isSelected ? "#007bff" : "#555"
  }),
  icon: { fontSize: "30px", marginBottom: "5px" },

  // Result Section
  resultBox: { marginTop: "50px", padding: "40px", backgroundColor: "#d4edda", borderRadius: "15px", border: "1px solid #c3e6cb", boxShadow: "0 10px 20px rgba(0,0,0,0.1)" },
  recommendation: { fontSize: "2rem", fontWeight: "bold", color: "#155724", margin: "15px 0" },
  btnAction: {
    marginTop: "20px", padding: "15px 30px", backgroundColor: "#007bff", color: "white", 
    border: "none", borderRadius: "30px", fontSize: "18px", fontWeight: "bold", cursor: "pointer",
    display: "inline-flex", alignItems: "center", gap: "10px",
    boxShadow: "0 4px 10px rgba(0,123,255,0.3)"
  }
};

// 🩺 Knowledge Base (Using Safe Icons)
const symptomList = [
  { name: "Headache", icon: <FaDizzy /> }, 
  { name: "Fever", icon: <FaThermometerThreeQuarters /> },
  { name: "Chest Pain", icon: <FaHeartbeat /> },
  { name: "Stomach Pain", icon: <FaMedkit /> }, // Generic Medical Kit
  { name: "Cough / Flu", icon: <FaThermometerThreeQuarters /> }, // Reused Thermometer (Safe)
  { name: "Skin Rash", icon: <FaAllergies /> },
  { name: "Toothache", icon: <FaTooth /> },
  { name: "Joint Pain", icon: <FaBone /> },
  { name: "Back Pain", icon: <FaWalking /> }, 
  { name: "Blurred Vision", icon: <FaEye /> },
  { name: "Anxiety / Stress", icon: <FaBrain /> },
  { name: "Ear Pain", icon: <FaDeaf /> }, // Ear Icon
  { name: "Sore Throat", icon: <FaUserMd /> }, // Doctor Icon (Safe fallback)
  { name: "Breathing Issue", icon: <FaWind /> }, // Wind/Air Icon
  { name: "Sudden Weight Loss", icon: <FaWeight /> },
];

function Diagnosis() {
  const navigate = useNavigate();
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [result, setResult] = useState(null);

  const toggleSymptom = (symptomName) => {
    if (selectedSymptoms.includes(symptomName)) {
      setSelectedSymptoms(selectedSymptoms.filter(s => s !== symptomName));
    } else {
      setSelectedSymptoms([...selectedSymptoms, symptomName]);
    }
    setResult(null); 
  };

  // 🧠 "AI" LOGIC
  const analyzeSymptoms = () => {
    if (selectedSymptoms.length === 0) return alert("Please select at least one symptom.");

    let specialist = "General Physician"; 

    const s = selectedSymptoms;

    if (s.includes("Chest Pain") || s.includes("Breathing Issue")) specialist = "Cardiologist"; 
    
    else if (s.includes("Breathing Issue") && s.includes("Cough / Flu")) specialist = "Pulmonologist";

    else if (s.includes("Skin Rash")) specialist = "Dermatologist";
    
    else if (s.includes("Toothache")) specialist = "Dentist";
    
    else if (s.includes("Blurred Vision")) specialist = "Eye Specialist";
    
    else if (s.includes("Anxiety / Stress")) specialist = "Psychiatrist";
    
    else if (s.includes("Stomach Pain") || s.includes("Sudden Weight Loss")) specialist = "Gastroenterologist";
    
    else if (s.includes("Joint Pain") || s.includes("Back Pain")) specialist = "Orthopedic Surgeon";
    
    else if (s.includes("Ear Pain") || s.includes("Sore Throat")) specialist = "ENT Specialist";
    
    else if (s.includes("Headache") && s.includes("Blurred Vision")) specialist = "Neurologist";

    setResult(specialist);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <FaStethoscope style={{ fontSize: "60px", color: "#007bff", marginBottom: "20px" }} />
        <h1 style={styles.title}>AI Symptom Checker</h1>
        <p style={styles.subtitle}>Select your symptoms below to get an instant recommendation.</p>
      </div>

      {/* Symptom Selection Grid */}
      <div style={styles.grid}>
        {symptomList.map((item) => (
          <div 
            key={item.name} 
            style={styles.symptomCard(selectedSymptoms.includes(item.name))}
            onClick={() => toggleSymptom(item.name)}
          >
            <div style={styles.icon}>{item.icon}</div>
            <div style={{fontWeight: '500'}}>{item.name}</div>
          </div>
        ))}
      </div>

      <button onClick={analyzeSymptoms} style={{...styles.btnAction, backgroundColor: "#28a745", marginTop: "40px"}}>
        Analyze Symptoms
      </button>

      {/* Result Section */}
      {result && (
        <div style={styles.resultBox}>
          <h3>Based on your symptoms, we recommend seeing a:</h3>
          <div style={styles.recommendation}>{result}</div>
          
          <button 
            style={styles.btnAction}
            onClick={() => navigate(`/find-doctors?specialty=${encodeURIComponent(result)}`)}
          >
            Find {result}s Near You <FaArrowRight />
          </button>
        </div>
      )}
    </div>
  );
}

export default Diagnosis;