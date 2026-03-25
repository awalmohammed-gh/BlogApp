import React from "react";
import { Link } from "react-router-dom";

const BlogCard = ({ blog }) => {
  const { _id, author, title, description, date, image } = blog;

  // remove HTML tags (safe preview text)
  const cleanText = (html) => {
    return html.replace(/<[^>]*>/g, "");
  };

  return (
    <Link
      to={`/blog-details/${_id}`}
      className="block bg-white rounded-xl overflow-hidden shadow-md hover:shadow-lg transition"
    >
      {/* Image */}
      <div className="h-48 w-full overflow-hidden">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover hover:scale-105 transition duration-300"
        />
      </div>

      {/* Content */}
      <div className="p-4 space-y-2">
        <h2 className="text-lg font-bold line-clamp-2">{title}</h2>

        <p className="text-sm text-gray-600 line-clamp-1">
          {cleanText(description)}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-2">
          <p>{author}</p>
          <p>{date}</p>
        </div>
      </div>
    </Link>
  );
};

export default BlogCard;