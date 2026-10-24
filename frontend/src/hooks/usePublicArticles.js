import { useEffect, useMemo, useState } from "react";
import { publicGet } from "../api/publicCache";
import { formatPublicDate } from "../utils/formatPublicDate";
import { useSiteSettings } from "../context/SiteSettingsContext";

export const formatArticle = (article, general) => ({
  ...article, category:article.category?.name || "General News", categorySlug:article.category?.slug || "",
  description:article.excerpt || "", content:article.content || "", image:article.featuredImage?.url || "/heroBg.jpg",
  isPublished:true, isBreaking:Boolean(article.isBreakingNews), date:article.publishedAt ? formatPublicDate(article.publishedAt,general) : "",
  author:article.byline || article.author?.name || "Nsemfoa News Desk", authorAvatar:article.byline ? "" : article.author?.avatar,
  tags:(article.tags || []).map((tag)=>typeof tag === "object" ? tag.name : tag)
});

export function usePublicArticles(params = {}, { enabled = true, debounce = 0 } = {}) {
  const { settings } = useSiteSettings();
  const key = JSON.stringify(params);
  const [state,setState] = useState({ data:[], pagination:{ total:0,totalPages:1 }, loading:enabled, error:"", key:"" });
  const [retry,setRetry] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setState((previous)=>({ ...previous, loading:true, error:"" }));
      publicGet("/articles", { params:JSON.parse(key), signal:controller.signal, fresh:retry > 0 }).then((result) => {
        if(!result.success)throw new Error(result.message || "Stories could not be loaded.");
        setState({ data:result.data, pagination:result.pagination, loading:false,error:"",key });
      }).catch((error)=>{ if(!controller.signal.aborted)setState((previous)=>({ ...previous,loading:false,error:error.message || "Stories could not be loaded.",key })); });
    },debounce);
    return () => { clearTimeout(timer); controller.abort(); };
  },[key,enabled,debounce,retry]);
  const articles = useMemo(()=>state.data.map((article)=>formatArticle(article,settings?.general)),[state.data,settings?.general]);
  return { articles, pagination:state.pagination, loading:enabled && (state.loading || state.key !== key), error:state.error, retry:()=>setRetry((value)=>value+1) };
}

export function usePublicDesks() {
  const [desks,setDesks] = useState([]);
  useEffect(()=>{ const controller=new AbortController(); publicGet("/articles/desks",{signal:controller.signal,ttl:30000}).then((result)=>{if(result.success)setDesks(result.data);}).catch(()=>{}); return()=>controller.abort(); },[]);
  return desks;
}
