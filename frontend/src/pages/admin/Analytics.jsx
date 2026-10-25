import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  TrendingUp,
  Eye,
  Users,
  FileText,
  MessageSquare,
  Award,
  Calendar,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Share2,
  Compass
} from "lucide-react";
import { analyticsService } from "../../services/admin/analyticsService";
import { useAuth } from "../../context/admin/AuthContext";
import StatCard from "../../components/admin/common/StatCard";
import ViewsTimelineChart from "../../components/admin/charts/ViewsTimelineChart";
import CategoryDistributionChart from "../../components/admin/charts/CategoryDistributionChart";

export const Analytics = () => {
  const { admin } = useAuth();
  const [timeframe, setTimeframe] = useState("30d");
  const [_loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Analytics states
  const [overview, setOverview] = useState(null);
  const [trafficData, setTrafficData] = useState(null);
  const [topArticles, setTopArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [editorial, setEditorial] = useState(null);
  const [commentsData, setCommentsData] = useState(null);
  const [sourcesData, setSourcesData] = useState(null);

  const isAuthor = admin?.role === "author";

  const loadAllAnalytics = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      else setRefreshing(true);

      const [
        overviewRes,
        trafficRes,
        articlesRes,
        categoriesRes,
        authorsRes,
        editorialRes,
        commentsRes,
        sourcesRes
      ] = await Promise.allSettled([
        analyticsService.getOverview(),
        !isAuthor ? analyticsService.getTraffic({ timeframe }) : Promise.resolve({ success: false }),
        analyticsService.getArticles({ timeframe, sortBy: "views-desc", limit: 5 }),
        analyticsService.getCategories(),
        analyticsService.getAuthors(),
        analyticsService.getEditorial({ timeframe }),
        analyticsService.getComments({ timeframe }),
        !isAuthor ? analyticsService.getSources({ timeframe }) : Promise.resolve({ success: false })
      ]);

      if (overviewRes.status === "fulfilled" && overviewRes.value?.success) {
        setOverview(overviewRes.value.data);
      }
      if (trafficRes.status === "fulfilled" && trafficRes.value?.success) {
        setTrafficData(trafficRes.value.data);
      }
      if (articlesRes.status === "fulfilled" && articlesRes.value?.success) {
        setTopArticles(articlesRes.value.data?.data || articlesRes.value.data?.articles || articlesRes.value.data || []);
      }
      if (categoriesRes.status === "fulfilled" && categoriesRes.value?.success) {
        setCategories(categoriesRes.value.data);
      }
      if (authorsRes.status === "fulfilled" && authorsRes.value?.success) {
        setAuthors(authorsRes.value.data);
      }
      if (editorialRes.status === "fulfilled" && editorialRes.value?.success) {
        setEditorial(editorialRes.value.data);
      }
      if (commentsRes.status === "fulfilled" && commentsRes.value?.success) {
        setCommentsData(commentsRes.value.data);
      }
      if (sourcesRes.status === "fulfilled" && sourcesRes.value?.success) {
        setSourcesData(sourcesRes.value.data);
      }
    } catch {
      // Handled gracefully
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [timeframe, isAuthor]);

  useEffect(() => {
    loadAllAnalytics(false);

    // Controlled 60s background polling with tab visibility detection
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        loadAllAnalytics(true);
      }
    }, 60000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadAllAnalytics(true);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadAllAnalytics]);

  // Derived status pipeline counts from real database overview
  const totalArticles = overview?.totalArticles || 0;
  const statusCounts = [
    {
      label: "Published",
      count: overview?.publishedArticles || 0,
      color: "bg-emerald-500",
      text: "text-emerald-700"
    },
    {
      label: "Draft",
      count: overview?.draftArticles || 0,
      color: "bg-slate-400",
      text: "text-slate-700"
    },
    {
      label: "Pending Review",
      count: overview?.pendingReviews || 0,
      color: "bg-amber-500",
      text: "text-amber-700"
    },
    {
      label: "Scheduled",
      count: overview?.scheduledArticles || 0,
      color: "bg-indigo-500",
      text: "text-indigo-700"
    },
    {
      label: "Archived",
      count: overview?.archivedArticles || 0,
      color: "bg-rose-500",
      text: "text-rose-700"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Newsroom Readership & Audience Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real database telemetry measuring article reach, audience velocity, and news desk productivity.
          </p>
        </div>

        {/* Global Period Controls */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => loadAllAnalytics(true)}
            disabled={refreshing}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-all cursor-pointer shadow-xs"
            title="Refresh analytics data"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin text-blue-600" : ""} />
          </button>

          <div className="inline-flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-semibold">
            {[
              { id: "today", label: "Today" },
              { id: "7d", label: "7 Days" },
              { id: "30d", label: "30 Days" },
              { id: "90d", label: "90 Days" }
            ].map((tf) => (
              <button
                key={tf.id}
                type="button"
                onClick={() => setTimeframe(tf.id)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  timeframe === tf.id
                    ? "bg-white text-blue-600 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Verified Real-Data Telemetry Banner */}
      <div className="p-3.5 bg-emerald-50/80 border border-emerald-200/80 rounded-2xl flex items-center justify-between gap-3 text-xs text-emerald-900">
        <div className="flex items-center gap-2.5">
          <ShieldCheck size={18} className="text-emerald-600 shrink-0" />
          <span>
            <strong>Verified Database Telemetry:</strong> All metrics, time series, and reader counts are calculated directly from authentic MongoDB article events and moderation logs.
          </span>
        </div>
        <span className="text-[11px] font-semibold text-emerald-700 shrink-0 hidden md:inline">
          Active Timeframe: {timeframe.toUpperCase()}
        </span>
      </div>

      {/* Key Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <StatCard
          title="Total Article Views"
          value={overview?.totalArticleViews || 0}
          changeLabel="authentic reads"
          icon={Eye}
          iconColor="text-blue-600 bg-blue-50 border-blue-100"
        />
        <StatCard
          title="Est. Unique Visitors"
          value={overview?.estimatedVisitors || 0}
          changeLabel="distinct sessions"
          icon={Users}
          iconColor="text-indigo-600 bg-indigo-50 border-indigo-100"
        />
        <StatCard
          title="Published Stories"
          value={overview?.publishedArticles || 0}
          changeLabel="on public wire"
          icon={FileText}
          iconColor="text-emerald-600 bg-emerald-50 border-emerald-100"
        />
        <StatCard
          title="Avg Views / Story"
          value={overview?.avgViewsPerStory || 0}
          changeLabel="avg readership"
          icon={TrendingUp}
          iconColor="text-purple-600 bg-purple-50 border-purple-100"
        />
        <StatCard
          title="Reader Feedback"
          value={overview?.approvedComments || 0}
          changeLabel="approved comments"
          icon={MessageSquare}
          iconColor="text-rose-600 bg-rose-50 border-rose-100"
        />
        <StatCard
          title="Engagement Velocity"
          value={`${overview?.engagementRatio || "0.0"}%`}
          changeLabel="feedback ratio"
          icon={Award}
          iconColor="text-amber-600 bg-amber-50 border-amber-100"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <ViewsTimelineChart
            title="Readership Velocity & Impressions Over Time"
            timelineData={trafficData?.timeline}
            timeframe={timeframe}
            onTimeframeChange={setTimeframe}
          />
        </div>
        <div className="lg:col-span-4">
          <CategoryDistributionChart
            title="Editorial Output by News Desk"
            categoryData={categories}
          />
        </div>
      </div>

      {/* Content Status Distribution & Top Articles */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Content Status Distribution */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Content Pipeline Distribution
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Current state of all newsroom story drafts
            </p>

            <div className="mt-5 space-y-3">
              {statusCounts.map((item, idx) => {
                const pct =
                  totalArticles > 0
                    ? ((item.count / totalArticles) * 100).toFixed(1)
                    : 0;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700 flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                        {item.label}
                      </span>
                      <span className="font-bold text-slate-900">
                        {item.count} <span className="text-slate-400 font-normal">({pct}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full ${item.color} rounded-full transition-all duration-300`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-6 text-xs text-slate-500 flex items-center justify-between">
            <span>Total Wire Pipeline:</span>
            <strong className="text-slate-900">{totalArticles} articles</strong>
          </div>
        </div>

        {/* Top Performing Articles Table */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Top Performing Articles by Readership
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Highest authenticated view counts and reader discussion
              </p>
            </div>
            <Link
              to="/admin/articles"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>All Articles</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Rank</th>
                  <th className="px-4 py-3.5">Article Headline</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Author</th>
                  <th className="px-4 py-3.5 text-right">Readership Views</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topArticles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                      No published article performance data recorded yet.
                    </td>
                  </tr>
                ) : (
                  topArticles.map((art, idx) => (
                    <tr key={art._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5">
                        <span
                          className={`w-6 h-6 rounded-full inline-flex items-center justify-center font-bold text-xs ${
                            idx === 0
                              ? "bg-amber-100 text-amber-800"
                              : idx === 1
                              ? "bg-slate-200 text-slate-700"
                              : idx === 2
                              ? "bg-orange-100 text-orange-800"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          #{idx + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <Link
                          to={`/admin/articles/${art._id}/edit`}
                          className="font-bold text-slate-900 hover:text-blue-600 block max-w-sm truncate"
                        >
                          {art.title}
                        </Link>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                          <span>{art.publishedAt ? new Date(art.publishedAt).toLocaleDateString() : "Draft"}</span>
                          {art.approvedCommentsCount > 0 && (
                            <span className="text-rose-600 font-semibold">
                              • {art.approvedCommentsCount} comments
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-semibold text-slate-700">
                          {art.category?.name || "General"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-600">{art.author?.name || "Newsroom Desk"}</td>
                      <td className="px-4 py-4 text-right">
                        <span className="font-bold text-blue-600 text-sm">
                          {Number(art.views || 0).toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Staff Author Readership & Editorial Productivity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Author Performance Table */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Staff Author Output & Audience Reach
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Investigative productivity, published stories, and cumulative audience reach
              </p>
            </div>
            {!isAuthor && (
              <Link
                to="/admin/authors"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <span>Staff Team</span>
                <ArrowRight size={13} />
              </Link>
            )}
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Author</th>
                  <th className="px-4 py-3.5">Role</th>
                  <th className="px-4 py-3.5 text-center">Published</th>
                  <th className="px-4 py-3.5 text-right">Cumulative Views</th>
                  <th className="px-4 py-3.5 text-right">Avg Views / Story</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {authors.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-6 text-center text-slate-400">
                      No author records found.
                    </td>
                  </tr>
                ) : (
                  authors.map((auth) => (
                    <tr key={auth._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-900">{auth.name}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="capitalize px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                          {auth.role?.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center font-bold text-slate-800">
                        {auth.publishedArticles}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-blue-600">
                        {Number(auth.totalViews || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 text-right text-slate-600">
                        {Number(auth.avgViews || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Editorial Turnaround & Review Queue */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Editorial Review Desk
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Workflow volume & verification speed
                </p>
              </div>
              <Link
                to="/admin/editorial"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                Queue
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="text-[11px] font-semibold text-slate-500">Submissions</div>
                <div className="text-lg font-bold text-slate-900 mt-0.5">
                  {editorial?.totalSubmissions || 0}
                </div>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80">
                <div className="text-[11px] font-semibold text-amber-700">Pending Review</div>
                <div className="text-lg font-bold text-amber-900 mt-0.5">
                  {editorial?.pending || 0}
                </div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200/80">
                <div className="text-[11px] font-semibold text-emerald-700">Approved</div>
                <div className="text-lg font-bold text-emerald-900 mt-0.5">
                  {editorial?.approved || 0}
                </div>
              </div>
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200/80">
                <div className="text-[11px] font-semibold text-rose-700">Revisions Needed</div>
                <div className="text-lg font-bold text-rose-900 mt-0.5">
                  {editorial?.changesRequested || 0}
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-blue-50/80 border border-blue-200/80 rounded-xl text-xs text-blue-900">
              <div className="font-semibold flex items-center gap-1.5 mb-1">
                <Clock size={14} className="text-blue-600" />
                <span>Average Review Turnaround</span>
              </div>
              <p className="text-blue-800">
                Editors review stories in <strong>{editorial?.avgTurnaroundHours || 0} hours</strong> on average before approval.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-6 text-xs text-slate-500 flex items-center justify-between">
            <span>Completed Reviews:</span>
            <strong className="text-slate-900">{editorial?.completedReviews || 0}</strong>
          </div>
        </div>
      </div>

      {/* Traffic Attribution Sources & Reader Comment Moderation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Traffic Attribution Sources */}
        {!isAuthor && (
          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                  <Compass size={16} className="text-blue-600" />
                  <span>Traffic Attribution Channels</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Referral origins and marketing campaign sources
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                Total Reads: {sourcesData?.totalViews || 0}
              </span>
            </div>

            <div className="space-y-3 mt-4">
              {sourcesData?.sources?.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  No external referral sources recorded yet in this window.
                </div>
              ) : (
                sourcesData?.sources?.map((src) => (
                  <div key={src.source} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">{src.label}</span>
                      <span className="font-bold text-slate-900">
                        {src.views.toLocaleString()} <span className="text-slate-400 font-normal">({src.percentage}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-300"
                        style={{ width: `${src.percentage}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Comment Moderation Distribution */}
        <div className={`${isAuthor ? "lg:col-span-12" : "lg:col-span-6"} bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                  <MessageSquare size={16} className="text-rose-600" />
                  <span>Reader Comments & Moderation</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Community feedback status and top discussed stories
                </p>
              </div>
              <Link
                to="/admin/comments"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                Moderation
              </Link>
            </div>

            <div className="grid grid-cols-4 gap-2.5 mb-5 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200/80">
                <div className="text-emerald-700 font-semibold text-[11px]">Approved</div>
                <div className="text-base font-bold text-emerald-900 mt-0.5">
                  {commentsData?.approved || 0}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200/80">
                <div className="text-amber-700 font-semibold text-[11px]">Pending</div>
                <div className="text-base font-bold text-amber-900 mt-0.5">
                  {commentsData?.pending || 0}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200/80">
                <div className="text-rose-700 font-semibold text-[11px]">Rejected</div>
                <div className="text-base font-bold text-rose-900 mt-0.5">
                  {commentsData?.rejected || 0}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200/80">
                <div className="text-slate-600 font-semibold text-[11px]">Spam Blocked</div>
                <div className="text-base font-bold text-slate-900 mt-0.5">
                  {commentsData?.spam || 0}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Top Discussed Stories
              </div>
              {commentsData?.topDiscussedArticles?.length === 0 ? (
                <div className="text-xs text-slate-400 py-3 text-center">
                  No reader comments posted yet.
                </div>
              ) : (
                commentsData?.topDiscussedArticles?.map((topArt) => (
                  <div
                    key={topArt._id}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs"
                  >
                    <span className="font-semibold text-slate-800 truncate max-w-xs">
                      {topArt.title}
                    </span>
                    <span className="font-bold text-rose-600 shrink-0 ml-2">
                      {topArt.approvedComments} comments
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 mt-5 text-xs text-slate-500 flex items-center justify-between">
            <span>Total Community Feedback:</span>
            <strong className="text-slate-900">{commentsData?.totalComments || 0} comments</strong>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
