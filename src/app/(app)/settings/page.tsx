"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    X, Loader2, RefreshCw, Plus, UserPlus, Save, Mail, Lock, BellRing,
    UploadCloud, MoreHorizontal, Pencil, Trash2
} from "lucide-react";
import { format, isValid } from "date-fns"; // ✅ Import date utils
import { PermissionsTable } from "./permissions-table";
import type { User } from "@/lib/types";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

// Firebase
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, limit } from "firebase/firestore";
import { updateProfile, sendPasswordResetEmail } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, auth, storage } from "@/lib/firebase";
import { createSystemUser } from "@/lib/auth-helpers";

// Hooks
import { useAppSettings } from "@/hooks/use-settings";
import { useAuth } from "@/context/auth-context";
import { usePermissions } from "@/hooks/use-permissions";
import { PermissionGuard } from "@/components/permission-guard";
import { useRealtimeLogins } from "@/hooks/use-logins"; // ✅ Import Hook
import Cropper from "react-easy-crop";
import { getCroppedImg } from "@/lib/canvasUtils";
import { Slider } from "@/components/ui/slider";

// Avatar Styles for Gallery
const AVATAR_STYLES = [
    "avataaars",
    "bottts",
    "fun-emoji",
    "lorelei",
    "notionists",
    "shapes"
];

