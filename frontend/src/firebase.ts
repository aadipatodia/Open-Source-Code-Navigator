// Firebase initialization — exports the Auth instance for AuthContext.
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyB9qDlCO9A8-cBp_f-ur1RvKta0o6FSbrc',
  authDomain: 'open-source-code-navigator.firebaseapp.com',
  projectId: 'open-source-code-navigator',
  storageBucket: 'open-source-code-navigator.firebasestorage.app',
  messagingSenderId: '389538092706',
  appId: '1:389538092706:web:d7dbe1bf700b5f3babe9fb',
  measurementId: 'G-5QS4JTJ1TQ',
};

const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
