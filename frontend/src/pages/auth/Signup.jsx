import React, { useState, useMemo } from "react";
import { auth, db } from "../../services/firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, writeBatch } from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";

// 🎨 Styles
const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f2f5",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    padding: "20px",
  },
  card: {
    backgroundColor: "#fff",
    padding: "40px",
    borderRadius: "12px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
    width: "100%",
    maxWidth: "600px", // Made wider for the search list
  },
  title: { textAlign: "center", marginBottom: "20px", color: "#333" },
  inputGroup: { marginBottom: "15px" },
  label: { display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "600", color: "#555" },
  input: {
    width: "100%",
    padding: "12px",
    border: "1px solid #ddd",
    borderRadius: "6px",
    fontSize: "16px",
    boxSizing: "border-box",
  },
  select: {
    width: "100%",
    padding: "12px",
    border: "1px solid #ddd",
    borderRadius: "6px",
    fontSize: "16px",
    backgroundColor: "white",
  },
  checkboxContainer: {
    backgroundColor: "#e3f2fd",
    padding: "15px",
    borderRadius: "8px",
    marginBottom: "20px",
    border: "1px solid #bbdefb",
  },
  button: {
    width: "100%",
    padding: "14px",
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "background 0.3s",
    marginTop: "20px",
  },
  error: {
    backgroundColor: "#ffebee",
    color: "#c62828",
    padding: "10px",
    borderRadius: "4px",
    marginBottom: "15px",
    fontSize: "14px",
  },
  doctorSection: {
    marginTop: "20px",
    paddingTop: "20px",
    borderTop: "1px dashed #ccc",
  },
  // New Styles for Specialty Search
  tagContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginBottom: "10px",
  },
  selectedTag: {
    backgroundColor: "#007bff",
    color: "white",
    padding: "6px 12px",
    borderRadius: "20px",
    fontSize: "13px",
    display: "flex",
    alignItems: "center",
    cursor: "pointer",
  },
  searchList: {
    maxHeight: "150px",
    overflowY: "auto",
    border: "1px solid #eee",
    borderRadius: "6px",
    marginTop: "5px",
    backgroundColor: "#fafafa",
  },
  searchItem: {
    padding: "10px",
    cursor: "pointer",
    borderBottom: "1px solid #eee",
    fontSize: "14px",
  },
};

// 🏥 THE MASSIVE LIST (Cleaned & Sorted)
const allSpecialties = [
  "Gynecologist", "Pediatrician", "General Physician", "Psychiatrist", "Gastroenterologist",
  "Diabetologist", "Counselor", "Hematologist", "Obstetrician", "Neonatologist",
  "Hypertension Specialist", "Obesity Specialist", "Internal Medicine Specialist",
  "Consultant Physician", "Nutritionist", "Dietitian", "Psychologist", "Physiotherapist",
  "Audiologist", "Family Physician", "Dermatologist", "ENT Specialist", "Orthopedic Surgeon",
  "Neurologist", "Urologist", "Eye Specialist", "Dentist", "Cardiologist", "Pulmonologist",
  "General Surgeon", "Endocrinologist", "Nephrologist", "Pain Management Specialist",
  "Cosmetologist", "Aesthetic Physician", "Laser Specialist", "Anesthesiologist",
  "Interventional Cardiologist", "Pediatric Psychologist", "Hepatologist", "Sexologist",
  "Male Sexual Health Specialist", "Uro-Oncologist", "Oncologist", "Radiation Oncologist",
  "Pediatric Oncologist", "Andrologist", "Pediatric Surgeon", "Laparoscopic Surgeon",
  "Speech and Language Pathologist", "Kidney Transplant Surgeon", "Renal Surgeon",
  "Fertility Consultant", "Hernia Surgeon", "Pediatric Urologist", "Endoscopic Surgeon",
  "Aesthetic Gynecologist", "Endodontist", "Bariatric Surgeon", "Colorectal Surgeon",
  "Breast Surgeon", "Cancer Surgeon", "Thyroid Surgeon", "Orthodontist", "Implantologist",
  "Prosthodontist", "Cosmetic Dentist", "Chiropractor", "Eye Surgeon", "ENT Surgeon",
  "Head and Neck Surgeon", "Restorative Dentist", "Acupuncturist", "Oral and Maxillofacial Surgeon",
  "Plastic Surgeon", "Hair Transplant Surgeon", "Burns Specialist", "Cosmetic Surgeon",
  "Neuromusculoskeletal Medicine Doctor", "Neurosurgeon", "Rheumatologist",
  "Pediatric Nutritionist", "Rehab Medicine", "Rehabilitation Specialist", "Diabetes Counsellor",
  "Spinal Surgeon", "Pediatric Hematologist", "Pathologist", "Histopathologist",
  "Pediatric Neurologist", "Homeopath", "Autism Consultant", "Pediatric Rheumatologist",
  "Cardiothoracic Surgeon", "Nuclear Medicine Specialist", "Vitreo Retina Surgeon",
  "Geriatrician", "Sonologist", "Cardiac Surgeon", "Nutritional Psychologist",
  "Pediatric Gastroenterologist", "Hand Surgeon", "Reconstructive Surgeon",
  "Sports Medicine Specialist", "Thoracic Surgeon", "Specialist in Operative Dentistry",
  "Sleep Medicine Doctor", "Critical Care Physician", "Primary Care Physician",
  "Pediatric Neurosurgeon", "Vascular Surgeon", "Pediatric Orthopedic Surgeon",
  "Child-Kidney Specialist", "Alternative Medicine Practitioner", "Periodontist",
  "Child and Adolescent Psychiatrist", "Hepatobiliary and Liver Transplant Surgeon",
  "Radiologist", "Orthotist and Prosthetist", "Infectious Disease Specialist",
  "Pediatric Endocrinologist", "Asthma Specialist", "Cardiovascular Surgeon",
  "Emergency Medicine Specialist", "Naturopathic Doctor", "Community Medicine",
  "Maternal Fetal Medicine Specialist", "Podiatrist", "Optometrist", "Pediatric Cardiologist",
  "Uro-Gynecologist", "Lifestyle Medicine Physician", "Occupational Therapist",
  "Fitness Trainer", "Pediatric Diabetologist", "Endovascular Surgeon",
  "Colorectal Cancer Surgeon", "Pediatric Dentist", "Gynecological Oncologist"
].sort();

