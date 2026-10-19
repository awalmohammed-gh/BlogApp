import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  Inbox, Search, RefreshCw, Mail, Copy, Check, Reply, ArrowLeft, Loader2, ChevronLeft, ChevronRight,
  Newspaper, Megaphone, PenLine, Mic, LifeBuoy, Clock, UserCheck
} from "lucide-react";
import { adminEngagementService as service } from "../../services/admin/engagementService";
import { timeAgo, fullDate } from "../../utils/timeAgo";

const STATUSES = {
  new: { label: "New", badge: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-600" },
  in_progress: { label: "In progress", badge: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  resolved: { label: "Resolved", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  archived: { label: "Archived", badge: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" }
};
const TABS = ["new", "in_progress", "resolved", "archived", "all"];

// Labels match the options on the public contact form
const DEPARTMENTS = {
  newsroom: { label: "Editorial tip", icon: Newspaper, className: "bg-sky-50 text-sky-700" },
  advertising: { label: "Advertising", icon: Megaphone, className: "bg-violet-50 text-violet-700" },
  correction: { label: "Correction", icon: PenLine, className: "bg-rose-50 text-rose-700" },
  press: { label: "Press & media", icon: Mic, className: "bg-amber-50 text-amber-700" },
  general: { label: "General support", icon: LifeBuoy, className: "bg-slate-100 text-slate-700" }
};
const dept = (key) => DEPARTMENTS[key] || { label: key || "General", icon: LifeBuoy, className: "bg-slate-100 text-slate-700" };

const DeptChip = ({ value }) => {
  const d = dept(value);
  const Icon = d.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${d.className}`}>
      <Icon size={12} /> {d.label}
    </span>
  );
};

export default function ContactEnquiries() {
  const [status, setStatus] = useState("new");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({});
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState("");
  const [copied, setCopied] = useState(false);

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
      const result = await service.list("contact-submissions", { status, search, page, limit: 20 });
      if (id !== seq.current) return;
      setItems(result.data);
      setPagination(result.pagination);
      setCounts(result.counts || {});
      setError("");
    } catch (err) {
      if (id === seq.current) setError(err.message || "Failed to load enquiries.");
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, [status, search, page]);

  useEffect(() => {
    load();
  }, [load]);

  // Keep the open enquiry in sync with the list; fetch it when it isn't on this page
  useEffect(() => {
    if (!selectedId) {
      setSelected(null);
      return;
    }
    const inList = items.find((i) => i._id === selectedId);
    if (inList) {
      setSelected(inList);
      return;
    }
    let alive = true;
    service
      .get("contact-submissions", selectedId)
      .then((res) => alive && setSelected(res.data))
      .catch(() => alive && setSelectedId(null));
    return () => {
      alive = false;
    };
  }, [selectedId, items]);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const countFor = (tab) => (tab === "all" ? total : counts[tab] || 0);

  const setEnquiryStatus = async (next) => {
    if (!selected || selected.status === next) return;
    setSaving(next);
    try {
      const res = await service.status("contact-submissions", selected._id, next);
      setSelected(res.data);
      toast.success(`Marked as ${STATUSES[next].label.toLowerCase()}.`);
      await load();
    } catch (err) {
      toast.error(err.message || "Status could not be saved.");
    } finally {
      setSaving("");
    }
  };

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(selected.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copy is not available in this browser.");
    }
  };

  const replyHref = selected
    ? `mailto:${selected.email}?subject=${encodeURIComponent(`Re: ${selected.subject || "Your message to Nsemra News"}`)}&body=${encodeURIComponent(
        `\n\n---\nOn ${fullDate(selected.createdAt)}, ${selected.name} wrote:\n${selected.message.split("\n").map((l) => `> ${l}`).join("\n")}`
      )}`
    : "";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Contact Enquiries</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">Messages sent through the public contact form.</p>
        </div>
        <button type="button" onClick={load} disabled={loading} className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1" role="tablist" aria-label="Enquiry status">
        {TABS.map((tab) => {
          const active = status === tab;
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={active}
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
              <span className={`text-xs px-1.5 py-0.5 rounded-md tabular-nums ${active ? "bg-white/15" : tab === "new" && countFor(tab) ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-500"}`}>{countFor(tab)}</span>
            </button>
          );
        })}
      </div>

      {error && <p role="alert" className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-sm text-rose-800">{error}</p>}

      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Inbox list */}
        <section className={`lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 overflow-hidden ${selectedId ? "hidden lg:block" : ""}`} aria-label="Enquiries">
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="search" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} maxLength={150} placeholder="Search name, email, subject or message" aria-label="Search enquiries" className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white" />
            </div>
          </div>

          {loading && items.length === 0 ? (
            <div className="p-3 space-y-2 animate-pulse">{[0, 1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-slate-100" />)}</div>
          ) : items.length === 0 ? (
            <div className="py-14 px-6 text-center">
              <div className="w-11 h-11 mx-auto rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mb-3"><Inbox size={20} /></div>
              <p className="text-sm font-semibold text-slate-900">{search ? "No enquiries match your search" : status === "new" ? "No new enquiries" : "Nothing here"}</p>
              <p className="text-xs text-slate-500 mt-1">{search ? "Try another word." : "Messages from the contact form appear here."}</p>
            </div>
          ) : (
            <ul className={`divide-y divide-slate-100 max-h-[70vh] overflow-y-auto custom-scrollbar ${loading ? "opacity-60" : ""}`}>
              {items.map((item) => {
                const active = item._id === selectedId;
                const unread = item.status === "new";
                return (
                  <li key={item._id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(item._id)}
                      aria-current={active ? "true" : undefined}
                      className={`w-full text-left px-4 py-3.5 flex gap-3 transition-colors cursor-pointer ${active ? "bg-blue-50/70" : "hover:bg-slate-50"}`}
                    >
                      <span className={`mt-2 w-2 h-2 shrink-0 rounded-full ${unread ? "bg-blue-600" : "bg-transparent"}`} aria-label={unread ? "New" : undefined} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className={`truncate text-sm ${unread ? "font-bold text-slate-900" : "font-medium text-slate-700"}`}>{item.name}</span>
                          <span className="shrink-0 text-[11px] text-slate-400" title={fullDate(item.createdAt)}>{timeAgo(item.createdAt)}</span>
                        </span>
                        <span className={`block truncate text-sm ${unread ? "font-semibold text-slate-800" : "text-slate-600"}`}>{item.subject || "No subject"}</span>
                        <span className="block truncate text-xs text-slate-500 mt-0.5">{item.message}</span>
                        <span className="mt-2 flex items-center gap-2">
                          <DeptChip value={item.department} />
                          {status === "all" && <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${STATUSES[item.status]?.badge}`}>{STATUSES[item.status]?.label}</span>}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {pagination.totalPages > 1 && (
            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Page {page} of {pagination.totalPages}</span>
              <div className="flex gap-1.5">
                <button type="button" disabled={loading || page <= 1} onClick={() => setPage((p) => p - 1)} className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 cursor-pointer" aria-label="Previous page"><ChevronLeft size={14} /></button>
                <button type="button" disabled={loading || page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)} className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 cursor-pointer" aria-label="Next page"><ChevronRight size={14} /></button>
              </div>
            </div>
          )}
        </section>

        {/* Reading pane */}
        <section className={`lg:col-span-7 lg:sticky lg:top-24 ${selectedId ? "" : "hidden lg:block"}`} aria-label="Enquiry details">
          {!selected ? (
            <div className="h-full min-h-80 flex flex-col items-center justify-center text-center p-10 bg-white rounded-2xl border border-dashed border-slate-300">
              <Mail size={28} className="text-slate-300 mb-3" />
              <p className="text-sm font-semibold text-slate-700">Select an enquiry to read it</p>
              <p className="text-xs text-slate-500 mt-1">The full message, sender details and status controls appear here.</p>
            </div>
          ) : (
            <article className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
              <div className="p-5 sm:p-6 border-b border-slate-100 space-y-4">
                <button type="button" onClick={() => setSelectedId(null)} className="lg:hidden inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 cursor-pointer">
                  <ArrowLeft size={14} /> All enquiries
                </button>
                <div className="flex flex-wrap items-center gap-2">
                  <DeptChip value={selected.department} />
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${STATUSES[selected.status]?.badge}`}>{STATUSES[selected.status]?.label}</span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 wrap-break-word">{selected.subject || "No subject"}</h2>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-10 h-10 shrink-0 rounded-full bg-linear-to-br from-sky-400 to-blue-700 text-white font-bold flex items-center justify-center">{selected.name.charAt(0).toUpperCase()}</span>
                    <div className="min-w-0 text-sm">
                      <div className="font-semibold text-slate-900 truncate">{selected.name}</div>
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <span className="truncate">{selected.email}</span>
                        <button type="button" onClick={copyEmail} aria-label="Copy email address" title="Copy email" className="p-1 rounded-md hover:bg-slate-100 cursor-pointer">
                          {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-slate-500 inline-flex items-center gap-1"><Clock size={13} /> {fullDate(selected.createdAt)}</span>
                </div>
              </div>

              <div className="p-5 sm:p-6">
                <p className="text-sm sm:text-[15px] text-slate-800 leading-relaxed whitespace-pre-wrap wrap-break-word">{selected.message}</p>
              </div>

              <div className="p-5 sm:p-6 bg-slate-50/70 border-t border-slate-100 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <a href={replyHref} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-blue-700 transition-colors">
                    <Reply size={15} /> Reply by email
                  </a>
                  <span className="text-xs text-slate-500">Opens your email app with the message quoted.</span>
                </div>

                <div>
                  <span className="block text-xs font-semibold text-slate-700 mb-2">Status</span>
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Set status">
                    {Object.entries(STATUSES).map(([key, meta]) => {
                      const current = selected.status === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          aria-pressed={current}
                          disabled={Boolean(saving) || current}
                          onClick={() => setEnquiryStatus(key)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer disabled:cursor-default ${
                            current ? `${meta.badge} ring-1 ring-current/20` : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                          }`}
                        >
                          {saving === key ? <Loader2 size={13} className="animate-spin" /> : <span className={`w-2 h-2 rounded-full ${meta.dot}`} />}
                          {meta.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selected.reviewedAt && (
                  <p className="text-xs text-slate-500 inline-flex items-center gap-1.5">
                    <UserCheck size={13} /> Last updated {selected.reviewedBy?.name ? `by ${selected.reviewedBy.name} ` : ""}{timeAgo(selected.reviewedAt)}
                  </p>
                )}
              </div>
            </article>
          )}
        </section>
      </div>
    </div>
  );
}
