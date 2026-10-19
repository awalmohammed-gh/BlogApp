import React from "react";
import { Clock, Eye, AlertCircle, CheckCircle2, XCircle, Ban } from "lucide-react";

export const ReviewStatusBadge = ({ status, size = "md" }) => {
  const normalized = (status || "").toLowerCase().replace(/\s+/g, "_");

  const config = {
    pending: {
      label: "Pending Review",
      icon: Clock,
      style: "bg-amber-50 text-amber-800 border-amber-200"
    },
    in_review: {
      label: "In Review",
      icon: Eye,
      style: "bg-blue-50 text-blue-800 border-blue-200"
    },
    changes_requested: {
      label: "Changes Requested",
      icon: AlertCircle,
      style: "bg-rose-50 text-rose-800 border-rose-200"
    },
    approved: {
      label: "Approved",
      icon: CheckCircle2,
      style: "bg-emerald-50 text-emerald-800 border-emerald-200"
    },
    rejected: {
      label: "Rejected",
      icon: XCircle,
      style: "bg-slate-100 text-slate-800 border-slate-300"
    },
    cancelled: {
      label: "Cancelled",
      icon: Ban,
      style: "bg-slate-50 text-slate-500 border-slate-200"
    }
  };

  const current = config[normalized] || {
    label: status || "Unknown",
    icon: Clock,
    style: "bg-slate-50 text-slate-600 border-slate-200"
  };

  const Icon = current.icon;
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-[10px] gap-1" : "px-2.5 py-1 text-xs gap-1.5";

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border shadow-2xs ${current.style} ${sizeClasses}`}
    >
      <Icon size={size === "sm" ? 11 : 13} className="shrink-0" />
      <span>{current.label}</span>
    </span>
  );
};

export default ReviewStatusBadge;
