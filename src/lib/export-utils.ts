
import { format, isValid } from "date-fns";
import type { Task } from "@/lib/types";

// 🛠️ HELPER: Safe Date Formatting
export const formatDateSafe = (dateInput: any, formatStr: string = "dd-MM-yyyy") => {
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
export const formatCurrency = (amount: number, currency = 'USD') => {
    try {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(amount);
    } catch (e) {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    }
}

export const generateWordDoc = (tasks: Task[], filename: string = 'task_report.doc') => {
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

    tasks.forEach((task) => {
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
                <tr><td class="label-col">Department</td><td>${Array.isArray(task.department) ? task.department.join(", ") : (task.department || 'None')}</td></tr>
                <tr><td class="label-col">Viewers</td><td>${task.viewers && task.viewers.length > 0 ? task.viewers.map(v => v.name).join(", ") : 'None'}</td></tr>
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
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
