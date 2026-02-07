'use client';

import { useEffect, useState } from "react";
import Link from "next/link"; // ✅ Added Link
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format, isValid } from "date-fns"; 
import { useRealtimeTasks } from "@/hooks/use-tasks";
import { Loader2, LogIn, ShieldAlert } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { collection, query, limit, onSnapshot } from "firebase/firestore"; 
import { db } from "@/lib/firebase";

// --- TYPES ---
interface LoginEvent {
  id: string;
  userName: string;
  userAvatar?: string;
  timestamp: any; 
  ip?: string;
}

// --- HELPER: SAFE DATE ---
const getSafeDate = (dateInput: any): Date | null => {
    if (!dateInput) return null;
    if (typeof dateInput.toDate === 'function') return dateInput.toDate();
    if (typeof dateInput === 'object' && 'seconds' in dateInput) return new Date(dateInput.seconds * 1000);
    const date = new Date(dateInput);
    return isValid(date) ? date : null;
};

// --- HELPER: INITIALS ---
const getInitials = (name?: string) => {
    if (!name) return "U";
    return name.replace(/@.*/, "").charAt(0).toUpperCase();
};

// --- HELPER: PRIORITY COLOR ---
const getPriorityClass = (priority?: string) => {
    switch (priority?.toLowerCase()) {
        case 'urgent':
        case 'high': return "bg-red-500 hover:bg-red-600 border-transparent text-white";
        case 'medium': return "bg-orange-500 hover:bg-orange-600 border-transparent text-white";
        case 'low': return "bg-slate-500 hover:bg-slate-600 border-transparent text-white";
        default: return "bg-secondary text-secondary-foreground";
    }
};

export function RecentActivity() {
  const { user } = useAuth();
  const { tasks, loading: tasksLoading } = useRealtimeTasks();
  
  const [logins, setLogins] = useState<LoginEvent[]>([]);
  const [loginsLoading, setLoginsLoading] = useState(true);

  // 1. FETCH LOGINS
  useEffect(() => {
    const q = query(collection(db, 'logins'), limit(20));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as LoginEvent[];
      data.sort((a, b) => (getSafeDate(b.timestamp)?.getTime() || 0) - (getSafeDate(a.timestamp)?.getTime() || 0));
      setLogins(data);
      setLoginsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. PREPARE TASKS (Slice 20 for scrolling)
  const recentTasks = [...tasks]
    .sort((a, b) => {
        const dateA = getSafeDate(a.updatedAt || a.createdAt || a.entryDate) || new Date(0);
        const dateB = getSafeDate(b.updatedAt || b.createdAt || b.entryDate) || new Date(0);
        return dateB.getTime() - dateA.getTime();
    })
    .slice(0, 20);

  const loading = tasksLoading || loginsLoading;

  return (
    <Card className="h-full flex flex-col">
        <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>A log of recent tasks and user logins.</CardDescription>
        </CardHeader>
        
        <CardContent className="flex-1 space-y-8 p-6 pt-0">
            
            {/* --- SECTION 1: TASKS --- */}
            <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Task Updates</h4>
                
                {/* ✅ INCREASED HEIGHT: h-[280px] fits 3 items comfortably without cutting off */}
                <div className="h-[280px] overflow-y-auto pr-2 custom-scrollbar">
                    {loading && <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}

                    {!loading && recentTasks.map((task) => {
                        const dateObj = getSafeDate(task.updatedAt || task.createdAt || task.entryDate);
                        const formattedDate = dateObj ? format(dateObj, "MMM d, h:mm a") : "Just now";
                        
                        const assigneeName = task.assignee?.name || "Unassigned";
                        const avatarUrl = task.assignee?.avatarUrl;

                        return (
                        // ✅ ADDED LINK WRAPPER
                        <Link href={`/tasks/${task.id}`} key={task.id} className="block mb-6 last:mb-0">
                            {/* Added hover effect and negative margin to make click area nice */}
                            <div className="flex items-start gap-4 group hover:bg-muted/40 p-2 rounded-md -mx-2 transition-colors">
                                {/* Avatar */}
                                <Avatar className="h-10 w-10 mt-1 border bg-muted shrink-0">
                                    <AvatarImage src={avatarUrl} alt={assigneeName} />
                                    <AvatarFallback>{getInitials(assigneeName)}</AvatarFallback>
                                </Avatar>

                                {/* Content Area */}
                                <div className="flex-1 min-w-0 grid gap-0">
                                    <p className="text-sm font-medium leading-none truncate pr-4 group-hover:text-primary transition-colors">
                                        {task.title}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Assigned to <span className="text-foreground/80 font-medium">{assigneeName}</span>
                                    </p>

                                    {/* Badges */}
                                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                        {task.label && (
                                            <Badge variant="outline" className="text-[10px] px-2 py-0 h-5 font-normal border-muted-foreground/40 text-foreground">
                                                {task.label}
                                            </Badge>
                                        )}
                                        {task.priority && (
                                            <Badge className={`text-[10px] px-2 py-0 h-5 font-normal ${getPriorityClass(task.priority)}`}>
                                                {task.priority}
                                            </Badge>
                                        )}
                                        {task.sender && (
                                            <Badge variant="secondary" className="text-[10px] px-2 py-0 h-5 font-normal bg-muted text-muted-foreground hover:bg-muted">
                                                From: {task.sender}
                                            </Badge>
                                        )}
                                        {task.receiver && (
                                            <Badge variant="secondary" className="text-[10px] px-2 py-0 h-5 font-normal bg-muted text-muted-foreground hover:bg-muted">
                                                To: {task.receiver}
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                {/* Timestamp */}
                                <div className="text-xs text-muted-foreground whitespace-nowrap pt-1">
                                    {formattedDate}
                                </div>
                            </div>
                        </Link>
                    )})}
                    
                    {!loading && recentTasks.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">No recent tasks found.</p>
                    )}
                </div>
            </div>

            <hr className="border-muted/50" />

            {/* --- SECTION 2: LOGINS --- */}
            <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Login History</h4>
                
                <div className="max-h-[150px] overflow-y-auto pr-2 custom-scrollbar space-y-4">
                    {!loading && logins.map((login) => {
                        const dateObj = getSafeDate(login.timestamp);
                        const formattedDate = dateObj ? format(dateObj, "MMM d, h:mm a") : "Unknown";

                        return (
                        <div key={login.id} className="flex items-center justify-between opacity-80 text-sm">
                            <div className="flex items-center gap-3">
                                <div className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
                                <span className="font-medium truncate max-w-[120px]">{login.userName || "User"}</span>
                                <span className="text-muted-foreground text-xs flex items-center gap-1">
                                    <LogIn className="h-3 w-3" /> {login.ip || "Web"}
                                </span>
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">{formattedDate}</span>
                        </div>
                    )})}

                    {!loading && logins.length === 0 && (
                        <div className="flex flex-col items-center justify-center p-4 bg-muted/20 rounded-lg text-center">
                            <ShieldAlert className="h-6 w-6 text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">No recent logins.</p>
                        </div>
                    )}
                </div>
            </div>

        </CardContent>
    </Card>
  )
}