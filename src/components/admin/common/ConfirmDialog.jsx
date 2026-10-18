import { AlertTriangle, Trash2, CheckCircle2 } from "lucide-react";
import Modal from "./Modal";

export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Are you sure?",
  message = "This action cannot be undone. Are you sure you want to proceed?",
  confirmText = "Confirm Delete",
  cancelText = "Cancel",
  variant = "danger", // 'danger' | 'warning' | 'primary'
  // For async actions: keep the dialog open until the parent closes it after the server responds
  closeOnConfirm = true,
  isProcessing = false,
  processingText = "Working..."
}) => {
  const isDanger = variant === "danger";
  const handleClose = () => {
    if (!isProcessing) onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} maxWidth="max-w-md" showClose={false}>
      <div className="text-center sm:text-left sm:flex sm:items-start gap-4">
        <div
          className={`mx-auto sm:mx-0 flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
            isDanger ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600"
          }`}
        >
          {isDanger ? <Trash2 size={20} /> : <AlertTriangle size={20} />}
        </div>
        <div className="mt-3 sm:mt-0 flex-1">
          <h4 className="text-base font-bold text-slate-900">{title}</h4>
          <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
            {message}
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={handleClose}
          disabled={isProcessing}
          className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {cancelText}
        </button>
        <button
          type="button"
          disabled={isProcessing}
          onClick={() => {
            onConfirm();
            if (closeOnConfirm) onClose();
          }}
          className={`w-full sm:w-auto px-4 py-2 text-xs font-semibold text-white rounded-lg transition-colors shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
            isDanger
              ? "bg-rose-600 hover:bg-rose-700"
              : "bg-amber-600 hover:bg-amber-700"
          }`}
        >
          {isProcessing ? processingText : confirmText}
        </button>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
