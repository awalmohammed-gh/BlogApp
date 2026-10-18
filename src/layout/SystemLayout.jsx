import { useEffect } from "react"
import { useLocation } from "react-router-dom"
import { useSiteSettings } from "../context/SiteSettingsContext"
import Footer from './Footer'
import Navbar from './Navbar'
import { Outlet } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
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
    <div className="min-h-screen flex flex-col bg-white text-gray-900">
      <ScrollToTop />
      <Toaster position="top-right" />
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

export default SystemLayout
