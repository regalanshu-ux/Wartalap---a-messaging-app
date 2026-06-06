import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, Lock, Mail, KeyRound, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";

const ForgotPasswordPage = () => {
  const [step, setStep] = useState(1); // 1: Request OTP, 2: Reset Password
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { forgotPassword, resetPassword, isRequestingReset, isResettingPassword } = useAuthStore();
  const navigate = useNavigate();

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!email.trim()) return toast.error("Email is required");
    if (!/\S+@\S+\.\S+/.test(email)) return toast.error("Invalid email format");

    const success = await forgotPassword(email);
    if (success) {
      setStep(2);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!otp.trim()) return toast.error("OTP code is required");
    if (otp.trim().length !== 6) return toast.error("OTP must be exactly 6 digits");
    if (!newPassword) return toast.error("New password is required");
    if (newPassword.length < 6) return toast.error("Password must be at least 6 characters");
    if (newPassword !== confirmPassword) return toast.error("Passwords do not match");

    const success = await resetPassword(email, otp.trim(), newPassword);
    if (success) {
      navigate("/login");
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] grid lg:grid-cols-2">
      {/* Left side */}
      <div className="flex flex-col justify-center items-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          {/* Back to Login Link */}
          <div className="text-left">
            <button
              onClick={() => {
                if (step === 2) {
                  setStep(1);
                } else {
                  navigate("/login");
                }
              }}
              className="text-sm flex items-center gap-1.5 hover:text-primary transition-colors text-base-content/60 cursor-pointer"
            >
              <ArrowLeft className="size-4" />
              {step === 2 ? "Back to Email Request" : "Back to Login"}
            </button>
          </div>

          {/* LOGO & HEADER */}
          <div className="text-center">
            <div className="flex flex-col items-center gap-2 group">
              <div
                className="size-12 rounded-xl bg-primary/10 flex items-center
              justify-center group-hover:bg-primary/20 transition-colors"
              >
                <KeyRound className="size-6 text-primary" />
              </div>
              <h1 className="text-2xl font-bold mt-2">
                {step === 1 ? "Forgot Password" : "Reset Password"}
              </h1>
              <p className="text-base-content/60 text-sm">
                {step === 1
                  ? "Enter your email address to receive a 6-digit OTP verification code."
                  : `Enter the verification code sent to ${email} and your new password.`}
              </p>
            </div>
          </div>

          {step === 1 ? (
            /* STEP 1: Request OTP Form */
            <form onSubmit={handleRequestOtp} className="space-y-6">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Email Address</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="size-5 text-base-content/40" />
                  </div>
                  <input
                    type="email"
                    className="input input-bordered w-full pl-10 focus:ring-1 focus:ring-primary focus:outline-none"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={isRequestingReset}
              >
                {isRequestingReset ? (
                  <>
                    <Loader2 className="size-5 animate-spin" />
                    Sending OTP...
                  </>
                ) : (
                  "Send Verification Code"
                )}
              </button>
            </form>
          ) : (
            /* STEP 2: Reset Password Form */
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">6-Digit Verification Code (OTP)</span>
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  className="input input-bordered w-full text-center tracking-widest text-lg font-semibold"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">New Password</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="size-5 text-base-content/40" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    className="input input-bordered w-full pl-10 pr-10"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
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

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Confirm New Password</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="size-5 text-base-content/40" />
                  </div>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    className="input input-bordered w-full pl-10 pr-10"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="size-5 text-base-content/40" />
                    ) : (
                      <Eye className="size-5 text-base-content/40" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={isResettingPassword}
              >
                {isResettingPassword ? (
                  <>
                    <Loader2 className="size-5 animate-spin" />
                    Resetting Password...
                  </>
                ) : (
                  "Reset Password"
                )}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Right side - Design Showcase */}
      <div className="hidden lg:flex flex-col items-center justify-center bg-base-200 p-12">
        <div className="max-w-md text-center space-y-6">
          <div className="grid grid-cols-3 gap-3">
            {[...Array(9)].map((_, i) => (
              <div
                key={i}
                className={`aspect-square rounded-2xl bg-primary/10 flex items-center justify-center ${
                  i % 2 === 0 ? "animate-pulse" : ""
                }`}
              />
            ))}
          </div>
          <h2 className="text-2xl font-bold">Secure Account Recovery</h2>
          <p className="text-base-content/60">
            Recovering your password is easy. Simply request an OTP code, update your password, and get right back to chatting with your friends securely.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
