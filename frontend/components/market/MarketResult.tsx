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
import { useTranslation } from "@/components/LanguageProvider";
import { getLanguageLocale } from "@/lib/languages";
import { getLocalizedMarketLabel } from "@/lib/marketLocalization";

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
  localized?: Partial<
    Record<
      "state" | "district" | "market" | "commodity" | "variety" | "grade",
      string
    >
  >;
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

const formatPrice = (price: string | number, locale: string) =>
  `₹ ${Number(price).toLocaleString(locale)}`;

export default function MarketResult({
  data,
  loading,
  error,
}: MarketResultProps) {
  const { language, t } = useTranslation();
  const locale = getLanguageLocale(language);

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-10 text-center">
        <TrendingUp className="mx-auto h-14 w-14 text-emerald-600 dark:text-emerald-400 animate-pulse" />

        <h2 className="mt-5 text-2xl font-bold font-heading text-slate-900 dark:text-slate-100">
          {t("Fetching Latest Market Prices...")}
        </h2>

        <p className="mt-2 text-slate-500 dark:text-slate-400 font-body">
          {t("Please wait while we retrieve today's market prices.")}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 p-5 font-body">
        <h3 className="font-semibold text-red-700 dark:text-red-400">{error}</h3>
      </div>
    );
  }

  if (!data || !data.records || data.records.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-12 text-center">
        <Search className="mx-auto h-12 w-12 text-emerald-600 dark:text-emerald-400" />

        <h2 className="mt-4 text-2xl font-bold font-heading text-slate-900 dark:text-slate-100">
          {t("Search Market Prices")}
        </h2>

        <p className="mt-2 text-slate-500 dark:text-slate-400 font-body">
          {t("Select Commodity, State and District to view today's market prices.")}
        </p>
      </div>
    );
  }

  const market = data.records[0];

  const localizeValue = (value: string) => getLocalizedMarketLabel(value, language);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-8">

      <div className="flex items-center gap-3 mb-8">
        <TrendingUp className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />

        <div>
          <h2 className="text-3xl font-bold font-heading text-slate-900 dark:text-slate-100">
            {t("Today's Market Details")}
          </h2>

          <p className="text-slate-500 dark:text-slate-400 font-body">
            {t("Live AGMARKNET Market Information")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-body">

        <InfoCard
          icon={<Package className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
          title={t("Commodity")}
          value={market.localized?.commodity || localizeValue(market.commodity)}
        />

        <InfoCard
          icon={<Store className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
          title={t("Market")}
          value={market.localized?.market || localizeValue(market.market)}
        />

        <InfoCard
          icon={<MapPin className="h-5 w-5 text-red-500 dark:text-red-400" />}
          title={t("Location")}
          value={`${market.localized?.district || localizeValue(market.district)}, ${market.localized?.state || localizeValue(market.state)}`}
        />

        <PriceCard
          icon={<IndianRupee className="h-6 w-6" />}
          title={t("Modal Price")}
          value={formatPrice(market.modal_price, locale)}
          color="green"
        />

        <PriceCard
          icon={<ArrowDown className="h-6 w-6" />}
          title={t("Minimum Price")}
          value={formatPrice(market.min_price, locale)}
          color="orange"
        />

        <PriceCard
          icon={<ArrowUp className="h-6 w-6" />}
          title={t("Maximum Price")}
          value={formatPrice(market.max_price, locale)}
          color="blue"
        />

      </div>

      <div className="mt-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 flex items-center gap-4 font-body">

        <CalendarDays className="h-7 w-7 text-slate-600 dark:text-slate-300" />

        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t("Arrival Date")}</p>

          <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
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
    <div className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 p-5 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
        {icon}
        <span className="font-medium">{title}</span>
      </div>

      <p className="mt-4 text-xl font-bold font-heading text-slate-900 dark:text-slate-100 wrap-break-word">
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
    green: "bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400",
    orange: "bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400",
    blue: "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400",
  };

  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm hover:shadow-lg transition-all ${colorClasses[color]}`}
    >
      <div className="flex items-center gap-2">
        <div className="rounded-full bg-white dark:bg-slate-900 p-2 shadow-sm">
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
