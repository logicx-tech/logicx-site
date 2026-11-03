import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCaO0vjvlUGtgMgwFuzI2Ac3-GcDKajuRc",
  authDomain: "logicx-store.firebaseapp.com",
  projectId: "logicx-store",
  storageBucket: "logicx-store.firebasestorage.app",
  messagingSenderId: "644232002003",
  appId: "1:644232002003:web:7744f433d9afe2961e1726"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
