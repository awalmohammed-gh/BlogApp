import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, FileText, Folder, Users, Globe, ArrowRight, X } from "lucide-react";
import { useAdmin } from "../../../context/admin/AdminContext";
import { useBodyScrollLock } from "../../../hooks/useBodyScrollLock";

export const GlobalSearchModal = ({ isOpen, onClose }) => {
  useBodyScrollLock(isOpen);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { articles, categories, authors, pages } = useAdmin();

  const [previousOpen,setPreviousOpen]=useState(isOpen);
  if(previousOpen!==isOpen){setPreviousOpen(isOpen);if(!isOpen)setQuery("");}

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const trimmed = query.trim().toLowerCase();

  // Search matches
  const matchedArticles = trimmed
    ? articles
        .filter(
          (a) =>
            a.title.toLowerCase().includes(trimmed) ||
            a.category?.toLowerCase().includes(trimmed) ||
            a.author?.toLowerCase().includes(trimmed)
        )
        .slice(0, 5)
    : [];

  const matchedCategories = trimmed
    ? categories
        .filter(
          (c) =>
            c.name.toLowerCase().includes(trimmed) ||
            c.slug?.toLowerCase().includes(trimmed)
        )
        .slice(0, 3)
    : [];

  const matchedAuthors = trimmed
    ? authors
        .filter(
          (a) =>
            a.name.toLowerCase().includes(trimmed) ||
            a.role?.toLowerCase().includes(trimmed) ||
            a.email?.toLowerCase().includes(trimmed)
        )
        .slice(0, 3)
    : [];

  const matchedPages = trimmed
    ? pages
        .filter(
          (p) =>
            p.title.toLowerCase().includes(trimmed) ||
            p.slug?.toLowerCase().includes(trimmed)
        )
        .slice(0, 3)
    : [];

  const hasResults =
    matchedArticles.length > 0 ||
    matchedCategories.length > 0 ||
    matchedAuthors.length > 0 ||
    matchedPages.length > 0;

  const handleSelect = (url) => {
    onClose();
    navigate(url);
  };

  return (
    <div className="viewport-overlay fixed inset-0 z-50 flex items-start justify-center p-4 sm:pt-24 bg-slate-950/60 backdrop-blur-xs">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div role="dialog" aria-modal="true" aria-label="Search newsroom" className="relative min-h-0 max-h-full flex flex-col w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all z-10">
        {/* Search Input Bar */}
        <div className="shrink-0 flex items-center px-4 py-3.5 border-b border-slate-200 bg-slate-50/50">
          <Search size={18} className="text-slate-400 mr-3 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search news articles, categories, authors, and pages..."
            className="min-w-0 w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          <div className="flex items-center gap-1.5 ml-2">
            <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-semibold text-slate-500 bg-slate-200/80 rounded border border-slate-300">
              ESC
            </kbd>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close newsroom search"
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Search Results Area */}
        <div className="min-h-0 overflow-y-auto overscroll-contain custom-scrollbar p-3">
          {!trimmed && (
            <div className="p-6 text-center text-xs text-slate-400">
              Type keywords to search across articles, newsroom authors, and website pages.
            </div>
          )}

          {trimmed && !hasResults && (
            <div className="p-8 text-center">
              <p className="text-sm font-semibold text-slate-700">No records found</p>
              <p className="text-xs text-slate-400 mt-1">
                No matching results for "{query}" across the newsroom database.
              </p>
            </div>
          )}

          {/* Articles */}
          {matchedArticles.length > 0 && (
            <div className="mb-3">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Articles
              </div>
              <div className="space-y-1">
                {matchedArticles.map((art) => (
                  <div
                    key={art._id}
                    onClick={() => handleSelect(`/admin/articles/${art._id}/edit`)}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 truncate">
                      <FileText size={16} className="text-blue-600 shrink-0" />
                      <div className="truncate">
                        <div className="text-xs font-semibold text-slate-800 truncate group-hover:text-blue-600">
                          {art.title}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2">
                          <span>{art.category}</span>
                          <span>&bull;</span>
                          <span>By {art.author}</span>
                          <span>&bull;</span>
                          <span className="font-medium text-slate-600">{art.status}</span>
                        </div>
                      </div>
                    </div>
                    <ArrowRight size={14} className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Categories */}
          {matchedCategories.length > 0 && (
            <div className="mb-3">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Categories
              </div>
              <div className="space-y-1">
                {matchedCategories.map((cat) => (
                  <div
                    key={cat.id}
                    onClick={() => handleSelect("/admin/categories")}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <Folder size={16} className="text-amber-500 shrink-0" />
                      <div>
                        <div className="text-xs font-semibold text-slate-800 group-hover:text-blue-600">
                          {cat.name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {cat.articleCount} articles &bull; /{cat.slug}
                        </div>
                      </div>
                    </div>
                    <ArrowRight size={14} className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Authors */}
          {matchedAuthors.length > 0 && (
            <div className="mb-3">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Newsroom Team
              </div>
              <div className="space-y-1">
                {matchedAuthors.map((auth) => (
                  <div
                    key={auth.id}
                    onClick={() => handleSelect("/admin/authors")}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <Users size={16} className="text-emerald-600 shrink-0" />
                      <div>
                        <div className="text-xs font-semibold text-slate-800 group-hover:text-blue-600">
                          {auth.name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {auth.role} &bull; {auth.email}
                        </div>
                      </div>
                    </div>
                    <ArrowRight size={14} className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CMS Pages */}
          {matchedPages.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Website Pages
              </div>
              <div className="space-y-1">
                {matchedPages.map((page) => (
                  <div
                    key={page.id}
                    onClick={() => handleSelect("/admin/pages")}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <Globe size={16} className="text-indigo-600 shrink-0" />
                      <div>
                        <div className="text-xs font-semibold text-slate-800 group-hover:text-blue-600">
                          {page.title}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Route: {page.slug} &bull; Status: {page.status}
                        </div>
                      </div>
                    </div>
                    <ArrowRight size={14} className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>Navigate with mouse or keyboard</span>
          <span className="text-slate-400">Nsemfoa News Global Discovery</span>
        </div>
      </div>
    </div>
  );
};

export default GlobalSearchModal;
