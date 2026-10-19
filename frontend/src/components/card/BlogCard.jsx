import { responsiveImageProps } from "../../utils/imageKit";
import { Link } from "react-router-dom";
import { Clock } from "lucide-react";
import { stripHtml, readingMinutes, hideBrokenImage } from "../../utils/articleMeta";

const BlogCard = ({ blog }) => {
  if (!blog) return null;
  const { _id, author, title, description, content, date, image, category } = blog;

  return (
    <Link
      to={`/blog-details/${blog.slug || _id}`}
      className="group flex flex-col h-full bg-white rounded-2xl overflow-hidden border border-slate-200/80 hover:border-blue-200 hover:shadow-xl hover:shadow-slate-200/70 hover:-translate-y-1 transition-all duration-300"
    >
      <div className="aspect-16/10 w-full overflow-hidden relative bg-linear-to-br from-slate-100 to-blue-100">
        <img
          {...responsiveImageProps(image)}
          alt={title}
         
          onError={hideBrokenImage}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {category && (
          <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-slate-900 text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-sm">
            {category}
          </span>
        )}
      </div>

      <div className="p-5 flex-1 flex flex-col gap-3">
        <h3 className="font-serif-headline text-xl font-bold text-slate-900 group-hover:text-blue-700 transition-colors line-clamp-2 leading-snug">
          {title}
        </h3>
        <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">{stripHtml(description)}</p>

        <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs text-slate-500">
          <span className="flex items-center gap-2 min-w-0">
            {author && (
              <span className="w-6 h-6 shrink-0 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold inline-flex items-center justify-center">
                {author.charAt(0)}
              </span>
            )}
            <span className="truncate">{author ? `${author} · ${date}` : date}</span>
          </span>
          <span className="shrink-0 inline-flex items-center gap-1">
            <Clock size={12} /> {(blog.readingMinutes || readingMinutes(content || description))} min
          </span>
        </div>
      </div>
    </Link>
  );
};

export default BlogCard;
