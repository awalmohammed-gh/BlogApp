import { useState, useEffect } from "react";
import { UserCheck, Shield, AlertCircle } from "lucide-react";
import toast from "../../../utils/toast";
import Modal from "../common/Modal";
import editorialService from "../../../services/admin/editorialService";
import { staffService } from "../../../services/admin/staffService";

export const AssignReviewerModal = ({ isOpen, onClose, submission, onAssigned }) => {
  const [editors, setEditors] = useState([]);
  const [selectedEditorId, setSelectedEditorId] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !submission) return;

    const loadStaff = async () => {
      try {
        setLoading(true);
        const res = await staffService.getAllStaff({ limit: 50, status: "active" });
        if (res.success && res.data?.staff) {
          const eligible = res.data.staff.filter((s) => {
            const isDeskRole = ["editor", "super_admin"].includes(s.role);
            // Self-review protection: author cannot be assigned to review own submission
            const isNotAuthor = s._id !== submission.submittedBy?._id && s._id !== submission.articleId?.author?._id;
            return isDeskRole && isNotAuthor;
          });
          setEditors(eligible);
          if (submission.assignedTo?._id) {
            setSelectedEditorId(submission.assignedTo._id);
          } else if (eligible.length > 0) {
            setSelectedEditorId(eligible[0]._id);
          }
        }
      } catch (err) {
        console.error("Failed to load editors:", err);
        toast.error("Failed to load eligible reviewers");
      } finally {
        setLoading(false);
      }
    };

    loadStaff();
  }, [isOpen, submission]);

  const handleAssign = async () => {
    if (!selectedEditorId) {
      toast.error("Please select an eligible desk editor");
      return;
    }

    try {
      setSubmitting(true);
      const res = await editorialService.assignReviewer(submission._id, selectedEditorId);
      if (res.success) {
        toast.success("Reviewer assigned successfully");
        if (onAssigned) onAssigned(res.data);
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to assign reviewer");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Assign Editorial Reviewer"
      subtitle={`Story: "${submission?.articleId?.title || "Submission"}"`}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        {loading ? (
          <div className="py-8 text-center text-xs text-slate-500">
            Loading eligible editorial desk staff...
          </div>
        ) : editors.length === 0 ? (
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 text-amber-600 mt-0.5" />
            <div>
              <p className="font-bold">No eligible reviewers available</p>
              <p className="mt-0.5 text-amber-700">
                Independent review required: The submitting author cannot be assigned to review this story. Please invite or activate an additional editor.
              </p>
            </div>
          </div>
        ) : (
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2">
              Select Desk Reviewer
            </label>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {editors.map((editor) => {
                const isSelected = selectedEditorId === editor._id;
                return (
                  <label
                    key={editor._id}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "border-blue-500 bg-blue-50/60 shadow-2xs ring-1 ring-blue-500"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="assignedEditor"
                        value={editor._id}
                        checked={isSelected}
                        onChange={() => setSelectedEditorId(editor._id)}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-900">{editor.name}</div>
                        <div className="text-[11px] text-slate-500">{editor.email}</div>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-slate-100 text-slate-700 uppercase tracking-wider">
                      {editor.role === "super_admin" ? "Super Admin" : "Editor"}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting || editors.length === 0}
            onClick={handleAssign}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <UserCheck size={14} />
            <span>{submitting ? "Assigning..." : "Confirm Assignment"}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AssignReviewerModal;
