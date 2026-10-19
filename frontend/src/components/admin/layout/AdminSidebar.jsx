import BrandLogo from "../../common/BrandLogo";
import { NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  FolderTree,
  Tag,
  Image as ImageIcon,
  GitPullRequest,
  MessageSquare,
  Users,
  Megaphone,
  Globe,
  BarChart3,
  Bell,
  Settings,
  User,
  ExternalLink,
  LogOut,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldCheck
} from "lucide-react";
import { useAdmin } from "../../../context/admin/AdminContext";
import StaffAvatar from "../common/StaffAvatar";
import { useNotifications } from "../../../context/admin/NotificationContext";
import { useAuth } from "../../../context/admin/AuthContext";
import { useEffect } from "react";
import { useBodyScrollLock } from "../../../hooks/useBodyScrollLock";

export const AdminSidebar = () => {
  const { unreadCount } = useNotifications();
  const {
    overview,
    currentAdminUser,
    isSidebarCollapsed,
    isMobileSidebarOpen,
    closeMobileSidebar
  } = useAdmin();

  const { admin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  useBodyScrollLock(isMobileSidebarOpen);
  useEffect(() => {
    if (!isMobileSidebarOpen) return;
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => { if (desktop.matches) closeMobileSidebar(); };
    const closeOnEscape = (event) => { if (event.key === "Escape") closeMobileSidebar(); };
    desktop.addEventListener("change", closeOnDesktop);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      desktop.removeEventListener("change", closeOnDesktop);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isMobileSidebarOpen, closeMobileSidebar]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/admin/login", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const currentRole = admin?.role || "author";

  const isRouteAllowed = (path) => {
    if (currentRole === "super_admin") return true;

    if (currentRole === "editor") {
      // Editors cannot access staff team, advertisements, or settings
      const forbidden = ["/admin/authors", "/admin/advertisements", "/admin/settings", "/admin/subscribers"];
      return !forbidden.includes(path);
    }

    if (currentRole === "author") {
      // Authors can only access dashboard, articles, new article, media, notifications, profile
      const allowed = ["/admin", "/admin/articles", "/admin/articles/new", "/admin/media", "/admin/notifications", "/admin/profile"];
      return allowed.includes(path);
    }

    return false;
  };

  const rawNavGroups = [
    {
      group: "Overview",
      items: [
        {
          name: "Dashboard",
          path: "/admin",
          exact: true,
          icon: LayoutDashboard
        }
      ]
    },
    {
      group: "Content Management",
      items: [
        {
          name: "All Articles",
          path: "/admin/articles",
          exact: true,
          icon: FileText,
          badge: overview?.totalArticles ?? null
        },
        {
          name: "Create Article",
          path: "/admin/articles/new",
          icon: PlusCircle
        },
        {
          name: "Categories",
          path: "/admin/categories",
          icon: FolderTree
        },
        {
          name: "Tags",
          path: "/admin/tags",
          icon: Tag
        },
        {
          name: "Media Library",
          path: "/admin/media",
          icon: ImageIcon
        }
      ]
    },
    {
      group: "Editorial",
      items: [
        {
          name: "Editorial Workflow",
          path: "/admin/editorial",
          icon: GitPullRequest,
          badge: overview?.pendingReviews > 0 ? overview.pendingReviews : null,
          badgeColor: "bg-amber-500 text-slate-950 font-bold"
        },
        {
          name: "Comments",
          path: "/admin/comments",
          icon: MessageSquare,
          badge: overview?.pendingComments > 0 ? overview.pendingComments : null,
          badgeColor: "bg-rose-500 text-white"
        },
        {
          name: "Contact Enquiries", path: "/admin/enquiries", icon: MessageSquare
        },
        {
          name: "Newsletter Subscribers", path: "/admin/subscribers", icon: Users
        },
        {
          name: "Newsroom Team",
          path: "/admin/authors",
          icon: Users
        }
      ]
    },
    {
      group: "Website Management",
      items: [
        {
          name: "Advertisements",
          path: "/admin/advertisements",
          icon: Megaphone,
        },
        {
          name: "Pages & Content",
          path: "/admin/pages",
          icon: Globe
        }
      ]
    },
    {
      group: "Insights",
      items: [
        {
          name: "Analytics",
          path: "/admin/analytics",
          icon: BarChart3
        }
      ]
    },
    {
      group: "System",
      items: [
        {
          name: "Notifications",
          path: "/admin/notifications",
          icon: Bell,
          badge: unreadCount > 0 ? (unreadCount > 99 ? "99+" : unreadCount) : null,
          badgeColor: "bg-rose-500 text-white"
        },
        {
          name: "Settings",
          path: "/admin/settings",
          icon: Settings
        }
      ]
    }
  ];

  const navGroups = rawNavGroups
    .map((grp) => ({
      ...grp,
      items: grp.items.filter((item) => isRouteAllowed(item.path))
    }))
    .filter((grp) => grp.items.length > 0);


  const compact = isSidebarCollapsed && !isMobileSidebarOpen;
  const sidebarContent = (
    <div className="h-full min-h-0 flex flex-col bg-[#0B1B3A] text-slate-200 select-none border-r border-slate-800/80">
      {/* Brand Header */}
      <div className="min-h-16 pt-[env(safe-area-inset-top)] flex items-center justify-between px-4 border-b border-slate-800/80 shrink-0">
        <Link
          to="/admin"
          onClick={closeMobileSidebar}
          className="flex items-center gap-3 overflow-hidden"
        >
          <BrandLogo compact={compact} />
        </Link>

        {/* Mobile close button */}
        <button
          type="button"
          onClick={closeMobileSidebar}
          className="min-h-11 min-w-11 flex items-center justify-center p-1.5 text-slate-400 hover:text-white rounded-lg lg:hidden cursor-pointer"
          aria-label="Close mobile menu"
        >
          <X size={20} />
        </button>
      </div>

      {/* Role Indicator Banner */}
      {!compact && (
        <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800/60 flex items-center justify-between text-[11px]">
          <span className="text-slate-400 flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-emerald-400" /> Role:
          </span>
          <span className="font-semibold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
            {admin?.role === "super_admin"
              ? "Super Admin"
              : admin?.role === "editor"
              ? "Editor"
              : "Author"}
          </span>
        </div>
      )}


      {/* Navigation Links */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain custom-scrollbar px-3 py-4 space-y-6">
        {navGroups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-1">
            {!compact && (
              <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400/80 mb-1.5">
                {group.group}
              </div>
            )}
            {group.items.map((item, iIdx) => {
              const Icon = item.icon;
              const isActive = item.exact
                ? location.pathname === item.path
                : location.pathname.startsWith(item.path);

              return (
                <NavLink
                  key={iIdx}
                  to={item.path}
                  onClick={closeMobileSidebar}
                  title={compact ? item.name : undefined}
                  className={`group relative flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? "bg-blue-600 text-white shadow-xs font-semibold"
                      : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                  } ${compact ? "justify-center" : ""}`}
                >
                  <Icon
                    size={17}
                    className={`shrink-0 ${
                      isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                    }`}
                  />

                  {!compact && (
                    <span className="truncate flex-1">{item.name}</span>
                  )}

                  {!compact && item.badge !== null && item.badge !== undefined && (
                    <span
                      className={`px-1.5 py-0.5 text-[10px] rounded-full shrink-0 ${
                        item.badgeColor || "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}

                  {/* Tooltip on collapsed desktop view */}
                  {compact && (
                    <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap border border-slate-700">
                      {item.name}
                      {item.badge && ` (${item.badge})`}
                    </div>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer Profile & Actions */}
      <div className="safe-area-bottom p-3 border-t border-slate-800/80 bg-slate-900/40 shrink-0 space-y-1">
        {/* Profile Link */}
        <NavLink
          to="/admin/profile"
          onClick={closeMobileSidebar}
          title={compact ? currentAdminUser.name : undefined}
          className={`flex items-center gap-3 p-2 rounded-xl hover:bg-slate-800/70 transition-colors ${
            compact ? "justify-center" : ""
          }`}
        >
          <StaffAvatar
            src={admin?.avatar || currentAdminUser.avatar}
            name={admin?.name || currentAdminUser.name}
            className="w-8 h-8 rounded-full ring-1 ring-slate-700"
          />
          {!compact && (
            <div className="truncate text-left flex-1">
              <div className="text-xs font-semibold text-white truncate">
                {admin?.name || currentAdminUser.name}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {admin?.role === "super_admin"
                  ? "Super Admin"
                  : admin?.role === "editor"
                  ? "Editor"
                  : "Author"}
              </div>
            </div>
          )}
        </NavLink>


        {/* View Public Website */}
        <Link
          to="/"
          target="_blank"
          rel="noopener noreferrer"
          title={compact ? "View Public Nsemra News Website" : undefined}
          className={`flex items-center gap-3 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800/70 rounded-xl transition-colors ${
            compact ? "justify-center" : ""
          }`}
        >
          <ExternalLink size={16} className="text-slate-400 shrink-0" />
          {!compact && <span className="truncate">View Website</span>}
        </Link>

        {/* Logout Simulation */}
        <button
          type="button"
          onClick={handleLogout}
          title={compact ? "Sign Out" : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-xl transition-colors cursor-pointer ${
            compact ? "justify-center" : ""
          }`}
        >
          <LogOut size={16} className="shrink-0" />
          {!compact && <span className="truncate">Sign Out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 transition-all duration-300 ease-in-out fixed top-0 bottom-0 left-0 z-30 ${
          isSidebarCollapsed ? "w-[76px]" : "w-[260px]"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Off-Canvas Drawer */}
      {isMobileSidebarOpen && (
        <div className="viewport-overlay fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity animate-fadeIn"
            onClick={closeMobileSidebar}
            aria-hidden="true"
          />

          {/* Drawer content */}
          <div className="relative w-[280px] max-w-[85vw] h-full shadow-2xl animate-fadeIn z-10">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};

export default AdminSidebar;
