import { Navigate, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "../../../context/admin/AuthContext";
import { Loader2 } from "lucide-react";
import AccessDenied from "../../../pages/admin/AccessDenied";

export const ProtectedRoute = ({ children, allowedRoles, requiredPermission }) => {
  const { admin, isAuthenticated, isLoading, hasPermission } = useAuth();
  const location = useLocation();

  // Show a clean, branded loading screen while verifying session cookie
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B1B3A] flex flex-col items-center justify-center font-sans text-white">
        <div className="flex flex-col items-center gap-4 animate-fadeIn">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center font-black text-2xl shadow-xl shadow-blue-500/20 tracking-tighter">
            NF
          </div>
          <div className="flex items-center gap-2.5 text-slate-300 text-sm font-medium">
            <Loader2 size={18} className="animate-spin text-blue-400" />
            <span>Verifying NewsFront credentials...</span>
          </div>
        </div>
      </div>
    );
  }

  // Redirect to login preserving intended target
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  // Check role-based restrictions
  if (allowedRoles && allowedRoles.length > 0 && admin) {
    if (!allowedRoles.includes(admin.role)) {
      return <AccessDenied />;
    }
  }

  // Check granular permission restriction
  if (requiredPermission && admin) {
    if (!hasPermission(requiredPermission)) {
      return <AccessDenied />;
    }
  }

  return children ? children : <Outlet />;
};

export default ProtectedRoute;
