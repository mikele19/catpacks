"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ProfileScreen({ lowPerfMode }: { lowPerfMode?: boolean }) {
  const [email, setEmail] = useState("");

  useEffect(() => {
    (async () => {
        const { data } = await supabase.auth.getUser();
        if(data.user) setEmail(data.user.email || "");
    })();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    // MODIFICA: h-full e overflow-hidden. Niente min-h-screen.
    <div className="h-full w-full overflow-hidden text-black">
      <div className="px-5 pt-10 max-w-md mx-auto">
        
        <h1 className="text-4xl font-black tracking-tight drop-shadow-sm mb-6">Profilo</h1>
        
        <div className="sticker bg-white/80 p-6 shadow-sm rounded-3xl backdrop-blur-sm mb-4">
            <div className="text-xl font-black mb-1">Giocatore</div>
            <div className="text-sm font-bold text-black/50">{email}</div>
            
            <div className="mt-4 pt-4 border-t border-black/10 flex gap-4 text-center">
                <div className="flex-1">
                    <div className="text-2xl font-black">?</div>
                    <div className="text-[10px] font-black uppercase text-black/40">Livello</div>
                </div>
                <div className="flex-1">
                    <div className="text-2xl font-black">?</div>
                    <div className="text-[10px] font-black uppercase text-black/40">Gatti</div>
                </div>
            </div>
        </div>

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