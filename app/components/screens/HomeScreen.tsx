"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { AnimatePresence, motion } from "framer-motion";
import PackArt from "../PackArt";

// --- CONFIGURAZIONE PACCHI (TORNIAMO AI PNG) ---
const PACKS = [
  { 
    id: 'basic', 
    name: 'Standard', 
    cost: 10, 
    color: 'bg-stone-200 border-stone-400', 
    img: '/ui/box-standard.png' // PNG
  },
  { 
    id: 'advanced', 
    name: 'Gold', 
    cost: 50, 
    color: 'bg-yellow-200 border-yellow-400', 
    img: '/ui/box-gold.png'     // PNG
  },
  { 
    id: 'elite', 
    name: 'Diamond', 
    cost: 200, 
    color: 'bg-cyan-200 border-cyan-400', 
    img: '/ui/box-diamond.png'  // PNG
  },
  { 
    id: 'god', 
    name: 'Godly', 
    cost: 1000, 
    color: 'bg-purple-200 border-purple-400', 
    img: '/ui/box-god.png'      // PNG
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
  
  // STATO PER IL CAROSELLO (Indice del pacco centrale)
  const [activeIndex, setActiveIndex] = useState(0);
  
  // STATO PER LA SELEZIONE CONFERMATA (Quando clicchi "Apri")
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);

  // STATI GIOCO
  const [busy, setBusy] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);
  const [stage, setStage] = useState<"idle" | "charging" | "opening" | "reveal">("idle");
  const [taps, setTaps] = useState(0);
  const [lastCat, setLastCat] = useState<CatResult | null>(null);

  const initials = useMemo(() => (email ? email.slice(0, 2).toUpperCase() : "ME"), [email]);

  // Pacco attualmente al centro del rullo
  const activePack = PACKS[activeIndex];
  
  // Pacco effettivamente in apertura (potrebbe essere diverso se l'utente cambia idea mentre zooma)
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

  // LOGICA CAROSELLO (Avanti/Indietro)
  const nextPack = () => {
    vibrate(5);
    setActiveIndex((prev) => (prev + 1) % PACKS.length);
  };

  const prevPack = () => {
    vibrate(5);
    setActiveIndex((prev) => (prev - 1 + PACKS.length) % PACKS.length);
  };

  const selectCurrentPack = () => {
    vibrate(10);
    setSelectedPackId(activePack.id);
  };

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
    <div className="h-full w-full overflow-hidden relative text-black flex flex-col">
      
      {/* HEADER */}
      <div className="pt-6 px-4 z-20">
        <div className="flex items-center justify-center gap-3 w-full max-w-md mx-auto">
             <div className="sticker p-1.5 pr-5 flex items-center gap-4 rounded-full shadow-md bg-white">
                <div className="bg-yellow-100 px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-yellow-200">
                    <img src="/ui/coin.png" alt="C" className="w-6 h-6 object-contain rounded-full shadow-sm" />
                    <span className="font-black text-lg leading-none text-yellow-800">{credits}</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center font-black text-xs text-gray-600">
                        {initials}
                    </div>
                </div>
            </div>
            <button onClick={claimDaily} disabled={busy || isRevealing} className="sticker h-[54px] px-4 flex items-center justify-center gap-1 bg-yellow-300 active:scale-[0.95] transition shadow-md rounded-2xl disabled:opacity-50 border-2 border-white">
                <span className="text-xl">🎁</span>
            </button>
        </div>
      </div>

      <div className="flex-grow relative w-full flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          
          {/* FASE 1: RULLO SELEZIONE */}
          {!selectedPackId ? (
            <motion.div 
              key="carousel"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 1.5 }} // Zoom quando selezioni
              className="w-full flex flex-col items-center justify-center pb-20"
            >
              <img src="/ui/logo.png" alt="Logo" className="w-56 mb-8 drop-shadow-xl" />

              {/* IL CILINDRO */}
              <div className="relative w-full max-w-sm h-64 flex items-center justify-center perspective-500">
                
                {/* Tasto Sinistra */}
                <button onClick={prevPack} className="absolute left-2 z-30 p-4 text-3xl opacity-50 hover:opacity-100 transition">◀</button>

                {/* Card Precedente (sfocata a sinistra) */}
                <motion.div 
                   className="absolute left-8 opacity-40 scale-75 blur-[2px] grayscale"
                   animate={{ x: -20, rotateY: -25 }}
                >
                   <img src={PACKS[(activeIndex - 1 + PACKS.length) % PACKS.length].img} className="w-32" />
                </motion.div>

                {/* Card Successiva (sfocata a destra) */}
                <motion.div 
                   className="absolute right-8 opacity-40 scale-75 blur-[2px] grayscale"
                   animate={{ x: 20, rotateY: 25 }}
                >
                   <img src={PACKS[(activeIndex + 1) % PACKS.length].img} className="w-32" />
                </motion.div>

                {/* Card ATTIVA (Centrale) */}
                <motion.div
                  key={activeIndex}
                  initial={{ scale: 0.8, y: 20, opacity: 0 }}
                  animate={{ scale: 1.2, y: 0, opacity: 1, rotateY: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="z-20 relative drop-shadow-2xl"
                >
                  <img src={activePack.img} className="w-40 object-contain" />
                </motion.div>

                {/* Tasto Destra */}
                <button onClick={nextPack} className="absolute right-2 z-30 p-4 text-3xl opacity-50 hover:opacity-100 transition">▶</button>
              </div>

              {/* Info Pacco Attivo */}
              <div className="mt-8 text-center space-y-3">
                 <div className="text-3xl font-black uppercase tracking-tight">{activePack.name}</div>
                 
                 <div className="flex items-center justify-center gap-2 bg-white/60 px-5 py-2 rounded-full mx-auto w-max backdrop-blur-sm">
                    <img src="/ui/coin.png" className="w-5 h-5 rounded-full" />
                    <span className="font-black text-xl">{activePack.cost}</span>
                 </div>

                 <button 
                    onClick={selectCurrentPack}
                    className={`mt-4 ${activePack.color} border-b-4 text-black px-10 py-3 rounded-2xl font-black text-xl uppercase tracking-widest shadow-lg active:translate-y-1 active:shadow-none active:border-b-0 transition-all`}
                 >
                    SCEGLI
                 </button>
              </div>

            </motion.div>
          ) : (
            
            /* FASE 2: APERTURA (ZOOMED IN) */
            <motion.div 
              key="opening"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="h-full w-full flex flex-col items-center justify-center pb-32"
            >
              <button 
                onClick={() => setSelectedPackId(null)}
                disabled={busy}
                className="absolute top-0 left-4 bg-white/80 p-2 px-4 rounded-full shadow-md font-black text-xs z-30 flex items-center gap-1"
              >
                ◀ CAMBIA PACCO
              </button>

              <div className="relative pack-shadow scale-125">
                {/* Mostriamo l'immagine ferma finché non si apre */}
                <PackArt state={stage} onTap={tap} shakeTrigger={taps} customImage={openingPack?.img} />
              </div>
              
              <div className="mt-12 h-12 flex flex-col items-center justify-center">
                {stage === "idle" && openingPack && (
                    <>
                      <div className="text-2xl font-black uppercase tracking-widest mb-2">{openingPack.name}</div>
                      <div className="text-xs font-bold opacity-50 mt-2 animate-pulse">Tocca il pacco per aprire</div>
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
            className="fixed inset-0 z-50 flex flex-col items-center justify-center p-5 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.5, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              className="flex flex-col items-center"
            >
               <div className="relative">
                 <div className="absolute inset-0 bg-white/40 blur-3xl rounded-full scale-110 z-0"></div>
                 <motion.img
                  src={lastCat.image_url}
                  className="relative z-10 w-72 h-72 object-contain drop-shadow-2xl animate-float"
                  initial={{ rotate: -5 }}
                  animate={{ rotate: 0, transition: {duration: 0.5} }}
                />
            </div>

              <div className="sticker bg-white p-6 mt-8 w-full max-w-sm text-center relative z-20 shadow-2xl rounded-3xl">
                  <div className="text-3xl font-black mb-1">{lastCat.name}</div>
                  <div className={`text-sm font-black tracking-[0.3em] uppercase rarity-${lastCat.rarity}`}>
                    {lastCat.rarity}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mt-6">
                    <button onClick={fullReset} className="py-3 font-bold text-gray-400 hover:text-black">
                      Esci
                    </button>
                    <button onClick={softReset} className="bg-yellow-400 border-2 border-black rounded-xl font-black shadow-[2px_2px_0px_black] active:translate-y-0.5 active:shadow-none transition">
                      Di nuovo
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