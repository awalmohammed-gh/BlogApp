import { Link } from "react-router-dom";
import { ShieldAlert, ArrowLeft, LayoutDashboard } from "lucide-react";
import { useAuth } from "../../context/admin/AuthContext";

export const AccessDenied = () => {
  const { admin } = useAuth();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-5 shadow-xs">
        <ShieldAlert size={32} />
      </div>

      <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
        Access Denied
      </h1>

      <p className="mt-2 text-sm text-slate-500 max-w-md">
        You do not have administrative permission to view this section.
        Your current role is{" "}
        <span className="font-semibold text-slate-800 uppercase text-xs px-2 py-0.5 bg-slate-100 rounded-md">
          {admin?.role || "Staff"}
        </span>
        .
      </p>

      <div className="mt-6 flex items-center gap-3">
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
        >
          <LayoutDashboard size={15} />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    </div>
  );
};

export default AccessDenied;
