'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"; 
import { useState, useEffect, useCallback } from "react";
import { Menu, LayoutDashboard, CheckSquare, FileText, Settings, CreditCard, LogOut } from "lucide-react";
import { Logo } from "@/components/logo"; 
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";

// --- NAVIGATION ITEMS ---
const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Tasks", href: "/tasks", icon: CheckSquare },
    { name: "Financials", href: "/financials", icon: CreditCard },
    { name: "Documents", href: "/documents", icon: FileText },
    { name: "Settings", href: "/settings", icon: Settings },
];

// --- 1. SHARED SIDEBAR CONTENT ---
interface SidebarContentProps {
    onNavClick?: () => void;
}

function SidebarContent({ onNavClick }: SidebarContentProps) {
    const pathname = usePathname();
    const { toast } = useToast();

    const handleLogout = async () => {
        try {
            await signOut(auth);
            toast({ title: "Logged out" });
            if (onNavClick) onNavClick();
        } catch (error) {
            console.error("Logout error", error);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-900 text-slate-300">
            {/* Logo Area */}
            <div className="p-6 pb-2 flex justify-start">
                <Link href="/dashboard" onClick={onNavClick}>
                    <Logo 
                        urlOverride="/logo-dark.png" 
                        iconClassName="h-12 w-auto" 
                        className="justify-start cursor-pointer"
                    />
                </Link>
            </div>

            {/* Navigation Links */}
            <ScrollArea className="flex-1 px-4 py-4">
                <nav className="flex flex-col gap-2">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                        
                        return (
                            <Link 
                                key={item.href} 
                                href={item.href} 
                                // ✅ FORCE CLOSE: Explicitly calling the prop function
                                onClick={() => {
                                    if (onNavClick) onNavClick();
                                }}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200",
                                    isActive 
                                        ? "bg-blue-600 text-white shadow-md" 
                                        : "hover:bg-slate-800 hover:text-white"
                                )}
                            >
                                <Icon className={cn("h-5 w-5", isActive ? "text-white" : "text-slate-400")} />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>
            </ScrollArea>

            {/* Footer / Logout */}
            <div className="p-4 border-t border-slate-800">
                <Button 
                    variant="ghost" 
                    className="w-full justify-start text-slate-400 hover:text-red-400 hover:bg-red-950/30 gap-3"
                    onClick={handleLogout}
                >
                    <LogOut className="h-5 w-5" />
                    Sign Out
                </Button>
            </div>
        </div>
    );
}

// --- 2. DESKTOP SIDEBAR ---
export function Sidebar() {
    return (
        <div className="hidden lg:flex w-64 flex-col fixed inset-y-0 z-50 border-r border-slate-800 bg-slate-900">
            <SidebarContent />
        </div>
    );
}

// --- 3. MOBILE SIDEBAR ---
export function MobileSidebar() {
    const [open, setOpen] = useState(false);
    const pathname = usePathname();

    // 1. Close on route change
    useEffect(() => {
        setOpen(false);
    }, [pathname]);

    // 2. Explicit close function
    const closeSheet = useCallback(() => {
        setOpen(false);
    }, []);

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden text-slate-500 hover:bg-slate-100">
                    <Menu className="h-6 w-6" />
                    <span className="sr-only">Toggle Menu</span>
                </Button>
            </SheetTrigger>
            
            <SheetContent side="left" className="p-0 w-72 bg-slate-900 border-r-slate-800 text-slate-100 flex flex-col">
                
                {/* ✅ FIX: Visually Hidden Title for Accessibility Compliance */}
                <SheetHeader className="sr-only">
                    <SheetTitle>Navigation Menu</SheetTitle>
                    <SheetDescription>Mobile navigation sidebar</SheetDescription>
                </SheetHeader>

                {/* Content */}
                <SidebarContent onNavClick={closeSheet} />
            </SheetContent>
        </Sheet>
    );
}