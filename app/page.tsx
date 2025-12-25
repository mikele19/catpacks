"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

import SwipeTabs, { TabKey } from "@/app/components/SwipeTabs";
import BottomNav from "@/app/components/BottomNav";

import HomeScreen from "@/app/components/screens/HomeScreen";
import CollectionScreen from "@/app/components/screens/CollectionScreen";
import ProfileScreen from "@/app/components/screens/ProfileScreen";

export default function AppShell() {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("home");
  const [loading, setLoading] = useState(true);

  // guard: se non loggato -> /login
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push("/login");
        return;
      }
      setLoading(false);
    })();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Caricamento…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <SwipeTabs tab={tab} setTab={setTab}>
        {[
          <HomeScreen key="home" />,
          <CollectionScreen key="collection" />,
          <ProfileScreen key="profile" />,
        ]}
      </SwipeTabs>

      {/* barra sempre fissa */}
      <BottomNav tab={tab} setTab={setTab} />
    </div>
  );
}
