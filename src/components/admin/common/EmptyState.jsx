import { FileQuestion } from "lucide-react";

export const EmptyState = ({
  icon: Icon = FileQuestion,
  title = "No records found",
  description = "There are no items matching your criteria or currently available in this section.",
  actionLabel,
  onAction,
  iconColor = "text-slate-400 bg-slate-100"
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 sm:p-12 bg-white rounded-xl border border-slate-200/80 my-4">
      <div className={`p-4 rounded-full ${iconColor} mb-4`}>
        <Icon size={28} />
      </div>
      <h4 className="text-base font-bold text-slate-900 tracking-tight">{title}</h4>
      <p className="text-xs sm:text-sm text-slate-500 max-w-sm mt-1.5 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
