// src/pages/auth/Login.js
import React, { useState } from 'react';
import { auth } from '../../services/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Login successful
      navigate('/home'); 
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f8ff', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '420px', background: '#fff', padding: '32px', borderRadius: '10px', boxShadow: '0 6px 24px rgba(15,15,15,0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: '18px' }}>
          <h2 style={{ margin: 0 }}>Welcome back</h2>
          <p style={{ margin: '8px 0 0', color: '#6b7280' }}>Sign in to your account</p>
        </div>
        <form onSubmit={handleLogin} noValidate>
          <div style={{ marginBottom: '14px' }}>
            <label htmlFor="email" style={{ display: 'block', fontSize: '14px', marginBottom: '6px', color: '#374151' }}>Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
          </div>
          <div style={{ marginBottom: '18px' }}>
            <label htmlFor="password" style={{ display: 'block', fontSize: '14px', marginBottom: '6px', color: '#374151' }}>Password</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
          </div>
          <button type="submit" style={{ width: '100%', padding: '12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Sign in</button>
        </form>
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <p style={{ margin: 0, color: '#6b7280' }}>New here? <Link to="/signup" style={{ color: '#2563eb', textDecoration: 'none' }}>Create Account</Link></p>
        </div>
      </div>
    </div>
  );
}

export default Login;