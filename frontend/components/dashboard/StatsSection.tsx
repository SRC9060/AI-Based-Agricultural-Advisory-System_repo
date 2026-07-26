"use client";

import { useEffect, useState } from "react";
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
  queryCount: number;
}

export default function StatsSection({
  profile,
  loading,
  schemeCount,
  queryCount,
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

  const [savedQueryCount, setSavedQueryCount] = useState(queryCount);

  useEffect(() => {
    setSavedQueryCount(queryCount);
  }, [queryCount]);

  useEffect(() => {
    const userId = localStorage.getItem("user_id");
    if (!userId) return;

    fetch(`http://127.0.0.1:8000/chat/activity/${userId}?limit=1`)
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => setSavedQueryCount(data.count || 0))
      .catch(() => {
        // Retain the dashboard value if the activity service is temporarily unavailable.
      });
  }, []);

  // ---------------- WEATHER ----------------

  useEffect(() => {

    const weatherLocation = profile?.city || profile?.district;
    if (!weatherLocation) return;

    const fetchWeather = async () => {

      setWeather({
        temperature: "--",
        condition: "Loading...",
        location: "Loading...",
      });

      try {

        const response = await fetch(
          `http://127.0.0.1:8000/weather?city=${encodeURIComponent(weatherLocation)}`
        );

        if (!response.ok) {
          setWeather({
            temperature: "--",
            condition: "Weather unavailable",
            location: `${weatherLocation}, ${profile.state}`,
          });
          return;
        }

        const data = await response.json();

        setWeather({
          temperature: `${Math.round(data.temperature)}°C`,
          condition: data.description,
          location: `📍 ${weatherLocation}, ${profile.state}`,
        });

      } catch (err) {

        console.error(err);
        setWeather({
          temperature: "--",
          condition: "Weather service is currently unavailable",
          location: `${weatherLocation}, ${profile.state}`,
        });

      }

    };

    fetchWeather();

  }, [profile?.city, profile?.district, profile?.state]);

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

        if (!response.ok) {
          setMarket({
            price: "--",
            crop: `No market data available for ${profile.crop} in ${profile.district} today`,
          });
          return;
        }

        const data = await response.json();

        setMarket({
          price: data.modal_price,
          crop: data.commodity,
        });

      } catch (err) {

        console.error(err);
        setMarket({
          price: "--",
          crop: "Market service is currently unavailable",
        });

      }

    };

    fetchMarket();

  }, [profile?.crop, profile?.state, profile?.district]);

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
        value={savedQueryCount.toString()}
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
