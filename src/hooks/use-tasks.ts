import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Task } from '@/lib/types';
import { useAuth } from '@/context/auth-context';
import { usePermissions } from '@/hooks/use-permissions';

export function useRealtimeTasks() {
  const { user, loading: authLoading } = useAuth();
  const { can } = usePermissions();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const canView = can("View Tasks");

  useEffect(() => {
    if (authLoading) return;

    if (!user || !canView) {
        setTasks([]);
        setLoading(false);
        return;
    }

    const q = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allTasks = snapshot.docs.map((doc) => {
        const data = doc.data();

        // 🛠️ HELPER: Convert Firestore Timestamp to ISO String
        const safeDate = (val: any) => {
            if (!val) return undefined;
            // If it's a Firestore Timestamp (has toDate function)
            if (typeof val.toDate === 'function') return val.toDate().toISOString();
            // If it's already a Date
            if (val instanceof Date) return val.toISOString();
            // If it's a string, return as is
            return val;
        };

        return {
          id: doc.id,
          ...data,
          // ✅ FIX 1: Explicitly grab and sanitize Dates
          dueDate: safeDate(data.dueDate),
          receivedDate: safeDate(data.receivedDate),
          entryDate: safeDate(data.entryDate),
          
          // ✅ FIX 2: Ensure Period is a string
          period: data.period || "",

          // Financial Conversions (Keep existing fix)
          initialDemand: Number(data.initialDemand) || 0,
          officialSettlement: Number(data.officialSettlement) || 0,
          motivation: Number(data.motivation) || 0,
        };
      }) as Task[];

      // Filter Logic
      const role = (user.role as string) || "";
      let filteredTasks = allTasks;

      if (role !== 'Admin' && role !== 'Manager' && role !== 'admin') {
          filteredTasks = allTasks.filter(t => t.assignee?.id === user.id);
      }

      setTasks(filteredTasks);
      setLoading(false);
    }, (err) => {
      console.error("Sync Error:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, authLoading, canView]);

  return { tasks, loading };
}