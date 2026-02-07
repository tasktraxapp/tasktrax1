'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, ListTodo, Timer, XCircle, Hourglass, PauseCircle, Loader2 } from "lucide-react";
// ✅ Import the Real-Time Hook
import { useRealtimeTasks } from "@/hooks/use-tasks";

export function StatsCards() {
    // 1. Fetch Real Data
    const { tasks, loading } = useRealtimeTasks();

    if (loading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 w-full">
                {[...Array(6)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                        <CardHeader className="pb-2"><div className="h-4 w-20 bg-muted rounded"></div></CardHeader>
                        <CardContent><div className="h-8 w-10 bg-muted rounded"></div></CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    // 2. Calculate Real Stats
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'Completed').length;
    const inProgressTasks = tasks.filter(t => t.status === 'In Progress').length;
    const overdueTasks = tasks.filter(t => t.status === 'Overdue').length;
    const pendingTasks = tasks.filter(t => t.status === 'Pending').length;
    const toHoldTasks = tasks.filter(t => t.status === 'To hold').length;

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
                    <ListTodo className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{totalTasks}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Completed</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-[hsl(var(--chart-1))]" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{completedTasks}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                    <Timer className="h-4 w-4 text-[hsl(var(--chart-3))]" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{inProgressTasks}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Overdue</CardTitle>
                    <XCircle className="h-4 w-4 text-[hsl(var(--chart-4))]" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{overdueTasks}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pending</CardTitle>
                    <Hourglass className="h-4 w-4 text-[hsl(var(--chart-5))]" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{pendingTasks}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">To Hold</CardTitle>
                    <PauseCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{toHoldTasks}</div>
                </CardContent>
            </Card>
        </>
    );
}