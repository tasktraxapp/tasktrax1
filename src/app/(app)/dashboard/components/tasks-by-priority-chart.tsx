"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Loader2 } from "lucide-react"
import { useRealtimeTasks } from "@/hooks/use-tasks"

const chartConfig = {
  tasks: {
    label: "Tasks",
    color: "hsl(var(--chart-5))"
  },
  Low: {
    label: "Low",
    color: "hsl(var(--chart-5))",
  },
  Medium: {
    label: "Medium",
    color: "hsl(var(--chart-3))",
  },
  High: {
    label: "High",
    color: "hsl(var(--chart-4))",
  },
  Urgent: {
    label: "Urgent",
    color: "hsl(var(--chart-4))",
  },
} satisfies ChartConfig

export function TasksByPriorityChart() {
    const { tasks, loading } = useRealtimeTasks();

    // Calculate Data
    const chartData = useMemo(() => {
        const counts = tasks.reduce((acc, task) => {
            const priority = task.priority || "Medium";
            acc[priority] = (acc[priority] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return [
          { priority: 'Low', tasks: counts['Low'] || 0 },
          { priority: 'Medium', tasks: counts['Medium'] || 0 },
          { priority: 'High', tasks: counts['High'] || 0 },
          { priority: 'Urgent', tasks: counts['Urgent'] || 0 },
        ];
    }, [tasks]);

    // Find the max value to set Y-axis nicely (e.g. if max is 3, show 4 ticks)
    const maxTasks = Math.max(...chartData.map(d => d.tasks));

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Tasks by Priority</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-[250px]">
                     <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Tasks by Priority</CardTitle>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                    <BarChart 
                        accessibilityLayer 
                        data={chartData}
                        // ✅ FIX: Balanced margins to prevent clipping
                        margin={{ top: 20, right: 20, left: 0, bottom: 5 }}
                        barCategoryGap="20%" // Better spacing between bars
                    >
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        
                        <XAxis
                            dataKey="priority"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={10}
                            tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }}
                        />
                        
                        <YAxis 
                            allowDecimals={false} 
                            axisLine={false}
                            tickLine={false}
                            // ✅ FIX: Give Y-axis explicit width so numbers align
                            width={30}
                            // ✅ FIX: Force integer ticks only (0, 1, 2...)
                            tickCount={maxTasks + 1}
                            domain={[0, 'auto']}
                            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                        />
                        
                        <ChartTooltip
                            cursor={{ fill: 'hsl(var(--muted)/0.2)' }}
                            content={<ChartTooltipContent hideLabel />}
                        />
                        
                        <Bar
                          dataKey="tasks"
                          radius={[6, 6, 0, 0]} 
                          maxBarSize={60} // Consistent bar width
                        >
                            {chartData.map((entry) => (
                                <Cell 
                                    key={entry.priority} 
                                    fill={chartConfig[entry.priority as keyof typeof chartConfig]?.color || "hsl(var(--primary))"} 
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}