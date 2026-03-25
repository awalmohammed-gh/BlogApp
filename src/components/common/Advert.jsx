import React from "react";

const Advert = () => {
  return (
    <div className="w-full rounded-xl bg-[#262626] text-white p-6 shadow-md my-15">
      
      <span className="text-xs bg-white/20 px-2 py-1 rounded">
        Sponsored
      </span>

      <h2 className="text-lg font-bold mt-3">
        Promote Your Business Here
      </h2>

      <p className="text-sm text-white/80 mt-2">
        Reach thousands of daily readers across Ghana and beyond. Place your brand in front of the right audience today.
      </p>

      <button className="mt-4 bg-white text-[#1E3A8A] px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-100 transition">
        Contact Us
      </button>
    </div>
  );
};

export default Advert;