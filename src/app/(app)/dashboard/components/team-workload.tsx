"use client";

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";

// ✅ Import Real-Time Hook
import { useRealtimeTasks } from "@/hooks/use-tasks";

export function TeamWorkload() {
  const { tasks, loading } = useRealtimeTasks();

  // Calculate workload on the fly
  const workload = useMemo(() => {
    const counts: Record<string, { name: string; avatarUrl?: string; tasks: number }> = {};

    tasks.forEach(task => {
        // Use a composite key or ID to track unique users
        const assignee = task.assignee;
        
        // Track unassigned to see backlog depth
        const id = assignee?.id || "unassigned";
        const name = assignee?.name || "Unassigned";

        if (!counts[id]) {
            counts[id] = { 
                name, 
                avatarUrl: assignee?.avatarUrl, 
                tasks: 0 
            };
        }
        counts[id].tasks += 1;
    });

    // Convert to array and sort by highest task count
    return Object.values(counts).sort((a, b) => b.tasks - a.tasks);
  }, [tasks]);

  // Find the highest task count to scale the progress bars (100% = busiest person)
  const maxTasks = Math.max(...workload.map(u => u.tasks), 0);

  if (loading) {
      return (
        <Card>
            <CardHeader>
                <CardTitle>Team Workload</CardTitle>
                <CardDescription>Overview of task distribution.</CardDescription>
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
        <CardTitle>Team Workload</CardTitle>
        <CardDescription>Overview of task distribution.</CardDescription>
      </CardHeader>
      <CardContent>
        {/* ✅ FIXED HEIGHT & SCROLL: ~180px fits exactly 3 items + gaps */}
        <div className="h-[180px] overflow-y-auto pr-2 custom-scrollbar space-y-4">
            {workload.map((member) => (
            <div key={member.name} className="space-y-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                            <AvatarImage src={member.avatarUrl} alt={member.name} />
                            <AvatarFallback>{member.name.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium truncate max-w-[120px]">{member.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground whitespace-nowrap">{member.tasks} task(s)</span>
                </div>
                {/* The progress bar is relative to the person with the MOST tasks */}
                <Progress 
                    value={maxTasks > 0 ? (member.tasks / maxTasks) * 100 : 0} 
                    className="h-2" 
                />
            </div>
            ))}
            {workload.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                    <p className="text-sm text-muted-foreground">No active assignments found.</p>
                </div>
            )}
        </div>
      </CardContent>
    </Card>
  );
}