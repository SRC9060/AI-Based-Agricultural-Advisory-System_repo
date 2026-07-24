import { ReactNode } from "react";
import TopNavbar from "@/components/dashboard/TopNavbar";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f6fbf7] via-[#f9fcfa] to-[#eef7f1]">

      {/* Floating Top Navigation */}
      <TopNavbar />

      {/* Main Content */}
     <main className="max-w-[1900px] mx-auto w-full px-6 lg:px-8 xl:px-10 pb-8">
        {children}
      </main>

    </div>
  );
}