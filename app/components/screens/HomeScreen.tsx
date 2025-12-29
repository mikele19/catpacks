"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { AnimatePresence, motion } from "framer-motion";
import PackArt from "../PackArt";

// --- CONFIGURAZIONE PACCHI (PNG) ---
const PACKS = [
  { 
    id: 'basic', 
    name: 'Standard', 
    cost: 10, 
    color: 'bg-stone-100 border-stone-400 text-stone-600', 
    img: '/ui/box-standard.png'
  },
  { 
    id: 'advanced', 
    name: 'Gold', 
    cost: 50, 
    color: 'bg-yellow-100 border-yellow-500 text-yellow-800', 
    img: '/ui/box-gold.png'
  },
  { 
    id: 'elite', 
    name: 'Diamond', 
    cost: 200, 
    color: 'bg-cyan-100 border-cyan-500 text-cyan-800', 
    img: '/ui/box-diamond.png'
  },
  { 
    id: 'god', 
    name: 'Godly', 
    cost: 1000, 
    color: 'bg-purple-100 border-purple-500 text-purple-900', 
    img: '/ui/box-god.png'
  },
];

type Rarity = "common" | "rare" | "epic" | "legendary" | "mythic";
type CatResult = { name: string; rarity: Rarity; image_url: string };

const tapsNeeded = 3;

function vibrate(ms: number) {
  if (typeof window !== "undefined" && "vibrate" in navigator) {
    // @ts-ignore
    navigator.vibrate(ms);
  }
}

