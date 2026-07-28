"use client";

import { API_URL } from "@/lib/api";

import { useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useTranslation } from "@/components/LanguageProvider";

type WeatherData = {
  city: string;
  temperature: number;
  humidity: number;
  weather: string;
  wind_speed: number;
};

type ForecastItem = {
  date: string;
  temperature: number;
  humidity: number;
  weather: string;
  wind_speed: number;
};

type ForecastData = {
  city: string;
  forecast: ForecastItem[];
};

export default function WeatherPage() {
  const { t } = useTranslation();
  const [city, setCity] = useState("");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ==========================================
  // FETCH CURRENT WEATHER + FORECAST
  // ==========================================

  async function fetchWeather() {
    if (!city.trim()) {
      setError("Please enter a city name.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setWeather(null);
      setForecast([]);

      const encodedCity = encodeURIComponent(city);

      // Call both backend APIs together
      const [weatherResponse, forecastResponse] = await Promise.all([
        fetch(`${API_URL}/weather?city=${encodedCity}`),
        fetch(`${API_URL}/weather/forecast?city=${encodedCity}`),
      ]);

      const weatherData = await weatherResponse.json();
      const forecastData: ForecastData = await forecastResponse.json();

      if (!weatherResponse.ok) {
        throw new Error(
          weatherData.detail || "Unable to fetch current weather."
        );
      }

      if (!forecastResponse.ok) {
        throw new Error(
          (forecastData as any).detail || "Unable to fetch weather forecast."
        );
      }

      setWeather(weatherData);
      setForecast(forecastData.forecast || []);
    } catch (err) {
      console.error(err);

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unable to connect to weather service.");
      }
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // WEATHER ICON
  // ==========================================

  function getWeatherIcon(condition: string) {
    const value = condition.toLowerCase();

    if (value.includes("rain")) return "🌧️";
    if (value.includes("thunder")) return "⛈️";
    if (value.includes("drizzle")) return "🌦️";
    if (value.includes("snow")) return "❄️";
    if (value.includes("clear")) return "☀️";
    if (value.includes("cloud")) return "☁️";
    if (value.includes("mist")) return "🌫️";
    if (value.includes("fog")) return "🌫️";
    if (value.includes("haze")) return "🌫️";

    return "🌤️";
  }

  // ==========================================
  // FORMAT DATE
  // ==========================================

  function formatDate(date: string, index: number) {
    const parsedDate = new Date(`${date}T12:00:00`);

    const formatted = parsedDate.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });

    if (index === 0) {
      return `Tomorrow • ${formatted}`;
    }

    return formatted;
  }

  // ==========================================
  // FARMING ADVISORY
  // ==========================================

  function getFarmingAdvisory() {
    if (!weather) return "";

    const tomorrow = forecast[0];

    if (tomorrow) {
      const condition = tomorrow.weather.toLowerCase();

      if (
        condition.includes("rain") ||
        condition.includes("drizzle") ||
        condition.includes("thunder")
      ) {
        return `Rain is expected in ${weather.city} during the upcoming forecast. Farmers may consider reducing irrigation and protecting harvested crops from moisture.`;
      }

      if (tomorrow.temperature >= 35) {
        return `High temperature is expected in ${weather.city}. Ensure crops receive sufficient irrigation and avoid unnecessary field operations during peak afternoon heat.`;
      }

      if (tomorrow.wind_speed >= 10) {
        return `Strong winds may occur in ${weather.city}. Check young plants and temporary agricultural structures and avoid spraying during strong winds.`;
      }
    }

    return `Weather conditions in ${weather.city} currently appear suitable for normal farming activities. Continue monitoring the forecast before irrigation, spraying or harvesting.`;
  }

  return (
  <DashboardLayout>

        {/* Header */}
        <div className="mt-6">
          <h1 className="text-3xl font-bold text-green-800">{t("Weather Advisory")}</h1>
          <h1 className="sr-only">
            🌦 Weather Advisory
          </h1>

          <p className="text-gray-600 mt-2">
            {t("Check current weather and upcoming forecast for your farming location.")}
          </p>
        </div>

        {/* Search Section */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mt-6">

          <h2 className="text-xl font-semibold text-green-800 mb-4">{t("Select Location")}</h2>

          <h2 className="sr-only">
            📍 Select Location
          </h2>

          <div className="flex flex-col sm:flex-row gap-3">

            <input
              type="text"
              placeholder={t("Enter city name (e.g. Chennai)")}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  fetchWeather();
                }
              }}
              className="flex-1 border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-green-600 text-gray-800"
            />

            <button
              onClick={fetchWeather}
              disabled={loading}
              className="bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white px-7 py-3 rounded-xl font-semibold transition"
            >
              {loading ? t("Checking...") : t("Check Weather")}
            </button>

          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
              ⚠️ {error}
            </div>
          )}

        </div>

        {/* Loading */}
        {loading && (
          <div className="mt-6 bg-white rounded-2xl p-8 text-center shadow-sm">
            <div className="text-4xl mb-3">🌦️</div>

            <p className="text-green-800 font-semibold">
              Fetching weather information...
            </p>
          </div>
        )}

        {/* Weather Results */}
        {weather && !loading && (
          <div className="mt-6">

            {/* City */}
            <div className="mb-5">

              <h2 className="text-2xl font-bold text-green-800">
                📍 {weather.city}
              </h2>

              <p className="text-gray-500 mt-1">
                Current weather conditions
              </p>

            </div>

            {/* Current Weather Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">

              {/* Temperature */}
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition">

                <div className="text-4xl mb-4">
                  🌡️
                </div>

                <p className="text-gray-500">
                  Temperature
                </p>

                <h3 className="text-3xl font-bold text-green-800 mt-2">
                  {weather.temperature}°C
                </h3>

              </div>

              {/* Humidity */}
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition">

                <div className="text-4xl mb-4">
                  💧
                </div>

                <p className="text-gray-500">
                  Humidity
                </p>

                <h3 className="text-3xl font-bold text-green-800 mt-2">
                  {weather.humidity}%
                </h3>

              </div>

              {/* Weather */}
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition">

                <div className="text-4xl mb-4">
                  {getWeatherIcon(weather.weather)}
                </div>

                <p className="text-gray-500">
                  Weather
                </p>

                <h3 className="text-xl font-bold text-green-800 mt-2 capitalize">
                  {weather.weather}
                </h3>

              </div>

              {/* Wind */}
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition">

                <div className="text-4xl mb-4">
                  💨
                </div>

                <p className="text-gray-500">
                  Wind Speed
                </p>

                <h3 className="text-3xl font-bold text-green-800 mt-2">
                  {weather.wind_speed}
                </h3>

                <p className="text-gray-500 text-sm mt-1">
                  m/s
                </p>

              </div>

            </div>

            {/* ==========================================
                UPCOMING FORECAST
            ========================================== */}

            {forecast.length > 0 && (
              <div className="mt-8">

                <div className="mb-5">

                  <h2 className="text-2xl font-bold text-green-800">
                    📅 Upcoming Forecast
                  </h2>

                  <p className="text-gray-500 mt-1">
                    Plan your farming activities using the upcoming weather
                    forecast.
                  </p>

                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">

                  {forecast.map((day, index) => (

                    <div
                      key={`${day.date}-${index}`}
                      className="bg-white border border-green-100 rounded-2xl p-5 text-center shadow-sm hover:shadow-md hover:-translate-y-1 transition"
                    >

                      <p className="font-semibold text-green-800 text-sm">
                        {formatDate(day.date, index)}
                      </p>

                      <div className="text-5xl my-4">
                        {getWeatherIcon(day.weather)}
                      </div>

                      <h3 className="text-2xl font-bold text-gray-800">
                        {day.temperature}°C
                      </h3>

                      <p className="text-gray-600 capitalize mt-2 text-sm">
                        {day.weather}
                      </p>

                      <div className="border-t border-gray-100 mt-4 pt-4">

                        <p className="text-sm text-gray-500">
                          💧 {day.humidity}% Humidity
                        </p>

                        <p className="text-sm text-gray-500 mt-2">
                          💨 {day.wind_speed} m/s
                        </p>

                      </div>

                    </div>

                  ))}

                </div>

              </div>
            )}

            {/* Current Weather Summary */}
            <div className="mt-8 bg-green-50 border border-green-200 rounded-2xl p-6">

              <h2 className="text-xl font-bold text-green-800">
                🌱 Farming Weather Summary
              </h2>

              <p className="text-gray-700 mt-3 leading-7">

                Current weather in{" "}

                <strong>
                  {weather.city}
                </strong>{" "}

                is{" "}

                <strong className="capitalize">
                  {weather.weather}
                </strong>{" "}

                with a temperature of{" "}

                <strong>
                  {weather.temperature}°C
                </strong>

                , humidity of{" "}

                <strong>
                  {weather.humidity}%
                </strong>{" "}

                and wind speed of{" "}

                <strong>
                  {weather.wind_speed} m/s
                </strong>.

              </p>

            </div>

            {/* Smart Advisory */}
            <div className="mt-5 mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-6">

              <h2 className="text-xl font-bold text-amber-800">
                💡 Upcoming Farming Advisory
              </h2>

              <p className="text-gray-700 mt-3 leading-7">
                {getFarmingAdvisory()}
              </p>

            </div>

          </div>
        )}

      </DashboardLayout>
  );
}
