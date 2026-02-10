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


// Initialize safely
if (!getApps().length) {
    try {
        if (serviceAccount.project_id) {
            initializeApp({
                credential: cert(serviceAccount),
            });
            console.log("✅ Firebase Admin Initialized.");
        } else {
            // Warn but don't crash - allows build to succeed
            console.warn("⚠️ Firebase Admin Initialization Skipped: Invalid or missing service account key.");
        }
    } catch (error) {
        console.error("❌ Firebase Admin Initialization Failed:", error);
    }
}

// Export Auth safely - will be null if init failed
let adminAuth: any = null;
try {
    if (getApps().length) {
        adminAuth = getAuth();
    }
} catch (e) {
    console.error("⚠️ Failed to retrieve Admin Auth instance (this is expected during build if key is missing).");
}

export { adminAuth };
