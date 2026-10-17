import { useState, useEffect } from "react";
import { analyticsService } from "../../../services/admin/analyticsService";
import { useAdmin } from "../../../context/admin/AdminContext";

export const CategoryDistributionChart = ({
  title = "Articles by News Category",
  categoryData = null
}) => {
  const { categories } = useAdmin();
  const [data, setData] = useState(categoryData || []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (categoryData) {
      setData(categoryData);
      return;
    }

    let isMounted = true;
    const loadCategories = async () => {
      try {
        setLoading(true);
        const res = await analyticsService.getCategories();
        if (isMounted && res?.success && Array.isArray(res.data)) {
          setData(res.data);
        }
      } catch {
        // Fallback to context categories
        if (isMounted && categories) {
          setData(categories.map((c) => ({ name: c.name, color: c.color, publishedArticles: 0 })));
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadCategories();

    return () => {
      isMounted = false;
    };
  }, [categoryData, categories]);

  const distribution = (data || [])
    .map((cat) => ({
      name: cat.name,
      count: Number(cat.publishedArticles || cat.count || 0),
      views: Number(cat.totalViews || 0),
      color: cat.color || "#2563EB"
    }))
    .filter((item) => item.count > 0);

  const total = distribution.reduce((sum, item) => sum + item.count, 0) || 1;

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
      <div className="mb-4">
        <h4 className="text-sm font-bold text-slate-900 tracking-tight">{title}</h4>
        <p className="text-xs text-slate-500 mt-0.5">
          Proportional coverage distribution across news desks
        </p>
      </div>

      {loading ? (
        <div className="h-32 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : distribution.length === 0 ? (
        <div className="h-32 flex flex-col items-center justify-center text-xs text-slate-400">
          <p>No published articles in categories yet.</p>
        </div>
      ) : (
        <>
          {/* Progress segments bar */}
          <div className="h-3.5 w-full rounded-full bg-slate-100 flex overflow-hidden mb-5">
            {distribution.map((item, idx) => {
              const pct = (item.count / total) * 100;
              return (
                <div
                  key={idx}
                  style={{ width: `${pct}%`, backgroundColor: item.color }}
                  title={`${item.name}: ${item.count} stories, ${item.views} reads (${pct.toFixed(1)}%)`}
                  className="h-full transition-all duration-300 hover:opacity-85"
                />
              );
            })}
          </div>

          {/* Category breakdown items */}
          <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-xs">
            {distribution.map((item, idx) => {
              const pct = ((item.count / total) * 100).toFixed(1);
              return (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-slate-700 font-medium truncate">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <span className="font-bold text-slate-900">{item.count}</span>
                    <span className="text-slate-400 text-[11px]">({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default CategoryDistributionChart;