function Signup() {
  const navigate = useNavigate();

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    gender: "male",
    hospital: "",
    experience: "",
    fee: "",
    about: "",
    services: "",
  });

  const [specialties, setSpecialties] = useState([]);
  const [searchTerm, setSearchTerm] = useState(""); // Search State
  const [isDoctor, setIsDoctor] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Handle Input Changes
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ✅ Add Specialty Logic
  const addSpecialty = (spec) => {
    if (!specialties.includes(spec)) {
      setSpecialties([...specialties, spec]);
    }
    setSearchTerm(""); // Clear search after selection
  };

  // ✅ Remove Specialty Logic
  const removeSpecialty = (spec) => {
    setSpecialties(specialties.filter((s) => s !== spec));
  };

  // ✅ Search Filter Logic (Memoized for performance)
  const filteredSpecialties = useMemo(() => {
    if (!searchTerm) return [];
    return allSpecialties.filter(s => 
      s.toLowerCase().includes(searchTerm.toLowerCase()) && 
      !specialties.includes(s) // Don't show if already selected
    );
  }, [searchTerm, specialties]);

  // Validation
  const validateForm = () => {
    if (formData.password.length < 6) return "Password must be at least 6 characters.";
    if (isDoctor) {
      if (!formData.hospital) return "Clinic/Hospital Name is required.";
      if (!formData.fee) return "Consultation Fee is required.";
      if (specialties.length === 0) return "Please select at least one specialty.";
    }
    return null;
  };

  // Signup Logic (Batch Write)
  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      // 1. Create Auth User
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      const user = userCredential.user;
      await updateProfile(user, { displayName: formData.name });

      // 2. Prepare Batch
      const batch = writeBatch(db);
      const userRef = doc(db, "users", user.uid);
      
      const baseData = {
        uid: user.uid,
        name: formData.name,
        nameLowerCase: formData.name.toLowerCase(),
        email: formData.email,
        phone: formData.phone,
        gender: formData.gender,
        role: isDoctor ? "doctor" : "patient",
        createdAt: new Date().toISOString(),
      };

      batch.set(userRef, baseData);

      if (isDoctor) {
        const doctorRef = doc(db, "doctors", user.uid);
        batch.set(doctorRef, {
          ...baseData,
          hospital: formData.hospital,
          experience: Number(formData.experience),
          fee: Number(formData.fee),
          about: formData.about,
          services: formData.services.split(",").map(s => s.trim()),
          specialties: specialties,
          specialtiesLower: specialties.map(s => s.toLowerCase()),
          rating: 0,
          reviewCount: 0,
          verified: false,
        });
      }

      await batch.commit();

      alert("🎉 Account Created Successfully!");
      navigate(isDoctor ? "/doctor/dashboard" : "/home");

    } catch (err) {
      console.error(err);
      setError(err.message.replace("Firebase: ", ""));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>{isDoctor ? "Doctor Registration" : "Patient Signup"}</h2>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSignup}>
          
          {/* Common Fields */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Full Name</label>
            <input name="name" style={styles.input} onChange={handleChange} required />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{...styles.inputGroup, flex: 1}}>
              <label style={styles.label}>Phone</label>
              <input name="phone" type="tel" style={styles.input} onChange={handleChange} required />
            </div>
            <div style={{...styles.inputGroup, flex: 1}}>
              <label style={styles.label}>Gender</label>
              <select name="gender" style={styles.select} onChange={handleChange}>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Email Address</label>
            <input name="email" type="email" style={styles.input} onChange={handleChange} required />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input name="password" type="password" style={styles.input} onChange={handleChange} required />
          </div>

          {/* Doctor Toggle */}
          <div style={styles.checkboxContainer}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={isDoctor} 
                onChange={(e) => setIsDoctor(e.target.checked)} 
                style={{ width: '20px', height: '20px', marginRight: '10px' }}
              />
              <span style={{ fontSize: '16px', fontWeight: '500' }}>I am a Doctor</span>
            </label>
          </div>

          {/* Doctor Specific Fields */}
          {isDoctor && (
            <div style={styles.doctorSection}>
              <h4 style={{ marginBottom: '15px', color: '#007bff' }}>Professional Details</h4>
              
              <div style={styles.inputGroup}>
                <label style={styles.label}>Hospital / Clinic Name</label>
                <input name="hospital" style={styles.input} onChange={handleChange} placeholder="e.g. City Hospital" />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{...styles.inputGroup, flex: 1}}>
                  <label style={styles.label}>Experience (Years)</label>
                  <input name="experience" type="number" style={styles.input} onChange={handleChange} />
                </div>
                <div style={{...styles.inputGroup, flex: 1}}>
                  <label style={styles.label}>Fee (PKR)</label>
                  <input name="fee" type="number" style={styles.input} onChange={handleChange} />
                </div>
              </div>

              {/* 🔎 NEW SEARCHABLE SPECIALTIES UI */}
              <div style={styles.inputGroup}>
                <label style={styles.label}>Specialties (Search to add)</label>
                
                {/* 1. The Search Bar */}
                <input 
                  type="text" 
                  placeholder="Type to search (e.g. Cardio...)" 
                  style={styles.input}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />

                {/* 2. The Dropdown List (Only shows when searching) */}
                {searchTerm && filteredSpecialties.length > 0 && (
                  <div style={styles.searchList}>
                    {filteredSpecialties.map(spec => (
                      <div 
                        key={spec} 
                        style={styles.searchItem}
                        onClick={() => addSpecialty(spec)}
                        onMouseOver={(e) => e.target.style.background = "#f0f0f0"}
                        onMouseOut={(e) => e.target.style.background = "transparent"}
                      >
                        + {spec}
                      </div>
                    ))}
                  </div>
                )}

                {/* 3. The Selected Tags */}
                <div style={{ marginTop: '10px' }}>
                  {specialties.length > 0 && <p style={{fontSize: '12px', color: '#666'}}>Selected:</p>}
                  <div style={styles.tagContainer}>
                    {specialties.map(spec => (
                      <span 
                        key={spec}
                        style={styles.selectedTag}
                        onClick={() => removeSpecialty(spec)}
                        title="Click to remove"
                      >
                        {spec} <span style={{marginLeft: '8px', fontWeight: 'bold'}}>×</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              {/* END SPECIALTIES UI */}

              <div style={styles.inputGroup}>
                <label style={styles.label}>Bio / About</label>
                <textarea name="about" rows="3" style={styles.input} onChange={handleChange} placeholder="Tell patients about yourself..." />
              </div>
              
              <div style={styles.inputGroup}>
                <label style={styles.label}>Services (Comma separated)</label>
                <input name="services" style={styles.input} onChange={handleChange} placeholder="e.g. Root Canal, Teeth Cleaning" />
              </div>
            </div>
          )}

          <button type="submit" style={{ ...styles.button, opacity: loading ? 0.7 : 1 }} disabled={loading}>
            {loading ? "Creating Account..." : "Sign Up"}
          </button>

          <p style={{ textAlign: 'center', marginTop: '15px', fontSize: '14px' }}>
            Already have an account? <Link to="/" style={{ color: '#007bff' }}>Login here</Link>
          </p>

        </form>
      </div>
    </div>
  );
}

export default Signup;