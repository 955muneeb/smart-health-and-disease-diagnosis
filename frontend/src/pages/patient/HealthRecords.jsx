import React, { useState, useEffect } from "react";
import { auth, db } from "../../services/firebase";
import { collection, addDoc, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";
import { FaCloudUploadAlt, FaTrash, FaFileAlt } from "react-icons/fa";

const styles = {
  container: { padding: "40px", maxWidth: "800px", margin: "0 auto", fontFamily: "sans-serif" },
  uploadBox: { border: "2px dashed #007bff", borderRadius: "10px", padding: "30px", textAlign: "center", cursor: "pointer", backgroundColor: "#f8f9fa" },
  input: { display: "none" },
  btn: { marginTop: "15px", padding: "10px 20px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "20px", marginTop: "30px" },
  card: { border: "1px solid #ddd", borderRadius: "8px", overflow: "hidden", position: "relative" },
  img: { width: "100%", height: "120px", objectFit: "cover" },
  caption: { padding: "10px", fontSize: "14px", fontWeight: "bold", textAlign: "center" },
  deleteBtn: { position: "absolute", top: "5px", right: "5px", backgroundColor: "rgba(255,0,0,0.8)", color: "white", border: "none", borderRadius: "50%", width: "25px", height: "25px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }
};

function HealthRecords() {
  const [records, setRecords] = useState([]);
  const [uploading, setUploading] = useState(false);
  
  // 🟢 REPLACE WITH YOUR CLOUDINARY DETAILS
  const CLOUD_NAME = "ddv7wtes6"; 
  const UPLOAD_PRESET = "healthapp_preset"; 

  // 1. Fetch Records
  const fetchRecords = async () => {
    const user = auth.currentUser;
    if (!user) return;
    const q = query(collection(db, "health_records"), where("patientId", "==", user.uid));
    const snapshot = await getDocs(q);
    setRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  useEffect(() => { fetchRecords(); }, []);

  // 2. Handle File Upload
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

    try {
      // A. Upload to Cloudinary
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      const imageUrl = data.secure_url;

      // B. Save Link to Firestore
      const user = auth.currentUser;
      await addDoc(collection(db, "health_records"), {
        patientId: user.uid,
        url: imageUrl,
        name: file.name,
        date: new Date().toISOString().split("T")[0] // YYYY-MM-DD
      });

      alert("✅ Report Uploaded!");
      fetchRecords();
    } catch (error) {
      console.error(error);
      alert("Upload failed.");
    }
    setUploading(false);
  };

  // 3. Delete Record
  const handleDelete = async (id) => {
    if (window.confirm("Delete this report?")) {
      await deleteDoc(doc(db, "health_records", id));
      fetchRecords();
    }
  };

  return (
    <div style={styles.container}>
      <h2>📂 My Medical Records</h2>
      <p>Upload your Lab Reports, X-Rays, or Prescriptions here.</p>

      {/* Upload Box */}
      <label style={styles.uploadBox}>
        <FaCloudUploadAlt size={40} color="#007bff" />
        <p>{uploading ? "Uploading..." : "Click to Upload Report (Image/PDF)"}</p>
        <input type="file" style={styles.input} onChange={handleUpload} accept="image/*,.pdf" disabled={uploading} />
      </label>

      {/* Gallery */}
      <div style={styles.grid}>
        {records.map((rec) => (
          <div key={rec.id} style={styles.card}>
            <button style={styles.deleteBtn} onClick={() => handleDelete(rec.id)}><FaTrash size={12}/></button>
            <a href={rec.url} target="_blank" rel="noopener noreferrer">
              <img 
                src={rec.url.endsWith(".pdf") ? "https://via.placeholder.com/150?text=PDF" : rec.url} 
                alt="Report" 
                style={styles.img} 
              />
            </a>
            <div style={styles.caption}>{rec.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default HealthRecords;