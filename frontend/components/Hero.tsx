"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, type Variants } from "framer-motion";
import { ChevronDown } from "lucide-react";
import Navbar from "./Navbar";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.05,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
};

const statCardVariants: Variants = {
  hidden: { opacity: 0, y: 15, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: "easeOut",
    },
  },
};

export default function Hero() {
  return (
    <>
      <Navbar />

      <section id="home" className="relative min-h-screen pt-32 pb-20 px-4 sm:px-6 lg:px-8 flex flex-col justify-between items-center overflow-hidden">
        {/* Full-screen farm background with Next.js Image optimization & preload */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
          <Image
            src="/images/hero.jpg"
            alt="AI Agricultural Advisory Farm"
            fill
            priority
            quality={80}
            sizes="100vw"
            className="object-cover object-center animate-hero-scale"
          />
        </div>

        {/* 30-35% Subtle Cinematic Dark Green Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#081e12]/40 via-[#0a2314]/30 to-[#06180e]/42 pointer-events-none -z-10" />

        {/* Main Content Area */}
        <div className="relative z-10 w-full max-w-5xl mx-auto my-auto pt-8 pb-12 flex flex-col items-center justify-center text-center">
          <motion.div
            className="w-full flex flex-col items-center justify-center text-center"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Floating Top Badge */}
            <motion.div variants={itemVariants} className="mb-6">
              <motion.span
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-[#66BB6A]/40 bg-[#081e12]/60 backdrop-blur-xl text-[#66BB6A] font-heading font-semibold text-xs sm:text-sm tracking-wide shadow-xl"
              >
                <span className="w-2 h-2 rounded-full bg-[#66BB6A] animate-pulse" />
                🌱 AI Powered Smart Farming Platform
              </motion.span>
            </motion.div>

            {/* Main Headline (72px Poppins ExtraBold) */}
            <motion.h1
              variants={itemVariants}
              className="font-heading text-4xl sm:text-6xl lg:text-[72px] font-black text-white leading-[1.08] tracking-tight mb-6 max-w-4xl drop-shadow-[0_6px_24px_rgba(0,0,0,0.7)]"
            >
              AI-Powered Agricultural Advisory System for{" "}
              <span className="text-[#66BB6A] drop-shadow-[0_0_35px_rgba(102,187,106,0.6)]">
                Farmers
              </span>
            </motion.h1>

            {/* Concise Subtitle (Inter, max-w-[650px]) */}
            <motion.p
              variants={itemVariants}
              className="font-body text-base sm:text-lg md:text-xl text-white/90 max-w-[650px] mx-auto mb-10 leading-relaxed font-normal drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)]"
            >
              A multilingual AI assistant that helps farmers through voice interaction,
              crop disease detection, weather advisory, market prices,
              government schemes, and real-time smart recommendations.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div variants={itemVariants} className="flex flex-wrap justify-center items-center gap-5 mb-14">
              <Link href="/login">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="font-heading px-9 py-4 rounded-full font-bold text-base bg-gradient-to-r from-[#66BB6A] to-[#2e7d32] text-[#062012] shadow-[0_10px_30px_rgba(102,187,106,0.45)] hover:shadow-[0_15px_40px_rgba(102,187,106,0.65)] transition-all duration-300"
                >
                  🚀 Get Started
                </motion.button>
              </Link>

              <Link href="/register">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="font-heading px-9 py-4 rounded-full font-bold text-base bg-white/15 text-white border-2 border-white/50 backdrop-blur-md shadow-xl hover:bg-white/25 hover:border-[#66BB6A] hover:text-[#66BB6A] transition-all duration-300"
                >
                  Create Account
                </motion.button>
              </Link>
            </motion.div>

            {/* 4 Modern Floating Glass Statistics Cards */}
            <motion.div
              variants={itemVariants}
              className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 max-w-4xl w-full px-2"
            >
              <motion.div
                variants={statCardVariants}
                whileHover={{ y: -4, scale: 1.03 }}
                className="bg-[#081e12]/50 backdrop-blur-xl border border-white/20 shadow-xl p-4 rounded-2xl flex flex-col items-center justify-center text-center transition-all group"
              >
                <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">🌐</span>
                <span className="font-heading font-black text-xl text-white">8+</span>
                <span className="font-body text-xs font-medium text-white/80">Indian Languages</span>
              </motion.div>

              <motion.div
                variants={statCardVariants}
                whileHover={{ y: -4, scale: 1.03 }}
                className="bg-[#081e12]/50 backdrop-blur-xl border border-[#66BB6A]/40 shadow-xl p-4 rounded-2xl flex flex-col items-center justify-center text-center transition-all group"
              >
                <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">🤖</span>
                <span className="font-heading font-black text-xl text-[#66BB6A]">24/7</span>
                <span className="font-body text-xs font-medium text-white/80">AI Assistant</span>
              </motion.div>

              <motion.div
                variants={statCardVariants}
                whileHover={{ y: -4, scale: 1.03 }}
                className="bg-[#081e12]/50 backdrop-blur-xl border border-white/20 shadow-xl p-4 rounded-2xl flex flex-col items-center justify-center text-center transition-all group"
              >
                <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">🎤</span>
                <span className="font-heading font-black text-xl text-white">Voice</span>
                <span className="font-body text-xs font-medium text-white/80">Input & Output</span>
              </motion.div>

              <motion.div
                variants={statCardVariants}
                whileHover={{ y: -4, scale: 1.03 }}
                className="bg-[#081e12]/50 backdrop-blur-xl border border-white/20 shadow-xl p-4 rounded-2xl flex flex-col items-center justify-center text-center transition-all group"
              >
                <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">📡</span>
                <span className="font-heading font-black text-xl text-white">Real-Time</span>
                <span className="font-body text-xs font-medium text-white/80">Advisory</span>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>

        {/* Bouncing "Scroll to Explore" Indicator */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="relative z-10 pb-4 flex flex-col items-center justify-center"
        >
          <a
            href="#features"
            className="group flex flex-col items-center gap-1.5 text-xs font-heading font-medium text-white/70 hover:text-[#66BB6A] transition-colors"
          >
            <span>Scroll to Explore</span>
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            >
              <ChevronDown size={18} className="text-[#66BB6A] group-hover:scale-110 transition-transform" />
            </motion.div>
          </a>
        </motion.div>
      </section>
    </>
  );
}


