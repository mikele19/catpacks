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
    <div className="relative min-h-screen">
      {tab === "home" && <HomeScreen />}
      {tab === "collection" && <CollectionScreen />}
      {tab === "profile" && <ProfileScreen />}

      <BottomNav tab={tab} setTab={setTab} />
    </div>
  );
}
