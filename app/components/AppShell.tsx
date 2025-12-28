"use client";

import { useState } from "react";
import BottomNav from "./BottomNav";
import type { TabKey } from "./SwipeTabs";

import HomeScreen from "./screens/HomeScreen";
import CollectionScreen from "./screens/CollectionScreen";
import ProfileScreen from "./screens/ProfileScreen";

export default function AppShell() {
  const [tab, setTab] = useState<TabKey>("home");

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* 🔥 SFONDO GLOBALE */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          backgroundImage: "url(/ui/bg.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      {/* CONTENUTO */}
      <div className="pb-24">
        {tab === "home" && <HomeScreen />}
        {tab === "collection" && <CollectionScreen />}
        {tab === "profile" && <ProfileScreen />}
      </div>

      {/* NAV SEMPRE DAVANTI */}
      <BottomNav tab={tab} setTab={setTab} />
    </div>
  );
}
