"use client";

import { useState } from "react";
import SwipeTabs, { TabKey } from "@/app/components/SwipeTabs";
import BottomNav from "@/app/components/BottomNav";
import HomeScreen from "@/app/components/screens/HomeScreen";
import CollectionScreen from "@/app/components/screens/CollectionScreen";
import ProfileScreen from "@/app/components/screens/ProfileScreen";

export default function AppShell() {
  const [tab, setTab] = useState<TabKey>("home");
  // Fonte di verità delle monete
  const [credits, setCredits] = useState(0); 

  // Funzione passata a HomeScreen per aggiornare i crediti visivamente
  const handleRedeem = (value: number) => {
    setCredits((c) => c + value);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      {/* SwipeTabs ora usa la prop corretta: onTabChange */}
      <SwipeTabs tab={tab} onTabChange={setTab}>
        <HomeScreen
          key="home"
          credits={credits}
          setCredits={setCredits}
          onRedeem={handleRedeem}
        />

        <CollectionScreen key="collection" />
        <ProfileScreen key="profile" />
      </SwipeTabs>

      {/* BottomNav ora usa la prop corretta: onTabChange */}
      <BottomNav tab={tab} onTabChange={setTab} />
    </div>
  );
}