"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/components/LanguageProvider";

export default function OfflineBanner() {
  const { t } = useTranslation();
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (online) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-[100] bg-amber-500 px-4 py-3 text-center text-sm font-bold text-amber-950 shadow-md"
    >
      {t("offline")}
    </div>
  );
}
