import BrandLogo from "../../common/BrandLogo";
import { Navigate, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "../../../context/admin/AuthContext";
import { Loader2 } from "lucide-react";
import AccessDenied from "../../../pages/admin/AccessDenied";

export const ProtectedRoute = ({ children, allowedRoles, requiredPermission }) => {
  const { admin, isAuthenticated, isLoading, sessionError, checkSession, hasPermission } = useAuth();
  const location = useLocation();

  // Show a clean, branded loading screen while verifying session cookie
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B1B3A] flex flex-col items-center justify-center font-sans text-white">
        <div className="flex flex-col items-center gap-4 animate-fadeIn">
          <BrandLogo />
          <div className="flex items-center gap-2.5 text-slate-300 text-sm font-medium">
            <Loader2 size={18} className="animate-spin text-blue-400" />
            <span>Verifying Nsemra News credentials...</span>
          </div>
        </div>
      </div>
    );
  }

  if(sessionError) return <div role="alert" className="mx-auto my-24 max-w-xl rounded-2xl border border-slate-200 p-8 text-center"><h1 className="text-xl font-bold">Session check unavailable</h1><p className="mt-3 text-sm text-slate-500">{sessionError}</p><button type="button" onClick={checkSession} className="mt-5 rounded-xl bg-blue-600 px-4 py-2 text-white">Try again</button></div>;

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
