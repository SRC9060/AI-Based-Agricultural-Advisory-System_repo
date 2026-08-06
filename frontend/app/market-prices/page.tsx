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
    "state" |
    "district" |
    "market" |
    "commodity" |
    "variety" |
    "grade",
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
  const [marketOptions, setMarketOptions] = useState<
  Record<string, Record<string, string[]>>
>({});
  const [marketNotice, setMarketNotice] = useState("");

  useEffect(() => {
    apiFetch(`${API_URL}/market-options`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((payload: MarketOptionsResponse | Record<string, Record<string, string[]>>) => {
        const structuredPayload = payload as MarketOptionsResponse;
        if (
          typeof structuredPayload.live === "boolean" &&
          structuredPayload.options
        ) {
          setMarketOptions(structuredPayload.options);
          setMarketNotice(structuredPayload.live === false ? t(
            "Live AGMARKNET is temporarily unavailable. Showing common Karnataka selections; live prices will appear only after the service reconnects."
          ) : "");
          return;
        }
        setMarketOptions(payload as Record<string, Record<string, string[]>>);
        setMarketNotice("");
      })
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

      const response = await apiFetch(`${API_URL}/market-price`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commodity, state, district, language }),
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
        <h1 className="text-3xl font-bold text-green-800 dark:text-emerald-400">
          {t("Market Prices")}
        </h1>
        <p className="mt-2 text-gray-600 dark:text-slate-400">{t("Search today's mandi prices.")}</p>
      </div>
      {marketNotice && (
        <div className="mt-5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-amber-800 dark:text-amber-300">
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