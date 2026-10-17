import React from "react";
import { Search, X } from "lucide-react";

export const SearchInput = ({
  value,
  onChange,
  onClear,
  placeholder = "Search...",
  className = "",
  size = "md"
}) => {
  return (
    <div className={`relative flex items-center ${className}`}>
      <Search
        size={size === "sm" ? 14 : 16}
        className="absolute left-3 text-slate-400 pointer-events-none"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all ${
          size === "sm"
            ? "py-1.5 pl-8 pr-7 text-xs"
            : "py-2 pl-9 pr-8 text-xs sm:text-sm"
        }`}
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            if (onClear) onClear();
            else onChange("");
          }}
          className="absolute right-2.5 p-0.5 text-slate-400 hover:text-slate-600 rounded-full transition-colors cursor-pointer"
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
};

export default SearchInput;
