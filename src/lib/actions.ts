import { db } from "@/lib/firebase";
import { collection, addDoc, updateDoc, deleteDoc, doc, Timestamp } from "firebase/firestore";

// CREATE
export async function createNewTask(title: string, date: Date | undefined, status: string = "Pending") {
  if (!title) return;
  await addDoc(collection(db, "tasks"), {
    title,
    status,
    dueDate: date ? Timestamp.fromDate(date) : Timestamp.now(),
    createdAt: Timestamp.now(),
  });
}

// UPDATE STATUS
export async function updateTaskStatus(taskId: string, newStatus: string) {
  const taskRef = doc(db, "tasks", taskId);
  await updateDoc(taskRef, { status: newStatus });
}

// DELETE
export async function deleteTask(taskId: string) {
  const taskRef = doc(db, "tasks", taskId);
  await deleteDoc(taskRef);
}