"use client";

import { API_URL, apiFetch } from "@/lib/api";

import { useEffect, useState } from "react";
import {
  CloudSun,
  TrendingUp,
  MessageSquare,
  Landmark,
} from "lucide-react";

import StatCard from "./StatsCards";
import { useTranslation } from "@/components/LanguageProvider";
import { loadCache, saveCache } from "@/lib/offlineCache";

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

interface CachedWeather {
  city: string;
  temperature: number;
  humidity: number;
  weather: string;
  wind_speed: number;
}

interface CachedMarketRecord {
  available?: boolean;
  commodity: string;
  modal_price: string;
}

interface CachedMarketData {
  records: CachedMarketRecord[];
}

export default function StatsSection({
  profile,
  loading,
  schemeCount,
  queryCount,
}: StatsSectionProps) {
  const { t, language } = useTranslation();

  const [weather, setWeather] = useState({
    temperature: "--",
    condition: "No weather available",
    location: "Location unavailable",
  });

  const [market, setMarket] = useState({
    price: "0",
    crop: "No market data available",
  });

  // =========================================================
  // WEATHER
  // =========================================================

  useEffect(() => {
    const weatherLocation = profile?.city || profile?.district;

    if (!weatherLocation) return;

    const weatherCacheKey = `weather_${weatherLocation
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")}`;

    const fetchWeather = async () => {
      setWeather({
        temperature: "--",
        condition: "Loading...",
        location: "Loading...",
      });

      try {
        const response = await apiFetch(
          `${API_URL}/weather?city=${encodeURIComponent(weatherLocation)}`,
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error("Weather API unavailable");
        }

        const data: CachedWeather = await response.json();

        const weatherData = {
          temperature: `${Math.round(Number(data.temperature))}°C`,
          condition: data.weather,
          location: `📍 ${weatherLocation}, ${profile.state}`,
        };

        setWeather(weatherData);

        // Save weather separately for this location
        saveCache(weatherCacheKey, data);
      } catch (err) {
        console.warn(
          "Weather backend unavailable. Trying cached weather data.",
          err
        );

        // ---------------------------------------------
        // OFFLINE WEATHER CACHE
        // ---------------------------------------------

        const cachedWeather = loadCache<CachedWeather>(
          weatherCacheKey
        );

        if (cachedWeather?.data) {
          const cached = cachedWeather.data;

          setWeather({
            temperature: `${Math.round(Number(cached.temperature))}°C`,
            condition: cached.weather,
            location: `📍 ${weatherLocation}, ${profile.state}`,
          });

          console.log(
            "[Dashboard Weather] Showing cached weather:",
            cachedWeather.timestamp
          );

          return;
        }

        setWeather({
          temperature: "--",
          condition: "Weather service is currently unavailable",
          location: `${weatherLocation}, ${profile.state}`,
        });
      }
    };

    fetchWeather();
  }, [
    profile?.city,
    profile?.district,
    profile?.state,
  ]);

  // =========================================================
  // MARKET
  // =========================================================

  useEffect(() => {
    if (
      !profile?.crop ||
      !profile?.state ||
      !profile?.district
    ) {
      return;
    }

    // IMPORTANT:
    // Market cache is unique for:
    // commodity + state + district

    const marketCacheKey = `market_${profile.crop.trim()}_${profile.state.trim()}_${profile.district.trim()}`
      .toLowerCase()
      .replace(/\s+/g, "_");

    const fetchMarket = async () => {
      setMarket({
        price: "0",
        crop: "Loading...",
      });

      try {
        const response = await apiFetch(
          `${API_URL}/market-price`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              commodity: profile.crop,
              state: profile.state,
              district: profile.district,
              language,
            }),
          }
        );

        if (!response.ok) {
          throw new Error("Market API unavailable");
        }

        const data: CachedMarketRecord =
          await response.json();

        if (data.available === false) {
          throw new Error(
            "No market data available"
          );
        }

        const marketData: CachedMarketData = {
          records: [data],
        };

        setMarket({
          price: data.modal_price,
          crop: data.commodity,
        });

        // Save THIS exact commodity/state/district
        // combination to its own cache.
        saveCache(
          marketCacheKey,
          marketData
        );

        console.log(
          "[Dashboard Market] Live market data saved:",
          marketCacheKey
        );
      } catch (err) {
        console.warn(
          "Market backend unavailable. Trying cached market data.",
          err
        );

        // ---------------------------------------------
        // OFFLINE MARKET CACHE
        // ---------------------------------------------

        const cachedMarket =
          loadCache<CachedMarketData>(
            marketCacheKey
          );

        if (
          cachedMarket?.data?.records?.length
        ) {
          const cached =
            cachedMarket.data.records[0];

          setMarket({
            price: cached.modal_price,
            crop: cached.commodity,
          });

          console.log(
            "[Dashboard Market] Showing cached market data:",
            marketCacheKey,
            cachedMarket.timestamp
          );

          return;
        }

        // No matching cache exists
        setMarket({
          price: "--",
          crop:
            "Market service is currently unavailable",
        });
      }
    };

    fetchMarket();
  }, [
    profile?.crop,
    profile?.state,
    profile?.district,
    language,
  ]);

  if (!profile) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title={t("Weather Today")}
          value="--"
          details={[
            t("No weather available"),
            t("Location unavailable"),
          ]}
          icon={<CloudSun size={16} />}
          color="bg-blue-500"
          linkText={t("View full forecast")}
          linkHref="/weather"
          linkColor="text-blue-600"
        />

        <StatCard
          title={t("Market Price (Today)")}
          value="--"
          valueSuffix="/ quintal"
          details={[t("No market data available")]}
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
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
        value={
          market.price === "--"
            ? "--"
            : `₹${market.price}`
        }
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