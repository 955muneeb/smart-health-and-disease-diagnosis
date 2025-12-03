// src/pages/common/Landing.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../services/firebase'; // Adjust path if needed

function Landing() {
  const navigate = useNavigate();

  const handleLogout = () => {
    auth.signOut();
    navigate('/');
  };

  return (
    
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h1>Welcome to Health Care System</h1>
      <p>Please select a service below:</p>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '30px' }}>
        
        {/* Option 1: Find Doctor */}
        <div 
          onClick={() => navigate('/doctor-search')}
          style={{ 
            border: '2px solid #007bff', 
            borderRadius: '10px',
            padding: '30px', 
            cursor: 'pointer',
            width: '200px',
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
          }}
        >
          <h3>👨‍⚕️ Find a Doctor</h3>
          <p>Book an appointment</p>
        </div>
        

        {/* Option 2: Disease Diagnosis */}
        <div 
          onClick={() => navigate('/diagnosis')}
          style={{ 
            border: '2px solid #28a745', 
            borderRadius: '10px',
            padding: '30px', 
            cursor: 'pointer',
            width: '200px',
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
          }}
        >
          <h3>🔍 Disease Diagnosis</h3>
          <p>Check your symptoms</p>
        </div>

      </div>

      <button 
        onClick={handleLogout} 
        style={{ marginTop: '50px', padding: '10px 20px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px' }}
      >
        Logout
      </button>
    </div>
    
  );
}

export default Landing;