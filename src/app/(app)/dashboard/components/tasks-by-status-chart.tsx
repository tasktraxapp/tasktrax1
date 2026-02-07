"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { Pie, PieChart, Cell } from "recharts";
import type { ChartConfig } from "@/components/ui/chart"
import { Loader2 } from "lucide-react"

// ✅ Import Real-Time Hook
import { useRealtimeTasks } from "@/hooks/use-tasks"

const chartConfig = {
  value: {
    label: "Tasks",
    color: "hsl(var(--primary))", 
  },
  'In Progress': {
    label: "In Progress",
    color: "hsl(var(--chart-3))",
  },
  'Completed': {
    label: "Completed",
    color: "hsl(var(--chart-1))",
  },
  'Overdue': {
    label: "Overdue",
    color: "hsl(var(--chart-4))",
  },
  'Pending': {
    label: "Pending",
    color: "hsl(var(--chart-5))",
  },
  'To hold': {
    label: "To hold",
    color: "hsl(var(--muted-foreground))",
  },
} satisfies ChartConfig

export function TasksByStatusChart() {
    // 1. Fetch Data
    const { tasks, loading } = useRealtimeTasks();

    // 2. Calculate Chart Data on the fly
    const chartData = useMemo(() => {
        const counts = tasks.reduce((acc, task) => {
            const status = task.status || "Pending";
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [tasks]);

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Tasks by Status</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-[250px]">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        )
    }

    if (chartData.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Tasks by Status</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
                    No tasks found.
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Tasks by Status</CardTitle>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[250px]">
                    <PieChart>
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent hideLabel />}
                        />
                        <Pie
                            data={chartData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={60}
                            strokeWidth={5}
                        >
                            {chartData.map((entry) => {
                                const configEntry = chartConfig[entry.name as keyof typeof chartConfig];
                                const fill = (configEntry && 'color' in configEntry) ? configEntry.color : "hsl(var(--muted))";

                                return (
                                    <Cell 
                                        key={entry.name} 
                                        fill={fill}
                                    />
                                );
                            })}
                        </Pie>
                        <ChartLegend
                            content={<ChartLegendContent nameKey="name" />}
                            // ✅ FIXED: Changed basis-1/4 to basis-auto and added whitespace-nowrap
                            className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-auto [&>*]:justify-center [&>*]:whitespace-nowrap"
                        />
                    </PieChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}