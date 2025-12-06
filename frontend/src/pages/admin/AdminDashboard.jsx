import React, { useEffect, useState } from "react";
import { db, auth } from "../../services/firebase";
import { collection, query, where, getDocs, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { FaEye, FaCheck, FaTimes, FaUserMd, FaEdit, FaSave, FaTrash } from "react-icons/fa";

const styles = {
  container: { padding: "40px", maxWidth: "1200px", margin: "0 auto", fontFamily: "sans-serif" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" },
  
  // Tabs
  tabContainer: { display: "flex", gap: "10px", marginBottom: "20px" },
  tab: (isActive) => ({
    padding: "10px 20px", cursor: "pointer", borderRadius: "8px", fontWeight: "bold", border: "none",
    backgroundColor: isActive ? "#007bff" : "#e9ecef",
    color: isActive ? "white" : "#555"
  }),

  table: { width: "100%", borderCollapse: "collapse", backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", borderRadius: "8px", overflow: "hidden" },
  th: { backgroundColor: "#343a40", color: "white", padding: "15px", textAlign: "left" },
  td: { padding: "15px", borderBottom: "1px solid #eee", verticalAlign: "middle" },
  
  // Buttons
  btnView: { padding: "8px 15px", backgroundColor: "#17a2b8", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "5px" },
  btnDelete: { padding: "10px 20px", backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold", display: "inline-flex", alignItems: "center", gap: "5px" },
  btnEdit: { padding: "10px 20px", backgroundColor: "#ffc107", color: "#333", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold", display: "inline-flex", alignItems: "center", gap: "5px" },
  btnSave: { padding: "10px 20px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold", display: "inline-flex", alignItems: "center", gap: "5px" },

  badge: { padding: "5px 10px", backgroundColor: "#ffc107", borderRadius: "15px", fontSize: "12px", fontWeight: "bold" },
  
  // Inputs for Edit Mode
  input: { padding: "8px", borderRadius: "5px", border: "1px solid #ccc", width: "100%", marginTop: "5px" },

  // Modal
  modalOverlay: { position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 },
  modalContent: { backgroundColor: "white", padding: "30px", borderRadius: "10px", width: "90%", maxWidth: "600px", maxHeight: "90vh", overflowY: "auto" },
};

function AdminDashboard() {
  const [pendingDoctors, setPendingDoctors] = useState([]);
  const [verifiedDoctors, setVerifiedDoctors] = useState([]);
  const [activeTab, setActiveTab] = useState("pending"); // 'pending' or 'verified'
  
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Editable Fields State
  const [editForm, setEditForm] = useState({});

  const navigate = useNavigate();

  // 1. Fetch Data
  const fetchData = async () => {
    // Get Pending
    const q1 = query(collection(db, "doctors"), where("verified", "==", false));
    const snap1 = await getDocs(q1);
    setPendingDoctors(snap1.docs.map(doc => ({ id: doc.id, ...doc.data() })));

    // Get Verified
    const q2 = query(collection(db, "doctors"), where("verified", "==", true));
    const snap2 = await getDocs(q2);
    setVerifiedDoctors(snap2.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  useEffect(() => { fetchData(); }, []);

  // 2. Open Modal & Setup Edit State
  const openModal = (doc) => {
    setSelectedDoctor(doc);
    setEditForm(doc); // Pre-fill form
    setIsEditing(false); // Default to view mode
  };

  // 3. Handle Updates
  const handleUpdate = async () => {
    try {
      await updateDoc(doc(db, "doctors", selectedDoctor.id), {
        hospital: editForm.hospital,
        phone: editForm.phone,
        fee: editForm.fee,
        about: editForm.about
      });
      alert("✅ Doctor Details Updated!");
      setIsEditing(false);
      setSelectedDoctor(null);
      fetchData();
    } catch (error) {
      console.error(error);
      alert("Error updating doctor.");
    }
  };

  // 4. Verify Doctor
  const handleVerify = async () => {
    if (window.confirm("Verify this doctor?")) {
      await updateDoc(doc(db, "doctors", selectedDoctor.id), { verified: true });
      alert("✅ Doctor Verified!");
      setSelectedDoctor(null);
      fetchData();
    }
  };

  // 5. Delete/Remove Doctor
  const handleDelete = async () => {
    if (window.confirm("⚠️ Are you sure? This will remove the doctor from the system.")) {
      await deleteDoc(doc(db, "doctors", selectedDoctor.id));
      alert("❌ Doctor Removed.");
      setSelectedDoctor(null);
      fetchData();
    }
  };

  const displayList = activeTab === "pending" ? pendingDoctors : verifiedDoctors;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>🛡️ Admin Dashboard</h1>
        <button onClick={() => { auth.signOut(); navigate("/"); }} style={{...styles.btnDelete, fontSize: "14px"}}>Logout</button>
      </div>

      {/* Tabs */}
      <div style={styles.tabContainer}>
        <button style={styles.tab(activeTab === "pending")} onClick={() => setActiveTab("pending")}>
          Pending Requests ({pendingDoctors.length})
        </button>
        <button style={styles.tab(activeTab === "verified")} onClick={() => setActiveTab("verified")}>
          Verified Doctors ({verifiedDoctors.length})
        </button>
      </div>

      {/* Table */}
      {displayList.length === 0 ? (
        <p style={{color: "#777", marginTop: "20px"}}>No doctors in this list.</p>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Specialty</th>
              <th style={styles.th}>Hospital</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayList.map((doc) => (
              <tr key={doc.id}>
                <td style={styles.td}><strong>{doc.name}</strong></td>
                <td style={styles.td}><span style={styles.badge}>{doc.specialties?.[0]}</span></td>
                <td style={styles.td}>{doc.hospital}</td>
                <td style={styles.td}>
                  <button style={styles.btnView} onClick={() => openModal(doc)}>
                    <FaEye /> Manage
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* 🟢 EDIT/VIEW MODAL */}
      {selectedDoctor && (
        <div style={styles.modalOverlay} onClick={() => setSelectedDoctor(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            
            <h2 style={{display: "flex", alignItems: "center", gap: "10px", marginTop: 0}}>
              <FaUserMd style={{color: "#007bff"}}/> {selectedDoctor.name}
            </h2>

            {/* Editable Fields */}
            <div style={{marginBottom: "15px"}}>
              <label><strong>🏥 Hospital:</strong></label>
              {isEditing ? (
                <input 
                  style={styles.input} 
                  value={editForm.hospital} 
                  onChange={(e) => setEditForm({...editForm, hospital: e.target.value})}
                />
              ) : <p style={{margin: "5px 0"}}>{selectedDoctor.hospital}</p>}
            </div>

            <div style={{marginBottom: "15px"}}>
              <label><strong>📞 Phone:</strong></label>
              {isEditing ? (
                <input 
                  style={styles.input} 
                  value={editForm.phone} 
                  onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                />
              ) : <p style={{margin: "5px 0"}}>{selectedDoctor.phone}</p>}
            </div>

            <div style={{marginBottom: "15px"}}>
              <label><strong>💰 Fee:</strong></label>
              {isEditing ? (
                <input 
                  type="number"
                  style={styles.input} 
                  value={editForm.fee} 
                  onChange={(e) => setEditForm({...editForm, fee: e.target.value})}
                />
              ) : <p style={{margin: "5px 0"}}>Rs {selectedDoctor.fee}</p>}
            </div>

            {/* Read Only Fields */}
            <p><strong>📧 Email:</strong> {selectedDoctor.email}</p>
            <p><strong>🩺 Specialty:</strong> {selectedDoctor.specialties?.join(", ")}</p>

            {/* Action Buttons */}
            <div style={{marginTop: "30px", display: "flex", gap: "10px", justifyContent: "flex-end", borderTop: "1px solid #eee", paddingTop: "20px"}}>
              
              {/* Delete Button (Always Available) */}
              <button style={styles.btnDelete} onClick={handleDelete}>
                <FaTrash /> Remove Doctor
              </button>

              {/* Edit/Save Logic */}
              {isEditing ? (
                <button style={styles.btnSave} onClick={handleUpdate}>
                  <FaSave /> Save Changes
                </button>
              ) : (
                <button style={styles.btnEdit} onClick={() => setIsEditing(true)}>
                  <FaEdit /> Edit Details
                </button>
              )}

              {/* Verify Button (Only if Pending) */}
              {!selectedDoctor.verified && (
                <button style={{...styles.btnSave, backgroundColor: "#28a745"}} onClick={handleVerify}>
                  <FaCheck /> Verify Now
                </button>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;