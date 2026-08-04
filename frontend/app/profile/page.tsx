"use client";

import { API_URL, apiFetch } from "@/lib/api";

import { useCallback, useEffect, useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useTranslation } from "@/components/LanguageProvider";
import { loadCache, saveCache } from "@/lib/offlineCache";
import { updateProfileCompleted, useRequireSession } from "@/lib/session";
import {
  APP_LANGUAGES,
  getLanguageName,
  normalizeLanguage,
} from "@/lib/languages";

type Profile = {
  id: number; name: string; email: string; phone: string; state: string; district: string; city: string;
  language: string; farmer_type: string; crop: string; farm_size: string; soil_type: string;
};

const initialProfile: Profile = { id: 0, name: "", email: "", phone: "", state: "", district: "", city: "", language: "", farmer_type: "", crop: "", farm_size: "", soil_type: "" };

function isProfile(value: unknown): value is Profile {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const profile = value as Record<keyof Profile, unknown>;
  return (
    typeof profile.id === "number" &&
    typeof profile.name === "string" &&
    typeof profile.email === "string" &&
    typeof profile.phone === "string" &&
    typeof profile.state === "string" &&
    typeof profile.district === "string" &&
    typeof profile.city === "string" &&
    typeof profile.language === "string" &&
    typeof profile.farmer_type === "string" &&
    typeof profile.crop === "string" &&
    typeof profile.farm_size === "string" &&
    typeof profile.soil_type === "string"
  );
}

function isProfileComplete(profile: Profile) {
  return Boolean(
    profile.phone &&
      profile.state &&
      profile.district &&
      profile.city &&
      profile.language &&
      profile.farmer_type &&
      profile.crop &&
      profile.farm_size &&
      profile.soil_type
  );
}

