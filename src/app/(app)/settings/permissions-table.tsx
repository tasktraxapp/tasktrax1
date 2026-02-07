"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAppSettings } from "@/hooks/use-settings"; 
import { PermissionRule } from "@/lib/types"; 

// ✅ 1. DEFINE DEFAULT RULES (Fallback if DB is empty)
const DEFAULT_RULES: PermissionRule[] = [
    { permission: "View Tasks", admin: true, manager: true, member: true },
    { permission: "Create Tasks", admin: true, manager: true, member: true },
    { permission: "Edit Tasks", admin: true, manager: true, member: false },
    { permission: "Delete Tasks", admin: true, manager: false, member: false },
    { permission: "Manage Users", admin: true, manager: false, member: false },
    { permission: "Manage Settings", admin: true, manager: false, member: false },
    { permission: "Manage Team", admin: true, manager: true, member: false },
    { permission: "View Financials", admin: true, manager: true, member: false },
];

export function PermissionsTable() {
    const { toast } = useToast();
    const { settings, loading } = useAppSettings();

    // ✅ 2. MERGE LOGIC: Use DB rules if they exist, otherwise use Defaults
    const displayRules = (settings?.rules && settings.rules.length > 0) 
        ? settings.rules 
        : DEFAULT_RULES;

    // Sort alphabetically for consistency
    const sortedRules = [...displayRules].sort((a, b) => a.permission.localeCompare(b.permission));

    const handlePermissionChange = async (
        permissionName: string, 
        role: 'admin' | 'manager' | 'member', 
        checked: boolean | 'indeterminate'
    ) => {
        if (typeof checked !== 'boolean') return;

        // A. Start with current rules or defaults
        let newRules = [...displayRules];

        // B. Find index
        const ruleIndex = newRules.findIndex(r => r.permission === permissionName);

        if (ruleIndex === -1) {
            // If rule somehow doesn't exist in our list, add it
            newRules.push({
                permission: permissionName,
                admin: true,
                manager: false,
                member: false,
                [role]: checked
            });
        } else {
            // Update existing
            newRules[ruleIndex] = {
                ...newRules[ruleIndex],
                [role]: checked
            };
        }

        // C. Force Save to DB
        try {
            await setDoc(doc(db, "settings", "global"), {
                rules: newRules
            }, { merge: true });
            
            // Toast removed to avoid spamming while clicking
        } catch (error) {
            console.error("Save failed", error);
            toast({ 
                title: "Error", 
                description: "Failed to save permission change.", 
                variant: "destructive" 
            });
        }
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="p-8 flex justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>User Rights & Permissions</CardTitle>
                <CardDescription>
                    Define what users can see and do. Changes save automatically.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[200px]">Permission</TableHead>
                            <TableHead className="text-center">Admin</TableHead>
                            <TableHead className="text-center">Manager</TableHead>
                            <TableHead className="text-center">Member</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedRules.map((row: PermissionRule) => (
                            <TableRow key={row.permission}>
                                <TableCell className="font-medium">{row.permission}</TableCell>
                                
                                {/* Admin Column */}
                                <TableCell className="text-center">
                                    <div className="flex justify-center">
                                        <Checkbox 
                                            checked={row.admin}
                                            onCheckedChange={(c) => handlePermissionChange(row.permission, 'admin', c)}
                                        />
                                    </div>
                                </TableCell>
                                
                                {/* Manager Column */}
                                <TableCell className="text-center">
                                    <div className="flex justify-center">
                                        <Checkbox
                                            checked={row.manager}
                                            onCheckedChange={(c) => handlePermissionChange(row.permission, 'manager', c)}
                                        />
                                    </div>
                                </TableCell>
                                
                                {/* Member Column */}
                                <TableCell className="text-center">
                                    <div className="flex justify-center">
                                        <Checkbox
                                            checked={row.member}
                                            onCheckedChange={(c) => handlePermissionChange(row.permission, 'member', c)}
                                        />
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}