"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { AnimatePresence, motion } from "framer-motion";
import PackArt from "../PackArt";

// --- CONFIGURAZIONE PACCHI (Con Colori) ---
const PACKS = [
  { 
    id: 'basic', 
    name: 'Standard', 
    cost: 10, 
    img: '/ui/box-standard.png',
    // Colori specifici per questo pacco (Testo scuro per leggibilità su grigio)
    textColor: 'text-stone-600',
    accentColor: 'text-stone-500'
  },
  { 
    id: 'advanced', 
    name: 'Gold', 
    cost: 50, 
    img: '/ui/box-gold.png',
    textColor: 'text-yellow-700', // Oro scuro
    accentColor: 'text-yellow-600'
  },
  { 
    id: 'elite', 
    name: 'Diamond', 
    cost: 200, 
    img: '/ui/box-diamond.png',
    textColor: 'text-cyan-700', // Ciano scuro
    accentColor: 'text-cyan-600'
  },
  { 
    id: 'god', 
    name: 'Godly', 
    cost: 1000, 
    img: '/ui/box-god.png',
    textColor: 'text-purple-800', // Viola scuro
    accentColor: 'text-purple-600'
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

  const tap = () => {
    if (isRevealing) return;
    if (stage === "idle") { 
        if (busy || isRevealing) return;
        setBusy(true);
        setLastCat(null);
        setTaps(0);
        setStage("charging");
        vibrate(10);
        return; 
    }
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
      vibrate(40);

      try {
        await Promise.all([
            doOpenPack(),
            new Promise((r) => setTimeout(r, 200)) 
        ]);
        setStage("reveal");
        setIsRevealing(false);
        vibrate(50);
      } catch (e) {
        setStage("idle");
        setIsRevealing(false);
      } finally {
        setBusy(false);
      }
    })();
  }, [taps, stage]);

  if (loading) return <div className="h-full flex items-center justify-center font-black text-gray-400">Caricamento...</div>;

  return (
    <div className="h-full w-full overflow-hidden relative flex flex-col bg-[#e0e0e0]">
      
      <AnimatePresence>
        {isRevealing && (
          <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             transition={{ duration: 0.2 }}
             className="fixed inset-0 z-40 pointer-events-none"
             style={{ background: "radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,255,255,1) 80%)" }}
          />
        )}
      </AnimatePresence>

      {/* HEADER */}
      <div className="pt-6 px-4 flex items-start justify-between gap-3 w-full max-w-md mx-auto z-20">
         <div className="flex-1 h-14 soft-ui-sm flex items-center px-4 gap-3">
            <img src="/ui/coin.png" alt="C" className="w-8 h-8 object-contain opacity-80" />
            <span className="font-black text-2xl pt-1 text-gray-600">{credits}</span>
         </div>

         <div className="flex items-center gap-4">
             <button 
                onClick={claimDaily} 
                disabled={busy || isRevealing} 
                className="h-14 w-14 soft-ui-sm soft-btn flex items-center justify-center text-2xl"
             >
                🎁
             </button>
             <div className="h-14 w-14 soft-ui-sm flex items-center justify-center font-black text-sm text-gray-500">
                {initials}
             </div>
         </div>
      </div>

      {/* CENTRO */}
      <div className="flex-grow relative w-full flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          
          {/* FASE 1: CAROSELLO */}
          {!selectedPackId ? (
            <motion.div 
              key="carousel"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 1.2 }}
              className="w-full flex flex-col items-center justify-center pb-10"
            >
              <img src="/ui/logo.png" alt="Logo" className="w-60 mb-8 drop-shadow-md opacity-80 mix-blend-multiply" />

              <div className="relative w-full max-w-sm h-64 flex items-center justify-center perspective-500">
                <button onClick={prevPack} className="absolute left-4 z-30 h-12 w-12 soft-ui-sm soft-btn flex items-center justify-center text-gray-400 text-lg hover:text-gray-600">◀</button>
                
                <motion.div className="absolute left-8 opacity-40 scale-75 blur-[1px] grayscale" animate={{ x: -30, rotateY: -25 }}>
                   <img src={PACKS[(activeIndex - 1 + PACKS.length) % PACKS.length].img} className="w-32 drop-shadow-xl" />
                </motion.div>
                <motion.div className="absolute right-8 opacity-40 scale-75 blur-[1px] grayscale" animate={{ x: 30, rotateY: 25 }}>
                   <img src={PACKS[(activeIndex + 1) % PACKS.length].img} className="w-32 drop-shadow-xl" />
                </motion.div>
                
                <motion.div
                  key={activeIndex}
                  initial={{ scale: 0.8, y: 20, opacity: 0 }}
                  animate={{ scale: 1.3, y: 0, opacity: 1, rotateY: 0 }}
                  className="z-20 relative drop-shadow-2xl"
                >
                  <img src={activePack.img} className="w-40 object-contain" />
                </motion.div>

                <button onClick={nextPack} className="absolute right-4 z-30 h-12 w-12 soft-ui-sm soft-btn flex items-center justify-center text-gray-400 text-lg hover:text-gray-600">▶</button>
              </div>

              {/* INFO BOX (Soft UI con TESTO COLORATO) */}
              <div className="mt-8 flex flex-col items-center gap-6 w-full px-8">
                 
                 <div className="soft-ui px-8 py-6 w-full max-w-xs text-center flex flex-col items-center gap-3">
                     {/* Titolo Colorato in base alla rarità */}
                     <div className={`text-2xl font-black uppercase tracking-widest ${activePack.textColor}`}>
                        {activePack.name}
                     </div>
                     <div className="soft-ui-sm px-5 py-2 flex items-center gap-2">
                        <img src="/ui/coin.png" className="w-4 h-4 opacity-70" />
                        <span className={`font-bold text-lg ${activePack.accentColor}`}>{activePack.cost}</span>
                     </div>
                 </div>

                 {/* Tasto SCEGLI con testo colorato */}
                 <button 
                    onClick={selectCurrentPack} 
                    className={`w-full max-w-xs soft-ui soft-btn py-4 font-black text-xl uppercase tracking-[0.2em] ${activePack.textColor}`}
                 >
                    SCEGLI
                 </button>
              </div>

            </motion.div>
          ) : (
            
            /* FASE 2: APERTURA */
            <motion.div 
              key="opening"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="h-full w-full flex flex-col items-center justify-center pb-20"
            >
              <button 
                onClick={() => setSelectedPackId(null)} 
                disabled={busy} 
                className="absolute top-4 left-4 soft-ui-sm soft-btn px-4 py-2 font-black text-xs z-30 uppercase tracking-wide text-gray-500 flex items-center gap-2"
              >
                ◀ Indietro
              </button>

              <div className="relative pack-shadow scale-125">
                <PackArt state={stage} onTap={tap} shakeTrigger={taps} customImage={openingPack?.img} />
              </div>
              
              <div className="mt-16 text-center">
                {stage === "idle" && openingPack && (
                    <div className={`text-sm font-bold animate-pulse tracking-widest ${openingPack.textColor}`}>
                        TOCCA PER APRIRE
                    </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* MODALE DEL GATTO */}
      <AnimatePresence>
          {stage === "reveal" && lastCat && (
          <motion.div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center p-5 bg-black/40 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.5, y: 100 }}
              animate={{ scale: 1, y: 0 }}
              className="flex flex-col items-center w-full max-w-sm"
            >
               <div className="relative mb-8">
                 <div className="absolute inset-0 bg-white/40 blur-3xl rounded-full scale-110 z-0"></div>
                 <motion.img
                  src={lastCat.image_url}
                  className="relative z-10 w-64 h-64 object-contain drop-shadow-2xl animate-float"
                  initial={{ rotate: -5 }}
                  animate={{ rotate: 0, transition: {duration: 0.5} }}
                />
            </div>

              <div className="soft-ui p-8 w-full text-center relative z-20">
                  <div className="text-3xl font-black mb-2 text-gray-800">{lastCat.name}</div>
                  <div className={`text-xs font-black tracking-[0.3em] uppercase rarity-${lastCat.rarity} border border-current inline-block px-3 py-1 rounded-full mb-8 opacity-70`}>
                    {lastCat.rarity}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={fullReset} className="py-3 font-bold text-gray-400 hover:text-gray-600 transition">
                      ESCI
                    </button>
                    <button onClick={softReset} className="soft-ui soft-btn py-3 font-black text-gray-700 text-sm tracking-wide">
                      DI NUOVO
                    </button>
                  </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <style jsx global>{`
        /* ... animazioni varie ... */
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