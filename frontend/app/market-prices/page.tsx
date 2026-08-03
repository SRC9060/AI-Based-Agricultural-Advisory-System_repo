"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useTranslation } from "@/components/LanguageProvider";
import MarketResult from "@/components/market/MarketResult";
import MarketSearch from "@/components/market/MarketSearch";
import { API_URL } from "@/lib/api";
import { loadCache, saveCache } from "@/lib/offlineCache";
import { useRequireSession } from "@/lib/session";

interface MarketRecord {
  available?: boolean;
  message?: string;
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

export default function MarketPricesPage() {
  const { t } = useTranslation();
  const { checkingSession } = useRequireSession();
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [marketOptions, setMarketOptions] = useState<
    Record<string, Record<string, string[]>>
  >({});

  useEffect(() => {
    fetch(`${API_URL}/market-options`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then(setMarketOptions)
      .catch(() => setError(t("Unable to load market options.")));
  }, [t]);

  const searchMarket = async (
    commodity: string,
    state: string,
    district: string
  ) => {
    const cacheKey = `market_${commodity.trim()}_${state.trim()}_${district.trim()}`
      .toLowerCase()
      .replace(/\s+/g, "_");

    const loadCachedMarketData = () => {
      const cached = loadCache<MarketData>(cacheKey);

      if (!cached) {
        setError("No cached market prices available.");
        return false;
      }

      setMarketData(cached.data);
      setError("");
      return true;
    };

    setMarketData(null);

    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/market-price`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commodity, state, district }),
      });

      if (!response.ok) {
        const data: { detail?: string } = await response.json();
        const message = data.detail ?? t("No market data found for this selection.");
        setError(message);
        return;
      }

      const result: MarketRecord = await response.json();

      if (result.available === false) {
        const message = result.message ?? t("No market data found for this selection.");
        setError(message);
        return;
      }

      const marketResult: MarketData = { records: [result] };

      setMarketData(marketResult);

      if (
        result.available === true &&
        result.market !== null &&
        result.modal_price !== null &&
        result.min_price !== null &&
        result.max_price !== null
      ) {
        saveCache(cacheKey, marketResult);
      }
    } catch {
      loadCachedMarketData();
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) return null;

  return (
    <DashboardLayout>
      <div className="mt-6">
        <h1 className="text-3xl font-bold text-green-800">
          {t("Market Prices")}
        </h1>
        <p className="mt-2 text-gray-600">{t("Search today's mandi prices.")}</p>
      </div>
      <div className="mt-8">
        <MarketSearch
          onSearch={searchMarket}
          loading={loading}
          marketOptions={marketOptions}
        />
      </div>
      <div className="mt-8">
        <MarketResult data={marketData} loading={loading} error={error} />
      </div>
    </DashboardLayout>
  );
}
