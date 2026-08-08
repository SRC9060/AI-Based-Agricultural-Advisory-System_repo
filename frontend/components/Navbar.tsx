"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="fixed top-4 inset-x-0 z-[1000] px-4 sm:px-6 lg:px-8 pointer-events-none">
      <nav
        className={`max-w-6xl mx-auto rounded-full pointer-events-auto transition-all duration-300 px-6 py-3.5 flex justify-between items-center ${
          isScrolled
            ? "bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border border-white/40 dark:border-slate-800/80 shadow-2xl shadow-emerald-950/10"
            : "bg-white/70 dark:bg-slate-900/70 backdrop-blur-lg border border-white/30 dark:border-slate-800/50 shadow-lg"
        }`}
      >
        {/* Logo */}
        <Link href="#home" className="flex items-center gap-2">
          <h2 className="nav-logo font-heading text-base sm:text-lg font-bold tracking-tight text-[#1b4332] dark:text-emerald-400">
            🌾 AI Agricultural Advisory System
          </h2>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8 font-heading font-semibold text-sm">
          <Link className="nav-link text-[#1b4332] dark:text-slate-100" href="#home">
            Home
          </Link>

          <Link className="nav-link text-[#1b4332] dark:text-slate-100" href="#features">
            Features
          </Link>

          <Link className="nav-link text-[#1b4332] dark:text-slate-100" href="#how-it-works">
            About
          </Link>

          <Link className="nav-link text-[#1b4332] dark:text-slate-100" href="#contact">
            Contact
          </Link>
        </div>

        {/* Mobile Hamburger Toggle Button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-full text-[#1b4332] dark:text-slate-100 hover:bg-emerald-50 dark:hover:bg-slate-800 transition-colors"
          aria-label="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden pointer-events-auto max-w-6xl mx-auto mt-2 rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-emerald-100 dark:border-slate-800 shadow-2xl py-6 px-8 flex flex-col gap-5 font-heading font-bold text-base animate-in slide-in-from-top-4 duration-300">
          <Link
            onClick={() => setMobileMenuOpen(false)}
            className="text-[#1b4332] dark:text-slate-100 hover:text-[#7ED957] transition-colors"
            href="#home"
          >
            Home
          </Link>

          <Link
            onClick={() => setMobileMenuOpen(false)}
            className="text-[#1b4332] dark:text-slate-100 hover:text-[#7ED957] transition-colors"
            href="#features"
          >
            Features
          </Link>

          <Link
            onClick={() => setMobileMenuOpen(false)}
            className="text-[#1b4332] dark:text-slate-100 hover:text-[#7ED957] transition-colors"
            href="#how-it-works"
          >
            About
          </Link>

          <Link
            onClick={() => setMobileMenuOpen(false)}
            className="text-[#1b4332] dark:text-slate-100 hover:text-[#7ED957] transition-colors"
            href="#contact"
          >
            Contact
          </Link>
        </div>
      )}
    </header>
  );
}

