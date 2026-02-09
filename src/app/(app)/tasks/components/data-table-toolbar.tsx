"use client"

import { type Table } from "@tanstack/react-table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { PlusCircle, Filter, X, Upload, Printer, Search } from "lucide-react"
import { AddTaskSheet } from "./add-task-sheet"
import { PermissionGuard } from "@/components/permission-guard"
import type { Task } from "@/lib/types"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { format, isValid } from "date-fns"
import { mockUsers } from "@/lib/data"

interface DataTableToolbarProps<TData> {
    table: Table<TData>
    showAddTaskButton?: boolean
}

// 🛠️ HELPER: Safe Date Formatting
const formatDateSafe = (dateInput: any, formatStr: string = "dd-MM-yyyy") => {
    if (!dateInput) return 'N/A';

    let date: Date;
    // Handle Firestore Timestamp
    if (typeof dateInput === 'object' && dateInput !== null && 'seconds' in dateInput) {
        date = new Date(dateInput.seconds * 1000);
    } else {
        date = new Date(dateInput);
    }

    return isValid(date) ? format(date, formatStr) : 'N/A';
};

// 🛠️ HELPER: Currency Formatting
const formatCurrency = (amount: number, currency = 'USD') => {
    try {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(amount);
    } catch (e) {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    }
}

const statuses = [
    { value: 'In Progress', label: 'In Progress' },
    { value: 'Completed', label: 'Completed' },
    { value: 'Overdue', label: 'Overdue' },
    { value: 'Pending', label: 'Pending' },
    { value: 'To hold', label: 'To hold' },
];

const priorities = [
    { value: 'Urgent', label: 'Urgent' },
    { value: 'High', label: 'High' },
    { value: 'Medium', label: 'Medium' },
    { value: 'Low', label: 'Low' },
];

const labels = [
    { value: 'Website', label: 'Website' },
    { value: 'Analytics', label: 'Analytics' },
    { value: 'Bug', label: 'Bug' },
    { value: 'Reporting', label: 'Reporting' },
    { value: 'HR', label: 'HR' },
    { value: 'Legal', label: 'Legal' },
];

