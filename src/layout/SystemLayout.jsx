import Footer from './Footer'
import Navbar from './Navbar'
import { Outlet } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import ScrollToTop from '../components/common/ScrollToTop'

const SystemLayout = () => {
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
