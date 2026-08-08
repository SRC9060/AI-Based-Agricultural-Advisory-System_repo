"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "@/components/LanguageProvider";
import { getLocalizedMarketLabel } from "@/lib/marketLocalization";

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

  const localizeOption = (value: string) => getLocalizedMarketLabel(value, language);

  const isFormIncomplete =
    !commodity || !state || !district;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-800">
      <h2 className="text-xl font-bold font-heading text-slate-900 dark:text-slate-100 mb-5">
        {t("Search Market Prices")}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 font-body">

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
            className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl px-4 py-3 cursor-pointer outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
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
            className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl px-4 py-3 cursor-pointer outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
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
            className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl px-4 py-3 cursor-pointer outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
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
        <p className="text-red-600 dark:text-red-400 mt-3 text-sm font-body">
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
        className={`mt-6 px-8 py-3 rounded-xl font-semibold transition-all font-heading shadow-sm ${
          loading || isFormIncomplete
            ? "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed"
            : "bg-gradient-to-r from-emerald-600 to-green-600 dark:bg-green-700 hover:from-emerald-700 hover:to-green-700 dark:hover:bg-green-600 text-white"
        }`}
      >
        {loading ? t("Searching...") : t("Search")}
      </button>
    </div>
  );
}
