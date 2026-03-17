import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Loader2,
  Mail,
  Lock,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
  // Navigation hook to programmatically change routes
  const navigate = useNavigate();
  const { login } = useAuth();

  // State variables for form inputs
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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
        body: JSON.stringify({ identifier: email, password }),
      });

      const data = await response.json();

      // Handle non-200 responses sent from fastify/auth logic
      if (!response.ok) {
        // If the error seems related to credentials, use the user's preferred message
        const isAuthError =
          response.status === 401 ||
          (data.message && data.message.toLowerCase().includes("password"));
        throw new Error(
          isAuthError
            ? "Please enter correct password"
            : data.message || data.error || "Invalid email or password.",
        );
      }

      // Store the JWT token in AuthContext sequentially linking it globally
      if (data.token) {
        login(data.token);
      }

      // If the login resolves successfully, route the user to the dashboard
      navigate("/dashboard");
    } catch (err: any) {
      // If the request fails, display the error to the user
      setError(
        err.message || "An unexpected error occurred. Please try again.",
      );
    } finally {
      // Ensure the loading indicator is stopped whether successful or rejected
      setIsLoading(false);
    }
  };

  return (
    // Container that handles the full-screen layout and centers the login card
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-950 dark:to-slate-900">
      {/* Subtle Industrial Background Image */}
      <div
        className="absolute inset-0 z-0 opacity-[0.06] grayscale pointer-events-none"
        style={{
          backgroundImage: 'url("/factory-bg.png")',
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(1px)",
        }}
      />

      {/* Decorative background gradients using absolute positioning and SVG/CSS blur effects */}
      <div className="absolute top-0 flex w-full justify-center opacity-50">
        <div className="absolute left-[-10%] top-[-10rem] h-[30rem] w-[30rem] rounded-full bg-blue-600/20 blur-[100px] mix-blend-multiply opacity-70"></div>
        <div className="absolute right-[-10%] top-[-5rem] h-[25rem] w-[25rem] rounded-full bg-blue-400/20 blur-[100px] mix-blend-multiply opacity-70"></div>
      </div>

      {/* Primary Login Card Container - uses a glassmorphism backdrop blur effect */}
      <div className="relative z-10 w-full max-w-md mx-auto p-10 backdrop-blur-md bg-white/70 dark:bg-card/80 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-xl transition-all">
        {/* Header Section (Logo, Title and subtitle text) */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-white p-2 shadow-sm border border-slate-100">
            <img
              src="/logo.png"
              alt="Logo"
              className="h-full w-full object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-foreground">
            Welcome Back
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-muted-foreground">
            Log in to manage production, inventory, and sales.
          </p>
        </div>

        {/* Dynamic Error Message Display - only renders when the `error` state string is truthy */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 animate-in fade-in slide-in-from-top-2 duration-300 shadow-sm">
            <div className="flex-shrink-0 mt-0.5">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold flex items-center gap-2">
                <span>❌</span>
                {error}
              </p>
            </div>
          </div>
        )}

        {/* Primary form wrapper hooking up to our submit logic */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email Input Field Group */}
          <div className="space-y-2 group">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Email or Username
            </label>
            <div className="relative">
              {/* Overlay Icon - left aligned */}
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                <Mail className="h-5 w-5" />
              </div>
              <input
                type="text"
                required // HTML5 form validation
                disabled={isLoading} // Disable editing when submitting
                placeholder="you@example.com or username"
                className="w-full rounded-xl border border-slate-200 dark:border-input bg-white dark:bg-background/50 py-2.5 pl-10 pr-4 text-slate-900 dark:text-foreground placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all disabled:opacity-50"
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
              <a
                href="#"
                className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                Forgot password?
              </a>
            </div>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                <Lock className="h-5 w-5" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                disabled={isLoading}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-200 dark:border-input bg-white dark:bg-background/50 py-2.5 pl-10 pr-10 text-slate-900 dark:text-foreground placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all disabled:opacity-50"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  e.target.setCustomValidity(""); // Reset custom validity on input
                }}
                onInvalid={(e: any) => {
                  e.target.setCustomValidity("Please enter password");
                }}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-blue-600 transition-colors"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={isLoading} // Prevents duplicate submissions while loading
            className="group relative mt-4 flex w-full items-center justify-center gap-3 rounded-xl bg-blue-600 py-3.5 px-4 font-bold text-white shadow-lg shadow-blue-600/25 transition-all duration-200 hover:bg-blue-700 hover:shadow-blue-600/40 hover:scale-[1.01] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-70"
          >
            {/* Conditional Button UI based on loading state */}
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="tracking-wide">Accessing Dashboard...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="tracking-wide">Access Dashboard</span>
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </div>
            )}
          </button>
        </form>

        {/* Security Message */}
        <div className="mt-8 flex items-center justify-center gap-2 text-xs font-medium text-slate-400 dark:text-muted-foreground/60 transition-opacity hover:opacity-100">
          <Lock className="h-3 w-3" />
          <span>Secure login powered by encrypted authentication.</span>
        </div>

        {/* Support Footer link */}
        <div className="mt-4 text-center text-sm text-slate-500 dark:text-muted-foreground">
          Need help? Contact{" "}
          <a
            href="#"
            className="font-semibold text-blue-600 hover:underline underline-offset-4"
          >
            IT Support
          </a>
        </div>
      </div>
    </div>
  );
}
