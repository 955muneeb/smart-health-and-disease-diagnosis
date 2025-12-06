import React, { useState, useEffect } from "react";
import { db } from "../../services/firebase";
import { doc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { FaHistory, FaTimes, FaFileAlt, FaUserInjured } from "react-icons/fa";

// ... (Keep your existing styles object here) ...
const styles = {
  overlay: { position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 },
  container: { backgroundColor: "white", width: "90%", maxWidth: "1000px", height: "85vh", borderRadius: "12px", display: "flex", overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,0.3)" },
  sidebar: { width: "35%", backgroundColor: "#f8f9fa", borderRight: "1px solid #ddd", padding: "20px", overflowY: "auto" },
  historyCard: { backgroundColor: "white", padding: "15px", borderRadius: "8px", border: "1px solid #eee", marginBottom: "15px", fontSize: "14px" },
  reportLink: { display: "flex", alignItems: "center", gap: "10px", padding: "10px", backgroundColor: "#e3f2fd", borderRadius: "8px", marginBottom: "8px", textDecoration: "none", color: "#007bff", fontSize: "13px", fontWeight: "bold" },
  main: { flex: 1, padding: "30px", overflowY: "auto", display: "flex", flexDirection: "column" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid #eee", paddingBottom: "15px" },
  inputGroup: { marginBottom: "20px" },
  label: { display: "block", marginBottom: "8px", fontWeight: "bold", color: "#333" },
  textarea: { width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "16px", minHeight: "80px" },
  medTable: { width: "100%", borderCollapse: "collapse", marginBottom: "15px" },
  th: { textAlign: "left", padding: "10px", borderBottom: "2px solid #eee", color: "#666", fontSize: "14px" },
  td: { padding: "10px", borderBottom: "1px solid #eee" },
  medInput: { width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ddd" },
  saveBtn: { backgroundColor: "#28a745", color: "white", border: "none", padding: "15px", borderRadius: "8px", fontSize: "16px", fontWeight: "bold", cursor: "pointer", marginTop: "auto" },
  closeBtn: { background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#888" },
  addBtn: { backgroundColor: "#007bff", color: "white", border: "none", padding: "5px 10px", borderRadius: "5px", cursor: "pointer", fontSize: "12px" }
};

function ConsultationModal({ appointment, onClose, onSave }) {
  const [history, setHistory] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [medicines, setMedicines] = useState([{ name: "", dosage: "", duration: "" }]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!appointment.patientCNIC) {
            setLoading(false);
            return;
        }

        // 🟢 KEY CHANGE: Query by CNIC, not ID (Unified History)
        const historyQ = query(
          collection(db, "appointments"),
          where("patientCNIC", "==", appointment.patientCNIC)
        );
        
        const snap = await getDocs(historyQ);
        const allDocs = snap.docs.map(doc => doc.data());

        // A. Filter for Completed Appointments (History)
        const pastVisits = allDocs
            .filter(d => d.status === "completed")
            .sort((a, b) => new Date(b.date) - new Date(a.date));
        
        setHistory(pastVisits);

        // B. Filter for Reports (Current + Past)
        // We look for any appointment with this CNIC that has a reportUrl
        const allReports = allDocs
            .filter(d => d.reportUrl && d.reportUrl.length > 0)
            .map(d => ({
                date: d.date,
                url: d.reportUrl,
                doctor: d.doctorName
            }));
        
        setReports(allReports);

      } catch (error) {
        console.error(error);
      }
      setLoading(false);
    };
    fetchData();
  }, [appointment.patientCNIC]);

  // ... (Keep handleFinish, addRow, updateMedicine same as before) ...
  const updateMedicine = (i, f, v) => { const n = [...medicines]; n[i][f] = v; setMedicines(n); };
  const addRow = () => setMedicines([...medicines, { name: "", dosage: "", duration: "" }]);
  
  const handleFinish = async () => {
    if (!diagnosis) return alert("Enter diagnosis");
    await updateDoc(doc(db, "appointments", appointment.id), {
      status: "completed", diagnosis, notes, prescription: medicines, completedAt: new Date().toISOString()
    });
    onSave(); onClose();
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        
        {/* LEFT SIDE: CNIC-BASED HISTORY */}
        <div style={styles.sidebar}>
          <div style={{paddingBottom: "15px", borderBottom: "1px solid #ddd", marginBottom: "15px"}}>
            <h3 style={{margin: 0, display: "flex", alignItems: "center", gap: "10px"}}>
               <FaUserInjured /> {appointment.patientName}
            </h3>
            <span style={{fontSize: "12px", color: "#555", fontWeight: "bold"}}>CNIC: {appointment.patientCNIC}</span>
          </div>

          {/* 1. DOCUMENTS SECTION */}
          <h4 style={{fontSize: "14px", color: "#333", display: "flex", alignItems: "center", gap: "5px"}}>
            <FaFileAlt /> Medical Documents
          </h4>
          {reports.length === 0 ? <p style={{fontSize:"12px", color:"#999"}}>No documents attached.</p> : (
             reports.map((rep, i) => (
                <a key={i} href={rep.url} target="_blank" rel="noreferrer" style={styles.reportLink}>
                   <FaFileAlt size={16}/>
                   <div>
                     <div>Report ({rep.date})</div>
                     <div style={{fontSize: "10px", fontWeight: "normal"}}>Ref: {rep.doctor}</div>
                   </div>
                </a>
             ))
          )}

          {/* 2. HISTORY SECTION */}
          <h4 style={{marginTop: "25px", fontSize: "14px", color: "#333", display: "flex", alignItems: "center", gap: "5px"}}>
            <FaHistory /> Medical History
          </h4>
          {history.length === 0 ? <p style={{fontSize:"12px", color:"#999"}}>No previous history found.</p> : (
            history.map((record, index) => (
              <div key={index} style={styles.historyCard}>
                <div style={{fontWeight: 'bold', color: '#007bff', fontSize: "12px"}}>{record.date} • {record.doctorName}</div>
                <div style={{fontWeight: 'bold', margin: '5px 0'}}>Dx: {record.diagnosis}</div>
                <div style={{fontSize: '12px', color: '#555'}}>💊 {record.prescription?.map(m => m.name).join(", ")}</div>
              </div>
            ))
          )}
        </div>

        {/* RIGHT SIDE: CONSULTATION */}
        <div style={styles.main}>
          <div style={styles.header}>
            <h2>Current Consultation</h2>
            <button style={styles.closeBtn} onClick={onClose}><FaTimes /></button>
          </div>

          {/* Current Request Reason */}
          <div style={{backgroundColor: "#fff3cd", padding: "10px", borderRadius: "5px", marginBottom: "20px", fontSize: "14px"}}>
            <strong>Patient's Complaint:</strong> {appointment.reason}
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Diagnosis</label>
            <input style={{...styles.medInput, fontWeight: "bold"}} placeholder="e.g. Typhoid Fever" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
          </div>

          {/* Medicines Table (Simplified for brevity) */}
          <div style={styles.inputGroup}>
             <label style={styles.label}>Prescription <button style={styles.addBtn} onClick={addRow}>+ Add</button></label>
             <table style={styles.medTable}>
                <tbody>
                  {medicines.map((m, i) => (
                    <tr key={i}>
                      <td style={styles.td}><input style={styles.medInput} placeholder="Medicine" value={m.name} onChange={(e) => updateMedicine(i, 'name', e.target.value)}/></td>
                      <td style={styles.td}><input style={styles.medInput} placeholder="Dosage" value={m.dosage} onChange={(e) => updateMedicine(i, 'dosage', e.target.value)}/></td>
                      <td style={styles.td}><input style={styles.medInput} placeholder="Duration" value={m.duration} onChange={(e) => updateMedicine(i, 'duration', e.target.value)}/></td>
                    </tr>
                  ))}
                </tbody>
             </table>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Notes</label>
            <textarea style={styles.textarea} placeholder="Advice..." value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <button style={styles.saveBtn} onClick={handleFinish}>Finish & Save</button>
        </div>

      </div>
    </div>
  );
}

export default ConsultationModal;