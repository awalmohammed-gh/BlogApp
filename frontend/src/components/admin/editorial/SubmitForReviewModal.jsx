import { useState } from "react";
import { Send, FileCheck, AlertCircle } from "lucide-react";
import toast from "../../../utils/toast";
import Modal from "../common/Modal";
import editorialService from "../../../services/admin/editorialService";

export const SubmitForReviewModal = ({ isOpen, onClose, article, onSubmitted }) => {
  const [submissionNote, setSubmissionNote] = useState("");
  const [changeSummary, setChangeSummary] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!article?._id) return;

    try {
      setLoading(true);
      const res = await editorialService.submitArticleForReview(article._id, {
        submissionNote: submissionNote.trim(),
        changeSummary: changeSummary.trim() || "Submitted for editorial review"
      });

      if (res.success) {
        toast.success("Article submitted for review! An immutable revision snapshot was created.");
        setSubmissionNote("");
        setChangeSummary("");
        if (onSubmitted) onSubmitted(res.data);
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit article for review");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Submit Article for Editorial Review"
      subtitle={`Story: "${article?.title || "Draft Article"}"`}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed">
          <p className="font-bold flex items-center gap-1.5 mb-1">
            <FileCheck size={14} className="text-blue-600" />
            Quality Clearance & Immutable Versioning
          </p>
          Submitting creates a sealed version snapshot that senior desk editors will inspect. If revisions are requested, your working draft will remain editable without altering past submission records.
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
            Summary of Changes / Version Tag
          </label>
          <input
            type="text"
            value={changeSummary}
            onChange={(e) => setChangeSummary(e.target.value)}
            placeholder="e.g. Initial draft submission, or Added official press statements"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
            Note for Editorial Desk (Optional)
          </label>
          <textarea
            rows={3}
            value={submissionNote}
            onChange={(e) => setSubmissionNote(e.target.value)}
            placeholder="Provide context, pending source confirmations, or specific areas you'd like editors to fact-check..."
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Send size={14} />
            <span>{loading ? "Submitting..." : "Submit to Desk"}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default SubmitForReviewModal;
