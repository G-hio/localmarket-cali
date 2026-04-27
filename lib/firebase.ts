// lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth"; // Añade esto para el Login
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAzJV22i_9QXI4BK8vvz2zlj2EDfqXCkyg",
  authDomain: "localmarket-cali.firebaseapp.com",
  projectId: "localmarket-cali",
  storageBucket: "localmarket-cali.firebasestorage.app",
  messagingSenderId: "944503351395",
  appId: "1:944503351395:web:a6904744c7f08ed90df056"
};

// Inicializamos la conexión
const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);
export const db = getFirestore(app); // Para los productos 
export const auth = getAuth(app);    // Para el Login del tendero