import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Plus,
  Search,
  Shield,
  Edit,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  RotateCw,
  Loader2,
  Calendar,
  Clock,
  UserCheck,
  UserX
} from "lucide-react";
import toast from "react-hot-toast";

import { useAuth } from "../../context/admin/AuthContext";
import staffService from "../../services/admin/staffService";
import Modal from "../../components/admin/common/Modal";
import ConfirmDialog from "../../components/admin/common/ConfirmDialog";
import EmptyState from "../../components/admin/common/EmptyState";
import StaffAvatar from "../../components/admin/common/StaffAvatar";
import StatusBadge from "../../components/admin/common/StatusBadge";
import Pagination from "../../components/admin/common/Pagination";

export const Authors = () => {
  const { admin: currentAdmin } = useAuth();

  // Staff and Stats State
  const [staffList, setStaffList] = useState([]);
  const [stats, setStats] = useState({
    totalStaff: 0,
    superAdmins: 0,
    editors: 0,
    authors: 0,
    activeAccounts: 0,
    pendingInvitations: 0,
    disabledAccounts: 0
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1
  });

  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modals State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isShareLinkModalOpen, setIsShareLinkModalOpen] = useState(false);
  const [shareLinkData, setShareLinkData] = useState({
    name: "",
    email: "",
    url: ""
  });
  const [copiedLink, setCopiedLink] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);

  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [roleStaff, setRoleStaff] = useState(null);
  const [selectedRole, setSelectedRole] = useState("author");

  const [statusConfirmTarget, setStatusConfirmTarget] = useState(null);

  // Form states
  const [inviteForm, setInviteForm] = useState({
    name: "",
    email: "",
    role: "author"
  });
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    bio: ""
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch real staff list from backend
  const fetchStaff = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await staffService.getStaff({
        search: searchQuery,
        role: roleFilter,
        status: statusFilter,
        page: pagination.page,
        limit: pagination.limit
      });

      if (res.success && res.data) {
        setStaffList(res.data.staff);
        setPagination(res.data.pagination);
        setStats(res.data.stats);
      }
    } catch (err) {
      toast.error(err.message || "Failed to load newsroom team records.");
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, roleFilter, statusFilter, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  // Open Invite Modal
  const handleOpenInvite = () => {
    setInviteForm({ name: "", email: "", role: "author" });
    setFormErrors({});
    setIsInviteModalOpen(true);
  };

  // Submit Invite Form
  const handleSubmitInvite = async (e) => {
    e.preventDefault();
    setFormErrors({});

    const errors = {};
    if (!inviteForm.name.trim()) errors.name = "Full name is required";
    if (!inviteForm.email.trim()) errors.email = "Email address is required";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await staffService.inviteStaff({
        name: inviteForm.name.trim(),
        email: inviteForm.email.trim(),
        role: inviteForm.role
      });

      if (res.success && res.data) {
        setIsInviteModalOpen(false);
        setShareLinkData({
          name: res.data.staff.name,
          email: res.data.staff.email,
          url: res.data.inviteUrl,
          notice: res.data.notice, emailStatus: res.data.emailStatus
        });
        setCopiedLink(false);
        setIsShareLinkModalOpen(true);
        toast.success("Invitation created. See the email submission status below.");
        fetchStaff();
      }
    } catch (err) {
      if (err.errors) {
        setFormErrors(err.errors);
      } else {
        toast.error(err.message || "Failed to create staff invitation.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Copy shareable invitation link
  const handleCopyInviteLink = () => {
    if (shareLinkData.url) {
      navigator.clipboard.writeText(shareLinkData.url);
      setCopiedLink(true);
      toast.success("One-time invitation link copied to clipboard!");
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  // Re-invite pending staff member
  const handleReinvite = async (staff) => {
    try {
      const res = await staffService.reinviteStaff(staff._id);
      if (res.success && res.data) {
        setShareLinkData({
          name: staff.name,
          email: staff.email,
          url: res.data.inviteUrl,
          notice: res.data.notice, emailStatus: res.data.emailStatus
        });
        setCopiedLink(false);
        setIsShareLinkModalOpen(true);
        toast.success("Invitation renewed. See the email submission status below.");
        fetchStaff();
      }
    } catch (err) {
      toast.error(err.message || "Failed to generate new invitation.");
    }
  };

  // Open Edit Details Modal
  const handleOpenEdit = (staff) => {
    setEditingStaff(staff);
    setEditForm({
      name: staff.name || "",
      phone: staff.phone || "",
      bio: staff.bio || ""
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  // Submit Edit Details
  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    if (!editingStaff) return;

    if (!editForm.name.trim()) {
      setFormErrors({ name: "Full name cannot be empty" });
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await staffService.updateStaff(editingStaff._id, editForm);
      if (res.success) {
        toast.success("Staff profile updated successfully.");
        setIsEditModalOpen(false);
        fetchStaff();
      }
    } catch (err) {
      if (err.errors) {
        setFormErrors(err.errors);
      } else {
        toast.error(err.message || "Failed to update staff member.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Change Role Modal
  const handleOpenRoleModal = (staff) => {
    setRoleStaff(staff);
    setSelectedRole(staff.role === "editor" ? "editor" : "author");
    setIsRoleModalOpen(true);
  };

  // Submit Change Role
  const handleSubmitRoleChange = async () => {
    if (!roleStaff) return;
    try {
      setIsSubmitting(true);
      const res = await staffService.changeStaffRole(roleStaff._id, selectedRole);
      if (res.success) {
        toast.success(`Role updated to ${selectedRole === "editor" ? "Editor" : "Author"}.`);
        setIsRoleModalOpen(false);
        fetchStaff();
      }
    } catch (err) {
      toast.error(err.message || "Failed to change staff role.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Staff Status (Deactivate / Reactivate)
  const handleConfirmStatusChange = async () => {
    if (!statusConfirmTarget) return;
    const newStatus = statusConfirmTarget.status === "active" ? "disabled" : "active";

    try {
      setIsSubmitting(true);
      const res = await staffService.changeStaffStatus(statusConfirmTarget._id, newStatus);
      if (res.success) {
        toast.success(
          `Staff account ${newStatus === "disabled" ? "deactivated" : "reactivated"} successfully.`
        );
        setStatusConfirmTarget(null);
        fetchStaff();
      }
    } catch (err) {
      toast.error(err.message || "Failed to change staff account status.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatRole = (role) => {
    if (role === "super_admin") return "Super Admin";
    if (role === "editor") return "Editor";
    return "Author";
  };

  const formatStatus = (status) => {
    if (status === "active") return "Active";
    if (status === "invited") return "Invited";
    return "Disabled";
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Newsroom Team
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage newsroom administrators, editors, authors, and their access permissions.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenInvite}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white rounded-xl text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus size={16} />
          <span>Invite Team Member</span>
        </button>
      </div>

      {/* Staff Summary Counters (Calculated from real MongoDB records) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Total Staff
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {stats.totalStaff}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] font-semibold text-purple-600 uppercase tracking-wider">
            Super Admins
          </div>
          <div className="text-2xl font-black text-purple-900 mt-1">
            {stats.superAdmins}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">
            Editors
          </div>
          <div className="text-2xl font-black text-blue-900 mt-1">
            {stats.editors}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider">
            Authors
          </div>
          <div className="text-2xl font-black text-indigo-900 mt-1">
            {stats.authors}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">
            Active Accounts
          </div>
          <div className="text-2xl font-black text-emerald-900 mt-1">
            {stats.activeAccounts}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">
            Pending Invites
          </div>
          <div className="text-2xl font-black text-amber-900 mt-1">
            {stats.pendingInvitations}
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search staff by name or email..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 font-medium">Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 text-xs font-semibold text-slate-700 focus:outline-hidden"
            >
              <option value="all">All Roles</option>
              <option value="super_admin">Super Admin</option>
              <option value="editor">Editor</option>
              <option value="author">Author</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 text-xs font-semibold text-slate-700 focus:outline-hidden"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="invited">Invited</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Loader2 size={32} className="animate-spin text-blue-600 mb-2" />
            <span className="text-xs font-medium">Loading newsroom staff records...</span>
          </div>
        ) : staffList.length === 0 ? (
          <div className="py-12">
            <EmptyState
              icon={Users}
              title="No staff members found"
              description="No newsroom team members match your filter criteria."
              actionLabel="Invite First Member"
              onAction={handleOpenInvite}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 uppercase tracking-wider text-[11px] font-semibold">
                  <th className="py-3.5 px-4 sm:px-6">Staff Member</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Account Status</th>
                  <th className="py-3.5 px-4 hidden md:table-cell">Date Joined</th>
                  <th className="py-3.5 px-4 hidden lg:table-cell">Last Login</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {staffList.map((staff) => {
                  const isSelf = currentAdmin?._id === staff._id;
                  const isSuperAdmin = staff.role === "super_admin";

                  return (
                    <tr
                      key={staff._id}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <StaffAvatar
                            src={staff.avatar}
                            name={staff.name}
                            className="w-9 h-9 rounded-xl ring-1 ring-slate-200"
                          />
                          <div className="truncate">
                            <div className="font-bold text-slate-900 truncate flex items-center gap-1.5">
                              <span>{staff.name}</span>
                              {isSelf && (
                                <span className="px-1.5 py-0.2 bg-blue-100 text-blue-700 rounded text-[9px] font-bold">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">
                              {staff.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            staff.role === "super_admin"
                              ? "bg-purple-100 text-purple-800"
                              : staff.role === "editor"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {formatRole(staff.role)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <StatusBadge status={formatStatus(staff.status)} size="sm" />
                        {staff.invitation && <p className="text-[10px] text-slate-500 mt-1">{staff.invitation.expired ? "Invitation expired" : staff.invitation.emailStatus.replaceAll("_", " ")} · {staff.invitation.emailAttempts} email attempts</p>}
                      </td>

                      {/* Date Joined */}
                      <td className="py-3.5 px-4 hidden md:table-cell text-slate-500">
                        {staff.createdAt
                          ? new Date(staff.createdAt).toLocaleDateString()
                          : "—"}
                      </td>

                      {/* Last Login */}
                      <td className="py-3.5 px-4 hidden lg:table-cell text-slate-500">
                        {staff.lastLoginAt
                          ? new Date(staff.lastLoginAt).toLocaleString()
                          : "Never"}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          {/* Re-invite Button for pending accounts */}
                          {staff.status === "invited" && (
                            <button
                              type="button"
                              onClick={() => handleReinvite(staff)}
                              title="Re-issue invitation link"
                              className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <RotateCw size={15} />
                            </button>
                          )}

                          {/* Edit Details */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(staff)}
                            title="Edit staff details"
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit size={15} />
                          </button>

                          {/* Role Transition Button (Editor <-> Author) */}
                          {!isSuperAdmin && (
                            <button
                              type="button"
                              onClick={() => handleOpenRoleModal(staff)}
                              title="Change Role"
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer text-[11px] font-semibold"
                            >
                              Role
                            </button>
                          )}

                          {/* Status Toggle (Deactivate / Activate) */}
                          {!isSelf && !isSuperAdmin && staff.status !== "invited" && (
                            <button
                              type="button"
                              onClick={() => setStatusConfirmTarget(staff)}
                              title={
                                staff.status === "active"
                                  ? "Deactivate Account"
                                  : "Reactivate Account"
                              }
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                staff.status === "active"
                                  ? "text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                                  : "text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50"
                              }`}
                            >
                              {staff.status === "active" ? (
                                <UserX size={15} />
                              ) : (
                                <UserCheck size={15} />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Showing page {pagination.page} of {pagination.totalPages} ({pagination.total}{" "}
              total members)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                }
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                }
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal 1: Invite Team Member */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Invite Newsroom Team Member"
      >
        <form onSubmit={handleSubmitInvite} className="space-y-4">
          <p className="text-xs text-slate-500">
            Invite an Editor or Author to join the Nsemra News newsroom. They will receive a
            secure one-time link to set their password.
          </p>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Kwame Mensah"
              value={inviteForm.name}
              onChange={(e) =>
                setInviteForm((prev) => ({ ...prev, name: e.target.value }))
              }
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            />
            {formErrors.name && (
              <p className="mt-1 text-xs text-rose-500">{formErrors.name}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              required
              placeholder="colleague@example.com"
              value={inviteForm.email}
              onChange={(e) =>
                setInviteForm((prev) => ({ ...prev, email: e.target.value }))
              }
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            />
            {formErrors.email && (
              <p className="mt-1 text-xs text-rose-500">{formErrors.email}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Administrative Role <span className="text-rose-500">*</span>
            </label>
            <select
              value={inviteForm.role}
              onChange={(e) =>
                setInviteForm((prev) => ({ ...prev, role: e.target.value }))
              }
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="editor">Editor (Manages and publishes newsroom articles)</option>
              <option value="author">Author (Drafts and submits own articles)</option>
            </select>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsInviteModalOpen(false)}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Issuing Invitation...</span>
                </>
              ) : (
                <span>Generate Invitation Link</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Share One-Time Invitation Link */}
      <Modal
        isOpen={isShareLinkModalOpen}
        onClose={() => setIsShareLinkModalOpen(false)}
        title="Share One-Time Invitation Link"
      >
        <div className="space-y-4">
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-2.5">
            <ShieldAlert size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Email Service Notice:</strong> {shareLinkData.notice}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              One-Time Activation URL (Expires in 24 hours)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareLinkData.url}
                className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl text-xs text-slate-800 font-mono select-all focus:outline-hidden"
              />
              <button
                type="button"
                onClick={handleCopyInviteLink}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shrink-0 flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedLink ? "Copied!" : "Copy Link"}</span>
              </button>
            </div>
          </div>

          <div className="pt-2 text-[11px] text-slate-400">
            • Link can be used exactly once. Once set, the account transitions to Active.
          </div>

          <div className="pt-2 flex justify-end border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsShareLinkModalOpen(false)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal 3: Edit Staff Member */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Staff Member: ${editingStaff?.name}`}
      >
        <form onSubmit={handleSubmitEdit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={editForm.name}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, name: e.target.value }))
              }
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Telephone
            </label>
            <input
              type="text"
              value={editForm.phone}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, phone: e.target.value }))
              }
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Newsroom Biography
            </label>
            <textarea
              rows={3}
              value={editForm.bio}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, bio: e.target.value }))
              }
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-60"
            >
              Save Details
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 4: Change Role */}
      <Modal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        title={`Change Administrative Role: ${roleStaff?.name}`}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Select the new administrative role for this staff member. Their active session
            will be updated immediately.
          </p>

          <div className="space-y-2">
            <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer">
              <input
                type="radio"
                name="roleOption"
                value="editor"
                checked={selectedRole === "editor"}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="text-blue-600"
              />
              <div>
                <div className="text-xs font-bold text-slate-900">Editor</div>
                <div className="text-[11px] text-slate-500">
                  Can create, review, edit, and publish articles across newsroom desks.
                </div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer">
              <input
                type="radio"
                name="roleOption"
                value="author"
                checked={selectedRole === "author"}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="text-blue-600"
              />
              <div>
                <div className="text-xs font-bold text-slate-900">Author</div>
                <div className="text-[11px] text-slate-500">
                  Can draft articles and submit them for editorial review.
                </div>
              </div>
            </label>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsRoleModalOpen(false)}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmitRoleChange}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-60"
            >
              Confirm Role Change
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirmation Dialog: Status Change */}
      <ConfirmDialog
        isOpen={Boolean(statusConfirmTarget)}
        onClose={() => setStatusConfirmTarget(null)}
        onConfirm={handleConfirmStatusChange}
        title={
          statusConfirmTarget?.status === "active"
            ? `Deactivate ${statusConfirmTarget?.name}'s Account?`
            : `Reactivate ${statusConfirmTarget?.name}'s Account?`
        }
        message={
          statusConfirmTarget?.status === "active"
            ? "Deactivating this staff account will immediately revoke all their active sessions and prevent future sign-ins. Their articles, bylines, and editorial history will remain safely intact."
            : "Reactivating this staff account will allow them to sign in and resume newsroom duties."
        }
        confirmText={
          statusConfirmTarget?.status === "active" ? "Deactivate Account" : "Reactivate"
        }
        type={statusConfirmTarget?.status === "active" ? "danger" : "primary"}
      />
    </div>
  );
};

export default Authors;
