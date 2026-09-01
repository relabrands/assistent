import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging, isSupported } from "firebase/messaging";

// Your web app's Firebase configuration
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAEwCVdxgKGnRqtx2njenkuZk1J_g10lpA",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "rela-assitent.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "rela-assitent",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "rela-assitent.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "37483330582",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:37483330582:web:a667ddeda4f26cbe9e0937"
};

// Initialize Firebase (singleton pattern)
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Initialize messaging only if supported (browser env)
export let messaging: any = null;
isSupported().then((supported) => {
  if (supported) {
    messaging = getMessaging(app);
  }
});

export default app;
