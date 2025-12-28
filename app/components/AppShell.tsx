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
  const [coins, setCoins] = useState(500);

  const PACK_COST = 100;

  const handleRedeem = (value: number) => {
    setCoins((c) => c - PACK_COST + value);
  };

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">
      <div className="fixed top-4 left-4 z-50 rounded-xl bg-black/50 px-4 py-2 backdrop-blur">
        🪙 {coins}
      </div>

      <SwipeTabs tab={tab} onTabChange={setTab}>
        <HomeScreen>
          <PackArt onRedeem={handleRedeem} />
        </HomeScreen>

        <CollectionScreen />

        <ProfileScreen />
      </SwipeTabs>

      <BottomNav tab={tab} onTabChange={setTab} />
    </div>
  );
}
