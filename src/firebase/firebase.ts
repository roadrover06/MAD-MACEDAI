import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCkucOMovZ8SicNFam-r4dAHjTlJGnmI7A",
  authDomain: "mad-maceda-i.firebaseapp.com",
  projectId: "mad-maceda-i",
  storageBucket: "mad-maceda-i.firebasestorage.app",
  messagingSenderId: "361243049000",
  appId: "1:361243049000:web:662289de15e70d441f891d"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);