"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { AnimatePresence, motion } from "framer-motion";
import PackArt from "../PackArt";

// --- CONFIGURAZIONE PACCHI ---
const PACKS = [
  { 
    id: 'basic', name: 'Standard', cost: 10, img: '/ui/box-standard.png',
    bgColor: 'bg-stone-100', textColor: 'text-stone-600', pillColor: 'bg-stone-200'
  },
  { 
    id: 'advanced', name: 'Gold', cost: 50, img: '/ui/box-gold.png',
    bgColor: 'bg-yellow-400', textColor: 'text-yellow-900', pillColor: 'bg-yellow-500/30'
  },
  { 
    id: 'elite', name: 'Diamond', cost: 200, img: '/ui/box-diamond.png',
    bgColor: 'bg-cyan-400', textColor: 'text-cyan-900', pillColor: 'bg-cyan-500/30'
  },
  { 
    id: 'god', name: 'Godly', cost: 1000, img: '/ui/box-god.png',
    bgColor: 'bg-purple-500', textColor: 'text-white', pillColor: 'bg-purple-700/30'
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
  const [loading, setLoading] = useState(true);
  
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);
  const [stage, setStage] = useState<"idle" | "charging" | "opening" | "reveal">("idle");
  const [taps, setTaps] = useState(0);
  const [lastCat, setLastCat] = useState<CatResult | null>(null);
  
  const [lastXp, setLastXp] = useState(0);
  const [isNewCat, setIsNewCat] = useState(false);

  // --- STATI PER IL REGALO GIORNALIERO ---
  const [canRedeem, setCanRedeem] = useState(true);
  const [timeLeft, setTimeLeft] = useState("");

  const packPromiseRef = useRef<Promise<any> | null>(null);

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
    
    const { data, error } = await supabase.from("users_profile").select("credits").eq("user_id", user.id).single();
    if (error) { await supabase.from("users_profile").upsert({ user_id: user.id, credits: 0 }); setCredits(0); } else { setCredits(data?.credits ?? 0); }
    setLoading(false);
  };

  // --- LOGICA TIMER GIORNALIERO (Con Secondi) ---
  useEffect(() => { 
    loadProfile(); 

    const checkTimer = () => {
        const lastRedeem = localStorage.getItem("lastDailyRedeem");
        if (lastRedeem) {
            const diff = Date.now() - parseInt(lastRedeem);
            const oneDay = 24 * 60 * 60 * 1000;
            
            if (diff < oneDay) {
                setCanRedeem(false);
                const remaining = oneDay - diff;
                
                const hours = Math.floor(remaining / (1000 * 60 * 60));
                const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
                
                // Formatta con lo zero davanti (es: 04:05:09)
                const h = hours.toString().padStart(2, '0');
                const m = minutes.toString().padStart(2, '0');
                const s = seconds.toString().padStart(2, '0');
                
                setTimeLeft(`${h}:${m}:${s}`);
            } else {
                setCanRedeem(true);
                setTimeLeft("");
            }
        }
    };
    
    checkTimer();
    const interval = setInterval(checkTimer, 1000); // Aggiorna ogni secondo
    return () => clearInterval(interval);
  }, []);

  const claimDaily = async () => {
    if (!canRedeem) return;
    setBusy(true);
    try { 
        const headers = await getAuthHeader(); 
        const res = await fetch("/api/claim-daily", { method: "POST", headers }); 
        const json = await res.json(); 
        if (!res.ok) throw new Error(json.error); 
        
        setCredits(json.credits); 
        vibrate(20);
        
        localStorage.setItem("lastDailyRedeem", Date.now().toString());
        setCanRedeem(false);
        alert("Hai ricevuto 20 monete!");
    } catch(e: any) {
        alert(e.message);
    } finally { 
        setBusy(false); 
    }
  };

  const nextPack = () => { vibrate(5); setActiveIndex((prev) => (prev + 1) % PACKS.length); };
  const prevPack = () => { vibrate(5); setActiveIndex((prev) => (prev - 1 + PACKS.length) % PACKS.length); };
  const selectCurrentPack = () => { vibrate(10); setSelectedPackId(activePack.id); };

  const startPackFetch = () => {
    if (!openingPack) return;
    packPromiseRef.current = (async () => {
        const headers = await getAuthHeader();
        const res = await fetch("/api/open-pack", { 
          method: "POST", headers, body: JSON.stringify({ packId: openingPack.id }) 
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Errore sconosciuto");
        return json;
    })();
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
        startPackFetch();
        return; 
    }
    if (stage !== "charging") return;
    setTaps((t) => Math.min(tapsNeeded, t + 1));
    vibrate(6);
  };

  const resetAll = () => {
    setStage("idle");
    setIsRevealing(false);
    setTaps(0);
    setLastCat(null);
    setBusy(false);
    setLastXp(0);
    setIsNewCat(false);
    packPromiseRef.current = null;
  };

  const fullReset = () => {
    resetAll();
    setSelectedPackId(null);
  };

  useEffect(() => {
    (async () => {
      if (stage !== "charging" || taps < tapsNeeded) return;
      setStage("opening");
      setIsRevealing(true);
      vibrate(40);

      try {
        if (!packPromiseRef.current) throw new Error("Errore fetch mancante");
        const json = await packPromiseRef.current;
        setCredits(json.credits);
        setLastCat(json.cat);
        setLastXp(json.xpGained || 0);
        setIsNewCat(json.isNew || false);
        setStage("reveal");
        setIsRevealing(false);
        vibrate(50);
      } catch (err: any) {
        console.error(err);
        alert("Ops: " + err.message);
        resetAll();
      } finally {
        setBusy(false);
      }
    })();
  }, [taps, stage]);

  if (loading) return <div className="h-full flex items-center justify-center font-black text-white">Caricamento...</div>;

  return (
    <div className="h-full w-full overflow-hidden relative flex flex-col"
         style={{ background: "radial-gradient(circle, #ffd700 0%, #ffac00 100%)" }}>
      
      <div className="absolute inset-[-50%] w-[200%] h-[200%] opacity-20 bg-[repeating-conic-gradient(from_0deg,#ffffff_0deg_10deg,transparent_10deg_20deg)] animate-spin-slow pointer-events-none mix-blend-overlay"></div>

      <AnimatePresence>
        {isRevealing && (
          <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0, transition: { duration: 0.2 } }}
             transition={{ duration: 0.05 }}
             className="fixed inset-0 z-40 pointer-events-none"
             style={{ background: "radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,1) 80%)" }}
          />
        )}
      </AnimatePresence>

      {/* --- HEADER COMPATTO: MONETE + REGALO --- */}
      <div className="pt-4 px-4 w-full max-w-md mx-auto z-20 relative flex items-center justify-center gap-3">
         
         {/* BOX MONETE */}
         <div className="h-12 soft-ui-sm flex items-center px-5 gap-3 bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm flex-1 justify-center">
            <img src="/ui/coin.png" alt="C" className="w-6 h-6 object-contain" />
            <span className="font-black text-2xl pt-1 text-yellow-900">{credits}</span>
         </div>

         {/* BOX REGALO (Piccolo e a fianco) */}
         <button
            onClick={claimDaily}
            disabled={!canRedeem || busy || isRevealing}
            className={`h-12 soft-ui-sm px-4 rounded-2xl flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 flex-1
                ${canRedeem 
                    ? "bg-white/90 text-yellow-900 border-b-4 border-yellow-200" 
                    : "bg-black/10 text-black/40 border-b-4 border-transparent"
                }
            `}
         >
            <span className="text-xl">🎁</span>
            <span className="font-black text-xs uppercase pt-0.5 tracking-wide">
                {canRedeem ? "RISCATTA" : timeLeft}
            </span>
         </button>

      </div>

      <div className="flex-grow relative w-full flex flex-col items-center justify-center z-10 pb-16">
        <AnimatePresence mode="wait">
          {!selectedPackId ? (
            <motion.div key="carousel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.2 }} className="w-full flex flex-col items-center justify-center">
              <img src="/ui/logo.png" alt="Logo" className="w-48 mb-4 drop-shadow-xl" />
              <div className="relative w-full max-w-sm h-56 flex items-center justify-center perspective-500">
                <button onClick={prevPack} className="absolute left-2 z-30 h-10 w-10 soft-ui-sm soft-btn flex items-center justify-center text-gray-500 bg-white/80 text-lg">◀</button>
                <motion.div className="absolute left-6 opacity-40 scale-75 blur-[1px] grayscale" animate={{ x: -25, rotateY: -25 }}>
                   <img src={PACKS[(activeIndex - 1 + PACKS.length) % PACKS.length].img} className="w-28 drop-shadow-xl" />
                </motion.div>
                <motion.div className="absolute right-6 opacity-40 scale-75 blur-[1px] grayscale" animate={{ x: 25, rotateY: 25 }}>
                   <img src={PACKS[(activeIndex + 1) % PACKS.length].img} className="w-28 drop-shadow-xl" />
                </motion.div>
                <motion.div key={activeIndex} initial={{ scale: 0.8, y: 20, opacity: 0 }} animate={{ scale: 1.3, y: 0, opacity: 1, rotateY: 0 }} className="z-20 relative drop-shadow-2xl">
                  <img src={activePack.img} className="w-36 object-contain" />
                </motion.div>
                <button onClick={nextPack} className="absolute right-2 z-30 h-10 w-10 soft-ui-sm soft-btn flex items-center justify-center text-gray-500 bg-white/80 text-lg">▶</button>
              </div>
              <div className="mt-2 flex flex-col items-center gap-4 w-full px-6">
                 <div className={`soft-ui px-6 py-4 w-full max-w-[240px] text-center flex flex-col items-center gap-2 ${activePack.bgColor}`}>
                     <div className={`text-xl font-black uppercase tracking-widest ${activePack.textColor}`}>{activePack.name}</div>
                     <div className={`soft-ui-sm px-4 py-1.5 flex items-center gap-1.5 ${activePack.pillColor}`}>
                        <img src="/ui/coin.png" className="w-4 h-4" />
                        <span className={`font-bold text-base ${activePack.textColor}`}>{activePack.cost}</span>
                     </div>
                 </div>
                 <button onClick={selectCurrentPack} className="w-full max-w-[240px] soft-ui soft-btn py-3 font-black text-lg uppercase tracking-[0.2em] bg-black text-white border-2 border-white/20 shadow-lg">SCEGLI</button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="opening" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="h-full w-full flex flex-col items-center justify-center pb-20">
              <button onClick={() => setSelectedPackId(null)} disabled={busy} className="absolute top-4 left-4 soft-ui-sm soft-btn px-3 py-1.5 font-black text-[10px] z-30 uppercase tracking-wide text-gray-600 bg-white/90 flex items-center gap-1">◀ Indietro</button>
              <div className="relative pack-shadow scale-125">
                <PackArt state={stage} onTap={tap} shakeTrigger={taps} customImage={openingPack?.img} />
              </div>
              <div className="mt-16 text-center">
                {stage === "idle" && openingPack && (<div className="text-sm font-bold animate-pulse tracking-widest text-white drop-shadow-md">TOCCA PER APRIRE</div>)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
          {stage === "reveal" && lastCat && (
          <motion.div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center p-5 bg-black/60 backdrop-blur-md"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div initial={{ scale: 0.5, y: 100 }} animate={{ scale: 1, y: 0 }} className="flex flex-col items-center w-full max-w-sm">
               
               <div className="relative mb-6">
                 <div className="absolute inset-0 bg-white/30 blur-3xl rounded-full scale-110 z-0"></div>
                 
                 <motion.div 
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, type: "spring" }}
                    className="absolute -top-2 -right-2 bg-green-500 text-white font-black text-sm px-3 py-1 rounded-full shadow-lg border-2 border-white z-30 transform rotate-12"
                 >
                    +{lastXp} XP
                 </motion.div>

                 {isNewCat && (
                    <motion.div 
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2, type: "spring" }}
                        className="absolute -top-2 left-0 bg-yellow-400 text-yellow-900 font-black text-sm px-3 py-1 rounded-full shadow-lg border-2 border-white z-30 transform -rotate-12"
                    >
                        NEW!
                    </motion.div>
                 )}

                 <motion.img src={lastCat.image_url} className="relative z-10 w-56 h-56 object-contain drop-shadow-2xl animate-float" initial={{ rotate: -5 }} animate={{ rotate: 0, transition: {duration: 0.5} }} />
              </div>

              <div className="soft-ui p-6 w-full text-center relative z-20 bg-white">
                  <div className="text-2xl font-black mb-1 text-gray-800">{lastCat.name}</div>
                  <div className={`text-[10px] font-black tracking-[0.3em] uppercase rarity-${lastCat.rarity} border border-current inline-block px-3 py-1 rounded-full mb-6 opacity-70`}>{lastCat.rarity}</div>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={fullReset} className="py-2.5 font-bold text-gray-400 hover:text-gray-600 transition text-sm">ESCI</button>
                    <button onClick={resetAll} className="soft-ui soft-btn py-2.5 font-black text-gray-700 text-sm tracking-wide bg-yellow-400">DI NUOVO</button>
                  </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <style jsx global>{`
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 40s linear infinite; }
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