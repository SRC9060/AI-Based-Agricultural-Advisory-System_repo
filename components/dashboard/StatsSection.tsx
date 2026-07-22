import {
  CloudSun,
  TrendingUp,
  Sprout,
  MessageSquare,
  Landmark,
} from "lucide-react";

import StatCard from "./StatsCards";

export default function StatsSection() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-6">

      <StatCard
        title="Weather Today"
        value="28°C"
        details={["Partly Cloudy", "📍 Hyderabad, Telangana"]}
        icon={<CloudSun size={16} />}
        color="bg-blue-500"
        linkText="View full forecast"
        linkHref="/weather"
        linkColor="text-blue-600"
      />

      <StatCard
        title="Market Price (Today)"
        value="₹2,183"
        valueSuffix="/ quintal"
        details={["Paddy (Rice)"]}
        icon={<TrendingUp size={16} />}
        color="bg-green-500"
        linkText="View all prices"
        linkHref="/market-prices"
        linkColor="text-green-600"
      />

      <StatCard
        title="Soil Health"
        value="Good"
        details={["pH: 6.8 | N: Medium", "P: High | K: Medium"]}
        icon={<Sprout size={16} />}
        color="bg-emerald-600"
        linkText="View soil report"
        linkHref="/soil-crop"
        linkColor="text-emerald-600"
      />

      <StatCard
        title="My Queries"
        value="12"
        details={["Total Queries"]}
        icon={<MessageSquare size={16} />}
        color="bg-orange-500"
        linkText="View all queries"
        linkHref="/queries"
        linkColor="text-purple-600"
      />

      <StatCard
        title="Schemes for You"
        value="5"
        details={["Matching Schemes"]}
        icon={<Landmark size={16} />}
        color="bg-purple-500"
        linkText="View schemes"
        linkHref="/schemes"
        linkColor="text-green-600"
      />

    </div>
  );
}