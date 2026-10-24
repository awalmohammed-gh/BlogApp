import { Outlet } from "react-router-dom";
import { AdminProvider, useAdmin } from "../../../context/admin/AdminContext";
import { NotificationProvider } from "../../../context/admin/NotificationContext";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";
import GlobalSearchModal from "./GlobalSearchModal";
import ProtectedRoute from "../auth/ProtectedRoute";
import SEO from "../../common/SEO";

const AdminLayoutInner = () => {
  const { isSidebarCollapsed, isSearchOpen, closeSearch } = useAdmin();

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-slate-900 flex flex-col font-sans">
      <SEO title="Newsroom CMS" robots="noindex, nofollow" />
      {/* Collapsible / Off-canvas Sidebar */}
      <AdminSidebar />

      {/* Main Workspace Frame */}
      <div
        className={`min-w-0 flex-1 flex flex-col transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? "lg:ml-[76px]" : "lg:ml-[260px]"
        }`}
      >
        {/* Top Header */}
        <AdminHeader />

        {/* Dynamic Page Workspace Content */}
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Global Command Palette / Search Modal */}
      <GlobalSearchModal isOpen={isSearchOpen} onClose={closeSearch} />
    </div>
  );
};

export const AdminLayout = () => {
  return (
    <ProtectedRoute>
      <AdminProvider>
        <NotificationProvider>
          <AdminLayoutInner />
        </NotificationProvider>
      </AdminProvider>
    </ProtectedRoute>
  );
};

export default AdminLayout;

