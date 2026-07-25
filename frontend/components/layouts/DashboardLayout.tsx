import { ReactNode } from "react";
import Image from "next/image";
import TopNavbar from "@/components/dashboard/TopNavbar";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  return (
    <div className="relative min-h-screen overflow-hidden">

      {/* Background Image */}
      <Image
        src="/images/dashboard-bg.jpg"
        alt="Dashboard Background"
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />

      {/* Overlay for readability */}
      <div className="absolute inset-0 bg-white/15 backdrop-blur-[1px]" />

      {/* Dashboard Content */}
      <div className="relative z-10 min-h-screen">

        <TopNavbar />

        <main className="max-w-[1900px] mx-auto w-full px-6 lg:px-8 xl:px-10 pb-8">
          {children}
        </main>

      </div>

    </div>
  );
}