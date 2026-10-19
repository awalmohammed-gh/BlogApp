// Lossy delivery derivatives only; original photographs are kept unchanged.
// Uses the already installed test browser's native WebP encoder, no image package.
import { chromium } from "playwright";
import { readFile,readdir,writeFile,mkdir } from "node:fs/promises";
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||"C:/Program Files/Google/Chrome/Application/chrome.exe",headless:true});
try {
 const page=await browser.newPage();
 for(const directory of ["../frontend/src/assets/categories","../frontend/src/assets"]) {
  const names=(await readdir(directory)).filter((name)=>directory.endsWith("categories") ? name.endsWith(".jpg") : name==="hero-globe.jpg");
  await mkdir(`${directory}/optimized`,{recursive:true});
  for(const name of names)for(const width of (directory.endsWith("categories")?[80,960]:[640])) {
   const original=await readFile(`${directory}/${name}`);
   const base64=await page.evaluate(async({data,width})=>{const img=new Image();img.src=`data:image/jpeg;base64,${data}`;await img.decode();const canvas=document.createElement("canvas");canvas.width=Math.min(width,img.width);canvas.height=Math.round(canvas.width*img.height/img.width);canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);return canvas.toDataURL("image/webp",.84).split(",")[1];},{data:original.toString("base64"),width});
   await writeFile(`${directory}/optimized/${name.replace(/\.jpg$/,"")}-${width}.webp`,Buffer.from(base64,"base64"));
  }
 }
 console.log("WebP derivatives generated. Originals preserved.");
}finally{await browser.close();}
