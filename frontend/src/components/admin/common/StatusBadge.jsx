import React from "react";

const statusConfig = {
  // Articles
  Published: {
    bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
    label: "Published"
  },
  Draft: {
    bg: "bg-slate-100 text-slate-700 border-slate-200",
    dot: "bg-slate-400",
    label: "Draft"
  },
  "Pending Review": {
    bg: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500 animate-pulse",
    label: "Pending Review"
  },
  "Under Review": {
    bg: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
    label: "Under Review"
  },
  Scheduled: {
    bg: "bg-indigo-50 text-indigo-700 border-indigo-200",
    dot: "bg-indigo-500",
    label: "Scheduled"
  },
  Rejected: {
    bg: "bg-rose-50 text-rose-700 border-rose-200",
    dot: "bg-rose-500",
    label: "Rejected"
  },
  "Changes Requested": {
    bg: "bg-orange-50 text-orange-700 border-orange-200",
    dot: "bg-orange-500",
    label: "Changes Requested"
  },
  Archived: {
    bg: "bg-zinc-100 text-zinc-600 border-zinc-200",
    dot: "bg-zinc-400",
    label: "Archived"
  },
  published: {
    bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
    label: "Published"
  },
  draft: {
    bg: "bg-slate-100 text-slate-700 border-slate-200",
    dot: "bg-slate-400",
    label: "Draft"
  },
  pending_review: {
    bg: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500 animate-pulse",
    label: "Pending Review"
  },
  scheduled: {
    bg: "bg-indigo-50 text-indigo-700 border-indigo-200",
    dot: "bg-indigo-500",
    label: "Scheduled"
  },
  archived: {
    bg: "bg-zinc-100 text-zinc-600 border-zinc-200",
    dot: "bg-zinc-400",
    label: "Archived"
  },

  // Comments / Team / Ads
  Approved: {
    bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
    label: "Approved"
  },
  Pending: {
    bg: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
    label: "Pending"
  },
  Spam: {
    bg: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-500",
    label: "Spam"
  },
  Active: {
    bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
    label: "Active"
  },
  Invited: {
    bg: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500 animate-pulse",
    label: "Invited"
  },
  Disabled: {
    bg: "bg-rose-50 text-rose-700 border-rose-200",
    dot: "bg-rose-500",
    label: "Disabled"
  },
  Inactive: {
    bg: "bg-slate-100 text-slate-500 border-slate-200",
    dot: "bg-slate-400",
    label: "Inactive"
  },
  Expired: {
    bg: "bg-rose-50 text-rose-600 border-rose-200",
    dot: "bg-rose-400",
    label: "Expired"
  }
};


export const StatusBadge = ({ status, size = "md" }) => {
  const config = statusConfig[status] || {
    bg: "bg-slate-100 text-slate-700 border-slate-200",
    dot: "bg-slate-400",
    label: status || "Unknown"
  };

  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${config.bg} ${sizeClasses} tracking-tight select-none whitespace-nowrap`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <span>{config.label}</span>
    </span>
  );
};

export default StatusBadge;
