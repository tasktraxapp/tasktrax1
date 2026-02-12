"use client";

import { ReactNode, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  CalendarIcon, UploadCloud, X, Loader2,
  ChevronLeft, ChevronRight, Check
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

// Date Fns
import {
  format, isValid, addMonths, subMonths,
  startOfMonth, getDaysInMonth, getDay, isSameDay, isBefore, startOfDay
} from "date-fns";

import { cn } from "@/lib/utils";
import type { Task, User } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area"; // ✅ Import ScrollArea
import { Badge } from "@/components/ui/badge"; // ✅ Import Badge for multi-select display

// DB Actions
import { addTask, updateTask, getNextTaskId, addActivity } from "@/lib/db/tasks";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

import { useAppSettings } from "@/hooks/use-settings";
import { useAuth } from "@/context/auth-context";
import { PermissionGuard } from "@/components/permission-guard";

// ==========================================
// 1. CUSTOM DATE PICKER
// ==========================================
function SimpleDatePicker({ selected, onSelect }: { selected?: Date, onSelect: (date: Date) => void }) {
  const [currentMonth, setCurrentMonth] = useState(selected || new Date());

  const handlePrev = (e: React.MouseEvent) => { e.preventDefault(); setCurrentMonth(subMonths(currentMonth, 1)); };
  const handleNext = (e: React.MouseEvent) => { e.preventDefault(); setCurrentMonth(addMonths(currentMonth, 1)); };

  const numDays = getDaysInMonth(currentMonth);
  const startOffset = getDay(startOfMonth(currentMonth));
  const days = Array.from({ length: numDays }, (_, i) => i + 1);

  return (
    <div className="p-3 w-[280px]">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold">{format(currentMonth, "MMMM yyyy")}</span>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handlePrev}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleNext}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <span key={d} className="text-[10px] text-muted-foreground font-bold">{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startOffset }).map((_, i) => <div key={`empty-${i}`} />)}
        {days.map(day => {
          const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
          const isSelected = selected && isSameDay(date, selected);
          return (
            <button
              key={day}
              onClick={(e) => { e.preventDefault(); onSelect(date); }}
              className={cn(
                "h-8 w-8 text-sm rounded-md flex items-center justify-center transition-colors hover:bg-muted",
                isSelected ? "bg-primary text-primary-foreground hover:bg-primary" : "text-foreground"
              )}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  );
}

// ✅ HELPER: Safely parse dates (Handles Firestore Timestamps & Strings)
const getValidDate = (input: any): Date | undefined => {
  if (!input) return undefined;

  let date: Date;

  // Check if it's a Firestore Timestamp object (has 'seconds')
  if (typeof input === 'object' && 'seconds' in input) {
    date = new Date(input.seconds * 1000);
  } else {
    // Fallback for ISO Strings or Date objects
    date = new Date(input);
  }

  return isValid(date) ? date : undefined;
};

interface FileState {
  name: string;
  url: string;
  size: number;
  type: string;
  rawFile?: File;
}

type PriorityType = "Low" | "Medium" | "High" | "Urgent";
type StatusType = "Pending" | "In Progress" | "Completed" | "To hold" | "Overdue";

export function AddTaskSheet({ children, task, open, onOpenChange }: { children?: ReactNode, task?: Task, open?: boolean, onOpenChange?: (open: boolean) => void }) {
  const isEditMode = !!task;
  const isControlled = open !== undefined;
  const { toast } = useToast();
  const router = useRouter();

  const { settings } = useAppSettings();
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [internalOpen, setInternalOpen] = useState(false);
  const finalOpen = isControlled ? open : internalOpen;
  const setFinalOpen = isControlled ? onOpenChange : setInternalOpen;
  const [isLoading, setIsLoading] = useState(false);

  // States
  const [customTaskId, setCustomTaskId] = useState(task?.id || '...');
  const [label, setLabel] = useState(task?.label || '');
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');

  const [priority, setPriority] = useState<PriorityType>((task?.priority as PriorityType) || 'Medium');
  const [status, setStatus] = useState<StatusType>((task?.status as StatusType) || 'Pending');

  const [assigneeId, setAssigneeId] = useState(task?.assignee?.id || '');
  const [viewers, setViewers] = useState<User[]>(task?.viewers || []);
  // ✅ Department is now a string array for multi-select
  const [department, setDepartment] = useState<string[]>(
    Array.isArray(task?.department)
      ? task?.department
      : (task?.department ? [task.department as unknown as string] : [])
  );

  // Dates (Using the robust getValidDate)
  const [dueDate, setDueDate] = useState<Date | undefined>(isEditMode ? getValidDate(task?.dueDate) : new Date());
  const [receivedDate, setReceivedDate] = useState<Date | undefined>(getValidDate(task?.receivedDate) || new Date()); // Default to today
  const [entryDate, setEntryDate] = useState<Date | undefined>(isEditMode ? getValidDate(task?.entryDate) : new Date());

  // Financials
  const [initialDemand, setInitialDemand] = useState(task?.initialDemand || '');
  const [officialSettlement, setOfficialSettlement] = useState(task?.officialSettlement || '');
  const [motivation, setMotivation] = useState(task?.motivation || '');
  const [initialDemandCurrency, setInitialDemandCurrency] = useState(task?.initialDemandCurrency || 'USD');
  const [officialSettlementCurrency, setOfficialSettlementCurrency] = useState(task?.officialSettlementCurrency || 'USD');
  const [motivationCurrency, setMotivationCurrency] = useState(task?.motivationCurrency || 'USD');

  const [files, setFiles] = useState<FileState[]>(
    (task?.files || []).map((f: any) => ({
      name: f.name,
      url: f.url,
      size: Number(f.size) || 0,
      type: f.type || 'FILE'
    }))
  );

  const [sender, setSender] = useState(task?.sender || '');
  const [senderLocation, setSenderLocation] = useState(task?.senderLocation || '');
  const [receiver, setReceiver] = useState(task?.receiver || '');
  const [receiverLocation, setReceiverLocation] = useState(task?.receiverLocation || '');
  const [period, setPeriod] = useState(task?.period || '');

  // Controlled Popover States
  const [departmentOpen, setDepartmentOpen] = useState(false);
  const [viewersOpen, setViewersOpen] = useState(false);

  // Custom Fields
  const currencies = settings?.customFields?.['Currency'] || ["USD", "EUR", "GBP", "JPY"];
  const priorityOptions = settings?.customFields?.['Priority'] || ['Medium', 'High', 'Low', 'Urgent'];
  const statusOptions = settings?.customFields?.['Status'] || ['Pending', 'In Progress', 'Completed', 'To hold', 'Overdue'];
  const labelOptions = settings?.customFields?.['Label'] || [];
  const departmentOptions = settings?.customFields?.['Department'] || [];
  const locationOptions = settings?.customFields?.['Location'] || [];
  const senderLocOptions = settings?.customFields?.['Sender Location'] || locationOptions;
  const receiverLocOptions = settings?.customFields?.['Receiver Location'] || locationOptions;
  const receiverOptions = settings?.customFields?.['Receiver'] || [];

  // Realtime Users
  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("name"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const realtimeUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as User[];
      setUsers(realtimeUsers);
      if (!task && realtimeUsers.length > 0 && !assigneeId) setAssigneeId(realtimeUsers[0].id);
      setUsersLoading(false);
    });
    return () => unsubscribe();
  }, [task]);

  // ID Generation & State Sync
  useEffect(() => {
    const fetchId = async () => {
      if (!task && finalOpen) {
        setCustomTaskId("Generating...");
        try {
          const nextId = await getNextTaskId();
          setCustomTaskId(nextId);
        } catch (error) {
          setCustomTaskId("T-Error");
        }
      }
    };
    if (task && finalOpen) {
      setTitle(task.title);
      setDescription(task.description || '');
      setLabel(task.label || '');
      setCustomTaskId(task.id);
      setPriority((task.priority as PriorityType) || 'Medium');
      setStatus((task.status as StatusType) || 'Pending');
      setAssigneeId(task.assignee?.id || '');
      setViewers(task.viewers || []);
      // ✅ Handle legacy string vs new array for department
      setDepartment(
        Array.isArray(task.department)
          ? task.department
          : (task.department ? [task.department as unknown as string] : [])
      );
      // ✅ Use robust date parser
      setDueDate(getValidDate(task.dueDate));
      setReceivedDate(getValidDate(task.receivedDate));
      setEntryDate(getValidDate(task.entryDate));

      setInitialDemand(task.initialDemand || '');
      setOfficialSettlement(task.officialSettlement || '');
      setMotivation(task.motivation || '');
      setInitialDemandCurrency(task.initialDemandCurrency || 'USD');
      setOfficialSettlementCurrency(task.officialSettlementCurrency || 'USD');
      setMotivationCurrency(task.motivationCurrency || 'USD');

      setFiles((task.files || []).map((f: any) => ({
        name: f.name,
        url: f.url,
        size: Number(f.size) || 0,
        type: f.type || 'FILE'
      })));

      setSender(task.sender || '');
      setSenderLocation(task.senderLocation || '');
      setReceiver(task.receiver || '');
      setReceiverLocation(task.receiverLocation || '');
      setPeriod(task.period || '');
    } else if (!task && finalOpen) {
      setTitle('');
      setDescription('');
      setLabel('');
      setStatus('Pending');
      setDepartment([]);
      setSenderLocation('');
      setReceiverLocation('');
      setDueDate(new Date());
      setEntryDate(new Date());
      setReceivedDate(new Date()); // Default to today for new tasks
      setViewers([]);
      setFiles([]);
      fetchId();
    }
  }, [task, finalOpen]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(event.target.files || []);
    if (newFiles.length > 0) {
      const preparedFiles: FileState[] = newFiles.map(file => ({
        name: file.name,
        url: URL.createObjectURL(file),
        size: file.size,
        type: file.name.split('.').pop()?.toUpperCase() || 'FILE',
        rawFile: file
      }));
      setFiles(currentFiles => [...currentFiles, ...preparedFiles]);
    }
  };

  const handleRemoveFile = (fileName: string) => {
    setFiles(currentFiles => currentFiles.filter(f => f.name !== fileName));
  };

  const handleSubmit = async () => {
    if (!title) {
      toast({ title: "Title required", description: "Please enter a task title.", variant: "destructive" });
      return;
    }
    if (!currentUser) {
      toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }

    // ✅ Validate Dates: Posted On (entryDate) cannot be before Received Date (receivedDate)
    if (entryDate && receivedDate && isBefore(startOfDay(entryDate), startOfDay(receivedDate))) {
      toast({ title: "Invalid Date", description: "Posted On date cannot be before Received Date.", variant: "destructive" });
      return;
    }

    setIsLoading(true);

    try {
      const assignedUser = users.find(u => u.id === assigneeId) || users[0];

      // Upload Files
      const uploadedFiles = await Promise.all(files.map(async (fileData) => {
        if (fileData.rawFile) {
          try {
            const fileRef = ref(storage, `uploads/${Date.now()}_${fileData.name}`);
            await uploadBytes(fileRef, fileData.rawFile);
            const downloadUrl = await getDownloadURL(fileRef);
            return { name: fileData.name, url: downloadUrl, size: fileData.size, type: fileData.type };
          } catch (error) {
            console.error("Upload failed", error);
            throw new Error(`Failed to upload ${fileData.name}`);
          }
        }
        return { name: fileData.name, url: fileData.url, size: fileData.size, type: fileData.type };
      }));

      const payload: Partial<Task> = {
        title,
        description,
        label,
        priority,
        status,
        assignee: assignedUser,
        department,
        // ✅ Store dates as ISO strings (standard format)
        dueDate: dueDate ? dueDate.toISOString() : undefined,
        receivedDate: receivedDate ? receivedDate.toISOString() : undefined,
        entryDate: entryDate ? entryDate.toISOString() : undefined,
        files: uploadedFiles,
        sender,
        senderLocation,
        receiver,
        receiverLocation,
        period,
        initialDemand: Number(initialDemand) || 0,
        initialDemandCurrency,
        officialSettlement: Number(officialSettlement) || 0,
        officialSettlementCurrency,
        motivation: Number(motivation) || 0,
        motivationCurrency,

        // ✅ NEW: Visibility
        viewers,
        creatorId: currentUser.id,
      };

      if (isEditMode && task) {
        await updateTask(task.id, payload, currentUser);

        // Log changes
        if (task.assignee?.id !== assignedUser.id) {
          await addActivity(task.id, {
            id: `act-${Date.now()}-assign`,
            user: currentUser,
            action: "assigned to",
            details: assignedUser.name,
            timestamp: new Date().toISOString()
          });
        }
        if (task.status !== status) {
          await addActivity(task.id, {
            id: `act-${Date.now()}-status`,
            user: currentUser,
            action: "changed status to",
            details: status,
            timestamp: new Date().toISOString()
          });
        }
        toast({ title: "Task updated", description: "Changes saved successfully." });
      } else {
        const createPayload = {
          ...payload,
          activity: [
            { id: `act-${Date.now()}-create`, user: currentUser, action: "created task", timestamp: new Date().toISOString() },
            { id: `act-${Date.now()}-assign`, user: currentUser, action: "assigned to", details: assignedUser.name, timestamp: new Date().toISOString() }
          ]
        };
        await addTask(createPayload as Task, customTaskId);
        toast({ title: "Task created", description: `Task ${customTaskId} added successfully.` });
      }

      if (setFinalOpen) setFinalOpen(false);
      router.refresh();

    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to save task.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet open={finalOpen} onOpenChange={setFinalOpen}>
      {!isControlled && <SheetTrigger asChild>{children}</SheetTrigger>}
      <SheetContent className="sm:max-w-2xl w-full p-0 flex flex-col h-full">
        <SheetHeader className="p-6 border-b">
          <SheetTitle>{isEditMode ? 'Edit Task' : 'Add New Task'}</SheetTitle>
          <SheetDescription>
            {isEditMode ? 'Update the details for this task.' : 'Fill in the details below to create a new task.'}
          </SheetDescription>
        </SheetHeader>

        {/* ✅ MOBILE OPTIMIZED CONTAINER */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-24">

          {/* 1. TASK ID */}
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
            <Label htmlFor="task-id" className="text-left sm:text-right font-semibold text-muted-foreground">Task ID</Label>
            <Input id="task-id" className="col-span-1 sm:col-span-3 bg-muted font-mono font-bold" value={customTaskId} readOnly disabled />
          </div>

          {/* 2. TITLE */}
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
            <Label htmlFor="title" className="text-left sm:text-right">Title <span className="text-red-500">*</span></Label>
            <Input id="title" className="col-span-1 sm:col-span-3" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Website Redesign" />
          </div>

          {/* 3. DESCRIPTION */}
          <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-2 sm:gap-4">
            <Label htmlFor="description" className="text-left sm:text-right pt-2">Description</Label>
            <Textarea id="description" className="col-span-1 sm:col-span-3 min-h-[100px]" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          {/* 4. DETAILS (Label, Priority, Status, Assignee, Dept) */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest border-b pb-1 mb-3">Details</h4>

            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
              <Label htmlFor="label" className="text-left sm:text-right">Label</Label>
              <div className="col-span-1 sm:col-span-3">
                <Select value={label} onValueChange={setLabel}>
                  <SelectTrigger><SelectValue placeholder="Select Label" /></SelectTrigger>
                  <SelectContent>{labelOptions.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
              <Label htmlFor="priority" className="text-left sm:text-right">Priority</Label>
              <Select value={priority} onValueChange={(value) => setPriority(value as PriorityType)}>
                <SelectTrigger className="col-span-1 sm:col-span-3"><SelectValue placeholder="Select priority" /></SelectTrigger>
                <SelectContent>{priorityOptions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
              <Label htmlFor="status" className="text-left sm:text-right">Status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as StatusType)}>
                <SelectTrigger className="col-span-1 sm:col-span-3"><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>{statusOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* ✅ DEPARTMENT MULTI-SELECT */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-2 sm:gap-4">
              <Label className="text-left sm:text-right pt-2">Department</Label>
              <div className="col-span-1 sm:col-span-3">
                <Popover open={departmentOpen} onOpenChange={setDepartmentOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between font-normal h-auto min-h-[40px] py-2">
                      {department.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {department.map(d => (
                            <Badge key={d} variant="secondary" className="mr-1">{d}</Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Select Departments...</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <div className="p-2 border-b flex items-center justify-between">
                      <p className="font-semibold text-sm">Select Departments</p>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setDepartmentOpen(false)} title="Close">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {/* ✅ SCROLL FIX: Native Scroll for better UX */}
                    <div className="max-h-[300px] overflow-y-auto">
                      <div className="p-2 space-y-2">
                        {departmentOptions.length > 0 ? departmentOptions.map(dept => {
                          const isSelected = department.includes(dept);
                          return (
                            <div key={dept}
                              className="flex items-center space-x-2 p-2 hover:bg-muted rounded-md cursor-pointer"
                              onClick={() => {
                                if (isSelected) setDepartment(prev => prev.filter(d => d !== dept));
                                else setDepartment(prev => [...prev, dept]);
                              }}
                            >
                              <Checkbox checked={isSelected} id={`dept-${dept}`} />
                              <label htmlFor={`dept-${dept}`} className="text-sm cursor-pointer flex-1">{dept}</label>
                            </div>
                          )
                        }) : <p className="text-sm text-muted-foreground p-2">No departments found in settings.</p>}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
              <Label htmlFor="assignee" className="text-left sm:text-right">Assignee</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId} disabled={usersLoading}>
                <SelectTrigger className="col-span-1 sm:col-span-3"><SelectValue placeholder={usersLoading ? "Loading users..." : "Select assignee"} /></SelectTrigger>
                <SelectContent>{users.map(user => <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* ✅ VIEWERS MULTI-SELECT WITH SCROLL FIX */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-2 sm:gap-4">
              <Label className="text-left sm:text-right pt-2">Viewers</Label>
              <div className="col-span-1 sm:col-span-3">
                <Popover open={viewersOpen} onOpenChange={setViewersOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between font-normal h-auto min-h-[40px] py-2">
                      {viewers.length > 0
                        ? <div className="flex flex-wrap gap-1">
                          {viewers.map(u => <Badge key={u.id} variant="outline">{u.name}</Badge>)}
                        </div>
                        : <span className="text-muted-foreground">Select Viewers...</span>
                      }
                      <span className="ml-2 bg-muted-foreground/20 text-xs px-2 py-0.5 rounded-full whitespace-nowrap">{viewers.length}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <div className="p-2 border-b flex items-center justify-between">
                      <p className="font-semibold text-sm">Select Viewers</p>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs px-2"
                          onClick={() => {
                            if (viewers.length === users.length) setViewers([]);
                            else setViewers([...users]);
                          }}
                        >
                          {viewers.length === users.length ? "Clear" : "Select All"}
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setViewersOpen(false)} title="Close">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {/* ✅ SCROLL FIX: Native Scroll for better UX */}
                    <div className="max-h-[300px] overflow-y-auto">
                      <div className="p-2 space-y-2">
                        {users.map(user => {
                          const isSelected = viewers.some(v => v.id === user.id);
                          return (
                            <div key={user.id}
                              className="flex items-center space-x-2 p-2 hover:bg-muted rounded-md cursor-pointer"
                              onClick={() => {
                                if (isSelected) setViewers(prev => prev.filter(v => v.id !== user.id));
                                else setViewers(prev => [...prev, user]);
                              }}
                            >
                              <Checkbox checked={isSelected} id={`viewer-${user.id}`} />
                              <label htmlFor={`viewer-${user.id}`} className="text-sm cursor-pointer flex-1">{user.name}</label>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* 5. LOGISTICS (Sender/Receiver/Period) */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest border-b pb-1 mb-3">Logistics</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Sender Name</Label>
                <Input placeholder="Who sent this?" value={sender} onChange={e => setSender(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Sender Location</Label>
                <Select value={senderLocation} onValueChange={setSenderLocation}>
                  <SelectTrigger><SelectValue placeholder="Select Location" /></SelectTrigger>
                  <SelectContent>{senderLocOptions.length > 0 ? senderLocOptions.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>) : <SelectItem value="none" disabled>Add 'Sender Location' in Settings</SelectItem>}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Receiver Name</Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Select value={receiver} onValueChange={setReceiver}>
                      <SelectTrigger><SelectValue placeholder="Select Receiver" /></SelectTrigger>
                      <SelectContent>
                        {receiverOptions.length > 0 ? (
                          receiverOptions.map((r: string) => <SelectItem key={r} value={r}>{r}</SelectItem>)
                        ) : (
                          <SelectItem value="none" disabled>Add 'Receiver' in Settings</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Receiver Location</Label>
                <Select value={receiverLocation} onValueChange={setReceiverLocation}>
                  <SelectTrigger><SelectValue placeholder="Select Location" /></SelectTrigger>
                  <SelectContent>{receiverLocOptions.length > 0 ? receiverLocOptions.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>) : <SelectItem value="none" disabled>Add 'Receiver Location' in Settings</SelectItem>}</SelectContent>
                </Select>
              </div>
            </div>

            {/* ✅ PERIOD FIELD */}
            <div className="grid grid-cols-1 gap-2">
              <Label>Period</Label>
              <Input placeholder="e.g. Q3 2024" value={period} onChange={e => setPeriod(e.target.value)} />
            </div>
          </div>

          {/* 6. DATES */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label>Received Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !receivedDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />{receivedDate && isValid(receivedDate) ? format(receivedDate, "dd-MM-yyyy") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start"><SimpleDatePicker selected={receivedDate} onSelect={setReceivedDate} /></PopoverContent>
              </Popover>
            </div>

            <div className="grid gap-2">
              <Label>Posted On</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !entryDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />{entryDate && isValid(entryDate) ? format(entryDate, "dd-MM-yyyy") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start"><SimpleDatePicker selected={entryDate} onSelect={setEntryDate} /></PopoverContent>
              </Popover>
            </div>

            <div className="grid gap-2">
              <Label className="text-red-500 font-semibold">Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal border-red-200 hover:border-red-400 hover:bg-red-50", !dueDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4 text-red-500" />{dueDate && isValid(dueDate) ? <span className="text-red-600 font-semibold">{format(dueDate, "dd-MM-yyyy")}</span> : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start"><SimpleDatePicker selected={dueDate} onSelect={setDueDate} /></PopoverContent>
              </Popover>
            </div>
          </div>

          {/* 7. FINANCIALS */}
          <div className="grid grid-cols-1 gap-4 rounded-lg border p-4 bg-muted/10">
            <h3 className="text-base font-semibold flex items-center gap-2">Financials</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid grid-cols-[1fr_100px] gap-2">
                <div className="grid gap-1.5"><Label className="text-xs text-muted-foreground">Initial Demand</Label><Input type="number" placeholder="0.00" value={initialDemand} onChange={e => setInitialDemand(e.target.value)} className="font-mono" /></div>
                <div className="grid gap-1.5"><Label className="text-xs text-muted-foreground">Currency</Label><Select value={initialDemandCurrency} onValueChange={setInitialDemandCurrency}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{currencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <div className="grid grid-cols-[1fr_100px] gap-2">
                <div className="grid gap-1.5"><Label className="text-xs text-muted-foreground">Official Settlement</Label><Input type="number" placeholder="0.00" value={officialSettlement} onChange={e => setOfficialSettlement(e.target.value)} className="font-mono" /></div>
                <div className="grid gap-1.5"><Label className="text-xs text-muted-foreground">Currency</Label><Select value={officialSettlementCurrency} onValueChange={setOfficialSettlementCurrency}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{currencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
              </div>
            </div>

            <PermissionGuard requiredPermission="View Financials">
              <div className="grid grid-cols-[1fr_100px] gap-2">
                <div className="grid gap-1.5"><Label className="text-xs text-muted-foreground">Motivation</Label><Input type="number" placeholder="0.00" value={motivation} onChange={e => setMotivation(e.target.value)} className="font-mono text-black dark:text-white font-medium" /></div>
                <div className="grid gap-1.5"><Label className="text-xs text-muted-foreground">Currency</Label><Select value={motivationCurrency} onValueChange={setMotivationCurrency}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{currencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
              </div>
            </PermissionGuard>
          </div>

          {/* 8. FILES */}
          <div className="grid grid-cols-1 gap-2">
            <Label>Attachments</Label>
            <div className="border-2 border-dashed border-muted-foreground/50 rounded-lg p-6 text-center hover:bg-muted/50 cursor-pointer transition-colors">
              <label htmlFor="file-upload-sheet" className="w-full flex flex-col items-center justify-center cursor-pointer">
                <UploadCloud className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-sm font-medium text-muted-foreground">Click to upload files</p>
                <p className="text-xs text-muted-foreground/70">SVG, PNG, JPG or PDF</p>
                <input id="file-upload-sheet" type="file" multiple className="hidden" onChange={handleFileChange} />
              </label>
            </div>
            {files.length > 0 && (
              <div className="mt-2 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Attached ({files.length})</p>
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between text-sm p-3 bg-muted/50 rounded-md border">
                    <span className="truncate max-w-[200px]">{file.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{(file.size ? (file.size / 1024 / 1024).toFixed(2) : '0.00')} MB</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => handleRemoveFile(file.name)}><X className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* 9. STICKY FOOTER */}
        <SheetFooter className="p-4 border-t bg-background sticky bottom-0 z-50 flex flex-col sm:flex-row gap-2">
          <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setFinalOpen && setFinalOpen(false)}>Cancel</Button>
          <Button type="submit" onClick={handleSubmit} disabled={isLoading} className="w-full sm:w-auto">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? 'Save Changes' : 'Create Task'}
          </Button>
        </SheetFooter>
      </SheetContent >
    </Sheet >
  );
}