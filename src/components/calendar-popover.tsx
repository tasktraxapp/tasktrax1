"use client";

import * as React from "react";
import Link from "next/link";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { format, parseISO, isToday, startOfMonth, getDay, getDaysInMonth, isValid, addMonths, subMonths } from "date-fns";
import { collection, query, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Task } from "@/lib/types";

// Date Parser
const getDateKey = (input: any): string | null => {
  if (!input) return null;
  let date: Date | undefined;
  if (typeof input === 'object' && 'seconds' in input) date = new Date(input.seconds * 1000);
  else if (typeof input === 'string') date = parseISO(input);
  else if (input instanceof Date) date = input;

  return (date && isValid(date)) ? format(date, 'yyyy-MM-dd') : null;
};

const priorityConfig: Record<string, { color: string; weight: number; label: string }> = {
  Urgent: { color: "bg-red-600", weight: 4, label: "Urgent" },
  High:   { color: "bg-red-600", weight: 3, label: "High" },
  Medium: { color: "bg-blue-500", weight: 2, label: "Medium" },
  Low:    { color: "bg-emerald-500", weight: 1, label: "Low" },
};

const defaultPriority = { color: "bg-slate-400", weight: 0 };

export function NavCalendar() {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen) return;
    const q = query(collection(db, "tasks"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTasks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Task[];
      setTasks(fetchedTasks);
    }, (error) => console.error("Calendar Error:", error));
    return () => unsubscribe();
  }, [isOpen]);

  const handlePrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));
  const handleJumpToToday = () => setCurrentMonth(new Date());

  const numDays = getDaysInMonth(currentMonth);
  const startOffset = getDay(startOfMonth(currentMonth)); 
  const days = Array.from({ length: numDays }, (_, i) => i + 1);
  const monthLabel = format(currentMonth, 'MMMM yyyy');
  const todayButtonLabel = format(new Date(), 'EEE, MMM do');

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {/* ✅ MOBILE OPTIMIZED TRIGGER: Icon only on small screens, Text on md+ */}
        <Button 
          variant="outline" 
          size="sm"
          className="flex items-center gap-2 h-9 bg-background/50 hover:bg-muted px-2 md:px-3 text-muted-foreground hover:text-foreground transition-colors border-input"
        >
          <CalendarIcon className="h-4 w-4" />
          <span className="hidden md:inline">{todayButtonLabel}</span>
        </Button>
      </PopoverTrigger>
      
      {/* ✅ MOBILE OPTIMIZED POPOVER: Fits narrow screens (w-[300px]) */}
      <PopoverContent className="w-[300px] sm:w-[340px] p-0 rounded-xl shadow-xl border-border overflow-hidden" align="end">
        <div className="p-3 sm:p-4 bg-white dark:bg-zinc-950">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-sm text-foreground">{monthLabel}</h4>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md" onClick={handlePrevMonth}>
                <ChevronLeft size={14}/>
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md" onClick={handleNextMonth}>
                <ChevronRight size={14}/>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['Su','Mo','Tu','We','Th','Fr','Sa'].map((d) => (
              <span key={d} className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                {d}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startOffset }).map((_, i) => (
              <div key={`empty-${i}`} className="h-9 w-9 sm:h-10 sm:w-10" />
            ))}

            {days.map((day) => {
              const cellDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
              const cellDateKey = format(cellDate, 'yyyy-MM-dd');
              
              const dayTasks = tasks.filter(t => getDateKey(t.dueDate) === cellDateKey);

              // Sort for dots visualization
              const sortedTasks = dayTasks.sort((a, b) => {
                  const weightA = priorityConfig[a.priority]?.weight || 0;
                  const weightB = priorityConfig[b.priority]?.weight || 0;
                  return weightB - weightA;
              });

              const hasTasks = dayTasks.length > 0;
              const isTodayDate = isToday(cellDate);

              const DayCellContent = (
                <div className={cn(
                  "h-9 w-9 sm:h-10 sm:w-10 flex flex-col items-center justify-start pt-1.5 rounded-md text-sm cursor-pointer transition-all relative select-none",
                  isTodayDate 
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold shadow-md" 
                    : "text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800"
                )}>
                  <span className="leading-none text-xs sm:text-sm">{day}</span>
                  {hasTasks && (
                    <div className="absolute bottom-1.5 flex gap-[2px] sm:gap-[3px] justify-center items-center w-full px-1 z-10 pointer-events-none">
                      {sortedTasks.slice(0, 4).map((task, idx) => (
                        <div 
                          key={`${day}-${task.id}-${idx}`} 
                          className={cn(
                            "h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full shrink-0 shadow-sm", 
                            priorityConfig[task.priority]?.color || defaultPriority.color,
                            isTodayDate ? "ring-[1px] ring-white dark:ring-zinc-900" : ""
                          )} 
                        />
                      ))}
                    </div>
                  )}
                </div>
              );

              if (hasTasks) {
                return (
                  <HoverCard key={day} openDelay={0} closeDelay={0}>
                    <HoverCardTrigger asChild>{DayCellContent}</HoverCardTrigger>
                    {/* ✅ UPDATED: Scrollable list of ALL tasks for the day */}
                    <HoverCardContent side="top" className="w-64 sm:w-72 p-0 rounded-lg shadow-xl border-border z-50 overflow-hidden bg-popover text-popover-foreground">
                       <div className="bg-muted/50 px-3 py-2 border-b flex justify-between items-center">
                          <span className="text-xs font-semibold">{format(cellDate, 'MMM do')}</span>
                          <Badge variant="outline" className="text-[10px] h-4 px-1">{dayTasks.length} Task{dayTasks.length > 1 ? 's' : ''}</Badge>
                       </div>
                       
                       <div className="p-2 flex flex-col gap-1 max-h-[200px] overflow-y-auto custom-scrollbar">
                          {sortedTasks.map((task) => (
                            <Link 
                                key={task.id}
                                href={`/tasks/${task.id}`}
                                className="group flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
                            >
                                {/* Priority Dot */}
                                <div className={cn("h-2 w-2 rounded-full shrink-0", priorityConfig[task.priority]?.color || defaultPriority.color)} />
                                
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium truncate group-hover:text-blue-600 transition-colors">
                                            {task.title}
                                        </p>
                                        <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground truncate">
                                        {task.description || "No description"}
                                    </p>
                                </div>
                            </Link>
                          ))}
                       </div>
                    </HoverCardContent>
                  </HoverCard>
                );
              }

              return <div key={day}>{DayCellContent}</div>;
            })}
          </div>
          
          <Separator className="my-3"/>
          
          <div className="flex flex-col gap-2 px-1">
             <div className="flex justify-between items-center">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Legend</span>
                <Button variant="ghost" size="sm" className="h-5 text-[10px] px-2 text-muted-foreground hover:text-foreground p-0" onClick={handleJumpToToday}>
                    Jump to Today
                </Button>
             </div>
             
             <div className="grid grid-cols-2 gap-y-1 gap-x-2">
                {Object.values(priorityConfig).map((conf) => (
                    <div key={conf.label} className="flex items-center gap-1.5">
                        <div className={cn("h-2 w-2 rounded-full", conf.color)} />
                        <span className="text-[10px] text-muted-foreground">{conf.label}</span>
                    </div>
                ))}
             </div>
          </div>

        </div>
      </PopoverContent>
    </Popover>
  );
}