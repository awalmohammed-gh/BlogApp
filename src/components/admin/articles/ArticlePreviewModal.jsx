import { Calendar, User, Clock, Tag, ExternalLink, X, ShieldAlert } from "lucide-react";
import StatusBadge from "../common/StatusBadge";
import { sanitizeHtml } from "../../../utils/sanitizeHtml";

export const ArticlePreviewModal = ({ article, isOpen, onClose }) => {
  if (!isOpen || !article) return null;

  const readingTime = Math.max(
    1,
    Math.ceil((article.description || "").replace(/<[^>]*>?/gm, " ").trim().split(/\s+/).length / 200)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-fadeInUp">
        {/* Modal Top Bar */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              Live Nsemra News Public Preview
            </span>
            <StatusBadge status={article.status} size="sm" />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            aria-label="Close preview"
          >
            <X size={18} />
          </button>
        </div>

        {/* Prototype Notice Banner */}
        <div className="bg-amber-50 border-b border-amber-200 px-5 py-2 text-xs text-amber-900 flex items-center gap-2">
          <ShieldAlert size={15} className="text-amber-600 shrink-0" />
          <span>
            Simulated public layout preview using active editor state. No live database records have been modified.
          </span>
        </div>

        {/* Article Article Body Content */}
        <div className="overflow-y-auto custom-scrollbar p-6 sm:p-10 flex-1 space-y-6">
          {/* Category & Headline */}
          <div className="space-y-3">
            <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full uppercase tracking-wider border border-blue-100">
              {article.category || "General News"}
            </span>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 font-serif-headline tracking-tight leading-tight">
              {article.title || "Untitled Article"}
            </h1>
            {article.subTitle && (
              <p className="text-base sm:text-lg text-slate-600 font-normal leading-relaxed">
                {article.subTitle}
              </p>
            )}
          </div>

          {/* Author and Metadata Line */}
          <div className="flex flex-wrap items-center justify-between gap-4 py-4 border-y border-slate-100 text-xs text-slate-600">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm">
                {(article.author || "N").charAt(0)}
              </div>
              <div>
                <div className="font-bold text-slate-900">{article.author || "Nsemra News Desk"}</div>
              </div>
            </div>

            <div className="flex items-center gap-4 text-slate-500 text-xs">
              <span className="flex items-center gap-1.5">
                <Calendar size={14} />
                <span>{article.date || "Just now"}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Clock size={14} />
                <span>{readingTime} min read</span>
              </span>
            </div>
          </div>

          {/* Featured Image */}
          {article.image && (
            <div className="rounded-2xl overflow-hidden border border-slate-200 aspect-16/9 bg-slate-100">
              <img
                src={article.image}
                alt={article.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Excerpt Lead */}
          {article.excerpt && (
            <p className="text-sm sm:text-base font-medium text-slate-700 leading-relaxed italic border-l-4 border-blue-600 pl-4 py-1 bg-slate-50 rounded-r-xl">
              {article.excerpt}
            </p>
          )}

          {/* HTML Article Content */}
          <div
            className="prose prose-slate max-w-none text-sm sm:text-base leading-relaxed text-slate-800 prose-headings:font-serif-headline prose-headings:font-bold prose-h2:text-2xl prose-h3:text-xl prose-p:my-4 prose-blockquote:border-l-4 prose-blockquote:border-blue-600 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-slate-600"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.description) || "<p>No content entered yet.</p>" }}
          />

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <div className="pt-6 border-t border-slate-100">
              <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Tag size={13} /> Related Topics
              </h5>
              <div className="flex flex-wrap gap-2">
                {article.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors font-medium"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Controls */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
};

export default ArticlePreviewModal;
