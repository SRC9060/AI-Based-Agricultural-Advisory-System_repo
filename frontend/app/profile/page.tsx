"use client";

import { API_URL } from "@/lib/api";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useTranslation } from "@/components/LanguageProvider";

type Profile = {
  id: number; name: string; email: string; phone: string; state: string; district: string; city: string;
  language: string; farmer_type: string; crop: string; farm_size: string; soil_type: string;
};

const initialProfile: Profile = { id: 0, name: "", email: "", phone: "", state: "", district: "", city: "", language: "", farmer_type: "", crop: "", farm_size: "", soil_type: "" };

export default function ProfilePage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile>(initialProfile);

  const loadProfile = async () => {
    const userId = localStorage.getItem("user_id");
    if (!userId) { router.replace("/login"); return; }
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/profile/${userId}`);
      if (response.ok) setProfile(await response.json());
    } finally { setLoading(false); }
  };

  useEffect(() => { loadProfile(); }, []);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setProfile((current) => ({ ...current, [event.target.name]: event.target.value }));

  const saveProfile = async () => {
    const userId = localStorage.getItem("user_id");
    if (!userId) { router.replace("/login"); return; }
    const response = await fetch(`${API_URL}/profile/${userId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: profile.phone, state: profile.state, district: profile.district, city: profile.city, language: profile.language, farmer_type: profile.farmer_type, crop: profile.crop, farm_size: profile.farm_size, soil_type: profile.soil_type }),
    });
    if (response.ok) { alert(t("Profile Updated Successfully")); await loadProfile(); setEditing(false); }
    else alert(t("Profile Update Failed"));
  };

  const personalFields: Array<[keyof Profile, string, boolean?]> = [["name", "Full Name"], ["email", "Email", true], ["phone", "Phone Number"], ["state", "State"], ["district", "District"], ["city", "City"]];
  const farmingFields: Array<[keyof Profile, string]> = [["farmer_type", "Farmer Type"], ["crop", "Primary Crop"], ["farm_size", "Farm Size"], ["soil_type", "Soil Type"]];
  const location = [profile.city, profile.district, profile.state].filter(Boolean).join(", ") || t("Location not provided");

  return <DashboardLayout><main className="py-6">
    <header className="mt-6"><h1 className="text-3xl font-bold text-green-800">{t("My Profile")}</h1><p className="mt-2 text-gray-600">{t("Manage your personal details and farming preferences.")}</p></header>
    {loading ? <div className="mt-6 rounded-2xl bg-white p-10 text-center text-gray-500 shadow-sm">{t("Loading Profile...")}</div> : <>
      <section className="mt-6 flex items-center gap-5 rounded-2xl bg-white p-6 shadow-sm"><div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-700 text-3xl font-bold text-white">{profile.name?.charAt(0) || "?"}</div><div><h2 className="text-2xl font-bold text-green-800">{profile.name || t("Unnamed Farmer")}</h2><p className="text-gray-500">{t("Farmer")}</p><p className="mt-1 text-sm text-gray-500">{location}</p></div></section>
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2"><Section title={t("Personal Information")}><Fields fields={personalFields} profile={profile} editing={editing} onChange={handleChange}/></Section><Section title={t("Farming Information")}><Fields fields={farmingFields} profile={profile} editing={editing} onChange={handleChange}/></Section></div>
      <Section title={t("Preferences")} sectionId="preferences" extraClass="mt-6"><Fields fields={[["language", "Preferred Language"]]} profile={profile} editing={editing} onChange={handleChange}/></Section>
      <div className="mt-6 flex justify-end gap-3">{editing ? <><button onClick={() => { setEditing(false); loadProfile(); }} className="rounded-xl border border-gray-300 px-6 py-3 font-semibold">{t("Cancel")}</button><button onClick={saveProfile} className="rounded-xl bg-green-700 px-6 py-3 font-semibold text-white hover:bg-green-800">{t("Save Changes")}</button></> : <button onClick={() => setEditing(true)} className="rounded-xl bg-green-700 px-6 py-3 font-semibold text-white hover:bg-green-800">{t("Edit Profile")}</button>}</div>
    </>}
  </main></DashboardLayout>;
}

function Section({ title, children, extraClass = "", sectionId }: { title: string; children: React.ReactNode; extraClass?: string; sectionId?: string }) { return <section id={sectionId} className={`rounded-2xl bg-white p-6 shadow-sm ${extraClass}`}><h2 className="mb-5 text-xl font-bold text-green-800">{title}</h2><div className="space-y-4">{children}</div></section>; }

function Fields({ fields, profile, editing, onChange }: { fields: Array<[keyof Profile, string, boolean?]>; profile: Profile; editing: boolean; onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void }) { const { t } = useTranslation(); return <>{fields.map(([name, label, readOnly]) => <div key={name}><label className="mb-2 block text-sm font-medium text-gray-500">{t(label)} {readOnly && <span className="ml-2 text-xs text-gray-400">({t("cannot be changed")})</span>}</label>{editing && !readOnly ? <input name={name} value={profile[name]} onChange={onChange} placeholder={t("Enter value")} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-800 outline-none focus:border-green-600"/> : <div className="min-h-[48px] rounded-xl bg-gray-50 px-4 py-3 text-gray-800">{profile[name] || t("Not provided")}</div>}</div>)}</>; }