export default function SettingsPage() {
    const { toast } = useToast();
    const { user: currentUser } = useAuth();
    const { can } = usePermissions();

    const {
        settings,
        loading: settingsLoading,
        updateCustomFields,
        initializeDefaults
    } = useAppSettings();

    const customFields = settings?.customFields || {};
    const defaultKeys = ["Priority", "Status", "Label", "Department", "Currency", "Sender Location", "Receiver", "Receiver Location"];
    const fieldNames = Array.from(new Set([...defaultKeys, ...Object.keys(customFields)]));

    const departmentOptions = customFields["Department"] || [];

    const [users, setUsers] = useState<User[]>([]);
    const [usersLoading, setUsersLoading] = useState(true);

    // -- PROFILE TAB STATE --
    const [pName, setPName] = useState("");
    const [pAvatar, setPAvatar] = useState("");
    const [pDept, setPDept] = useState("");
    const [pEmail, setPEmail] = useState("");
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // -- CROPPER STATE --
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [isCropping, setIsCropping] = useState(false);

    // -- SECURITY STATE --
    const [isSendingReset, setIsSendingReset] = useState(false);

    // -- NOTIFICATIONS STATE --
    const [emailDigest, setEmailDigest] = useState(true);
    const [newAssignments, setNewAssignments] = useState(true);

    // -- USERS TAB STATE --
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [newUser, setNewUser] = useState({ name: '', email: '', role: 'Member', department: '' });
    const [isAddingUser, setIsAddingUser] = useState(false);

    // Edit / Delete User States
    const [userToEdit, setUserToEdit] = useState<User | null>(null);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [isUpdatingUser, setIsUpdatingUser] = useState(false);

    const [newValues, setNewValues] = useState<Record<string, string>>({});
    const [isInitializing, setIsInitializing] = useState(false);

    // 1. Sync All Users
    useEffect(() => {
        const q = query(collection(db, "users"), orderBy("name"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const realtimeUsers = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as User[];
            setUsers(realtimeUsers);
            setUsersLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // 3. Sync Login History (Admin Only)
    const { logins, loading: loginsLoading } = useRealtimeLogins(); // ✅ Fetch Logins

    // 2. Sync Current User Profile Data
    useEffect(() => {
        if (currentUser) {
            setPName(currentUser.name || "");
            setPAvatar(currentUser.avatarUrl || "");
            setPDept(currentUser.department || "");
            setPEmail(currentUser.email || auth.currentUser?.email || "");

            const prefs = (currentUser as any).preferences || {};
            setEmailDigest(prefs.emailDigest ?? true);
            setNewAssignments(prefs.newAssignments ?? true);
        }
    }, [currentUser]);

    // --- ACTIONS ---

    // ✅ 1. EDIT USER
    const handleUpdateUser = async () => {
        if (!userToEdit) return;
        setIsUpdatingUser(true);
        try {
            await updateDoc(doc(db, "users", userToEdit.id), {
                name: userToEdit.name,
                department: userToEdit.department,
                role: userToEdit.role
            });
            toast({ title: "User Updated", description: `${userToEdit.name} details saved.` });
            setUserToEdit(null);
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Failed to update user." });
        } finally {
            setIsUpdatingUser(false);
        }
    };

    // ✅ 2. DELETE USER
    const handleDeleteUser = async () => {
        if (!userToDelete) return;
        try {
            // First, delete from Firestore
            await deleteDoc(doc(db, "users", userToDelete.id));

            // Second, call API to delete from Authentication
            const response = await fetch(`/api/admin/delete-user?uid=${userToDelete.id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.warn("Failed to delete from Auth", errorData);
                toast({
                    variant: "destructive",
                    title: "Auth Deletion Failed",
                    description: errorData.error || "User removed from DB but Auth deletion failed."
                });
            } else {
                toast({ title: "User Deleted", description: "The user has been removed from configured systems." });
            }

            setUserToDelete(null);
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "Failed to delete user." });
        }
    };

    const onCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    };

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            const file = event.target.files[0];
            const reader = new FileReader();
            reader.addEventListener("load", () => {
                setImageSrc(reader.result?.toString() || "");
                setIsCropping(true);
            });
            reader.readAsDataURL(file);
        }
    };

    const handleSaveCroppedImage = async () => {
        if (!imageSrc || !currentUser) return;
        setIsUploadingAvatar(true);
        try {
            const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
            if (!croppedBlob) throw new Error("Correction failed");

            const fileRef = ref(storage, `avatars/${currentUser.id}_${Date.now()}.jpg`);
            await uploadBytes(fileRef, croppedBlob);
            const downloadUrl = await getDownloadURL(fileRef);

            setPAvatar(downloadUrl);
            toast({ title: "Avatar Updated", description: "Image cropped and uploaded successfully." });
            setIsCropping(false);
            setImageSrc(null);
        } catch (error) {
            console.error("Upload failed", error);
            toast({ variant: "destructive", title: "Upload Failed", description: "Could not upload image." });
        } finally {
            setIsUploadingAvatar(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleSaveProfile = async () => {
        if (!currentUser) return;
        setIsSavingProfile(true);
        try {
            const userRef = doc(db, "users", currentUser.id);

            await updateDoc(userRef, {
                name: pName,
                avatarUrl: pAvatar,
                department: pDept
            });

            if (auth.currentUser) {
                await updateProfile(auth.currentUser, {
                    displayName: pName,
                    photoURL: pAvatar
                });
            }

            toast({ title: "Profile Saved", description: "Your profile has been updated." });
        } catch (error) {
            toast({ title: "Error", description: "Failed to update profile.", variant: "destructive" });
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handleSaveNotifications = async (key: string, value: boolean) => {
        if (!currentUser) return;
        try {
            const userRef = doc(db, "users", currentUser.id);
            await updateDoc(userRef, {
                [`preferences.${key}`]: value
            });
            toast({ title: "Preference Saved" });
        } catch (error) {
            console.error(error);
        }
    };

    const handleSendPasswordReset = async () => {
        if (!pEmail) return;
        setIsSendingReset(true);
        try {
            await sendPasswordResetEmail(auth, pEmail);
            toast({ title: "Email Sent", description: `Reset link sent to ${pEmail}` });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setIsSendingReset(false);
        }
    };

    const handleUserPasswordReset = async (email: string) => {
        if (!email) return;
        try {
            await sendPasswordResetEmail(auth, email);
            toast({ title: "Link Sent", description: `Reset email sent to ${email}` });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: "Could not send reset email." });
        }
    };

    const generateRandomAvatar = () => {
        const seed = Math.random().toString(36).substring(7);
        setPAvatar(`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`);
    };

    const selectAvatarStyle = (style: string) => {
        const seed = pName.replace(/\s/g, '') || "user";
        setPAvatar(`https://api.dicebear.com/7.x/${style}/svg?seed=${seed}`);
    };

    const handleInviteUser = async () => {
        if (!newUser.name || !newUser.email) {
            toast({ title: "Missing fields", description: "Name and Email are required.", variant: "destructive" });
            return;
        }
        setIsAddingUser(true);
        try {
            const result = await createSystemUser({
                name: newUser.name,
                email: newUser.email,
                role: newUser.role as any,
                department: newUser.department || "General"
            });

            toast({ title: "User Added", description: `Password: ${result.tempPassword}` });
            setIsInviteOpen(false);
            setNewUser({ name: '', email: '', role: 'Member', department: '' });
        } catch (error: any) {
            let errorMessage = error.message;
            let errorTitle = "Error";

            // ✅ Better Error Handling
            if (error.code === 'auth/email-already-in-use') {
                errorTitle = "Email Already Registered";
                errorMessage = "This email is already linked to an account (possibly deleted from the list but active in Auth). Please use a different email.";
            } else if (error.code === 'auth/invalid-email') {
                errorTitle = "Invalid Email";
                errorMessage = "Please enter a valid email address.";
            }

            toast({ title: errorTitle, description: errorMessage, variant: "destructive" });
        } finally {
            setIsAddingUser(false);
        }
    };

    const handleInitialize = async () => {
        setIsInitializing(true);
        await initializeDefaults();
        setIsInitializing(false);
        toast({ title: "Success", description: "Default fields loaded." });
    };

    const handleAddValue = async (field: string) => {
        const val = newValues[field]?.trim();
        if (!val) return;
        const currentList = customFields[field] || [];
        if (!currentList.includes(val)) {
            const updatedList = [...currentList, val];
            await updateCustomFields(field, updatedList);
            handleInputChange(field, '');
            toast({ title: "Saved", description: `Added "${val}" to ${field}` });
        }
    };

    const handleRemoveValue = async (field: string, valueToRemove: string) => {
        const currentList = customFields[field] || [];
        const updatedList = currentList.filter(v => v !== valueToRemove);
        await updateCustomFields(field, updatedList);
        toast({ title: "Removed" });
    };

    const handleInputChange = (field: string, value: string) => {
        setNewValues(prev => ({ ...prev, [field]: value }));
    };

    // Quick inline edits
    const handleRoleChange = async (uid: string, role: string) => {
        await updateDoc(doc(db, "users", uid), { role });
        toast({ title: "Role Updated" });
    }
    const handleDeptChange = async (uid: string, dept: string) => {
        await updateDoc(doc(db, "users", uid), { department: dept });
        toast({ title: "Department Updated" });
    }

    if (settingsLoading || usersLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="flex flex-col gap-4 p-4 md:p-8 max-w-[1920px] mx-auto w-full">
            <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

            <Tabs defaultValue="profile" className="w-full">
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 h-auto">
                    <TabsTrigger value="profile">Profile</TabsTrigger>
                    {(can("Manage Users") || can("Manage Team")) && <TabsTrigger value="users">Users & Roles</TabsTrigger>}
                    {can("Manage Settings") && <TabsTrigger value="fields">Custom Fields</TabsTrigger>}

                    <TabsTrigger value="notifications">Notifications</TabsTrigger>
                    <TabsTrigger value="security" className="col-span-2 sm:col-span-1">Security & Logins</TabsTrigger>
                </TabsList>

                <div className="mt-4 space-y-4">

                    {/* --- TAB 1: USER PROFILE --- */}
                    <TabsContent value="profile">
                        <Card>
                            <CardHeader>
                                <CardTitle>User Profile</CardTitle>
                                <CardDescription>Manage your personal information and public avatar.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-8">
                                <div className="flex flex-col gap-4">
                                    <Label>Profile Picture</Label>
                                    <div className="flex flex-col sm:flex-row items-start gap-6">
                                        <div className="relative">
                                            <Avatar className="h-28 w-28 border-4 border-muted shrink-0 shadow-sm">
                                                <AvatarImage src={pAvatar} className="object-cover bg-white" />
                                                <AvatarFallback className="text-4xl bg-muted text-muted-foreground">{(pName || "U").charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            {isUploadingAvatar && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                                                    <Loader2 className="text-white animate-spin" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col gap-3 w-full justify-center">
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-3">
                                                    <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploadingAvatar}>
                                                        <UploadCloud className="mr-2 h-4 w-4" />
                                                        Change Photo
                                                    </Button>
                                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
                                                    <p className="text-sm text-muted-foreground">Upload and crop to fit via popup.</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* CROP PDIALOG */}
                                        <Dialog open={isCropping} onOpenChange={setIsCropping}>
                                            <DialogContent className="sm:max-w-lg">
                                                <DialogHeader>
                                                    <DialogTitle>Crop Profile Picture</DialogTitle>
                                                    <CardDescription>Drag to position and use slider to zoom.</CardDescription>
                                                </DialogHeader>
                                                <div className="relative w-full h-64 bg-black/5 rounded-md overflow-hidden mt-4">
                                                    {imageSrc && (
                                                        <Cropper
                                                            image={imageSrc}
                                                            crop={crop}
                                                            zoom={zoom}
                                                            rotation={rotation}
                                                            aspect={1}
                                                            onCropChange={setCrop}
                                                            onCropComplete={onCropComplete}
                                                            onZoomChange={setZoom}
                                                            onRotationChange={setRotation}
                                                            cropShape="round"
                                                            showGrid={false}
                                                        />
                                                    )}
                                                </div>
                                                <div className="flex flex-col gap-4 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs w-12 text-muted-foreground">Zoom</span>
                                                        <Slider
                                                            defaultValue={[1]}
                                                            min={1}
                                                            max={3}
                                                            step={0.1}
                                                            value={[zoom]}
                                                            onValueChange={(val) => setZoom(val[0])}
                                                        />
                                                    </div>
                                                </div>
                                                <DialogFooter>
                                                    <Button variant="outline" onClick={() => setIsCropping(false)}>Cancel</Button>
                                                    <Button onClick={handleSaveCroppedImage} disabled={isUploadingAvatar}>
                                                        {isUploadingAvatar && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                        Save & Upload
                                                    </Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                </div>
                                <Separator />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2"><Label>Full Name</Label><Input value={pName} onChange={(e) => setPName(e.target.value)} /></div>
                                    <div className="space-y-2"><Label className="flex items-center gap-2"><Mail className="h-3 w-3" /> Email Address</Label><Input value={pEmail} disabled className="bg-muted/50 cursor-not-allowed" /><p className="text-[10px] text-muted-foreground">Email cannot be changed directly.</p></div>
                                    <div className="space-y-2">
                                        <Label>Department</Label>
                                        <Select value={pDept} onValueChange={setPDept}>
                                            <SelectTrigger><SelectValue placeholder="Select Department" /></SelectTrigger>
                                            <SelectContent>{departmentOptions.length > 0 ? (departmentOptions.map(dept => <SelectItem key={dept} value={dept}>{dept}</SelectItem>)) : <SelectItem value="none" disabled>No Departments</SelectItem>}</SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>System Role</Label>
                                        <div className="flex items-center h-10 px-3 rounded-md border bg-muted/50 text-sm text-muted-foreground"><Lock className="mr-2 h-3 w-3" />{currentUser?.role || "Member"}</div>
                                    </div>
                                </div>
                                <div className="flex justify-end pt-4">
                                    <Button onClick={handleSaveProfile} disabled={isSavingProfile} size="icon">
                                        {isSavingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* --- TAB 2: USERS & ROLES --- */}
                    <TabsContent value="users" className="space-y-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div className="space-y-1.5">
                                    <CardTitle>Users and Roles</CardTitle>
                                    <CardDescription>Manage your team members and their access levels.</CardDescription>
                                </div>
                                <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                                    <PermissionGuard requiredPermission="Manage Users">
                                        <DialogTrigger asChild>
                                            <Button size="icon"><Plus className="h-4 w-4" /></Button>
                                        </DialogTrigger>
                                    </PermissionGuard>
                                    <DialogContent className="sm:max-w-md w-[95%] rounded-lg">
                                        <DialogHeader><DialogTitle>Invite New User</DialogTitle></DialogHeader>
                                        <div className="grid gap-4 py-4">
                                            <div className="grid gap-2"><Label>Full Name</Label><Input value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} /></div>
                                            <div className="grid gap-2"><Label>Email</Label><Input value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} /></div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="grid gap-2">
                                                    <Label>Department</Label>
                                                    <Select value={newUser.department} onValueChange={(val) => setNewUser({ ...newUser, department: val })}>
                                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            {departmentOptions.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label>Role</Label>
                                                    <Select value={newUser.role} onValueChange={(val) => setNewUser({ ...newUser, role: val })}>
                                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                                        <SelectContent><SelectItem value="Admin">Admin</SelectItem><SelectItem value="Manager">Manager</SelectItem><SelectItem value="Member">Member</SelectItem></SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        </div>
                                        <DialogFooter><Button onClick={handleInviteUser} disabled={isAddingUser} className="w-full sm:w-auto">Add User</Button></DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </CardHeader>
                            <CardContent className="p-0 sm:p-6">
                                <div className="overflow-x-auto">
                                    <Table className="min-w-[700px]">
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>User</TableHead>
                                                <TableHead>Email</TableHead>
                                                <TableHead>Department</TableHead>
                                                <TableHead>Role</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {users.length > 0 ? (
                                                users.map(user => (
                                                    <TableRow key={user.id}>
                                                        <TableCell className="font-medium flex items-center gap-2">
                                                            <Avatar className="h-6 w-6"><AvatarImage src={user.avatarUrl} /><AvatarFallback>{user.name.charAt(0)}</AvatarFallback></Avatar>
                                                            {user.name}
                                                        </TableCell>
                                                        <TableCell className="text-muted-foreground text-sm">{user.email}</TableCell>
                                                        <TableCell>
                                                            <Select value={user.department} onValueChange={(val) => handleDeptChange(user.id, val)}>
                                                                <SelectTrigger className="w-[140px] h-8 border-none shadow-none hover:bg-muted/50"><SelectValue placeholder="Select" /></SelectTrigger>
                                                                <SelectContent>
                                                                    {/* ✅ FIXED: Added closing bracket ')' to map function */}
                                                                    {departmentOptions.length > 0 ? (
                                                                        departmentOptions.map(dept => <SelectItem key={dept} value={dept}>{dept}</SelectItem>)
                                                                    ) : <SelectItem value="none" disabled>No Depts</SelectItem>}
                                                                </SelectContent>
                                                            </Select>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Select value={user.role} onValueChange={(val) => handleRoleChange(user.id, val)}>
                                                                <SelectTrigger className="w-[120px] h-8 border-none shadow-none hover:bg-muted/50"><SelectValue /></SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="Admin">Admin</SelectItem>
                                                                    <SelectItem value="Manager">Manager</SelectItem>
                                                                    <SelectItem value="Member">Member</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <DropdownMenu>
                                                                <PermissionGuard requiredPermission="Manage Users">
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                                                                    </DropdownMenuTrigger>
                                                                </PermissionGuard>
                                                                <DropdownMenuContent align="end">
                                                                    <DropdownMenuItem onClick={() => setUserToEdit(user)}>
                                                                        <Pencil className="mr-2 h-4 w-4" /> Edit Details
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => handleUserPasswordReset(user.email)}>
                                                                        <RefreshCw className="mr-2 h-4 w-4" /> Reset Password
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem onClick={() => setUserToDelete(user)} className="text-red-600 focus:text-red-600">
                                                                        <Trash2 className="mr-2 h-4 w-4" /> Delete User
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : <TableRow><TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No users found.</TableCell></TableRow>}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>

                        </Card>

                        {/* EDIT DIALOG */}
                        <Dialog open={!!userToEdit} onOpenChange={(open) => !open && setUserToEdit(null)}>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Edit User</DialogTitle>
                                </DialogHeader>
                                {userToEdit && (
                                    <div className="grid gap-4 py-4">
                                        <div className="grid gap-2">
                                            <Label>Full Name</Label>
                                            <Input value={userToEdit.name} onChange={(e) => setUserToEdit({ ...userToEdit, name: e.target.value })} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Department</Label>
                                            <Select value={userToEdit.department} onValueChange={(val) => setUserToEdit({ ...userToEdit, department: val })}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {departmentOptions.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Role</Label>
                                            <Select value={userToEdit.role} onValueChange={(val) => setUserToEdit({ ...userToEdit, role: val as User['role'] })}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Admin">Admin</SelectItem>
                                                    <SelectItem value="Manager">Manager</SelectItem>
                                                    <SelectItem value="Member">Member</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                )}
                                <DialogFooter>
                                    <Button onClick={handleUpdateUser} disabled={isUpdatingUser}>
                                        {isUpdatingUser && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Save Changes
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        {/* DELETE CONFIRMATION */}
                        <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will permanently delete <strong>{userToDelete?.name}</strong> from the system. This action cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>

                        <div className="overflow-x-auto">
                            {currentUser?.role === 'Admin' && (
                                <PermissionsTable />
                            )}
                        </div>

                    </TabsContent>

                    {/* --- TAB 3: CUSTOM FIELDS --- */}
                    <TabsContent value="fields">
                        <Card>
                            <CardHeader>
                                <CardTitle>Custom Fields</CardTitle>
                                <CardDescription>Manage dropdown options for tasks and users.</CardDescription>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {fieldNames.map(field => (
                                    <div key={field} className="flex flex-col gap-2 p-3 border rounded-lg bg-card/50">
                                        <h3 className="font-semibold text-sm text-foreground">{field}</h3>
                                        <div className="flex gap-2">
                                            <Input
                                                placeholder={`New ${field}...`}
                                                value={newValues[field] || ''}
                                                onChange={(e) => handleInputChange(field, e.target.value)}
                                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddValue(field); } }}
                                                className="h-9 flex-1"
                                            />
                                            <Button size="sm" onClick={() => handleAddValue(field)} className="h-9 px-3 shrink-0"><Plus className="h-4 w-4" /></Button>
                                        </div>

                                        <div className="border rounded-md p-2 h-[140px] overflow-y-auto bg-muted/20 custom-scrollbar mt-1">
                                            <div className="flex flex-wrap gap-1.5">
                                                {(customFields[field] || []).map(value => (
                                                    <Badge key={value} variant="secondary" className="flex items-center gap-1 px-2 py-1 text-xs">
                                                        {value}
                                                        <button onClick={() => handleRemoveValue(field, value)} className="ml-1 text-muted-foreground hover:text-destructive transition-colors">
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    </Badge>
                                                ))}
                                                {(!customFields[field] || customFields[field].length === 0) && (
                                                    <div className="flex h-full items-center justify-center w-full">
                                                        <span className="text-xs text-muted-foreground italic">No values added.</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                            <CardFooter className="border-t bg-muted/20 flex justify-center sm:justify-end p-4">
                                <Button variant="ghost" size="sm" onClick={handleInitialize} disabled={isInitializing} className="text-muted-foreground hover:text-destructive w-full sm:w-auto">
                                    {isInitializing && <RefreshCw className="mr-2 h-3 w-3 animate-spin" />}
                                    Reset to Defaults
                                </Button>
                            </CardFooter>
                        </Card>
                    </TabsContent>

                    {/* --- TAB: LOGIN HISTORY (ADMIN) --- */}


                    {/* --- TAB 4: NOTIFICATIONS --- */}
                    <TabsContent value="notifications">
                        <Card>
                            <CardHeader>
                                <CardTitle>Notifications</CardTitle>
                                <CardDescription>Manage how and when you want to be notified.</CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-6 pt-6">
                                <div className="flex items-center justify-between space-x-4">
                                    <div className="flex items-start gap-3">
                                        <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                                        <div><h3 className="font-medium">Email Digest</h3><p className="text-sm text-muted-foreground">Receive a daily summary of your tasks.</p></div>
                                    </div>
                                    <Switch
                                        checked={emailDigest}
                                        onCheckedChange={(val) => { setEmailDigest(val); handleSaveNotifications('emailDigest', val); }}
                                    />
                                </div>
                                <Separator />
                                <div className="flex items-center justify-between space-x-4">
                                    <div className="flex items-start gap-3">
                                        <BellRing className="h-5 w-5 text-muted-foreground mt-0.5" />
                                        <div><h3 className="font-medium">New Assignments</h3><p className="text-sm text-muted-foreground">Get alerted immediately when a task is assigned to you.</p></div>
                                    </div>
                                    <Switch
                                        checked={newAssignments}
                                        onCheckedChange={(val) => { setNewAssignments(val); handleSaveNotifications('newAssignments', val); }}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* --- TAB 5: SECURITY --- */}
                    <TabsContent value="security">
                        <Card>
                            <CardHeader><CardTitle>Security</CardTitle></CardHeader>
                            <CardContent>
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-lg border p-4 bg-muted/10">
                                    <div className="text-center sm:text-left flex items-center gap-4">
                                        <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center shrink-0">
                                            <Lock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <div>
                                            <h3 className="font-medium">Reset Password</h3>
                                            <p className="text-sm text-muted-foreground">Send a password reset link to your registered email: <strong>{pEmail}</strong></p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        onClick={handleSendPasswordReset}
                                        disabled={isSendingReset}
                                        className="w-full sm:w-auto"
                                    >
                                        {isSendingReset && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {isSendingReset ? "Sending..." : "Send Reset Link"}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Login History (Admin Only) */}
                        {(can("Manage Users") || currentUser?.role === 'Admin') && (
                            <Card className="mt-6">
                                <CardHeader>
                                    <CardTitle>Login History</CardTitle>
                                    <CardDescription>Recent login activity (Last 100 records).</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>User</TableHead>
                                                    <TableHead>Time</TableHead>
                                                    <TableHead>IP Address</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {loginsLoading ? (
                                                    <TableRow><TableCell colSpan={3} className="text-center h-24"><Loader2 className="animate-spin h-6 w-6 mx-auto" /></TableCell></TableRow>
                                                ) : logins.length > 0 ? (
                                                    logins.map(login => (
                                                        <TableRow key={login.id}>
                                                            <TableCell className="font-medium flex items-center gap-2">
                                                                <Avatar className="h-6 w-6">
                                                                    <AvatarImage src={login.userAvatar} />
                                                                    <AvatarFallback>{login.userName?.charAt(0) || "?"}</AvatarFallback>
                                                                </Avatar>
                                                                {login.userName}
                                                            </TableCell>
                                                            <TableCell className="text-muted-foreground">
                                                                {isValid(login.timestamp) ? format(login.timestamp, "PPpp") : "N/A"}
                                                            </TableCell>
                                                            <TableCell className="font-mono text-xs">{login.ip || "—"}</TableCell>
                                                        </TableRow>
                                                    ))
                                                ) : (
                                                    <TableRow><TableCell colSpan={3} className="text-center h-24 text-muted-foreground">No login history found.</TableCell></TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}

// ✅ SEPARATE COMPONENT FOR PERFORMANCE
function LoginHistoryTable() {
    const [logins, setLogins] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch last 100 logins
        const q = query(collection(db, 'logins'), orderBy('timestamp', 'desc'), limit(100));
        const unsub = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setLogins(data);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-muted-foreground" /></div>;

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>IP / Source</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {logins.length > 0 ? (
                        logins.map((login) => {
                            // Safe date parsing
                            let dateObj: Date | null = null;
                            if (login.timestamp?.seconds) dateObj = new Date(login.timestamp.seconds * 1000);
                            else if (login.timestamp) dateObj = new Date(login.timestamp);

                            return (
                                <TableRow key={login.id}>
                                    <TableCell className="font-medium flex items-center gap-2">
                                        <Avatar className="h-6 w-6">
                                            <AvatarImage src={login.userAvatar} />
                                            <AvatarFallback>{(login.userName || "U").charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        {login.userName || "Unknown"}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {dateObj && isValid(dateObj) ? format(dateObj, "MMM d, yyyy h:mm a") : "N/A"}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{login.ip || "Web Client"}</TableCell>
                                </TableRow>
                            )
                        })
                    ) : (
                        <TableRow>
                            <TableCell colSpan={3} className="h-24 text-center">No login history found.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    )
}