export default function HomeScreen({
  credits,
  setCredits,
}: {
  credits: number;
  setCredits: (v: number) => void;
  onRedeem: (value: number) => void;
  lowPerfMode?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);
  const [stage, setStage] = useState<"idle" | "charging" | "opening" | "reveal">("idle");
  const [taps, setTaps] = useState(0);
  const [lastCat, setLastCat] = useState<CatResult | null>(null);

  const initials = useMemo(() => (email ? email.slice(0, 2).toUpperCase() : "ME"), [email]);
  const activePack = PACKS[activeIndex];
  const openingPack = useMemo(() => PACKS.find(p => p.id === selectedPackId), [selectedPackId]);

  const getAuthHeader = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error("Sessione non valida.");
    return { Authorization: `Bearer ${token}` };
  };

  const loadProfile = async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return setLoading(false);
    setEmail(user.email ?? "");
    const { data, error } = await supabase.from("users_profile").select("credits").eq("user_id", user.id).single();
    if (error) { await supabase.from("users_profile").upsert({ user_id: user.id, credits: 0 }); setCredits(0); } else { setCredits(data?.credits ?? 0); }
    setLoading(false);
  };

  useEffect(() => { loadProfile(); }, []);

  const claimDaily = async () => {
    setBusy(true);
    try { const headers = await getAuthHeader(); const res = await fetch("/api/claim-daily", { method: "POST", headers }); const json = await res.json(); if (!res.ok) throw new Error(json.error); setCredits(json.credits); vibrate(20); } finally { setBusy(false); }
  };

  const nextPack = () => { vibrate(5); setActiveIndex((prev) => (prev + 1) % PACKS.length); };
  const prevPack = () => { vibrate(5); setActiveIndex((prev) => (prev - 1 + PACKS.length) % PACKS.length); };
  const selectCurrentPack = () => { vibrate(10); setSelectedPackId(activePack.id); };

  const doOpenPack = async () => {
    try {
      if (!openingPack) throw new Error("Nessun pacco selezionato");
      const headers = await getAuthHeader();
      const res = await fetch("/api/open-pack", { 
        method: "POST", headers, body: JSON.stringify({ packId: openingPack.id }) 
      });
      const contentType = res.headers.get("content-type");
      if (!contentType?.includes("application/json")) throw new Error("Errore Server");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Errore sconosciuto");
      setCredits(json.credits);
      setLastCat(json.cat);
      const img = new Image();
      if (json.cat?.image_url) img.src = json.cat.image_url;
    } catch (err: any) {
      console.error(err);
      alert("ERRORE: " + err.message);
      throw err;
    }
  };

  const start = () => {
    if (busy || isRevealing) return;
    setBusy(true);
    setLastCat(null);
    setTaps(0);
    setStage("charging");
    vibrate(10);
  };

  const tap = () => {
    if (isRevealing) return;
    if (stage === "idle") { start(); return; }
    if (stage !== "charging") return;
    setTaps((t) => Math.min(tapsNeeded, t + 1));
    vibrate(6);
  };

  const fullReset = () => {
    setStage("idle");
    setIsRevealing(false);
    setTaps(0);
    setLastCat(null);
    setBusy(false);
    setSelectedPackId(null);
  };

  const softReset = () => {
    setStage("idle");
    setIsRevealing(false);
    setTaps(0);
    setLastCat(null);
    setBusy(false);
  };

  useEffect(() => {
    (async () => {
      if (stage !== "charging" || taps < tapsNeeded) return;
      setStage("opening");
      setIsRevealing(true);
      vibrate(30);
      try {
        await doOpenPack();
        await new Promise((r) => setTimeout(r, 500));
        setStage("reveal");
        vibrate(50);
      } catch (e) {
        setStage("idle");
        setIsRevealing(false);
      } finally {
        setBusy(false);
      }
    })();
  }, [taps, stage]);

  if (loading) return <div className="h-full flex items-center justify-center font-black">Caricamento...</div>;

  return (
    <div className="h-full w-full overflow-hidden relative text-black flex flex-col bg-[#FFD700]/10">
      
      {/* --- NUOVO HEADER HUD: PIENO FINO AI BORDI --- */}
      <div className="w-full bg-white border-b-4 border-black/10 px-5 py-4 flex items-center justify-between z-20 shadow-sm">
         
         {/* Monete: Squadrato con bordo deciso */}
         <div className="flex items-center gap-2 bg-yellow-100 border-2 border-yellow-500 px-3 py-1.5 rounded-xl shadow-sm">
            <img src="/ui/coin.png" alt="C" className="w-6 h-6 object-contain" />
            <span className="font-black text-xl leading-none text-yellow-800 pt-0.5">{credits}</span>
         </div>

         {/* Utente & Daily */}
         <div className="flex items-center gap-3">
             <button onClick={claimDaily} disabled={busy || isRevealing} className="bg-green-100 border-2 border-green-500 hover:bg-green-200 active:scale-95 transition h-10 px-3 rounded-xl flex items-center gap-1 shadow-sm">
                <span className="text-lg">🎁</span>
             </button>

             <div className="h-10 w-10 rounded-xl bg-stone-100 border-2 border-stone-300 flex items-center justify-center font-black text-xs text-stone-500">
                {initials}
             </div>
         </div>
      </div>

      {/* BODY CENTRALE */}
      <div className="flex-grow relative w-full flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          
          {/* FASE 1: RULLO SELEZIONE */}
          {!selectedPackId ? (
            <motion.div 
              key="carousel"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 1.5 }}
              className="w-full flex flex-col items-center justify-center pb-10"
            >
              <img src="/ui/logo.png" alt="Logo" className="w-60 mb-6 drop-shadow-xl" />

              {/* CILINDRO */}
              <div className="relative w-full max-w-sm h-64 flex items-center justify-center perspective-500">
                <button onClick={prevPack} className="absolute left-4 z-30 p-3 bg-white/50 hover:bg-white rounded-xl border-2 border-black/10 backdrop-blur-sm transition">◀</button>

                {/* Card Precedente */}
                <motion.div 
                   className="absolute left-8 opacity-40 scale-75 blur-[1px] grayscale"
                   animate={{ x: -30, rotateY: -25 }}
                >
                   <img src={PACKS[(activeIndex - 1 + PACKS.length) % PACKS.length].img} className="w-32 drop-shadow-lg" />
                </motion.div>

                {/* Card Successiva */}
                <motion.div 
                   className="absolute right-8 opacity-40 scale-75 blur-[1px] grayscale"
                   animate={{ x: 30, rotateY: 25 }}
                >
                   <img src={PACKS[(activeIndex + 1) % PACKS.length].img} className="w-32 drop-shadow-lg" />
                </motion.div>

                {/* Card ATTIVA */}
                <motion.div
                  key={activeIndex}
                  initial={{ scale: 0.8, y: 20, opacity: 0 }}
                  animate={{ scale: 1.3, y: 0, opacity: 1, rotateY: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="z-20 relative drop-shadow-2xl"
                >
                  <img src={activePack.img} className="w-40 object-contain" />
                </motion.div>

                <button onClick={nextPack} className="absolute right-4 z-30 p-3 bg-white/50 hover:bg-white rounded-xl border-2 border-black/10 backdrop-blur-sm transition">▶</button>
              </div>

              {/* BOX INFO PACCO: Rettangolo deciso con bordi spessi */}
              <div className="mt-4 flex flex-col items-center gap-4 w-full px-8">
                 
                 <div className="bg-white border-4 border-black/10 rounded-2xl p-4 w-full max-w-xs text-center shadow-sm">
                     <div className="text-3xl font-black uppercase tracking-tighter text-black">{activePack.name}</div>
                     <div className={`mt-2 inline-flex items-center gap-2 px-4 py-1.5 rounded-lg font-black text-xl border-2 ${activePack.color}`}>
                        <img src="/ui/coin.png" className="w-5 h-5" />
                        <span>{activePack.cost}</span>
                     </div>
                 </div>

                 <button 
                    onClick={selectCurrentPack}
                    className="w-full max-w-xs bg-black text-white border-b-8 border-gray-800 active:border-b-0 active:translate-y-2 rounded-2xl py-4 font-black text-2xl uppercase tracking-widest shadow-xl transition-all"
                 >
                    SCEGLI
                 </button>
              </div>

            </motion.div>
          ) : (
            
            /* FASE 2: APERTURA */
            <motion.div 
              key="opening"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="h-full w-full flex flex-col items-center justify-center pb-20"
            >
              {/* Tasto indietro deciso */}
              <button 
                onClick={() => setSelectedPackId(null)}
                disabled={busy}
                className="absolute top-4 left-4 bg-white border-2 border-black/10 px-4 py-2 rounded-xl font-black text-xs z-30 flex items-center gap-2 shadow-sm uppercase tracking-wide hover:bg-gray-50"
              >
                ◀ Cambia
              </button>

              <div className="relative pack-shadow scale-125">
                <PackArt state={stage} onTap={tap} shakeTrigger={taps} customImage={openingPack?.img} />
              </div>
              
              <div className="mt-16 h-12 flex flex-col items-center justify-center text-center">
                {stage === "idle" && openingPack && (
                    <>
                      <div className="text-3xl font-black uppercase tracking-tighter mb-2">{openingPack.name}</div>
                      <div className="text-sm font-bold bg-white/50 px-3 py-1 rounded-lg animate-pulse border-2 border-black/5">
                        TOCCA PER APRIRE
                      </div>
                    </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* MODALE DEL GATTO TROVATO */}
      <AnimatePresence>
          {stage === "reveal" && lastCat && (
          <motion.div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center p-5 bg-black/60 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.5, y: 100 }}
              animate={{ scale: 1, y: 0 }}
              className="flex flex-col items-center w-full max-w-sm"
            >
               <div className="relative mb-6">
                 <div className="absolute inset-0 bg-white/20 blur-3xl rounded-full scale-110 z-0"></div>
                 <motion.img
                  src={lastCat.image_url}
                  className="relative z-10 w-64 h-64 object-contain drop-shadow-2xl animate-float"
                  initial={{ rotate: -5 }}
                  animate={{ rotate: 0, transition: {duration: 0.5} }}
                />
            </div>

              <div className="bg-white border-4 border-black rounded-3xl p-6 w-full text-center relative z-20 shadow-[0_10px_0_rgba(0,0,0,0.2)]">
                  <div className="text-3xl font-black mb-1 text-black">{lastCat.name}</div>
                  <div className={`text-sm font-black tracking-[0.3em] uppercase rarity-${lastCat.rarity} border-2 border-current inline-block px-3 py-1 rounded-lg mb-6`}>
                    {lastCat.rarity}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={fullReset} className="py-3 font-bold text-gray-500 hover:text-black border-2 border-transparent hover:border-gray-200 rounded-xl transition">
                      ESCI
                    </button>
                    <button onClick={softReset} className="bg-yellow-400 border-b-4 border-yellow-600 text-yellow-900 rounded-xl font-black active:border-b-0 active:translate-y-1 transition shadow-lg">
                      DI NUOVO
                    </button>
                  </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <style jsx global>{`
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .perspective-500 { perspective: 500px; }
        .rarity-common { color: #6b7280; }
        .rarity-rare { color: #3b82f6; }
        .rarity-epic { color: #a855f7; }
        .rarity-legendary { color: #eab308; }
        .rarity-mythic { color: #ef4444; }
      `}</style>
    </div>
  );
}