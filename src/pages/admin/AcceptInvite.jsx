import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Loader2,
  ShieldCheck,
  UserCheck,
  ArrowRight
} from "lucide-react";
import toast from "react-hot-toast";
import invitationService from "../../services/admin/invitationService";

export const AcceptInvite = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [isVerifying, setIsVerifying] = useState(true);
  const [tokenError, setTokenError] = useState("");
  const [invitedAdmin, setInvitedAdmin] = useState(null);

  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Validate invitation token on mount
  useEffect(() => {
    let isMounted = true;

    const verify = async () => {
      if (!token) {
        setTokenError("No invitation token was provided in the link.");
        setIsVerifying(false);
        return;
      }

      try {
        setIsVerifying(true);
        const res = await invitationService.verifyInvitation(token);
        if (isMounted && res.success && res.admin) {
          setInvitedAdmin(res.admin);
        }
      } catch (err) {
        if (isMounted) {
          setTokenError(
            err.message ||
              "This invitation link is invalid, expired, or has already been consumed."
          );
        }
      } finally {
        if (isMounted) setIsVerifying(false);
      }
    };

    verify();
    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});

    const errors = {};
    if (!formData.password) {
      errors.password = "Password is required";
    } else if (formData.password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    } else if (!/^(?=.*[a-zA-Z])(?=.*[0-9])/.test(formData.password)) {
      errors.password = "Password must contain at least one letter and one number";
    }

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await invitationService.acceptInvitation({
        token,
        password: formData.password,
        confirmPassword: formData.confirmPassword
      });

      if (res.success) {
        setIsSuccess(true);
        toast.success("Account activated successfully! Please sign in.");
        setTimeout(() => {
          navigate("/admin/login", { replace: true });
        }, 2000);
      }
    } catch (err) {
      if (err.errors) {
        setFormErrors(err.errors);
      } else {
        toast.error(err.message || "Failed to activate account.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-[#0B1B3A] to-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans selection:bg-blue-600 selection:text-white">
      {/* Background radial accent */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 sm:w-[600px] h-96 sm:h-[600px] bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-linear-to-tr from-blue-600 to-blue-500 text-white flex items-center justify-center font-black text-2xl shadow-xl shadow-blue-500/20 tracking-tighter">
              NF
            </div>
            <div className="text-left">
              <span className="block font-black text-2xl text-white tracking-tight">
                NewsFront
              </span>
              <span className="block text-[11px] font-bold text-blue-400 uppercase tracking-widest">
                Newsroom Onboarding
              </span>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Staff Account Activation
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Set your password to complete your newsroom onboarding.
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/40">
          {isVerifying ? (
            <div className="py-10 flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 size={32} className="animate-spin text-blue-500" />
              <span className="text-xs font-medium">Verifying invitation credentials...</span>
            </div>
          ) : tokenError ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-3 text-xs leading-relaxed">
                <AlertCircle size={20} className="shrink-0 text-rose-400 mt-0.5" />
                <div>
                  <div className="font-bold mb-1 text-rose-200">Invalid Invitation Link</div>
                  <div>{tokenError}</div>
                </div>
              </div>
              <div className="pt-2 text-center">
                <Link
                  to="/admin/login"
                  className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors"
                >
                  <span>Return to Sign In</span>
                </Link>
              </div>
            </div>
          ) : isSuccess ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl mx-auto flex items-center justify-center text-emerald-400">
                <CheckCircle size={32} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Account Activated!</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Redirecting to newsroom sign in portal...
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Recipient Details Pill */}
              <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0">
                  <UserCheck size={20} />
                </div>
                <div className="truncate text-left flex-1">
                  <div className="text-xs font-bold text-white truncate">
                    {invitedAdmin?.name}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {invitedAdmin?.email} &bull;{" "}
                    <span className="capitalize text-blue-400 font-semibold">
                      {invitedAdmin?.role}
                    </span>
                  </div>
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Create Account Password
                </label>
                <div className="relative rounded-xl">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.password}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, password: e.target.value }))
                    }
                    placeholder="Minimum 8 characters"
                    className="block w-full pl-10 pr-11 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {formErrors.password && (
                  <p className="mt-1.5 text-xs text-rose-400">{formErrors.password}</p>
                )}
              </div>

              {/* Confirm Password Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Confirm Password
                </label>
                <div className="relative rounded-xl">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        confirmPassword: e.target.value
                      }))
                    }
                    placeholder="Re-enter password"
                    className="block w-full pl-10 pr-11 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {formErrors.confirmPassword && (
                  <p className="mt-1.5 text-xs text-rose-400">
                    {formErrors.confirmPassword}
                  </p>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-linear-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-600 active:scale-[0.99] shadow-lg shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Activating Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Activate & Sign In</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-center gap-2 text-[11px] text-slate-500">
                <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
                <span>One-time activation link securely validated</span>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AcceptInvite;
