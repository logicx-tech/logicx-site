import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// REMPLACE ces valeurs par celles de ta console Firebase (Paramètres du projet > Vos applications)
const firebaseConfig = {
  apiKey: "VOTRE_API_KEY",
  authDomain: "logic-x.firebaseapp.com",
  projectId: "logic-x",
  appId: "VOTRE_APP_ID"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
