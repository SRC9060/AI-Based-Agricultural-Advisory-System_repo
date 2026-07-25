"use client";

import { useEffect, useState } from "react";
import {
  CloudSun,
  TrendingUp,
  MessageSquare,
  Landmark,
} from "lucide-react";

import StatCard from "./StatsCards";

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

  const [weather, setWeather] = useState({
    temperature: "--",
    condition: "No weather available",
    location: "Location unavailable",
  });

  const [market, setMarket] = useState({
    price: "0",
    crop: "No market data available",
  });

  const [queryCount] = useState(0);

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

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

      <StatCard
        title="Weather Today"
        value={loading ? "--" : weather.temperature}
        details={[
          weather.condition,
          weather.location,
        ]}
        icon={<CloudSun size={16} />}
        color="bg-blue-500"
        linkText="View full forecast"
        linkHref="/weather"
        linkColor="text-blue-600"
      />

      <StatCard
        title="Market Price (Today)"
        value={`₹${market.price}`}
        valueSuffix="/ quintal"
        details={[market.crop]}
        icon={<TrendingUp size={16} />}
        color="bg-green-500"
        linkText="View all prices"
        linkHref="/market-prices"
        linkColor="text-green-600"
      />

      <StatCard
        title="My Queries"
        value={queryCount.toString()}
        details={["Total Queries"]}
        icon={<MessageSquare size={16} />}
        color="bg-orange-500"
        linkText="View all queries"
        linkHref="/queries"
        linkColor="text-purple-600"
      />

      <StatCard
        title="Schemes for You"
        value={schemeCount.toString()}
        details={["Matching Schemes"]}
        icon={<Landmark size={16} />}
        color="bg-purple-500"
        linkText="View schemes"
        linkHref="/schemes"
        linkColor="text-green-600"
      />

    </div>
  );
}