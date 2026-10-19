export const readingMinutes = (html = "") => Math.max(1, Math.round(html.replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim().split(" ").filter(Boolean).length / 200));
