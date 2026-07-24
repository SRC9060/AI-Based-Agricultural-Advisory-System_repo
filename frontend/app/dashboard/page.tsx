import DashboardLayout from "@/components/layouts/DashboardLayout";

import StatsSection from "@/components/dashboard/StatsSection";
import FarmBanner from "@/components/dashboard/FarmBanner";
import AIAssistantCard from "@/components/dashboard/AIAssistantCard";
import QuickAccess from "@/components/dashboard/QuickAccess";
import GovernmentSchemes from "@/components/dashboard/GovernmentSchemes";
import RecentActivity from "@/components/dashboard/RecentActivity";
import Footer from "@/components/dashboard/Footer";

export default function DashboardPage() {
  return (
    <DashboardLayout>

      {/* Stats */}
      <section className="mt-6">
        <StatsSection />
      </section>


      {/* AI Assistant + Farm Image */}

<section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 items-stretch">
  <div className="lg:col-span-2">
    <AIAssistantCard />
  </div>
  <FarmBanner />
</section>

      {/* Bottom Section */}

<section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 items-stretch">

  <GovernmentSchemes />

  <RecentActivity />

  <QuickAccess />

</section>

      {/* Footer */}
      <section className="mt-6">
        <Footer />
      </section>

    </DashboardLayout>
  );
}