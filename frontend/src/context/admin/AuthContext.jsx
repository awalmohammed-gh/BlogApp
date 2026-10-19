import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import adminAuthService from "../../services/admin/authService";
import toast from "../../utils/toast";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionError,setSessionError]=useState("");
  const sessionEpoch=useRef(0);

  /**
   * Check active administrator session via HTTP-only cookie
   */
  const checkSession = useCallback(async () => {
    const epoch=++sessionEpoch.current;
    try {
      setIsLoading(true);
      const data = await adminAuthService.getMe();
      if(epoch !== sessionEpoch.current)return null;
      setSessionError("");
      if (data?.success && data?.admin) {
        setAdmin(data.admin);
        setIsAuthenticated(true);
        return data.admin;
      } else {
        setAdmin(null);
        setIsAuthenticated(false);
        return null;
      }
    } catch (error) {
      if(epoch !== sessionEpoch.current)return null;
      if(error.status !== 401 && error.status !== 403){setSessionError("Your session could not be checked. Please check your connection and try again.");return null;}
      // An invalid or expired cookie requires sign-in.
      setAdmin(null);
      setIsAuthenticated(false);
      return null;
    } finally {
      if(epoch === sessionEpoch.current)setIsLoading(false);
    }
  }, []);

  // Run session check on initial mount
  useEffect(() => {
    checkSession();
  }, [checkSession]);

  /**
   * Log in with administrator email and password
   * @param {string} email
   * @param {string} password
   */
  const login = async (email, password) => {
    sessionEpoch.current++; setSessionError(""); setIsLoading(false);
    try {
      const data = await adminAuthService.login({ email, password });
      if (data?.success && data?.admin) {
        setAdmin(data.admin);
        setIsAuthenticated(true);
        return data.admin;
      }
      throw new Error(data?.message || "Login failed");
    } catch (error) {
      setAdmin(null);
      setIsAuthenticated(false);
      throw error;
    }
  };

  /**
   * Log out the administrator and clear session cookie
   */
  const logout = async () => {
    sessionEpoch.current++;
    try {
      await adminAuthService.logout();
    } catch (error) {
      console.warn("Logout request encountered an error, clearing local state anyway:", error);
    } finally {
      setAdmin(null);
      setIsAuthenticated(false);
      toast.success("Signed out successfully. Session ended.");
    }
  };

  /**
   * Update local admin profile state when modified
   */
  const updateAdminState = (updatedFields) => {
    setAdmin((prev) => (prev ? { ...prev, ...updatedFields } : null));
  };

  /**
   * Helper to check if current admin has permission
   */
  const checkPermission = (permission) => {
    if (!admin || !admin.role) return false;
    // super_admin has all permissions
    if (admin.role === "super_admin") return true;
    if (admin.role === "editor") {
      const editorPerms = [
        "dashboard:view",
        "profile:read",
        "profile:update",
        "articles:read",
        "articles:create",
        "articles:update_any",
        "articles:publish",
        "editorial:review",
        "categories:manage",
        "tags:manage",
        "media:manage",
        "comments:moderate",
        "analytics:view"
      ];
      return editorPerms.includes(permission);
    }
    if (admin.role === "author") {
      const authorPerms = [
        "dashboard:view",
        "profile:read",
        "profile:update",
        "articles:read",
        "articles:create",
        "articles:update_own",
        "media:manage"
      ];
      return authorPerms.includes(permission);
    }
    return false;
  };

  const value = {
    admin,
    isAuthenticated,
    isLoading,
    sessionError,
    login,
    logout,
    checkSession,
    updateAdminState,
    hasPermission: checkPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};


// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
