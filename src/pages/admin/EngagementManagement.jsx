import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { adminEngagementService as service } from "../../services/admin/engagementService";

const definitions = {
  comments: { title: "Reader Comments", collection: "comments", statuses: ["pending", "approved", "rejected", "spam", "archived"] },
  contact: { title: "Contact Enquiries", collection: "contact-submissions", statuses: ["new", "in_progress", "resolved", "archived"] },
  newsletter: { title: "Newsletter Subscribers", collection: "newsletter-subscribers", statuses: ["active", "pending_verification", "unsubscribed"] }
};
const label = (value) => value.replaceAll("_", " ");
export default function EngagementManagement({ kind }) {
  const config = definitions[kind];
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({});
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState({ search: "", status: "all", page: 1 });
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [selected, setSelected] = useState(null);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await service.list(config.collection, { ...query, limit: 20 });
      setItems(result.data); setPagination(result.pagination); setCounts(result.counts || {}); setError("");
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [config.collection, query]);
  useEffect(() => { load(); }, [load]);
  const update = async (item, status) => {
    setBusy(item._id);
    try { await service.status(config.collection, item._id, status); toast.success("Status saved."); setSelected(null); await load(); }
    catch (err) { toast.error(err.message); }
    finally { setBusy(""); }
  };
  return <div className="space-y-6">
    <h1 className="text-2xl font-bold">{config.title}</h1>
    {Object.keys(counts).length > 0 && <div className="flex flex-wrap gap-3">{config.statuses.map((status) => <div className="bg-white border rounded-xl p-4 capitalize" key={status}>{label(status)}: <strong>{counts[status] || 0}</strong></div>)}</div>}
    <form className="flex flex-wrap gap-3 bg-white rounded-xl border p-4" onSubmit={(e) => { e.preventDefault(); setQuery((q) => ({ ...q, search, page: 1 })); }}>
      <input aria-label="Search records" className="border rounded-lg p-2 flex-1" placeholder={kind === "newsletter" ? "Search email" : "Search sender, subject or content"} value={search} maxLength={150} onChange={(e) => setSearch(e.target.value)} />
      <select aria-label="Filter by status" className="border rounded-lg p-2 capitalize" value={query.status} onChange={(e) => setQuery((q) => ({ ...q, status: e.target.value, page: 1 }))}><option value="all">All statuses</option>{config.statuses.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select>
      <button className="px-4 py-2 rounded-lg bg-blue-700 text-white">Search</button><button type="button" className="px-4 py-2 border rounded-lg" onClick={load}>Refresh</button>
    </form>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {loading ? <p role="status">Loading records…</p> : error ? null : items.length === 0 ? <p className="p-10 bg-white border rounded-xl">No records match this view.</p> : <div className="space-y-3">{items.map((item) => <article key={item._id} className="bg-white border rounded-xl p-5 space-y-3">
      <div className="flex justify-between gap-4"><div><h2 className="font-semibold">{kind === "comments" ? item.commenterName : item.name || item.email}</h2><p className="text-xs text-slate-500">{item.email || item.commenterEmail} · {new Date(item.createdAt).toLocaleString()}</p></div><span className="capitalize text-sm">{label(item.status)}</span></div>
      {kind === "comments" && <><Link className="text-blue-700 underline" to={`/blog-details/${item.articleId?.slug || ""}`}>{item.articleId?.title || "Article unavailable"}</Link><p className="whitespace-pre-wrap wrap-break-word">{item.content}</p>{item.parentCommentId && <p className="text-xs text-slate-500">Reply to comment {item.parentCommentId}</p>}</>}
      {kind === "contact" && <><p className="font-medium">{item.subject || "No subject"} · {item.department}</p><button className="text-blue-700 underline" onClick={() => setSelected(item)}>View full message</button></>}
      {kind === "newsletter" && <p className="text-sm">Source: {item.source} · Verification email: {label(item.emailStatus)}</p>}
      {kind !== "newsletter" && <div className="flex flex-wrap gap-2">{config.statuses.filter((s) => s !== item.status).map((s) => <button key={s} disabled={busy === item._id} className="border px-3 py-1.5 rounded-lg text-sm capitalize disabled:opacity-50" onClick={() => update(item, s)}>{s === "pending" ? "Restore to pending" : label(s)}</button>)}</div>}
    </article>)}</div>}
    <div className="flex items-center gap-4"><button disabled={loading || query.page <= 1} onClick={() => setQuery((q) => ({ ...q, page: q.page - 1 }))} className="border px-3 py-2 rounded-lg disabled:opacity-40">Previous</button><span>{pagination.total} records · Page {query.page} of {pagination.totalPages}</span><button disabled={loading || query.page >= pagination.totalPages} onClick={() => setQuery((q) => ({ ...q, page: q.page + 1 }))} className="border px-3 py-2 rounded-lg disabled:opacity-40">Next</button></div>
    {selected && <div className="fixed inset-0 z-50 bg-black/50 flex justify-center items-center p-4"><section role="dialog" aria-modal="true" aria-labelledby="enquiry-heading" className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[85vh] overflow-auto space-y-4"><h2 id="enquiry-heading" className="text-xl font-bold">{selected.subject || "Contact enquiry"}</h2><p>{selected.name} · {selected.email}</p><p className="whitespace-pre-wrap wrap-break-word">{selected.message}</p><button autoFocus className="border rounded-lg px-4 py-2" onClick={() => setSelected(null)}>Close</button></section></div>}
  </div>;
}
