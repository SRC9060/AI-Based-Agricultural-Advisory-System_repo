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
    setLocalizingOptions(language !== "en" && visibleOptions.length > 0);
    setLocalizedOptions({});

    translateTextMap(visibleOptions, language).then((translations) => {
      if (!cancelled) {
        setLocalizedOptions(translations);
        setLocalizingOptions(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [language, visibleOptions]);

  const localizeOption = (value: string) =>
    localizedOptions[value] || t(value);

  const isFormIncomplete =
    !commodity || !state || !district;

  return (
    <div className="bg-white rounded-2xl shadow-md p-6">
      <h2 className="text-xl font-semibold text-green-800 mb-5">
        {t("Search Market Prices")}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* Commodity */}
        <div>
          <label className="block text-sm font-medium mb-2">
            {t("Commodity")}
          </label>

          <select
            value={commodity}
            disabled={loading || localizingOptions}
            onChange={(e) => {
              setCommodity(e.target.value);
              setState("");
              setDistrict("");
            }}
            className="w-full border rounded-xl px-4 py-3"
          >
            <option value="">
              {localizingOptions ? t("Loading...") : t("Select Commodity")}
            </option>

            {!localizingOptions && commodities.map((item) => (
              <option key={item} value={item}>
                {localizeOption(item)}
              </option>
            ))}
          </select>
        </div>

        {/* State */}
        <div>
          <label className="block text-sm font-medium mb-2">
            {t("State")}
          </label>

          <select
            value={state}
            disabled={!commodity || loading || localizingOptions}
            onChange={(e) => {
              setState(e.target.value);
              setDistrict("");
            }}
            className="w-full border rounded-xl px-4 py-3"
          >
            <option value="">
              {commodity
                ? t("Select State")
                : t("Select Commodity First")}
            </option>

            {!localizingOptions && availableStates.map((item) => (
              <option key={item} value={item}>
                {localizeOption(item)}
              </option>
            ))}
          </select>
        </div>

        {/* District */}
        <div>
          <label className="block text-sm font-medium mb-2">
            {t("District")}
          </label>

          <select
            value={district}
            disabled={!state || loading || localizingOptions}
            onChange={(e) =>
              setDistrict(e.target.value)
            }
            className="w-full border rounded-xl px-4 py-3"
          >
            <option value="">
              {state
                ? t("Select District")
                : t("Select State First")}
            </option>

            {!localizingOptions && availableDistricts.map((item) => (
              <option key={item} value={item}>
                {localizeOption(item)}
              </option>
            ))}
          </select>
        </div>

      </div>

      {formError && (
        <p className="text-red-600 mt-3">
          {formError}
        </p>
      )}

      <button
        disabled={loading || localizingOptions || isFormIncomplete}
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
        className={`mt-6 px-8 py-3 rounded-xl font-semibold ${
          loading || localizingOptions || isFormIncomplete
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-green-600 hover:bg-green-700 text-white"
        }`}
      >
        {loading ? t("Searching...") : t("Search")}
      </button>
    </div>
  );
}
