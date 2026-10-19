import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  ImagePlus,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../context/admin/AuthContext";
import { useSiteSettings } from "../../context/SiteSettingsContext";
import profileService from "../../services/admin/profileService";
import mediaService from "../../services/admin/mediaService";
import StaffAvatar from "../../components/admin/common/StaffAvatar";

const emptyForm = { name: "", phone: "", bio: "" };
const emptyPassword = { currentPassword: "", newPassword: "", confirmPassword: "" };
const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";
const errorText = (error) => (Array.isArray(error) ? error.join(" ") : error);
const formatDate = (date, withDay = false) =>
  date
    ? new Date(date).toLocaleDateString("en-GB", {
        ...(withDay ? { day: "numeric" } : {}),
        month: "short",
        year: "numeric",
      })
    : "Not recorded";

function PasswordField({ id, label, value, error, onChange, current = false }) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-xs font-semibold text-slate-700">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          required
          maxLength={current ? undefined : 128}
          type={visible ? "text" : "password"}
          autoComplete={current ? "current-password" : "new-password"}
          value={value}
          onChange={onChange}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`${inputClass} pr-12`}
        />
        <button
          type="button"
          aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-blue-600"
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-rose-600">
          {errorText(error)}
        </p>
      )}
    </div>
  );
}

export default function Profile() {
  const { updateAdminState, logout } = useAuth();
  const { settings } = useSiteSettings();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reload, setReload] = useState(0);
  const [errors, setErrors] = useState({});
  const [saveError, setSaveError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveStage, setSaveStage] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [photoAction, setPhotoAction] = useState("keep");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [readingPhoto, setReadingPhoto] = useState(false);
  const fileInput = useRef(null);
  const uploadedMedia = useRef(null);
  const photoSelection = useRef(0);
  const [securityOpen, setSecurityOpen] = useState(false);
  const [password, setPassword] = useState(emptyPassword);
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordError, setPasswordError] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    let active = true;
    const photoRequests = photoSelection;
    profileService
      .getProfile()
      .then((result) => {
        if (!active) return;
        if (!result.success || !result.admin) throw new Error("Your profile could not be loaded.");
        setProfile(result.admin);
        setForm({
          name: result.admin.name || "",
          bio: result.admin.bio || "",
          phone: result.admin.phone || "",
        });
        setLoadError("");
      })
      .catch((error) => {
        if (active) setLoadError(error.message || "Your profile could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      photoRequests.current++;
    };
  }, [reload]);

  useEffect(
    () => () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    },
    [photoPreview]
  );
  const dirty = Boolean(
    profile &&
    (photoAction !== "keep" ||
      Object.keys(emptyForm).some((key) => form[key] !== (profile[key] || "")))
  );
  useEffect(() => {
    if (!dirty) return;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const change = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
    setNotice("");
  };
  const choosePhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setPhotoError("");
    setNotice("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setPhotoError("Choose a JPG, PNG or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError("Your photo must be 5 MB or smaller.");
      return;
    }
    const selection = ++photoSelection.current;
    setReadingPhoto(true);
    try {
      const bitmap = await createImageBitmap(file);
      const tooLarge = bitmap.width > 12000 || bitmap.height > 12000;
      bitmap.close();
      if (selection !== photoSelection.current) return;
      if (tooLarge) throw new Error("Choose an image smaller than 12,000 pixels on each side.");
      uploadedMedia.current = null;
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
      setPhotoAction("upload");
    } catch (error) {
      if (selection === photoSelection.current)
        setPhotoError(
          error.message.includes("12,000")
            ? error.message
            : "This image could not be opened. Please choose another photo."
        );
    } finally {
      if (selection === photoSelection.current) setReadingPhoto(false);
    }
  };
  const removePhoto = () => {
    photoSelection.current++;
    uploadedMedia.current = null;
    setPhotoFile(null);
    setPhotoPreview("");
    setPhotoAction(profile.avatar ? "remove" : "keep");
    setPhotoError("");
    setNotice("");
  };
  const discard = () => {
    setForm({ name: profile.name || "", bio: profile.bio || "", phone: profile.phone || "" });
    setPhotoAction("keep");
    setPhotoFile(null);
    setPhotoPreview("");
    uploadedMedia.current = null;
    setErrors({});
    setSaveError("");
    setPhotoError("");
    setNotice("");
  };
  const saveProfile = async (event) => {
    event.preventDefault();
    setErrors({});
    setSaveError("");
    setNotice("");
    if (form.name.trim().length < 2) {
      setErrors({ name: "Please enter at least two characters." });
      return;
    }
    setSaving(true);
    try {
      const body = { name: form.name.trim(), phone: form.phone.trim(), bio: form.bio.trim() };
      if (photoAction === "upload") {
        if (!uploadedMedia.current) {
          setSaveStage("upload");
          setUploadProgress(0);
          const result = await mediaService.uploadSingle(
            photoFile,
            {
              folder: "authors",
              name: `${body.name} — profile photo`.slice(0, 150),
              altText: `Profile photo of ${body.name}`.slice(0, 300),
            },
            setUploadProgress
          );
          if (!result.success || !result.data?._id)
            throw new Error("Your photo could not be uploaded. Please try again.");
          uploadedMedia.current = result.data._id;
        }
        body.avatarMedia = uploadedMedia.current;
      } else if (photoAction === "remove") body.avatarMedia = null;
      setSaveStage("profile");
      const result = await profileService.updateProfile(body);
      if (!result.success || !result.admin) throw new Error("Your changes could not be saved.");
      setProfile(result.admin);
      setForm({
        name: result.admin.name || "",
        bio: result.admin.bio || "",
        phone: result.admin.phone || "",
      });
      updateAdminState(result.admin);
      setPhotoAction("keep");
      setPhotoFile(null);
      setPhotoPreview("");
      uploadedMedia.current = null;
      setNotice("Your profile is up to date.");
      toast.success("Profile updated.");
    } catch (error) {
      setErrors(error.errors || {});
      setSaveError(error.message || "Your changes could not be saved. Please try again.");
    } finally {
      setSaving(false);
      setSaveStage("");
    }
  };
  const savePassword = async (event) => {
    event.preventDefault();
    setPasswordErrors({});
    setPasswordError("");
    if (dirty) {
      setPasswordError("Save or discard your profile changes before changing your password.");
      return;
    }
    const nextErrors = {};
    if (!password.currentPassword) nextErrors.currentPassword = "Enter your current password.";
    if (
      password.newPassword.length < 8 ||
      !/[a-zA-Z]/.test(password.newPassword) ||
      !/\d/.test(password.newPassword)
    )
      nextErrors.newPassword = "Use at least 8 characters, including a letter and a number.";
    if (password.newPassword === password.currentPassword)
      nextErrors.newPassword = "Choose a different password from your current one.";
    if (password.newPassword !== password.confirmPassword)
      nextErrors.confirmPassword = "The passwords don’t match.";
    if (Object.keys(nextErrors).length) {
      setPasswordErrors(nextErrors);
      return;
    }
    setSavingPassword(true);
    try {
      const result = await profileService.changePassword(password);
      if (!result.success) throw new Error("Your password could not be updated.");
      setPassword(emptyPassword);
      toast.success("Password changed. Sign in with your new password.");
      await logout();
      navigate("/admin/login", { replace: true });
    } catch (error) {
      setPasswordErrors(error.errors || {});
      setPasswordError(error.message || "Your password could not be updated.");
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading)
    return (
      <div
        className="flex min-h-[55vh] flex-col items-center justify-center gap-4 text-slate-500"
        role="status"
      >
        <Loader2 className="animate-spin text-blue-600" size={28} />
        <p className="text-sm">Getting your profile ready…</p>
      </div>
    );
  if (loadError || !profile)
    return (
      <div className="rounded-2xl border border-rose-100 bg-white p-8">
        <h1 className="text-xl font-bold">We couldn’t load your profile</h1>
        <p role="alert" className="mt-3 text-sm text-slate-500">
          {loadError}
        </p>
        <button
          onClick={() => {
            setLoading(true);
            setReload((value) => value + 1);
          }}
          className="mt-5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"
        >
          Try again
        </button>
      </div>
    );

  const role =
    { super_admin: "Super Admin", editor: "Editor", author: "Author" }[profile.role] || "Staff";
  const avatar =
    photoAction === "upload" ? photoPreview : photoAction === "remove" ? "" : profile.avatar;
  const busy = saving || readingPhoto || savingPassword;
  const passwordRules = [
    password.newPassword.length >= 8,
    /[a-zA-Z]/.test(password.newPassword) && /\d/.test(password.newPassword),
  ];
  return (
    <div className="mx-auto max-w-6xl space-y-7 pb-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600">
            Your workspace
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-[34px]">
            My profile<span className="text-blue-600">.</span>
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            A little about you. A consistent identity across the newsroom.
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-medium ${dirty ? "border-amber-200 bg-amber-50 text-amber-700" : "border-slate-200 bg-white text-slate-500"}`}
        >
          {dirty ? (
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          ) : (
            <CheckCircle2 size={13} className="text-emerald-600" />
          )}
          {dirty ? "Unsaved changes" : "All changes saved"}
        </span>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-xs">
          <div className="relative h-24 overflow-hidden bg-[#0B1B3A]">
            <div
              aria-hidden="true"
              className="absolute -right-2 -top-6 text-[100px] font-black leading-none tracking-tighter text-white/[0.04]"
            >
              NN
            </div>
            <div
              aria-hidden="true"
              className="absolute right-6 top-0 h-full w-12 -skew-x-[25deg] border-x border-white/10 bg-white/[0.03]"
            />
            <p className="absolute left-6 top-5 text-[9px] font-semibold uppercase tracking-[0.18em] text-blue-200/70">
              {settings?.general.siteName || "NSEMRA NEWS"} / People
            </p>
          </div>
          <div className="px-6 pb-6">
            <div className="relative -mt-10 mb-4 inline-flex">
              <StaffAvatar
                src={avatar}
                name={form.name || profile.name}
                className="h-24 w-24 rounded-[22px] ring-[5px] ring-white shadow-sm"
                textClassName="text-3xl"
              />
              <button
                type="button"
                aria-label="Change profile photo"
                disabled={busy}
                onClick={() => fileInput.current?.click()}
                className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-xl border-[3px] border-white bg-blue-600 text-white transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50"
              >
                <Camera size={13} />
              </button>
            </div>
            <h2 className="break-words text-xl font-bold tracking-tight text-slate-900">
              {form.name || profile.name}
            </h2>
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-blue-100 bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700">
              <ShieldCheck size={12} />
              {role}
            </span>
            <div className="my-5 border-t border-slate-100" />
            <dl className="space-y-5 text-xs">
              <div>
                <dt className="mb-1.5 text-[10px] font-medium text-slate-400">Work email</dt>
                <dd className="break-all font-medium text-slate-700">{profile.email}</dd>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <dt className="mb-1.5 text-[10px] font-medium text-slate-400">Member since</dt>
                  <dd className="font-medium text-slate-700">{formatDate(profile.createdAt)}</dd>
                </div>
                <div>
                  <dt className="mb-1.5 text-[10px] font-medium text-slate-400">Last sign-in</dt>
                  <dd className="font-medium text-slate-700">
                    {formatDate(profile.lastLoginAt, true)}
                  </dd>
                </div>
              </div>
            </dl>
            <div className="mt-6 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-[10px] font-medium text-slate-500">
              <span
                className={`h-1.5 w-1.5 rounded-full ${profile.status === "active" ? "bg-emerald-500" : "bg-slate-400"}`}
              />
              {profile.status === "active" ? "Active newsroom account" : "Newsroom account"}
            </div>
          </div>
        </aside>

        <div className="min-w-0 space-y-6">
          <form
            onSubmit={saveProfile}
            aria-labelledby="profile-details-title"
            className="overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-xs"
          >
            <div className="border-b border-slate-100 px-5 py-5 sm:px-7">
              <div className="flex items-center gap-2">
                <UserRound size={16} className="text-blue-600" />
                <h2 id="profile-details-title" className="text-sm font-bold text-slate-900">
                  Personal information
                </h2>
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                Make it easy for your team and readers to recognise you.
              </p>
            </div>
            <fieldset disabled={busy} className="min-w-0 space-y-6 px-5 py-6 sm:px-7">
              <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                <StaffAvatar
                  src={avatar}
                  name={form.name || profile.name}
                  className="h-14 w-14 rounded-full border-2 border-white shadow-xs"
                  textClassName="text-lg"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-800">Profile photo</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                    A clear photo helps put a face to your stories.
                  </p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileInput.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
                    >
                      <ImagePlus size={12} />
                      {readingPhoto ? "Opening photo…" : avatar ? "Change photo" : "Upload photo"}
                    </button>
                    {avatar && (
                      <button
                        type="button"
                        onClick={removePhoto}
                        className="text-[11px] font-medium text-slate-500 hover:text-rose-600"
                      >
                        Remove photo
                      </button>
                    )}
                    <span className="text-[10px] text-slate-400">JPG, PNG or WebP · Max 5 MB</span>
                  </div>
                </div>
              </div>
              <input
                ref={fileInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-label="Choose profile photo"
                className="hidden"
                onChange={choosePhoto}
              />
              {photoAction !== "keep" && (
                <p role="status" className="-mt-3 flex items-center gap-1.5 text-xs text-blue-600">
                  <Check size={13} />
                  {photoAction === "remove"
                    ? "Your photo will be removed when you save."
                    : "New photo ready. Save your changes to update it."}
                </p>
              )}
              {(photoError || errors.avatarMedia) && (
                <p role="alert" className="text-xs text-rose-600">
                  {photoError || errorText(errors.avatarMedia)}
                </p>
              )}
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="profile-name"
                    className="mb-2 block text-xs font-semibold text-slate-700"
                  >
                    Full name <span className="text-blue-600">*</span>
                  </label>
                  <input
                    id="profile-name"
                    required
                    minLength={2}
                    maxLength={100}
                    autoComplete="name"
                    value={form.name}
                    onChange={(e) => change("name", e.target.value)}
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={errors.name ? "profile-name-error" : undefined}
                    className={inputClass}
                  />
                  {errors.name && (
                    <p id="profile-name-error" className="mt-1.5 text-xs text-rose-600">
                      {errorText(errors.name)}
                    </p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="profile-email"
                    className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-700"
                  >
                    Email address <LockKeyhole size={11} className="text-slate-400" />
                  </label>
                  <input
                    id="profile-email"
                    type="email"
                    readOnly
                    value={profile.email}
                    aria-describedby="profile-email-help"
                    className={`${inputClass} bg-slate-50 text-slate-500`}
                  />
                  <p id="profile-email-help" className="mt-1.5 text-[10px] text-slate-400">
                    Managed by your newsroom administrator.
                  </p>
                </div>
              </div>
              <div className="sm:max-w-[calc(50%-10px)]">
                <label
                  htmlFor="profile-phone"
                  className="mb-2 block text-xs font-semibold text-slate-700"
                >
                  Phone number <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <input
                  id="profile-phone"
                  type="tel"
                  maxLength={30}
                  autoComplete="tel"
                  placeholder="e.g. +233 24 000 0000"
                  value={form.phone}
                  onChange={(e) => change("phone", e.target.value)}
                  aria-invalid={Boolean(errors.phone)}
                  aria-describedby={errors.phone ? "profile-phone-error" : undefined}
                  className={inputClass}
                />
                {errors.phone && (
                  <p id="profile-phone-error" className="mt-1.5 text-xs text-rose-600">
                    {errorText(errors.phone)}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="profile-bio"
                  className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-700"
                >
                  Short bio{" "}
                  <span className="text-[10px] font-normal text-slate-400">
                    {form.bio.length}/500
                  </span>
                </label>
                <textarea
                  id="profile-bio"
                  rows={4}
                  maxLength={500}
                  placeholder="Your role, the stories you cover, and what drives your work…"
                  value={form.bio}
                  onChange={(e) => change("bio", e.target.value)}
                  aria-invalid={Boolean(errors.bio)}
                  aria-describedby={errors.bio ? "profile-bio-error" : "profile-bio-help"}
                  className={`${inputClass} min-h-28 resize-y leading-relaxed`}
                />
                <p id="profile-bio-help" className="mt-2 text-[10px] text-slate-400">
                  A short introduction for your author profile.
                </p>
                {errors.bio && (
                  <p id="profile-bio-error" className="mt-1.5 text-xs text-rose-600">
                    {errorText(errors.bio)}
                  </p>
                )}
              </div>
            </fieldset>
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 bg-slate-50/50 px-5 py-4 sm:px-7">
              <div className="text-[11px] text-slate-400">
                {notice ? (
                  <span role="status" className="inline-flex items-center gap-1.5 text-emerald-700">
                    <CheckCircle2 size={13} />
                    {notice}
                  </span>
                ) : (
                  "Your profile, everywhere you work."
                )}
              </div>
              <div className="flex items-center gap-2">
                {dirty && (
                  <button
                    type="button"
                    onClick={discard}
                    disabled={busy}
                    className="rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                  >
                    Discard
                  </button>
                )}
                <button
                  type="submit"
                  disabled={busy || !dirty}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  {saving
                    ? saveStage === "upload"
                      ? `Uploading photo… ${uploadProgress}%`
                      : "Saving changes…"
                    : "Save changes"}
                </button>
              </div>
            </div>
            {saveError && (
              <p
                role="alert"
                className="border-t border-rose-100 bg-rose-50 px-5 py-3 text-xs text-rose-700 sm:px-7"
              >
                {saveError}
              </p>
            )}
          </form>

          <section
            className="overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-xs"
            aria-labelledby="profile-security-title"
          >
            <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-7">
              <div>
                <h2
                  id="profile-security-title"
                  className="flex items-center gap-2 text-sm font-bold text-slate-900"
                >
                  <LockKeyhole size={16} className="text-blue-600" />
                  Password & security
                </h2>
                <p className="mt-1.5 text-xs text-slate-500">Keep your newsroom account secure.</p>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700">
                <ShieldCheck size={13} />
                Password protected
              </span>
            </div>
            <div className="mx-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 py-5 sm:mx-7">
              <div>
                <h3 className="text-xs font-semibold text-slate-700">Account password</h3>
                <p className="mt-1 text-[11px] text-slate-400">
                  {profile.passwordChangedAt
                    ? `Last updated ${formatDate(profile.passwordChangedAt, true)}`
                    : "Use a strong, unique password for this account."}
                </p>
              </div>
              <button
                type="button"
                aria-expanded={securityOpen}
                aria-controls="password-editor"
                onClick={() => setSecurityOpen((open) => !open)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2 text-[11px] font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
              >
                {securityOpen ? "Close" : "Change password"}
                <ChevronDown
                  size={12}
                  className={`transition-transform ${securityOpen ? "rotate-180" : ""}`}
                />
              </button>
            </div>
            {securityOpen && (
              <form
                id="password-editor"
                onSubmit={savePassword}
                className="space-y-5 border-t border-slate-100 px-5 py-6 sm:px-7"
              >
                <p className="rounded-xl bg-blue-50 px-4 py-3 text-xs leading-relaxed text-blue-800">
                  Changing your password signs you out of all current sessions. You’ll sign in again
                  with your new password.
                </p>
                <fieldset disabled={savingPassword || saving || readingPhoto} className="space-y-4">
                  <PasswordField
                    id="current-password"
                    label="Current password"
                    current
                    value={password.currentPassword}
                    error={passwordErrors.currentPassword}
                    onChange={(e) =>
                      setPassword((prev) => ({ ...prev, currentPassword: e.target.value }))
                    }
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <PasswordField
                      id="new-password"
                      label="New password"
                      value={password.newPassword}
                      error={passwordErrors.newPassword}
                      onChange={(e) =>
                        setPassword((prev) => ({ ...prev, newPassword: e.target.value }))
                      }
                    />
                    <PasswordField
                      id="confirm-password"
                      label="Confirm new password"
                      value={password.confirmPassword}
                      error={passwordErrors.confirmPassword}
                      onChange={(e) =>
                        setPassword((prev) => ({ ...prev, confirmPassword: e.target.value }))
                      }
                    />
                  </div>
                  <div className="flex flex-wrap gap-x-5 gap-y-2 text-[10px] text-slate-400">
                    {["At least 8 characters", "A letter and a number"].map((rule, index) => (
                      <span
                        key={rule}
                        className={`inline-flex items-center gap-1 ${passwordRules[index] ? "text-emerald-600" : ""}`}
                      >
                        <Check size={11} />
                        {rule}
                      </span>
                    ))}
                  </div>
                  {passwordError && (
                    <p role="alert" className="text-xs text-rose-600">
                      {passwordError}
                    </p>
                  )}
                  <div className="flex justify-end">
                    <button
                      disabled={savingPassword}
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      {savingPassword ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <LockKeyhole size={13} />
                      )}
                      {savingPassword ? "Updating password…" : "Update password"}
                    </button>
                  </div>
                </fieldset>
              </form>
            )}
          </section>
          <p className="flex items-center justify-center gap-1.5 text-center text-[10px] text-slate-400">
            <ShieldCheck size={12} />
            Your account. Your stories. Your impact.
          </p>
        </div>
      </div>
    </div>
  );
}
