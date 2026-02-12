'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, Banknote, Gift, TrendingUp, Printer, X, Filter, Upload, Search, Loader2, MoreVertical, MoreHorizontal } from "lucide-react";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { Task, FinancialSummary } from '@/lib/types';

// Import Real-Time Hook
// Import Real-Time Hook
import { useRealtimeTasks } from "@/hooks/use-tasks";
import { generateFinancialsWordDoc } from '@/lib/export-utils';
import { usePermissions } from "@/hooks/use-permissions";
import { useRouter } from "next/navigation"; // Ensure correct import

const initialSummary: FinancialSummary = {
    USD: { totalInitialDemand: 0, totalOfficialPayment: 0, totalMotivation: 0, grandTotal: 0 }
};

export default function FinancialsPage() {
    const { tasks, loading } = useRealtimeTasks();
    const { can, loading: permissionsLoading } = usePermissions();
    const router = useRouter();

    // ✅ SECURE ROUTE: Redirect if no permission (Wait for loading)
    useEffect(() => {
        if (!permissionsLoading && !can("View Financials")) {
            router.push("/dashboard");
        }
    }, [can, permissionsLoading, router]);

    // Memoize financial tasks
    const financialTasks = useMemo(() => {
        return tasks.filter(task =>
            (Number(task.initialDemand) > 0) ||
            (Number(task.officialSettlement) > 0) ||
            (Number(task.motivation) > 0)
        );
    }, [tasks]);

    const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Filters
    const [selectedYears, setSelectedYears] = useState<Set<string>>(new Set());
    const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(new Set());
    const [selectedPriorities, setSelectedPriorities] = useState<Set<string>>(new Set());
    const [selectedLabels, setSelectedLabels] = useState<Set<string>>(new Set());

    const [displaySummary, setDisplaySummary] = useState<FinancialSummary>(initialSummary);

    // ✅ Available Years (Dynamic from Data)
    const availableYears = useMemo(() => {
        const dataYears = financialTasks.map(task => {
            const dateStr = task.entryDate || task.createdAt;
            if (!dateStr) return null;
            const dateObj = new Date(dateStr);
            return isNaN(dateObj.getTime()) ? null : dateObj.getFullYear().toString();
        }).filter(Boolean) as string[];

        // Always include current year if no data, otherwise just the data years
        if (dataYears.length === 0) {
            return [new Date().getFullYear().toString()];
        }

        return Array.from(new Set(dataYears)).sort((a, b) => b.localeCompare(a));
    }, [financialTasks]);

    const availableStatuses = useMemo(() => Array.from(new Set(financialTasks.map(t => t.status || "Pending"))).sort(), [financialTasks]);
    const availablePriorities = useMemo(() => Array.from(new Set(financialTasks.map(t => t.priority || "Medium"))).sort(), [financialTasks]);
    const availableLabels = useMemo(() => Array.from(new Set(financialTasks.map(t => t.label).filter(Boolean) as string[])).sort(), [financialTasks]);

    const isFiltered = searchTerm.length > 0 || selectedYears.size > 0 || selectedStatuses.size > 0 || selectedPriorities.size > 0 || selectedLabels.size > 0;

    // --- ACTIONS ---
    const resetFilters = () => {
        setSearchTerm('');
        setSelectedYears(new Set());
        setSelectedStatuses(new Set());
        setSelectedPriorities(new Set());
        setSelectedLabels(new Set());
    };

    // Helper to render filter items (Reused for Desktop & Mobile)
    const renderFilterItems = () => (
        <>
            <DropdownMenuLabel>Year</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {availableYears.map((year) => (
                <DropdownMenuCheckboxItem
                    key={`year-${year}`}
                    checked={selectedYears.has(year)}
                    onSelect={(e) => e.preventDefault()}
                    onCheckedChange={(checked) => {
                        const newSelected = new Set(selectedYears);
                        if (checked) newSelected.add(year);
                        else newSelected.delete(year);
                        setSelectedYears(newSelected);
                    }}
                >
                    {year}
                </DropdownMenuCheckboxItem>
            ))}

            <DropdownMenuSeparator />
            <DropdownMenuLabel>Status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {availableStatuses.map((status) => (
                <DropdownMenuCheckboxItem
                    key={`status-${status}`}
                    checked={selectedStatuses.has(status)}
                    onSelect={(e) => e.preventDefault()}
                    onCheckedChange={(checked) => {
                        const newSelected = new Set(selectedStatuses);
                        if (checked) newSelected.add(status);
                        else newSelected.delete(status);
                        setSelectedStatuses(newSelected);
                    }}
                >
                    {status}
                </DropdownMenuCheckboxItem>
            ))}

            <DropdownMenuSeparator />
            <DropdownMenuLabel>Priority</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {availablePriorities.map((priority) => (
                <DropdownMenuCheckboxItem
                    key={`priority-${priority}`}
                    checked={selectedPriorities.has(priority)}
                    onSelect={(e) => e.preventDefault()}
                    onCheckedChange={(checked) => {
                        const newSelected = new Set(selectedPriorities);
                        if (checked) newSelected.add(priority);
                        else newSelected.delete(priority);
                        setSelectedPriorities(newSelected);
                    }}
                >
                    {priority}
                </DropdownMenuCheckboxItem>
            ))}

            <DropdownMenuSeparator />
            <DropdownMenuLabel>Label</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {availableLabels.map((label) => (
                <DropdownMenuCheckboxItem
                    key={`label-${label}`}
                    checked={selectedLabels.has(label)}
                    onSelect={(e) => e.preventDefault()}
                    onCheckedChange={(checked) => {
                        const newSelected = new Set(selectedLabels);
                        if (checked) newSelected.add(label);
                        else newSelected.delete(label);
                        setSelectedLabels(newSelected);
                    }}
                >
                    {label}
                </DropdownMenuCheckboxItem>
            ))}

            {isFiltered && (
                <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={resetFilters} className="justify-center text-center cursor-pointer">
                        Clear All Filters
                    </DropdownMenuItem>
                </>
            )}
        </>
    );

    useEffect(() => {
        let result = financialTasks;

        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            result = result.filter(task =>
                (task.title || "").toLowerCase().includes(lowerSearch) ||
                (task.id || "").toLowerCase().includes(lowerSearch)
            );
        }

        if (selectedYears.size > 0) {
            result = result.filter(task => {
                const dateStr = task.entryDate || task.createdAt || new Date().toISOString();
                const dateObj = new Date(dateStr);
                const year = isNaN(dateObj.getTime()) ? "N/A" : dateObj.getFullYear().toString();
                return selectedYears.has(year);
            });
        }

        if (selectedStatuses.size > 0) result = result.filter(task => selectedStatuses.has(task.status || "Pending"));
        if (selectedPriorities.size > 0) result = result.filter(task => selectedPriorities.has(task.priority || "Medium"));
        if (selectedLabels.size > 0) result = result.filter(task => selectedLabels.has(task.label || ""));

        setFilteredTasks(result);
    }, [searchTerm, selectedYears, selectedStatuses, selectedPriorities, selectedLabels, financialTasks]);

    useEffect(() => {
        const calculateSummary = (tasks: Task[]): FinancialSummary => {
            const summaryData: FinancialSummary = {};

            tasks.forEach(task => {
                const iCurrency = task.initialDemandCurrency || 'USD';
                const oCurrency = task.officialSettlementCurrency || 'USD';
                const mCurrency = task.motivationCurrency || 'USD';

                if (task.initialDemand) {
                    if (!summaryData[iCurrency]) summaryData[iCurrency] = { totalInitialDemand: 0, totalOfficialPayment: 0, totalMotivation: 0, grandTotal: 0 };
                    summaryData[iCurrency].totalInitialDemand += Number(task.initialDemand);
                }

                if (task.officialSettlement) {
                    if (!summaryData[oCurrency]) summaryData[oCurrency] = { totalInitialDemand: 0, totalOfficialPayment: 0, totalMotivation: 0, grandTotal: 0 };
                    summaryData[oCurrency].totalOfficialPayment += Number(task.officialSettlement);
                }

                if (task.motivation) {
                    if (!summaryData[mCurrency]) summaryData[mCurrency] = { totalInitialDemand: 0, totalOfficialPayment: 0, totalMotivation: 0, grandTotal: 0 };
                    summaryData[mCurrency].totalMotivation += Number(task.motivation);
                }
            });

            Object.keys(summaryData).forEach(currency => {
                summaryData[currency].grandTotal =
                    summaryData[currency].totalOfficialPayment +
                    summaryData[currency].totalMotivation;
            });

            return Object.keys(summaryData).length > 0 ? summaryData : initialSummary;
        };

        setDisplaySummary(calculateSummary(filteredTasks));
    }, [filteredTasks]);

    const formatCurrency = (amount: number | string | undefined | null, currencyCode = 'USD') => {
        let val = Number(amount);
        if (isNaN(val)) val = 0;

        const safeCurrency = currencyCode || 'USD';

        try {
            const parts = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: safeCurrency
            }).formatToParts(0);

            const symbol = parts.find(p => p.type === 'currency')?.value || safeCurrency;

            const numberStr = new Intl.NumberFormat('en-US', {
                style: 'decimal',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(val);

            return `${symbol} ${numberStr}`;

        } catch (e) {
            return `${safeCurrency} ${val.toFixed(2)}`;
        }
    }

    const getDynamicFontSize = (text: string) => {
        const length = text.length;
        if (length > 20) return "text-xs"; // Very long numbers
        if (length > 15) return "text-sm"; // Long numbers
        if (length > 12) return "text-lg"; // Medium numbers
        return "text-2xl"; // Standard
    };

    const summaryCurrencies = Object.keys(displaySummary).sort();

    const activeFilterCount = (selectedYears.size > 0 ? 1 : 0) + (selectedStatuses.size > 0 ? 1 : 0) + (selectedPriorities.size > 0 ? 1 : 0) + (selectedLabels.size > 0 ? 1 : 0);



    const statusVariantMap: { [key: string]: "default" | "destructive" | "secondary" } = {
        "In Progress": "default",
        "Completed": "default",
        "Overdue": "destructive",
        "Pending": "default",
        "To hold": "secondary"
    };

    const statusClassMap: { [key: string]: string | undefined } = {
        "In Progress": "bg-[hsl(var(--chart-3))] text-primary-foreground hover:bg-[hsl(var(--chart-3))]/80",
        "Completed": "bg-[hsl(var(--chart-1))] text-primary-foreground hover:bg-[hsl(var(--chart-1))]/80",
        "Pending": "bg-[hsl(var(--chart-5))] text-primary-foreground hover:bg-[hsl(var(--chart-5))]/80",
    };

    const handleExportCsv = () => {
        const headers = ["Task ID", "Title", "Label", "Period", "Sender", "Receiver", "Assignee", "Status", "Initial Demand", "Currency", "Official Payment", "Currency", "Motivation", "Currency"];
        const csvRows = [headers.join(',')];

        for (const task of filteredTasks) {
            const values = [
                task.id,
                `"${(task.title || "").replace(/"/g, '""')}"`,
                task.label || "",
                task.period || '',
                task.sender || '',
                task.receiver || '',
                task.assignee?.name || "Unassigned",
                task.status || "Pending",
                task.initialDemand || 0,
                task.initialDemandCurrency || 'USD',
                task.officialSettlement || 0,
                task.officialSettlementCurrency || 'USD',
                task.motivation || 0,
                task.motivationCurrency || 'USD',
            ];
            csvRows.push(values.join(','));
        }

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'financials.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePrintPdf = () => {
        const doc = new jsPDF({ orientation: "landscape" });
        doc.setFontSize(18);
        doc.text("Financial Task List", 14, 22);
        doc.setFontSize(10);
        doc.setTextColor(100);
        const printDateTime = format(new Date(), "dd-MM-yyyy HH:mm:ss");
        doc.text(`Printed on: ${printDateTime}`, 14, 30);

        const head = [["Task ID", "Title", "Label", "Period", "Sender", "Receiver", "Assignee", "Status", "Initial Demand", "Official Payment", "Motivation"]];
        const body = filteredTasks.map(task => ([
            task.id,
            task.title,
            task.label || '',
            task.period || 'N/A',
            task.sender || 'N/A',
            task.receiver || 'N/A',
            task.assignee?.name || "Unassigned",
            task.status || "Pending",
            formatCurrency(task.initialDemand || 0, task.initialDemandCurrency),
            formatCurrency(task.officialSettlement || 0, task.officialSettlementCurrency),
            formatCurrency(task.motivation || 0, task.motivationCurrency),
        ]));

        autoTable(doc, {
            startY: 35,
            head: head,
            body: body,
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185], fontSize: 8, halign: 'center' },
            styles: { fontSize: 6.5, cellPadding: 1, overflow: 'linebreak', valign: 'middle' }, // Maximum compactness
            columnStyles: {
                0: { cellWidth: 15 }, // ID
                1: { cellWidth: 35 }, // Title
                2: { cellWidth: 15 }, // Label
                3: { cellWidth: 20 }, // Period
                4: { cellWidth: 25 }, // Sender
                5: { cellWidth: 25 }, // Receiver
                6: { cellWidth: 25 }, // Assignee
                7: { cellWidth: 20 }, // Status
                8: { halign: 'right', fontStyle: 'bold' }, // Initial Demand
                9: { halign: 'right', fontStyle: 'bold' }, // Official Payment
                10: { halign: 'right', fontStyle: 'bold' }, // Motivation
            },
            margin: { top: 30, left: 5, right: 5 } // Maximize printable width
        });

        // ✅ OPEN PDF
        const pdfBlob = doc.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);
        window.open(pdfUrl, '_blank');
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 p-4 md:p-8 w-full max-w-[1920px] mx-auto">
            <h1 className="text-2xl font-bold tracking-tight">Financials</h1>

            {/* STATS GRID */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Initial Demand</CardTitle>
                        <DollarSign className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent className="space-y-1">
                        {summaryCurrencies.map(currency => {
                            const val = formatCurrency(displaySummary[currency].totalInitialDemand, currency);
                            return (
                                displaySummary[currency].totalInitialDemand > 0 &&
                                <div key={currency} className={`${getDynamicFontSize(val)} font-bold overflow-x-auto whitespace-nowrap pb-1`} title={val}>
                                    {val}
                                </div>
                            );
                        })}
                        {summaryCurrencies.every(c => displaySummary[c].totalInitialDemand === 0) && <div className="text-2xl font-bold">$ 0.00</div>}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Official Payment</CardTitle>
                        <Banknote className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent className="space-y-1">
                        {summaryCurrencies.map(currency => {
                            const val = formatCurrency(displaySummary[currency].totalOfficialPayment, currency);
                            return (
                                displaySummary[currency].totalOfficialPayment > 0 &&
                                <div key={currency} className={`${getDynamicFontSize(val)} font-bold overflow-x-auto whitespace-nowrap pb-1`} title={val}>
                                    {val}
                                </div>
                            );
                        })}
                        {summaryCurrencies.every(c => displaySummary[c].totalOfficialPayment === 0) && <div className="text-2xl font-bold">$ 0.00</div>}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Motivation</CardTitle>
                        <Gift className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent className="space-y-1">
                        {summaryCurrencies.map(currency => {
                            const val = formatCurrency(displaySummary[currency].totalMotivation, currency);
                            return (
                                displaySummary[currency].totalMotivation > 0 &&
                                <div key={currency} className={`${getDynamicFontSize(val)} font-bold overflow-x-auto whitespace-nowrap pb-1`} title={val}>
                                    {val}
                                </div>
                            );
                        })}
                        {summaryCurrencies.every(c => displaySummary[c].totalMotivation === 0) && <div className="text-2xl font-bold">$ 0.00</div>}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Grand Total (Settled)</CardTitle>
                        <TrendingUp className="h-4 w-4 text-indigo-500" />
                    </CardHeader>
                    <CardContent className="space-y-1">
                        {summaryCurrencies.map(currency => {
                            const val = formatCurrency(displaySummary[currency].grandTotal, currency);
                            return (
                                displaySummary[currency].grandTotal > 0 &&
                                <div key={currency} className={`${getDynamicFontSize(val)} font-bold overflow-x-auto whitespace-nowrap pb-1`} title={val}>
                                    {val}
                                </div>
                            );
                        })}
                        {summaryCurrencies.every(c => displaySummary[c].grandTotal === 0) && <div className="text-2xl font-bold">$ 0.00</div>}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Financial Task List</CardTitle>
                    {/* TOOLBAR */}
                    <div className="flex items-center justify-between gap-4 pt-4">
                        <div className="flex flex-1 items-center gap-2">
                            <div className="relative flex-1 md:flex-none">
                                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search..."
                                    value={searchTerm}
                                    onChange={(event) => setSearchTerm(event.target.value)}
                                    className="h-9 w-full md:w-[250px] pl-8"
                                />
                            </div>

                        </div>


                        {/* DESKTOP ACTIONS (Hidden on Mobile) */}
                        <div className="hidden md:flex items-center gap-2">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={activeFilterCount > 0 ? "h-9 px-2 gap-1 border-dashed" : "h-9 w-9 p-0"}
                                    >
                                        <Filter className="h-4 w-4" />
                                        {activeFilterCount === 0 && <span className="sr-only">Filter</span>}
                                        {activeFilterCount > 0 && (
                                            <>
                                                <Separator orientation="vertical" className="mx-2 h-4" />
                                                <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                                                    {activeFilterCount}
                                                </Badge>
                                            </>
                                        )}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-[200px] max-h-96 overflow-y-auto">
                                    {renderFilterItems()}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {isFiltered && (
                                <Button variant="ghost" onClick={resetFilters} className="h-9 px-2 lg:px-3">
                                    Reset <X className="ml-2 h-4 w-4" />
                                </Button>
                            )}

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="icon" className="h-9 w-9">
                                        <MoreHorizontal className="h-4 w-4" />
                                        <span className="sr-only">More Actions</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={handlePrintPdf}>View (.pdf)</DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleExportCsv}>Export (.csv)</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        {/* MOBILE ACTIONS (Visible only on Mobile) */}
                        <div className="flex md:hidden items-center gap-2">
                            {isFiltered && (
                                <Button variant="ghost" onClick={resetFilters} size="sm" className="h-9 px-2">
                                    Reset <X className="ml-2 h-4 w-4" />
                                </Button>
                            )}

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="icon" className="h-9 w-9">
                                        <MoreHorizontal className="h-4 w-4" />
                                        <span className="sr-only">Actions</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-64">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuSeparator />

                                    <DropdownMenuItem onClick={handlePrintPdf}>
                                        <span>View (.pdf)</span>
                                    </DropdownMenuItem>

                                    <DropdownMenuItem onClick={handleExportCsv}>
                                        <span>Export (.csv)</span>
                                    </DropdownMenuItem>

                                    <DropdownMenuSeparator />
                                    <DropdownMenuLabel className="flex items-center">
                                        <Filter className="mr-2 h-4 w-4" />
                                        Filters
                                        {activeFilterCount > 0 && (
                                            <Badge variant="secondary" className="ml-auto text-xs h-5 px-1.5 min-w-[1.25rem] justify-center">
                                                {activeFilterCount}
                                            </Badge>
                                        )}
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />

                                    {/* INLINE FILTERS (Scrollable) */}
                                    <div className="max-h-[300px] overflow-y-auto">
                                        {renderFilterItems()}
                                    </div>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                </CardHeader >

                <CardContent className="p-0 sm:p-6">
                    <div className="overflow-x-auto">
                        <Table className="min-w-[1200px]">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Task ID</TableHead>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Label</TableHead>
                                    <TableHead>Period</TableHead>
                                    <TableHead>Sender</TableHead>
                                    <TableHead>Receiver</TableHead>
                                    <TableHead>Assignee</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Initial Demand</TableHead>
                                    <TableHead className="text-right">Official Payment</TableHead>
                                    <TableHead className="text-right">Motivation</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTasks.length > 0 ? (
                                    filteredTasks.map((task) => (
                                        <TableRow key={task.id}>
                                            <TableCell className="font-medium text-xs text-muted-foreground w-16 truncate" title={task.id}>{task.id}</TableCell>
                                            <TableCell>
                                                <Link href={`/tasks/${task.id}`} className="hover:underline font-medium block truncate max-w-[200px]">
                                                    {task.title}
                                                </Link>
                                            </TableCell>
                                            <TableCell>{task.label && <Badge variant="outline" className="whitespace-nowrap">{task.label}</Badge>}</TableCell>
                                            <TableCell className="whitespace-nowrap">{task.period || 'N/A'}</TableCell>
                                            <TableCell>{task.sender}</TableCell>
                                            <TableCell>{task.receiver}</TableCell>
                                            <TableCell>{task.assignee?.name || "Unassigned"}</TableCell>
                                            <TableCell><Badge variant={statusVariantMap[task.status]} className={`whitespace-nowrap ${statusClassMap[task.status]}`}>{task.status}</Badge></TableCell>

                                            <TableCell className="text-right whitespace-nowrap">{formatCurrency(Number(task.initialDemand || 0), task.initialDemandCurrency)}</TableCell>
                                            <TableCell className="text-right whitespace-nowrap">{formatCurrency(Number(task.officialSettlement || 0), task.officialSettlementCurrency)}</TableCell>
                                            <TableCell className="text-right whitespace-nowrap">{formatCurrency(Number(task.motivation || 0), task.motivationCurrency)}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={11} className="h-24 text-center">
                                            No financial tasks found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card >
        </div >
    );
}