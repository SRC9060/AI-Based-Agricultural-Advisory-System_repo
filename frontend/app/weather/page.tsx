"use client";

import { API_URL, apiFetch } from "@/lib/api";
import { saveCache, loadCache, isOffline } from "@/lib/offlineCache";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useTranslation } from "@/components/LanguageProvider";
import { useRequireSession } from "@/lib/session"
import { getLanguageLocale } from "@/lib/languages";
import { translateTexts } from "@/lib/translation";
import { translateWeatherCondition } from "@/lib/weatherConditions";

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
  detail?: string;
  error?: string;
  city?: string;
  forecast: ForecastItem[];
};

function buildFarmingAdvisory(
  weather: WeatherData,
  forecast: ForecastItem[],
) {
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

function buildWeatherSummary(weather: WeatherData) {
  return `Current weather in ${weather.city} is ${weather.weather} with a temperature of ${weather.temperature}°C, humidity of ${weather.humidity}% and wind speed of ${weather.wind_speed} m/s.`;
}

export default function WeatherPage() {
  const { language, t } = useTranslation();
  const { checkingSession } = useRequireSession();
  const [city, setCity] = useState("");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [localizedText, setLocalizedText] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!weather || language === "en") {
      setLocalizedText({});
      return;
    }

    let cancelled = false;
    const texts = Array.from(
      new Set([
        buildWeatherSummary(weather),
        buildFarmingAdvisory(weather, forecast),
      ]),
    );

    translateTexts(texts, language).then((translations) => {
      if (!cancelled) {
        setLocalizedText(
          Object.fromEntries(
            texts.map((text, index) => [text, translations[index] || text]),
          ),
        );
      }
    });

    return () => {
      cancelled = true;
    };
  }, [forecast, language, weather]);

  const localize = (text: string) => localizedText[text] || text;
  const localizeCondition = (condition: string) =>
    translateWeatherCondition(condition, language);

  async function fetchWeather() {
    const trimmedCity = city.trim();

    if (!trimmedCity) {
      setError(t("Please enter a city name."));
      return;
    }

    const normalizedCity = trimmedCity.toLowerCase();
    const weatherKey = `weather_${normalizedCity}`;
    const forecastKey = `forecast_${normalizedCity}`;

    const loadCachedWeather = () => {
      const cachedWeather = loadCache<WeatherData>(weatherKey);
      const cachedForecast = loadCache<ForecastItem[]>(forecastKey);

      if (!cachedWeather || !cachedForecast) {
        setError("No cached weather available.");
        return false;
      }

      setWeather(cachedWeather.data);
      setForecast(cachedForecast.data);
      setError(
        `📡 Offline Mode\nShowing cached weather\nLast updated: ${new Date(
          cachedWeather.timestamp,
        ).toLocaleString()}`,
      );
      return true;
    };

    if (isOffline()) {
      setLoading(false);
      setError("");
      loadCachedWeather();
      return;
    }

    try {
      setLoading(true);
      setError("");
      setWeather(null);
      setForecast([]);

      const encodedCity = encodeURIComponent(trimmedCity);

      const [weatherResponse, forecastResponse] = await Promise.all([
        apiFetch(`${API_URL}/weather?city=${encodedCity}&language=${language}`),
        apiFetch(`${API_URL}/weather/forecast?city=${encodedCity}&language=${language}`),
      ]);

      const weatherData = await weatherResponse.json();
      const forecastData: ForecastData = await forecastResponse.json();

      if (!weatherResponse.ok) {
        throw new Error(
          weatherData.detail || t("Unable to fetch weather."),
        );
      }

      if (!forecastResponse.ok) {
        throw new Error(
          forecastData.detail || t("Unable to fetch forecast."),
        );
      }

      setWeather(weatherData);
      setForecast(forecastData.forecast || []);

      saveCache(weatherKey, weatherData);
      saveCache(forecastKey, forecastData.forecast || []);
    } catch (err) {
      console.error(err);

      if (!loadCachedWeather()) {
        if (isOffline()) {
          setError(t("No cached weather available."));
          setError(`📡 Offline Mode Showing cached weather Last updated...`);
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError(t("Unable to connect to weather service."));
        }
      }
    } finally {
      setLoading(false);
    }
  }

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

  function formatDate(date: string, index: number) {
    const parsedDate = new Date(`${date}T12:00:00`);

    const formatted = parsedDate.toLocaleDateString(getLanguageLocale(language), {
      weekday: "short",
      day: "numeric",
      month: "short",
    });

    if (index === 0) {
      return `${t("Tomorrow")} • ${formatted}`;
    }

    return formatted;
  }

  if (checkingSession) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="mt-6">
        <h1 className="text-3xl font-bold text-green-800 dark:text-emerald-400">{t("Weather Advisory")}</h1>
        <h1 className="sr-only">🌦 Weather Advisory</h1>

        <p className="text-gray-600 dark:text-slate-400 mt-2">
          {t("Check current weather and upcoming forecast for your farming location.")}
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-6 mt-6 border border-slate-200 dark:border-slate-800">
        <h2 className="text-xl font-bold font-heading text-slate-900 dark:text-slate-100 mb-4">{t("Select Location")}</h2>
        <h2 className="sr-only">📍 Select Location</h2>

        <div className="flex flex-col sm:flex-row gap-3 font-body">
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
            className="flex-1 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />

          <button
            onClick={fetchWeather}
            disabled={loading}
            className="bg-gradient-to-r from-emerald-600 to-green-600 dark:bg-green-800 hover:from-emerald-700 hover:to-green-700 dark:hover:bg-green-700 disabled:opacity-60 text-white px-7 py-3 rounded-xl font-semibold transition font-heading shadow-sm"
          >
            {loading ? t("Checking...") : t("Check Weather")}
          </button>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
            ⚠️ {error}
          </div>
        )}
      </div>

      {loading && (
        <div className="mt-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center shadow-sm">
          <div className="text-4xl mb-3">🌦️</div>
          <p className="text-slate-800 dark:text-emerald-400 font-semibold font-body">
            {t("Fetching weather information...")}
          </p>
        </div>
      )}

      {weather && !loading && (
        <div className="mt-6">
          <div className="mb-5">
            <h2 className="text-2xl font-bold font-heading text-slate-900 dark:text-slate-100">📍 {weather.city}</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1 font-body">{t("Current weather conditions")}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-800 hover:shadow-md transition">
              <div className="text-4xl mb-4">🌡️</div>
              <p className="text-slate-500 dark:text-slate-400 font-body">{t("Temperature")}</p>
              <h3 className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-2 font-heading">{weather.temperature}°C</h3>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-800 hover:shadow-md transition">
              <div className="text-4xl mb-4">💧</div>
              <p className="text-slate-500 dark:text-slate-400 font-body">{t("Humidity")}</p>
              <h3 className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-2 font-heading">{weather.humidity}%</h3>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-800 hover:shadow-md transition">
              <div className="text-4xl mb-4">{getWeatherIcon(weather.weather)}</div>
              <p className="text-slate-500 dark:text-slate-400 font-body">{t("Weather")}</p>
              <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-2 capitalize font-heading">
                {localizeCondition(weather.weather)}
              </h3>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-800 hover:shadow-md transition">
              <div className="text-4xl mb-4">💨</div>
              <p className="text-slate-500 dark:text-slate-400 font-body">{t("Wind Speed")}</p>
              <h3 className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-2 font-heading">{weather.wind_speed}</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 font-body">m/s</p>
            </div>
          </div>

          {forecast.length > 0 && (
            <div className="mt-8">
              <div className="mb-5">
                <h2 className="text-2xl font-bold font-heading text-slate-900 dark:text-slate-100">📅 {t("Upcoming Forecast")}</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1 font-body">
                  {t("Plan your farming activities using the upcoming weather forecast.")}
                </p>
              </div>

              <div className="flex overflow-x-auto pb-2 [scrollbar-width:none] shrink-0 sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {forecast.map((day, index) => (
                  <div
                    key={`${day.date}-${index}`}
                    className="min-w-[180px] sm:min-w-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 text-center shadow-sm hover:shadow-md hover:-translate-y-0.5 transition shrink-0"
                  >
                    <p className="font-semibold text-emerald-700 dark:text-emerald-400 text-sm font-heading">
                      {formatDate(day.date, index)}
                    </p>

                    <div className="text-5xl my-4">{getWeatherIcon(day.weather)}</div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-heading">{day.temperature}°C</h3>
                    <p className="text-slate-600 dark:text-slate-300 capitalize mt-2 text-sm font-body">
                      {localizeCondition(day.weather)}
                    </p>

                    <div className="border-t border-slate-100 dark:border-slate-800 mt-4 pt-4 font-body">
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        💧 {day.humidity}% {t("Humidity")}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                        💨 {day.wind_speed} m/s
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-bold font-heading text-slate-900 dark:text-slate-100">
              🌱 {t("Farming Weather Summary")}
            </h2>
            <p className="text-slate-700 dark:text-slate-200 mt-3 leading-7 font-body">
              {localize(buildWeatherSummary(weather))}
            </p>
          </div>

          <div className="mt-5 mb-6 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-amber-800 dark:text-amber-400">
              💡 {t("Upcoming Farming Advisory")}
            </h2>
            <p className="text-gray-700 dark:text-slate-200 mt-3 leading-7">
              {localize(buildFarmingAdvisory(weather, forecast))}
            </p>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
