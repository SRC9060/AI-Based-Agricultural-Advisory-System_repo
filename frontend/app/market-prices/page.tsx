"use client";

import { API_URL, apiFetch } from "@/lib/api";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useTranslation } from "@/components/LanguageProvider";
import MarketSearch from "@/components/market/MarketSearch";
import MarketResult from "@/components/market/MarketResult";
import { translateTexts } from "@/lib/translation";

interface MarketRecord { available?: boolean; state: string; district: string; market: string; commodity: string; variety: string; grade: string; arrival_date: string; min_price: string; max_price: string; modal_price: string; localized?: Partial<Record<"state" | "district" | "market" | "commodity" | "variety" | "grade", string>>; }
interface MarketData { records: MarketRecord[]; total?: number; count?: number; }
interface MarketOptionsResponse {
  live?: boolean;
  options?: Record<string, Record<string, string[]>>;
  message?: string | null;
}

export default function MarketPricesPage() {
  const { language, t } = useTranslation();
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [marketOptions, setMarketOptions] = useState<Record<string, Record<string, string[]>>>({});
  const [marketNotice, setMarketNotice] = useState("");

  useEffect(() => {
    apiFetch(`${API_URL}/market-options`)
      .then((response) => response.ok ? response.json() : Promise.reject())
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

  const searchMarket = async (commodity: string, state: string, district: string) => {
    try {
      setLoading(true); setError(""); setMarketData(null);
      const response = await apiFetch(`${API_URL}/market-price`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ commodity, state, district, language }) });
      if (!response.ok) { const data = await response.json(); setError(data.detail ?? t("No market data found for this selection.")); return; }
      const record: MarketRecord = await response.json();
      if (!record.available) {
        setError(t("No market data found for this selection."));
        return;
      }
      const localizedKeys = ["commodity", "market", "district", "state"] as const;
      const localizedValues = await translateTexts(
        localizedKeys.map((key) => record[key]),
        language,
      );
      record.localized = Object.fromEntries(
        localizedKeys.map((key, index) => [key, localizedValues[index] || record[key]]),
      );
      setMarketData({ records: [record] });
    } catch { setError(t("Unable to fetch market prices.")); } finally { setLoading(false); }
  };

  return <DashboardLayout><div className="mt-6"><h1 className="text-3xl font-bold text-green-800">{t("Market Prices")}</h1><p className="mt-2 text-gray-600">{t("Search today's mandi prices.")}</p></div>{marketNotice && <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-800">{marketNotice}</div>}<div className="mt-8"><MarketSearch onSearch={searchMarket} loading={loading} marketOptions={marketOptions}/></div><div className="mt-8"><MarketResult data={marketData} loading={loading} error={error}/></div></DashboardLayout>;
}
