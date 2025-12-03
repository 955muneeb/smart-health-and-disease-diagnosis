// src/services/firebase.js
// Import the functions you need from Firebase SDKs
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// Optional: analytics
// import { getAnalytics } from "firebase/analytics";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDhoCpWqEI5ZENV6s6Mx98hEsQVc0z5_vc",
  authDomain: "health-system-6d171.firebaseapp.com",
  projectId: "health-system-6d171",
  storageBucket: "health-system-6d171.appspot.com",
  messagingSenderId: "441103086654",
  appId: "1:441103086654:web:e076f05b103f36f5278d6f",
  measurementId: "G-P2S2VRBZT3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app); // optional

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;