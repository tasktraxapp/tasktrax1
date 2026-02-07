"use client";

// ✅ 1. Import 'PermissionAction' type to fix the error
import { usePermissions, type PermissionAction } from "@/hooks/use-permissions";
import { Loader2 } from "lucide-react";
import { ReactNode } from "react";
import { useAuth } from "@/context/auth-context"; // Import Auth for loading state

interface PermissionGuardProps {
  // ✅ 2. Use specific type instead of 'string'
  requiredPermission: PermissionAction; 
  children: ReactNode;       
  fallback?: ReactNode;      
  showLoader?: boolean;      
}

export function PermissionGuard({ 
  requiredPermission, 
  children, 
  fallback = null, 
  showLoader = false 
}: PermissionGuardProps) {
  
  // Use Auth loading as the primary loading state
  const { loading: authLoading } = useAuth();
  const { can } = usePermissions();

  // 1. Loading State
  if (authLoading && showLoader) {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  }

  // 2. If loading finishes and user CANNOT perform the action -> Show Fallback
  // Note: 'can' safely returns false if data isn't ready, so we rely on that.
  if (!authLoading && !can(requiredPermission)) {
    return <>{fallback}</>;
  }

  // 3. If user has permission -> Show the actual content
  return <>{children}</>;
}