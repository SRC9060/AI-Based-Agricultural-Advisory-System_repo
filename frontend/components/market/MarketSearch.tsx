"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "@/components/LanguageProvider";
import { translateTextMap } from "@/lib/translation";

interface MarketSearchProps {
  onSearch: (
    commodity: string,
    state: string,
    district: string
  ) => void;

  loading: boolean;

  marketOptions: Record<
    string,
    Record<string, string[]>
  >;
}

export default function MarketSearch({
  onSearch,
  loading,
  marketOptions,
}: MarketSearchProps) {
  const { language, t } = useTranslation();
  const [commodity, setCommodity] = useState("");
  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [formError, setFormError] = useState("");
  const [localizedOptions, setLocalizedOptions] = useState<Record<string, string>>({});
  const [localizingOptions, setLocalizingOptions] = useState(false);

  // Commodity list
  const commodities = useMemo(
    () => Object.keys(marketOptions),
    [marketOptions],
  );

  // States for selected commodity
  const availableStates = useMemo(
    () =>
      commodity
        ? Object.keys(marketOptions[commodity] || {})
        : [],
    [commodity, marketOptions],
  );

  // Districts for selected commodity + state
  const availableDistricts = useMemo(
    () =>
      commodity && state
        ? marketOptions[commodity]?.[state] || []
        : [],
    [commodity, marketOptions, state],
  );

  const visibleOptions = useMemo(
    () => [
      ...commodities,
      ...availableStates,
      ...availableDistricts,
    ],
    [availableDistricts, availableStates, commodities],
  );

  useEffect(() => {
    let cancelled = false;
    if (visibleOptions.length === 0) return;

    if (language === "en") {
      setLocalizedOptions({});
      return;
    }

    translateTextMap(visibleOptions, language).then((translations) => {
      if (!cancelled) {
        setLocalizedOptions(translations);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [language, visibleOptions]);

  const localizeOption = (value: string) => {
    if (!value) return value;
    const staticTranslation = t(value);
    if (staticTranslation && staticTranslation !== value) {
      return staticTranslation;
    }
    if (localizedOptions[value]) {
      return localizedOptions[value];
    }
    return value;
  };

  const isFormIncomplete =
    !commodity || !state || !district;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-md p-6 border border-slate-100 dark:border-slate-800">
      <h2 className="text-xl font-semibold text-green-800 dark:text-emerald-400 mb-5">
        {t("Search Market Prices")}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* Commodity */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            {t("Commodity")}
          </label>

          <select
            value={commodity}
            disabled={loading}
            onChange={(e) => {
              setCommodity(e.target.value);
              setState("");
              setDistrict("");
            }}
            className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl px-4 py-3 cursor-pointer outline-none focus:border-green-600 dark:focus:border-emerald-500"
          >
            <option value="" className="dark:bg-slate-900 dark:text-slate-100">
              {t("Select Commodity")}
            </option>

            {commodities.map((item) => (
              <option key={item} value={item} className="dark:bg-slate-900 dark:text-slate-100">
                {localizeOption(item)}
              </option>
            ))}
          </select>
        </div>

        {/* State */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            {t("State")}
          </label>

          <select
            value={state}
            disabled={!commodity || loading}
            onChange={(e) => {
              setState(e.target.value);
              setDistrict("");
            }}
            className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl px-4 py-3 cursor-pointer outline-none focus:border-green-600 dark:focus:border-emerald-500 disabled:opacity-50"
          >
            <option value="" className="dark:bg-slate-900 dark:text-slate-100">
              {commodity
                ? t("Select State")
                : t("Select Commodity First")}
            </option>

            {availableStates.map((item) => (
              <option key={item} value={item} className="dark:bg-slate-900 dark:text-slate-100">
                {localizeOption(item)}
              </option>
            ))}
          </select>
        </div>

        {/* District */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            {t("District")}
          </label>

          <select
            value={district}
            disabled={!state || loading}
            onChange={(e) =>
              setDistrict(e.target.value)
            }
            className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl px-4 py-3 cursor-pointer outline-none focus:border-green-600 dark:focus:border-emerald-500 disabled:opacity-50"
          >
            <option value="" className="dark:bg-slate-900 dark:text-slate-100">
              {state
                ? t("Select District")
                : t("Select State First")}
            </option>

            {availableDistricts.map((item) => (
              <option key={item} value={item} className="dark:bg-slate-900 dark:text-slate-100">
                {localizeOption(item)}
              </option>
            ))}
          </select>
        </div>

      </div>

      {formError && (
        <p className="text-red-600 dark:text-red-400 mt-3">
          {formError}
        </p>
      )}

      <button
        disabled={loading || isFormIncomplete}
        onClick={() => {
          if (isFormIncomplete) {
            setFormError(
              t("Please fill all fields.")
            );
            return;
          }

          setFormError("");

          onSearch(
            commodity,
            state,
            district
          );
        }}
        className={`mt-6 px-8 py-3 rounded-xl font-semibold transition-all ${
          loading || isFormIncomplete
            ? "bg-gray-300 dark:bg-slate-800 text-gray-500 dark:text-slate-500 cursor-not-allowed"
            : "bg-green-600 dark:bg-green-700 hover:bg-green-700 dark:hover:bg-green-600 text-white"
        }`}
      >
        {loading ? t("Searching...") : t("Search")}
      </button>
    </div>
  );
}
