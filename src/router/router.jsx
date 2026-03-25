import {createBrowserRouter, createRoutesFromElements, Route} from "react-router-dom"
import SystemLayout from "../layout/SystemLayout"
import Home from "../pages/Home"
import Blog from "../pages/Blog"
import BlogPage from "../pages/BlogPage"
import Contact from "../pages/Contact"
import About from "../pages/About"
import CategoryPage from "../pages/CategoryPage"

const router = createBrowserRouter(
    createRoutesFromElements(
        <Route path="/" element={<SystemLayout/>}>
          <Route index element={<Home/>}/>
          <Route path="blog" element={<Blog/>}/>
          <Route path="blog-details/:id" element={<BlogPage/>}/>
          <Route path="/:category" element={<CategoryPage/>}/>
          <Route path="contact" element={<Contact/>}/>
          <Route path="about" element={<About/>}/>
        </Route>
    )
)

export default router;