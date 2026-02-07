"use client";

import { ClientPage } from "./components/client";
import { useRealtimeTasks } from "@/hooks/use-tasks";
import { Loader2 } from "lucide-react";

export default function TasksPage() {
  // ✅ 1. Use Real-Time Hook instead of mock data
  const { tasks, loading } = useRealtimeTasks();

  // ✅ 2. Standard Loading State
  if (loading) {
    return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    );
  }

  return (
    // ✅ 3. Aligned Container Styling (Mobile Optimized)
    <div className="flex flex-col gap-6 p-4 md:p-8 w-full max-w-[1920px] mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
      </div>
      
      {/* Pass real data to the client table component */}
      <ClientPage data={tasks} />
    </div>
  );
}