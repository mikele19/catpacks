"use client";

import { useState } from "react";
import SwipeTabs, { TabKey } from "@/app/components/SwipeTabs";
import BottomNav from "@/app/components/BottomNav";
import HomeScreen from "@/app/components/screens/HomeScreen";
import CollectionScreen from "@/app/components/screens/CollectionScreen";
import ProfileScreen from "@/app/components/screens/ProfileScreen";
import PackArt from "@/app/components/PackArt";

export default function AppShell() {
  const [tab, setTab] = useState<TabKey>("home");
 

  return (
    <div className="relative min-h-screen text-white overflow-hidden">

      <SwipeTabs tab={tab} onTabChange={setTab}>
        <HomeScreen />

        <CollectionScreen />

        <ProfileScreen />
      </SwipeTabs>

      <BottomNav tab={tab} onTabChange={setTab} />
    </div>
  );
}
