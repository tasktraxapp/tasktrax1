import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!key) {
    console.error("❌ FIREBASE_SERVICE_ACCOUNT_KEY is missing from environment variables.");
}

let serviceAccount;
try {
    // Handle potential wrapping quotes from .env copy-paste
    const cleanKey = key?.startsWith("'") && key?.endsWith("'")
        ? key.slice(1, -1)
        : key;

    serviceAccount = JSON.parse(cleanKey || '{}');
    console.log("✅ Service Account Key parsed successfully.");
} catch (error) {
    console.error("❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:", error);
    serviceAccount = {};
}

if (!getApps().length) {
    try {
        initializeApp({
            credential: cert(serviceAccount),
        });
        console.log("✅ Firebase Admin Initialized.");
    } catch (error) {
        console.error("❌ Firebase Admin Initialization Failed:", error);
    }
}

export const adminAuth = getAuth();
