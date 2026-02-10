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
      limit(100) // Fetch last 100
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => {
        const d = doc.data();
        let parsedDate = new Date(); // Fallback

        // Handle various timestamp formats
        if (d.timestamp?.toDate) {
          parsedDate = d.timestamp.toDate();
        } else if (d.timestamp?.seconds) {
          parsedDate = new Date(d.timestamp.seconds * 1000);
        } else if (typeof d.timestamp === 'string') {
          parsedDate = new Date(d.timestamp);
        }

        return {
          id: doc.id,
          ...d,
          timestamp: parsedDate // Normalize to JS Date
        };
      }) as LoginEvent[];

      // 2. CLIENT-SIDE SORT
      const sortedData = data.sort((a, b) => {
        return (b.timestamp as any) - (a.timestamp as any); // Newest first
      });

      setLogins(sortedData);
      setLoading(false);
    }, (error) => {
      console.error("Login Sync Error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { logins, loading };
}