import { motion } from "motion/react";

const Hero = () => {
  return (
    <div className="bg-[url('/heroBg.jpg')] w-full h-[75vh] relative bg-cover bg-center flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 flex items-center justify-center"></div>

      {/* Content */}
      <div className="relative text-center text-white px-6 max-w-5xl">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="text-3xl md:text-5xl lg:text-8xl font-bold leading-tight mb-4"
        >
          Ghana and Beyond
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="text-sm md:text-lg text-gray-200 mb-6"
        >
          Delivering accurate and timely news from Ghana, across Africa, and
          around the world. Stay informed with breaking stories, in-depth
          reporting, and updates that matter in your daily life.
        </motion.p>

        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="bg-[#1E3A8A] hover:bg-blue-900 transition px-6 py-3 rounded-md text-sm md:text-base font-medium"
        >
          Browse Stories
        </motion.button>
      </div>
    </div>
  );
};

export default Hero;
