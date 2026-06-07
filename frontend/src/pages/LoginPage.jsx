import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, Lock, Mail, MessageSquare, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const { login, isLoggingIn } = useAuthStore();
  const navigate = useNavigate();

  const validateForm = () => {
    if (!formData.email.trim()) return toast.error("Email is required");
    if (!/\S+@\S+\.\S+/.test(formData.email)) return toast.error("Invalid email format");
    if (!formData.password) return toast.error("Password is required");

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const success = validateForm();

    if (success === true) {
      const isSuccess = await login(formData);
      if (isSuccess === "verify") {
        navigate("/verify-otp");
      }
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] grid lg:grid-cols-2 ambient-bg relative overflow-hidden">
      {/* Left side */}
      <div className="flex flex-col justify-center items-center p-6 sm:p-12 z-10">
        <div className="w-full max-w-md glass-card p-8 rounded-3xl border border-white/20 dark:border-zinc-800/30 shadow-2xl space-y-6">
          {/* LOGO */}
          <div className="text-center">
            <div className="flex flex-col items-center gap-2.5 group">
              <div
                className="size-14 rounded-2xl bg-primary/15 flex items-center
              justify-center group-hover:bg-primary/25 transition-all duration-300 scale-95 group-hover:scale-100 shadow-inner"
              >
                <MessageSquare className="size-7 text-primary" />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary via-indigo-500 to-secondary bg-clip-text text-transparent">
                Welcome Back
              </h1>
              <p className="text-sm text-base-content/60">Sign in to resume chatting</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text font-semibold text-xs tracking-wide uppercase opacity-70">Email</span>
              </label>
              <div className="glass-input-container">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="size-5 text-base-content/40" />
                </div>
                <input
                  type="email"
                  className="glass-input"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="form-control">
              <div className="flex justify-between items-center py-1">
                <label className="label p-0">
                  <span className="label-text font-semibold text-xs tracking-wide uppercase opacity-70">Password</span>
                </label>
                <Link to="/forgot-password" className="text-xs text-primary hover:underline font-semibold transition-all">
                  Forgot Password?
                </Link>
              </div>
              <div className="glass-input-container">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="size-5 text-base-content/40" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  className="glass-input pr-10"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center hover:text-primary transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="size-5 text-base-content/40" />
                  ) : (
                    <Eye className="size-5 text-base-content/40" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/20 btn-tactile mt-2"
              disabled={isLoggingIn}
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  Signing In...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div className="text-center pt-2">
            <p className="text-sm text-base-content/60">
              Don&apos;t have an account?{" "}
              <Link to="/signup" className="font-semibold text-primary hover:underline hover:text-primary-focus transition-all">
                Create account
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Design Showcase */}
      <div className="hidden lg:flex flex-col items-center justify-center p-12 relative z-10">
        <div className="w-full max-w-lg glass-card border border-white/20 p-8 rounded-3xl shadow-2xl relative overflow-hidden flex flex-col space-y-6">
          <div className="absolute -top-16 -right-16 w-32 h-32 bg-primary/20 rounded-full blur-xl animate-pulse" />
          <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-secondary/20 rounded-full blur-xl animate-pulse" />

          {/* Chat Mockup Header */}
          <div className="flex items-center justify-between border-b border-base-content/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src="/logo.jpg"
                  alt="Wartalap Logo"
                  className="size-11 object-cover rounded-xl border border-base-content/10"
                />
                <span className="absolute bottom-0 right-0 size-3 bg-green-500 rounded-full ring-2 ring-base-100" />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-sm leading-tight">वार्तालाप Support</h3>
                <p className="text-xs text-green-500 flex items-center gap-1">
                  <span className="size-1.5 bg-green-500 rounded-full animate-ping" />
                  Active support agents
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Chat Stream */}
          <div className="space-y-4 py-2">
            <div className="chat chat-start animate-fade-in-up">
              <div className="chat-image avatar">
                <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center text-xs border border-primary/20">
                  वा
                </div>
              </div>
              <div className="chat-bubble glass-card border-none text-sm leading-relaxed p-3.5 rounded-2xl rounded-tl-none">
                Welcome back to <span className="font-semibold text-primary">वार्तालाप</span>! Log in to access your chat history.
              </div>
            </div>

            <div className="chat chat-end animate-fade-in-up delay-75">
              <div className="chat-image avatar">
                <div className="size-9 rounded-full bg-secondary/15 flex items-center justify-center text-xs font-semibold text-secondary border border-secondary/20">
                  JD
                </div>
              </div>
              <div className="chat-bubble bg-gradient-to-tr from-primary to-indigo-600 text-primary-content text-sm leading-relaxed p-3.5 rounded-2xl rounded-tr-none shadow-md">
                Awesome! I can't wait to see the new dashboard features! 🚀
              </div>
            </div>

            <div className="chat chat-start animate-fade-in-up delay-150">
              <div className="chat-image avatar">
                <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center text-xs border border-primary/20">
                  वा
                </div>
              </div>
              <div className="chat-bubble glass-card border-none text-sm leading-relaxed p-3.5 rounded-2xl rounded-tl-none">
                We've added active indicators, friends discovery, and modern visual upgrades. Let's get started!
              </div>
            </div>
          </div>

          {/* Modern Badge Grid */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-base-content/10">
            <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-base-100/50 border border-base-content/5 hover:border-primary/30 transition-all">
              <CheckCircle className="size-5 text-primary" />
              <span className="text-xs font-semibold">24h Auto-Delete Policy</span>
            </div>
            <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-base-100/50 border border-base-content/5 hover:border-secondary/30 transition-all">
              <CheckCircle className="size-5 text-secondary" />
              <span className="text-xs font-semibold">Real-Time WebSockets</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;