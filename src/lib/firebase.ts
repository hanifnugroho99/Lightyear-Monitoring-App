import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';

// Handle potential missing config during build
const getFirebaseConfig = () => {
    try {
        // @ts-ignore
        const configMap = import.meta.glob('../../firebase-applet-config.json', { eager: true });
        const config = configMap['../../firebase-applet-config.json'];
        return (config as any)?.default || config || {};
    } catch (e) {
        console.error('Error loading Firebase config:', e);
        return {};
    }
};

const firebaseConfig: any = getFirebaseConfig();
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Validation check as per instructions
async function testConnection() {
  try {
    if (firebaseConfig.projectId) {
      await getDocFromServer(doc(db, '_connection_test_', 'check'));
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();
