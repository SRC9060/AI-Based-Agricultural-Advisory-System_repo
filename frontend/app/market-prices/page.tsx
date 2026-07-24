"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";

import MarketSearch from "@/components/market/MarketSearch";
import MarketResult from "@/components/market/MarketResult";

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

export default function MarketPricesPage() {
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // NEW FORMAT:
  // Commodity -> State -> Districts
  const [marketOptions, setMarketOptions] = useState<
    Record<string, Record<string, string[]>>
  >({});

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const response = await fetch(
          "http://127.0.0.1:8000/market-options"
        );

        if (!response.ok) {
          throw new Error("Failed to fetch market options");
        }

        const data = await response.json();

        console.log("Market Options:", data);

        setMarketOptions(data);
      } catch (err) {
        console.error("Error fetching market options:", err);
        setError("Unable to load market options.");
      }
    };

    fetchOptions();
  }, []);

  const searchMarket = async (
    commodity: string,
    state: string,
    district: string
  ) => {
    try {
      setLoading(true);
      setError("");
      setMarketData(null);

      const response = await fetch(
        "http://127.0.0.1:8000/market-price",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            commodity,
            state,
            district,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();

        setError(
          errorData.detail ??
            "No market data found for this selection."
        );

        return;
      }

      const data = await response.json();

      /*
       Backend returns ONE record.
       MarketResult expects { records: [...] }
      */

      setMarketData({
        records: [data],
      });
    } catch (err) {
      console.error(err);
      setError("Unable to fetch market prices.");
    } finally {
      setLoading(false);
    }
  };

 return (
  <DashboardLayout>

        <div className="mt-6">
          <h1 className="text-3xl font-bold text-green-800">
            📈 Market Prices
          </h1>

          <p className="text-gray-600 mt-2">
            Search today&apos;s mandi prices.
          </p>
        </div>

        <div className="mt-8">
          <MarketSearch
            onSearch={searchMarket}
            loading={loading}
            marketOptions={marketOptions}
          />
        </div>

        <div className="mt-8">
          <MarketResult
            data={marketData}
            loading={loading}
            error={error}
          />
        </div>
      </DashboardLayout>
  );
}