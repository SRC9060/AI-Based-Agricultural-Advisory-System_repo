"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

import DashboardLayout from "@/components/layouts/DashboardLayout";

import StatsSection from "@/components/dashboard/StatsSection";
import FarmBanner from "@/components/dashboard/FarmBanner";
import AIAssistantCard from "@/components/dashboard/AIAssistantCard";
import GovernmentSchemes from "@/components/dashboard/GovernmentSchemes";
import RecentActivity from "@/components/dashboard/RecentActivity";

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
  created_at: string;
}

export default function DashboardPage() {

  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [schemeCount, setSchemeCount] = useState(0);
  const [queryCount, setQueryCount] = useState(0);
  const [activities, setActivities] = useState<ChatActivity[]>([]);

  const loadDashboard = useCallback(async () => {

    try {

      const userId = localStorage.getItem("user_id");

      if (!userId) {
        router.replace("/login");
        return;
      }

      // ---------------- PROFILE ----------------

      const profileResponse = await fetch(
        `http://127.0.0.1:8000/profile/${userId}`
      );

      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        setProfile(profileData);
      }

      // ---------------- SCHEMES ----------------

      const schemeResponse = await fetch(
        `http://127.0.0.1:8000/schemes/${userId}`
      );

      if (schemeResponse.ok) {

        const schemeData = await schemeResponse.json();

        setSchemes(schemeData.schemes || []);
        setSchemeCount(schemeData.count || 0);

      }

      const activityResponse = await fetch(
        `http://127.0.0.1:8000/chat/activity/${userId}?limit=4`
      );
      if (activityResponse.ok) {
        const activityData = await activityResponse.json();
        setQueryCount(activityData.count || 0);
        setActivities(activityData.activities || []);
      }

    } catch (err) {

      console.error("Dashboard Error:", err);

    } finally {

      setLoading(false);

    }

  }, [router]);

  useEffect(() => {

    loadDashboard();

  }, [loadDashboard]);

  return (

    <DashboardLayout>

      <section className="mt-8">

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
