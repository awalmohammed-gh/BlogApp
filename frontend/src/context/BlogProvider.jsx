import { createContext, useContext, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { usePublicArticles } from "../hooks/usePublicArticles";
const BlogContext = createContext(null);
export const BlogProvider = ({ children }) => {
 const { pathname } = useLocation();
 const {articles,loading,error,retry}=usePublicArticles({limit:20},{enabled:pathname==="/"});
 const value=useMemo(()=>({articles,loading,error,refreshArticles:retry}),[articles,loading,error,retry]);
 return <BlogContext.Provider value={value}>{children}</BlogContext.Provider>;
};
// eslint-disable-next-line react-refresh/only-export-components
export const useBlog = () => useContext(BlogContext);
export default BlogProvider;
