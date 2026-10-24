/* eslint-disable react-refresh/only-export-components -- Route configuration declares lazy elements. */
import { lazy, Suspense } from "react";
import { Outlet } from "react-router-dom";
import { AuthProvider } from "../context/admin/AuthContext";
import PageSkeleton from "../components/common/PageSkeleton";
import { ErrorFallback } from "../components/common/AppErrorBoundary";
import { createBrowserRouter, createRoutesFromElements, Route } from "react-router-dom";
import SystemLayout from "../layout/SystemLayout";
import Home from "../pages/Home";
const Blog = lazy(() => import("../pages/Blog"));
const BlogPage = lazy(() => import("../pages/BlogPage"));
const Contact = lazy(() => import("../pages/Contact"));
const About = lazy(() => import("../pages/About"));
const CategoryPage = lazy(() => import("../pages/CategoryPage"));
const NewsletterAction = lazy(() => import("../pages/NewsletterAction"));
const EngagementManagement = lazy(() => import("../pages/admin/EngagementManagement"));
const ContactEnquiries = lazy(() => import("../pages/admin/ContactEnquiries"));

// Admin CMS Components
const AdminLayout = lazy(() => import("../components/admin/layout/AdminLayout"));
const Login = lazy(() => import("../pages/admin/Login"));
const AcceptInvite = lazy(() => import("../pages/admin/AcceptInvite"));
const ProtectedRoute = lazy(() => import("../components/admin/auth/ProtectedRoute"));
const DashboardOverview = lazy(() => import("../pages/admin/DashboardOverview"));
const Articles = lazy(() => import("../pages/admin/Articles"));
const CreateArticle = lazy(() => import("../pages/admin/CreateArticle"));
const EditArticle = lazy(() => import("../pages/admin/EditArticle"));
const Categories = lazy(() => import("../pages/admin/Categories"));
const Tags = lazy(() => import("../pages/admin/Tags"));
const MediaLibrary = lazy(() => import("../pages/admin/MediaLibrary"));
const Comments = lazy(() => import("../pages/admin/Comments"));
const Authors = lazy(() => import("../pages/admin/Authors"));
const EditorialWorkflow = lazy(() => import("../pages/admin/EditorialWorkflow"));
const Advertisements = lazy(() => import("../pages/admin/Advertisements"));
const PagesContent = lazy(() => import("../pages/admin/PagesContent"));
const Analytics = lazy(() => import("../pages/admin/Analytics"));
const Notifications = lazy(() => import("../pages/admin/Notifications"));
const Settings = lazy(() => import("../pages/admin/Settings"));
const Profile = lazy(() => import("../pages/admin/Profile"));

const AdminSession = () => <AuthProvider><Suspense fallback={<PageSkeleton />}><Outlet /></Suspense></AuthProvider>;

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      {/* Admin Authentication & Onboarding Routes */}
      <Route element={<AdminSession />} errorElement={<ErrorFallback />}>
      <Route path="/admin/login" element={<Login />} />
      <Route path="/admin/accept-invite" element={<AcceptInvite />} />

      {/* Nsemfoa News Admin Dashboard & CMS Routes */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<DashboardOverview />} />
        <Route path="articles" element={<Articles />} />
        <Route path="articles/new" element={<CreateArticle />} />
        <Route path="articles/:id/edit" element={<EditArticle />} />
        <Route path="categories" element={<Categories />} />
        <Route path="tags" element={<Tags />} />
        <Route path="media" element={<MediaLibrary />} />
        <Route path="comments" element={<ProtectedRoute allowedRoles={["editor", "super_admin"]}><Comments /></ProtectedRoute>} />
        <Route path="enquiries" element={<ProtectedRoute allowedRoles={["editor", "super_admin"]}><ContactEnquiries /></ProtectedRoute>} />
        <Route path="subscribers" element={<ProtectedRoute allowedRoles={["super_admin"]}><EngagementManagement kind="newsletter" /></ProtectedRoute>} />
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


      </Route>
      {/* Public Nsemra News Website Routes */}
      <Route path="/" element={<SystemLayout />} errorElement={<ErrorFallback />}>
        <Route index element={<Home />} />
        <Route path="blog" element={<Blog />} />
        <Route path="blog-details/:id" element={<BlogPage />} />
        <Route path="contact" element={<Contact />} />
        <Route path="newsletter/confirm" element={<NewsletterAction action="confirm" />} />
        <Route path="newsletter/unsubscribe" element={<NewsletterAction action="unsubscribe" />} />
        <Route path="about" element={<About />} />
        <Route path=":category" element={<CategoryPage />} />
      </Route>
    </>
  )
);

export default router;
