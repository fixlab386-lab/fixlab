import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { getStorage } from 'firebase/storage'
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions'

const firebaseConfig = {
  apiKey: "AIzaSyAaJw_-GeHaXjuSLhJs8EyjbLiv--mX_b0",
  authDomain: "fixlab-app.firebaseapp.com",
  projectId: "fixlab-app",
  storageBucket: "fixlab-app.firebasestorage.app",
  messagingSenderId: "17538364478",
  appId: "1:17538364478:web:d8aa8948a9fb2115ef4d6f"
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app, 'fixlab')
export const auth = getAuth(app)
export const storage = getStorage(app)
export const functions = getFunctions(app, 'europe-west1')

if (import.meta.env.DEV && import.meta.env.VITE_USE_FUNCTIONS_EMULATOR === 'true') {
  connectFunctionsEmulator(functions, '127.0.0.1', 5001)
}