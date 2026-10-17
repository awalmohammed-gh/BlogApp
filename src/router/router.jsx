import { createBrowserRouter, createRoutesFromElements, Route } from "react-router-dom";
import SystemLayout from "../layout/SystemLayout";
import Home from "../pages/Home";
import Blog from "../pages/Blog";
import BlogPage from "../pages/BlogPage";
import Contact from "../pages/Contact";
import About from "../pages/About";
import CategoryPage from "../pages/CategoryPage";

// Admin CMS Components
import AdminLayout from "../components/admin/layout/AdminLayout";
import Login from "../pages/admin/Login";
import AcceptInvite from "../pages/admin/AcceptInvite";
import ProtectedRoute from "../components/admin/auth/ProtectedRoute";
import DashboardOverview from "../pages/admin/DashboardOverview";
import Articles from "../pages/admin/Articles";
import CreateArticle from "../pages/admin/CreateArticle";
import EditArticle from "../pages/admin/EditArticle";
import Categories from "../pages/admin/Categories";
import Tags from "../pages/admin/Tags";
import MediaLibrary from "../pages/admin/MediaLibrary";
import Comments from "../pages/admin/Comments";
import Authors from "../pages/admin/Authors";
import EditorialWorkflow from "../pages/admin/EditorialWorkflow";
import Advertisements from "../pages/admin/Advertisements";
import PagesContent from "../pages/admin/PagesContent";
import Analytics from "../pages/admin/Analytics";
import Notifications from "../pages/admin/Notifications";
import Settings from "../pages/admin/Settings";
import Profile from "../pages/admin/Profile";

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      {/* Admin Authentication & Onboarding Routes */}
      <Route path="/admin/login" element={<Login />} />
      <Route path="/admin/accept-invite" element={<AcceptInvite />} />

      {/* NewsFront Admin Dashboard & CMS Routes */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<DashboardOverview />} />
        <Route path="articles" element={<Articles />} />
        <Route path="articles/new" element={<CreateArticle />} />
        <Route path="articles/:id/edit" element={<EditArticle />} />
        <Route path="categories" element={<Categories />} />
        <Route path="tags" element={<Tags />} />
        <Route path="media" element={<MediaLibrary />} />
        <Route path="comments" element={<Comments />} />
        <Route
          path="authors"
          element={
            <ProtectedRoute allowedRoles={["super_admin"]}>
              <Authors />
            </ProtectedRoute>
          }
        />
        <Route
          path="editorial"
          element={
            <ProtectedRoute allowedRoles={["super_admin", "editor"]}>
              <EditorialWorkflow />
            </ProtectedRoute>
          }
        />
        <Route
          path="editorial/:submissionId"
          element={
            <ProtectedRoute allowedRoles={["super_admin", "editor"]}>
              <EditorialWorkflow />
            </ProtectedRoute>
          }
        />
        <Route
          path="advertisements"
          element={
            <ProtectedRoute allowedRoles={["super_admin"]}>
              <Advertisements />
            </ProtectedRoute>
          }
        />
        <Route path="pages" element={<PagesContent />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="notifications" element={<Notifications />} />
        <Route
          path="settings"
          element={
            <ProtectedRoute allowedRoles={["super_admin"]}>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route path="profile" element={<Profile />} />
      </Route>


      {/* Public NewsFront Website Routes */}
      <Route path="/" element={<SystemLayout />}>
        <Route index element={<Home />} />
        <Route path="blog" element={<Blog />} />
        <Route path="blog-details/:id" element={<BlogPage />} />
        <Route path="contact" element={<Contact />} />
        <Route path="about" element={<About />} />
        <Route path=":category" element={<CategoryPage />} />
      </Route>
    </>
  )
);

export default router;