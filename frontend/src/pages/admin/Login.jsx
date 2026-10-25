import BrandLogo from "../../components/common/BrandLogo";
import SEO from "../../components/common/SEO";
import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import {
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Loader2,
  KeyRound,
  RefreshCw,
  MailCheck,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "../../context/admin/AuthContext";
import adminAuthService from "../../services/admin/authService";
import toast from "../../utils/toast";

export const Login = () => {
  const { login, setVerifiedSession, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Initialization & View State:
  // - "checking": checking auth status from server
  // - "login": system initialized, standard login screen
  // - "setup": first-time setup (Name, Email, Password, Confirm Password)
  // - "verify": OTP verification screen (6-digit OTP code)
  const [viewState, setViewState] = useState("checking");
  const [isInitialized, setIsInitialized] = useState(null);

  // Setup Form State
  const [setupData, setSetupData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showSetupPassword, setShowSetupPassword] = useState(false);
  const [showSetupConfirmPassword, setShowSetupConfirmPassword] = useState(false);

  // OTP Form State
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [pendingEmail, setPendingEmail] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const otpInputRefs = useRef([]);

  // Login Form State
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Error & Submission States
  const [formErrors, setFormErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = location.state?.from?.pathname || "/admin";

  // Check setup status on mount
  useEffect(() => {
    let isMounted = true;

    const checkSystemStatus = async () => {
      try {
        const statusRes = await adminAuthService.getStatus();
        if (!isMounted) return;

        if (statusRes.initialized) {
          setIsInitialized(true);
          setViewState("login");
        } else {
          setIsInitialized(false);
          if (statusRes.unverifiedEmail) {
            setPendingEmail(statusRes.unverifiedEmail);
            setSetupData((prev) => ({ ...prev, email: statusRes.unverifiedEmail }));
            // If an unverified admin is already pending, take them straight to OTP verification
            setViewState("verify");
            setResendCooldown(60);
          } else {
            setViewState("setup");
          }
        }
      } catch (err) {
        console.error("Failed to check admin status:", err);
        if (!isMounted) return;
        // Default to login if status check fails
        setViewState("login");
      }
    };

    checkSystemStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  // Cooldown timer for Resend OTP button
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // If already authenticated, redirect to destination
  if (!authLoading && isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  // --- Handlers for Setup Step 1 ---
  const handleSetupChange = (e) => {
    const { name, value } = e.target;
    setSetupData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
    if (serverError) setServerError("");
  };

  const validateSetup = () => {
    const errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!setupData.name.trim() || setupData.name.trim().length < 2) {
      errors.name = "Full name must be at least 2 characters";
    }

    if (!setupData.email.trim()) {
      errors.email = "Email address is required";
    } else if (!emailRegex.test(setupData.email.trim())) {
      errors.email = "Please enter a valid email address";
    }

    if (!setupData.password) {
      errors.password = "Password is required";
    } else if (setupData.password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    if (setupData.password !== setupData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSetupSubmit = async (e) => {
    e.preventDefault();
    setServerError("");

    if (!validateSetup()) return;

    try {
      setIsSubmitting(true);
      const email = setupData.email.trim();
      const res = await adminAuthService.setupAdmin({
        name: setupData.name.trim(),
        email,
        password: setupData.password,
      });

      toast.success(res.message || "Verification code sent to your email!");
      setPendingEmail(email);
      setViewState("verify");
      setResendCooldown(60);
      setOtpDigits(["", "", "", "", "", ""]);
      // Focus first OTP field
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    } catch (err) {
      setServerError(
        err.response?.data?.message || err.message || "Failed to initiate admin setup."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Handlers for OTP Step 2 ---
  const handleOtpDigitChange = (index, value) => {
    // Only accept numeric digit
    const cleaned = value.replace(/\D/g, "");
    if (!cleaned) {
      const next = [...otpDigits];
      next[index] = "";
      setOtpDigits(next);
      return;
    }

    // Handle single character or paste
    if (cleaned.length === 1) {
      const next = [...otpDigits];
      next[index] = cleaned;
      setOtpDigits(next);
      if (index < 5) {
        otpInputRefs.current[index + 1]?.focus();
      }
    } else if (cleaned.length === 6) {
      // Pasted full 6-digit code
      const next = cleaned.split("").slice(0, 6);
      setOtpDigits(next);
      otpInputRefs.current[5]?.focus();
    }
    if (serverError) setServerError("");
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").trim().replace(/\D/g, "");
    if (pasteData.length > 0) {
      const next = [...otpDigits];
      for (let i = 0; i < 6; i++) {
        next[i] = pasteData[i] || "";
      }
      setOtpDigits(next);
      const lastIndex = Math.min(pasteData.length, 6) - 1;
      otpInputRefs.current[lastIndex]?.focus();
    }
  };

  const handleVerifyOtpSubmit = async (e) => {
    e.preventDefault();
    setServerError("");

    const otpCode = otpDigits.join("");
    if (otpCode.length !== 6) {
      setServerError("Please enter the complete 6-digit OTP code.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await adminAuthService.verifyOtp({
        email: pendingEmail,
        otp: otpCode,
      });

      if (res.success && res.admin) {
        toast.success("Account verified! Registration permanently locked.");
        setIsInitialized(true);
        setVerifiedSession(res.admin);
        navigate(from, { replace: true });
      } else {
        throw new Error(res.message || "Failed to verify OTP.");
      }
    } catch (err) {
      setServerError(
        err.response?.data?.message || err.message || "Invalid or expired OTP code."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isResending) return;
    setServerError("");

    try {
      setIsResending(true);
      const res = await adminAuthService.resendOtp({ email: pendingEmail });
      toast.success(res.message || "Fresh 6-digit code sent to your email!");
      setResendCooldown(60);
      setOtpDigits(["", "", "", "", "", ""]);
      otpInputRefs.current[0]?.focus();
    } catch (err) {
      setServerError(
        err.response?.data?.message || err.message || "Failed to resend verification OTP."
      );
    } finally {
      setIsResending(false);
    }
  };

  const handleChangeEmail = () => {
    setServerError("");
    setViewState("setup");
  };

  // --- Handlers for Standard Login (When Initialized) ---
  const handleLoginChange = (e) => {
    const { name, value } = e.target;
    setLoginData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
    if (serverError) setServerError("");
  };

  const validateLogin = () => {
    const errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!loginData.email.trim()) {
      errors.email = "Email address is required";
    } else if (!emailRegex.test(loginData.email.trim())) {
      errors.email = "Please enter a valid email address";
    }

    if (!loginData.password) {
      errors.password = "Password is required";
    } else if (loginData.password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setServerError("");

    if (!validateLogin()) return;

    try {
      setIsSubmitting(true);
      const admin = await login(loginData.email.trim(), loginData.password);
      toast.success(`Welcome back, ${admin.name}!`);
      navigate(from, { replace: true });
    } catch (err) {
      if (err.errors) {
        setFormErrors(err.errors);
      }
      setServerError(
        err.response?.data?.message || err.message || "Invalid email or password."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state while checking initialization
  if (viewState === "checking" || authLoading) {
    return (
      <div className="auth-screen min-h-screen bg-linear-to-br from-slate-900 via-[#0B1B3A] to-slate-950 flex items-center justify-center font-sans">
        <SEO title="Verifying Admin Portal" robots="noindex, nofollow" />
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-sm font-medium text-slate-400">Loading Admin Portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-screen min-h-screen bg-linear-to-br from-slate-900 via-[#0B1B3A] to-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans selection:bg-blue-600 selection:text-white">
      <SEO
        title={
          viewState === "setup"
            ? "Create Admin Account"
            : viewState === "verify"
            ? "Verify Admin OTP"
            : "Staff Portal Sign In"
        }
        robots="noindex, nofollow"
      />

      {/* Background radial accents */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 sm:w-[600px] h-96 sm:h-[600px] bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center gap-3 mb-4">
            <BrandLogo />
          </div>

          {viewState === "setup" && (
            <>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-3">
                <KeyRound size={12} />
                <span>Single-Admin Initial Setup</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Create Admin Account
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                Set up the master administrator for Nsemfoa News. Once verified, registration is permanently locked.
              </p>
            </>
          )}

          {viewState === "verify" && (
            <>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-3">
                <MailCheck size={12} />
                <span>Email Verification</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Verify 6-Digit Code
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                We sent a 6-digit OTP code to{" "}
                <span className="text-white font-medium">{pendingEmail}</span>. Enter it below to activate and lock your account.
              </p>
            </>
          )}

          {viewState === "login" && (
            <>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Welcome Back
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                Sign in to manage the Nsemfoa News newsroom.
              </p>
            </>
          )}
        </div>

        {/* Card */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/40">
          {/* Server Error Alert */}
          {serverError && (
            <div
              className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-300 animate-fadeIn"
              role="alert"
            >
              <AlertCircle size={18} className="shrink-0 mt-0.5 text-rose-400" />
              <div className="text-xs font-medium leading-relaxed">{serverError}</div>
            </div>
          )}

          {/* VIEW 1: SETUP FORM (Only when initialized === false) */}
          {viewState === "setup" && (
            <form onSubmit={handleSetupSubmit} className="space-y-4" noValidate>
              {/* Full Name */}
              <div>
                <label
                  htmlFor="setup-name"
                  className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2"
                >
                  Full Name
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <User size={16} />
                  </div>
                  <input
                    id="setup-name"
                    name="name"
                    type="text"
                    required
                    value={setupData.name}
                    onChange={handleSetupChange}
                    placeholder="Jane Doe"
                    className={`block w-full pl-10 pr-4 py-3 bg-slate-950/60 border rounded-xl text-sm text-white placeholder-slate-500 focus:outline-hidden transition-all ${
                      formErrors.name
                        ? "border-rose-500/80 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                        : "border-slate-800 hover:border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    }`}
                    disabled={isSubmitting}
                  />
                </div>
                {formErrors.name && (
                  <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1 font-medium">
                    <AlertCircle size={12} />
                    <span>{formErrors.name}</span>
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="setup-email"
                  className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2"
                >
                  Administrator Email
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail size={16} />
                  </div>
                  <input
                    id="setup-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={setupData.email}
                    onChange={handleSetupChange}
                    placeholder="admin@example.com"
                    className={`block w-full pl-10 pr-4 py-3 bg-slate-950/60 border rounded-xl text-sm text-white placeholder-slate-500 focus:outline-hidden transition-all ${
                      formErrors.email
                        ? "border-rose-500/80 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                        : "border-slate-800 hover:border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    }`}
                    disabled={isSubmitting}
                  />
                </div>
                {formErrors.email && (
                  <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1 font-medium">
                    <AlertCircle size={12} />
                    <span>{formErrors.email}</span>
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="setup-password"
                  className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2"
                >
                  Password
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock size={16} />
                  </div>
                  <input
                    id="setup-password"
                    name="password"
                    type={showSetupPassword ? "text" : "password"}
                    required
                    value={setupData.password}
                    onChange={handleSetupChange}
                    placeholder="Minimum 6 characters"
                    className={`block w-full pl-10 pr-11 py-3 bg-slate-950/60 border rounded-xl text-sm text-white placeholder-slate-500 focus:outline-hidden transition-all ${
                      formErrors.password
                        ? "border-rose-500/80 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                        : "border-slate-800 hover:border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    }`}
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSetupPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                    tabIndex={-1}
                  >
                    {showSetupPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {formErrors.password && (
                  <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1 font-medium">
                    <AlertCircle size={12} />
                    <span>{formErrors.password}</span>
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label
                  htmlFor="setup-confirm-password"
                  className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2"
                >
                  Confirm Password
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock size={16} />
                  </div>
                  <input
                    id="setup-confirm-password"
                    name="confirmPassword"
                    type={showSetupConfirmPassword ? "text" : "password"}
                    required
                    value={setupData.confirmPassword}
                    onChange={handleSetupChange}
                    placeholder="Repeat administrator password"
                    className={`block w-full pl-10 pr-11 py-3 bg-slate-950/60 border rounded-xl text-sm text-white placeholder-slate-500 focus:outline-hidden transition-all ${
                      formErrors.confirmPassword
                        ? "border-rose-500/80 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                        : "border-slate-800 hover:border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    }`}
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSetupConfirmPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                    tabIndex={-1}
                  >
                    {showSetupConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {formErrors.confirmPassword && (
                  <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1 font-medium">
                    <AlertCircle size={12} />
                    <span>{formErrors.confirmPassword}</span>
                  </p>
                )}
              </div>

              {/* Submit Setup */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-linear-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-600 active:scale-[0.99] focus:outline-hidden focus:ring-2 focus:ring-blue-500/40 shadow-lg shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Sending Verification Code...</span>
                    </>
                  ) : (
                    <>
                      <span>Continue to Email Verification</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* VIEW 2: OTP VERIFICATION SCREEN */}
          {viewState === "verify" && (
            <form onSubmit={handleVerifyOtpSubmit} className="space-y-6" noValidate>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 text-center">
                  6-Digit Verification Code
                </label>

                {/* 6 Individual Code Inputs */}
                <div className="flex justify-center items-center gap-2 sm:gap-3" onPaste={handleOtpPaste}>
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (otpInputRefs.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold bg-slate-950/80 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-all"
                      disabled={isSubmitting}
                      autoFocus={idx === 0}
                    />
                  ))}
                </div>
                <p className="mt-2 text-center text-[11px] text-slate-400">
                  Code expires in 10 minutes.
                </p>
              </div>

              {/* Verify & Lock Button */}
              <div>
                <button
                  type="submit"
                  disabled={isSubmitting || otpDigits.join("").length !== 6}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-linear-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 active:scale-[0.99] focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Verifying & Locking Registration...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Verify & Complete Setup</span>
                    </>
                  )}
                </button>
              </div>

              {/* Action Links: Resend OTP (with 60s cooldown) & Change Email */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || isResending}
                  className="inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <RefreshCw size={13} className={isResending ? "animate-spin" : ""} />
                  {resendCooldown > 0
                    ? `Resend code (${resendCooldown}s)`
                    : isResending
                    ? "Sending..."
                    : "Resend OTP"}
                </button>

                <button
                  type="button"
                  onClick={handleChangeEmail}
                  className="inline-flex items-center gap-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <ArrowLeft size={13} />
                  <span>Change Email</span>
                </button>
              </div>
            </form>
          )}

          {/* VIEW 3: STANDARD LOGIN (When initialized === true) */}
          {viewState === "login" && (
            <form onSubmit={handleLoginSubmit} className="space-y-5" noValidate>
              {/* Email Field */}
              <div>
                <label
                  htmlFor="admin-email"
                  className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2"
                >
                  Administrator Email
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail size={16} />
                  </div>
                  <input
                    id="admin-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={loginData.email}
                    onChange={handleLoginChange}
                    placeholder="you@example.com"
                    className={`block w-full pl-10 pr-4 py-3 bg-slate-950/60 border rounded-xl text-sm text-white placeholder-slate-500 focus:outline-hidden transition-all ${
                      formErrors.email
                        ? "border-rose-500/80 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                        : "border-slate-800 hover:border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    }`}
                    disabled={isSubmitting}
                  />
                </div>
                {formErrors.email && (
                  <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1 font-medium">
                    <AlertCircle size={12} />
                    <span>{formErrors.email}</span>
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor="admin-password"
                    className="block text-xs font-semibold text-slate-300 uppercase tracking-wider"
                  >
                    Password
                  </label>
                </div>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock size={16} />
                  </div>
                  <input
                    id="admin-password"
                    name="password"
                    type={showLoginPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={loginData.password}
                    onChange={handleLoginChange}
                    placeholder="Enter administrator password"
                    className={`block w-full pl-10 pr-11 py-3 bg-slate-950/60 border rounded-xl text-sm text-white placeholder-slate-500 focus:outline-hidden transition-all ${
                      formErrors.password
                        ? "border-rose-500/80 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                        : "border-slate-800 hover:border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    }`}
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                    aria-label={showLoginPassword ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {formErrors.password && (
                  <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1 font-medium">
                    <AlertCircle size={12} />
                    <span>{formErrors.password}</span>
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-linear-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-600 active:scale-[0.99] focus:outline-hidden focus:ring-2 focus:ring-blue-500/40 shadow-lg shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Signing In...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to Newsroom</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Security Notice Footer */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-center justify-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
            <span>
              {isInitialized
                ? "Protected by Single-Admin Security & HTTP-only JWT session"
                : "Protected by 6-Digit Brevo SMTP OTP Verification"}
            </span>
          </div>
        </div>

        {/* Public Website Backlink */}
        <div className="text-center mt-6">
          <a
            href="/"
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            ← Return to public Nsemfoa News portal
          </a>
        </div>
      </div>
    </div>
  );
};

export default Login;
