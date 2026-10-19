import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  GitPullRequest,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Eye,
  FileText,
  User,
  Calendar,
  Search,
  RefreshCw,
  GitCompare,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2
} from "lucide-react";
import toast from "react-hot-toast";

import { useAdmin } from "../../context/admin/AdminContext";
import EmptyState from "../../components/admin/common/EmptyState";
import ReviewStatusBadge from "../../components/admin/editorial/ReviewStatusBadge";
import ReviewWorkspaceModal from "../../components/admin/editorial/ReviewWorkspaceModal";
import AssignReviewerModal from "../../components/admin/editorial/AssignReviewerModal";
import RevisionComparisonModal from "../../components/admin/editorial/RevisionComparisonModal";
import editorialService from "../../services/admin/editorialService";

export const EditorialWorkflow = () => {
  const { currentAdminUser } = useAdmin();

  const [activeStage, setActiveStage] = useState("all");
  const [submissions, setSubmissions] = useState([]);
  const [stats, setStats] = useState({
    pendingReviews: 0,
    inReview: 0,
    changesRequested: 0,
    approved: 0,
    rejected: 0,
    completedReviews: 0,
    unassignedSubmissions: 0,
    myAssignedReviews: 0
  });

  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [assignmentFilter, setAssignmentFilter] = useState("all");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1
  });

  // Modal Workspace States
  const { submissionId } = useParams();
  const navigate = useNavigate();

  const [activeWorkspaceSubmissionId, setActiveWorkspaceSubmissionId] = useState(submissionId || null);
  const [assigningSubmission, setAssigningSubmission] = useState(null);
  const [comparingArticleId, setComparingArticleId] = useState(null);

  useEffect(() => {
    if (submissionId) {
      setActiveWorkspaceSubmissionId(submissionId);
    }
  }, [submissionId]);

  const fetchEditorialData = useCallback(async () => {
    try {
      setLoading(true);
      const [queueRes, statsRes] = await Promise.all([
        editorialService.getQueue({
          page: pagination.page,
          limit: pagination.limit,
          status: activeStage,
          search: search.trim(),
          assignedTo: assignmentFilter
        }),
        editorialService.getStats()
      ]);

      if (queueRes.success) {
        setSubmissions(queueRes.data || []);
        if (queueRes.pagination) {
          setPagination(queueRes.pagination);
        }
      }

      if (statsRes.success) {
        setStats(statsRes.data);
      }
    } catch (err) {
      console.error("Failed to load editorial queue:", err);
      toast.error(err.response?.data?.message || "Failed to load editorial queue");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, activeStage, search, assignmentFilter]);

  useEffect(() => {
    fetchEditorialData();
  }, [fetchEditorialData]);

  const handleClaimReview = async (submissionId) => {
    try {
      const res = await editorialService.claimReview(submissionId);
      if (res.success) {
        toast.success("Review claimed successfully");
        fetchEditorialData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to claim review");
    }
  };

  const isSuperAdmin = currentAdminUser?.role === "super_admin";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Editorial Workflow
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Review submissions, manage corrections, and maintain publishing quality across the newsroom.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchEditorialData()}
          disabled={loading}
          className="self-start sm:self-auto px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Real-time Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          {
            stage: "pending",
            label: "Pending Review",
            count: stats.pendingReviews,
            color: "border-amber-300 bg-amber-50/50 text-amber-900",
            activeColor: "bg-amber-600 text-white"
          },
          {
            stage: "in_review",
            label: "In Review",
            count: stats.inReview,
            color: "border-blue-300 bg-blue-50/50 text-blue-900",
            activeColor: "bg-blue-600 text-white"
          },
          {
            stage: "changes_requested",
            label: "Changes Requested",
            count: stats.changesRequested,
            color: "border-rose-300 bg-rose-50/50 text-rose-900",
            activeColor: "bg-rose-600 text-white"
          },
          {
            stage: "approved",
            label: "Approved",
            count: stats.approved,
            color: "border-emerald-300 bg-emerald-50/50 text-emerald-900",
            activeColor: "bg-emerald-600 text-white"
          },
          {
            stage: "rejected",
            label: "Rejected",
            count: stats.rejected,
            color: "border-slate-300 bg-slate-50 text-slate-800",
            activeColor: "bg-slate-700 text-white"
          },
          {
            stage: "completed",
            label: "Completed Reviews",
            count: stats.completedReviews,
            color: "border-indigo-300 bg-indigo-50/50 text-indigo-900",
            activeColor: "bg-indigo-600 text-white"
          }
        ].map((item, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              setActiveStage(activeStage === item.stage ? "all" : item.stage);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
              activeStage === item.stage
                ? `${item.activeColor} shadow-xs font-bold ring-2 ring-blue-500/20`
                : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className={`text-[11px] font-semibold ${activeStage === item.stage ? "opacity-90" : "text-slate-500"}`}>
              {item.label}
            </div>
            <div className="text-xl font-bold tracking-tight mt-1">
              {item.count}
            </div>
          </button>
        ))}
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            placeholder="Search stories by headline or author..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter size={13} />
            <span className="font-semibold text-slate-700">Assignment:</span>
          </div>
          <select
            value={assignmentFilter}
            onChange={(e) => {
              setAssignmentFilter(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">All Submissions</option>
            <option value="unassigned">Unassigned Only</option>
            <option value="me">Assigned to Me</option>
          </select>

          {activeStage !== "all" && (
            <button
              type="button"
              onClick={() => {
                setActiveStage("all");
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="px-2.5 py-1.5 text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
            >
              Reset Stage
            </button>
          )}
        </div>
      </div>

      {/* Review Queue Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">
              Newsroom Review Queue
            </h3>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-700">
              {pagination.total} submissions
            </span>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-xs text-slate-500">
            Retrieving editorial submissions from database...
          </div>
        ) : submissions.length === 0 ? (
          <EmptyState
            icon={GitPullRequest}
            title="Editorial queue is empty"
            description="There are currently no articles matching the selected stage and search criteria."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Article Headline</th>
                  <th className="px-4 py-3.5">Byline Author</th>
                  <th className="px-4 py-3.5">Category Desk</th>
                  <th className="px-4 py-3.5">Submitted Date</th>
                  <th className="px-4 py-3.5">Assigned Editor</th>
                  <th className="px-4 py-3.5">Review Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {submissions.map((sub) => {
                  const art = sub.articleId || {};
                  const rev = sub.revisionId || {};
                  const isAssignedToMe = sub.assignedTo?._id === currentAdminUser?._id;
                  const isAuthor = sub.submittedBy?._id === currentAdminUser?._id;

                  return (
                    <tr key={sub._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {art.featuredImage?.url ? (
                            <img
                              src={art.featuredImage.url}
                              alt=""
                              className="w-11 h-11 rounded-lg object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-400">
                              <FileText size={18} />
                            </div>
                          )}
                          <div className="truncate max-w-sm">
                            <div className="font-bold text-slate-900 truncate">
                              {rev.title || art.title || "Untitled Article"}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate mt-0.5 flex items-center gap-2">
                              <span>v{rev.version || 1}</span>
                              {sub.submissionNote && (
                                <span className="text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded text-[10px]">
                                  Note: {sub.submissionNote}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="font-semibold text-slate-800">
                          {sub.submittedBy?.name || art.author?.name || "Author"}
                        </span>
                        <div className="text-[10px] text-slate-400">
                          {sub.submittedBy?.role || "Staff"}
                        </div>
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-medium text-[11px]">
                          {art.category?.name || "General Desk"}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-slate-500 whitespace-nowrap">
                        {new Date(sub.submittedAt || sub.createdAt).toLocaleDateString()}
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        {sub.assignedTo ? (
                          <span
                            className={`font-semibold ${
                              isAssignedToMe ? "text-blue-700" : "text-slate-800"
                            }`}
                          >
                            {sub.assignedTo.name} {isAssignedToMe && "(You)"}
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                            {!isAuthor && (
                              <button
                                type="button"
                                onClick={() => handleClaimReview(sub._id)}
                                className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded text-[10px] cursor-pointer transition-colors"
                              >
                                Claim
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        <ReviewStatusBadge status={sub.status} size="sm" />
                      </td>

                      <td className="px-4 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {isSuperAdmin && (
                            <button
                              type="button"
                              onClick={() => setAssigningSubmission(sub)}
                              title="Assign Reviewer"
                              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                            >
                              <UserCheck size={14} />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setComparingArticleId(art._id)}
                            title="Compare Revisions"
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <GitCompare size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={() => setActiveWorkspaceSubmissionId(sub._id)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <GitPullRequest size={13} />
                            <span>Review</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Server-side Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <div>
              Showing page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> (
              {pagination.total} total items)
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft size={14} />
              </button>

              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Review Workspace Modal */}
      {activeWorkspaceSubmissionId && (
        <ReviewWorkspaceModal
          isOpen={!!activeWorkspaceSubmissionId}
          onClose={() => {
            setActiveWorkspaceSubmissionId(null);
            if (submissionId) {
              navigate("/admin/editorial");
            }
          }}
          submissionId={activeWorkspaceSubmissionId}
          currentAdminUser={currentAdminUser}
          onDecisionMade={() => fetchEditorialData()}
        />
      )}

      {/* Manual Reviewer Assignment Modal (Super Admin) */}
      {assigningSubmission && (
        <AssignReviewerModal
          isOpen={!!assigningSubmission}
          onClose={() => setAssigningSubmission(null)}
          submission={assigningSubmission}
          onAssigned={() => fetchEditorialData()}
        />
      )}

      {/* Revision Comparison Modal */}
      {comparingArticleId && (
        <RevisionComparisonModal
          isOpen={!!comparingArticleId}
          onClose={() => setComparingArticleId(null)}
          articleId={comparingArticleId}
        />
      )}
    </div>
  );
};

export default EditorialWorkflow;
