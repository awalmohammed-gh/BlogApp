import { useEffect } from "react"
import { useLocation } from "react-router-dom"
import { useSiteSettings } from "../context/SiteSettingsContext"
import Footer from './Footer'
import Navbar from './Navbar'
import { Outlet } from 'react-router-dom'
import { Suspense } from "react"
import { BlogProvider } from "../context/BlogProvider"
import PageSkeleton from "../components/common/PageSkeleton"
import ScrollToTop from '../components/common/ScrollToTop'
import { setPageMeta } from "../utils/setPageMeta"

const SystemLayout = () => {
  const { settings } = useSiteSettings();
  const { pathname } = useLocation();
  useEffect(() => {
    if (!settings || pathname.startsWith("/blog-details/")) return;
    setPageMeta({
      title: settings.seo.defaultMetaTitle,
      description: settings.seo.defaultMetaDescription,
      siteName: settings.general.siteName,
      twitterSite: settings.seo.twitterHandle
    });
  }, [settings, pathname]);
  return (
    <BlogProvider><div className="min-h-screen flex flex-col bg-white text-gray-900">
      <ScrollToTop />
      
      <Navbar />
      <main className="flex-1">
        <Suspense fallback={<PageSkeleton />}><Outlet /></Suspense>
      </main>
      <Footer />
    </div></BlogProvider>
  )
}

export default SystemLayout
