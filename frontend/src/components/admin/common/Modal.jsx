import { useEffect } from "react";
import { X } from "lucide-react";
import { useBodyScrollLock } from "../../../hooks/useBodyScrollLock";

export const Modal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = "max-w-lg",
  showClose = true
}) => {
  useBodyScrollLock(isOpen);
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="viewport-overlay fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-fadeIn"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        className={`relative min-h-0 h-full sm:h-auto w-full ${maxWidth} bg-white sm:rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden transform transition-all animate-fadeInUp z-10 max-h-full flex flex-col`}
      >
        {/* Header */}
        {(title || showClose) && (
          <div className="safe-area-top shrink-0 flex items-center justify-between gap-3 px-4 sm:px-6 py-4.5 border-b border-slate-100 bg-slate-50/50">
            <div className="min-w-0">
              {title && (
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
              )}
            </div>
            {showClose && (
              <button
                type="button"
                onClick={onClose}
                className="min-h-11 min-w-11 shrink-0 flex items-center justify-center p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="safe-area-bottom min-h-0 px-4 sm:px-6 py-5 overflow-y-auto overscroll-contain custom-scrollbar flex-1">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
