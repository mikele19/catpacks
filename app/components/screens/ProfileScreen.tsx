"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ProfileScreen({ lowPerfMode }: { lowPerfMode?: boolean }) {
  const [profile, setProfile] = useState<any>(null);
  const [catCount, setCatCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Carica Profilo (ora include xp e level grazie al database aggiornato)
      const { data: profileData } = await supabase
        .from("users_profile")
        .select("*")
        .eq("user_id", user.id)
        .single();
      
      // 2. Conta i gatti posseduti
      const { count } = await supabase
        .from("user_cats")
        .select("*", { count: 'exact', head: true }) 
        .eq("user_id", user.id);

      setProfile({ ...profileData, email: user.email });
      setCatCount(count || 0);
      setLoading(false);
    }

    loadData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  if (loading) return <div className="h-full flex items-center justify-center font-black">Caricamento...</div>;

  // Calcolo per la barra di progresso
  // XP Richiesti = Livello attuale * 100
  const xpNeeded = (profile?.level || 1) * 100;
  const currentXp = profile?.xp || 0;
  const progressPercent = Math.min(100, (currentXp / xpNeeded) * 100);

  return (
    <div className="h-full w-full overflow-hidden text-black overflow-y-auto">
      <div className="px-5 pt-10 pb-32 max-w-md mx-auto">
        
        <h1 className="text-4xl font-black tracking-tight drop-shadow-sm mb-6">Profilo</h1>
        
        {/* CARD PRINCIPALE */}
        <div className="sticker bg-white/90 p-6 shadow-lg rounded-3xl backdrop-blur-sm mb-6 relative overflow-hidden border-2 border-white/50">
            {/* Decorazione sfondo */}
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-yellow-300 rounded-full blur-2xl opacity-30"></div>

            <div className="relative z-10">
                <div className="text-xl font-black mb-1">{profile.email.split('@')[0]}</div>
                <div className="text-xs font-bold text-black/40 uppercase tracking-widest mb-6">Giocatore</div>
                
                <div className="flex gap-4 text-center">
                    <div className="flex-1 bg-gray-50 rounded-2xl p-3 border border-gray-100">
                        <div className="text-3xl font-black text-yellow-500">{profile.level || 1}</div>
                        <div className="text-[9px] font-black uppercase text-black/30 tracking-widest">Livello</div>
                    </div>
                    <div className="flex-1 bg-gray-50 rounded-2xl p-3 border border-gray-100">
                        <div className="text-3xl font-black text-cyan-500">{catCount}</div>
                        <div className="text-[9px] font-black uppercase text-black/30 tracking-widest">Gatti</div>
                    </div>
                </div>

                {/* BARRA XP */}
                <div className="mt-6">
                    <div className="flex justify-between text-[10px] font-black text-black/40 mb-1.5 uppercase tracking-wide">
                        <span>XP {currentXp}</span>
                        <span>{xpNeeded} XP</span>
                    </div>
                    <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                        <div 
                            className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full shadow-sm transition-all duration-500"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                    <div className="text-center text-[9px] font-bold text-black/30 mt-2">
                        {xpNeeded - currentXp} XP al prossimo livello
                    </div>
                </div>
            </div>
        </div>

        {/* LOGOUT */}
        <div className="sticker bg-white/80 p-6 shadow-sm rounded-3xl backdrop-blur-sm flex items-center justify-between">
            <div className="font-black text-lg">Sessione</div>
            <button 
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white font-black text-sm uppercase tracking-wider px-5 py-2 rounded-xl shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition border-2 border-black"
            >
                Logout
            </button>
        </div>

      </div>
    </div>
  );
}