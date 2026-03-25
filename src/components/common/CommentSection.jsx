import React, { useState } from "react";
import { Check, Edit, Trash, Send, User, MessageCircle, X, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

const CommentSection = () => {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [content, setContent] = useState([]);

  const [editText, setEditText] = useState("");
  const [editIndex, setEditIndex] = useState(null);

  const handleEdit = (item) => {
    setEditText(item.message);
    setEditIndex(item.id);
  };

  const updateEdit = () => {
    setContent((prev) =>
      prev.map((item) =>
        item.id === editIndex ? { ...item, message: editText } : item
      )
    );

    setEditText("");
    setEditIndex(null);
    toast.success("Comment updated successfully");
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!name || !message) {
      toast.error("Please fill in both name and message");
      return null;
    }

    const newContent = {
      id: Date.now(),
      message,
      name,
    };

    setContent((prev) => [newContent, ...prev]);
    setName("");
    setMessage("");
    toast.success("Comment posted successfully!");
  };

  const removeComment = (id) => {
    if (window.confirm("Delete this comment?")) {
      setContent((prev) => prev.filter((item) => item.id !== id));
      toast.success("Comment deleted");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <MessageCircle className="w-6 h-6 text-[#1E3A8A]" />
          <h2 className="text-2xl font-bold text-gray-800">Comments</h2>
        </div>
        <p className="text-gray-500 text-sm">Join the conversation and share your thoughts</p>
      </div>

      {/* FORM */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-100"
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-gradient-to-r from-[#1E3A8A] to-[#2E4A9A] rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <h3 className="font-semibold text-gray-700">Leave a Comment</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                type="text"
                placeholder="Enter your name"
                className="w-full border border-gray-200 pl-10 pr-4 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:border-transparent transition-all duration-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your comment here..."
              className="w-full border border-gray-200 p-3 rounded-xl h-28 outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:border-transparent transition-all duration-200 resize-none"
            />
          </div>

          <button
            type="submit"
            className="bg-gradient-to-r from-[#1E3A8A] to-[#2E4A9A] text-white px-6 py-2.5 rounded-xl hover:shadow-lg transition-all duration-200 flex items-center gap-2 font-medium"
          >
            <Send size={18} />
            Post Comment
          </button>
        </div>
      </form>

      {/* COMMENTS COUNT */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-gray-500" />
          <span className="text-sm font-medium text-gray-600">
            {content.length} {content.length === 1 ? "Comment" : "Comments"}
          </span>
        </div>
        {content.length > 0 && (
          <button 
            onClick={() => {
              if (window.confirm("Clear all comments?")) {
                setContent([]);
                toast.success("All comments cleared");
              }
            }}
            className="text-xs text-red-500 hover:text-red-600 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* COMMENTS */}
      <div className="space-y-4">
        {content.length === 0 ? (
          <div className="bg-gray-50 rounded-2xl p-8 text-center border border-gray-100">
            <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400">No comments yet. Be the first to share your thoughts!</p>
          </div>
        ) : (
          content.map((comment) => (
            <div
              key={comment.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-all duration-200"
            >
              {editIndex === comment.id ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">Edit Comment</label>
                    <button
                      onClick={() => {
                        setEditText("");
                        setEditIndex(null);
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full border border-gray-200 p-3 rounded-xl h-24 outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:border-transparent resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={updateEdit}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-all duration-200 flex items-center gap-2 text-sm"
                    >
                      <Check size={16} /> Save Changes
                    </button>
                    <button
                      onClick={() => {
                        setEditText("");
                        setEditIndex(null);
                      }}
                      className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-200 transition-all duration-200 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 w-full">
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-3 sm:gap-0">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 bg-linear-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-[#1E3A8A]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-gray-800">
                            {comment.name}
                          </p>
                          <span className="text-xs text-gray-400">
                            {new Date(comment.id).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-gray-600 leading-relaxed">
                          {comment.message}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(comment)}
                        className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-all duration-200"
                        title="Edit comment"
                      >
                        <Edit size={16} />
                      </button>

                      <button
                        onClick={() => removeComment(comment.id)}
                        className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-all duration-200"
                        title="Delete comment"
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CommentSection;