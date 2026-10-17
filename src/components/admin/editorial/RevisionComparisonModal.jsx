import { useState, useEffect } from "react";
import { GitCompare, ArrowRight, Eye, Calendar, User, FileText, CheckCircle } from "lucide-react";
import Modal from "../common/Modal";
import editorialService from "../../../services/admin/editorialService";

export const RevisionComparisonModal = ({
  isOpen,
  onClose,
  articleId,
  initialRevisionId = null
}) => {
  const [revisions, setRevisions] = useState([]);
  const [leftRevId, setLeftRevId] = useState("");
  const [rightRevId, setRightRevId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !articleId) return;

    const loadRevisions = async () => {
      try {
        setLoading(true);
        const res = await editorialService.getArticleRevisions(articleId);
        if (res.success && res.data) {
          setRevisions(res.data);
          if (res.data.length >= 2) {
            setRightRevId(initialRevisionId || res.data[0]._id);
            setLeftRevId(res.data[1]._id);
          } else if (res.data.length === 1) {
            setRightRevId(res.data[0]._id);
            setLeftRevId(res.data[0]._id);
          }
        }
      } catch (err) {
        console.error("Failed to load revisions:", err);
      } finally {
        setLoading(false);
      }
    };

    loadRevisions();
  }, [isOpen, articleId, initialRevisionId]);

  const leftRev = revisions.find((r) => r._id === leftRevId);
  const rightRev = revisions.find((r) => r._id === rightRevId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Article Revision Comparison"
      subtitle="Side-by-side editorial diff tool to review changes across versions"
      maxWidth="max-w-6xl"
    >
      <div className="space-y-6">
        {/* Version Pickers Bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Base Revision (Earlier)
            </label>
            <select
              value={leftRevId}
              onChange={(e) => setLeftRevId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {revisions.map((rev) => (
                <option key={rev._id} value={rev._id}>
                  v{rev.version} — {rev.changeSummary || "Snapshot"} ({new Date(rev.createdAt).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Comparison Revision (Submitted / Later)
            </label>
            <select
              value={rightRevId}
              onChange={(e) => setRightRevId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {revisions.map((rev) => (
                <option key={rev._id} value={rev._id}>
                  v{rev.version} — {rev.changeSummary || "Snapshot"} ({new Date(rev.createdAt).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Side-by-Side Metadata Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left / Base Version */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="px-2.5 py-1 bg-slate-200 text-slate-800 rounded font-bold text-xs">
                Version {leftRev?.version}
              </span>
              <span className="text-[11px] text-slate-500">
                {leftRev && new Date(leftRev.createdAt).toLocaleString()}
              </span>
            </div>

            <div>
              <div className="text-[10px] font-bold uppercase text-slate-400">Headline</div>
              <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                {leftRev?.title || "—"}
              </h4>
            </div>

            {leftRev?.subTitle && (
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-400">Subtitle</div>
                <p className="text-xs text-slate-700 mt-0.5">{leftRev.subTitle}</p>
              </div>
            )}

            <div>
              <div className="text-[10px] font-bold uppercase text-slate-400">Lead Excerpt</div>
              <p className="text-xs text-slate-600 mt-0.5">{leftRev?.excerpt || "—"}</p>
            </div>

            {leftRev?.featuredImage?.url && (
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">Featured Image</div>
                <img
                  src={leftRev.featuredImage.url}
                  alt=""
                  className="w-full h-36 object-cover rounded-lg border border-slate-200"
                />
              </div>
            )}

            <div>
              <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">Article Body Content</div>
              <div
                className="max-h-80 overflow-y-auto p-3 bg-white border border-slate-200 rounded-lg text-xs leading-relaxed text-slate-800 prose prose-slate max-w-none"
                dangerouslySetInnerHTML={{ __html: leftRev?.content || "<p>No content</p>" }}
              />
            </div>
          </div>

          {/* Right / Target Version */}
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/20 space-y-4">
            <div className="flex items-center justify-between border-b border-blue-100 pb-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-blue-600 text-white rounded font-bold text-xs">
                  Version {rightRev?.version}
                </span>
                {rightRev?.isApproved && (
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-semibold flex items-center gap-1">
                    <CheckCircle size={10} /> Approved
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-500">
                {rightRev && new Date(rightRev.createdAt).toLocaleString()}
              </span>
            </div>

            <div>
              <div className="text-[10px] font-bold uppercase text-slate-400">Headline</div>
              <h4
                className={`text-sm font-bold mt-0.5 ${
                  leftRev?.title !== rightRev?.title ? "text-blue-900 bg-blue-100/60 p-1 rounded" : "text-slate-900"
                }`}
              >
                {rightRev?.title || "—"}
              </h4>
            </div>

            {rightRev?.subTitle && (
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-400">Subtitle</div>
                <p
                  className={`text-xs mt-0.5 ${
                    leftRev?.subTitle !== rightRev?.subTitle
                      ? "text-blue-900 bg-blue-100/60 p-1 rounded"
                      : "text-slate-700"
                  }`}
                >
                  {rightRev.subTitle}
                </p>
              </div>
            )}

            <div>
              <div className="text-[10px] font-bold uppercase text-slate-400">Lead Excerpt</div>
              <p
                className={`text-xs mt-0.5 ${
                  leftRev?.excerpt !== rightRev?.excerpt
                    ? "text-blue-900 bg-blue-100/60 p-1 rounded"
                    : "text-slate-600"
                }`}
              >
                {rightRev?.excerpt || "—"}
              </p>
            </div>

            {rightRev?.featuredImage?.url && (
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">Featured Image</div>
                <img
                  src={rightRev.featuredImage.url}
                  alt=""
                  className="w-full h-36 object-cover rounded-lg border border-blue-200"
                />
              </div>
            )}

            <div>
              <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">Article Body Content</div>
              <div
                className="max-h-80 overflow-y-auto p-3 bg-white border border-blue-200 rounded-lg text-xs leading-relaxed text-slate-800 prose prose-slate max-w-none"
                dangerouslySetInnerHTML={{ __html: rightRev?.content || "<p>No content</p>" }}
              />
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Close Comparison
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default RevisionComparisonModal;
