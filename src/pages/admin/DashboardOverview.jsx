import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FileText,
  CheckCircle,
  FileEdit,
  Clock,
  Eye,
  MessageSquare,
  Plus,
  ArrowRight,
  TrendingUp,
  FolderTree,
  UploadCloud,
  GitPullRequest,
  ExternalLink,
  Edit,
  Trash2,
  Calendar
} from "lucide-react";
import { useAdmin } from "../../context/admin/AdminContext";
import StatCard from "../../components/admin/common/StatCard";
import StatusBadge from "../../components/admin/common/StatusBadge";
import ConfirmDialog from "../../components/admin/common/ConfirmDialog";
import ViewsTimelineChart from "../../components/admin/charts/ViewsTimelineChart";
import CategoryDistributionChart from "../../components/admin/charts/CategoryDistributionChart";
import ArticlePreviewModal from "../../components/admin/articles/ArticlePreviewModal";
import { analyticsService } from "../../services/admin/analyticsService";

export const DashboardOverview = () => {
  const { articles, stats: fallbackStats, deleteArticle } = useAdmin();
  const navigate = useNavigate();

  const [liveStats, setLiveStats] = useState(null);
  const [previewArticle, setPreviewArticle] = useState(null);
  const [articleToDelete, setArticleToDelete] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      try {
        const res = await analyticsService.getOverview();
        if (isMounted && res?.success && res.data) {
          setLiveStats(res.data);
        }
      } catch {
        // Fallback to context
      }
    };

    fetchStats();
    return () => {
      isMounted = false;
    };
  }, []);

  const stats = {
    totalArticles: liveStats?.totalArticles ?? fallbackStats.totalArticles,
    publishedArticles: liveStats?.publishedArticles ?? fallbackStats.publishedArticles,
    draftArticles: liveStats?.draftArticles ?? fallbackStats.draftArticles,
    pendingReviews: liveStats?.pendingReviews ?? fallbackStats.pendingReviews,
    totalViews: liveStats?.totalArticleViews ?? fallbackStats.totalViews,
    totalComments: liveStats?.approvedComments ?? fallbackStats.totalComments,
    pendingComments: liveStats?.pendingComments ?? fallbackStats.pendingComments
  };

  // Recent 5 articles
  const recentArticles = articles.slice(0, 5);

  // Editorial queue: articles pending review
  const pendingArticles = articles.filter((a) => a.status === "Pending Review");

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Newsroom Overview
            </h1>
            <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-[11px] font-bold rounded-full">
              Live Edition
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage your content, monitor publishing activity, and keep your newsroom organized.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/admin/editorial"
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <GitPullRequest size={15} className="text-amber-500" />
            <span>Review Queue</span>
            {stats.pendingReviews > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-500 text-slate-950 font-bold rounded-full text-[10px]">
                {stats.pendingReviews}
              </span>
            )}
          </Link>

          <Link
            to="/admin/articles/new"
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={16} />
            <span>Create New Article</span>
          </Link>
        </div>
      </div>

      {/* 1. Key Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <StatCard
          title="Total Articles"
          value={stats.totalArticles}
          changeLabel="database records"
          icon={FileText}
          iconColor="text-blue-600 bg-blue-50 border-blue-100"
          onClick={() => navigate("/admin/articles")}
        />
        <StatCard
          title="Published"
          value={stats.publishedArticles}
          changeLabel="active wire"
          icon={CheckCircle}
          iconColor="text-emerald-600 bg-emerald-50 border-emerald-100"
          onClick={() => navigate("/admin/articles")}
        />
        <StatCard
          title="Drafts"
          value={stats.draftArticles}
          changeLabel="in progress"
          icon={FileEdit}
          iconColor="text-slate-600 bg-slate-100 border-slate-200"
          onClick={() => navigate("/admin/articles")}
        />
        <StatCard
          title="Pending Reviews"
          value={stats.pendingReviews}
          change={stats.pendingReviews > 0 ? "Review Required" : "All Clear"}
          isPositive={stats.pendingReviews === 0}
          changeLabel="editorial desk"
          icon={Clock}
          iconColor="text-amber-600 bg-amber-50 border-amber-100"
          onClick={() => navigate("/admin/editorial")}
        />
        <StatCard
          title="Total Views"
          value={stats.totalViews}
          changeLabel="genuine reads"
          icon={Eye}
          iconColor="text-indigo-600 bg-indigo-50 border-indigo-100"
          onClick={() => navigate("/admin/analytics")}
        />
        <StatCard
          title="Comments"
          value={stats.totalComments}
          change={stats.pendingComments > 0 ? `${stats.pendingComments} unapproved` : undefined}
          isPositive={stats.pendingComments === 0}
          changeLabel="reader submissions"
          icon={MessageSquare}
          iconColor="text-rose-600 bg-rose-50 border-rose-100"
          onClick={() => navigate("/admin/comments")}
        />
      </div>

      {/* 2 & 3. Publishing Activity & Content Performance Visuals */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <ViewsTimelineChart />
        </div>
        <div className="lg:col-span-4">
          <CategoryDistributionChart />
        </div>
      </div>

      {/* Quick Action Shortcuts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          to="/admin/articles/new"
          className="p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-xs transition-all flex items-center gap-3 group"
        >
          <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <Plus size={18} />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800 group-hover:text-blue-600">
              Create Article
            </div>
            <div className="text-[11px] text-slate-500">Draft new report</div>
          </div>
        </Link>

        <Link
          to="/admin/categories"
          className="p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-xs transition-all flex items-center gap-3 group"
        >
          <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
            <FolderTree size={18} />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800 group-hover:text-blue-600">
              Categories
            </div>
            <div className="text-[11px] text-slate-500">Manage news desks</div>
          </div>
        </Link>

        <Link
          to="/admin/media"
          className="p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-xs transition-all flex items-center gap-3 group"
        >
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <UploadCloud size={18} />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800 group-hover:text-blue-600">
              Upload Media
            </div>
            <div className="text-[11px] text-slate-500">Asset library</div>
          </div>
        </Link>

        <Link
          to="/admin/editorial"
          className="p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-xs transition-all flex items-center gap-3 group"
        >
          <div className="p-2.5 rounded-lg bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
            <GitPullRequest size={18} />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800 group-hover:text-blue-600">
              Review Queue
            </div>
            <div className="text-[11px] text-slate-500">{stats.pendingReviews} awaiting</div>
          </div>
        </Link>
      </div>

      {/* 4 & 5. Recent Articles & Editorial Queue Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Articles */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Recent Articles
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Latest stories created or updated in the newsroom
              </p>
            </div>
            <Link
              to="/admin/articles"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-100 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Article</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Author</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentArticles.map((art) => (
                  <tr key={art._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {art.image && (
                          <img
                            src={art.image}
                            alt=""
                            className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                          />
                        )}
                        <div className="truncate max-w-[200px]">
                          <div className="font-semibold text-slate-900 truncate">
                            {art.title}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {art.date}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-700">{art.category}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-slate-600">{art.author}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={art.status} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setPreviewArticle(art)}
                          title="Preview Article"
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/articles/${art._id}/edit`)}
                          title="Edit Article"
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setArticleToDelete(art)}
                          title="Delete Article"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 5. Editorial Queue */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Editorial Review Queue
              </h3>
              {pendingArticles.length > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded-full">
                  {pendingArticles.length} pending
                </span>
              )}
            </div>
            <Link
              to="/admin/editorial"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>Manage Queue</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="p-4 flex-1">
            {pendingArticles.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                The editorial review queue is currently clear. No articles awaiting approval.
              </div>
            ) : (
              <div className="space-y-3">
                {pendingArticles.map((art) => (
                  <div
                    key={art._id}
                    className="p-3.5 rounded-xl border border-amber-200/70 bg-amber-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-amber-300 transition-colors"
                  >
                    <div className="truncate">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {art.title}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-1">
                        <span className="font-medium text-slate-700">By {art.author}</span>
                        <span>&bull;</span>
                        <span>{art.category}</span>
                        <span>&bull;</span>
                        <span>{art.date}</span>
                      </div>
                    </div>
                    <Link
                      to="/admin/editorial"
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors shrink-0 text-center"
                    >
                      Review Now
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog for Deletions */}
      <ConfirmDialog
        isOpen={!!articleToDelete}
        onClose={() => setArticleToDelete(null)}
        onConfirm={() => {
          if (articleToDelete) {
            deleteArticle(articleToDelete._id);
            setArticleToDelete(null);
          }
        }}
        title="Delete Article?"
        message={`Are you sure you want to delete "${articleToDelete?.title}"? This action cannot be undone.`}
        confirmText="Yes, Delete Article"
      />

      {/* Article Preview Modal */}
      <ArticlePreviewModal
        article={previewArticle}
        isOpen={!!previewArticle}
        onClose={() => setPreviewArticle(null)}
      />
    </div>
  );
};

export default DashboardOverview;
