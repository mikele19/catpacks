"use client";

import { useEffect, useState } from "react";
// AGGIUNGI QUESTO IMPORT PER LEGGERE L'URL
import { useSearchParams } from "next/navigation"; 
import { supabase } from "@/lib/supabaseClient"; 
import SwipeTabs, { TabKey } from "@/app/components/SwipeTabs";
import BottomNav from "@/app/components/BottomNav";

// IMPORT SCHERMATE
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
  
  // HOOK PER LEGGERE URL
  const searchParams = useSearchParams();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      
      // LOGICA INVITO: Se c'è sessione e c'è ?invite=XYZ
      if (session && searchParams) {
         const inviteId = searchParams.get("invite");
         if (inviteId && inviteId !== session.user.id) {
            // Chiediamo all'utente se vuole aggiungere
            const confirmAdd = window.confirm("Vuoi aggiungere questo utente agli amici?");
            if (confirmAdd) {
               // Chiamata API rapida
               fetch("/api/add-friend", {
                  method: "POST",
                  headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session.access_token}`
                  },
                  body: JSON.stringify({ friendId: inviteId })
               })
               .then(res => res.json())
               .then(data => {
                  if(data.success) {
                     alert("Amico aggiunto con successo!");
                     setTab("friends"); // Portiamolo alla schermata amici
                  } else {
                     alert("Impossibile aggiungere: " + data.error);
                  }
                  // Puliamo l'URL per non richiederlo al refresh
                  window.history.replaceState({}, '', '/');
               });
            }
         }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [searchParams]); // Aggiungi searchParams alle dipendenze

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
    <div 
      className="relative h-screen w-full overflow-hidden bg-cover bg-center bg-no-repeat text-black flex flex-col"
      style={{ backgroundImage: "url('/ui/bg.png')" }}
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