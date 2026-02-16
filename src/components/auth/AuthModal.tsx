import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, UserPlus, Mail, Lock, User, Chrome } from "lucide-react";

interface AuthModalProps {
    children: React.ReactNode;
}

export const AuthModal = ({ children }: AuthModalProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
    const { toast } = useToast();

    // Login form state
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');

    // Signup form state
    const [signupName, setSignupName] = useState('');
    const [signupEmail, setSignupEmail] = useState('');
    const [signupPassword, setSignupPassword] = useState('');

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        try {
            await signInWithGoogle();
            setIsOpen(false);
            toast({ title: "Welcome back!", description: "Successfully logged in with Google." });
        } catch (error: any) {
            toast({
                title: "Login Failed",
                description: error.message || "An error occurred during Google login.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await signInWithEmail(loginEmail, loginPassword);
            setIsOpen(false);
            toast({ title: "Welcome back!", description: "Successfully logged in." });
        } catch (error: any) {
            toast({
                title: "Login Failed",
                description: error.message || "Invalid email or password.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleEmailSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await signUpWithEmail(signupEmail, signupPassword, signupName);
            setIsOpen(false);
            toast({ title: "Account created!", description: "Welcome to Let Me Study." });
        } catch (error: any) {
            toast({
                title: "Signup Failed",
                description: error.message || "Could not create account. Please try again.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px] border-gray-200 dark:border-gray-800 rounded-3xl">
                <DialogHeader className="space-y-3 pb-4">
                    <DialogTitle className="text-2xl font-bold text-center">Let Me Study</DialogTitle>
                    <DialogDescription className="text-center text-muted-foreground">
                        Sign in to sync your notes and chats across devices.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6">
                    <Button
                        variant="outline"
                        className="w-full gap-2 h-11 rounded-xl border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 transition-all font-medium"
                        onClick={handleGoogleLogin}
                        disabled={isLoading}
                    >
                        <Chrome className="h-5 w-5 text-[#4285F4]" />
                        Continue with Google
                    </Button>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-gray-200 dark:border-gray-800" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">
                                Or continue with email
                            </span>
                        </div>
                    </div>

                    <Tabs defaultValue="login" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-6 p-1 bg-gray-100 dark:bg-gray-900 rounded-xl">
                            <TabsTrigger value="login" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm">Login</TabsTrigger>
                            <TabsTrigger value="signup" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm">Sign Up</TabsTrigger>
                        </TabsList>

                        <TabsContent value="login">
                            <form onSubmit={handleEmailLogin} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="name@example.com"
                                            className="pl-10 rounded-xl h-11"
                                            value={loginEmail}
                                            onChange={(e) => setLoginEmail(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="password">Password</Label>
                                    </div>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="password"
                                            type="password"
                                            className="pl-10 rounded-xl h-11"
                                            value={loginPassword}
                                            onChange={(e) => setLoginPassword(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                                <Button type="submit" className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 font-semibold" disabled={isLoading}>
                                    {isLoading ? "Signing in..." : "Login"}
                                </Button>
                            </form>
                        </TabsContent>

                        <TabsContent value="signup">
                            <form onSubmit={handleEmailSignup} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Full Name</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="name"
                                            placeholder="Your Name"
                                            className="pl-10 rounded-xl h-11"
                                            value={signupName}
                                            onChange={(e) => setSignupName(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="signup-email">Email</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="signup-email"
                                            type="email"
                                            placeholder="name@example.com"
                                            className="pl-10 rounded-xl h-11"
                                            value={signupEmail}
                                            onChange={(e) => setSignupEmail(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="signup-password">Password</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="signup-password"
                                            type="password"
                                            className="pl-10 rounded-xl h-11"
                                            value={signupPassword}
                                            onChange={(e) => setSignupPassword(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                                <Button type="submit" className="w-full h-11 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:opacity-90 font-semibold" disabled={isLoading}>
                                    {isLoading ? "Creating account..." : "Sign Up"}
                                </Button>
                            </form>
                        </TabsContent>
                    </Tabs>
                </div>
            </DialogContent>
        </Dialog>
    );
};
