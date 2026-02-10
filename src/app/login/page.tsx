'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import { ArrowLeft, Loader2, CheckCircle2, Mail, AlertCircle, Eye, EyeOff, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/context/auth-context"; // ✅ Import useAuth

// ✅ CONFIG: Always use the Dark Logo since the background is forced White
const LOGO_FOR_WHITE_BG = "/logo.png";
const LOGO_FOR_DARK_SIDEBAR = "/logo-dark.png";

type ViewState = 'login' | 'forgot' | 'success';

export default function LoginPage() {
    const [view, setView] = useState<ViewState>('login');
    const [isLoading, setIsLoading] = useState(false);
    const [mounted, setMounted] = useState(false);
    const { login } = useAuth(); // ✅ Use login from context

    // Credentials
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => setMounted(true), []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg('');

        try {
            await login(email, password); // ✅ STRICT LOGIN
            toast({ title: "Welcome back!", description: "Successfully logged in." });
            // Redirect is handled in context, but keeping it here for safety/speed
            router.push('/dashboard');
        } catch (err: any) {
            console.error(err);
            setIsLoading(false);
            if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                setErrorMsg("Invalid email or password.");
            } else if (err.code === 'auth/too-many-requests') {
                setErrorMsg("Too many failed attempts. Try again later.");
            } else if (err.message && err.message.includes("Access Denied")) {
                setErrorMsg("Account no longer exists.");
            } else {
                setErrorMsg("Something went wrong. Please try again.");
            }
        }
    };

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg('');

        try {
            await sendPasswordResetEmail(auth, email);
            setIsLoading(false);
            setView('success');
        } catch (err: any) {
            setIsLoading(false);
            console.error(err);
            if (err.code === 'auth/user-not-found') {
                setErrorMsg("No account found with this email.");
            } else {
                setErrorMsg("Could not send reset link. Try again.");
            }
        }
    };

    if (!mounted) return null;

    return (
        // ✅ FORCE BG-WHITE: Removed 'dark:bg-zinc-950'
        <div className="w-full min-h-screen flex flex-col lg:flex-row bg-white overflow-hidden font-sans text-slate-900">

            {/* ================= LEFT SIDE (Form) ================= */}
            {/* ✅ FORCED LIGHT THEME */}
            <div className="w-full lg:w-[45%] flex flex-col justify-between p-6 sm:p-12 lg:p-16 relative bg-white z-20 min-h-screen lg:min-h-0 overflow-y-auto">

                {/* Logo Section */}
                <div className="flex justify-center lg:justify-start mb-8 lg:mb-0 shrink-0">
                    <Logo
                        urlOverride={LOGO_FOR_WHITE_BG}
                        iconClassName="h-12 sm:h-16 w-auto"
                    />
                </div>

                {/* Content Container */}
                <div className="flex-1 flex flex-col justify-center max-w-[400px] w-full mx-auto relative min-h-[400px] sm:min-h-[500px]">

                    {/* 1. LOGIN FORM */}
                    <div className={cn("transition-all duration-500 ease-in-out absolute inset-0 flex flex-col justify-center w-full", view === 'login' ? "opacity-100 translate-x-0 pointer-events-auto" : "opacity-0 -translate-x-8 pointer-events-none")}>
                        <div className="mb-6 sm:mb-8 space-y-2 text-center lg:text-left">
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Welcome back</h1>
                            <p className="text-sm sm:text-base text-slate-500">Enter your credentials to access your account.</p>
                        </div>

                        {errorMsg && (
                            <div className="mb-4 p-3 rounded-md bg-red-50 text-red-600 text-sm flex items-start gap-2 border border-red-100">
                                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                <span className="flex-1">{errorMsg}</span>
                            </div>
                        )}

                        <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-slate-700">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    autoFocus
                                    placeholder="name@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    // ✅ FORCE LIGHT INPUT STYLES
                                    className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus-visible:ring-slate-900 text-base sm:text-sm"
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <Label htmlFor="password" className="text-slate-700">Password</Label>
                                    <button type="button" onClick={() => setView('forgot')} className="text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors">
                                        Forgot password?
                                    </button>
                                </div>

                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        // ✅ FORCE LIGHT INPUT STYLES
                                        className="pr-10 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus-visible:ring-slate-900 text-base sm:text-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-0 top-0 h-full px-3 text-slate-400 hover:text-slate-600 focus:outline-none flex items-center justify-center transition-colors"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <Button disabled={isLoading} className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-semibold transition-transform active:scale-[0.98]">
                                {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : "Sign in"}
                            </Button>
                        </form>
                    </div>

                    {/* 2. FORGOT PASSWORD FORM */}
                    <div className={cn("transition-all duration-500 ease-in-out absolute inset-0 flex flex-col justify-center w-full", view === 'forgot' ? "opacity-100 translate-x-0 pointer-events-auto" : "opacity-0 translate-x-8 pointer-events-none")}>
                        <button onClick={() => { setView('login'); setErrorMsg(''); }} className="flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 mb-6 sm:mb-8 group w-fit transition-colors">
                            <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to Login
                        </button>

                        <div className="mb-6 sm:mb-8 space-y-2">
                            <div className="h-12 w-12 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
                                <Mail className="h-6 w-6 text-blue-600" />
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Reset password</h1>
                            <p className="text-sm sm:text-base text-slate-500">Enter your email and we'll send you a reset link.</p>
                        </div>

                        {errorMsg && (
                            <div className="mb-4 p-3 rounded-md bg-red-50 text-red-600 text-sm flex items-start gap-2 border border-red-100">
                                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                <span className="flex-1">{errorMsg}</span>
                            </div>
                        )}

                        <form onSubmit={handleReset} className="space-y-4 sm:space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="reset-email" className="text-slate-700">Email</Label>
                                <Input
                                    id="reset-email"
                                    type="email"
                                    placeholder="name@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    // ✅ FORCE LIGHT INPUT STYLES
                                    className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus-visible:ring-slate-900 text-base sm:text-sm"
                                />
                            </div>

                            <Button disabled={isLoading} className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white transition-transform active:scale-[0.98]">
                                {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : "Send Reset Link"}
                            </Button>
                        </form>
                    </div>

                    {/* 3. SUCCESS STATE */}
                    <div className={cn("transition-all duration-500 ease-in-out absolute inset-0 flex flex-col justify-center items-center text-center w-full", view === 'success' ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none")}>
                        <div className="h-16 w-16 sm:h-20 sm:w-20 bg-green-50 rounded-full flex items-center justify-center mb-6 animate-in zoom-in duration-300">
                            <CheckCircle2 className="h-8 w-8 sm:h-10 sm:w-10 text-green-600" />
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">Check your inbox</h2>
                        <p className="text-sm sm:text-base text-slate-500 max-w-xs mx-auto mb-8">We've sent password reset instructions to <strong className="text-slate-700">{email}</strong>.</p>
                        <Button onClick={() => setView('login')} variant="outline" className="w-full h-11 border-slate-300 text-slate-700 hover:bg-slate-50">
                            Back to Login
                        </Button>
                    </div>

                </div>

                {/* Footer & Watermark */}
                <div className="mt-auto pt-8 flex flex-col items-center lg:items-start shrink-0 space-y-1">
                    <p className="text-xs text-slate-400 font-medium">© {new Date().getFullYear()} TaskTrax. All rights reserved.</p>
                    {/* ✅ SUBTLE WATERMARK */}
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-300 font-medium tracking-wide">
                        <span className="opacity-80">Powered by</span>
                        <a
                            href="https://ivnextech.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-blue-600 transition-colors uppercase font-bold flex items-center gap-1"
                        >
                            <Zap className="h-3 w-3" /> IVNEXTECH
                        </a>
                    </div>
                </div>
            </div>

            {/* ================= RIGHT SIDE (Static Dark Theme) ================= */}
            <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden items-center justify-center bg-slate-900">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-900 opacity-90 z-0"></div>
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-sky-400 via-transparent to-transparent opacity-40 z-0"></div>

                <div className="relative z-10 flex flex-col items-center p-12 text-center max-w-2xl">
                    <div className="mb-10 transform transition-transform hover:scale-105 duration-500">
                        <Logo
                            urlOverride={LOGO_FOR_DARK_SIDEBAR}
                            iconClassName="!h-40 !w-auto drop-shadow-2xl"
                        />
                    </div>

                    <h2 className="text-3xl xl:text-4xl font-semibold text-white mb-6 tracking-tight">Task Management, Redefined</h2>
                    <p className="text-lg text-blue-100/80 font-light leading-relaxed">
                        Streamline your workflow, manage tasks efficiently, and achieve your goals with TaskTrax.
                    </p>
                </div>
            </div>

        </div>
    );
}