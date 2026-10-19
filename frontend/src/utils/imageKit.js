/**
 * Ask ImageKit for a resized rendition (e.g. "h-96" or "w-64,h-64").
 * Non-ImageKit URLs are returned unchanged.
 */
export const resizeImage = (url, transform) => {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "imagekit.io" && !parsed.hostname.endsWith(".imagekit.io")) return url;
    parsed.searchParams.set("tr", transform);
    return parsed.toString();
  } catch {
    return url;
  }
};

export default resizeImage;

export const responsiveImageProps = (url, { width=640, sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px", priority=false } = {}) => {
  const optimized=resizeImage(url,`w-${width},q-82,f-auto`);
  return {src:optimized,...(optimized!==url ? {srcSet:[160,320,480,640,960,1280,1600].filter((value)=>value<=Math.max(width,1280)).map((value)=>`${resizeImage(url,`w-${value},q-82,f-auto`)} ${value}w`).join(", "),sizes}:{}),loading:priority?"eager":"lazy",decoding:"async",...(priority?{fetchPriority:"high"}:{})};
};

export const optimizeArticleImages = (html) => {
  const doc=new DOMParser().parseFromString(html,"text/html");
  for(const img of doc.querySelectorAll("img")) {
    const props=responsiveImageProps(img.getAttribute("src"),{width:960,sizes:"(max-width: 768px) 100vw, 768px"});
    for(const [key,value] of Object.entries(props))img.setAttribute(key==="srcSet"?"srcset":key,value);
  }
  return doc.body.innerHTML;
};
