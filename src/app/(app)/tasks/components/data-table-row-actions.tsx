"use client"

import { useState } from "react"
import { Row } from "@tanstack/react-table"
import { MoreHorizontal, Eye, Printer, Pencil, Trash2, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { AddTaskSheet } from "./add-task-sheet"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import type { Task } from "@/lib/types"

// ✅ Import DB Action
import { deleteTask } from "@/lib/db/tasks"

interface DataTableRowActionsProps<TData> {
  row: Row<TData>
}

export function DataTableRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const task = row.original as Task
  const router = useRouter();
  const { toast } = useToast();
  
  // Controls for Modals
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleCopyId = () => {
    navigator.clipboard.writeText(task.id);
    toast({ title: "Copied", description: "Task ID copied to clipboard." });
  }

  const handleDelete = async () => {
    try {
        await deleteTask(task.id);
        toast({
          title: "Task Deleted",
          description: `Task "${task.title}" has been deleted.`,
          variant: "destructive",
        });
        setShowDeleteDialog(false);
    } catch (error) {
        console.error("Failed to delete task:", error);
        toast({
            title: "Error",
            description: "Could not delete task. Please try again.",
            variant: "destructive",
        });
    }
  }

  return (
    <>
      {/* 1. EDIT SHEET (Controlled) */}
      <AddTaskSheet task={task} open={showEditSheet} onOpenChange={setShowEditSheet} />
      
      {/* 2. DELETE ALERT (Controlled) */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the task <span className="font-bold text-foreground">"{task.title}"</span>.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                    Delete
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 3. DROPDOWN MENU ACTIONS */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0 data-[state=open]:bg-muted">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[160px]">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          
          <DropdownMenuItem onClick={handleCopyId}>
            <Copy className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
            Copy ID
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => router.push(`/tasks/${task.id}`)}>
            <Eye className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
            View Details
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => setShowEditSheet(true)}>
            <Pencil className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
            Edit Task
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => window.print()}>
            <Printer className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
            Print
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-destructive focus:text-destructive">
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}