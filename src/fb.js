// firebase-config.js

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, FacebookAuthProvider, EmailAuthProvider, OAuthProvider } from 'firebase/auth';
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";


const firebaseConfig = {
    apiKey: "AIzaSyA0OwM2nYSSSZX8GHzv9RTomGsAM5Ohd_E",
    authDomain: "votasnap.firebaseapp.com",
    databaseURL: "https://votasnap-default-rtdb.firebaseio.com",
    projectId: "votasnap",
    storageBucket: "votasnap.appspot.com",
    messagingSenderId: "1086936699830",
    appId: "1:1086936699830:web:2d37c9ac997ea524006717",
    measurementId: "G-SG4H2M6Y20"
  };

  const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
export const db = getDatabase(app);
export const storage = getStorage(app);
auth.settings.appVerificationDisabledForTesting = true;

// Inicializa os provedores
const googleProvider = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();
const appleProvider = new OAuthProvider('apple.com'); // Para o provedor Apple
const emailProvider = EmailAuthProvider;

export { auth, googleProvider, facebookProvider, appleProvider, emailProvider };

export default app;
