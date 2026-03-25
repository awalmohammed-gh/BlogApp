import { createContext, useContext } from "react"
import { articles } from "../assets/blogs"


const BlogContext = createContext()
export const BlogProvider = ({children}) => {

    const blogValue = {
        articles
    }
  return (
    <BlogContext.Provider value={blogValue}>
      {children}
    </BlogContext.Provider>
  )
}

export const useBlog = () => useContext(BlogContext)