"use client";

import { useState, useEffect } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AppSettings } from "@/lib/types";

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // ----------------------------------------
  // 1. REAL-TIME LISTENER (The Read)
  // ----------------------------------------
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "settings", "global"), (docSnapshot) => {
      if (docSnapshot.exists()) {
        // ✅ Success: Data found
        setSettings({ id: docSnapshot.id, ...docSnapshot.data() } as AppSettings);
      } else {
        // ⚠️ Empty: Return safe defaults so UI doesn't crash
        setSettings({ rules: [], customFields: {} });
      }
      setLoading(false);
    }, (error) => {
      console.error("CRITICAL: Settings sync failed", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ----------------------------------------
  // 2. UPDATE CUSTOM FIELDS (The Write)
  // ----------------------------------------
  const updateCustomFields = async (category: string, newValues: string[]) => {
    try {
      // Direct write to the same path we listen to
      await setDoc(doc(db, "settings", "global"), {
        customFields: {
          [category]: newValues
        }
      }, { merge: true }); // Merge ensures we don't delete other categories
      return { success: true };
    } catch (error: any) {
      console.error("Failed to save custom field:", error);
      alert("Error saving: " + error.message);
      return { success: false, error };
    }
  };

  // ----------------------------------------
  // 3. INITIALIZE DEFAULTS (The Reset)
  // ----------------------------------------
  const initializeDefaults = async () => {
    try {
      const defaults = {
        customFields: {
          Priority: ["Low", "Medium", "High", "Urgent"],
          Status: ["Pending", "In Progress", "Completed", "To hold", "Overdue"],
          Label: ["Personal", "Work", "Urgent"],
          Department: ["General", "Finance", "IT", "Marketing", "Operations"],
          Currency: ["USD", "EUR", "GBP", "AED"],
          "Sender Location": ["Headquarters", "Branch NY", "Branch LDN"],
          "Receiver Location": ["Warehouse A", "Client Site", "Remote"]
        }
      };
      await setDoc(doc(db, "settings", "global"), defaults, { merge: true });
      return { success: true };
    } catch (error: any) {
      console.error("Init Defaults Failed:", error);
      return { success: false, error };
    }
  };

  return { 
    settings, 
    loading, 
    updateCustomFields, 
    initializeDefaults 
  };
}