import React, { useState } from "react";
import { Mail, CheckCircle, Lock } from "lucide-react";

const Newsletter = () => {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");

  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!email) {
      setError("Please enter your email address");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    console.log("Subscribed email:", email);
    setIsSubmitted(true);
    setEmail("");
    
    // Reset success message after 3 seconds
    setTimeout(() => {
      setIsSubmitted(false);
    }, 3000);
  };

  return (
    <div className="w-full bg-linear-to-br from-[#1E3A8A] to-[#2E4A9A] rounded-2xl p-6 sm:p-8 md:p-10 text-center shadow-xl">
      
      {/* Icon */}
      <div className="mb-4 flex justify-center">
        <div className="bg-white/20 rounded-full p-3">
          <Mail className="w-8 h-8 text-white" />
        </div>
      </div>

      <h2 className="text-2xl sm:text-3xl font-bold text-white">
        Subscribe to Our Newsletter
      </h2>

      <p className="text-sm sm:text-base text-white/80 mt-2 max-w-md mx-auto">
        Get the latest news, trending stories, and updates delivered straight to your inbox.
      </p>

      {/* Success Message */}
      {isSubmitted && (
        <div className="mt-4 p-3 bg-green-500/20 border border-green-500 rounded-lg animate-fadeIn">
          <div className="flex items-center justify-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-300" />
            <p className="text-green-100 text-sm">
              Successfully subscribed! Check your inbox soon.
            </p>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3"
      >
        <div className="relative w-full sm:w-80">
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
            }}
            className={`w-full px-4 py-3 rounded-lg text-gray-900 outline-none transition-all duration-200
              ${error ? 'border-2 border-red-500 focus:border-red-500' : 'focus:ring-2 focus:ring-blue-300'}
              placeholder:text-gray-400`}
          />
          {error && (
            <p className="absolute -bottom-6 left-0 text-xs text-red-200 animate-fadeIn">
              {error}
            </p>
          )}
        </div>

        <button
          type="submit"
          className="bg-white text-[#1E3A8A] px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 hover:scale-105 transition-all duration-200 shadow-md w-full sm:w-auto whitespace-nowrap flex items-center justify-center gap-2"
        >
          <Mail className="w-4 h-4" />
          Subscribe
        </button>
      </form>

      {/* Trust Badge */}
      <p className="text-xs text-white/60 mt-6 flex items-center justify-center gap-2">
        <Lock className="w-3 h-3" />
        No spam, unsubscribe anytime
      </p>

      {/* Add CSS for animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default Newsletter;