export default function ProfilePage() {
  const { session, checkingSession } = useRequireSession();
  const { t, setLanguage } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [cachedProfileTimestamp, setCachedProfileTimestamp] = useState<string>();

  const loadProfile = useCallback(async () => {
    if (!session) return;
    const userId = session.userId;
    const cacheKey = `profile_${userId}`;

    const loadCachedProfile = () => {
      const cachedProfile = loadCache<Profile>(cacheKey);
      if (!cachedProfile || !isProfile(cachedProfile.data)) return false;
      setProfile(cachedProfile.data);
      setLanguage(normalizeLanguage(cachedProfile.data.language));
      setCachedProfileTimestamp(cachedProfile.timestamp);
      return true;
    };

    try {
      setLoading(true);
      const response = await apiFetch(`${API_URL}/profile/${userId}`);   
      if (!response.ok) throw new Error("Unable to load profile.");
      const data: unknown = await response.json();
      if (!isProfile(data)) throw new Error("Invalid profile response.");
      setProfile(data);
      setLanguage(normalizeLanguage(data.language));
      
      saveCache(cacheKey, data);
      setCachedProfileTimestamp(undefined);
    } catch (error) {
      console.error(error);
      loadCachedProfile();
    } finally { setLoading(false); }
  }, [session, setLanguage]);

  useEffect(() => {
    if (!checkingSession) {
      loadProfile();
    }
  }, [checkingSession, loadProfile]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;

    setProfile((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const saveProfile = async () => {
    if (!session) return;
    const userId = session.userId;
   const response = await apiFetch(`${API_URL}/profile/${userId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: profile.phone, state: profile.state, district: profile.district, city: profile.city, language: profile.language, farmer_type: profile.farmer_type, crop: profile.crop, farm_size: profile.farm_size, soil_type: profile.soil_type }),
    });
    const data: unknown = response.ok ? await response.json() : null;
    if (response.ok && isProfile(data)) {
      setProfile(data);
      setLanguage(normalizeLanguage(data.language));
      saveCache(`profile_${userId}`, data);
      updateProfileCompleted(isProfileComplete(data));
      setCachedProfileTimestamp(undefined);
      alert(t("Profile Updated Successfully"));
      setEditing(false);
    } else if (response.ok) {
      updateProfileCompleted(isProfileComplete(profile));
      await loadProfile();
      alert(t("Profile Updated Successfully"));
      setEditing(false);
    }
    else alert(t("Profile Update Failed"));
  };

  const personalFields: Array<[keyof Profile, string, boolean?]> = [["name", "Full Name"], ["email", "Email", true], ["phone", "Phone Number"], ["state", "State"], ["district", "District"], ["city", "City"]];
  const farmingFields: Array<[keyof Profile, string]> = [["farmer_type", "Farmer Type"], ["crop", "Primary Crop"], ["farm_size", "Farm Size"], ["soil_type", "Soil Type"]];
  const location = [profile.city, profile.district, profile.state].filter(Boolean).join(", ") || t("Location not provided");

  if (checkingSession) return null;

  return <DashboardLayout><main className="py-6">
    <header className="mt-6"><h1 className="text-3xl font-bold text-green-800">{t("My Profile")}</h1><p className="mt-2 text-gray-600">{t("Manage your personal details and farming preferences.")}</p></header>
    {cachedProfileTimestamp && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700"><p>📡 Offline Mode</p><p>Showing cached profile</p><p className="text-gray-500">Last Updated: {new Date(cachedProfileTimestamp).toLocaleString()}</p></div>}
    {loading ? <div className="mt-6 rounded-2xl bg-white p-10 text-center text-gray-500 shadow-sm">{t("Loading Profile...")}</div> : <>
      <section className="mt-6 flex items-center gap-5 rounded-2xl bg-white p-6 shadow-sm"><div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-700 text-3xl font-bold text-white">{profile.name?.charAt(0) || "?"}</div><div><h2 className="text-2xl font-bold text-green-800">{profile.name || t("Unnamed Farmer")}</h2><p className="text-gray-500">{t("Farmer")}</p><p className="mt-1 text-sm text-gray-500">{location}</p></div></section>
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2"><Section title={t("Personal Information")}><Fields fields={personalFields} profile={profile} editing={editing} onChange={handleChange}/></Section><Section title={t("Farming Information")}><Fields fields={farmingFields} profile={profile} editing={editing} onChange={handleChange}/></Section></div>
      <Section title={t("Preferences")} sectionId="preferences" extraClass="mt-6"><Fields fields={[["language", "Preferred Language"]]} profile={profile} editing={editing} onChange={handleChange}/></Section>
      <div className="mt-6 flex justify-end gap-3">{editing ? <><button onClick={() => { setEditing(false); loadProfile(); }} className="rounded-xl border border-gray-300 px-6 py-3 font-semibold">{t("Cancel")}</button><button onClick={saveProfile} className="rounded-xl bg-green-700 px-6 py-3 font-semibold text-white hover:bg-green-800">{t("Save Changes")}</button></> : <button onClick={() => setEditing(true)} className="rounded-xl bg-green-700 px-6 py-3 font-semibold text-white hover:bg-green-800">{t("Edit Profile")}</button>}</div>
    </>}
  </main></DashboardLayout>;
}

function Section({ title, children, extraClass = "", sectionId }: { title: string; children: React.ReactNode; extraClass?: string; sectionId?: string }) { return <section id={sectionId} className={`rounded-2xl bg-white p-6 shadow-sm ${extraClass}`}><h2 className="mb-5 text-xl font-bold text-green-800">{title}</h2><div className="space-y-4">{children}</div></section>; }

function Fields({ fields, profile, editing, onChange }: { fields: Array<[keyof Profile, string, boolean?]>; profile: Profile; editing: boolean; onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void }) {
  const { t } = useTranslation();
  return <>{fields.map(([name, label, readOnly]) => {
    const isLanguage = name === "language";
    const displayValue = isLanguage
      ? getLanguageName(String(profile[name]))
      : profile[name];
    return <div key={name}>
      <label className="mb-2 block text-sm font-medium text-gray-500">{t(label)} {readOnly && <span className="ml-2 text-xs text-gray-400">({t("cannot be changed")})</span>}</label>
      {editing && !readOnly ? (
        isLanguage ? (
          <select name={name} value={normalizeLanguage(String(profile[name]))} onChange={onChange} className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-800 outline-none focus:border-green-600">
            {APP_LANGUAGES.map((language) => <option key={language.code} value={language.code}>{language.nativeName}</option>)}
          </select>
        ) : (
          <input name={name} value={profile[name]} onChange={onChange} placeholder={t("Enter value")} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-800 outline-none focus:border-green-600"/>
        )
      ) : <div className="min-h-[48px] rounded-xl bg-gray-50 px-4 py-3 text-gray-800">{displayValue || t("Not provided")}</div>}
    </div>;
  })}</>;
}
