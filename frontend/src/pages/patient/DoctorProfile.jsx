import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, auth } from "../../services/firebase";
import { doc, getDoc, addDoc, collection } from "firebase/firestore";
import { FaCloudUploadAlt, FaFileAlt } from "react-icons/fa";

const styles = {
  container: { maxWidth: "900px", margin: "40px auto", padding: "20px", fontFamily: "sans-serif" },
  header: { display: "flex", gap: "30px", padding: "30px", backgroundColor: "white", borderRadius: "12px", boxShadow: "0 4px 15px rgba(0,0,0,0.05)" },
  avatar: { width: "120px", height: "120px", borderRadius: "12px", backgroundColor: "#e3f2fd", color: "#007bff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "40px", fontWeight: "bold" },
  info: { flex: 1 },
  name: { margin: "0 0 10px 0", color: "#333" },
  subText: { margin: "5px 0", color: "#666", fontSize: "16px" },
  tag: { backgroundColor: "#e3f2fd", color: "#007bff", padding: "5px 10px", borderRadius: "15px", fontSize: "12px", marginRight: "5px" },
  bookingCard: { marginTop: "30px", padding: "30px", backgroundColor: "white", borderRadius: "12px", boxShadow: "0 4px 15px rgba(0,0,0,0.05)" },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginTop: "20px" },
  inputGroup: { display: "flex", flexDirection: "column", gap: "8px" },
  input: { padding: "12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "16px" },
  bookBtn: { marginTop: "20px", width: "100%", padding: "15px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "8px", fontSize: "18px", fontWeight: "bold", cursor: "pointer" },
  
  // 🟢 NEW STYLE FOR FILE UPLOAD
  fileLabel: { 
    display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", 
    padding: "15px", border: "2px dashed #007bff", borderRadius: "8px", 
    cursor: "pointer", backgroundColor: "#f8f9fa", color: "#007bff", fontWeight: "bold",
    marginTop: "20px", transition: "0.2s"
  }
};

function DoctorProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [reason, setReason] = useState("");
  const [patientName, setPatientName] = useState("");
  const [cnic, setCnic] = useState("");
  
  // 🟢 NEW: File Upload State
  const [file, setFile] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);

  // 🟢 CLOUDINARY CONFIG (I used the keys you provided earlier)
  const CLOUD_NAME = "ddv7wtes6"; 
  const UPLOAD_PRESET = "healthapp_preset"; 

  useEffect(() => {
    const fetchDoctor = async () => {
      try {
        const docRef = doc(db, "doctors", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setDoctor(docSnap.data());
        } else {
          alert("Doctor not found!");
          navigate("/home");
        }
      } catch (error) {
        console.error("Error:", error);
      }
      setLoading(false);
    };

    if (auth.currentUser) {
      setPatientName(auth.currentUser.displayName || "");
    }
    
    fetchDoctor();
  }, [id, navigate]);

  const handleBook = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) {
      alert("Please Login to book an appointment");
      navigate("/");
      return;
    }

    if (cnic.length < 13) {
      alert("Please enter a valid 13-digit CNIC (without dashes)");
      return;
    }

    setBookingLoading(true);
    let reportUrl = ""; // Default empty if no file

    try {
      // 🟢 1. Upload File to Cloudinary (If selected)
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", UPLOAD_PRESET);
        
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
          method: "POST",
          body: formData
        });
        
        if (!res.ok) throw new Error("Image upload failed");
        
        const data = await res.json();
        reportUrl = data.secure_url; // Get the link
      }

      // 🟢 2. Save Appointment (With Report Link)
      await addDoc(collection(db, "appointments"), {
        doctorId: id,
        doctorName: doctor.name,
        doctorHospital: doctor.hospital,
        patientId: user.uid,
        patientName: patientName,
        patientCNIC: cnic, // This links to history
        date: date,
        time: time,
        reason: reason,
        reportUrl: reportUrl, // Saved here!
        status: "pending",
        createdAt: new Date().toISOString()
      });

      alert("✅ Request Sent Successfully!");
      navigate("/home");

    } catch (error) {
      console.error("Error booking:", error);
      alert("Booking failed. Please try again.");
    }
    setBookingLoading(false);
  };

  if (loading) return <p style={{textAlign: "center", marginTop: "50px"}}>Loading...</p>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.avatar}>{doctor.name.charAt(0)}</div>
        <div style={styles.info}>
          <h1 style={styles.name}>{doctor.name}</h1>
          <p style={styles.subText}>{doctor.hospital}</p>
          <div style={{marginBottom: "10px"}}>
            {doctor.specialties?.map(spec => (
              <span key={spec} style={styles.tag}>{spec}</span>
            ))}
          </div>
          <p style={{...styles.subText}}>Experience: {doctor.experience} Years • Fee: Rs {doctor.fee}</p>
        </div>
      </div>

      <div style={styles.bookingCard}>
        <h3>📅 Book Appointment</h3>
        <form onSubmit={handleBook}>
          
          <div style={styles.formGrid}>
            <div style={styles.inputGroup}>
              <label>Patient Name</label>
              <input 
                type="text" style={styles.input} required 
                placeholder="Enter Patient Name" value={patientName} 
                onChange={(e) => setPatientName(e.target.value)} 
              />
            </div>
            <div style={styles.inputGroup}>
              <label>Patient CNIC (No Dashes)</label>
              <input 
                type="text" style={styles.input} required 
                placeholder="e.g. 3740512345671" value={cnic} 
                onChange={(e) => setCnic(e.target.value)} 
              />
            </div>
          </div>

          <div style={styles.formGrid}>
            <div style={styles.inputGroup}>
              <label>Select Date</label>
              <input 
                type="date" style={styles.input} required 
                value={date} onChange={(e) => setDate(e.target.value)} 
              />
            </div>
            <div style={styles.inputGroup}>
              <label>Select Time</label>
              <select style={styles.input} required value={time} onChange={(e) => setTime(e.target.value)}>
                <option value="">Select a Slot</option>
                <option>10:00 AM</option><option>11:00 AM</option>
                <option>12:00 PM</option><option>02:00 PM</option>
                <option>04:00 PM</option><option>06:00 PM</option>
              </select>
            </div>
          </div>

          <div style={{...styles.inputGroup, marginTop: "20px"}}>
            <label>Reason for Visit</label>
            <textarea 
              rows="3" placeholder="Describe symptoms..." style={styles.input}
              value={reason} onChange={(e) => setReason(e.target.value)}
            />
          </div>

          {/* 🟢 NEW: FILE UPLOAD BUTTON */}
          <label style={styles.fileLabel}>
            {file ? (
              <span style={{color: 'green', display: 'flex', alignItems: 'center', gap: '10px'}}>
                <FaFileAlt /> {file.name} (Ready to upload)
              </span>
            ) : (
              <>
                <FaCloudUploadAlt size={24} />
                <span>Attach Medical Report / X-Ray (Optional)</span>
              </>
            )}
            <input 
              type="file" 
              style={{display: "none"}} 
              onChange={(e) => setFile(e.target.files[0])} 
              accept="image/*,.pdf"
            />
          </label>

          <button type="submit" style={styles.bookBtn} disabled={bookingLoading}>
            {bookingLoading ? "Uploading & Booking..." : "Confirm Appointment"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default DoctorProfile;