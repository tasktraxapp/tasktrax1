'use client';

import Link from 'next/link';
import { useState, useMemo, useEffect } from 'react';
import {
    Bell, Settings, Home, ClipboardList, Wallet, FileText,
    Loader2, MessageSquare, FileUp, CheckCircle, Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserNav } from '@/components/user-nav';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Logo, LogoIcon } from '@/components/logo';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { NavCalendar } from "@/components/calendar-popover";

// Import Real-Time Hooks & Date Fns
import { useRealtimeTasks } from "@/hooks/use-tasks";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from '@/context/auth-context'; // ✅ Import useAuth

// Permission Types
import { PermissionGuard } from "@/components/permission-guard";
import { type PermissionAction } from "@/hooks/use-permissions";

export const dynamic = 'force-dynamic';

export default function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    // ✅ AUTH GUARD
    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login");
        }
    }, [user, authLoading, router]);

    // ✅ SHOW LOADER
    if (authLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // ✅ 1. ADD STATE FOR MOBILE MENU
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    // Fetch Real-Time Data
    const { tasks, loading } = useRealtimeTasks();

    // State for Last Read Timestamp
    const [lastReadTime, setLastReadTime] = useState<number>(Date.now());
    const [isMounted, setIsMounted] = useState(false);

    // Load from LocalStorage on mount
    useEffect(() => {
        setIsMounted(true);
        const storedTime = localStorage.getItem('TASKTRAX_LAST_READ');
        if (storedTime) {
            setLastReadTime(parseInt(storedTime));
        }
    }, []);

    // Aggregate & Sort Notifications
    const notifications = useMemo(() => {
        if (!tasks || !user) return [];

        const allActivities = tasks.flatMap(task =>
            (task.activity || [])
                .filter(act => act.user.id !== user.id) // ✅ FILTER: Hide own actions
                .map(act => {
                    const timestamp = new Date(act.timestamp).getTime();
                    let Icon = Activity;
                    if (act.action.includes('comment')) Icon = MessageSquare;
                    if (act.action.includes('file')) Icon = FileUp;
                    if (act.action.includes('completed') || act.action.includes('status')) Icon = CheckCircle;

                    return {
                        ...act,
                        id: act.id || `${task.id}-${timestamp}`,
                        taskId: task.id,
                        timestamp: timestamp,
                        icon: Icon,
                        notificationTitle: `${act.user.name}`,
                        notificationAction: act.action,
                        notificationBody: act.details ? `"${act.details}" in ${task.title}` : `In task: ${task.title}`
                    };
                })
        );

        return allActivities
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 10);
    }, [tasks, user]);

    // Check for Unread Notifications
    const hasUnread = useMemo(() => {
        if (notifications.length === 0) return false;
        return notifications[0].timestamp > lastReadTime;
    }, [notifications, lastReadTime]);

    // Handle Menu Open (Clear Dot)
    const handleOpenChange = (open: boolean) => {
        if (open) {
            const now = Date.now();
            setLastReadTime(now);
            localStorage.setItem('TASKTRAX_LAST_READ', now.toString());
        }
    };

    const navLinks: { href: string; icon: any; label: string; permission: PermissionAction | null }[] = [
        { href: '/dashboard', icon: Home, label: 'Dashboard', permission: null },
        { href: '/tasks', icon: ClipboardList, label: 'Tasks', permission: 'View Tasks' },
        { href: '/financials', icon: Wallet, label: 'Financials', permission: 'View Tasks' },
        { href: '/documents', icon: FileText, label: 'Documents', permission: 'View Tasks' },
    ];

    return (
        <div className="flex min-h-screen w-full flex-col bg-background">
            {/* ================= DESKTOP SIDEBAR ================= */}
            <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-card sm:flex no-print">
                <nav className="flex flex-col items-center gap-4 px-2 py-5">
                    <Link
                        href="/dashboard"
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
                    >
                        <LogoIcon className="h-8 w-8" />
                        <span className="sr-only">TaskTrax</span>
                    </Link>

                    {navLinks.map((link) => {
                        const LinkComponent = (
                            <Link
                                href={link.href}
                                className={cn(
                                    'flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8',
                                    pathname === link.href && 'bg-accent text-accent-foreground'
                                )}
                            >
                                <link.icon className="h-5 w-5" />
                                <span className="sr-only">{link.label}</span>
                            </Link>
                        );

                        if (link.permission) {
                            return (
                                <PermissionGuard key={link.href} requiredPermission={link.permission}>
                                    {LinkComponent}
                                </PermissionGuard>
                            );
                        }
                        return <div key={link.href}>{LinkComponent}</div>;
                    })}
                </nav>

                <nav className="mt-auto flex flex-col items-center gap-4 px-2 py-5">
                    <PermissionGuard requiredPermission="Manage Settings">
                        <Link
                            href="/settings"
                            className={cn(
                                'flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8',
                                pathname === '/settings' && 'bg-accent text-accent-foreground'
                            )}
                        >
                            <Settings className="h-5 w-5" />
                            <span className="sr-only">Settings</span>
                        </Link>
                    </PermissionGuard>
                </nav>
            </aside>

            <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
                {/* Header */}
                <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-card px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 no-print">

                    {/* ✅ 2. CONTROL THE SHEET STATE */}
                    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                        <SheetTrigger asChild>
                            <Button size="icon" variant="outline" className="sm:hidden">
                                <LogoIcon className="h-6 w-6" />
                                <span className="sr-only">Toggle Menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="sm:max-w-xs">
                            <nav className="grid gap-6 text-lg font-medium">
                                {/* ✅ 3. CLOSE ON LOGO CLICK */}
                                <Link
                                    href="/dashboard"
                                    className="flex items-center gap-2 font-semibold text-foreground"
                                    onClick={() => setIsSheetOpen(false)}
                                >
                                    <Logo iconClassName="h-8 w-8" textClassName="text-2xl" />
                                </Link>

                                {navLinks.map((link) => {
                                    const MobileLink = (
                                        <Link
                                            href={link.href}
                                            // ✅ 4. CLOSE ON NAV CLICK
                                            onClick={() => setIsSheetOpen(false)}
                                            className={cn(
                                                'flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground',
                                                pathname === link.href && 'text-foreground'
                                            )}
                                        >
                                            <link.icon className="h-5 w-5" />
                                            {link.label}
                                        </Link>
                                    );

                                    if (link.permission) {
                                        return <PermissionGuard key={link.href} requiredPermission={link.permission}>{MobileLink}</PermissionGuard>;
                                    }
                                    return <div key={link.href}>{MobileLink}</div>;
                                })}

                                <PermissionGuard requiredPermission="Manage Settings">
                                    <Link
                                        href="/settings"
                                        // ✅ 5. CLOSE ON SETTINGS CLICK
                                        onClick={() => setIsSheetOpen(false)}
                                        className={cn('flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground', pathname === '/settings' && 'text-foreground')}
                                    >
                                        <Settings className="h-5 w-5" />
                                        Settings
                                    </Link>
                                </PermissionGuard>
                            </nav>
                        </SheetContent>
                    </Sheet>

                    <div className="relative ml-auto flex-1 md:grow-0"></div>

                    <div className="ml-auto flex items-center gap-2">
                        <NavCalendar />

                        <DropdownMenu onOpenChange={handleOpenChange}>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon" className="relative h-8 w-8 transition-all duration-200">
                                    <Bell className="h-4 w-4" />
                                    <span className="sr-only">Toggle notifications</span>
                                    {isMounted && hasUnread && (
                                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-600"></span>
                                        </span>
                                    )}
                                </Button>
                            </DropdownMenuTrigger>
                            {/* ✅ OPTIMIZED NOTIFICATION DROPDOWN */}
                            <DropdownMenuContent align="end" className="w-[90vw] sm:w-96 max-h-[75vh] overflow-y-auto p-0 border shadow-xl">
                                <DropdownMenuLabel className="p-4 border-b bg-muted/40 sticky top-0 z-10 backdrop-blur-md">
                                    Notifications
                                </DropdownMenuLabel>

                                {loading ? (
                                    <div className="p-8 flex justify-center text-muted-foreground"><Loader2 className="animate-spin h-6 w-6" /></div>
                                ) : notifications.length === 0 ? (
                                    <div className="p-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                                        <Bell className="h-8 w-8 opacity-20" />
                                        No recent activity
                                    </div>
                                ) : (
                                    <div className="divide-y">
                                        {notifications.map((notif, i) => {
                                            const isFresh = notif.timestamp > lastReadTime;
                                            return (
                                                <DropdownMenuItem key={i} asChild className="cursor-pointer p-0 focus:bg-accent/50">
                                                    <Link href={`/tasks/${notif.taskId}`} className={cn(
                                                        "flex items-start gap-3 p-4 hover:bg-muted/50 transition-colors",
                                                        isFresh ? "bg-blue-50/50 dark:bg-blue-950/20" : ""
                                                    )}>
                                                        <div className={cn(
                                                            "mt-1 h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                                                            isFresh ? "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400" : "bg-muted text-muted-foreground"
                                                        )}>
                                                            <notif.icon className="h-4 w-4" />
                                                        </div>
                                                        <div className="flex-1 min-w-0 space-y-1">
                                                            <p className="text-sm leading-none truncate pr-2">
                                                                <span className="font-semibold">{notif.notificationTitle}</span>
                                                                <span className="text-muted-foreground font-normal"> {notif.notificationAction}</span>
                                                            </p>
                                                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                                                {notif.notificationBody}
                                                            </p>
                                                            <p className="text-[10px] text-muted-foreground/60 font-medium pt-1">
                                                                {formatDistanceToNow(notif.timestamp, { addSuffix: true })}
                                                            </p>
                                                        </div>
                                                        {isFresh && <div className="h-2 w-2 rounded-full bg-blue-500 mt-2 shrink-0" />}
                                                    </Link>
                                                </DropdownMenuItem>
                                            )
                                        })}
                                    </div>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <ThemeToggle />
                        <UserNav />
                    </div>
                </header>

                <main className="flex-1 p-4 sm:px-6 sm:py-0">
                    {children}
                </main>
            </div>
        </div>
    );
}