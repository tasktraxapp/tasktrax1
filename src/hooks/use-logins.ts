import { useState, useEffect } from 'react';
import { collection, query, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface LoginEvent {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  timestamp: any; 
  ip?: string;
}

export function useRealtimeLogins() {
  const [logins, setLogins] = useState<LoginEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. SIMPLE QUERY: No 'orderBy' to prevent Index Errors
    const q = query(
        collection(db, 'logins'), 
        limit(20) // Fetch last 20, we sort them below
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as LoginEvent[];

      // 2. CLIENT-SIDE SORT: Fixes "Missing Index" issues
      const sortedData = data.sort((a, b) => {
          const tA = a.timestamp?.seconds || 0;
          const tB = b.timestamp?.seconds || 0;
          return tB - tA; // Newest first
      });

      setLogins(sortedData.slice(0, 5)); // Keep top 5
      setLoading(false);
    }, (error) => {
      console.error("Login Sync Error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { logins, loading };
}