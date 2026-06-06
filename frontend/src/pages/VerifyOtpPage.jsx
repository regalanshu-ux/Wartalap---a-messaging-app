import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useNavigate } from "react-router-dom";
import { KeyRound, Loader2, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";

const VerifyOtpPage = () => {
  const { signupEmail, verifyOtp, resendOtp } = useAuthStore();
  const [otp, setOtp] = useState(Array(6).fill(""));
  const [isVerifying, setIsVerifying] = useState(false);
  const [timer, setTimer] = useState(60);
  const inputRefs = useRef([]);
  const navigate = useNavigate();

  useEffect(() => {
    // If no email, send user back to signup
    if (!signupEmail) {
      toast.error("No pending email verification found.");
      navigate("/signup");
    }
  }, [signupEmail, navigate]);

  // Countdown timer for Resend OTP
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const handleChange = (index, value) => {
    if (isNaN(value)) return; // Only allow numbers

    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1); // Get last typed character
    setOtp(newOtp);

    // Auto-focus next field
    if (value && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Backspace: clear current and focus previous
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    if (!/^\d{6}$/.test(pastedData)) {
      return toast.error("Please paste a valid 6-digit OTP code");
    }

    const newOtp = pastedData.split("");
    setOtp(newOtp);
    inputRefs.current[5].focus(); // Focus last element
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otpCode = otp.join("");
    if (otpCode.length !== 6) return toast.error("Please enter all 6 digits");

    setIsVerifying(true);
    const success = await verifyOtp(otpCode);
    setIsVerifying(false);

    if (success) {
      navigate("/");
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;
    const success = await resendOtp();
    if (success) {
      setTimer(60);
      setOtp(Array(6).fill(""));
      inputRefs.current[0].focus();
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-base-200/50 p-4">
      <div className="w-full max-w-md bg-base-100 rounded-2xl shadow-xl border border-base-300 p-8 space-y-6">
        {/* LOGO & TITLE */}
        <div className="text-center space-y-2">
          <div className="mx-auto size-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <KeyRound className="size-6 text-primary animate-pulse" />
          </div>
          <h1 className="text-2xl font-bold">Verify Your Email</h1>
          <p className="text-sm text-base-content/60">
            We&apos;ve sent a 6-digit verification code to
          </p>
          <p className="font-semibold text-primary break-all">{signupEmail}</p>
        </div>

        {/* OTP INPUTS */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-between gap-2" onPaste={handlePaste}>
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="size-12 sm:size-14 text-center text-2xl font-bold bg-base-200 border border-base-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            ))}
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full h-12 text-base font-semibold"
            disabled={isVerifying || otp.some((d) => !d)}
          >
            {isVerifying ? (
              <>
                <Loader2 className="size-5 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify Code"
            )}
          </button>
        </form>

        {/* RESEND TIMER CONTROLS */}
        <div className="text-center">
          {timer > 0 ? (
            <p className="text-sm text-base-content/60">
              Resend code in <span className="font-semibold text-primary">{timer}s</span>
            </p>
          ) : (
            <button
              onClick={handleResend}
              className="text-sm font-semibold text-primary hover:underline"
            >
              Resend Code
            </button>
          )}
        </div>

        {/* BACK BUTTON */}
        <div className="text-center pt-2">
          <button
            onClick={() => navigate("/signup")}
            className="inline-flex items-center gap-2 text-sm text-base-content/50 hover:text-base-content transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to Signup
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerifyOtpPage;
