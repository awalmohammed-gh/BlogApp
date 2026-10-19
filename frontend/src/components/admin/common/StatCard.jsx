import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

export const StatCard = ({
  title,
  value,
  change,
  isPositive = true,
  changeLabel = "from last month",
  icon: Icon,
  iconColor = "text-blue-600 bg-blue-50 border-blue-100",
  onClick
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs hover:shadow-sm transition-all duration-200 ${
        onClick ? "cursor-pointer hover:border-blue-300" : ""
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            {title}
          </p>
          <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
            {typeof value === "number" ? value.toLocaleString() : value}
          </h3>
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-lg border ${iconColor}`}>
            <Icon size={20} />
          </div>
        )}
      </div>

      {(change !== undefined || changeLabel) && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs">
          {change !== undefined && (
            <span
              className={`inline-flex items-center gap-0.5 font-semibold ${
                isPositive ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {isPositive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
              {change}
            </span>
          )}
          <span className="text-slate-500 truncate">{changeLabel}</span>
        </div>
      )}
    </div>
  );
};

export default StatCard;
