import Footer from './Footer'
import Navbar from './Navbar'
import { Outlet } from 'react-router-dom'
import { Toaster } from 'react-hot-toast';

const SystemLayout = () => {
  return (
    <div>
    <Toaster/>
      <Navbar/>
      <Outlet/>
      <Footer/>
    </div>
  )
}

export default SystemLayout
