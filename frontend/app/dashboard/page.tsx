import Sidebar from "@/components/dashboard/Sidebar";
import TopNavbar from "@/components/dashboard/TopNavbar";
import StatsSection from "@/components/dashboard/StatsSection";
import AIAssistantCard from "@/components/dashboard/AIAssistantCard";
import GovernmentSchemes from "@/components/dashboard/GovernmentSchemes";
import QuickAccess from "@/components/dashboard/QuickAccess";
import RecentActivity from "@/components/dashboard/RecentActivity";
import HeroBanner from "@/components/dashboard/HeroBanner";
import Footer from "@/components/dashboard/Footer";

export default function DashboardPage() {
  return (
    <div className="h-screen overflow-hidden bg-gray-100 flex">

      {/* Sidebar */}
      <div className="h-screen shrink-0 overflow-y-auto">
        <Sidebar />
      </div>

      {/* Main Content */}
      <main className="flex-1 min-h-0 overflow-y-auto p-6">

        {/* Top Navbar */}
        <TopNavbar />

        {/* Stats Cards */}
        <div className="mt-5">
          <StatsSection />
        </div>
       
        <div className="mt-5">
          <HeroBanner />
        </div>
        
        {/* AI Assistant + Quick Access */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-5 items-start">
          <div className="lg:col-span-2">
            <AIAssistantCard />
          </div>

          <QuickAccess />
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5 items-start">
          <GovernmentSchemes />
          <RecentActivity />
        </div>

        <div className="mt-5">
          <Footer />
        </div>

      </main>

    </div>
  );
}