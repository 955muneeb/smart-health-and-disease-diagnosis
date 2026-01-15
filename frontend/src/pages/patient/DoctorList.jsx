// src/pages/patient/DoctorList.js
import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { db } from "../../services/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

// 🎨 Styles
const styles = {
  container: { padding: "40px 20px", maxWidth: "1000px", margin: "0 auto", fontFamily: "sans-serif" },
  heading: { marginBottom: "30px", color: "#333", borderBottom: "2px solid #007bff", display: "inline-block", paddingBottom: "10px" },
  grid: { display: "flex", flexDirection: "column", gap: "20px" },
  
  // Doctor Card
  card: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "25px",
    border: "1px solid #eee",
    borderRadius: "12px",
    backgroundColor: "white",
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
    transition: "transform 0.2s",
  },
  infoSection: { display: "flex", gap: "20px", alignItems: "center" },
  avatar: {
    width: "80px", height: "80px", borderRadius: "50%",
    backgroundColor: "#e3f2fd", color: "#007bff", display: "flex",
    alignItems: "center", justifyContent: "center", fontSize: "24px", fontWeight: "bold"
  },
  details: { display: "flex", flexDirection: "column", gap: "5px" },
  name: { margin: 0, fontSize: "1.2rem", color: "#333" },
  specialty: { margin: 0, color: "#007bff", fontWeight: "600", fontSize: "0.9rem" },
  hospital: { margin: 0, color: "#666", fontSize: "0.9rem" },
  stats: { margin: 0, color: "#888", fontSize: "0.85rem", marginTop: "5px" },
  
  // Action Section
  actionSection: { textAlign: "right" },
  price: { fontSize: "1.1rem", fontWeight: "bold", color: "#28a745", marginBottom: "10px", display: "block" },
  bookBtn: {
    padding: "12px 25px",
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "14px",
    transition: "background 0.2s",
  },
  noResult: { textAlign: "center", marginTop: "50px", color: "#777", fontSize: "1.2rem" }
};

function DoctorList() {
  const [searchParams] = useSearchParams();
  const specialty = searchParams.get("specialty"); // Gets "Dentist" from URL
  const navigate = useNavigate();

  const [doctors, setDoctors] = useState([]);
  const [csvDoctors, setCsvDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDoctors = async () => {
      setLoading(true);
      try {
        const doctorsRef = collection(db, "doctors");
        
        let q;
        // 🔍 Query Logic: If URL has specialty, filter by it. Else, show all.
        if (specialty) {
           // "array-contains" is used because specialties is a list like ['Dentist', 'Surgeon']
           q = query(doctorsRef, where("specialties", "array-contains", specialty));
        } else {
           q = query(doctorsRef); 
        }

        const querySnapshot = await getDocs(q);
        const doctorsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setDoctors(doctorsData);
      } catch (error) {
        console.error("Error fetching doctors:", error);
      }

      // Always try CSV fallback (so suggestions work even if nobody registered in Firebase)
      try {
        const API_BASE =
          process.env.REACT_APP_API_URL || "http://localhost:8000";
        const qs = specialty ? `?specialty=${encodeURIComponent(specialty)}` : "";
        const res = await fetch(`${API_BASE}/doctors${qs}`);
        const data = await res.json();
        setCsvDoctors(Array.isArray(data.doctors) ? data.doctors : []);
      } catch (e) {
        console.error("Error fetching CSV doctors:", e);
        setCsvDoctors([]);
      }

      setLoading(false);
    };

    fetchDoctors();
  }, [specialty]);

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>
        {specialty ? `Best ${specialty}s Near You` : "All Available Doctors"}
      </h2>

      {loading ? (
        <p>Loading...</p>
      ) : doctors.length === 0 && csvDoctors.length === 0 ? (
        <div style={styles.noResult}>
          <p>No doctors found for <b>{specialty}</b> yet.</p>
          <button 
            onClick={() => navigate('/home')}
            style={{...styles.bookBtn, backgroundColor: "#6c757d", marginTop: "10px"}}
          >
            Go Back
          </button>
        </div>
      ) : (
        <div style={styles.grid}>
          {/* If registered doctors exist in Firebase, show them first */}
          {doctors.map((doc) => (
            <div key={doc.id} style={styles.card}>
              
              {/* Left Side: Image & Info */}
              <div style={styles.infoSection}>
                {/* Avatar: Shows first letter of name */}
                <div style={styles.avatar}>
                  {doc.name.charAt(0).toUpperCase()}
                </div>
                
                <div style={styles.details}>
                  <h3 style={styles.name}>{doc.name}</h3>
                  <p style={styles.specialty}>{doc.specialties.join(", ")}</p>
                  <p style={styles.hospital}>🏥 {doc.hospital}</p>
                  <p style={styles.stats}>
                    {doc.experience} Years Exp • {doc.gender || "Doctor"}
                  </p>
                </div>
              </div>

              {/* Right Side: Price & Button */}
              <div style={styles.actionSection}>
                <span style={styles.price}>Rs {doc.fee}</span>
                <button 
                  style={styles.bookBtn}
                  onClick={() => navigate(`/doctor/${doc.id}`)} // We will build this next
                >
                  Book Appointment
                </button>
              </div>

            </div>
          ))}

          {/* CSV doctors fallback (no booking profile, but shows correct specialty suggestions) */}
          {doctors.length === 0 && csvDoctors.map((doc, idx) => (
            <div key={`${doc.name}-${idx}`} style={styles.card}>
              <div style={styles.infoSection}>
                <div style={styles.avatar}>
                  {(doc.name || "D").charAt(0).toUpperCase()}
                </div>
                <div style={styles.details}>
                  <h3 style={styles.name}>{doc.name}</h3>
                  <p style={styles.specialty}>{doc.specialty}</p>
                  <p style={styles.hospital}>📍 {doc.address} • {doc.city}</p>
                  <p style={styles.stats}>📞 {doc.phone}</p>
                </div>
              </div>
              <div style={styles.actionSection}>
                <span style={{...styles.price, color: "#6c757d"}}>CSV Suggestion</span>
                <button
                  style={{...styles.bookBtn, backgroundColor: "#28a745"}}
                  onClick={() => window.open(`tel:${doc.phone}`)}
                >
                  Call
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default DoctorList;