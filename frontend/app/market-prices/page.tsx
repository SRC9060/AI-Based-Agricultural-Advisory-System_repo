"use client";

import { API_URL, apiFetch } from "@/lib/api";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useTranslation } from "@/components/LanguageProvider";
import MarketResult from "@/components/market/MarketResult";
import MarketSearch from "@/components/market/MarketSearch";

import { translateTexts } from "@/lib/translation";
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

interface MarketOptionsResponse {
  live?: boolean;
  options?: Record<string, Record<string, string[]>>;
  message?: string | null;
}

export default function MarketPricesPage() {
  const { language, t } = useTranslation();
  const { checkingSession } = useRequireSession();
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [marketOptions, setMarketOptions] = useState<Record<string, Record<string, string[]>>>({});
  const [marketNotice, setMarketNotice] = useState("");
  const [showCachedData, setShowCachedData] = useState(false);
  const [marketCacheTimestamp, setMarketCacheTimestamp] = useState<string | null>(null);

useEffect(() => {
  const cacheKey = "market_options";

  const loadCachedMarketOptions = () => {
    const cached = loadCache<Record<string, Record<string, string[]>>>(cacheKey);

    if (!cached) {
      setError(t("Unable to load market options."));
      return false;
    }

    setMarketOptions(cached.data);
    setMarketNotice("");
    setShowCachedData(true);
    setMarketCacheTimestamp(cached.timestamp);
    setError("");

    return true;
  };

  const loadMarketOptions = async () => {
    try {
      const response = await apiFetch(`${API_URL}/market-options`);

      if (!response.ok) {
        throw new Error("Market options request failed");
      }

      const payload: MarketOptionsResponse | Record<string, Record<string, string[]>> = await response.json();

      const structuredPayload = payload as MarketOptionsResponse;

      if (
        typeof structuredPayload.live === "boolean" &&
        structuredPayload.options
      ) {
        setMarketOptions(structuredPayload.options);

        setMarketNotice(
          structuredPayload.live === false
            ? t(
                "Live AGMARKNET is temporarily unavailable. Showing common Karnataka selections; live prices will appear only after the service reconnects."
              )
            : ""
        );

        saveCache(cacheKey, structuredPayload.options);

        // Fresh data is available.
        setShowCachedData(false);
        setMarketCacheTimestamp(null);
        setError("");

        return;
      }

      const options =
        payload as Record<string, Record<string, string[]>>;

      setMarketOptions(options);
      setMarketNotice("");

      // Save fresh options for offline use.
      saveCache(cacheKey, options);

      setShowCachedData(false);
      setMarketCacheTimestamp(null);
      setError("");
    } catch (error) {
      console.error("Market options unavailable:", error);

      // Backend unavailable → use cached options.
      loadCachedMarketOptions();
    }
  };

  loadMarketOptions();
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
        setError(t("No cached market prices available."));
        return false;
      }

      setMarketData(cached.data);
      setShowCachedData(true);
      setMarketCacheTimestamp(cached.timestamp);
      setMarketNotice("");
      setError("");

      return true;
    };

    setMarketData(null);

    try {
      setLoading(true);
      setError("");

      const response = await apiFetch(`${API_URL}/market-price`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commodity, state, district, language }),
      });

      if (!response.ok) {
  throw new Error("Market price request failed");
}

      const result: MarketRecord = await response.json();

      if (result.available === false) {
        const message = result.message ?? t("No market data found for this selection.");
        setError(message);
        return;
      }

      const localizedKeys = [
        "commodity",
        "market",
        "district",
        "state",
      ] as const;

      const localizedValues = await translateTexts(
        localizedKeys.map((key) => result[key]),
        language
      );

      result.localized = Object.fromEntries(
        localizedKeys.map((key, index) => [
          key,
          localizedValues[index] || result[key],
        ])
      );

      const marketResult = {
        records: [result],
      };

      setMarketData(marketResult);

      setShowCachedData(false);
      setMarketCacheTimestamp(null);
      setMarketNotice("");

      if (
        result.available === true &&
        result.market !== null &&
        result.modal_price !== null &&
        result.min_price !== null &&
        result.max_price !== null
      ) {
        saveCache(cacheKey, marketResult);
      }
    } catch (error) {
      console.error(error);
      loadCachedMarketData();
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) return null;

  return (
    <DashboardLayout>
      <div className="mt-6">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 font-heading">
          {t("Market Prices")}
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400 font-body">{t("Search today's mandi prices.")}</p>
      </div>
      {showCachedData && (
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-600">
          <div className="flex items-center gap-2 text-lg">
            <span>⚠️</span>
            <span>📡</span>
          </div>

          <div>
            <p className="text-sm font-medium">
              Offline Mode
            </p>

            <p className="mt-1 text-xs text-red-600">
              Showing cached market data
              {marketCacheTimestamp
                ? ` • Last updated: ${new Date(
                    marketCacheTimestamp
                  ).toLocaleString()}`
                : ""}
            </p>
          </div>
        </div>
      )}
      {marketNotice && !showCachedData && (
        <div className="mt-5 rounded-xl border border-orange-500/40 bg-orange-500/10 px-4 py-3 text-sm text-orange-400">
          {marketNotice}
        </div>
      )}
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