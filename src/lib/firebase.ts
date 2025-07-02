import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBDx9lz_2uAXPCoVGUPQcoBfUQZT7eVcSI",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "rtc-98787.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "rtc-98787",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "rtc-98787.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1066004486348",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1066004486348:web:5b61e66369310daf3b8a69",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-Q5GWXESE0J"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);

export default app;