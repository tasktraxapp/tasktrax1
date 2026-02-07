'use client';

import React from 'react';
import type { Task } from '@/lib/types';
import { DataTable } from './data-table';
import { getColumns } from './columns';
import { PrintHeader } from './print-header';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge"; // Added for better UI

// ✅ Import Real-Time Hook & Actions
import { useRealtimeTasks } from "@/hooks/use-tasks";
import { updateTaskStatus } from "@/lib/db/tasks";

export function ClientPage({ data = [] }: { data?: Task[] }) {
  // 1. Source of Truth: The Real-time Hook
  const { tasks, loading } = useRealtimeTasks();
  const { toast } = useToast();

  // 2. Handle Status Change (Write to DB)
  const handleTaskComplete = React.useCallback(async (taskId: string, isCompleted: boolean) => {
    const task = tasks.find(t => t.id === taskId);
    const title = task?.title || "Task";
    const newStatus: Task['status'] = isCompleted ? 'Completed' : 'Pending';

    try {
        await updateTaskStatus(taskId, newStatus);
        toast({
            title: `Task Updated`,
            description: `"${title}" has been marked as ${newStatus}.`,
        });
    } catch (error) {
        console.error("Failed to update task", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not update task status.",
        });
    }
  }, [tasks, toast]); 
  
  const columns = React.useMemo(() => getColumns(handleTaskComplete), [handleTaskComplete]);

  // 3. Filter Active vs Completed
  const { activeTasks, completedTasks } = React.useMemo(() => {
    const active: Task[] = [];
    const completed: Task[] = [];
    const taskList = tasks || [];

    for (const task of taskList) {
      if (task.status === 'Completed') {
        completed.push(task);
      } else {
        active.push(task);
      }
    }
    // Sort completed by newest first
    completed.sort((a, b) => new Date(b.entryDate || 0).getTime() - new Date(a.entryDate || 0).getTime());

    return { activeTasks: active, completedTasks: completed };
  }, [tasks]);

  // Loading State
  if (loading) {
    return (
        <div className="flex h-[50vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    );
  }

  return (
    // ✅ OPTIMIZATION: Responsive padding and max-width for large screens
    <div className="flex flex-col gap-6 p-4 md:p-8 w-full max-w-[1920px] mx-auto">
      <PrintHeader title="Tasks Summary" />
      
      {/* Active Tasks Section */}
      <div className="flex flex-col gap-4 min-w-0">
        <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                Active Tasks 
                <Badge variant="secondary" className="ml-1 rounded-full px-2">
                    {activeTasks.length}
                </Badge>
            </h2>
        </div>
        
        {/* Table Wrapper (min-w-0 is crucial for mobile tables) */}
        <div className="w-full min-w-0">
            <DataTable data={activeTasks} columns={columns} showAddTaskButton={true} />
        </div>
      </div>

      {/* Completed Tasks Section (Accordion) */}
      {completedTasks.length > 0 && (
        <div className="w-full min-w-0 mt-2">
            <Accordion type="single" collapsible className="w-full border rounded-lg bg-card shadow-sm" defaultValue="completed-tasks">
            <AccordionItem value="completed-tasks" className="border-0">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                    <div className="flex items-center gap-3 text-lg font-semibold">
                        <span>Completed Tasks</span>
                        <Badge variant="outline" className="text-muted-foreground">
                            {completedTasks.length}
                        </Badge>
                    </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 border-t pt-4">
                    <div className="w-full min-w-0">
                        <DataTable data={completedTasks} columns={columns} showAddTaskButton={false} />
                    </div>
                </AccordionContent>
            </AccordionItem>
            </Accordion>
        </div>
      )}
    </div>
  );
}