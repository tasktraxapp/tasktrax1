import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  arrayUnion,
  Timestamp
} from "firebase/firestore";
import type { Task, Activity, User } from "@/lib/types";

// 🛠️ HELPER: Safely convert Firestore data to ISO String
const safeIso = (val: any): string | undefined => {
  if (!val) return undefined;
  if (typeof val.toDate === 'function') return val.toDate().toISOString();
  if (val instanceof Date) return val.toISOString();
  if (typeof val === 'string') return val;
  return undefined;
};

// 🛠️ HELPER: Remove 'undefined' fields
const cleanPayload = (data: any) => {
  const cleaned = { ...data };
  Object.keys(cleaned).forEach(key => {
    if (cleaned[key] === undefined) delete cleaned[key];
  });
  return cleaned;
};

// ✅ HELPER: Sanitizes Numbers (Prevents "1000" string issues)
const sanitizeNumber = (val: any) => {
  if (val === undefined || val === null || val === "") return undefined;
  const num = Number(val);
  return isNaN(num) ? 0 : num;
};

// ✅ HELPER: Generates T-001, T-002 based on existing IDs
export async function getNextTaskId(): Promise<string> {
  const tasksRef = collection(db, "tasks");
  const snapshot = await getDocs(tasksRef);

  let maxId = 0;

  snapshot.forEach((doc) => {
    const id = doc.id;
    if (id && id.startsWith("T-")) {
      const numberPart = parseInt(id.replace("T-", ""), 10);
      if (!isNaN(numberPart)) {
        if (numberPart > maxId) {
          maxId = numberPart;
        }
      }
    }
  });

  const nextId = maxId + 1;
  return `T-${String(nextId).padStart(3, '0')}`;
}

// ==========================================
// 1. READ
// ==========================================
export async function getTasks(): Promise<Task[]> {
  const tasksRef = collection(db, "tasks");
  const q = query(tasksRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    const rawCreated = data.createdAt || data.entryDate || new Date();

    return {
      id: doc.id,
      ...data,
      dueDate: safeIso(data.dueDate),
      receivedDate: safeIso(data.receivedDate),
      entryDate: safeIso(data.entryDate),
      createdAt: safeIso(rawCreated),
      updatedAt: safeIso(data.updatedAt),
      activity: data.activity || [],
      files: data.files || [],
      // Ensure read values are numbers too
      initialDemand: Number(data.initialDemand || 0),
      officialSettlement: Number(data.officialSettlement || 0),
      motivation: Number(data.motivation || 0),

      // ✅ NEW: Visibility
      viewers: data.viewers || [],
      creatorId: data.creatorId,
    } as Task;
  });
}

// ==========================================
// 2. CREATE
// ==========================================
export async function addTask(taskData: Partial<Task>, customId?: string) {
  const dateToTimestamp = (d: any) => d ? Timestamp.fromDate(new Date(d)) : null;

  // ✅ FORCE NUMBERS ON SAVE
  const payload = cleanPayload({
    ...taskData,
    status: taskData.status || "Pending",

    // Financial Conversions
    initialDemand: sanitizeNumber(taskData.initialDemand),
    officialSettlement: sanitizeNumber(taskData.officialSettlement),
    motivation: sanitizeNumber(taskData.motivation),

    // ✅ NEW: Visibility
    viewers: taskData.viewers || [],
    creatorId: taskData.creatorId,

    dueDate: dateToTimestamp(taskData.dueDate),
    entryDate: Timestamp.now(),
    createdAt: Timestamp.now(),
    activity: [],
    files: []
  });

  if (customId) {
    await setDoc(doc(db, "tasks", customId), payload);
  } else {
    await addDoc(collection(db, "tasks"), payload);
  }
}

// ==========================================
// 3. UPDATE
// ==========================================
export async function updateTask(taskId: string, taskData: Partial<Task>, user?: User) {
  const taskRef = doc(db, "tasks", taskId);
  const rawPayload: any = { ...taskData };

  // Handle Dates
  if (taskData.dueDate) rawPayload.dueDate = Timestamp.fromDate(new Date(taskData.dueDate));
  if (taskData.receivedDate) rawPayload.receivedDate = Timestamp.fromDate(new Date(taskData.receivedDate));

  // ✅ FORCE NUMBERS ON UPDATE
  if (taskData.initialDemand !== undefined) rawPayload.initialDemand = sanitizeNumber(taskData.initialDemand);
  if (taskData.officialSettlement !== undefined) rawPayload.officialSettlement = sanitizeNumber(taskData.officialSettlement);
  if (taskData.motivation !== undefined) rawPayload.motivation = sanitizeNumber(taskData.motivation);

  // ✅ NEW: Visibility
  if (taskData.viewers !== undefined) rawPayload.viewers = taskData.viewers;

  // Cleanup
  delete rawPayload.id;
  delete rawPayload.createdAt;
  delete rawPayload.entryDate;
  delete rawPayload.activity;

  rawPayload.updatedAt = Timestamp.now();

  if (user) {
    const activityLog: Activity = {
      id: `act-${Date.now()}`,
      user: user,
      action: 'updated task details',
      timestamp: new Date().toISOString()
    };
    rawPayload.activity = arrayUnion(cleanPayload(activityLog));
  }

  const finalPayload = cleanPayload(rawPayload);
  await updateDoc(taskRef, finalPayload);
}

// Status Update
export async function updateTaskStatus(taskId: string, newStatus: string) {
  const taskRef = doc(db, "tasks", taskId);
  await updateDoc(taskRef, {
    status: newStatus,
    updatedAt: Timestamp.now()
  });
}

// Files Update
export async function updateTaskFiles(taskId: string, files: any[]) {
  const taskRef = doc(db, "tasks", taskId);
  await updateDoc(taskRef, {
    files: files,
    updatedAt: Timestamp.now()
  });
}

// Activity Update
export async function addActivity(taskId: string, activity: Activity) {
  const taskRef = doc(db, "tasks", taskId);
  await updateDoc(taskRef, {
    activity: arrayUnion(cleanPayload(activity)),
    updatedAt: Timestamp.now()
  });
}

// Delete
export async function deleteTask(taskId: string) {
  const taskRef = doc(db, "tasks", taskId);
  await deleteDoc(taskRef);
}