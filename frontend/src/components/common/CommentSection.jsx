import React, { useCallback, useEffect, useState, useRef } from "react";
import { 
  MessageSquare, 
  Send, 
  Heart, 
  Share2, 
  CornerDownRight, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  User, 
  Mail, 
  X,
  Sparkles
} from "lucide-react";
import { engagementService } from "../../services/public/engagementService";
import { timeAgo } from "../../utils/timeAgo";

// Curated modern editorial avatar gradients
const AVATAR_GRADIENTS = [
  "from-blue-600 to-indigo-700",
  "from-emerald-600 to-teal-700",
  "from-purple-600 to-violet-800",
  "from-amber-600 to-orange-700",
  "from-rose-600 to-pink-700",
  "from-cyan-600 to-blue-800"
];

function getAvatarGradient(name = "") {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function getInitials(name = "") {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "R"
  );
}

export default function CommentSection({ slug }) {
  const [comments, setComments] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reply, setReply] = useState(null);
  const [newCommentId, setNewCommentId] = useState(null);
  const [cooldown, setCooldown] = useState(0);
  const [likes, setLikes] = useState({});
  const [copiedId, setCopiedId] = useState(null);

  const formRef = useRef(null);
  const textareaRef = useRef(null);

  // Initialize form with stored name and email for reader convenience
  const [form, setForm] = useState(() => {
    return {
      name: typeof window !== "undefined" ? localStorage.getItem("nsemfoa_reader_name") || "" : "",
      email: typeof window !== "undefined" ? localStorage.getItem("nsemfoa_reader_email") || "" : "",
      content: "",
      website: "" // Honeypot field
    };
  });

  // Cooldown countdown timer effect
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Load comments from backend
  const load = useCallback(async (isRefresh = false) => {
    if (!slug) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const result = await engagementService.comments(slug, { page, limit: 15 });
      setComments(result.data || []);
      setTotal(result.pagination?.total || 0);
      setPages(result.pagination?.totalPages || 1);
      setEnabled(result.commentsEnabled !== false);
      setLoadError("");
    } catch (err) {
      setLoadError(err.message || "Unable to load reader comments.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [slug, page]);

  useEffect(() => {
    load();
  }, [load]);

  // Handle like toggle
  const handleLike = (commentId) => {
    setLikes((prev) => {
      const isLiked = Boolean(prev[commentId]);
      return {
        ...prev,
        [commentId]: isLiked ? Math.max(0, (prev[commentId] || 1) - 1) : (prev[commentId] || 0) + 1
      };
    });
  };

  // Handle share comment
  const handleShare = async (comment) => {
    try {
      const url = `${window.location.origin}${window.location.pathname}#comment-${comment._id}`;
      await navigator.clipboard.writeText(url);
      setCopiedId(comment._id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch (_) {
      // Fallback
    }
  };

  // Submit comment handler with real-time UI append and anti-abuse safeguards
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    // Anti-Abuse Check 1: Honeypot check
    if (form.website) {
      setError("Unable to submit this comment.");
      return;
    }

    // Anti-Abuse Check 2: Cooldown check
    if (cooldown > 0) {
      setError(`Please wait ${cooldown} seconds before posting another comment.`);
      return;
    }

    // Anti-Abuse Check 3: Content length check
    const cleanContent = form.content.trim();
    if (cleanContent.length < 3) {
      setError("Please write a meaningful comment (at least 3 characters).");
      return;
    }
    if (cleanContent.length > 1000) {
      setError("Comments cannot exceed 1000 characters.");
      return;
    }

    // Anti-Abuse Check 4: Excessive URL check
    const urlMatches = cleanContent.match(/https?:\/\/[^\s]+/gi);
    if (urlMatches && urlMatches.length > 2) {
      setError("Comments cannot contain more than 2 links to prevent spam.");
      return;
    }

    setBusy(true);

    try {
      const result = await engagementService.comment(slug, {
        name: form.name.trim(),
        email: form.email.trim(),
        content: cleanContent,
        parentCommentId: reply?._id || null,
        website: form.website
      });

      try {
        localStorage.setItem("nsemfoa_reader_name", form.name.trim());
        localStorage.setItem("nsemfoa_reader_email", form.email.trim());
      } catch (storageErr) {
        void storageErr;
      }

      // AUTOMATICALLY APPEAR ON USER INTERFACE:
      // Construct newly posted comment object and prepend to list immediately
      const newComment = result.data || {
        _id: `temp-${Date.now()}`,
        articleId: slug,
        commenterName: form.name.trim(),
        content: cleanContent,
        parentCommentId: reply?._id || null,
        createdAt: new Date().toISOString(),
        status: "approved"
      };

      setComments((prev) => [newComment, ...prev]);
      setTotal((t) => t + 1);
      setNewCommentId(newComment._id);

      // Start 20-second anti-spam cooldown
      setCooldown(20);

      // Success feedback
      setNotice(result.message || "Your comment has been published!");
      setForm((current) => ({ ...current, content: "" }));
      setReply(null);

      // Scroll smoothly to comments section
      const commentsHeading = document.getElementById("comments-heading");
      if (commentsHeading) {
        commentsHeading.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }

      // Auto-clear success notice after 5 seconds
      setTimeout(() => setNotice(""), 5000);
    } catch (err) {
      setError(err.message || "Unable to submit your comment. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const field = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleReplyClick = (comment) => {
    setReply(comment);
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <section className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-8" aria-labelledby="comments-heading">
      {/* Modern Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
            <span className="text-[11px] font-bold tracking-widest uppercase text-blue-700">
              Reader Discussion
            </span>
          </div>
          <h2 id="comments-heading" className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-serif tracking-tight flex items-center gap-2">
            Comments & Perspectives
            <span className="text-sm font-sans font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {total}
            </span>
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Civility Protected</span>
          </div>

          <button
            type="button"
            onClick={() => load(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-all disabled:opacity-50"
            title="Refresh comments discussion"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-blue-600" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Modern Comment Form */}
      {enabled ? (
        <form
          ref={formRef}
          onSubmit={submit}
          className="relative bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-sm transition-all focus-within:border-blue-500/80 focus-within:ring-4 focus-within:ring-blue-500/10"
        >
          {/* Form Header / Reply Banner */}
          <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  {reply ? `Replying to @${reply.commenterName}` : "Join the conversation"}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {reply ? "Your response will be linked to this comment thread." : "Share your respectful thoughts on this story."}
                </p>
              </div>
            </div>

            {reply && (
              <button
                type="button"
                onClick={() => setReply(null)}
                className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-medium px-2 py-1 rounded-md hover:bg-rose-50 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Cancel Reply
              </button>
            )}
          </div>

          {/* Reader Identity Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="commenter-name" className="block text-xs font-semibold text-slate-700 mb-1">
                Your Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
                <input
                  id="commenter-name"
                  required
                  maxLength={60}
                  name="name"
                  placeholder="e.g. Kwame Mensah"
                  value={form.name}
                  onChange={field}
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:border-blue-600 focus:outline-hidden transition-all"
                />
              </div>
            </div>

            <div>
              <label htmlFor="commenter-email" className="block text-xs font-semibold text-slate-700 mb-1">
                Your Email <span className="text-xs text-slate-400 font-normal">(never published)</span> <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
                <input
                  id="commenter-email"
                  required
                  type="email"
                  maxLength={120}
                  name="email"
                  placeholder="name@example.com"
                  value={form.email}
                  onChange={field}
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:border-blue-600 focus:outline-hidden transition-all"
                />
              </div>
            </div>
          </div>

          {/* Hidden Honeypot Field for Bot Trapping */}
          <input
            aria-hidden="true"
            tabIndex={-1}
            autoComplete="off"
            className="hidden"
            name="website"
            value={form.website}
            onChange={field}
          />

          {/* Comment Textarea */}
          <div className="mb-3">
            <label htmlFor="comment-content" className="sr-only">Comment Content</label>
            <textarea
              id="comment-content"
              ref={textareaRef}
              required
              maxLength={1000}
              rows={4}
              name="content"
              placeholder={reply ? `Write your reply to ${reply.commenterName}...` : "What are your perspectives on this story? Please be thoughtful and constructive..."}
              value={form.content}
              onChange={field}
              className="w-full p-3.5 text-sm bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:border-blue-600 focus:outline-hidden transition-all resize-y leading-relaxed"
            />
          </div>

          {/* Feedback Alerts */}
          {error && (
            <div role="alert" className="flex items-center gap-2 p-3 mb-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {notice && (
            <div role="status" className="flex items-center gap-2 p-3 mb-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{notice}</span>
            </div>
          )}

          {/* Form Actions Footer */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className={`font-mono text-[11px] ${form.content.length > 900 ? "text-amber-600 font-bold" : "text-slate-400"}`}>
                {form.content.length} / 1000 characters
              </span>
              <span>&bull;</span>
              <span className="text-[11px] text-slate-400">Max 2 links</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={busy || loading || Boolean(loadError) || cooldown > 0 || !form.content.trim()}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white font-semibold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
              >
                {busy ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : cooldown > 0 ? (
                  <span>Please wait ({cooldown}s)</span>
                ) : (
                  <>
                    <span>Post Comment</span>
                    <Send className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-center text-sm text-slate-600">
          New comments are currently disabled for this story.
        </div>
      )}

      {/* Comment List Section */}
      <div className="space-y-4">
        {loading ? (
          <div className="space-y-3 py-6" role="status">
            {[1, 2, 3].map((skeleton) => (
              <div key={skeleton} className="p-5 border border-slate-200 rounded-2xl bg-white animate-pulse space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200" />
                  <div className="space-y-1.5">
                    <div className="w-32 h-4 bg-slate-200 rounded-sm" />
                    <div className="w-20 h-3 bg-slate-100 rounded-sm" />
                  </div>
                </div>
                <div className="w-full h-12 bg-slate-100 rounded-md" />
              </div>
            ))}
          </div>
        ) : loadError ? (
          <div role="alert" className="p-5 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-bold">Unable to load discussion</p>
              <p className="text-xs mt-0.5">{loadError}</p>
            </div>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl bg-slate-50/80 border border-dashed border-slate-200">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 font-serif">Be the first to join the conversation</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Share your perspective or insights on this developing story.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => {
              const isNewlyAdded = comment._id === newCommentId;
              const parentComment = comment.parentCommentId
                ? comments.find((p) => p._id === comment.parentCommentId)
                : null;
              const likeCount = likes[comment._id] || 0;
              const isLiked = likeCount > 0;
              const isCopied = copiedId === comment._id;

              return (
                <article
                  key={comment._id}
                  id={`comment-${comment._id}`}
                  className={`relative p-5 rounded-2xl border transition-all duration-300 ${
                    comment.parentCommentId
                      ? "ml-4 sm:ml-10 bg-slate-50/80 border-slate-200/90"
                      : "bg-white border-slate-200 shadow-2xs"
                  } ${isNewlyAdded ? "ring-2 ring-emerald-500/50 bg-emerald-50/20" : ""}`}
                >
                  {/* Newly posted badge */}
                  {isNewlyAdded && (
                    <div className="absolute -top-2.5 right-4 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold tracking-wider shadow-xs animate-in zoom-in-75">
                      <Sparkles className="w-3 h-3" />
                      Just Posted
                    </div>
                  )}

                  {/* Comment Author Header */}
                  <div className="flex items-center justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar */}
                      <div
                        className={`w-9 h-9 rounded-full bg-gradient-to-tr ${getAvatarGradient(
                          comment.commenterName
                        )} text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs`}
                      >
                        {getInitials(comment.commenterName)}
                      </div>

                      {/* Author Details */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                            {comment.commenterName}
                          </h4>
                          <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-slate-100 text-slate-500">
                            Reader
                          </span>
                        </div>
                        <time className="text-[11px] text-slate-400 font-sans block">
                          {timeAgo(comment.createdAt)}
                        </time>
                      </div>
                    </div>
                  </div>

                  {/* Parent Thread Context if Reply */}
                  {comment.parentCommentId && (
                    <div className="flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50/60 px-2.5 py-1 rounded-lg my-2 border border-blue-100/60">
                      <CornerDownRight className="w-3 h-3 shrink-0" />
                      <span className="text-slate-500 text-[11px]">Replying to</span>
                      <strong className="font-semibold text-[11px]">
                        @{parentComment ? parentComment.commenterName : "reader"}
                      </strong>
                    </div>
                  )}

                  {/* Comment Body Content */}
                  <div className="text-slate-800 text-sm leading-relaxed my-2 whitespace-pre-wrap break-words">
                    {comment.content}
                  </div>

                  {/* Comment Actions Bar */}
                  <div className="flex items-center justify-between pt-2 mt-3 border-t border-slate-100 text-xs text-slate-500">
                    <div className="flex items-center gap-4">
                      {/* Like Reaction Button */}
                      <button
                        type="button"
                        onClick={() => handleLike(comment._id)}
                        className={`inline-flex items-center gap-1.5 text-xs font-medium transition-colors ${
                          isLiked ? "text-rose-600 font-semibold" : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${isLiked ? "fill-current text-rose-600" : ""}`} />
                        <span>{likeCount > 0 ? likeCount : "Like"}</span>
                      </button>

                      {/* Reply Button */}
                      {enabled && (
                        <button
                          type="button"
                          onClick={() => handleReplyClick(comment)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-blue-700 transition-colors"
                        >
                          <CornerDownRight className="w-3.5 h-3.5" />
                          <span>Reply</span>
                        </button>
                      )}
                    </div>

                    {/* Share Action */}
                    <button
                      type="button"
                      onClick={() => handleShare(comment)}
                      className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-700 transition-colors"
                      title="Copy link to comment"
                    >
                      <Share2 className="w-3 h-3" />
                      <span>{isCopied ? "Copied!" : "Share"}</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Modern Pagination Bar */}
        {pages > 1 && (
          <div className="flex items-center justify-between pt-6 border-t border-slate-200">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => {
                setPage((p) => Math.max(1, p - 1));
                formRef.current?.scrollIntoView({ behavior: "smooth" });
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              &larr; Previous Page
            </button>

            <span className="text-xs font-semibold text-slate-600">
              Page {page} of {pages}
            </span>

            <button
              type="button"
              disabled={page === pages}
              onClick={() => {
                setPage((p) => Math.min(pages, p + 1));
                formRef.current?.scrollIntoView({ behavior: "smooth" });
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Next Page &rarr;
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
