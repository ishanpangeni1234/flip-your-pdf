import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBlTOhvfAQ8qlCkABMzERvhVEvCG-QsDa4",
    authDomain: "letme-study.firebaseapp.com",
    projectId: "letme-study",
    storageBucket: "letme-study.firebasestorage.app",
    messagingSenderId: "651585286856",
    appId: "1:651585286856:web:157865fde725dbd0a5ebfd",
    measurementId: "G-85FCBL4KEN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
