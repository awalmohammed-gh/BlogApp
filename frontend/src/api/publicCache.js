import api from "./axios";

// Only explicitly public GETs use this bounded, short-lived memory cache.
// Authentication and all administrator requests always bypass it.
const entries = new Map();
const inFlight = new Map();
const TTL = 60000;
export function clearPublicCache() { entries.clear(); }
window.addEventListener("newsfront:content",clearPublicCache);
export async function publicGet(url, { params = {}, signal, fresh = false, ttl = TTL } = {}) {
  const query = new URLSearchParams(Object.entries(params).filter(([,value]) => value !== undefined && value !== null).sort(([a],[b]) => a.localeCompare(b))).toString();
  const key = `${url}?${query}`;
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  const existing = entries.get(key);
  if (!fresh && existing && existing.expires > Date.now()) return existing.data;
  if (!inFlight.has(key)) {
    const request = api.get(url, { params }).then(({ data }) => {
      if (data?.success) {
        if (entries.size >= 100) entries.delete(entries.keys().next().value);
        entries.set(key, { data, expires:Date.now() + ttl });
      }
      return data;
    }).finally(() => inFlight.delete(key));
    inFlight.set(key, request);
  }
  // Cancelling one subscriber must not cancel a shared request needed by another.
  if (!signal) return inFlight.get(key);
  return new Promise((resolve,reject) => {
    const abort = () => { cleanup(); reject(new DOMException("Aborted", "AbortError")); };
    const cleanup = () => signal.removeEventListener("abort",abort);
    signal.addEventListener("abort",abort,{ once:true });
    inFlight.get(key).then((data)=>{ cleanup(); if(!signal.aborted)resolve(data); },(error)=>{ cleanup(); if(!signal.aborted)reject(error); });
  });
}
