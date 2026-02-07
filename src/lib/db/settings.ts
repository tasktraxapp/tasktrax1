import { db } from "@/lib/firebase";
import { 
  doc, 
  updateDoc, 
  setDoc, 
  addDoc, 
  collection,
  getDocs,
  getDoc
} from "firebase/firestore";
import type { User } from "@/lib/types";

const SETTINGS_DOC_ID = "general";

export interface AppSettings {
  customFields: Record<string, string[]>;
}

// Default Configuration
export const defaultSettings: AppSettings = {
  customFields: {
    "Label": ["Website", "Analytics", "Bug", "Reporting", "HR", "Legal"],
    "Sender Location": ["New York", "London", "Tokyo"],
    "Receiver Location": ["Paris", "Berlin", "San Francisco"],
    "Currency": ["USD", "EUR", "GBP", "JPY"],
    "Priority": ["Urgent", "High", "Medium", "Low"],
    "Department": ["Engineering", "Marketing", "Sales", "HR"],
    "Status": ["In Progress", "Completed", "Overdue", "Pending", "To hold"],
  }
};

// ==========================================
// 1. SETTINGS MANAGEMENT
// ==========================================

// Update a specific custom field (Real-time save)
export async function updateCustomFields(fieldName: string, newValues: string[]) {
  const ref = doc(db, "settings", SETTINGS_DOC_ID);
  await setDoc(ref, {
    customFields: {
        [fieldName]: newValues
    }
  }, { merge: true });
}

// Initialize defaults if empty
export async function initializeDefaults() {
  const ref = doc(db, "settings", SETTINGS_DOC_ID);
  await setDoc(ref, defaultSettings, { merge: true });
}

// ==========================================
// 2. USER MANAGEMENT
// ==========================================

// Fetch all users (One-time fetch)
export async function getAllUsers(): Promise<User[]> {
  const snapshot = await getDocs(collection(db, "users"));
  return snapshot.docs.map(d => {
    const data = d.data();
    return { 
        id: d.id, 
        name: data.name || "Unknown User", 
        email: data.email || "",
        role: data.role || "Member",
        department: data.department || "General",
        avatarUrl: data.avatarUrl || ""
    } as User;
  });
}

// Add New User (Auto-generates ID & Avatar)
export async function addNewUser(userData: Partial<User>) {
    await addDoc(collection(db, "users"), {
        name: userData.name,
        email: userData.email,
        role: userData.role || "Member",
        department: userData.department || "General",
        createdAt: new Date().toISOString(),
        // Auto-generate a consistent avatar based on their name
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userData.name || 'user')}` 
    });
}

// Update User Role (Real-time permission check)
export async function updateUserRole(userId: string, role: string) {
  await updateDoc(doc(db, "users", userId), { role });
}

// Update User Department
export async function updateUserDepartment(userId: string, department: string) {
  await updateDoc(doc(db, "users", userId), { department });
}

// Get Single User (Useful for checking current user permissions)
export async function getUser(userId: string): Promise<User | null> {
    const snap = await getDoc(doc(db, "users", userId));
    if (snap.exists()) {
        const data = snap.data();
        return { id: snap.id, ...data } as User;
    }
    return null;
}
// ... existing imports


const PERMISSIONS_DOC_ID = "user_permissions";

export interface PermissionRule {
    permission: string;
    admin: boolean;
    manager: boolean;
    member: boolean;
}

// Default Permissions (Fallback if DB is empty)
export const defaultPermissions: PermissionRule[] = [
    { permission: 'Create Tasks', admin: true, manager: true, member: true },
    { permission: 'Edit Tasks', admin: true, manager: true, member: true },
    { permission: 'Delete Tasks', admin: true, manager: false, member: false },
    { permission: 'View Tasks', admin: true, manager: true, member: true },
    { permission: 'Manage Users', admin: true, manager: false, member: false },
    { permission: 'Manage Settings', admin: true, manager: false, member: false },
    { permission: 'Manage Team', admin: true, manager: true, member: false },
];

// 1. GET PERMISSIONS
export async function getPermissions(): Promise<PermissionRule[]> {
    const ref = doc(db, "settings", PERMISSIONS_DOC_ID);
    const snap = await getDoc(ref);

    if (snap.exists() && snap.data().rules) {
        return snap.data().rules as PermissionRule[];
    }
    
    // If permission doc doesn't exist, create it with defaults
    await setDoc(ref, { rules: defaultPermissions });
    return defaultPermissions;
}

// 2. UPDATE PERMISSIONS
export async function updatePermissions(newRules: PermissionRule[]) {
    const ref = doc(db, "settings", PERMISSIONS_DOC_ID);
    await setDoc(ref, { rules: newRules }, { merge: true });
}