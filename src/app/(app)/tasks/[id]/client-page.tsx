'use client';

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { format, formatDistanceToNow, isValid } from "date-fns";
import { ArrowLeft, File as FileIcon, Pencil, Download, Printer, FileText, Trash2, MoreVertical, Eye, Plus, Loader2, Send } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { AddTaskSheet } from "../components/add-task-sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Activity, Task, User } from "@/lib/types";
import { Textarea } from "@/components/ui/textarea";
import { doc, onSnapshot, updateDoc, arrayUnion, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/auth-context";
import { usePermissions } from "@/hooks/use-permissions";
import { PermissionGuard } from "@/components/permission-guard";

// 🛠️ HELPER: Safe Date Formatting (Fixed for Firestore Timestamps)
const formatDateSafe = (dateInput: any, formatStr: string = "dd-MM-yyyy") => {
    if (!dateInput) return 'N/A';

    let date: Date;

    // Check if it's a Firestore Timestamp (has 'seconds')
    if (typeof dateInput === 'object' && dateInput !== null && 'seconds' in dateInput) {
        date = new Date(dateInput.seconds * 1000);
    } else {
        // Fallback for ISO strings or Date objects
        date = new Date(dateInput);
    }

    return isValid(date) ? format(date, formatStr) : 'N/A';
};

// 🛠️ HELPER: Currency Formatting
const formatCurrency = (amount: number | string | undefined | null, currencyCode: string = 'USD') => {
    let val = typeof amount === 'string' ? parseFloat(amount.replace(/,/g, '')) : Number(amount);
    if (isNaN(val)) val = 0;

    const safeCurrency = currencyCode || 'USD';

    try {
        const formatter = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: safeCurrency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        const parts = formatter.formatToParts(val);
        const symbol = parts.find(p => p.type === 'currency')?.value || safeCurrency;
        const numberString = parts
            .filter(p => p.type !== 'currency' && p.type !== 'literal')
            .map(p => p.value)
            .join('');
        return `${symbol} ${numberString}`;
    } catch (e) {
        return `${safeCurrency} ${val.toFixed(2)}`;
    }
}

export default function TaskDetailClient({ id }: { id: string }) {
    const router = useRouter();
    const { toast } = useToast();
    const { user: currentUser } = useAuth();
    const { can } = usePermissions();

    const [task, setTask] = useState<Task | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [newComment, setNewComment] = useState('');

    const activityEndRef = useRef<HTMLDivElement>(null);

    // 1. REAL-TIME LISTENER
    useEffect(() => {
        if (!id) return;
        const unsub = onSnapshot(doc(db, "tasks", id), (docSnap) => {
            if (docSnap.exists()) {
                setTask({ id: docSnap.id, ...docSnap.data() } as Task);
            } else {
                setTask(null);
            }
            setLoading(false);
        }, (err) => {
            console.error("Task fetch error:", err);
            setLoading(false);
        });
        return () => unsub();
    }, [id]);

    // Scroll to bottom when activity updates
    useEffect(() => {
        if (activityEndRef.current) {
            activityEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [task?.activity]);

    const sortedActivity = task?.activity
        ? [...task.activity].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        : [];

    const getSanitizedUser = (user: User): User => {
        return {
            id: user.id || "unknown",
            name: user.name || "Unknown User",
            email: user.email || "",
            role: user.role || "Member",
            avatarUrl: user.avatarUrl || null as any,
            department: user.department || null as any
        };
    };

    // --- ACTIONS ---

    const handlePostComment = async () => {
        if (!newComment.trim() || !currentUser || !task) return;

        const activityEntry: Activity = {
            id: `act-${Date.now()}`,
            user: getSanitizedUser(currentUser),
            action: 'commented',
            details: newComment,
            timestamp: new Date().toISOString()
        };

        try {
            await updateDoc(doc(db, "tasks", task.id), {
                activity: arrayUnion(activityEntry)
            });
            setNewComment('');
            toast({ title: "Comment posted" });
        } catch (e) {
            console.error(e);
            toast({ variant: "destructive", title: "Error", description: "Could not save comment." });
        }
    };

    const handleAddFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!task || !currentUser) return;
        const newFilesList = Array.from(event.target.files || []);
        if (newFilesList.length > 0) {
            const preparedFiles = newFilesList.map(file => ({
                name: file.name,
                url: URL.createObjectURL(file),
                type: file.type || "application/octet-stream"
            }));

            const updatedFiles = [...(task.files || []), ...preparedFiles];
            const sanitizedUser = getSanitizedUser(currentUser);

            const newActivities = preparedFiles.map(file => ({
                id: `act-${Date.now()}-${Math.random()}`,
                user: sanitizedUser,
                action: 'added a file',
                details: file.name,
                timestamp: new Date().toISOString()
            }));

            try {
                await updateDoc(doc(db, "tasks", task.id), {
                    files: updatedFiles,
                    activity: arrayUnion(...newActivities)
                });
                toast({ title: "File attached" });
            } catch (e) {
                console.error(e);
                toast({ variant: "destructive", title: "Upload failed" });
            }
        }
    };

    const handleDeleteFile = async (fileName: string) => {
        if (!task || !currentUser) return;
        try {
            const updatedFiles = (task.files || []).filter(f => f.name !== fileName);
            const newActivity = {
                id: `act-${Date.now()}`,
                user: getSanitizedUser(currentUser),
                action: 'deleted a file',
                details: fileName,
                timestamp: new Date().toISOString()
            };

            await updateDoc(doc(db, "tasks", task.id), {
                files: updatedFiles,
                activity: arrayUnion(newActivity)
            });
            toast({ title: "File removed" });
        } catch (e) {
            toast({ variant: "destructive", title: "Error deleting file" });
        }
    };

    const handleDelete = async () => {
        if (!task) return;
        try {
            await deleteDoc(doc(db, "tasks", task.id));
            toast({ title: "Task Deleted" });
            router.push('/tasks');
        } catch (e) {
            toast({ variant: "destructive", title: "Error deleting task" });
        }
    };

    // 3. EXPORT TXT
    const handleExportTxt = () => {
        if (!task) return;

        let txt = `TASK DETAIL REPORT\n`;
        txt += `Generated on: ${format(new Date(), "dd-MM-yyyy HH:mm:ss")}\n`;
        txt += `================================================================================\n\n`;

        txt += `TASK: ${task.title}\n`;
        txt += `ID: ${task.id}\n`;
        txt += `Status: ${task.status}\n`;
        txt += `Priority: ${task.priority}\n`;
        txt += `Label: ${task.label || 'None'}\n`;
        txt += `Assignee: ${task.assignee?.name || 'Unassigned'}\n`;
        // ✅ Handle Array or String for Department
        const depts = Array.isArray(task.department) ? task.department.join(", ") : (task.department || 'None');
        txt += `Department: ${depts}\n`;
        txt += `Viewers: ${task.viewers && task.viewers.length > 0 ? task.viewers.map(v => v.name).join(", ") : 'None'}\n`;
        txt += `Sender: ${task.sender || 'N/A'} (${task.senderLocation || ''})\n`;
        txt += `Receiver: ${task.receiver || 'N/A'} (${task.receiverLocation || ''})\n`;
        txt += `Received: ${formatDateSafe(task.receivedDate)}\n`;
        txt += `Posted On: ${formatDateSafe(task.entryDate)}\n`;
        txt += `Due Date: ${formatDateSafe(task.dueDate)}\n`;
        txt += `Period: ${task.period || 'N/A'}\n\n`;

        if (task.initialDemand || task.officialSettlement || task.motivation) {
            txt += `----------------------------------------\n`;
            txt += `FINANCIALS\n`;
            txt += `----------------------------------------\n`;
            txt += `Initial Demand: ${formatCurrency(task.initialDemand, task.initialDemandCurrency)}\n`;
            txt += `Official Settlement: ${formatCurrency(task.officialSettlement, task.officialSettlementCurrency)}\n`;
            txt += `Motivation: ${formatCurrency(task.motivation, task.motivationCurrency)}\n\n`;
        }

        txt += `----------------------------------------\n`;
        txt += `DESCRIPTION\n`;
        txt += `----------------------------------------\n`;
        txt += `${task.description || "No description provided."}\n\n`;

        if (task.activity && task.activity.length > 0) {
            txt += `----------------------------------------\n`;
            txt += `ACTIVITY LOG & COMMENTS\n`;
            txt += `----------------------------------------\n`;
            task.activity.forEach(act => {
                const date = formatDateSafe(act.timestamp, "dd-MM-yyyy HH:mm");
                const user = act.user.name;
                const action = act.action === "commented" ? "Commented:" : act.action;
                const details = act.details ? ` - ${act.details}` : "";
                txt += `[${date}] ${user} ${action}${details}\n`;
            });
        }

        const blob = new Blob([txt], { type: 'text/plain;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Task-${task.id}-Report.txt`;
        link.click();
    };

    // 4. EXPORT PDF
    const generatePdfDocument = () => {
        if (!task) return new jsPDF();
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text("Task Detail View", 14, 22);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on: ${format(new Date(), "dd-MM-yyyy HH:mm:ss")}`, 14, 30);

        const tableBody: (string | [string, string])[] = [
            ['Status', task.status || 'Pending'],
            ['Priority', task.priority || 'Medium'],
            ['Label', task.label || 'None'],
            ['Assignee', task.assignee?.name || 'Unassigned'],
            ['Department', Array.isArray(task.department) ? task.department.join(", ") : (task.department || 'None')],
            ['Viewers', task.viewers && task.viewers.length > 0 ? task.viewers.map(v => v.name).join(", ") : 'None'],
            ['Sender', task.sender || 'N/A'],
            ['Sender Location', task.senderLocation || 'N/A'],
            ['Receiver', task.receiver || 'N/A'],
            ['Receiver Location', task.receiverLocation || 'N/A'],
            ['Received Date', formatDateSafe(task.receivedDate)],
            ['Entry Date', formatDateSafe(task.entryDate)],
            ['Due Date', formatDateSafe(task.dueDate)],
            ['Period', task.period || 'N/A'],
            ['Description', task.description || 'N/A'],
        ];

        if (task.initialDemand || task.officialSettlement || task.motivation) {
            tableBody.push(['Initial Demand', formatCurrency(task.initialDemand, task.initialDemandCurrency)]);
            tableBody.push(['Official Settlement', formatCurrency(task.officialSettlement, task.officialSettlementCurrency)]);
            tableBody.push(['Motivation', formatCurrency(task.motivation, task.motivationCurrency)]);
        }

        autoTable(doc, {
            startY: 40,
            head: [[{ content: `${task.id}: ${task.title}`, colSpan: 2, styles: { halign: 'left', fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' } }]],
            body: tableBody as any,
            theme: 'grid',
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 }, 1: { cellWidth: 'auto' } },
        });
        return doc;
    };

    const handlePrint = () => generatePdfDocument().output('dataurlnewwindow');
    const handleExportPdf = () => generatePdfDocument().save(`Task-${task?.id}.pdf`);

    // Maps
    const statusVariantMap: { [key: string]: "default" | "destructive" | "secondary" } = {
        "In Progress": "default", "Completed": "default", "Overdue": "destructive", "Pending": "default", "To hold": "secondary"
    };
    const statusClassMap: { [key: string]: string | undefined } = {
        "In Progress": "bg-blue-500 border-transparent text-white",
        "Completed": "bg-green-500 border-transparent text-white",
        "Pending": "bg-yellow-500 border-transparent text-white",
        "Overdue": "bg-red-500 border-transparent text-white",
    };
    const priorityVariantMap: { [key: string]: "default" | "destructive" } = {
        "Urgent": "destructive", "High": "destructive", "Medium": "default", "Low": "default",
    };
    const priorityClassMap: { [key: string]: string | undefined } = {
        "Medium": "bg-orange-500 border-transparent text-white",
        "Low": "bg-slate-500 border-transparent text-white",
    };

    if (loading) return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    if (!task) return <div className="flex h-[50vh] items-center justify-center">Task Not Found</div>;

    return (
        <>
            <AddTaskSheet task={task} open={isSheetOpen} onOpenChange={setIsSheetOpen} />

            <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
                {/* Header / Actions */}
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Button variant="outline" size="icon" onClick={() => router.back()} className="shrink-0 h-9 w-9">
                                <ArrowLeft className="h-4 w-4" />
                                <span className="sr-only">Back</span>
                            </Button>
                            <div className="min-w-0 flex-1">
                                <h1 className="text-xl md:text-2xl font-bold tracking-tight truncate pr-2">{task.title}</h1>
                                <p className="text-sm text-muted-foreground">{task.id}</p>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2">
                            <PermissionGuard requiredPermission="Edit Tasks">
                                <Button variant="outline" size="sm" onClick={() => setIsSheetOpen(true)} className="flex-1 md:flex-none">
                                    <Pencil className="mr-2 h-4 w-4" /> Edit
                                </Button>
                            </PermissionGuard>

                            <div className="flex gap-2">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="icon" className="h-9 w-9">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={handleExportTxt}><Download className="mr-2 h-4 w-4" />Download TXT</DropdownMenuItem>
                                        <DropdownMenuItem onClick={handlePrint}><Printer className="mr-2 h-4 w-4" />Print View</DropdownMenuItem>
                                        <DropdownMenuItem onClick={handleExportPdf}><FileIcon className="mr-2 h-4 w-4" />Export PDF</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                <PermissionGuard requiredPermission="Delete Tasks">
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" size="icon" className="h-9 w-9"><Trash2 className="h-4 w-4" /></Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Delete Task?</AlertDialogTitle>
                                                <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={handleDelete} className="bg-destructive">Delete</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </PermissionGuard>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Layout Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Left Column: Details & Activity */}
                    <div className="lg:col-span-2 space-y-6 min-w-0">
                        <Card>
                            <CardHeader className="pb-3">
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="outline" className="truncate max-w-[150px]">{task.label}</Badge>
                                    {task.priority && <Badge variant={priorityVariantMap[task.priority]} className={priorityClassMap[task.priority]}>{task.priority}</Badge>}
                                    {task.status && <Badge variant={statusVariantMap[task.status]} className={statusClassMap[task.status]}>{task.status}</Badge>}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div>
                                    <h3 className="font-semibold text-sm mb-2 text-muted-foreground uppercase tracking-wider">Description</h3>
                                    <p className="text-sm whitespace-pre-wrap break-words">{task.description || "No description provided."}</p>
                                </div>

                                <Separator />

                                {/* Activity Log */}
                                <div>
                                    <h3 className="font-semibold text-sm mb-4 text-muted-foreground uppercase tracking-wider">Activity Log</h3>
                                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                        {sortedActivity.map((act) => (
                                            <div key={act.id} className="flex items-start gap-3 group">
                                                <Avatar className="h-8 w-8 mt-1 border shrink-0">
                                                    <AvatarImage src={act.user?.avatarUrl} alt={act.user?.name} />
                                                    <AvatarFallback>{(act.user?.name || "?").charAt(0).toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 space-y-1 bg-muted/30 p-3 rounded-lg text-sm min-w-0">
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                                        <div className="truncate">
                                                            <span className="font-semibold">{act.user?.name || "Unknown"}</span>
                                                            <span className="text-muted-foreground text-xs ml-2 whitespace-nowrap">
                                                                {formatDistanceToNow(new Date(act.timestamp), { addSuffix: true })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="text-foreground break-words">
                                                        <span className="text-muted-foreground italic">{act.action}</span>
                                                        {act.details && act.action !== 'commented' && <span className="font-medium"> "{act.details}"</span>}
                                                        {act.action === 'commented' && <div className="mt-1 whitespace-pre-wrap">{act.details}</div>}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {sortedActivity.length === 0 && <p className="text-sm text-muted-foreground italic text-center">No activity yet.</p>}
                                        <div ref={activityEndRef} />
                                    </div>

                                    {/* Comment Input */}
                                    <div className="mt-6 pt-4 border-t flex flex-col sm:flex-row items-start gap-3">
                                        <Avatar className="h-8 w-8 hidden sm:block">
                                            <AvatarImage src={currentUser?.avatarUrl} />
                                            <AvatarFallback>{currentUser?.name?.charAt(0) || "U"}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 w-full space-y-2">
                                            <Textarea
                                                placeholder="Write a comment..."
                                                value={newComment}
                                                onChange={(e) => setNewComment(e.target.value)}
                                                className="min-h-[80px]"
                                            />
                                            <div className="flex justify-end">
                                                <Button size="sm" onClick={handlePostComment} disabled={!newComment.trim()} className="w-full sm:w-auto">
                                                    <Send className="mr-2 h-3 w-3" /> Post
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                {/* Files */}
                                <div>
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
                                        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Attachments</h3>
                                        <Button asChild variant="secondary" size="sm" className="w-full sm:w-auto">
                                            <label className="cursor-pointer justify-center">
                                                <Plus className="mr-2 h-4 w-4" /> Add File
                                                <input type="file" multiple className="hidden" onChange={handleAddFile} />
                                            </label>
                                        </Button>
                                    </div>
                                    {(task.files && task.files.length > 0) ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {task.files.map((file, index) => (
                                                <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors">
                                                    <div className="flex items-center gap-3 overflow-hidden min-w-0">
                                                        <div className="h-10 w-10 shrink-0 bg-primary/10 rounded-md flex items-center justify-center text-primary"><FileIcon className="h-5 w-5" /></div>
                                                        <span className="text-sm font-medium truncate">{file.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild><a href={file.url} target="_blank" rel="noopener noreferrer"><Eye className="h-4 w-4" /></a></Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteFile(file.name)}><Trash2 className="h-4 w-4" /></Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="border-2 border-dashed border-muted-foreground/20 rounded-lg p-6 flex flex-col items-center justify-center text-center bg-muted/5">
                                            <FileIcon className="h-8 w-8 text-muted-foreground/50 mb-3" />
                                            <p className="text-sm text-muted-foreground">No files attached.</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Sidebar */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader className="pb-3 border-b bg-muted/20">
                                <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Details</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-4 text-sm">
                                <div className="grid grid-cols-2 gap-2"><span className="text-muted-foreground">Sender:</span><span className="font-medium text-right truncate">{task.sender || "—"}</span></div>
                                <div className="grid grid-cols-2 gap-2"><span className="text-muted-foreground">Location:</span><span className="font-medium text-right truncate">{task.senderLocation || "—"}</span></div>
                                <Separator className="my-2" />
                                <div className="grid grid-cols-2 gap-2"><span className="text-muted-foreground">Receiver:</span><span className="font-medium text-right truncate">{task.receiver || "—"}</span></div>
                                <div className="grid grid-cols-2 gap-2"><span className="text-muted-foreground">Location:</span><span className="font-medium text-right truncate">{task.receiverLocation || "—"}</span></div>
                                <Separator className="my-2" />
                                {/* ✅ ADDED: Received Date, Period, and fixed Date rendering */}
                                <div className="grid grid-cols-2 gap-2"><span className="text-muted-foreground">Received Date:</span><span className="font-medium text-right">{formatDateSafe(task.receivedDate)}</span></div>
                                <div className="grid grid-cols-2 gap-2"><span className="text-muted-foreground">Due Date:</span><span className="font-semibold text-right text-red-600">{formatDateSafe(task.dueDate)}</span></div>
                                <div className="grid grid-cols-2 gap-2"><span className="text-muted-foreground">Posted on:</span><span className="font-medium text-right ">{formatDateSafe(task.entryDate)}</span></div>
                                <div className="grid grid-cols-2 gap-2"><span className="text-muted-foreground">Period:</span><span className="font-medium text-right truncate">{task.period || "—"}</span></div>

                                <div className="mt-4 pt-4 border-t">
                                    <span className="text-xs text-muted-foreground uppercase mb-2 block">Assignee</span>
                                    <div className="flex items-center gap-3 bg-muted/50 p-2 rounded-md">
                                        <Avatar className="h-8 w-8 border shrink-0">
                                            <AvatarImage src={task.assignee?.avatarUrl} />
                                            <AvatarFallback>{task.assignee?.name?.charAt(0) || "?"}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col overflow-hidden min-w-0">
                                            <span className="font-medium truncate">{task.assignee?.name || "Unassigned"}</span>
                                            <span className="text-xs text-muted-foreground truncate">{task.assignee?.role || "Member"}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* ✅ DEPARTMENT DISPLAY */}
                                {(task.department && (Array.isArray(task.department) ? task.department.length > 0 : task.department)) && (
                                    <div className="mt-4 pt-4 border-t">
                                        <span className="text-xs text-muted-foreground uppercase mb-2 block">Department</span>
                                        <div className="flex flex-wrap gap-2">
                                            {Array.isArray(task.department)
                                                ? task.department.map(d => <Badge key={d} variant="secondary" className="font-normal">{d}</Badge>)
                                                : <Badge variant="secondary" className="font-normal">{task.department}</Badge>
                                            }
                                        </div>
                                    </div>
                                )}

                                {/* ✅ VIEWERS LIST */}
                                {task.viewers && task.viewers.length > 0 && (
                                    <div className="mt-4 pt-4 border-t">
                                        <span className="text-xs text-muted-foreground uppercase mb-2 block">Viewers</span>
                                        <div className="space-y-2">
                                            {task.viewers.map((viewer) => (
                                                <div key={viewer.id} className="flex items-center gap-3 bg-muted/30 p-2 rounded-md">
                                                    <Avatar className="h-6 w-6 border shrink-0">
                                                        <AvatarImage src={viewer.avatarUrl} />
                                                        <AvatarFallback>{viewer.name?.charAt(0) || "?"}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex flex-col overflow-hidden min-w-0">
                                                        <span className="font-medium truncate text-xs">{viewer.name || "Unknown"}</span>
                                                        <span className="text-[10px] text-muted-foreground truncate">{viewer.role || "Member"}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <PermissionGuard requiredPermission="View Financials">
                            <Card>
                                <CardHeader className="pb-3 border-b bg-muted/20">
                                    <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Financials</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-4 text-sm">
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Initial Demand</span>
                                        <span className="font-bold">{formatCurrency(task.initialDemand, task.initialDemandCurrency)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Official Settlement</span>
                                        <span className="font-bold ">{formatCurrency(task.officialSettlement, task.officialSettlementCurrency)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Motivation</span>
                                        <span className="font-bold">{formatCurrency(task.motivation, task.motivationCurrency)}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </PermissionGuard>
                    </div>
                </div>
            </div >
        </>
    );
}