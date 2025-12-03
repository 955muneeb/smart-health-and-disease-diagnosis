// src/pages/doctor/ConsultationModal.js
import React, { useState, useEffect } from "react";
import { db } from "../../services/firebase";
import { doc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { FaPlus, FaTrash, FaHistory, FaStethoscope, FaTimes } from "react-icons/fa";

const styles = {
  overlay: { position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 },
  container: { backgroundColor: "white", width: "90%", maxWidth: "1000px", height: "85vh", borderRadius: "12px", display: "flex", overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,0.3)" },
  
  // Left Side: History
  sidebar: { width: "30%", backgroundColor: "#f8f9fa", borderRight: "1px solid #ddd", padding: "20px", overflowY: "auto" },
  historyCard: { backgroundColor: "white", padding: "15px", borderRadius: "8px", border: "1px solid #eee", marginBottom: "15px", fontSize: "14px" },
  
  // Right Side: Consultation Form
  main: { flex: 1, padding: "30px", overflowY: "auto", display: "flex", flexDirection: "column" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid #eee", paddingBottom: "15px" },
  inputGroup: { marginBottom: "20px" },
  label: { display: "block", marginBottom: "8px", fontWeight: "bold", color: "#333" },
  textarea: { width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "16px", minHeight: "80px" },
  
  // Medicine Table
  medTable: { width: "100%", borderCollapse: "collapse", marginBottom: "15px" },
  th: { textAlign: "left", padding: "10px", borderBottom: "2px solid #eee", color: "#666", fontSize: "14px" },
  td: { padding: "10px", borderBottom: "1px solid #eee" },
  medInput: { width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ddd" },
  
  // Buttons
  addBtn: { backgroundColor: "#e3f2fd", color: "#007bff", border: "none", padding: "8px 12px", borderRadius: "4px", cursor: "pointer", fontSize: "13px", display: "flex", alignItems: "center", gap: "5px" },
  saveBtn: { backgroundColor: "#28a745", color: "white", border: "none", padding: "15px", borderRadius: "8px", fontSize: "16px", fontWeight: "bold", cursor: "pointer", marginTop: "auto" },
  closeBtn: { background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#888" }
};

function ConsultationModal({ appointment, onClose, onSave }) {
  const [activeTab, setActiveTab] = useState("consultation"); // 'history' or 'consultation' (for mobile)
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Form State
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [medicines, setMedicines] = useState([
    { name: "", dosage: "", duration: "" } // Start with one empty row
  ]);

  // 1. Fetch Patient History (Previous COMPLETED appointments)
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const q = query(
          collection(db, "appointments"),
          where("patientId", "==", appointment.patientId),
          where("status", "==", "completed") // Only past records
        );
        const snapshot = await getDocs(q);
        const historyData = snapshot.docs.map(doc => doc.data());
        // Sort by date (newest first)
        historyData.sort((a, b) => new Date(b.date) - new Date(a.date));
        setHistory(historyData);
      } catch (error) {
        console.error("Error fetching history", error);
      }
      setLoadingHistory(false);
    };
    fetchHistory();
  }, [appointment.patientId]);

  // 2. Handle Medicine Rows
  const updateMedicine = (index, field, value) => {
    const newMeds = [...medicines];
    newMeds[index][field] = value;
    setMedicines(newMeds);
  };

  const addRow = () => {
    setMedicines([...medicines, { name: "", dosage: "", duration: "" }]);
  };

  const removeRow = (index) => {
    const newMeds = medicines.filter((_, i) => i !== index);
    setMedicines(newMeds);
  };

  // 3. Save Record Logic
  const handleFinish = async () => {
    if (!diagnosis) return alert("Please enter a diagnosis");

    const recordData = {
      status: "completed",
      diagnosis: diagnosis,
      notes: notes,
      prescription: medicines, // Saves the array of medicines
      completedAt: new Date().toISOString()
    };

    try {
      // Update the appointment document in Firebase
      const apptRef = doc(db, "appointments", appointment.id);
      await updateDoc(apptRef, recordData);
      
      alert("✅ Consultation Saved & Prescription Sent!");
      onSave(); // Refresh parent dashboard
      onClose();
    } catch (error) {
      console.error(error);
      alert("Error saving record");
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        
        {/* LEFT SIDE: PATIENT HISTORY */}
        <div style={styles.sidebar}>
          <h3 style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
            <FaHistory /> Patient History
          </h3>
          <p style={{fontSize: '13px', color: '#666', marginBottom: '20px'}}>
            Past records for {appointment.patientName}
          </p>

          {loadingHistory ? <p>Loading records...</p> : history.length === 0 ? (
            <p style={{color: '#999', fontStyle: 'italic'}}>No previous history found.</p>
          ) : (
            history.map((record, index) => (
              <div key={index} style={styles.historyCard}>
                <div style={{fontWeight: 'bold', color: '#007bff'}}>{record.date}</div>
                <div style={{fontWeight: 'bold', margin: '5px 0'}}>Dx: {record.diagnosis}</div>
                <div style={{fontSize: '13px', color: '#555'}}>
                  💊 {record.prescription?.map(m => m.name).join(", ")}
                </div>
              </div>
            ))
          )}
        </div>

        {/* RIGHT SIDE: CONSULTATION */}
        <div style={styles.main}>
          <div style={styles.header}>
            <div>
              <h2 style={{margin: 0}}>Treating: {appointment.patientName}</h2>
              <span style={{color: '#666', fontSize: '14px'}}>Sex: {appointment.gender || 'N/A'} • Age: {appointment.age || 'N/A'}</span>
            </div>
            <button style={styles.closeBtn} onClick={onClose}><FaTimes /></button>
          </div>

          {/* Diagnosis */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Diagnosis (Problem)</label>
            <input 
              style={{...styles.medInput, fontSize: '16px', fontWeight: 'bold'}} 
              placeholder="e.g. Acute Bronchitis"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
            />
          </div>

          {/* Medicines Table */}
          <div style={styles.inputGroup}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px'}}>
              <label style={{...styles.label, marginBottom:0}}>Prescription</label>
              <button style={styles.addBtn} onClick={addRow}><FaPlus /> Add Medicine</button>
            </div>
            
            <table style={styles.medTable}>
              <thead>
                <tr>
                  <th style={styles.th}>Medicine Name</th>
                  <th style={styles.th}>Dosage (e.g. 1-0-1)</th>
                  <th style={styles.th}>Duration</th>
                  <th style={styles.th}></th>
                </tr>
              </thead>
              <tbody>
                {medicines.map((med, index) => (
                  <tr key={index}>
                    <td style={styles.td}>
                      <input 
                        style={styles.medInput} 
                        placeholder="e.g. Panadol" 
                        value={med.name}
                        onChange={(e) => updateMedicine(index, 'name', e.target.value)}
                      />
                    </td>
                    <td style={styles.td}>
                      <input 
                        style={styles.medInput} 
                        placeholder="1-0-1" 
                        value={med.dosage}
                        onChange={(e) => updateMedicine(index, 'dosage', e.target.value)}
                      />
                    </td>
                    <td style={styles.td}>
                      <input 
                        style={styles.medInput} 
                        placeholder="3 Days" 
                        value={med.duration}
                        onChange={(e) => updateMedicine(index, 'duration', e.target.value)}
                      />
                    </td>
                    <td style={styles.td}>
                      {medicines.length > 1 && (
                        <FaTrash style={{color: '#dc3545', cursor: 'pointer'}} onClick={() => removeRow(index)} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Notes */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Doctor's Notes / Advice</label>
            <textarea 
              style={styles.textarea} 
              placeholder="e.g. Drink plenty of water, avoid cold drinks..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <button style={styles.saveBtn} onClick={handleFinish}>
            Finish & Save Record
          </button>
        </div>

      </div>
    </div>
  );
}

export default ConsultationModal;