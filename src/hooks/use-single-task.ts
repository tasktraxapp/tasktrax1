// src/hooks/use-single-task.ts
"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { Task } from "@/lib/types";

export function useTask(taskId: string) {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!taskId) return;

    const unsubscribe = onSnapshot(doc(db, "tasks", taskId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setTask({
          id: docSnap.id,
          ...data,
          // Safe date conversion
          dueDate: typeof data.dueDate === 'string' ? data.dueDate : data.dueDate?.toDate?.().toISOString(),
          entryDate: typeof data.entryDate === 'string' ? data.entryDate : data.entryDate?.toDate?.().toISOString(),
          // Ensure arrays exist
          activity: data.activity || [],
          files: data.files || []
        } as Task);
      } else {
        setTask(null);
        setError("Task not found");
      }
      setLoading(false);
    }, (err) => {
      console.error(err);
      setError(err.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [taskId]);

  return { task, loading, error };
}