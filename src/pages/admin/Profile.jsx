import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Phone,
  Shield,
  Save,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Loader2,
  Calendar,
  Clock,
  ShieldCheck
} from "lucide-react";
import toast from "react-hot-toast";

import { useAuth } from "../../context/admin/AuthContext";
import profileService from "../../services/admin/profileService";
import StaffAvatar from "../../components/admin/common/StaffAvatar";

export const Profile = () => {
  const { admin, updateAdminState, logout } = useAuth();
  const navigate = useNavigate();

  // Profile Information State
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    role: "",
    bio: "",
    phone: "",
    avatar: "",
    createdAt: null,
    lastLoginAt: null
  });

  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileErrors, setProfileErrors] = useState({});

  // Password Modification State
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState({});

  // Fetch real profile data on mount
  useEffect(() => {
    let isMounted = true;

    const fetchProfile = async () => {
      try {
        setIsLoadingProfile(true);
        const res = await profileService.getProfile();
        if (isMounted && res.success && res.admin) {
          setProfileData({
            name: res.admin.name || "",
            email: res.admin.email || "",
            role: res.admin.role || "author",
            bio: res.admin.bio || "",
            phone: res.admin.phone || "",
            avatar: res.admin.avatar || "",
            createdAt: res.admin.createdAt,
            lastLoginAt: res.admin.lastLoginAt
          });
        }
      } catch (err) {
        toast.error("Failed to load profile details.");
      } finally {
        if (isMounted) setIsLoadingProfile(false);
      }
    };

    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle Profile Update
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileErrors({});

    if (!profileData.name.trim()) {
      setProfileErrors({ name: "Full name cannot be empty" });
      return;
    }

    try {
      setIsSavingProfile(true);
      const res = await profileService.updateProfile({
        name: profileData.name.trim(),
        bio: profileData.bio.trim(),
        phone: profileData.phone.trim()
      });

      if (res.success && res.admin) {
        updateAdminState(res.admin);
        toast.success("Profile changes saved successfully.");
      }
    } catch (err) {
      if (err.errors) {
        setProfileErrors(err.errors);
      } else {
        toast.error(err.message || "Failed to update profile.");
      }
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle Password Change
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordErrors({});

    const errors = {};
    if (!passwordData.currentPassword) {
      errors.currentPassword = "Current password is required";
    }
    if (!passwordData.newPassword) {
      errors.newPassword = "New password is required";
    } else if (passwordData.newPassword.length < 8) {
      errors.newPassword = "New password must be at least 8 characters";
    } else if (!/^(?=.*[a-zA-Z])(?=.*[0-9])/.test(passwordData.newPassword)) {
      errors.newPassword = "Password must contain at least one letter and one number";
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    if (passwordData.currentPassword && passwordData.currentPassword === passwordData.newPassword) {
      errors.newPassword = "New password must be different from current password";
    }

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

    try {
      setIsSavingPassword(true);
      const res = await profileService.changePassword(passwordData);
      if (res.success) {
        toast.success("Password updated successfully! Please sign in with your new credentials.");
        setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
        await logout();
        navigate("/admin/login", { replace: true });
      }
    } catch (err) {
      if (err.errors) {
        setPasswordErrors(err.errors);
      } else {
        toast.error(err.message || "Failed to update password.");
      }
    } finally {
      setIsSavingPassword(false);
    }
  };

  const formattedRole =
    profileData.role === "super_admin"
      ? "Super Admin"
      : profileData.role === "editor"
      ? "Editor"
      : "Author";

  if (isLoadingProfile) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500">
        <Loader2 size={32} className="animate-spin text-blue-600 mb-3" />
        <span className="text-sm font-medium">Loading administrator profile...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl font-sans">
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Administrator Editorial Profile
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Manage your newsroom credentials, biographical summary, and account security.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Cover / Profile Banner Header */}
        <div className="h-32 bg-linear-to-r from-[#0B1B3A] to-blue-900 p-6 flex items-end">
          <div className="flex items-center gap-4 translate-y-10">
            <div className="relative group">
              <StaffAvatar
                src={profileData.avatar}
                name={profileData.name}
                className="w-20 h-20 rounded-2xl ring-4 ring-white shadow-lg"
                textClassName="text-2xl"
              />
            </div>
            <div className="translate-y-2">
              <h2 className="text-lg font-bold text-slate-900">{profileData.name}</h2>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="font-semibold text-blue-600">{profileData.email}</span>
                <span>&bull;</span>
                <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-md font-bold text-[10px]">
                  {formattedRole}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-14 p-6 sm:p-8 space-y-8">
          {/* Section 1: Personal Profile Form */}
          <form onSubmit={handleProfileSubmit} className="space-y-5">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <User size={18} className="text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Personal Information</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) =>
                    setProfileData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                />
                {profileErrors.name && (
                  <p className="mt-1 text-xs text-rose-500">{profileErrors.name}</p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Official Email (Read-Only)
                </label>
                <input
                  type="email"
                  disabled
                  value={profileData.email}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Direct Telephone Number
                </label>
                <input
                  type="text"
                  placeholder="+233 24 000 0000"
                  value={profileData.phone}
                  onChange={(e) =>
                    setProfileData((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Assigned Administrative Role
                </label>
                <input
                  type="text"
                  disabled
                  value={formattedRole}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Newsroom Biography
              </label>
              <textarea
                rows={3}
                placeholder="Brief editorial biography or correspondent notes..."
                value={profileData.bio}
                onChange={(e) =>
                  setProfileData((prev) => ({ ...prev, bio: e.target.value }))
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSavingProfile}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {isSavingProfile ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Saving Profile...</span>
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    <span>Save Profile Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Section 2: Account Security & Change Password */}
          <div className="pt-6 border-t border-slate-100 space-y-5">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Lock size={18} className="text-amber-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Security & Password Modification
              </h3>
            </div>

            <div className="p-3.5 bg-blue-50 border border-blue-200/90 rounded-2xl text-xs text-blue-900 flex items-start gap-2.5">
              <ShieldCheck size={18} className="text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong>Active Session Safeguard:</strong> Changing your password will
                immediately invalidate all current sessions and require logging in with your new
                credentials.
              </div>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {/* Current Password */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Current Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative rounded-xl">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    required
                    value={passwordData.currentPassword}
                    onChange={(e) =>
                      setPasswordData((prev) => ({
                        ...prev,
                        currentPassword: e.target.value
                      }))
                    }
                    placeholder="Enter existing password"
                    className="w-full px-3 py-2 pr-10 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {passwordErrors.currentPassword && (
                  <p className="mt-1 text-xs text-rose-500">
                    {passwordErrors.currentPassword}
                  </p>
                )}
              </div>

              {/* New Password & Confirmation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    New Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative rounded-xl">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      required
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData((prev) => ({
                          ...prev,
                          newPassword: e.target.value
                        }))
                      }
                      placeholder="Minimum 8 characters"
                      className="w-full px-3 py-2 pr-10 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {passwordErrors.newPassword && (
                    <p className="mt-1 text-xs text-rose-500">
                      {passwordErrors.newPassword}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Confirm New Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative rounded-xl">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData((prev) => ({
                          ...prev,
                          confirmPassword: e.target.value
                        }))
                      }
                      placeholder="Re-enter new password"
                      className="w-full px-3 py-2 pr-10 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {passwordErrors.confirmPassword && (
                    <p className="mt-1 text-xs text-rose-500">
                      {passwordErrors.confirmPassword}
                    </p>
                  )}
                </div>
              </div>

              {/* Password Requirement Notes */}
              <div className="text-[11px] text-slate-500 space-y-0.5 pt-1">
                <p>• Password must be at least 8 characters long</p>
                <p>• Must include at least one letter and one number</p>
                <p>• Must not match your current password</p>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingPassword}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {isSavingPassword ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Updating Credentials...</span>
                    </>
                  ) : (
                    <>
                      <Lock size={14} />
                      <span>Update Password & Re-authenticate</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Section 3: Account Audit Information */}
          <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 gap-2">
            <div className="flex items-center gap-1.5">
              <Calendar size={14} />
              <span>
                Account Created:{" "}
                {profileData.createdAt
                  ? new Date(profileData.createdAt).toLocaleDateString()
                  : "N/A"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock size={14} />
              <span>
                Last Login:{" "}
                {profileData.lastLoginAt
                  ? new Date(profileData.lastLoginAt).toLocaleString()
                  : "N/A"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
