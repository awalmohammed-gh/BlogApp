import { Link } from "react-router-dom";
import { Calendar, User } from "lucide-react";

const BlogCard = ({ blog }) => {
  if (!blog) return null;
  const { _id, author, title, description, date, image, category } = blog;

  // remove HTML tags (safe preview text)
  const cleanText = (html) => {
    return (html || "").replace(/<[^>]*>/g, "");
  };

  return (
    <Link
      to={`/blog-details/${_id}`}
      className="group flex flex-col bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:-translate-y-1"
    >
      {/* Image with category badge overlay */}
      <div className="h-48 w-full overflow-hidden relative bg-gray-100">
        <img
          src={image}
          alt={title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {category && (
          <span className="absolute top-3 left-3 bg-[#1E3A8A]/90 backdrop-blur-xs text-white text-xs font-semibold px-2.5 py-1 rounded-lg shadow-sm">
            {category}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-1.5">
          <h2 className="text-base font-bold text-gray-900 group-hover:text-[#1E3A8A] transition-colors line-clamp-2 leading-snug">
            {title}
          </h2>

          <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
            {cleanText(description)}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-[11px] text-gray-500 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-1.5 truncate max-w-[140px]">
            <User size={12} className="text-gray-400 shrink-0" />
            <span className="truncate font-medium">{author}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Calendar size={12} className="text-gray-400" />
            <span>{date}</span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default BlogCard;