import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyBDx9lz_2uAXPCoVGUPQcoBfUQZT7eVcSI",
  authDomain: "rtc-98787.firebaseapp.com",
  projectId: "rtc-98787",
  storageBucket: "rtc-98787.firebasestorage.app",
  messagingSenderId: "1066004486348",
  appId: "1:1066004486348:web:5b61e66369310daf3b8a69",
  measurementId: "G-Q5GWXESE0J"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);

export default app;