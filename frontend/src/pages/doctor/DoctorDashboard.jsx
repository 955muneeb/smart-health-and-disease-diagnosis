// src/pages/doctor/DoctorDashboard.js
import React, { useEffect, useState } from "react";
import { auth, db } from "../../services/firebase";
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import ConsultationModal from "./ConsultationModal";

const styles = {
  container: { padding: "30px", maxWidth: "1200px", margin: "0 auto", fontFamily: "sans-serif", backgroundColor: "#f4f7f6", minHeight: "100vh" },
  header: { marginBottom: "30px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  welcome: { fontSize: "24px", color: "#333", fontWeight: "bold" },
  logoutBtn: { padding: "10px 20px", backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginBottom: "30px" },
  statCard: { backgroundColor: "white", padding: "20px", borderRadius: "10px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", textAlign: "center" },
  statNumber: { fontSize: "32px", fontWeight: "bold", color: "#007bff", margin: "10px 0" },
  statLabel: { color: "#666", fontSize: "14px" },
  tabContainer: { display: "flex", gap: "10px", marginBottom: "20px" },
  tab: (isActive) => ({
    padding: "10px 20px", cursor: "pointer", borderRadius: "5px", fontWeight: "bold",
    backgroundColor: isActive ? "#007bff" : "#e0e0e0",
    color: isActive ? "white" : "#333",
    border: "none"
  }),
  list: { display: "flex", flexDirection: "column", gap: "15px" },
  card: { backgroundColor: "white", padding: "20px", borderRadius: "10px", boxShadow: "0 2px 5px rgba(0,0,0,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" },
  actions: { display: "flex", gap: "10px" },
  btnAccept: { padding: "8px 15px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" },
  btnReject: { padding: "8px 15px", backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" },
  btnStart: { padding: "10px 20px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" },
  
  // 🟢 NEW SEARCH STYLES
  searchContainer: { marginBottom: "20px", display: "flex", gap: "10px" },
  searchInput: { padding: "10px", borderRadius: "5px", border: "1px solid #ccc", width: "300px", fontSize: "14px" }
};

function DoctorDashboard() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending"); 
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  
  // 🟢 NEW STATE FOR CNIC SEARCH
  const [searchCnic, setSearchCnic] = useState("");

  const fetchAppointments = async () => {
    const user = auth.currentUser;
    if (!user) return navigate("/");
    setLoading(true);
    try {
      const q = query(collection(db, "appointments"), where("doctorId", "==", user.uid));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAppointments(data);
    } catch (error) {
      console.error("Error", error);
    }
    setLoading(false);
  };

  useEffect(() => { fetchAppointments(); }, []);

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await updateDoc(doc(db, "appointments", id), { status: newStatus });
      fetchAppointments();
    } catch (error) {
      console.error("Error", error);
    }
  };

  // 🟢 FILTER LOGIC: Apply Status Filter + CNIC Search Filter
  const filteredAppointments = appointments.filter(app => {
    const matchesStatus = app.status === activeTab;
    const matchesCnic = searchCnic === "" || (app.patientCNIC && app.patientCNIC.includes(searchCnic));
    
    return matchesStatus && matchesCnic;
  });

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.welcome}>👨‍⚕️ Doctor Dashboard</div>
        <button style={styles.logoutBtn} onClick={() => { auth.signOut(); navigate("/"); }}>Logout</button>
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}><div style={styles.statLabel}>Pending</div><div style={styles.statNumber}>{appointments.filter(a => a.status === 'pending').length}</div></div>
        <div style={styles.statCard}><div style={styles.statLabel}>Upcoming</div><div style={styles.statNumber}>{appointments.filter(a => a.status === 'accepted').length}</div></div>
        <div style={styles.statCard}><div style={styles.statLabel}>Completed</div><div style={styles.statNumber}>{appointments.filter(a => a.status === 'completed').length}</div></div>
      </div>

      <div style={styles.tabContainer}>
        <button style={styles.tab(activeTab === "pending")} onClick={() => setActiveTab("pending")}>New Requests</button>
        <button style={styles.tab(activeTab === "accepted")} onClick={() => setActiveTab("accepted")}>Upcoming</button>
        <button style={styles.tab(activeTab === "completed")} onClick={() => setActiveTab("completed")}>History</button>
      </div>

      {/* 🟢 SEARCH BAR (Only visible in History tab) */}
      {activeTab === "completed" && (
        <div style={styles.searchContainer}>
          <input 
            type="text" 
            placeholder="Search by Patient CNIC..." 
            style={styles.searchInput}
            value={searchCnic}
            onChange={(e) => setSearchCnic(e.target.value)}
          />
        </div>
      )}

      <div style={styles.list}>
        {loading ? <p>Loading...</p> : filteredAppointments.length === 0 ? <p>No {activeTab} appointments found.</p> : (
          filteredAppointments.map(app => (
            <div key={app.id} style={styles.card}>
              <div>
                {/* 🟢 SHOW PATIENT NAME & CNIC */}
                <h3 style={{margin: "0 0 5px 0"}}>
                  {app.patientName} <span style={{fontSize: "14px", color: "#666"}}>(CNIC: {app.patientCNIC})</span>
                </h3>
                <p style={{margin: "0", color: "#555"}}>📅 {app.date} at {app.time}</p>
                {app.status === 'completed' && <p style={{color: 'green', fontWeight: 'bold'}}>Dx: {app.diagnosis}</p>}
              </div>

              {activeTab === "pending" && (
                <div style={styles.actions}>
                  <button style={styles.btnAccept} onClick={() => handleStatusUpdate(app.id, "accepted")}>Accept</button>
                  <button style={styles.btnReject} onClick={() => handleStatusUpdate(app.id, "rejected")}>Reject</button>
                </div>
              )}

              {activeTab === "accepted" && (
                <button style={styles.btnStart} onClick={() => setSelectedAppointment(app)}>
                  Start Consultation
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {selectedAppointment && (
        <ConsultationModal 
          appointment={selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
          onSave={fetchAppointments}
        />
      )}
    </div>
  );
}

export default DoctorDashboard;