'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase'; // Ensure you have your firebase config here
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';

export interface Notification {
  id: string;
  title: string;
  message: string;
  createdAt: any; // Firestore Timestamp
  read: boolean;
  type: 'info' | 'warning' | 'success';
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Create Query: Get last 10 notifications, newest first
    // In a real app, add .where("userId", "==", currentUser.uid)
    const q = query(
      collection(db, "notifications"),
      orderBy("createdAt", "desc"),
      limit(10)
    );

    // 2. Real-time Listener
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Notification[];
      
      setNotifications(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return { notifications, unreadCount, loading };
}