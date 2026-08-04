"use client";

import { API_URL, apiFetch } from "@/lib/api";

import { useEffect, useState, useCallback } from "react";

import DashboardLayout from "@/components/layouts/DashboardLayout";

import StatsSection from "@/components/dashboard/StatsSection";
import FarmBanner from "@/components/dashboard/FarmBanner";
import AIAssistantCard from "@/components/dashboard/AIAssistantCard";
import GovernmentSchemes from "@/components/dashboard/GovernmentSchemes";
import RecentActivity from "@/components/dashboard/RecentActivity";
import OfflineStatus from "@/components/dashboard/OfflineStatus";
import { loadCache, saveCache } from "@/lib/offlineCache";
import { useRequireSession } from "@/lib/session";

const DASHBOARD_CACHE_KEY = "dashboard_home";

interface Profile {
  city: string;
  state: string;
  district: string;
  crop: string;
}

interface Scheme {
  title: string;
}

interface ChatActivity {
  id: number;
  message: string;
  type: string;
  created_at: string;
}

interface DashboardData {
  profile: Profile;
  schemes: Scheme[];
  schemeCount: number;
  queryCount: number;
  activities: ChatActivity[];
}

interface DashboardDataSource {
  cached: boolean;
  timestamp?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isProfile(value: unknown): value is Profile {
  return (
    isRecord(value) &&
    typeof value.city === "string" &&
    typeof value.state === "string" &&
    typeof value.district === "string" &&
    typeof value.crop === "string"
  );
}

function isScheme(value: unknown): value is Scheme {
  return isRecord(value) && typeof value.title === "string";
}

function isChatActivity(value: unknown): value is ChatActivity {
  return (
    isRecord(value) &&
    typeof value.id === "number" &&
    typeof value.message === "string" &&
    typeof value.type === "string" &&
    typeof value.created_at === "string"
  );
}

function isDashboardData(value: unknown): value is DashboardData {
  return (
    isRecord(value) &&
    isProfile(value.profile) &&
    Array.isArray(value.schemes) &&
    value.schemes.every(isScheme) &&
    typeof value.schemeCount === "number" &&
    typeof value.queryCount === "number" &&
    Array.isArray(value.activities) &&
    value.activities.every(isChatActivity)
  );
}

export default function DashboardPage() {

  const { session, checkingSession } = useRequireSession();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [schemeCount, setSchemeCount] = useState(0);
  const [queryCount, setQueryCount] = useState(0);
  const [activities, setActivities] = useState<ChatActivity[]>([]);
  const [dashboardDataSource, setDashboardDataSource] = useState<DashboardDataSource>({
    cached: false,
  });

  const setDashboardData = (data: DashboardData, source: DashboardDataSource) => {
    setProfile(data.profile);
    setSchemes(data.schemes);
    setSchemeCount(data.schemeCount);
    setQueryCount(data.queryCount);
    setActivities(data.activities);
    setDashboardDataSource(source);
  };

  const loadDashboard = useCallback(async () => {

    try {

      if (!session) return;
      const userId = session.userId;

      const [profileResponse, schemeResponse, activityResponse] = await Promise.all([
        apiFetch(`${API_URL}/profile/${userId}`, { cache: "no-store" }),
        apiFetch(`${API_URL}/schemes/${userId}`, { cache: "no-store" }),
        apiFetch(`${API_URL}/recent-activity/${userId}?limit=4`, { cache: "no-store" }),
      ]);

      if (!profileResponse.ok || !schemeResponse.ok || !activityResponse.ok) {
        throw new Error("Dashboard API unavailable.");
      }

      const [profileData, schemeData, activityData] = await Promise.all([
        profileResponse.json(),
        schemeResponse.json(),
        activityResponse.json(),
      ]);

if (
  !isProfile(profileData) ||
  !isRecord(schemeData) ||
  schemeData.available === false ||
  !Array.isArray(schemeData.schemes) ||
  !schemeData.schemes.every(isScheme) ||
  typeof schemeData.count !== "number" ||
  !isRecord(activityData) ||
  !Array.isArray(activityData.activities) ||
  !activityData.activities.every(isChatActivity) ||
  typeof activityData.count !== "number"
) {
  throw new Error("Invalid dashboard response.");
}

      const dashboardData: DashboardData = {
        profile: profileData,
        schemes: schemeData.schemes,
        schemeCount: schemeData.count,
        queryCount: activityData.count,
        activities: activityData.activities,
      };

setDashboardData(dashboardData, {
  cached: false,
});

saveCache(DASHBOARD_CACHE_KEY, dashboardData);

    } catch (err) {

      const cachedDashboard = loadCache<DashboardData>(DASHBOARD_CACHE_KEY);

      if (cachedDashboard && isDashboardData(cachedDashboard.data)) {
        setDashboardData(cachedDashboard.data, {
          cached: true,
          timestamp: cachedDashboard.timestamp,
        });
      } else {
        console.error("Dashboard Error:", err);
      }

    } finally {

      setLoading(false);

    }

  }, [session]);

  useEffect(() => {

    if (!checkingSession) {
      loadDashboard();
    }

  }, [checkingSession, loadDashboard]);

  if (checkingSession) {
    return null;
  }

  return (

    <DashboardLayout>

      <div className="mt-8">
        <h1 className="text-3xl font-bold text-green-800">Dashboard</h1>
        <OfflineStatus
          cached={dashboardDataSource.cached}
          timestamp={dashboardDataSource.timestamp}
        />
      </div>

      <section className="mt-5">

        <StatsSection
          profile={profile}
          loading={loading}
          schemeCount={schemeCount}
          queryCount={queryCount}
        />

      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-5 items-stretch">

        <div className="lg:col-span-2">
          <AIAssistantCard />
        </div>
        <div className="h-full">
          <FarmBanner />
        </div>

      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5 items-stretch">

        <GovernmentSchemes
          schemes={schemes}
        />

        <RecentActivity activities={activities} />


      </section>

      <section className="mt-8">
      </section>

    </DashboardLayout>

  );

}
