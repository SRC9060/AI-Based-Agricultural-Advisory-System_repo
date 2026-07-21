import Sidebar from "@/components/dashboard/Sidebar";
import TopNavbar from "@/components/dashboard/TopNavbar";
import StatsSection from "@/components/dashboard/StatsSection";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-100 flex">

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 p-8">

        {/* Top Navbar */}
        <TopNavbar />

        {/* Stats Cards */}
        <div className="mt-8">
          <StatsSection />
        </div>

        {/* AI Assistant + Quick Access */}
        <div className="grid grid-cols-3 gap-6 mt-8">

          <div className="col-span-2 bg-white rounded-2xl shadow p-6">
            <h2 className="text-xl font-bold mb-4">
              🤖 AI Farming Assistant
            </h2>

            <p className="text-gray-600">
              Ask questions about crops, weather, fertilizers, diseases,
              government schemes and market prices.
            </p>

            import Link from "next/link";
          </div>

          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="font-bold text-xl mb-4">
              ⚡ Quick Access
            </h2>

            <div className="space-y-3">

             <Link
             href="/chat"
             className="block w-full text-center bg-green-50 rounded-xl py-3 hover:bg-green-100"
             >
             🌦 Weather
             </Link>

              <Link
               href="/market-prices"
                className="block w-full text-center bg-green-50 rounded-xl py-3 hover:bg-green-100"
                >
             📈 Market Prices
                </Link>

              <button className="w-full bg-green-50 rounded-xl py-3 hover:bg-green-100">
                🌱 Soil Health
              </button>

              <button className="w-full bg-green-50 rounded-xl py-3 hover:bg-green-100">
                🏛 Government Schemes
              </button>

            </div>
          </div>

        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-2 gap-6 mt-8">

          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-xl font-bold mb-4">
              🏛 Latest Government Schemes
            </h2>

            <ul className="space-y-3 text-gray-700">
              <li>• PM-KISAN</li>
              <li>• PMFBY Crop Insurance</li>
              <li>• Soil Health Card</li>
              <li>• Kisan Credit Card</li>
            </ul>
          </div>

          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-xl font-bold mb-4">
              🕒 Recent Activity
            </h2>

            <ul className="space-y-3 text-gray-700">
              <li>✅ Asked about Tomato Disease</li>
              <li>✅ Checked Paddy Prices</li>
              <li>✅ Viewed Weather Forecast</li>
              <li>✅ Applied for PM-KISAN</li>
            </ul>
          </div>

        </div>

      </main>

    </div>
  );
}