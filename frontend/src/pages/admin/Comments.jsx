import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import toast from "../../utils/toast";
import {
  MessageSquare, Search, RefreshCw, CheckCircle2, XCircle, ShieldAlert, Archive, RotateCcw, ExternalLink,
  CornerDownRight, Filter, X, ChevronLeft, ChevronRight, Mail, Loader2, Inbox
} from "lucide-react";
import { adminEngagementService as service } from "../../services/admin/engagementService";
import { useAdmin } from "../../context/admin/AdminContext";
import Modal from "../../components/admin/common/Modal";
import { timeAgo, fullDate } from "../../utils/timeAgo";

const STATUSES = {
  pending: { label: "Pending", badge: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  approved: { label: "Approved", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  rejected: { label: "Rejected", badge: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500" },
  spam: { label: "Spam", badge: "bg-slate-100 text-slate-700 border-slate-300", dot: "bg-slate-500" },
  archived: { label: "Archived", badge: "bg-slate-50 text-slate-500 border-slate-200", dot: "bg-slate-300" }
};
const TABS = ["pending", "approved", "rejected", "spam", "archived", "all"];

const ACTIONS = {
  approved: { label: "Approve", icon: CheckCircle2, className: "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600", done: "approved" },
  rejected: { label: "Reject", icon: XCircle, className: "bg-white hover:bg-rose-50 text-rose-700 border-rose-200", done: "rejected", askReason: true },
  spam: { label: "Spam", icon: ShieldAlert, className: "bg-white hover:bg-slate-50 text-slate-700 border-slate-300", done: "marked as spam", askReason: true },
  archived: { label: "Archive", icon: Archive, className: "bg-white hover:bg-slate-50 text-slate-600 border-slate-300", done: "archived" },
  pending: { label: "Back to pending", icon: RotateCcw, className: "bg-white hover:bg-amber-50 text-amber-700 border-amber-200", done: "returned to the queue" }
};
// What makes sense next for a comment in each state
const NEXT = {
  pending: ["approved", "rejected", "spam"],
  approved: ["rejected", "archived"],
  rejected: ["approved", "pending", "archived"],
  spam: ["pending", "archived"],
  archived: ["pending"]
};
const BULK = ["approved", "rejected", "spam", "archived"];

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default function Comments() {
  const { refreshAdminData } = useAdmin();
  const [status, setStatus] = useState("pending");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [article, setArticle] = useState(null); // { _id, title }
  const [page, setPage] = useState(1);

  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({});
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyIds, setBusyIds] = useState([]);
  const [selected, setSelected] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [reasonFor, setReasonFor] = useState(null); // { ids, status }
  const [reason, setReason] = useState("");

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const seq = useRef(0);
  const load = useCallback(async () => {
    const id = ++seq.current;
    setLoading(true);
    try {
      const params = { status, search, page, limit: 20 };
      if (article) params.articleId = article._id;
      const result = await service.list("comments", params);
      if (id !== seq.current) return;
      setItems(result.data);
      setPagination(result.pagination);
      setCounts(result.counts || {});
      setError("");
    } catch (err) {
      if (id === seq.current) setError(err.message || "Failed to load comments.");
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, [status, search, page, article]);

  useEffect(() => {
    setSelected([]);
    load();
  }, [load]);

  const total = useMemo(() => Object.values(counts).reduce((a, b) => a + b, 0), [counts]);
  const countFor = (tab) => (tab === "all" ? total : counts[tab] || 0);

  /** Moderate one or many comments; reports exactly how many succeeded. */
  const moderate = async (ids, next, note = "") => {
    setBusyIds((b) => [...b, ...ids]);
    const results = await Promise.allSettled(ids.map((id) => service.status("comments", id, next, note)));
    const ok = results.filter((r) => r.status === "fulfilled").length;
    const failed = ids.length - ok;
    setBusyIds((b) => b.filter((id) => !ids.includes(id)));
    if (ok) toast.success(`${ids.length > 1 ? `${ok} of ${ids.length} comments` : "Comment"} ${ACTIONS[next].done}.`);
    if (failed) toast.error(`${plural(failed, "comment")} could not be updated. ${results.find((r) => r.status === "rejected")?.reason?.message || ""}`);
    setSelected([]);
    await load();
    refreshAdminData?.();
  };

  const start = (ids, next) => {
    if (ACTIONS[next].askReason) {
      setReason("");
      setReasonFor({ ids, status: next });
    } else {
      moderate(ids, next);
    }
  };

  const visibleIds = items.map((c) => c._id);
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));
  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const emptyCopy = {
    pending: ["You're all caught up", "No comments are waiting for review."],
    approved: ["No approved comments", "Approved comments appear on their articles."],
    rejected: ["No rejected comments", "Comments you reject are kept here."],
    spam: ["No spam", "Comments marked as spam are kept here."],
    archived: ["Nothing archived", "Archived comments are hidden from articles."],
    all: ["No comments yet", "Comments submitted by readers will appear here for moderation."]
  }[status];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Comments</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">Review reader comments before they appear on articles.</p>
        </div>
        <button type="button" onClick={load} disabled={loading} className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1" role="tablist" aria-label="Comment status">
        {TABS.map((tab) => {
          const active = status === tab;
          return (
            <button
              key={tab}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => {
                setStatus(tab);
                setPage(1);
              }}
              className={`shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-medium transition-colors cursor-pointer ${
                active ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              {tab !== "all" && <span className={`w-2 h-2 rounded-full ${STATUSES[tab].dot}`} />}
              {tab === "all" ? "All" : STATUSES[tab].label}
              <span className={`text-xs px-1.5 py-0.5 rounded-md tabular-nums ${active ? "bg-white/15" : tab === "pending" && countFor(tab) ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-500"}`}>
                {countFor(tab)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search + filters */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            maxLength={150}
            placeholder="Search by reader, comment text or article title"
            aria-label="Search comments"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
        {article && (
          <span className="inline-flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-900 max-w-full">
            <Filter size={14} className="shrink-0" />
            <span className="truncate">On: {article.title}</span>
            <button type="button" onClick={() => { setArticle(null); setPage(1); }} aria-label="Clear article filter" className="p-1 rounded-lg hover:bg-blue-100 cursor-pointer"><X size={14} /></button>
          </span>
        )}
      </div>

      {/* Bulk bar */}
      {items.length > 0 && (
        <div className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-2xl border ${selected.length ? "bg-blue-50/80 border-blue-200" : "bg-white border-slate-200"}`}>
          <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer select-none">
            <input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? [] : visibleIds)} className="w-4 h-4 rounded border-slate-300 text-blue-600" aria-label="Select all comments on this page" />
            {selected.length ? <strong className="font-semibold text-blue-900">{plural(selected.length, "comment")} selected</strong> : "Select all on this page"}
          </label>
          {selected.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {BULK.filter((s) => s !== status).map((s) => {
                const a = ACTIONS[s];
                const Icon = a.icon;
                return (
                  <button key={s} type="button" disabled={busyIds.length > 0} onClick={() => start(selected, s)} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold disabled:opacity-50 cursor-pointer ${a.className}`}>
                    <Icon size={14} /> {a.label}
                  </button>
                );
              })}
              <button type="button" onClick={() => setSelected([])} className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-white cursor-pointer">Clear</button>
            </div>
          )}
        </div>
      )}

      {error && <p role="alert" className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-sm text-rose-800">{error}</p>}

      {/* List */}
      {loading && items.length === 0 ? (
        <div className="space-y-3 animate-pulse" aria-label="Loading comments">{[0, 1, 2].map((i) => <div key={i} className="h-36 rounded-2xl bg-slate-200/70" />)}</div>
      ) : items.length === 0 && !error ? (
        <div className="py-16 px-6 text-center bg-white rounded-2xl border border-slate-200">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mb-3">{status === "pending" ? <CheckCircle2 size={22} className="text-emerald-600" /> : <Inbox size={22} />}</div>
          <h2 className="text-base font-bold text-slate-900">{search || article ? "No comments match this view" : emptyCopy[0]}</h2>
          <p className="text-sm text-slate-500 mt-1">{search || article ? "Try another search or clear the filters." : emptyCopy[1]}</p>
        </div>
      ) : (
        <ul className={`space-y-3 ${loading ? "opacity-60" : ""}`}>
          {items.map((c) => {
            const meta = STATUSES[c.status] || STATUSES.pending;
            const busy = busyIds.includes(c._id);
            const long = (c.content || "").length > 360;
            const open = expanded[c._id];
            return (
              <li key={c._id} className={`bg-white rounded-2xl border transition-colors ${selected.includes(c._id) ? "border-blue-300 ring-1 ring-blue-200" : "border-slate-200/80"}`}>
                <div className="p-4 sm:p-5 flex gap-3 sm:gap-4">
                  <input type="checkbox" checked={selected.includes(c._id)} onChange={() => toggle(c._id)} className="mt-2.5 w-4 h-4 rounded border-slate-300 text-blue-600 shrink-0" aria-label={`Select comment by ${c.commenterName}`} />
                  <span className="w-10 h-10 shrink-0 rounded-full bg-linear-to-br from-sky-400 to-blue-700 text-white font-bold flex items-center justify-center">{(c.commenterName || "?").charAt(0).toUpperCase()}</span>
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="font-semibold text-slate-900">{c.commenterName}</span>
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${meta.badge}`}>{meta.label}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-2">
                          {c.commenterEmail && (
                            <a href={`mailto:${c.commenterEmail}`} className="inline-flex items-center gap-1 hover:text-blue-700"><Mail size={12} /> {c.commenterEmail}</a>
                          )}
                          <span title={fullDate(c.createdAt)}>{timeAgo(c.createdAt)}</span>
                        </div>
                      </div>
                      {c.articleId ? (
                        <div className="flex items-center gap-1 text-xs max-w-full">
                          <button type="button" onClick={() => { setArticle({ _id: c.articleId._id, title: c.articleId.title }); setPage(1); }} className="truncate max-w-[16rem] text-slate-600 hover:text-blue-700 font-medium cursor-pointer" title="Show only comments on this article">
                            {c.articleId.title}
                          </button>
                          <a href={`/blog-details/${c.articleId.slug}`} target="_blank" rel="noopener noreferrer" aria-label="Open article" className="p-1 rounded-md text-slate-400 hover:text-blue-700 hover:bg-slate-100"><ExternalLink size={13} /></a>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Article unavailable</span>
                      )}
                    </div>

                    {c.parentCommentId && (
                      <div className="flex gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                        <CornerDownRight size={14} className="shrink-0 text-slate-400 mt-0.5" />
                        <span className="min-w-0">
                          Reply to <strong className="font-semibold text-slate-800">{c.parentCommentId.commenterName || "a comment"}</strong>
                          {c.parentCommentId.content && <span className="block truncate text-slate-500">&ldquo;{c.parentCommentId.content}&rdquo;</span>}
                        </span>
                      </div>
                    )}

                    <div>
                      <p className={`text-sm text-slate-800 leading-relaxed whitespace-pre-wrap wrap-break-word ${long && !open ? "line-clamp-4" : ""}`}>{c.content}</p>
                      {long && (
                        <button type="button" onClick={() => setExpanded((e) => ({ ...e, [c._id]: !open }))} className="mt-1 text-xs font-semibold text-blue-700 hover:underline cursor-pointer">
                          {open ? "Show less" : "Read full comment"}
                        </button>
                      )}
                    </div>

                    {c.moderatedAt && c.status !== "pending" && (
                      <p className="text-xs text-slate-500">
                        {meta.label} {c.moderatedBy?.name ? `by ${c.moderatedBy.name} ` : ""}{timeAgo(c.moderatedAt)}
                        {c.moderationReason && <span className="text-slate-600"> &middot; Reason: {c.moderationReason}</span>}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {(NEXT[c.status] || []).map((next) => {
                        const a = ACTIONS[next];
                        const Icon = a.icon;
                        return (
                          <button key={next} type="button" disabled={busy} onClick={() => start([c._id], next)} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer ${a.className}`}>
                            {busy ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} />} {a.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>{pagination.total} comments &middot; Page {page} of {pagination.totalPages}</span>
          <div className="flex gap-2">
            <button type="button" disabled={loading || page <= 1} onClick={() => setPage((p) => p - 1)} className="p-2 rounded-lg border border-slate-200 bg-white disabled:opacity-40 cursor-pointer" aria-label="Previous page"><ChevronLeft size={16} /></button>
            <button type="button" disabled={loading || page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)} className="p-2 rounded-lg border border-slate-200 bg-white disabled:opacity-40 cursor-pointer" aria-label="Next page"><ChevronRight size={16} /></button>
          </div>
        </div>
      )}

      {/* Optional reason for reject / spam */}
      <Modal
        isOpen={Boolean(reasonFor)}
        onClose={() => setReasonFor(null)}
        title={reasonFor ? `${ACTIONS[reasonFor.status].label} ${reasonFor.ids.length > 1 ? plural(reasonFor.ids.length, "comment") : "comment"}` : ""}
        subtitle="Add an optional note for other moderators. Readers never see it."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const { ids, status: next } = reasonFor;
            setReasonFor(null);
            moderate(ids, next, reason.trim());
          }}
          className="space-y-4"
        >
          <label htmlFor="moderation-reason" className="block text-xs font-semibold text-slate-700">Reason (optional)</label>
          <textarea id="moderation-reason" autoFocus rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Personal attack, off-topic, promotional link" className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50/70 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600" />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setReasonFor(null)} className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">Cancel</button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-blue-700 cursor-pointer">{reasonFor ? ACTIONS[reasonFor.status].label : ""}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
