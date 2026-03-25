import React, { useMemo } from "react";
import { useBlog } from "../../context/BlogProvider";
import BlogCard from "../card/BlogCard";

const RecentArticles = () => {
  const { articles } = useBlog();

  const recentData = useMemo(() => {
    return articles
      .filter((blog) => blog.isPublished === true)
      .slice(0, 8);
  }, [articles]);

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <h1 className="text-2xl sm:text-3xl font-bold">
        Recent Articles
      </h1>

      {/* Empty state */}
      {recentData.length === 0 ? (
        <p className="text-gray-500">No articles available yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {recentData.map((blog) => (
            <BlogCard blog={blog} key={blog._id} />
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentArticles;