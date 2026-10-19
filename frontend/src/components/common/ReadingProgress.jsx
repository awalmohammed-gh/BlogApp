import { useEffect, useRef } from "react";
export default function ReadingProgress({ articleId }) {
  const bar=useRef(null);
  useEffect(()=>{let frame=0;const update=()=>{if(frame)return;frame=requestAnimationFrame(()=>{frame=0;const body=document.getElementById("article-body");if(!body||!bar.current)return;const rect=body.getBoundingClientRect();const value=Math.min(1,Math.max(0,(-rect.top+innerHeight*.3)/Math.max(rect.height-innerHeight*.6,1)));bar.current.style.transform=`scaleX(${value})`;});};window.addEventListener("scroll",update,{passive:true});update();return()=>{cancelAnimationFrame(frame);window.removeEventListener("scroll",update);};},[articleId]);
  return <div className="fixed inset-x-0 top-0 z-60 h-1 print:hidden" aria-hidden="true"><div ref={bar} className="h-full origin-left bg-linear-to-r from-sky-400 to-blue-600" style={{transform:"scaleX(0)"}}/></div>;
}
