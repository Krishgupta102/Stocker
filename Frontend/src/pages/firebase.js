// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import {getAuth} from "firebase/auth";
import {getFirestore} from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBopX_0-bbKWW7f_uJ7JChclgdWvPbBT60",
  authDomain: "stocker-95d35.firebaseapp.com",
  projectId: "stocker-95d35",
  storageBucket: "stocker-95d35.firebasestorage.app",
  messagingSenderId: "813102806474",
  appId: "1:813102806474:web:89e014c46ca9f267d3cb33"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth=getAuth();
export const db = getFirestore(app);
export default app;