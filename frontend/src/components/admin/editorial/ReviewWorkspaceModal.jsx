import { useState, useEffect } from "react";
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Eye,
  GitPullRequest,
  Send,
  History,
  FileText,
  User,
  Calendar,
  MessageSquare,
  GitCompare,
  UploadCloud,
  ShieldAlert,
  ArrowRight
} from "lucide-react";
import toast from "react-hot-toast";
import Modal from "../common/Modal";
import ReviewStatusBadge from "./ReviewStatusBadge";
import RevisionComparisonModal from "./RevisionComparisonModal";
import editorialService from "../../../services/admin/editorialService";
import { articleService } from "../../../services/admin/articleService";
import { sanitizeHtml } from "../../../utils/sanitizeHtml";

export const ReviewWorkspaceModal = ({
  isOpen,
  onClose,
  submissionId,
  currentAdminUser,
  onDecisionMade
}) => {
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  // Decision Dialog States
  const [activeDecisionType, setActiveDecisionType] = useState(null); // 'approve' | 'request_changes' | 'reject' | 'publish'
  const [decisionNote, setDecisionNote] = useState("");
  const [decisionLoading, setDecisionLoading] = useState(false);

  // Sub-modals
  const [showComparison, setShowComparison] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [auditHistory, setAuditHistory] = useState([]);

  const loadSubmission = async () => {
    if (!submissionId) return;
    try {
      setLoading(true);
      const [subRes, comRes] = await Promise.all([
        editorialService.getSubmission(submissionId),
        editorialService.getComments(submissionId)
      ]);
      if (subRes.success) {
        setSubmission(subRes.data);
      }
      if (comRes.success) {
        setComments(comRes.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load submission workspace");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && submissionId) {
      loadSubmission();
      setActiveDecisionType(null);
      setDecisionNote("");
    }
  }, [isOpen, submissionId]);

  const handleClaim = async () => {
    try {
      const res = await editorialService.claimReview(submission._id);
      if (res.success) {
        toast.success("Review claimed successfully");
        loadSubmission();
        if (onDecisionMade) onDecisionMade();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to claim review");
    }
  };

  const handleRelease = async () => {
    try {
      const res = await editorialService.releaseReview(submission._id);
      if (res.success) {
        toast.success("Review released back to queue");
        loadSubmission();
        if (onDecisionMade) onDecisionMade();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to release review");
    }
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setSubmittingComment(true);
      const res = await editorialService.addComment(submission._id, {
        message: newComment.trim(),
        type: "feedback"
      });
      if (res.success) {
        setComments((prev) => [...prev, res.data]);
        setNewComment("");
        toast.success("Feedback posted");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to post comment");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleExecuteDecision = async () => {
    if (!activeDecisionType) return;

    if (["request_changes", "reject"].includes(activeDecisionType) && !decisionNote.trim()) {
      toast.error("An explanatory review note is required for this decision");
      return;
    }

    try {
      setDecisionLoading(true);

      if (activeDecisionType === "approve") {
        const res = await editorialService.approveSubmission(submission._id, {
          reviewNote: decisionNote.trim() || "Approved for publication"
        });
        if (res.success) {
          toast.success("Story approved for publication");
          setActiveDecisionType(null);
          loadSubmission();
          if (onDecisionMade) onDecisionMade();
        }
      } else if (activeDecisionType === "request_changes") {
        const res = await editorialService.requestChanges(submission._id, {
          reviewNote: decisionNote.trim()
        });
        if (res.success) {
          toast.success("Corrections requested from author");
          setActiveDecisionType(null);
          loadSubmission();
          if (onDecisionMade) onDecisionMade();
        }
      } else if (activeDecisionType === "reject") {
        const res = await editorialService.rejectSubmission(submission._id, {
          reviewNote: decisionNote.trim()
        });
        if (res.success) {
          toast.success("Story submission rejected");
          setActiveDecisionType(null);
          loadSubmission();
          if (onDecisionMade) onDecisionMade();
        }
      } else if (activeDecisionType === "publish") {
        const res = await articleService.publishArticle(submission.articleId._id);
        if (res.success) {
          toast.success("Article is now live on the public website!");
          setActiveDecisionType(null);
          loadSubmission();
          if (onDecisionMade) onDecisionMade();
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Decision operation failed");
    } finally {
      setDecisionLoading(false);
    }
  };

  const handleLoadHistory = async () => {
    try {
      const res = await editorialService.getHistory(submission._id);
      if (res.success) {
        setAuditHistory(res.data);
        setShowHistory(true);
      }
    } catch (err) {
      toast.error("Failed to load audit history");
    }
  };

  if (!isOpen) return null;

  const revision = submission?.revisionId || {};
  const article = submission?.articleId || {};
  const isAuthor = submission?.submittedBy?._id === currentAdminUser?._id;
  const isAssigned = submission?.assignedTo?._id === currentAdminUser?._id;
  const isSuperAdmin = currentAdminUser?.role === "super_admin";
  const canReview = (isAssigned || isSuperAdmin) && !isAuthor;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Editorial Desk Review Workspace"
        subtitle={`Story #${submission?._id?.substring(18)}: Version ${revision?.version || 1} submitted by ${submission?.submittedBy?.name || "Author"}`}
        maxWidth="max-w-6xl"
      >
        {loading || !submission ? (
          <div className="py-20 text-center text-xs text-slate-500">
            Loading editorial review snapshot...
          </div>
        ) : (
          <div className="space-y-6">
            {/* Top Overview & Action Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3">
                <ReviewStatusBadge status={submission.status} />
                <span className="text-xs text-slate-600 font-medium">
                  Assigned Reviewer:{" "}
                  <strong className="text-slate-900">
                    {submission.assignedTo ? submission.assignedTo.name : "Unassigned"}
                  </strong>
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowComparison(true)}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <GitCompare size={13} />
                  <span>Compare Revisions</span>
                </button>

                <button
                  type="button"
                  onClick={handleLoadHistory}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <History size={13} />
                  <span>Audit History</span>
                </button>

                {!submission.assignedTo && !isAuthor && (
                  <button
                    type="button"
                    onClick={handleClaim}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <GitPullRequest size={13} />
                    <span>Claim Review</span>
                  </button>
                )}

                {isAssigned && ["pending", "in_review"].includes(submission.status) && (
                  <button
                    type="button"
                    onClick={handleRelease}
                    className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Release Assignment
                  </button>
                )}
              </div>
            </div>

            {/* Author Submission Note Banner */}
            {submission.submissionNote && (
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                <AlertTriangle size={15} className="shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <span className="font-bold">Author's Note to Desk: </span>
                  <span>{submission.submissionNote}</span>
                </div>
              </div>
            )}

            {/* Self-Review Notice */}
            {isAuthor && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2">
                <ShieldAlert size={15} className="shrink-0 text-blue-600 mt-0.5" />
                <div>
                  <span className="font-bold">Independent Desk Review Policy: </span>
                  <span>You submitted this story. Another editor must inspect and approve it.</span>
                </div>
              </div>
            )}

            {/* Main 2-Column Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column (2/3): Exact Submitted Article Content */}
              <div className="lg:col-span-2 space-y-4">
                <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-4 shadow-2xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-[10px] font-bold rounded uppercase tracking-wider">
                      {revision.category?.name || article.category?.name || "General Desk"}
                    </span>
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded">
                      Revision v{revision.version || 1} Snapshot
                    </span>
                    <span className="text-[11px] text-slate-400 ml-auto">
                      Submitted {new Date(submission.submittedAt).toLocaleString()}
                    </span>
                  </div>

                  <h2 className="text-xl font-bold text-slate-900 leading-snug">
                    {revision.title || article.title}
                  </h2>

                  {(revision.subTitle || article.subTitle) && (
                    <p className="text-sm text-slate-600 font-medium">
                      {revision.subTitle || article.subTitle}
                    </p>
                  )}

                  {/* Featured Image */}
                  {(revision.featuredImage?.url || article.featuredImage?.url) && (
                    <div className="rounded-xl overflow-hidden border border-slate-200">
                      <img
                        src={revision.featuredImage?.url || article.featuredImage?.url}
                        alt=""
                        className="w-full h-56 object-cover"
                      />
                      {revision.featuredImage?.alt && (
                        <div className="px-3 py-1.5 bg-slate-50 text-[11px] text-slate-500 italic">
                          {revision.featuredImage.alt}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Article Excerpt */}
                  <div className="p-3 bg-slate-50 border-l-4 border-blue-600 rounded-r-xl text-xs text-slate-700 font-medium leading-relaxed">
                    <span className="font-bold text-slate-900 block mb-0.5 uppercase text-[10px]">
                      Lead Paragraph Excerpt:
                    </span>
                    {revision.excerpt || article.excerpt || "No excerpt specified"}
                  </div>

                  {/* Body Content */}
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                      Structured Body Content (Verified Immutable Snapshot)
                    </label>
                    <div
                      className="max-h-96 overflow-y-auto custom-scrollbar p-4 bg-slate-50/50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 leading-relaxed prose prose-slate max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeHtml(revision.content || article.content) || "<p>No content in snapshot.</p>"
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Right Column (1/3): Review Decisions & Feedback Panel */}
              <div className="space-y-4">
                {/* Decision Action Box */}
                {canReview && ["pending", "in_review"].includes(submission.status) && (
                  <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Editorial Desk Decisions
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Issue formal editorial clearance or return to author for mandatory revisions.
                    </p>

                    <div className="grid grid-cols-1 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveDecisionType("approve");
                          setDecisionNote("Approved for publication");
                        }}
                        className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                      >
                        <CheckCircle size={14} />
                        <span>Approve Story (v{revision.version || 1})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveDecisionType("request_changes");
                          setDecisionNote("");
                        }}
                        className="w-full py-2.5 px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                      >
                        <AlertTriangle size={14} />
                        <span>Request Corrections</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveDecisionType("reject");
                          setDecisionNote("");
                        }}
                        className="w-full py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                      >
                        <XCircle size={14} />
                        <span>Reject Story</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Direct Publish Wire (If approved) */}
                {submission.status === "approved" && ["editor", "super_admin"].includes(currentAdminUser?.role) && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                      <CheckCircle size={16} className="text-emerald-600" />
                      <span>Story Approved & Ready for Wire</span>
                    </div>
                    <p className="text-[11px] text-emerald-800">
                      This approved revision (v{revision.version || 1}) can now be published live to the public website.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveDecisionType("publish")}
                      className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                    >
                      <UploadCloud size={14} />
                      <span>Publish Approved Wire Now</span>
                    </button>
                  </div>
                )}

                {/* Editorial Discussion & Comments Thread */}
                <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <MessageSquare size={13} />
                      <span>Feedback & Notes ({comments.length})</span>
                    </span>
                  </div>

                  {/* Comments List */}
                  <div className="space-y-2.5 max-h-64 overflow-y-auto custom-scrollbar">
                    {comments.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic py-2">
                        No feedback comments recorded yet.
                      </p>
                    ) : (
                      comments.map((com) => (
                        <div
                          key={com._id}
                          className={`p-3 rounded-xl border text-xs space-y-1 ${
                            com.type === "correction_request"
                              ? "bg-rose-50/70 border-rose-200 text-rose-950"
                              : com.type === "note"
                              ? "bg-amber-50/70 border-amber-200 text-amber-950"
                              : "bg-slate-50 border-slate-200 text-slate-800"
                          }`}
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold">{com.authorId?.name || "Editor"}</span>
                            <span className="text-slate-400 text-[10px]">
                              {new Date(com.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </span>
                          </div>
                          <p className="leading-relaxed">{com.message}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Comment Box */}
                  <form onSubmit={handlePostComment} className="pt-2 border-t border-slate-100 flex gap-2">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add an editorial note or instruction..."
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    <button
                      type="submit"
                      disabled={submittingComment || !newComment.trim()}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer"
                    >
                      <Send size={13} />
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Decision Confirmation Dialog Modal */}
      {activeDecisionType && (
        <Modal
          isOpen={!!activeDecisionType}
          onClose={() => setActiveDecisionType(null)}
          title={
            activeDecisionType === "approve"
              ? `Approve Story Revision v${revision.version || 1}`
              : activeDecisionType === "request_changes"
              ? "Request Revisions from Author"
              : activeDecisionType === "reject"
              ? "Reject Story Submission"
              : "Publish Approved Story Live"
          }
          subtitle={`Story: "${revision.title || article.title}"`}
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            {activeDecisionType === "publish" ? (
              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to push this approved revision to the public wire? Visitors will immediately see this approved content.
              </p>
            ) : (
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                  {activeDecisionType === "approve"
                    ? "Approval Note (Optional)"
                    : activeDecisionType === "request_changes"
                    ? "Correction Instructions for Author *"
                    : "Rejection Rationale *"}
                </label>
                <textarea
                  rows={3}
                  value={decisionNote}
                  onChange={(e) => setDecisionNote(e.target.value)}
                  placeholder={
                    activeDecisionType === "request_changes"
                      ? "Explain what needs verification, additional quotes, or corrections..."
                      : activeDecisionType === "reject"
                      ? "Provide the editorial rationale for rejection..."
                      : "Optional note for records..."
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveDecisionType(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={decisionLoading}
                onClick={handleExecuteDecision}
                className={`px-4 py-2 text-xs font-semibold text-white rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeDecisionType === "approve" || activeDecisionType === "publish"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : activeDecisionType === "request_changes"
                    ? "bg-amber-600 hover:bg-amber-700"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {decisionLoading ? "Processing..." : "Confirm Decision"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Revision Comparison Sub-Modal */}
      <RevisionComparisonModal
        isOpen={showComparison}
        onClose={() => setShowComparison(false)}
        articleId={article._id}
        initialRevisionId={revision._id}
      />

      {/* Audit History Timeline Modal */}
      {showHistory && (
        <Modal
          isOpen={showHistory}
          onClose={() => setShowHistory(false)}
          title="Editorial Audit History"
          subtitle={`Immutable audit trail for story #${submission?._id?.substring(18)}`}
          maxWidth="max-w-lg"
        >
          <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
            {auditHistory.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No audit records found.</p>
            ) : (
              auditHistory.map((item) => (
                <div key={item._id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span>{item.action?.replace(/_/g, " ")}</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      {new Date(item.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 mt-0.5">
                    Actor: <strong className="text-slate-800">{item.actorId?.name || "System"}</strong>
                  </div>
                  {item.metadata?.reason && (
                    <div className="mt-1 text-[11px] text-slate-500 italic bg-white p-1.5 rounded border border-slate-100">
                      "{item.metadata.reason}"
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </Modal>
      )}
    </>
  );
};

export default ReviewWorkspaceModal;
