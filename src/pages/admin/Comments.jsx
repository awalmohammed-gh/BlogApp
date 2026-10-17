import { useState } from "react";
import { Link } from "react-router-dom";
import {
  MessageSquare,
  CheckCircle,
  XCircle,
  ShieldAlert,
  Trash2,
  Search,
  ExternalLink,
  ThumbsUp,
  Clock
} from "lucide-react";
import { useAdmin } from "../../context/admin/AdminContext";
import StatusBadge from "../../components/admin/common/StatusBadge";
import ConfirmDialog from "../../components/admin/common/ConfirmDialog";
import EmptyState from "../../components/admin/common/EmptyState";

export const Comments = () => {
  const { comments, approveComment, rejectComment, spamComment, deleteComment } = useAdmin();

  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [commentToDelete, setCommentToDelete] = useState(null);

  // Tab counts
  const total = comments.length;
  const approved = comments.filter((c) => c.status === "Approved").length;
  const pending = comments.filter((c) => c.status === "Pending").length;
  const rejected = comments.filter((c) => c.status === "Rejected").length;
  const spam = comments.filter((c) => c.status === "Spam").length;

  const filteredComments = comments.filter((c) => {
    const matchesTab = activeTab === "All" || c.status === activeTab;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      c.commenter.toLowerCase().includes(q) ||
      c.content.toLowerCase().includes(q) ||
      c.articleTitle?.toLowerCase().includes(q);
    return matchesTab && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Reader Comments Moderation
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Review user feedback, approve public discussion, and block spam bots across NewsFront stories.
          </p>
        </div>
      </div>

      {/* Metrics Summary Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {[
          { label: "All Comments", count: total, status: "All" },
          { label: "Pending", count: pending, status: "Pending", badgeColor: "text-amber-600" },
          { label: "Approved", count: approved, status: "Approved", badgeColor: "text-emerald-600" },
          { label: "Rejected", count: rejected, status: "Rejected", badgeColor: "text-rose-600" },
          { label: "Spam", count: spam, status: "Spam", badgeColor: "text-red-700" }
        ].map((tab, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setActiveTab(tab.status)}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
              activeTab === tab.status
                ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                : "bg-white text-slate-700 border-slate-200/80 hover:border-slate-300"
            }`}
          >
            <div className={`text-[11px] font-semibold ${activeTab === tab.status ? "text-blue-100" : "text-slate-500"}`}>
              {tab.label}
            </div>
            <div className="text-lg font-bold tracking-tight mt-0.5">
              {tab.count}
            </div>
          </button>
        ))}
      </div>

      {/* Search Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by reader name, comment content, or article..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
          />
        </div>

        <div className="text-xs text-slate-500 hidden sm:block">
          Showing {filteredComments.length} comments
        </div>
      </div>

      {/* Comments Moderation List / Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {filteredComments.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title={comments.length === 0 ? "No comments yet" : "No comments found"}
            description={comments.length === 0 ? "No comments have been submitted." : "No reader comments match this status filter or search criteria."}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Commenter</th>
                  <th className="px-4 py-3.5">Comment Message</th>
                  <th className="px-4 py-3.5">Story Reference</th>
                  <th className="px-4 py-3.5">Submitted</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredComments.map((com) => (
                  <tr key={com.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Commenter */}
                    <td className="px-5 py-4 align-top">
                      <div className="flex items-center gap-3">
                        <img
                          src={com.avatar}
                          alt={com.commenter}
                          className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                        />
                        <div className="truncate max-w-[150px]">
                          <div className="font-bold text-slate-900 truncate">
                            {com.commenter}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {com.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Content */}
                    <td className="px-4 py-4 align-top">
                      <p className="text-slate-800 leading-relaxed max-w-md font-normal">
                        "{com.content}"
                      </p>
                      {com.likes !== undefined && com.likes > 0 && (
                        <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                          <ThumbsUp size={11} />
                          <span>{com.likes} readers found this helpful</span>
                        </div>
                      )}
                    </td>

                    {/* Related Story */}
                    <td className="px-4 py-4 align-top">
                      <Link
                        to={`/admin/articles/${com.articleId}/edit`}
                        className="font-medium text-blue-600 hover:underline max-w-[200px] truncate block"
                      >
                        {com.articleTitle || "View Article"}
                      </Link>
                      <span className="text-[10px] text-slate-400">ID: {com.articleId}</span>
                    </td>

                    {/* Submitted Date */}
                    <td className="px-4 py-4 align-top text-slate-500 whitespace-nowrap">
                      {com.submittedDate}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4 align-top">
                      <StatusBadge status={com.status} size="sm" />
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-4 align-top text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {com.status !== "Approved" && (
                          <button
                            type="button"
                            onClick={() => approveComment(com.id)}
                            title="Approve Comment"
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <CheckCircle size={16} />
                          </button>
                        )}

                        {com.status !== "Rejected" && (
                          <button
                            type="button"
                            onClick={() => rejectComment(com.id)}
                            title="Reject Comment"
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <XCircle size={16} />
                          </button>
                        )}

                        {com.status !== "Spam" && (
                          <button
                            type="button"
                            onClick={() => spamComment(com.id)}
                            title="Mark as Spam"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <ShieldAlert size={16} />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setCommentToDelete(com)}
                          title="Delete Permanently"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Comment Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!commentToDelete}
        onClose={() => setCommentToDelete(null)}
        onConfirm={() => {
          if (commentToDelete) {
            deleteComment(commentToDelete.id);
            setCommentToDelete(null);
          }
        }}
        title="Delete Comment?"
        message={`Are you sure you want to permanently delete this comment by "${commentToDelete?.commenter}"?`}
        confirmText="Confirm Delete"
      />
    </div>
  );
};

export default Comments;
