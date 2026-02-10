"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Download, Eye, MoreHorizontal, Printer, FileText, FolderArchive, FileType2, Loader2 } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { format, isValid, parseISO } from "date-fns";
import { useRealtimeTasks } from "@/hooks/use-tasks";
import { useToast } from "@/hooks/use-toast";

// 🛠️ Helper to format bytes
const formatBytes = (bytes: number, decimals = 2) => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

// 🛠️ Helper to parse dates
const safeParseDate = (input: any): Date | undefined => {
    if (!input) return undefined;
    if (input instanceof Date) return input;
    if (typeof input === 'object' && 'seconds' in input) return new Date(input.seconds * 1000);
    if (typeof input === 'string') {
        const d = parseISO(input);
        if (isValid(d)) return d;
        const d2 = new Date(input);
        return isValid(d2) ? d2 : undefined;
    }
    return undefined;
};

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

export default function DocumentsPage() {
    const { toast } = useToast();
    const { tasks, loading } = useRealtimeTasks();

    const handleDownload = async (url: string, filename: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
            toast({ title: "Download Started", description: filename });
        } catch (error) {
            console.error("Download failed:", error);
            window.open(url, '_blank');
            toast({ title: "Download Error", description: "Opening in new tab instead.", variant: "destructive" });
        }
    };

    const handlePrint = async (url: string, type: string) => {
        // If it's an image or PDF, we can try to print it via iframe
        // Types often come as 'IMAGE/PNG' or just 'PNG' or 'PDF'
        const t = (type || '').toUpperCase();
        if (t.includes('IMAGE') || t.includes('PDF') || t.endsWith('PNG') || t.endsWith('JPG') || t.endsWith('JPEG')) {
            try {
                const response = await fetch(url);
                const blob = await response.blob();
                const blobUrl = window.URL.createObjectURL(blob);

                const iframe = document.getElementById('print_frame') as HTMLIFrameElement;
                if (iframe) {
                    iframe.src = blobUrl;
                    iframe.onload = () => {
                        iframe.contentWindow?.print();
                    };
                } else {
                    window.open(blobUrl, '_blank');
                }
            } catch (e) {
                window.open(url, '_blank');
            }
        } else {
            // For other types, just open
            window.open(url, '_blank');
        }
    };

    const { tasksWithDocuments, totalDocuments, documentTypes, totalSizeBytes } = useMemo(() => {
        if (loading) return { tasksWithDocuments: [], totalDocuments: 0, documentTypes: {}, totalSizeBytes: 0 };

        const flatDocuments = tasks.flatMap(task =>
            (task.files || []).map((file: any, index: number) => {
                let dateSource = file.uploadedAt || task.receivedDate || task.entryDate || task.createdAt || new Date();
                return {
                    id: `${task.id}-${index}`,
                    name: file.name,
                    url: file.url,
                    taskId: task.id,
                    uploadDate: dateSource,
                    fileType: file.type || file.name.split('.').pop()?.toUpperCase() || 'FILE',
                    fileSize: file.size || 0
                };
            })
        );

        const mappedTasks = tasks
            .map(task => ({
                ...task,
                documents: flatDocuments.filter(doc => doc.taskId === task.id)
            }))
            .filter(task => task.documents.length > 0);

        const totalDocs = flatDocuments.length;

        const types = flatDocuments.reduce((acc, doc) => {
            acc[doc.fileType] = (acc[doc.fileType] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const size = flatDocuments.reduce((acc, doc) => acc + (doc.fileSize || 0), 0);

        return {
            tasksWithDocuments: mappedTasks,
            totalDocuments: totalDocs,
            documentTypes: types,
            totalSizeBytes: size
        };
    }, [tasks, loading]);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 p-4 md:p-8 w-full max-w-[1920px] mx-auto">
            <h1 className="text-2xl font-bold tracking-tight">Documents</h1>

            <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
                        <FileText className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalDocuments}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Size</CardTitle>
                        <FolderArchive className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatBytes(totalSizeBytes)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Document Types</CardTitle>
                        <FileType2 className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2 pt-2">
                            {Object.entries(documentTypes).map(([type, count]) => (
                                <Badge key={type} variant="secondary">{`${type}: ${count}`}</Badge>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Document Library</CardTitle>
                    <CardDescription>
                        All documents are grouped by their associated task.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0 sm:p-6">
                    <Accordion type="single" collapsible className="w-full">
                        {tasksWithDocuments.map((task) => (
                            <AccordionItem key={task.id} value={task.id}>
                                <AccordionTrigger className="hover:no-underline px-4 py-3">
                                    <div className="flex flex-col sm:grid sm:grid-cols-3 items-start sm:items-center w-full text-left gap-2 sm:gap-0">
                                        <div className="flex items-center gap-3 w-full sm:w-auto overflow-hidden">
                                            <Badge variant="outline" className="font-mono text-xs shrink-0">
                                                {task.id}
                                            </Badge>
                                            <span className="font-medium truncate flex-1">{task.title}</span>
                                        </div>

                                        <div className="flex w-full sm:justify-center items-center gap-3 sm:gap-0">
                                            <Badge variant={statusVariantMap[task.status]} className={statusClassMap[task.status]}>
                                                {task.status}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground sm:hidden">
                                                • {task.documents.length} file(s)
                                            </span>
                                        </div>

                                        <div className="hidden sm:flex justify-end text-sm text-muted-foreground">
                                            {task.documents.length} document(s)
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-0 sm:px-4 pb-4">
                                    <div className="border rounded-md overflow-x-auto">
                                        <Table className="min-w-[600px]">
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Document Name</TableHead>
                                                    <TableHead>Date</TableHead>
                                                    <TableHead>Type</TableHead>
                                                    <TableHead>Size</TableHead>
                                                    <TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {task.documents.map((doc) => {
                                                    const dateObj = safeParseDate(doc.uploadDate);
                                                    const displayDate = dateObj ? format(dateObj, "dd-MM-yyyy") : "N/A";

                                                    return (
                                                        <TableRow key={doc.id}>
                                                            <TableCell className="font-medium max-w-[200px] truncate" title={doc.name}>
                                                                {doc.name}
                                                            </TableCell>
                                                            <TableCell>{displayDate}</TableCell>
                                                            <TableCell>{doc.fileType}</TableCell>
                                                            <TableCell>{formatBytes(doc.fileSize)}</TableCell>
                                                            <TableCell className="text-right">
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                            <MoreHorizontal className="h-4 w-4" />
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end">
                                                                        <DropdownMenuItem onClick={() => window.open(doc.url, "_blank")}>
                                                                            View
                                                                        </DropdownMenuItem>

                                                                        <DropdownMenuItem onClick={() => handlePrint(doc.url, doc.fileType)}>
                                                                            Print
                                                                        </DropdownMenuItem>

                                                                        <DropdownMenuSeparator />

                                                                        <DropdownMenuItem onClick={() => handleDownload(doc.url, doc.name)}>
                                                                            Download
                                                                        </DropdownMenuItem>
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            </TableCell>
                                                        </TableRow>
                                                    )
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                    {tasksWithDocuments.length === 0 && (
                        <div className="text-center text-muted-foreground p-8">
                            No documents found.
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Hidden iframe for printing */}
            <iframe id="print_frame" className="hidden" />
        </div>
    );
}