"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient"; 
import SwipeTabs, { TabKey } from "@/app/components/SwipeTabs";
import BottomNav from "@/app/components/BottomNav";

// IMPORTA TUTTE LE SCHERMATE
import HomeScreen from "@/app/components/screens/HomeScreen";
import CollectionScreen from "@/app/components/screens/CollectionScreen";
import FriendsScreen from "@/app/components/screens/FriendsScreen"; 
import ProfileScreen from "@/app/components/screens/ProfileScreen";
import LoginScreen from "@/app/components/screens/LoginScreen";

export default function AppShell() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("home");
  const [credits, setCredits] = useState(0); 

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleRedeem = (value: number) => {
    setCredits((c) => c + value);
  };

  if (loading) return <div className="h-screen w-full bg-yellow-400 flex items-center justify-center font-bold">Caricamento...</div>;

  if (!session) {
    return (
        <div 
        className="relative h-screen w-full overflow-hidden bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/ui/bg.png')" }}
      >
          <LoginScreen />
      </div>
    );
  }

  return (
    // MODIFICA 1: Usa h-screen e flex-col per gestire l'altezza correttamente
    <div 
      className="relative h-screen w-full overflow-hidden bg-cover bg-center bg-no-repeat text-black flex flex-col"
      style={{ backgroundImage: "url('/ui/bg.png')" }}
    >
      
      {/* MODIFICA 2: Avvolgi SwipeTabs in un div flex-1 (che occupa tutto lo spazio disponibile) */}
      <div className="flex-1 relative w-full overflow-hidden">
        <SwipeTabs tab={tab} onTabChange={setTab}>
          
          <HomeScreen
            key="home"
            credits={credits}
            setCredits={setCredits}
            onRedeem={handleRedeem}
          />

          <CollectionScreen 
            key="collection" 
            isActive={tab === "collection"} 
            setCredits={setCredits}
          />

          <FriendsScreen key="friends" />
          
          <ProfileScreen 
            key="profile" 
            isActive={tab === "profile"} 
          />

        </SwipeTabs>
      </div>

      {/* BottomNav rimane fissa in basso, ma fuori dal flusso flex-1 */}
      <BottomNav tab={tab} onTabChange={setTab} />
    </div>
  );
}