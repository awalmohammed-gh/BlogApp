import { useState, useEffect } from "react";
import { History, Eye, RotateCcw, CheckCircle, UploadCloud, FileText } from "lucide-react";
import toast from "../../../utils/toast";
import Modal from "../common/Modal";
import editorialService from "../../../services/admin/editorialService";
import RevisionComparisonModal from "./RevisionComparisonModal";
import { sanitizeHtml } from "../../../utils/sanitizeHtml";

export const ArticleRevisionsModal = ({ isOpen, onClose, articleId, onRestored }) => {
  const [revisions, setRevisions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRevision, setSelectedRevision] = useState(null);
  const [showComparison, setShowComparison] = useState(false);
  const [restoringId, setRestoringId] = useState(null);

  const loadRevisions = async () => {
    if (!articleId) return;
    try {
      setLoading(true);
      const res = await editorialService.getArticleRevisions(articleId);
      if (res.success && res.data) {
        setRevisions(res.data);
        if (res.data.length > 0 && !selectedRevision) {
          setSelectedRevision(res.data[0]);
        }
      }
    } catch (err) {
      toast.error("Failed to load article revision history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && articleId) {
      loadRevisions();
    }
  }, [isOpen, articleId]);

  const handleRestore = async (rev) => {
    if (
      !window.confirm(
        `Restore Version ${rev.version} into your working draft? This will update your draft content without affecting any currently published live version.`
      )
    ) {
      return;
    }

    try {
      setRestoringId(rev._id);
      const res = await editorialService.restoreRevision(articleId, rev._id);
      if (res.success) {
        toast.success(`Version ${rev.version} restored into working draft!`);
        if (onRestored) onRestored(res.data);
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to restore revision");
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Article Version History & Revisions"
        subtitle="Browse immutable snapshots, inspect past edits, and restore earlier drafts"
        maxWidth="max-w-5xl"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs text-slate-500 font-medium">
              Total Recorded Versions: <strong>{revisions.length}</strong>
            </span>
            {revisions.length >= 2 && (
              <button
                type="button"
                onClick={() => setShowComparison(true)}
                className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Open Side-by-Side Comparison
              </button>
            )}
          </div>

          {loading ? (
            <div className="py-16 text-center text-xs text-slate-500">
              Loading revision timeline...
            </div>
          ) : revisions.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 italic">
              No historical revision snapshots exist for this article yet. A snapshot is created whenever the article is submitted for editorial review.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Left Column: Revision list */}
              <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar md:col-span-1">
                {revisions.map((rev) => {
                  const isSelected = selectedRevision?._id === rev._id;
                  return (
                    <div
                      key={rev._id}
                      onClick={() => setSelectedRevision(rev)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? "border-blue-500 bg-blue-50/60 shadow-2xs ring-1 ring-blue-500"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">
                          Version {rev.version}
                        </span>
                        <div className="flex items-center gap-1">
                          {rev.isPublished && (
                            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[9px] font-bold">
                              Live
                            </span>
                          )}
                          {rev.isApproved && (
                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-[9px] font-bold">
                              Approved
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-600 line-clamp-1 mt-1 font-medium">
                        {rev.changeSummary || "Snapshot"}
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2">
                        <span>{rev.createdBy?.name || "Staff"}</span>
                        <span>{new Date(rev.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right Column: Selected Revision Inspector */}
              <div className="md:col-span-2 p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                {selectedRevision ? (
                  <>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <div>
                        <span className="text-sm font-bold text-slate-900">
                          Version {selectedRevision.version} Inspector
                        </span>
                        <p className="text-[11px] text-slate-500">
                          Snapshot captured on {new Date(selectedRevision.createdAt).toLocaleString()} by {selectedRevision.createdBy?.name || "Staff"}
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={restoringId === selectedRevision._id}
                        onClick={() => handleRestore(selectedRevision)}
                        className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer shadow-2xs"
                      >
                        <RotateCcw size={12} />
                        <span>Restore into Draft</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs font-bold text-slate-900">
                        {selectedRevision.title}
                      </div>
                      {selectedRevision.excerpt && (
                        <p className="text-[11px] text-slate-600 italic">
                          "{selectedRevision.excerpt}"
                        </p>
                      )}
                      <div
                        className="max-h-60 overflow-y-auto p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 leading-relaxed prose prose-slate max-w-none"
                        dangerouslySetInnerHTML={{
                          __html: sanitizeHtml(selectedRevision.content) || "<p>No content snapshot.</p>"
                        }}
                      />
                    </div>
                  </>
                ) : (
                  <div className="py-20 text-center text-xs text-slate-400">
                    Select a revision version to inspect its snapshot details.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Comparison Modal */}
      <RevisionComparisonModal
        isOpen={showComparison}
        onClose={() => setShowComparison(false)}
        articleId={articleId}
      />
    </>
  );
};

export default ArticleRevisionsModal;
