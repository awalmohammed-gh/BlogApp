import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Menu,
  PanelLeftClose,
  PanelLeft,
  Search,
  Bell,
  Plus,
  ExternalLink,
  ChevronDown,
  User,
  Settings,
  LogOut,
  CheckCircle,
  Clock,
  ShieldAlert
} from "lucide-react";
import { useAdmin } from "../../../context/admin/AdminContext";
import StaffAvatar from "../common/StaffAvatar";
import { useAuth } from "../../../context/admin/AuthContext";
import { useNotifications } from "../../../context/admin/NotificationContext";

export const AdminHeader = () => {
  const { admin, logout } = useAuth();
  const {
    currentAdminUser,
    isSidebarCollapsed,
    toggleSidebarCollapsed,
    openMobileSidebar,
    openSearch
  } = useAdmin();

  const {
    notifications,
    unreadCount,
    markNotificationAsRead,
    markAllNotificationsAsRead
  } = useNotifications();

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const notificationsRef = useRef(null);
  const profileRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target)) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);


  // Compute breadcrumbs from pathname
  const pathSegments = location.pathname.split("/").filter(Boolean);
  const getBreadcrumbs = () => {
    if (pathSegments.length <= 1) {
      return [{ label: "Dashboard Overview", path: "/admin" }];
    }
    const crumbs = [{ label: "Admin", path: "/admin" }];
    let currentPath = "";
    pathSegments.forEach((segment, idx) => {
      currentPath += `/${segment}`;
      if (idx === 0) return;
      const formatted = segment
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
      crumbs.push({ label: formatted, path: currentPath });
    });
    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="sticky top-0 z-20 min-h-[calc(4rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between gap-2 shadow-2xs">
      {/* Left: Sidebar Toggle & Breadcrumbs */}
      <div className="min-w-0 flex items-center gap-3">
        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={openMobileSidebar}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg lg:hidden transition-colors cursor-pointer"
          aria-label="Open mobile menu"
        >
          <Menu size={20} />
        </button>

        {/* Desktop collapse toggle */}
        <button
          type="button"
          onClick={toggleSidebarCollapsed}
          className="hidden lg:flex p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isSidebarCollapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
        </button>

        {/* Breadcrumbs */}
        <nav className="min-w-0 hidden md:flex items-center gap-2 text-xs overflow-hidden">
          {breadcrumbs.map((crumb, idx) => (
            <span key={idx} className="min-w-0 flex items-center gap-2">
              {idx > 0 && <span className="text-slate-300">/</span>}
              {idx === breadcrumbs.length - 1 ? (
                <span className="truncate font-bold text-slate-900 tracking-tight">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  to={crumb.path}
                  className="text-slate-500 hover:text-slate-900 transition-colors"
                >
                  {crumb.label}
                </Link>
              )}
            </span>
          ))}
        </nav>
      </div>

      {/* Right Action Icons & Controls */}
      <div className="shrink-0 flex items-center gap-2 sm:gap-3">
        {/* Global Search Button */}
        <button
          type="button"
          onClick={openSearch}
          aria-label="Search newsroom"
          className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 rounded-lg border border-slate-200 text-xs transition-colors cursor-pointer"
        >
          <Search size={14} className="text-slate-400" />
          <span className="hidden sm:inline">Search newsroom...</span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 bg-white border border-slate-200 rounded">
            Ctrl+K
          </kbd>
        </button>

        {/* Create Article Quick Button */}
        <Link
          to="/admin/articles/new"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
        >
          <Plus size={14} />
          <span>New Article</span>
        </Link>

        {/* Real Authenticated Role Badge */}
        <div className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-blue-800 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          <span>
            Role:{" "}
            {admin?.role === "super_admin"
              ? "Super Admin"
              : admin?.role === "editor"
              ? "Editor"
              : "Author"}
          </span>
        </div>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notificationsRef}>
          <button
            type="button"
            onClick={() => setNotificationsOpen((prev) => !prev)}
            className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Notifications"
            aria-expanded={notificationsOpen}
            aria-controls="admin-notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 min-w-[18px] text-[10px] font-bold text-white bg-rose-600 rounded-full flex items-center justify-center ring-2 ring-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div id="admin-notifications" className="fixed left-4 right-4 top-[calc(4.5rem+env(safe-area-inset-top))] sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-40 animate-fadeIn max-h-[calc(var(--overlay-height,var(--viewport-height))-6rem)] flex flex-col">
              {/* Header */}
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-900">Notifications</h4>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.2 text-[10px] font-bold bg-rose-100 text-rose-700 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllNotificationsAsRead}
                    className="text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {/* List */}
              <div className="min-h-0 max-h-80 overflow-y-auto overscroll-contain custom-scrollbar divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    <Bell size={24} className="mx-auto mb-2 text-slate-300 opacity-60" />
                    No notifications yet.
                  </div>
                ) : (
                  notifications.slice(0, 6).map((n) => {
                    const id = n._id || n.id;
                    const isRead = n.isRead ?? n.read;
                    const targetUrl = n.actionUrl || n.targetUrl;
                    const timeAgo = n.createdAt
                      ? new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : n.timestamp || "Just now";

                    return (
                      <div
                        key={id}
                        onClick={() => {
                          if (!isRead) markNotificationAsRead(id).catch(() => {});
                          setNotificationsOpen(false);
                          if (targetUrl) navigate(targetUrl);
                        }}
                        className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-3 ${
                          !isRead ? "bg-blue-50/40" : ""
                        }`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                            !isRead ? "bg-blue-600" : "bg-transparent"
                          }`}
                        />
                        <div className="flex-1 truncate">
                          <div className="text-xs font-semibold text-slate-900 truncate">
                            {n.title}
                          </div>
                          <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">
                            {n.message}
                          </p>
                          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                            <Clock size={10} />
                            <span>{timeAgo}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* View all footer */}
              <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
                <Link
                  to="/admin/notifications"
                  onClick={() => setNotificationsOpen(false)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  View all notifications &rarr;
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* View Public Website */}
        <Link
          to="/"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:inline-flex p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          title="Open Public Nsemfoa News Website"
        >
          <ExternalLink size={18} />
        </Link>

        {/* User Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setProfileDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <StaffAvatar
              src={admin?.avatar || currentAdminUser.avatar}
              name={admin?.name || currentAdminUser.name}
              className="w-8 h-8 rounded-full ring-2 ring-slate-200"
            />
            <ChevronDown size={14} className="text-slate-400 hidden sm:block" />
          </button>

          {profileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-40 animate-fadeIn">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {admin?.name || currentAdminUser.name}
                </p>
                <p className="text-[11px] text-slate-500 truncate">
                  {admin?.email || currentAdminUser.email}
                </p>
                <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-700 rounded-full">
                  {admin?.role === "super_admin"
                    ? "Super Admin"
                    : admin?.role === "editor"
                    ? "Editor"
                    : "Author"}
                </span>
              </div>


              <div className="py-1">
                <Link
                  to="/admin/profile"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
                >
                  <User size={15} className="text-slate-400" />
                  <span>My Profile</span>
                </Link>
                <Link
                  to="/admin/settings"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
                >
                  <Settings size={15} className="text-slate-400" />
                  <span>Newsroom Settings</span>
                </Link>
                <Link
                  to="/"
                  target="_blank"
                  className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
                >
                  <ExternalLink size={15} className="text-slate-400" />
                  <span>Open Public Website</span>
                </Link>
              </div>

              <div className="pt-1 border-t border-slate-100">
                <button
                  type="button"
                  onClick={async () => {
                    setProfileDropdownOpen(false);
                    try {
                      await logout();
                      navigate("/admin/login", { replace: true });
                    } catch (error) {
                      console.error("Logout failed:", error);
                    }
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 cursor-pointer text-left"
                >
                  <LogOut size={15} />
                  <span>Sign Out</span>
                </button>
              </div>

            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
