import { Task, User } from "./types";

// ✅ Fix: Explicitly type this array as User[] so 'role' is strictly "Admin" | "Manager" | "Member"
export const mockUsers: User[] = [
  {
    id: "user-1",
    name: "Alice Admin",
    role: "Admin",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alice",
    email: "alice@example.com"
  },
  {
    id: "user-2",
    name: "Bob Manager",
    role: "Manager", 
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob",
    email: "bob@example.com"
  },
  {
    id: "user-3",
    name: "Charlie Member",
    role: "Member",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie",
    email: "charlie@example.com"
  },
  {
    id: "user-4",
    name: "Diana Member",
    role: "Member",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Diana",
    email: "diana@example.com"
  }
];

export const mockTasks: Task[] = [
  {
    id: "TASK-1001",
    title: "Website Redesign",
    label: "Website",
    status: "In Progress",
    priority: "High",
    assignee: mockUsers[0], // ✅ Now safe because mockUsers[0] is a valid User
    sender: "Client A",
    senderLocation: "New York",
    receiver: "Internal Team",
    receiverLocation: "London",
    entryDate: new Date().toISOString(),
    receivedDate: new Date().toISOString(),
    dueDate: new Date(new Date().setDate(new Date().getDate() + 5)).toISOString(),
    description: "Revamp the homepage layout and update branding guidelines.",
    period: "Q1 2024",
    initialDemand: 5000,
    initialDemandCurrency: "USD",
    officialSettlement: 4500,
    officialSettlementCurrency: "USD",
    motivation: 500,
    motivationCurrency: "USD",
    files: [],
    activity: []
  },
  {
    id: "TASK-1002",
    title: "Annual Financial Report",
    label: "Reporting",
    status: "Pending",
    priority: "Urgent",
    assignee: mockUsers[1],
    sender: "Finance Dept",
    senderLocation: "HQ",
    receiver: "Management",
    receiverLocation: "HQ",
    entryDate: new Date().toISOString(),
    receivedDate: new Date().toISOString(),
    dueDate: new Date(new Date().setDate(new Date().getDate() + 2)).toISOString(),
    description: "Compile and audit the financial statements for the fiscal year.",
    period: "2023",
    files: [],
    activity: []
  },
  {
    id: "TASK-1003",
    title: "Fix Login Bug",
    label: "Bug",
    status: "Overdue",
    priority: "High",
    assignee: mockUsers[2],
    sender: "QA Team",
    senderLocation: "Remote",
    receiver: "Dev Team",
    receiverLocation: "Remote",
    entryDate: new Date().toISOString(),
    receivedDate: new Date().toISOString(),
    dueDate: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString(), // 2 days ago
    description: "Users are reporting 403 errors when trying to reset passwords.",
    period: "Sprint 42",
    files: [],
    activity: []
  }
];