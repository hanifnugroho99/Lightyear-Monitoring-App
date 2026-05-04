import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, initializeFirestore } from 'firebase/firestore';

// @ts-ignore
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use initializeFirestore to configure forceLongPolling for better stability in restricted networks
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

// Validation check as per instructions
async function testConnection() {
  try {
    if (firebaseConfig.projectId) {
      console.log('Firebase: Testing connection to:', firebaseConfig.projectId);
      await getDocFromServer(doc(db, '_connection_test_', 'check'));
      console.log('Firebase: Connection successful');
    } else {
      console.warn('Firebase: Project ID missing in config. Authentication might fail.');
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('the client is offline') || error.message.includes('unavailable')) {
        console.error("Firestore connection issue: The backend might be unreachable or project configuration is incorrect.", error.message);
      } else {
        console.warn("Firestore connection check failed (this is non-fatal if offline mode is intended):", error.message);
      }
    }
  }
}
testConnection();
