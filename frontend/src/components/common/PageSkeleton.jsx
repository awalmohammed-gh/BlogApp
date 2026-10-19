export default function PageSkeleton() {
  return <div role="status" aria-label="Loading page" className="mx-auto min-h-[70vh] max-w-6xl space-y-5 px-6 pb-16 pt-32"><span className="sr-only">Loading page…</span><div className="h-5 w-32 rounded bg-slate-100"/><div className="h-12 w-4/5 rounded bg-slate-100"/><div className="h-5 w-2/3 rounded bg-slate-100"/><div className="aspect-video rounded-2xl bg-slate-100"/></div>;
}
