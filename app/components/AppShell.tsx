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

  if (loading) return <div className="fixed inset-0 bg-yellow-400" />;

  if (!session) {
    return (
        <div 
        className="fixed inset-0 overflow-hidden bg-cover bg-center bg-no-repeat"
        style={{ 
            backgroundImage: "url('/ui/bg.png')",
            overscrollBehavior: "none" // BLOCCO ELASTICO
        }}
      >
          <LoginScreen />
      </div>
    );
  }

  return (
    // MODIFICA QUI: 'fixed inset-0' blocca tutto al viewport, niente scroll esterno
    <div 
      className="fixed inset-0 h-full w-full overflow-hidden bg-cover bg-center bg-no-repeat text-black flex flex-col"
      style={{ 
        backgroundImage: "url('/ui/bg.png')",
        overscrollBehavior: "none" // IMPORTANTE: BLOCCO ELASTICO
      }}
    >
      
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

      <BottomNav tab={tab} onTabChange={setTab} />
    </div>
  );
}