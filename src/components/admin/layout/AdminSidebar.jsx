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
import toast from "react-hot-toast";
import { useAdmin } from "../../../context/admin/AdminContext";
import { useAuth } from "../../../context/admin/AuthContext";

export const AdminSidebar = () => {
  const {
    stats,
    currentAdminUser,
    isSidebarCollapsed,
    toggleSidebarCollapsed,
    isMobileSidebarOpen,
    closeMobileSidebar
  } = useAdmin();

  const { admin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

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
      const forbidden = ["/admin/authors", "/admin/advertisements", "/admin/settings"];
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
          badge: stats.totalArticles
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
          badge: stats.pendingReviews > 0 ? stats.pendingReviews : null,
          badgeColor: "bg-amber-500 text-slate-950 font-bold"
        },
        {
          name: "Comments",
          path: "/admin/comments",
          icon: MessageSquare,
          badge: stats.pendingComments > 0 ? stats.pendingComments : null,
          badgeColor: "bg-rose-500 text-white"
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
          badge: stats.activeAds > 0 ? `${stats.activeAds} active` : null,
          badgeColor: "bg-blue-600/60 text-blue-100"
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
          badge: stats.unreadNotifications > 0 ? stats.unreadNotifications : null,
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


  const sidebarContent = (
    <div className="h-full flex flex-col bg-[#0B1B3A] text-slate-200 select-none border-r border-slate-800/80">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80 shrink-0">
        <Link
          to="/admin"
          onClick={closeMobileSidebar}
          className="flex items-center gap-3 overflow-hidden"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-lg shadow-md shrink-0 tracking-tighter">
            NF
          </div>
          {!isSidebarCollapsed && (
            <div className="truncate">
              <div className="font-black text-base tracking-tight text-white flex items-center gap-1.5">
                <span>NewsFront</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 bg-blue-600/30 text-blue-400 rounded border border-blue-500/30">
                  Admin
                </span>
              </div>
              <div className="text-[11px] text-slate-400 truncate tracking-wide">
                Newsroom Workspace
              </div>
            </div>
          )}
        </Link>

        {/* Mobile close button */}
        <button
          type="button"
          onClick={closeMobileSidebar}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg lg:hidden cursor-pointer"
        >
          <X size={20} />
        </button>
      </div>

      {/* Role Indicator Banner */}
      {!isSidebarCollapsed && (
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
      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-4 space-y-6">
        {navGroups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-1">
            {!isSidebarCollapsed && (
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
                  title={isSidebarCollapsed ? item.name : undefined}
                  className={`group relative flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? "bg-blue-600 text-white shadow-xs font-semibold"
                      : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                  } ${isSidebarCollapsed ? "justify-center" : ""}`}
                >
                  <Icon
                    size={17}
                    className={`shrink-0 ${
                      isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                    }`}
                  />

                  {!isSidebarCollapsed && (
                    <span className="truncate flex-1">{item.name}</span>
                  )}

                  {!isSidebarCollapsed && item.badge !== null && item.badge !== undefined && (
                    <span
                      className={`px-1.5 py-0.5 text-[10px] rounded-full shrink-0 ${
                        item.badgeColor || "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}

                  {/* Tooltip on collapsed desktop view */}
                  {isSidebarCollapsed && (
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
      <div className="p-3 border-t border-slate-800/80 bg-slate-900/40 shrink-0 space-y-1">
        {/* Profile Link */}
        <NavLink
          to="/admin/profile"
          onClick={closeMobileSidebar}
          title={isSidebarCollapsed ? currentAdminUser.name : undefined}
          className={`flex items-center gap-3 p-2 rounded-xl hover:bg-slate-800/70 transition-colors ${
            isSidebarCollapsed ? "justify-center" : ""
          }`}
        >
          <img
            src={
              admin?.avatar ||
              currentAdminUser.avatar ||
              "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
            }
            alt={admin?.name || currentAdminUser.name}
            className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-700 shrink-0"
          />
          {!isSidebarCollapsed && (
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
          title={isSidebarCollapsed ? "View Public NewsFront Website" : undefined}
          className={`flex items-center gap-3 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800/70 rounded-xl transition-colors ${
            isSidebarCollapsed ? "justify-center" : ""
          }`}
        >
          <ExternalLink size={16} className="text-slate-400 shrink-0" />
          {!isSidebarCollapsed && <span className="truncate">View Website</span>}
        </Link>

        {/* Logout Simulation */}
        <button
          type="button"
          onClick={handleLogout}
          title={isSidebarCollapsed ? "Sign Out" : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-xl transition-colors cursor-pointer ${
            isSidebarCollapsed ? "justify-center" : ""
          }`}
        >
          <LogOut size={16} className="shrink-0" />
          {!isSidebarCollapsed && <span className="truncate">Sign Out</span>}
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
        <div className="fixed inset-0 z-50 lg:hidden flex">
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
