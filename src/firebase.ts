import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyDPz06W6Y2Uuzs3WoYYdDvBipIkhjvJAu4",
  authDomain: "shopify-b657a.firebaseapp.com",
  projectId: "shopify-b657a",
  storageBucket: "shopify-b657a.firebasestorage.app",
  messagingSenderId: "813465904497",
  appId: "1:813465904497:web:26314b5c1ed56b5d8582d0",
  measurementId: "G-KMWLMLHWEP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const functions = getFunctions(app);

// Connect to local emulators
if (import.meta.env.DEV) {
  console.log('Connecting to Firebase emulators...');
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectFunctionsEmulator(functions, 'localhost', 5001);
  console.log('Connected to emulators - Firestore: localhost:8080, Functions: localhost:5001');
}

export { db, functions };
