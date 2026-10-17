import { useState, useEffect } from "react";
import { analyticsService } from "../../../services/admin/analyticsService";

export const ViewsTimelineChart = ({
  title = "Publishing & Audience Activity",
  timelineData = null,
  timeframe: controlledTimeframe = null,
  onTimeframeChange = null
}) => {
  const [internalTimeframe, setInternalTimeframe] = useState("30d");
  const [internalData, setInternalData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState(null);

  const activeTimeframe = controlledTimeframe || internalTimeframe;

  const handleTimeframeClick = (tf) => {
    if (onTimeframeChange) {
      onTimeframeChange(tf);
    } else {
      setInternalTimeframe(tf);
    }
  };

  useEffect(() => {
    // If timelineData is controlled from parent, don't fetch internally
    if (timelineData) {
      setInternalData(timelineData);
      return;
    }

    let isMounted = true;
    const fetchTraffic = async () => {
      try {
        setLoading(true);
        const res = await analyticsService.getTraffic({ timeframe: activeTimeframe });
        if (isMounted && res?.success && res.data?.timeline) {
          setInternalData(res.data.timeline);
        }
      } catch {
        // Fallback or silent fail
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchTraffic();

    return () => {
      isMounted = false;
    };
  }, [timelineData, activeTimeframe]);

  const currentData = internalData.length > 0 ? internalData : [];
  const rawMaxViews = Math.max(0, ...currentData.map((d) => Number(d.views || 0)));
  const maxViews = rawMaxViews > 0 ? Math.ceil(rawMaxViews * 1.2) : 10;

  // SVG dimensions
  const width = 600;
  const height = 220;
  const paddingX = 40;
  const paddingY = 25;
  const chartW = width - paddingX * 2;
  const chartH = height - paddingY * 2;

  // Calculate coordinates
  const points = currentData.map((item, index) => {
    const divisor = currentData.length > 1 ? currentData.length - 1 : 1;
    const x = paddingX + (index / divisor) * chartW;
    const views = Number(item.views || 0);
    const y = height - paddingY - (views / maxViews) * chartH;
    return { ...item, views, x, y };
  });

  // Construct SVG path string
  const pathD = points.length > 0
    ? points.reduce((acc, point, index) => {
        if (index === 0) return `M ${point.x} ${point.y}`;
        const prev = points[index - 1];
        const cpX = (prev.x + point.x) / 2;
        return `${acc} C ${cpX} ${prev.y}, ${cpX} ${point.y}, ${point.x} ${point.y}`;
      }, "")
    : "";

  // Area under curve
  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`
    : "";

  // Reduce X-axis labels if too many points (e.g. 30d or 90d)
  const labelInterval = currentData.length > 14 ? Math.ceil(currentData.length / 7) : 1;

  const totalViewsInTimeline = currentData.reduce((sum, item) => sum + Number(item.views || 0), 0);
  const totalPublishedInTimeline = currentData.reduce((sum, item) => sum + Number(item.published || 0), 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
      {/* Header and timeframe toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h4 className="text-sm font-bold text-slate-900 tracking-tight">{title}</h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Verified database readership events and publishing activity
          </p>
        </div>

        <div className="inline-flex items-center rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs font-semibold">
          {[
            { id: "today", label: "Today" },
            { id: "7d", label: "7 Days" },
            { id: "30d", label: "30 Days" },
            { id: "90d", label: "90 Days" }
          ].map((tf) => (
            <button
              key={tf.id}
              type="button"
              onClick={() => handleTimeframeClick(tf.id)}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                activeTimeframe === tf.id
                  ? "bg-white text-blue-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Responsive SVG Chart */}
      <div className="relative w-full aspect-21/9 min-h-[220px]">
        {loading && (
          <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="viewsAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = height - paddingY - ratio * chartH;
            const val = Math.round(ratio * maxViews);
            return (
              <g key={i}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="#E2E8F0"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text x={paddingX - 8} y={y + 3} textAnchor="end" fontSize="10" fill="#94A3B8">
                  {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          {areaD && <path d={areaD} fill="url(#viewsAreaGradient)" />}

          {/* Smooth line */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="#2563EB"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          )}

          {/* Data Points */}
          {points.map((p, idx) => {
            const showLabel = idx % labelInterval === 0 || idx === points.length - 1;
            return (
              <g
                key={idx}
                className="cursor-pointer"
                onMouseEnter={() => setActiveTooltip(p)}
                onMouseLeave={() => setActiveTooltip(null)}
              >
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="4"
                  fill="#FFFFFF"
                  stroke="#2563EB"
                  strokeWidth="2"
                  className="transition-transform duration-200 hover:scale-150"
                />
                {showLabel && (
                  <text
                    x={p.x}
                    y={height - 6}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="500"
                    fill="#64748B"
                  >
                    {p.label || p.date}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Card */}
        {activeTooltip && (
          <div
            className="absolute z-20 pointer-events-none bg-slate-900 text-white rounded-lg p-2.5 shadow-xl text-xs -translate-x-1/2 -translate-y-full mb-3"
            style={{
              left: `${(activeTooltip.x / width) * 100}%`,
              top: `${(activeTooltip.y / height) * 100}%`
            }}
          >
            <div className="font-bold text-slate-200 border-b border-slate-700 pb-1 mb-1">
              Date: {activeTooltip.label || activeTooltip.date}
            </div>
            <div className="flex items-center gap-2 text-blue-400 font-semibold">
              <span>Readership Views:</span>
              <span className="text-white">{Number(activeTooltip.views || 0).toLocaleString()}</span>
            </div>
            {typeof activeTooltip.published === "number" && (
              <div className="text-slate-400 text-[11px] mt-0.5">
                Published Stories: {activeTooltip.published}
              </div>
            )}
            {typeof activeTooltip.estimatedVisitors === "number" && (
              <div className="text-slate-400 text-[11px]">
                Unique Visitors: {activeTooltip.estimatedVisitors}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
          <span>Total Recorded Reads: <strong>{totalViewsInTimeline.toLocaleString()}</strong></span>
        </span>
        <span>
          Stories Published in Period: <strong>{totalPublishedInTimeline}</strong>
        </span>
      </div>
    </div>
  );
};

export default ViewsTimelineChart;
