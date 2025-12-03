// src/pages/patient/MyAppointments.js
import React, { useEffect, useState } from "react";
import { auth, db } from "../../services/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { FaPills, FaClipboardList } from "react-icons/fa";

// 🎨 Styles
const styles = {
  container: { padding: "30px", maxWidth: "1000px", margin: "0 auto", fontFamily: "sans-serif", minHeight: "80vh" },
  header: { marginBottom: "30px", borderBottom: "2px solid #eee", paddingBottom: "15px" },
  heading: { color: "#333", margin: 0 },
  
  // Tabs
  tabContainer: { display: "flex", gap: "10px", marginBottom: "20px" },
  tab: (isActive) => ({
    padding: "10px 20px", cursor: "pointer", borderRadius: "20px", fontWeight: "bold", border: "none",
    backgroundColor: isActive ? "#007bff" : "#f1f3f5",
    color: isActive ? "white" : "#555"
  }),

  // List
  grid: { display: "grid", gap: "20px" },
  card: { 
    backgroundColor: "white", padding: "20px", borderRadius: "12px", border: "1px solid #eee",
    boxShadow: "0 4px 6px rgba(0,0,0,0.02)", display: "flex", justifyContent: "space-between", alignItems: "center" 
  },
  
  // Status Badges
  badge: (status) => ({
    padding: "6px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold", textTransform: "uppercase",
    backgroundColor: status === "pending" ? "#fff3cd" : status === "accepted" ? "#d4edda" : status === "rejected" ? "#f8d7da" : "#e2e6ea",
    color: status === "pending" ? "#856404" : status === "accepted" ? "#155724" : status === "rejected" ? "#721c24" : "#383d41"
  }),

  // Prescription Box (Hidden by default)
  prescriptionBox: {
    marginTop: "15px", padding: "15px", backgroundColor: "#f8f9fa", borderRadius: "8px", borderLeft: "4px solid #007bff"
  },
  medTag: { display: "inline-block", backgroundColor: "white", padding: "5px 10px", borderRadius: "5px", border: "1px solid #ddd", marginRight: "8px", fontSize: "13px", marginTop: "5px" }
};

function MyAppointments() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("upcoming"); // 'upcoming' or 'history'
  
  // State to toggle prescription view
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const fetchAppointments = async () => {
      const user = auth.currentUser;
      if (!user) return navigate("/"); // Protect Route

      setLoading(true);
      try {
        const q = query(
          collection(db, "appointments"),
          where("patientId", "==", user.uid) // Get MY appointments
        );
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Sort by date (Newest first)
        data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        setAppointments(data);
      } catch (error) {
        console.error("Error fetching appointments:", error);
      }
      setLoading(false);
    };

    fetchAppointments();
  }, [navigate]);

  // Filter Logic
  const upcomingList = appointments.filter(a => ["pending", "accepted"].includes(a.status));
  const historyList = appointments.filter(a => ["completed", "rejected"].includes(a.status));

  const displayList = activeTab === "upcoming" ? upcomingList : historyList;

  const togglePrescription = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.heading}>My Appointments</h2>
      </div>

      {/* Tabs */}
      <div style={styles.tabContainer}>
        <button style={styles.tab(activeTab === "upcoming")} onClick={() => setActiveTab("upcoming")}>
          Upcoming & Pending
        </button>
        <button style={styles.tab(activeTab === "history")} onClick={() => setActiveTab("history")}>
          Medical History
        </button>
      </div>

      {/* List */}
      <div style={styles.grid}>
        {loading ? <p>Loading...</p> : displayList.length === 0 ? (
          <p style={{color: "#777"}}>No records found.</p>
        ) : (
          displayList.map((app) => (
            <div key={app.id} style={{ display: 'flex', flexDirection: 'column', ...styles.card }}>
              
              {/* Top Row: Info & Status */}
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: "0 0 5px 0", color: "#007bff" }}>{app.doctorName}</h3>
                  <p style={{ margin: 0, color: "#555" }}>{app.doctorHospital}</p>
                  <p style={{ margin: "5px 0 0 0", fontSize: "14px", color: "#888" }}>
                    📅 {app.date} at {app.time}
                  </p>
                </div>
                <div style={{textAlign: "right"}}>
                  <span style={styles.badge(app.status)}>{app.status}</span>
                </div>
              </div>

              {/* Prescription Viewer (Only for Completed) */}
              {app.status === "completed" && (
                <div style={{ width: '100%', marginTop: "15px", borderTop: "1px solid #eee", paddingTop: "10px" }}>
                  <button 
                    onClick={() => togglePrescription(app.id)}
                    style={{ background: "none", border: "none", color: "#007bff", cursor: "pointer", fontWeight: "bold", display: "flex", alignItems: "center", gap: "5px" }}
                  >
                    {expandedId === app.id ? "Hide Details" : "View Diagnosis & Prescription"}
                  </button>

                  {/* The Expanded Details */}
                  {expandedId === app.id && (
                    <div style={styles.prescriptionBox}>
                      <p><strong>🩺 Diagnosis:</strong> {app.diagnosis}</p>
                      <p><strong>📝 Doctor's Notes:</strong> {app.notes}</p>
                      
                      <div style={{ marginTop: "10px" }}>
                        <strong>💊 Medicines:</strong><br/>
                        {app.prescription && app.prescription.map((med, idx) => (
                          <span key={idx} style={styles.medTag}>
                            {med.name} ({med.dosage}) - {med.duration}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default MyAppointments;