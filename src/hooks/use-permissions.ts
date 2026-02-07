"use client";

import { useAuth } from "@/context/auth-context";
import { useAppSettings } from "@/hooks/use-settings";

export type PermissionAction = 
  | "View Tasks" | "Create Tasks" | "Edit Tasks" | "Delete Tasks" 
  | "Manage Users" | "Manage Settings" | "View Financials" | "Manage Team";

export function usePermissions() {
  const { user } = useAuth();
  const { settings } = useAppSettings();

  const can = (action: PermissionAction): boolean => {
    if (!user) return false;
    
    // Normalize role to ensure we match the database keys (admin, manager, member)
    const role = (user.role as string)?.toLowerCase() || "";

    // ⚠️ SAFETY LOCK: Prevent Admin Lockout
    // We MUST hardcode this one specific case. 
    // If an Admin accidentally turns off "Manage Settings" for Admins, 
    // they would lose access to the toggle to turn it back on.
    if (role === 'admin' && action === "Manage Settings") {
        return true;
    }

    // 1. READ FROM DATABASE RULES
    if (settings && Array.isArray(settings.rules)) {
        const rule = settings.rules.find(r => r.permission === action);

        if (rule) {
            // Return the specific boolean for the user's role
            if (role === 'admin') return rule.admin === true;
            if (role === 'manager') return rule.manager === true;
            if (role === 'member') return rule.member === true;
        }
    }

    // 2. FALLBACK DEFAULTS (Only if DB is empty/loading)
    // Default: Admin/Manager = Allow, Member = Block
    if (role === 'admin') return true;
    if (role === 'manager') return true;
    
    return false;
  };

  return { can, role: user?.role };
}