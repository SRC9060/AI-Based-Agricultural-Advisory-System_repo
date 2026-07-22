import Link from "next/link";
import Image from "next/image";

export default function HeroBanner() {
  return (
    <div className="bg-linear-to-r from-[#EFF6FF] via-[#F0FDF4] to-[#ECFEFF] rounded-2xl shadow-sm overflow-hidden border border-slate-200/70">
      <div className="grid md:grid-cols-[1.1fr_0.9fr] items-center gap-8 p-8 md:p-10">

        {/* Left Content */}
        <div className="max-w-xl">
          <h1 className="text-3xl md:text-4xl font-bold leading-tight tracking-tight text-slate-800">
            Empowering Farmers with AI and Government Support
          </h1>

          <p className="mt-4 text-slate-600 text-sm md:text-base leading-7 max-w-xl">
            Get personalized advice, scheme information, weather updates and more in your language.
          </p>

          <Link
            href="/chat"
            className="inline-flex items-center gap-2 mt-6 bg-[#16A34A] hover:bg-[#166534] text-white font-semibold px-6 py-3 rounded-2xl shadow hover:shadow-xl transition duration-300 cursor-pointer"
            aria-label="Open AI chat"
          >
            Explore Features
          </Link>
        </div>

        {/* Right Illustration */}
        <div className="hidden md:flex items-center justify-end h-56 md:h-64">
          <Image
            src="/images/farm-hero.jpeg"
            alt="AI Agriculture Illustration"
            width={520}
            height={320}
            className="h-full w-auto max-w-full object-contain"
            priority
          />
        </div>

      </div>
    </div>
  );
}