import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Mail, Lock, AlertCircle, ArrowRight } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
    // Navigation hook to programmatically change routes
    const navigate = useNavigate();
    const { login } = useAuth();

    // State variables for form inputs
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // UI State for handling loading indicators and error messages
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    // Handler for form submission
    const handleSubmit = async (e: React.FormEvent) => {
        // Prevent default form browser submission behavior
        e.preventDefault();

        // Reset state before making the request
        setIsLoading(true);
        setError("");

        try {
            // Make a POST request to the backend auth API
            const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
            const response = await fetch(`${apiUrl}/auth/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            // Handle non-200 responses sent from fastify/auth logic
            if (!response.ok) {
                throw new Error(data.message || data.error || "Invalid email or password.");
            }

            // Store the JWT token in AuthContext sequentially linking it globally
            if (data.token) {
                login(data.token);
            }

            // If the login resolves successfully, route the user to the dashboard
            navigate("/dashboard");
        } catch (err: any) {
            // If the request fails, display the error to the user
            setError(err.message || "An unexpected error occurred. Please try again.");
        } finally {
            // Ensure the loading indicator is stopped whether successful or rejected
            setIsLoading(false);
        }
    };

    return (
        // Container that handles the full-screen layout and centers the login card
        <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-background">

            {/* Decorative background gradients using absolute positioning and SVG/CSS blur effects */}
            <div className="absolute top-0 flex w-full justify-center">
                <div className="absolute left-[-10%] top-[-10rem] h-[30rem] w-[30rem] rounded-full bg-primary/20 blur-[100px] mix-blend-multiply opacity-70"></div>
                <div className="absolute right-[-10%] top-[-5rem] h-[25rem] w-[25rem] rounded-full bg-blue-400/20 blur-[100px] mix-blend-multiply opacity-70"></div>
            </div>

            {/* Primary Login Card Container - uses a glassmorphism backdrop blur effect */}
            <div className="relative z-10 w-full max-w-md mx-auto p-8 backdrop-blur-sm bg-white/80 dark:bg-card/90 border border-slate-200 dark:border-border rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)] transition-all">

                {/* Header Section (Logo, Title and subtitle text) */}
                <div className="mb-10 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-foreground">Log In</h1>
                    <p className="mt-2 text-sm text-slate-500 dark:text-muted-foreground">
                        Enter your email and password to access your account.
                    </p>
                </div>

                {/* Dynamic Error Message Display - only renders when the `error` state string is truthy */}
                {error && (
                    <div className="mb-6 flex items-start gap-3 rounded-xl bg-destructive/10 p-4 border border-destructive/20 text-destructive animate-in fade-in slide-in-from-top-2 duration-300">
                        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                        <p className="text-sm font-medium leading-relaxed">{error}</p>
                    </div>
                )}

                {/* Primary form wrapper hooking up to our submit logic */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Email Input Field Group */}
                    <div className="space-y-2 group">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            Email address
                        </label>
                        <div className="relative">
                            {/* Overlay Icon - left aligned */}
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 group-focus-within:text-primary transition-colors">
                                <Mail className="h-5 w-5" />
                            </div>
                            <input
                                type="email"
                                required // HTML5 form validation
                                disabled={isLoading} // Disable editing when submitting
                                placeholder="you@example.com"
                                className="w-full rounded-xl border border-slate-200 dark:border-input bg-white dark:bg-background/50 py-2.5 pl-10 pr-4 text-slate-900 dark:text-foreground placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50"
                                value={email} // Controlled component data binding
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Password Input Field Group */}
                    <div className="space-y-2 group">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                Password
                            </label>
                            <a href="#" className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">
                                Forgot password?
                            </a>
                        </div>
                        <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 group-focus-within:text-primary transition-colors">
                                <Lock className="h-5 w-5" />
                            </div>
                            <input
                                type="password"
                                required
                                disabled={isLoading}
                                placeholder="••••••••"
                                className="w-full rounded-xl border border-slate-200 dark:border-input bg-white dark:bg-background/50 py-2.5 pl-10 pr-4 text-slate-900 dark:text-foreground placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Submit Action Button */}
                    <button
                        type="submit"
                        disabled={isLoading} // Prevents duplicate submissions while loading
                        className="group relative mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 px-4 font-semibold text-primary-foreground shadow-sm shadow-primary/30 transition-all hover:bg-primary/90 hover:shadow-md hover:shadow-primary/40 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-70"
                    >
                        {/* Conditional Button UI based on loading state */}
                        {isLoading ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                <span>Signing in...</span>
                            </>
                        ) : (
                            <>
                                <span>Sign In</span>
                                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </>
                        )}
                    </button>
                </form>

                {/* Support Footer link */}
                <div className="mt-8 text-center text-sm text-slate-500 dark:text-muted-foreground">
                    Need help? Contact{" "}
                    <a href="#" className="font-semibold text-primary hover:underline underline-offset-4">
                        IT Support
                    </a>
                </div>
            </div>
        </div>
    );
}
