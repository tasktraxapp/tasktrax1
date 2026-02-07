"use client";

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format, differenceInDays, isValid, startOfDay } from "date-fns";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Loader2 } from "lucide-react";

// ✅ Import Real-Time Hook
import { useRealtimeTasks } from "@/hooks/use-tasks";

export function UpcomingDeadlines() {
  const { tasks, loading } = useRealtimeTasks();

  const upcomingTasks = useMemo(() => {
    const today = startOfDay(new Date());

    return tasks
      .filter(task => {
        // Filter 1: Must not be completed
        if (task.status === 'Completed') return false;
        
        // Filter 2: Must have a valid due date
        if (!task.dueDate) return false;
        const taskDate = new Date(task.dueDate);
        if (!isValid(taskDate)) return false;

        // Filter 3: Must be in the future (or today)
        return taskDate.getTime() >= today.getTime(); 
      })
      .sort((a, b) => {
        // Sort by nearest deadline first
        const dateA = new Date(a.dueDate!).getTime();
        const dateB = new Date(b.dueDate!).getTime();
        return dateA - dateB;
      })
      .slice(0, 10); // Increased limit to allow scrolling
  }, [tasks]);

  if (loading) {
      return (
        <Card>
            <CardHeader>
                <CardTitle>Upcoming Deadlines</CardTitle>
                <CardDescription>A quick look at tasks due soon.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
        </Card>
      );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Deadlines</CardTitle>
        <CardDescription>A quick look at tasks due soon.</CardDescription>
      </CardHeader>
      <CardContent>
        {/* ✅ SCROLL CONTAINER: Height set to ~130px to fit exactly 2 items */}
        <div className="h-[110px] overflow-y-auto pr-2 custom-scrollbar space-y-4">
            {upcomingTasks.length > 0 ? (
            upcomingTasks.map(task => {
                const dueDate = new Date(task.dueDate!); 
                const daysLeft = differenceInDays(dueDate, new Date());
                
                let badgeVariant: "destructive" | "secondary" | "outline" = "secondary";
                if (daysLeft <= 3) {
                    badgeVariant = "destructive";
                } else if (daysLeft > 7) {
                    badgeVariant = "outline";
                }

                return (
                <div key={task.id} className="flex items-center justify-between group">
                    <div className="grid gap-1 min-w-0 pr-4">
                    <Link href={`/tasks/${task.id}`} className="text-sm font-medium hover:underline truncate block" title={task.title}>
                        {task.title}
                    </Link>
                    <p className="text-sm text-muted-foreground">Due: {format(dueDate, "PPP")}</p>
                    </div>
                    <Badge variant={badgeVariant} className="shrink-0">
                    {daysLeft < 0 ? "Overdue" : daysLeft === 0 ? "Today" : `${daysLeft} day(s)`}
                    </Badge>
                </div>
                );
            })
            ) : (
                <div className="flex h-full items-center justify-center">
                    <p className="text-sm text-muted-foreground">No upcoming deadlines.</p>
                </div>
            )}
        </div>
      </CardContent>
    </Card>
  );
}