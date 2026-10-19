import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, FileQuestion, Loader2 } from "lucide-react";
import { articleService } from "../../services/admin/articleService";
import ArticleEditor from "../../components/admin/articles/ArticleEditor";
import EmptyState from "../../components/admin/common/EmptyState";

export const EditArticle = () => {
  const { id } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchArticle = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await articleService.getArticleById(id);
        if (isMounted && res?.success && res.data) {
          setArticle(res.data);
        } else {
          setError("Article not found");
        }
      } catch (err) {
        if (isMounted) {
          setError(err?.response?.data?.message || "Failed to load article from server");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (id) {
      fetchArticle();
    }
    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200/80">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-600">Loading article editor data...</p>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="space-y-4">
        <Link
          to="/admin/articles"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft size={14} /> Back to Articles
        </Link>
        <EmptyState
          icon={FileQuestion}
          title="Article Not Found"
          description={
            error || `No article found with ID "${id}". It may have been archived or removed.`
          }
          actionLabel="View All Articles"
          onAction={() => window.history.back()}
        />
      </div>
    );
  }

  return <ArticleEditor initialData={article} isEditMode={true} />;
};

export default EditArticle;
