import { useCallback, useEffect, useState } from "react";
import { engagementService } from "../../services/public/engagementService";

export default function CommentSection({ slug }) {
  const [comments, setComments] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reply, setReply] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", content: "", website: "" });
  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    try { const result = await engagementService.comments(slug, { page, limit: 10 }); setComments(result.data); setTotal(result.pagination.total); setPages(result.pagination.totalPages); setEnabled(result.commentsEnabled); setLoadError(""); }
    catch (err) { setLoadError(err.message); }
    finally { setLoading(false); }
  }, [slug, page]);
  useEffect(() => { load(); }, [load]);
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const result = await engagementService.comment(slug, { ...form, parentCommentId: reply?._id || null });
      setNotice(result.message); setForm((current) => ({ ...current, content: "" })); setReply(null);
    } catch (err) { setError(err.message || "Unable to submit your comment. Please try again."); }
    finally { setBusy(false); }
  };
  const field = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  return <section className="max-w-4xl mx-auto p-4 sm:p-6 space-y-5" aria-labelledby="comments-heading">
    <div className="flex items-center justify-between gap-4"><h2 id="comments-heading" className="text-2xl font-bold">Comments & Discussion ({total})</h2><button className="text-blue-700 underline text-sm" onClick={load}>Refresh comments</button></div>
    {loading ? <p role="status">Loading comments…</p> : loadError ? <p role="alert" className="text-red-700">{loadError}</p> : comments.length === 0 ? <p className="text-slate-500">No approved comments yet.</p> : <div className="space-y-4">{comments.map((comment) => <article className="p-4 border rounded-xl bg-slate-50" key={comment._id}>
      <div className="flex justify-between gap-4"><h3 className="font-semibold">{comment.commenterName}</h3><time className="text-xs text-slate-500">{new Date(comment.createdAt).toLocaleDateString()}</time></div>
      {comment.parentCommentId && <p className="text-xs text-slate-500 my-2">Reply to {comments.find((parent) => parent._id === comment.parentCommentId)?.commenterName || `comment ${comment.parentCommentId}`}</p>}
      <p className="whitespace-pre-wrap wrap-break-word my-3">{comment.content}</p>
      {enabled && <button className="text-blue-700 text-sm underline" onClick={() => setReply(comment)}>Reply</button>}
    </article>)}</div>}
    {pages > 1 && <div className="flex gap-4 items-center"><button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</button><span>Page {page} of {pages}</span><button disabled={page === pages} onClick={() => setPage((p) => p + 1)}>Next</button></div>}
    {!enabled ? <p>New comments are currently disabled.</p> : <form onSubmit={submit} className="space-y-4 border rounded-2xl p-5">
      <h3 className="font-bold">{reply ? `Reply to ${reply.commenterName}` : "Join the discussion"}</h3>{reply && <button type="button" className="underline text-sm" onClick={() => setReply(null)}>Cancel reply</button>}
      <p className="text-sm text-slate-500">Comments are reviewed before publication. Your email stays private.</p>
      <div className="grid sm:grid-cols-2 gap-4"><label className="text-sm">Name<input required maxLength={100} name="name" value={form.name} onChange={field} className="block border rounded-lg w-full p-3 mt-1" /></label><label className="text-sm">Email<input required type="email" maxLength={254} name="email" value={form.email} onChange={field} className="block border rounded-lg w-full p-3 mt-1" /></label></div>
      <input aria-hidden="true" tabIndex={-1} autoComplete="off" className="hidden" name="website" value={form.website} onChange={field} />
      <label className="block text-sm">Comment<textarea required maxLength={2000} rows={4} name="content" value={form.content} onChange={field} className="block border rounded-lg w-full p-3 mt-1" /></label>
      {error && <p role="alert" className="text-red-700">{error}</p>}{notice && <p role="status" className="text-green-800">{notice}</p>}
      <button disabled={busy || loading || Boolean(loadError)} className="px-5 py-3 bg-blue-800 text-white rounded-xl disabled:opacity-50">{busy ? "Submitting…" : "Submit for moderation"}</button>
    </form>}
  </section>;
}
