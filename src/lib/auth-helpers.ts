import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { User } from "@/lib/types";

// Reuse your existing config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

export async function createSystemUser(userData: Partial<User>) {
  // 1. Initialize a secondary app instance to avoid logging out the Admin
  const secondaryAppName = "secondaryApp";
  let secondaryApp;

  if (getApps().some(app => app.name === secondaryAppName)) {
    secondaryApp = getApp(secondaryAppName);
  } else {
    secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
  }

  const secondaryAuth = getAuth(secondaryApp);

  // ✅ DEFAULT PASSWORD REQUIREMENT
  const defaultPassword = "12345678";

  try {
    if (!userData.email) throw new Error("Email is required");

    // 2. Create the User in Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, userData.email, defaultPassword);
    const uid = userCredential.user.uid;

    // ✅ Generate a random seed to ensure unique avatars even for same-name users
    const randomSeed = Math.floor(Math.random() * 10000);
    const avatarSeed = `${userData.name || 'user'}-${randomSeed}`;

    // 3. Create the User Document in Firestore (Permissions)
    await setDoc(doc(db, "users", uid), {
      name: userData.name,
      email: userData.email,
      role: userData.role || "Member",
      department: userData.department || "General",
      // ✅ Updated Avatar URL logic: Set to null to use initials fallback
      avatarUrl: null,
      createdAt: new Date().toISOString()
    });

    // 4. Sign out the secondary instance immediately
    await signOut(secondaryAuth);

    return { success: true, uid, tempPassword: defaultPassword };

  } catch (error: any) {
    console.error("Error creating user:", error);
    throw error; // Re-throw full error to access error.code in UI
  }
}