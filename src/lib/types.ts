// =========================================
// 1. CORE ENUMS & ROLES
// =========================================
export type Role = "Admin" | "Manager" | "Member";

// =========================================
// 2. USER & AUTH
// =========================================
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl?: string;
  fcmToken?: string; 
  department?: string;
}

// =========================================
// 3. SETTINGS & PERMISSIONS
// =========================================
export interface PermissionRule {
  permission: string;
  admin: boolean;
  manager: boolean;
  member: boolean;    
}

export interface AppSettings {
  id?: string;
  customFields?: { [key: string]: string[] };
  rules?: PermissionRule[]; 
  permissions?: { [action: string]: boolean };
}

// =========================================
// 4. ACTIVITY LOG
// =========================================
export interface Activity {
  id: string;
  user: User;
  action: string;
  details?: string;
  timestamp: string;
}

// =========================================
// 5. TASKS (THE FIX)
// =========================================
export interface Task {
  id: string;
  title: string;
  label: string;
  status: "Pending" | "In Progress" | "Completed" | "To hold" | "Overdue";
  priority: "Low" | "Medium" | "High" | "Urgent";
  assignee: User;
  description?: string;
  
  dueDate?: string | Date;
  entryDate?: string | Date;
  receivedDate?: string | Date;
  
  department?: string;
  sender?: string;
  senderLocation?: string;
  receiver?: string;
  receiverLocation?: string;
  period?: string;

  // ✅ UNIFIED FIX: Strict 'number' type.
  // We will force the conversion in the Hook, so Pages don't have to worry.
  initialDemand?: number;
  initialDemandCurrency?: string;
  officialSettlement?: number;
  officialSettlementCurrency?: string;
  motivation?: number;
  motivationCurrency?: string;

  files?: Array<{
    name: string;
    url: string;
    size?: number;
    type?: string;
  }>;

  activity?: Activity[];
  createdAt?: string;
  updatedAt?: string;
}

// =========================================
// 6. FINANCIAL SUMMARIES
// =========================================
export interface FinancialTotals {
  totalInitialDemand: number;
  totalOfficialPayment: number;
  totalMotivation: number;
  grandTotal: number;
}

export interface FinancialSummary {
  [currency: string]: FinancialTotals;
}