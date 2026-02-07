"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut 
} from "firebase/auth";
import { doc, getDoc, setDoc, collection, addDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { User } from "@/lib/types";
import { useRouter } from "next/navigation";

// --- HELPERS ---
// Capitalize first letter: "manager" -> "Manager"
const formatName = (str: string) => {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
};

// Derive Name from Email: "manager@tasktrax.com" -> "Manager"
const deriveNameFromEmail = (email: string | null) => {
    if (!email) return "User";
    const prefix = email.split('@')[0];
    // Remove numbers or dots if cleaner name needed, or just capitalize
    return formatName(prefix.replace(/[0-9.]/g, ' ')); 
};

// --- LOGGING ---
const recordLoginEvent = async (userData: User) => {
  try {
    await addDoc(collection(db, "logins"), {
      userId: userData.id,
      userName: userData.name, // Now this will be "Manager", not "User"
      userAvatar: userData.avatarUrl || "",
      role: userData.role,
      ip: "Web Client",
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    console.error("Login Log Failed", e);
  }
};

// --- CONTEXT ---
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const docRef = doc(db, "users", firebaseUser.uid);
        const docSnap = await getDoc(docRef);
        
        let userData: User;

        if (docSnap.exists()) {
          const data = docSnap.data();
          // ✅ INTELLIGENT NAME FALLBACK
          // If name in DB is missing or "User", try to generate a better one from email
          let displayName = data.name;
          if (!displayName || displayName === "User") {
             displayName = deriveNameFromEmail(firebaseUser.email);
          }

          userData = { id: docSnap.id, ...data, name: displayName } as User;
        } else {
          // New User Setup
          userData = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || deriveNameFromEmail(firebaseUser.email),
            email: firebaseUser.email || "",
            role: "Member",
            avatarUrl: firebaseUser.photoURL || ""
          };
        }

        // Admin Fix
        if (firebaseUser.email === "admin@tasktrax.com" && userData.role !== "Admin") {
            await setDoc(docRef, { role: "Admin" }, { merge: true });
            userData.role = "Admin"; 
        }

        setUser(userData);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;
        
        // Fetch fresh data
        const docRef = doc(db, "users", firebaseUser.uid);
        const docSnap = await getDoc(docRef);
        
        let userData: User;
        
        if (docSnap.exists()) {
           const data = docSnap.data();
           let displayName = data.name;
           if (!displayName || displayName === "User") {
             displayName = deriveNameFromEmail(firebaseUser.email);
           }
           userData = { id: docSnap.id, ...data, name: displayName } as User;
        } else {
           userData = {
                id: firebaseUser.uid,
                name: deriveNameFromEmail(firebaseUser.email),
                email: firebaseUser.email || "",
                role: "Member",
                avatarUrl: ""
           };
        }

        // Update State & Log
        setUser(userData);
        await recordLoginEvent(userData); // Now logs "Manager" correctly
        
        router.push("/");

    } catch (error: any) {
        console.error("Login Error:", error);
        throw error;
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}