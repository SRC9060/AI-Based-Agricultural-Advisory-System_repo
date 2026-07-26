"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CloudSun,
  TrendingUp,
  MessageSquare,
  Landmark,
} from "lucide-react";

import StatCard from "./StatsCards";
import { useTranslation } from "@/components/LanguageProvider";

interface Profile {
  city: string;
  state: string;
  district: string;
  crop: string;
}

interface StatsSectionProps {
  profile: Profile | null;
  loading: boolean;
  schemeCount: number;
}

export default function StatsSection({
  profile,
  loading,
  schemeCount,
}: StatsSectionProps) {
  const { t } = useTranslation();

  const [weather, setWeather] = useState({
    temperature: "--",
    condition: "No weather available",
    location: "Location unavailable",
  });

  const [market, setMarket] = useState({
    price: "0",
    crop: "No market data available",
  });

  const [queryCount, setQueryCount] = useState(0);

  // ---------------- WEATHER ----------------

  useEffect(() => {

    if (!profile?.city) return;

    const fetchWeather = async () => {

      setWeather({
        temperature: "--",
        condition: "Loading...",
        location: "Loading...",
      });

      try {

        const response = await fetch(
          `http://127.0.0.1:8000/weather?city=${encodeURIComponent(profile.city)}`
        );

        if (!response.ok) return;

        const data = await response.json();

        setWeather({
          temperature: `${Math.round(data.temperature)}°C`,
          condition: data.description,
          location: `📍 ${profile.city}, ${profile.state}`,
        });

      } catch (err) {

        console.error(err);

      }

    };

    fetchWeather();

  }, [profile?.city, profile?.state]);

  // ---------------- MARKET ----------------

  useEffect(() => {

    if (
      !profile?.crop ||
      !profile?.state ||
      !profile?.district
    ) {
      return;
    }

    const fetchMarket = async () => {

      setMarket({
        price: "0",
        crop: "Loading...",
      });

      try {

        const response = await fetch(
          "http://127.0.0.1:8000/market-price",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              commodity: profile.crop,
              state: profile.state,
              district: profile.district,
            }),
          }
        );

        if (!response.ok) return;

        const data = await response.json();

        setMarket({
          price: data.modal_price,
          crop: data.commodity,
        });

      } catch (err) {

        console.error(err);

      }

    };

    fetchMarket();

  }, [profile?.crop, profile?.state, profile?.district]);

  // ---------------- QUERY COUNT ----------------

const fetchQueryCount = useCallback(async () => {
  const userId = localStorage.getItem("user_id");

  if (!userId) return;

  try {
    const response = await fetch(
      `http://127.0.0.1:8000/recent-activity/${userId}`,
      {
        cache: "no-store",
      }
    );

    if (!response.ok) return;

    const data = await response.json();

    setQueryCount(data.count || 0);

  } catch (err) {
    console.error(err);
  }
}, []);

useEffect(() => {

  fetchQueryCount();

  const interval = setInterval(fetchQueryCount, 30000);

  const handleVisibility = () => {
    if (!document.hidden) {
      fetchQueryCount();
    }
  };

  document.addEventListener("visibilitychange", handleVisibility);

  return () => {
    clearInterval(interval);
    document.removeEventListener(
      "visibilitychange",
      handleVisibility
    );
  };

}, [fetchQueryCount]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

      <StatCard
        title={t("Weather Today")}
        value={loading ? "--" : weather.temperature}
        details={[
          t(weather.condition),
          t(weather.location),
        ]}
        icon={<CloudSun size={16} />}
        color="bg-blue-500"
        linkText={t("View full forecast")}
        linkHref="/weather"
        linkColor="text-blue-600"
      />

      <StatCard
        title={t("Market Price (Today)")}
        value={`₹${market.price}`}
        valueSuffix="/ quintal"
        details={[t(market.crop)]}
        icon={<TrendingUp size={16} />}
        color="bg-green-500"
        linkText={t("View all prices")}
        linkHref="/market-prices"
        linkColor="text-green-600"
      />

      <StatCard
        title={t("My Queries")}
        value={queryCount.toString()}
        details={[t("Total Queries")]}
        icon={<MessageSquare size={16} />}
        color="bg-orange-500"
        linkText={t("View all queries")}
        linkHref="/queries"
        linkColor="text-purple-600"
      />

      <StatCard
        title={t("Schemes for You")}
        value={schemeCount.toString()}
        details={[t("Matching Schemes")]}
        icon={<Landmark size={16} />}
        color="bg-purple-500"
        linkText={t("View schemes")}
        linkHref="/schemes"
        linkColor="text-green-600"
      />

    </div>
  );
}