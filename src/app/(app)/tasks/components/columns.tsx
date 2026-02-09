"use client"

import { useEffect, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { Task } from "@/lib/types"
import { ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { format, differenceInHours, isValid } from "date-fns"
import { Checkbox } from "@/components/ui/checkbox"

// 🛠️ HELPER: Safely parse dates
const getSafeDate = (dateInput: string | Date | undefined): Date | undefined => {
  if (!dateInput) return undefined;
  const date = new Date(dateInput);
  return isValid(date) ? date : undefined;
};

// ----------------------------------------------------------------------
// TASK TITLE CELL (Smart Dot)
// ----------------------------------------------------------------------
const TaskTitleCell = ({ task }: { task: Task }) => {
  const [isUnread, setIsUnread] = useState(false);

  useEffect(() => {
    if (!task.activity || task.activity.length === 0) return;

    const sortedActivity = [...task.activity].sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    const latestActivity = sortedActivity[0];
    const latestDate = getSafeDate(latestActivity.timestamp);

    if (!latestDate) return;

    const isRecentTime = differenceInHours(new Date(), latestDate) < 24;

    if (isRecentTime) {
      const lastViewedStr = localStorage.getItem(`task_viewed_${task.id}`);
      const lastViewed = lastViewedStr ? new Date(lastViewedStr) : new Date(0);

      if (latestDate.getTime() > lastViewed.getTime()) {
        setIsUnread(true);
      }
    }
  }, [task]);

  const handleMarkAsRead = () => {
    localStorage.setItem(`task_viewed_${task.id}`, new Date().toISOString());
    setIsUnread(false);
  };

  return (
    <div className="relative flex items-center min-w-0">
      {isUnread && (
        <div className="absolute -left-3 flex justify-center">
          <span className="relative flex h-2 w-2" title="New updates">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
          </span>
        </div>
      )}

      <Link
        href={`/tasks/${task.id}`}
        onClick={handleMarkAsRead}
        className="block hover:underline font-medium truncate max-w-[150px] sm:max-w-[300px]"
        title={task.title}
      >
        {task.title}
      </Link>
    </div>
  );
};

// Mappings
const statusVariantMap: { [key: string]: "default" | "destructive" | "secondary" } = {
  "In Progress": "default", "Completed": "default", "Overdue": "destructive", "Pending": "default", "To hold": "secondary",
}

const statusClassMap: { [key: string]: string | undefined } = {
  "In Progress": "bg-[hsl(var(--chart-3))] text-primary-foreground hover:bg-[hsl(var(--chart-3))]/80",
  "Completed": "bg-[hsl(var(--chart-1))] text-primary-foreground hover:bg-[hsl(var(--chart-1))]/80",
  "Pending": "bg-[hsl(var(--chart-5))] text-primary-foreground hover:bg-[hsl(var(--chart-5))]/80",
  "Overdue": "bg-[hsl(var(--chart-4))] text-primary-foreground hover:bg-[hsl(var(--chart-4))]/80",
};

const priorityVariantMap: { [key: string]: "default" | "destructive" } = {
  "Urgent": "destructive", "High": "destructive", "Medium": "default", "Low": "default",
};

const priorityClassMap: { [key: string]: string | undefined } = {
  "Medium": "bg-[hsl(var(--chart-3))] text-primary-foreground hover:bg-[hsl(var(--chart-3))]/80",
  "Low": "bg-[hsl(var(--chart-5))] text-primary-foreground hover:bg-[hsl(var(--chart-5))]/80",
  "Urgent": "bg-[hsl(var(--chart-4))] text-primary-foreground hover:bg-[hsl(var(--chart-4))]/80",
  "High": "bg-[hsl(var(--chart-4))] text-primary-foreground hover:bg-[hsl(var(--chart-4))]/80",
};

// ----------------------------------------------------------------------
// COLUMNS DEFINITION
// ----------------------------------------------------------------------
export const getColumns = (onTaskComplete: (taskId: string, isCompleted: boolean) => void): ColumnDef<Task>[] => [
  {
    id: "complete",
    cell: ({ row }) => (
      <div className="flex justify-center items-center h-full w-full px-2">
        <Checkbox
          checked={row.original.status === 'Completed'}
          onCheckedChange={(checked) => onTaskComplete(row.original.id, !!checked)}
          aria-label="Mark task as complete"
          onClick={(e) => e.stopPropagation()}
          className="h-5 w-5"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
    size: 40,
  },
  {
    accessorKey: "id",
    filterFn: "includesString",
    size: 70,
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="pl-0 hover:bg-transparent justify-start font-bold w-[70px]"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        ID
        <ArrowUpDown className="ml-1 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="font-medium text-xs text-muted-foreground text-left w-[70px] truncate" title={row.getValue("id")}>
        {row.getValue("id")}
      </div>
    ),
  },
  {
    accessorKey: "title",
    header: "Title",
    cell: ({ row }) => <TaskTitleCell task={row.original} />,
  },
  {
    accessorKey: "label",
    header: "Label", // ✅ Unhidden
    cell: ({ row }) => {
      const label = row.getValue("label") as string;
      // ✅ whitespace-nowrap prevents broken layout
      return label ? <Badge variant="outline" className="whitespace-nowrap">{label}</Badge> : null;
    },
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = (row.getValue("status") as string) || "Pending";
      // ✅ whitespace-nowrap fixes "In Progress" breaking
      return (
        <Badge variant={statusVariantMap[status]} className={`whitespace-nowrap ${statusClassMap[status]}`}>
          {status}
        </Badge>
      );
    },
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: "priority",
    header: "Priority", // ✅ Unhidden
    cell: ({ row }) => {
      const priority = (row.getValue("priority") as string) || "Medium";
      return (
        <Badge variant={priorityVariantMap[priority as keyof typeof priorityVariantMap] || "secondary"} className={`whitespace-nowrap ${priorityClassMap[priority]}`}>
          {priority}
        </Badge>
      );
    },
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: "assignee",
    header: "Assignee", // ✅ Unhidden
    cell: ({ row }) => {
      const assignee = row.original.assignee;
      if (!assignee) return <span className="text-muted-foreground text-xs italic whitespace-nowrap">Unassigned</span>;
      return (
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6 shrink-0">
            <AvatarImage src={assignee.avatarUrl} />
            <AvatarFallback>{assignee.name ? assignee.name.charAt(0) : "?"}</AvatarFallback>
          </Avatar>
          <span className="truncate max-w-[100px] whitespace-nowrap">{assignee.name}</span>
        </div>
      )
    },
    filterFn: (row, id, value) => {
      const name = row.original.assignee?.name || "Unassigned";
      return value.includes(name);
    },
  },
  {
    accessorKey: "receivedDate",
    header: ({ column }) => (
      <Button variant="ghost" className="pl-0 hover:bg-transparent justify-start whitespace-nowrap" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Received <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const date = getSafeDate(row.getValue("receivedDate"));
      return <div className="whitespace-nowrap">{date ? format(date, "dd-MM-yyyy") : <span className="text-muted-foreground">-</span>}</div>;
    },
  },
  {
    accessorKey: "period",
    header: "Period", // ✅ Unhidden
    cell: ({ row }) => <div className="whitespace-nowrap">{row.getValue("period") || <span className="text-muted-foreground">-</span>}</div>,
  },
  {
    accessorKey: "dueDate",
    header: ({ column }) => (
      <Button variant="ghost" className="pl-0 hover:bg-transparent justify-start whitespace-nowrap" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Due <ArrowUpDown className="ml-1 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => {
      const date = getSafeDate(row.getValue("dueDate"));
      return date ? (
        <span className="text-red-600 font-medium whitespace-nowrap text-xs sm:text-sm">
          {format(date, "dd-MM-yyyy")}
        </span>
      ) : <span className="text-muted-foreground">-</span>;
    },
  },
]