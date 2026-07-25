"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useTranslation } from "@/components/LanguageProvider";
import MarketSearch from "@/components/market/MarketSearch";
import MarketResult from "@/components/market/MarketResult";

interface MarketRecord { state: string; district: string; market: string; commodity: string; variety: string; grade: string; arrival_date: string; min_price: string; max_price: string; modal_price: string; }
interface MarketData { records: MarketRecord[]; total?: number; count?: number; }

export default function MarketPricesPage() {
  const { t } = useTranslation();
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [marketOptions, setMarketOptions] = useState<Record<string, Record<string, string[]>>>({});

  useEffect(() => {
    fetch("http://127.0.0.1:8000/market-options").then((response) => response.ok ? response.json() : Promise.reject()).then(setMarketOptions).catch(() => setError(t("Unable to load market options.")));
  }, [t]);

  const searchMarket = async (commodity: string, state: string, district: string) => {
    try {
      setLoading(true); setError(""); setMarketData(null);
      const response = await fetch("http://127.0.0.1:8000/market-price", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ commodity, state, district }) });
      if (!response.ok) { const data = await response.json(); setError(data.detail ?? t("No market data found for this selection.")); return; }
      setMarketData({ records: [await response.json()] });
    } catch { setError(t("Unable to fetch market prices.")); } finally { setLoading(false); }
  };

  return <DashboardLayout><div className="mt-6"><h1 className="text-3xl font-bold text-green-800">{t("Market Prices")}</h1><p className="mt-2 text-gray-600">{t("Search today's mandi prices.")}</p></div><div className="mt-8"><MarketSearch onSearch={searchMarket} loading={loading} marketOptions={marketOptions}/></div><div className="mt-8"><MarketResult data={marketData} loading={loading} error={error}/></div></DashboardLayout>;
}
