import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

import { firebaseConfig } from "./firebaseConfig";

// CRA can run in development with React StrictMode (double-invokes some lifecycles).
// This ensures we only initialize Firebase once.
const app =
  getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);