export function DataTableToolbar<TData>({
    table,
    showAddTaskButton = true,
}: DataTableToolbarProps<TData>) {

    const assignees = mockUsers.map(user => ({ value: user.name, label: user.name }));

    const statusColumn = table.getColumn("status");
    const selectedStatusValues = new Set(statusColumn?.getFilterValue() as string[]);

    const priorityColumn = table.getColumn("priority");
    const selectedPriorityValues = new Set(priorityColumn?.getFilterValue() as string[]);

    const assigneeColumn = table.getColumn("assignee");
    const selectedAssigneeValues = new Set(assigneeColumn?.getFilterValue() as string[]);

    const labelColumn = table.getColumn("label");
    const selectedLabelValues = new Set(labelColumn?.getFilterValue() as string[]);

    const isFiltered = table.getState().columnFilters.length > 0;
    const activeFilterCount = new Set(table.getState().columnFilters.map(f => f.id)).size;

    // ✅ HELPER: Get Sorted Tasks (Ascending by ID)
    const getSortedTasks = () => {
        const rows = table.getFilteredRowModel().rows.map(row => row.original as Task);
        return rows.sort((a, b) => {
            return (a.id || "").toString().localeCompare((b.id || "").toString(), undefined, { numeric: true });
        });
    };

    // --- 1. HANDLE DOWNLOAD TXT ---
    const handleDownloadTxt = () => {
        const tasksToExport = getSortedTasks();
        let txtContent = `TASK LIST REPORT\nGenerated on: ${format(new Date(), "dd-MM-yyyy HH:mm:ss")}\n\n`;

        tasksToExport.forEach((task, index) => {
            txtContent += `========================================\n`;
            txtContent += `TASK #${index + 1}: ${task.title}\n`;
            txtContent += `ID: ${task.id}\n`;
            txtContent += `----------------------------------------\n`;
            txtContent += `Status: ${task.status}\n`;
            txtContent += `Priority: ${task.priority}\n`;
            txtContent += `Label: ${task.label || 'None'}\n`;
            txtContent += `Assignee: ${task.assignee?.name || 'Unassigned'}\n`;
            txtContent += `Sender: ${task.sender || 'N/A'}\n`;
            txtContent += `Sender Loc: ${task.senderLocation || 'N/A'}\n`;
            txtContent += `Receiver: ${task.receiver || 'N/A'}\n`;
            txtContent += `Receiver Loc: ${task.receiverLocation || 'N/A'}\n`;
            txtContent += `Received Date: ${formatDateSafe(task.receivedDate)}\n`;
            txtContent += `Entry Date: ${formatDateSafe(task.entryDate)}\n`;
            txtContent += `Due Date: ${formatDateSafe(task.dueDate)}\n`;
            txtContent += `Period: ${task.period || 'N/A'}\n`;
            txtContent += `Description: ${task.description || 'N/A'}\n`;

            if (task.initialDemand || task.officialSettlement || task.motivation) {
                txtContent += `----------------------------------------\n`;
                txtContent += `FINANCIALS:\n`;
                txtContent += `Initial Demand: ${formatCurrency(task.initialDemand || 0, task.initialDemandCurrency)}\n`;
                txtContent += `Official Settlement: ${formatCurrency(task.officialSettlement || 0, task.officialSettlementCurrency)}\n`;
                txtContent += `Motivation: ${formatCurrency(task.motivation || 0, task.motivationCurrency)}\n`;
            }

            txtContent += `\n\n`;
        });

        const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'task_report_full.txt');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // --- 2. HANDLE DOWNLOAD WORD ---
    const handleDownloadWord = () => {
        const tasksToExport = getSortedTasks();
        let htmlContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
            <meta charset="utf-8">
            <title>Task Detail View</title>
            <style>
                @page { size: A4; margin: 0.5in; }
                body { font-family: Arial, sans-serif; font-size: 10pt; line-height: 1.2; }
                .report-title { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
                .meta { font-size: 10px; color: #555; margin-bottom: 10px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 15px; border: 1px solid #000; page-break-inside: avoid; }
                th { background-color: #4f81bd; color: white; font-weight: bold; text-align: left; padding: 4px 8px; font-size: 12px; border: 1px solid #000; }
                td { border: 1px solid #000; padding: 3px 8px; font-size: 10px; vertical-align: middle; }
                .label-col { width: 25%; background-color: #f2f2f2; font-weight: bold; color: #000; }
            </style>
        </head>
        <body>
            <div class="report-title">Task Detail View</div>
            <div class="meta">Generated: ${format(new Date(), "dd-MM-yyyy HH:mm:ss")}</div>
    `;

        tasksToExport.forEach((task) => {
            htmlContent += `
            <table>
                <thead>
                    <tr><th colspan="2">${task.id}: ${task.title}</th></tr>
                </thead>
                <tbody>
                    <tr><td class="label-col">Status</td><td>${task.status || 'Pending'}</td></tr>
                    <tr><td class="label-col">Priority</td><td>${task.priority || 'Medium'}</td></tr>
                    <tr><td class="label-col">Label</td><td>${task.label || 'None'}</td></tr>
                    <tr><td class="label-col">Assignee</td><td>${task.assignee?.name || 'Unassigned'}</td></tr>
                    <tr><td class="label-col">Sender</td><td>${task.sender || 'N/A'}</td></tr>
                    <tr><td class="label-col">Sender Location</td><td>${task.senderLocation || 'N/A'}</td></tr>
                    <tr><td class="label-col">Receiver</td><td>${task.receiver || 'N/A'}</td></tr>
                    <tr><td class="label-col">Receiver Location</td><td>${task.receiverLocation || 'N/A'}</td></tr>
                    <tr><td class="label-col">Received Date</td><td>${formatDateSafe(task.receivedDate)}</td></tr>
                    <tr><td class="label-col">Entry Date</td><td>${formatDateSafe(task.entryDate)}</td></tr>
                    <tr><td class="label-col">Due Date</td><td>${formatDateSafe(task.dueDate)}</td></tr>
                    <tr><td class="label-col">Period</td><td>${task.period || 'N/A'}</td></tr>
                    <tr><td class="label-col">Description</td><td>${task.description || 'N/A'}</td></tr>
        `;

            if (task.initialDemand || task.officialSettlement || task.motivation) {
                htmlContent += `
                <tr><td class="label-col" style="background-color: #dce6f1;">Financials</td><td style="background-color: #dce6f1;"></td></tr>
                <tr><td class="label-col">Initial Demand</td><td>${formatCurrency(task.initialDemand || 0, task.initialDemandCurrency)}</td></tr>
                <tr><td class="label-col">Official Settlement</td><td>${formatCurrency(task.officialSettlement || 0, task.officialSettlementCurrency)}</td></tr>
                <tr><td class="label-col">Motivation</td><td>${formatCurrency(task.motivation || 0, task.motivationCurrency)}</td></tr>
             `;
            }
            htmlContent += `</tbody></table>`;
        });
        htmlContent += `</body></html>`;

        const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'task_detail_report.doc';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // --- 3. HANDLE PRINT DETAILS (Fixed for Android) ---
    const handlePrintDetails = () => {
        const doc = new jsPDF();
        const tasksToPrint = getSortedTasks();
        doc.setFontSize(18);
        doc.text("Task List - Detailed View", 14, 22);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Printed on: ${format(new Date(), "dd-MM-yyyy HH:mm:ss")}`, 14, 30);

        tasksToPrint.forEach((task, index) => {
            const tableBody: (string | [string, string])[] = [
                ['Status', task.status || 'Pending'],
                ['Priority', task.priority || 'Medium'],
                ['Label', task.label || 'None'],
                ['Assignee', task.assignee?.name || 'Unassigned'],
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
                tableBody.push(['Initial Demand', formatCurrency(task.initialDemand || 0, task.initialDemandCurrency)]);
                tableBody.push(['Official Settlement', formatCurrency(task.officialSettlement || 0, task.officialSettlementCurrency)]);
                tableBody.push(['Motivation', formatCurrency(task.motivation || 0, task.motivationCurrency)]);
            }
            autoTable(doc, {
                startY: index === 0 ? 40 : (doc as any).lastAutoTable.finalY + 10,
                head: [[{ content: `${task.id}: ${task.title}`, colSpan: 2, styles: { halign: 'left', fillColor: [79, 129, 189], textColor: 255, fontStyle: 'bold' } }]],
                body: tableBody as any,
                theme: 'grid',
                columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40, fillColor: [245, 245, 245] }, 1: { cellWidth: 'auto' } },
            });
        });

        // ✅ FIXED: Using Blob logic for Android compatibility
        const pdfBlob = doc.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);
        window.open(pdfUrl, '_blank');
    }

    // --- 4. HANDLE PRINT SUMMARY (Fixed for Android) ---
    const handlePrintSummary = () => {
        const doc = new jsPDF({ orientation: "landscape" });
        const tasksToPrint = getSortedTasks();
        doc.setFontSize(18);
        doc.text("Tasks Summary", 14, 22);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Printed on: ${format(new Date(), "dd-MM-yyyy HH:mm:ss")}`, 14, 30);

        autoTable(doc, {
            startY: 35,
            head: [['Task ID', 'Title', 'Label', 'Status', 'Priority', 'Assignee', 'Received Date', 'Period', 'Due Date']],
            body: tasksToPrint.map(task => ([
                task.id, task.title, task.label, task.status, task.priority,
                task.assignee?.name || "Unassigned", formatDateSafe(task.receivedDate),
                task.period || 'N/A', formatDateSafe(task.dueDate)
            ])),
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185] },
        });

        // ✅ FIXED: Using Blob logic for Android compatibility
        const pdfBlob = doc.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);
        window.open(pdfUrl, '_blank');
    }

    const handleExportCsv = () => {
        const tasksToExport = getSortedTasks();
        const headers = ["Task ID", "Title", "Label", "Status", "Priority", "Assignee", "Received Date", "Period", "Due Date"];
        const csvRows = [headers.join(',')];
        for (const task of tasksToExport) {
            const values = [
                task.id,
                `"${(task.title || "").replace(/"/g, '""')}"`,
                task.label || "",
                task.status || "Pending",
                task.priority || "Medium",
                task.assignee?.name || "Unassigned",
                formatDateSafe(task.receivedDate, "yyyy-MM-dd"),
                task.period || 'N/A',
                formatDateSafe(task.dueDate, "yyyy-MM-dd")
            ];
            csvRows.push(values.join(','));
        }
        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'tasks_summary.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between no-print mb-4">

            {/* SEARCH & FILTERS */}
            <div className="flex flex-1 items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:grow-0">
                    <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search tasks..."
                        value={(table.getColumn("title")?.getFilterValue() as string) ?? ""}
                        onChange={(event) => table.getColumn("title")?.setFilterValue(event.target.value)}
                        className="h-9 w-full sm:w-[200px] lg:w-[250px] pl-8"
                    />
                </div>

                {/* FILTER DROPDOWN */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-9 border-dashed">
                            <Filter className="mr-2 h-4 w-4" />
                            Filter
                            {activeFilterCount > 0 && (
                                <>
                                    <Separator orientation="vertical" className="mx-2 h-4" />
                                    <Badge variant="secondary" className="rounded-sm px-1 font-normal lg:hidden">
                                        {activeFilterCount}
                                    </Badge>
                                    <Badge variant="secondary" className="hidden lg:inline-flex rounded-sm px-1 font-normal">
                                        {activeFilterCount} selected
                                    </Badge>
                                </>
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-[200px] max-h-[400px] overflow-y-auto custom-scrollbar">
                        <DropdownMenuLabel>Status</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {statuses.map((status) => (
                            <DropdownMenuCheckboxItem
                                key={status.value}
                                checked={selectedStatusValues.has(status.value)}
                                onCheckedChange={(checked) => {
                                    const newSelectedValues = new Set(selectedStatusValues);
                                    if (checked) newSelectedValues.add(status.value);
                                    else newSelectedValues.delete(status.value);
                                    statusColumn?.setFilterValue(Array.from(newSelectedValues).length ? Array.from(newSelectedValues) : undefined);
                                }}
                            >
                                {status.label}
                            </DropdownMenuCheckboxItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Priority</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {priorities.map((priority) => (
                            <DropdownMenuCheckboxItem
                                key={priority.value}
                                checked={selectedPriorityValues.has(priority.value)}
                                onCheckedChange={(checked) => {
                                    const newSelectedValues = new Set(selectedPriorityValues);
                                    if (checked) newSelectedValues.add(priority.value);
                                    else newSelectedValues.delete(priority.value);
                                    priorityColumn?.setFilterValue(Array.from(newSelectedValues).length ? Array.from(newSelectedValues) : undefined);
                                }}
                            >
                                {priority.label}
                            </DropdownMenuCheckboxItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Labels</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {labels.map((label) => (
                            <DropdownMenuCheckboxItem
                                key={label.value}
                                checked={selectedLabelValues.has(label.value)}
                                onCheckedChange={(checked) => {
                                    const newSelectedValues = new Set(selectedLabelValues);
                                    if (checked) newSelectedValues.add(label.value);
                                    else newSelectedValues.delete(label.value);
                                    labelColumn?.setFilterValue(Array.from(newSelectedValues).length ? Array.from(newSelectedValues) : undefined);
                                }}
                            >
                                {label.label}
                            </DropdownMenuCheckboxItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Assignee</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {assignees.map((assignee) => (
                            <DropdownMenuCheckboxItem
                                key={assignee.value}
                                checked={selectedAssigneeValues.has(assignee.value)}
                                onCheckedChange={(checked) => {
                                    const newSelectedValues = new Set(selectedAssigneeValues);
                                    if (checked) newSelectedValues.add(assignee.value);
                                    else newSelectedValues.delete(assignee.value);
                                    assigneeColumn?.setFilterValue(Array.from(newSelectedValues).length ? Array.from(newSelectedValues) : undefined);
                                }}
                            >
                                {assignee.label}
                            </DropdownMenuCheckboxItem>
                        ))}
                        {isFiltered && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={() => table.resetColumnFilters()} className="justify-center text-center">
                                    Clear Filters
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>

                {isFiltered && (
                    <Button variant="ghost" onClick={() => table.resetColumnFilters()} className="h-9 px-2 lg:px-3">
                        Reset <X className="ml-2 h-4 w-4" />
                    </Button>
                )}
            </div>

            {/* ACTIONS (Right Side) */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-9">
                            <Upload className="mr-2 h-4 w-4" />
                            Export
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={handleExportCsv}>Export CSV</DropdownMenuItem>
                        <DropdownMenuItem onClick={handleDownloadTxt}>Download TXT </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleDownloadWord}>Download Word</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon" className="h-9 w-9">
                            <Printer className="h-4 w-4" />
                            <span className="sr-only">Print</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={handlePrintSummary}>Print Summary (PDF)</DropdownMenuItem>
                        <DropdownMenuItem onClick={handlePrintDetails}>Print Details (PDF)</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                {showAddTaskButton && (
                    <PermissionGuard requiredPermission="Create Tasks">
                        <AddTaskSheet>
                            <Button size="sm" className="h-9">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add
                            </Button>
                        </AddTaskSheet>
                    </PermissionGuard>
                )}
            </div>
        </div>
    )
}