"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient"; 
import SwipeTabs, { TabKey } from "@/app/components/SwipeTabs";
import BottomNav from "@/app/components/BottomNav";
import HomeScreen from "@/app/components/screens/HomeScreen";
import CollectionScreen from "@/app/components/screens/CollectionScreen";
import ProfileScreen from "@/app/components/screens/ProfileScreen";
import LoginScreen from "@/app/components/screens/LoginScreen";

export default function AppShell() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("home");
  const [credits, setCredits] = useState(0); 

  // --- LOGICA DI AUTENTICAZIONE ---
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

  if (loading) return <div className="min-h-screen bg-yellow-400" />;

  // SE NON SIAMO LOGGATI -> Mostra LoginScreen
  if (!session) {
    return (
        <div 
        className="relative min-h-screen overflow-hidden bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/ui/bg.png')" }}
      >
          <LoginScreen />
      </div>
    );
  }

  // SE SIAMO LOGGATI -> Mostra l'APP
  return (
    <div 
      className="relative min-h-screen overflow-hidden bg-cover bg-center bg-no-repeat text-black"
      style={{ backgroundImage: "url('/ui/bg.png')" }}
    >
      <SwipeTabs tab={tab} onTabChange={setTab}>
        <HomeScreen
          key="home"
          credits={credits}
          setCredits={setCredits}
          onRedeem={handleRedeem}
        />

        {/* --- MODIFICA FONDAMENTALE --- */}
        {/* Abbiamo aggiunto setCredits={setCredits} qui sotto! */}
        <CollectionScreen 
           key="collection" 
           isActive={tab === "collection"} 
           setCredits={setCredits}
        />
        
        <ProfileScreen key="profile" />
      </SwipeTabs>

      <BottomNav tab={tab} onTabChange={setTab} />
    </div>
  );
}