import React from "react";
import {
  IndianRupee,
  MapPin,
  Store,
  Package,
  CalendarDays,
  TrendingUp,
  ArrowDown,
  ArrowUp,
  Search,
} from "lucide-react";

interface MarketRecord {
  state: string;
  district: string;
  market: string;
  commodity: string;
  variety: string;
  grade: string;
  arrival_date: string;
  min_price: string;
  max_price: string;
  modal_price: string;
}

interface MarketData {
  records: MarketRecord[];
  total?: number;
  count?: number;
}

interface MarketResultProps {
  data: MarketData | null;
  loading: boolean;
  error: string;
}

const formatPrice = (price: string | number) =>
  `₹ ${Number(price).toLocaleString("en-IN")}`;

export default function MarketResult({
  data,
  loading,
  error,
}: MarketResultProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-3xl shadow-lg border border-gray-200 p-10 text-center">
        <TrendingUp className="mx-auto h-14 w-14 text-green-600 animate-pulse" />

        <h2 className="mt-5 text-2xl font-bold text-gray-800">
          Fetching Latest Market Prices...
        </h2>

        <p className="mt-2 text-gray-500">
          Please wait while we retrieve Today&apos; market prices.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-300 bg-red-50 p-5">
        <h3 className="font-semibold text-red-700">{error}</h3>
      </div>
    );
  }

  if (!data || !data.records || data.records.length === 0) {
    return (
      <div className="bg-white rounded-3xl shadow-lg border border-gray-200 p-12 text-center">
        <Search className="mx-auto h-12 w-12 text-green-600" />

        <h2 className="mt-4 text-2xl font-bold text-gray-800">
          Search Market Prices
        </h2>

        <p className="mt-2 text-gray-500">
          Select Commodity, State and District to view Today&apos; market prices.
        </p>
      </div>
    );
  }

  const market = data.records[0];

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-8">

      <div className="flex items-center gap-3 mb-8">
        <TrendingUp className="h-8 w-8 text-green-700" />

        <div>
          <h2 className="text-3xl font-bold text-green-800">
            Today&apos; Market Details
          </h2>

          <p className="text-gray-500">
            Live AGMARKNET Market Information
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        <InfoCard
          icon={<Package className="h-5 w-5 text-green-600" />}
          title="Commodity"
          value={market.commodity}
        />

        <InfoCard
          icon={<Store className="h-5 w-5 text-blue-600" />}
          title="Market"
          value={market.market}
        />

        <InfoCard
          icon={<MapPin className="h-5 w-5 text-red-500" />}
          title="Location"
          value={`${market.district}, ${market.state}`}
        />

        <PriceCard
          icon={<IndianRupee className="h-6 w-6" />}
          title="Modal Price"
          value={formatPrice(market.modal_price)}
          color="green"
        />

        <PriceCard
          icon={<ArrowDown className="h-6 w-6" />}
          title="Minimum Price"
          value={formatPrice(market.min_price)}
          color="orange"
        />

        <PriceCard
          icon={<ArrowUp className="h-6 w-6" />}
          title="Maximum Price"
          value={formatPrice(market.max_price)}
          color="blue"
        />

      </div>

      <div className="mt-8 bg-gray-50 border border-gray-200 rounded-2xl p-5 flex items-center gap-4">

        <CalendarDays className="h-7 w-7 text-gray-600" />

        <div>
          <p className="text-sm text-gray-500">Arrival Date</p>

          <p className="text-lg font-semibold">
            {market.arrival_date}
          </p>
        </div>

      </div>

    </div>
  );
}

function InfoCard({
  icon,
  title,
  value,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
}) {
  return (
    <div className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-lg transition-all">
      <div className="flex items-center gap-2 text-gray-500">
        {icon}
        <span className="font-medium">{title}</span>
      </div>

      <p className="mt-4 text-xl font-bold text-gray-800 wrap-break-word">
        {value}
      </p>
    </div>
  );
}

interface PriceCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  color: "green" | "orange" | "blue";
}

function PriceCard({
  icon,
  title,
  value,
  color,
}: PriceCardProps) {
  const colorClasses = {
    green: "bg-green-50 border-green-200 text-green-700",
    orange: "bg-orange-50 border-orange-200 text-orange-700",
    blue: "bg-blue-50 border-blue-200 text-blue-700",
  };

  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm hover:shadow-lg transition-all ${colorClasses[color]}`}
    >
      <div className="flex items-center gap-2">
        <div className="rounded-full bg-white p-2 shadow-sm">
          {icon}
        </div>

        <span className="font-semibold">{title}</span>
      </div>

      <p className="mt-5 text-3xl font-extrabold">
        {value}
      </p>
    </div>
  );
}