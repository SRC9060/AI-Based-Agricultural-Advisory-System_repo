import {
  CloudSun,
  TrendingUp,
  Sprout,
  FileText,
  Landmark,
} from "lucide-react";

import StatCard from "./StatsCards";

export default function StatsSection() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-5">

      <StatCard
        title="Weather"
        value="28°C"
        subtitle="Partly Cloudy"
        icon={<CloudSun size={28} />}
        color="bg-blue-500"
      />

      <StatCard
        title="Market Price"
        value="₹2183"
        subtitle="Paddy / Quintal"
        icon={<TrendingUp size={28} />}
        color="bg-green-500"
      />

      <StatCard
        title="Soil Health"
        value="Good"
        subtitle="Nitrogen Optimal"
        icon={<Sprout size={28} />}
        color="bg-emerald-600"
      />

      <StatCard
        title="My Queries"
        value="12"
        subtitle="Answered Today"
        icon={<FileText size={28} />}
        color="bg-orange-500"
      />

      <StatCard
        title="Schemes"
        value="5"
        subtitle="Eligible"
        icon={<Landmark size={28} />}
        color="bg-purple-500"
      />

    </div>
  );
}