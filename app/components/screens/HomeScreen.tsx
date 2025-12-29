"use client";

import { useEffect, useMemo, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabaseClient";
import { AnimatePresence, motion } from "framer-motion";
import PackArt from "../PackArt";

type Rarity = "common" | "rare" | "epic" | "legendary" | "mythic";
type CatResult = { name: string; rarity: Rarity; image_url: string };

const tapsNeeded = 3;
const packCost = 10;

function vibrate(ms: number) {
  if (typeof window !== "undefined" && "vibrate" in navigator) {
    // @ts-ignore
    navigator.vibrate(ms);
  }
}

export default function HomeScreen({
  lowPerfMode,
  children,
  credits,
  setCredits,
  onRedeem,
}: {
  credits: number;
  setCredits: (v: number) => void;
  onRedeem: (value: number) => void;
  lowPerfMode?: boolean;
  children?: ReactNode;
}) {

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);
  const [stage, setStage] = useState<"idle" | "charging" | "opening" | "reveal">("idle");
  const [taps, setTaps] = useState(0);
  const [lastCat, setLastCat] = useState<CatResult | null>(null);

  const initials = useMemo(() => (email ? email.slice(0, 2).toUpperCase() : "ME"), [email]);

  const getAuthHeader = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error("Sessione non valida. Rifai login.");
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

  useEffect(() => { loadProfile(); /* eslint-disable-next-line */ }, []);

  const claimDaily = async () => {
    setBusy(true);
    try { const headers = await getAuthHeader(); const res = await fetch("/api/claim-daily", { method: "POST", headers }); const json = await res.json(); if (!res.ok) throw new Error(json.error); setCredits(json.credits); vibrate(20); } finally { setBusy(false); }
  };

  // --- MODIFICA FONDAMENTALE: Gestione Errori e Immagini Corrette ---
  const doOpenPack = async () => {
    try {
      const headers = await getAuthHeader();
      const res = await fetch("/api/open-pack", { method: "POST", headers });

      // 1. Controllo se il server risponde con HTML (Errore critico) invece di JSON
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        console.error("ERRORE CRITICO SERVER (NON-JSON):", text);
        throw new Error("Errore interno del server. Controlla il terminale di VS Code.");
      }

      const json = await res.json();
      
      // 2. Controllo se l'API ha risposto con un errore logico (es. monete insufficienti)
      if (!res.ok) {
        throw new Error(json.error || "Errore sconosciuto durante l'apertura");
      }

      // 3. Tutto ok: Aggiorna stato
      setCredits(json.credits);
      setLastCat(json.cat);
      
      // 4. Precarica l'immagine corretta (Usa URL dal DB, non inventato)
      const img = new Image();
      if (json.cat && json.cat.image_url) {
         img.src = json.cat.image_url;
      }

    } catch (err: any) {
      console.error("Errore doOpenPack:", err);
      alert("ERRORE APERTURA: " + err.message); // <--- Ora vedrai il messaggio di errore!
      throw err; // Blocca l'animazione e resetta
    }
  };
  // ---------------------------------------------------------------

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

  useEffect(() => {
    (async () => {
      if (stage !== "charging" || taps < tapsNeeded) return;

      setStage("opening");
      setIsRevealing(true);
      vibrate(30);

      try {
        await doOpenPack();
        // Attesa scenica
        await new Promise((r) => setTimeout(r, 500));
        setStage("reveal");
        vibrate(50);
      } catch (e) {
        console.error(e);
        // Se c'è errore, resetta tutto
        setStage("idle");
        setIsRevealing(false);
      } finally {
        setBusy(false);
      }
    })();
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taps, stage]);

  const reset = () => {
    setStage("idle");
    setIsRevealing(false);
    setTaps(0);
    setLastCat(null);
    setBusy(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-white font-black">Caricamento…</div>;

  return (
    <div className="h-full w-full overflow-hidden relative text-black">
      
      <AnimatePresence>
        {isRevealing && (
          <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="fixed inset-0 z-40 pointer-events-none"
             style={{ background: "radial-gradient(circle, rgba(255,255,255,0) 0%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,1) 100%)" }}
          />
        )}
      </AnimatePresence>

      <div className={`px-4 pt-6 max-w-md mx-auto h-full flex flex-col relative z-10 transition-opacity duration-500 ${isRevealing ? 'opacity-40 blur-sm' : 'opacity-100'}`}>
        
        <div className="flex items-center justify-center gap-3 w-full">
             <div className="sticker p-1.5 pr-5 flex items-center gap-4 rounded-full shadow-md bg-white">
                <div className="bg-yellow-100 px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-yellow-200">
    {/* PRIMA C'ERA L'EMOJI, ORA METTIAMO L'IMMAGINE */}
    <img 
      src="/ui/coin.png" 
      alt="Coin" 
      className="w-6 h-6 object-contain rounded-full shadow-sm" 
    />
    <span className="font-black text-lg leading-none text-yellow-800">{credits}</span>
</div>
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center font-black text-xs text-gray-600">
                        {initials}
                    </div>
                    <span className="text-sm font-black text-black/70">Player</span>
                </div>
            </div>
            <button onClick={claimDaily} disabled={busy || isRevealing} className="sticker h-[54px] px-4 flex items-center justify-center gap-1 bg-yellow-300 active:scale-[0.95] transition shadow-md rounded-2xl disabled:opacity-50 border-2 border-white">
                <span className="text-xl">🎁</span>
                <div className="flex flex-col items-start leading-none">
                    <span className="font-black text-[10px] text-yellow-800 uppercase tracking-wide">Daily</span>
                    <span className="font-black text-black text-lg">+20</span>
                </div>
            </button>
        </div>

        <div className="flex justify-center mt-6 mb-4">
          <img src="/ui/logo.png" alt="CatPacks Logo" className="w-80 drop-shadow-xl" />
        </div>

        <div className="mt-4 flex flex-col items-center justify-center flex-grow pb-32">
          <div className="relative pack-shadow scale-110">
            <PackArt state={stage} onTap={tap} shakeTrigger={taps} />
          </div>
          
          <div className="mt-10 h-12 flex items-center justify-center">
            {stage === "idle" && (
                <div className="mt-10 h-12 flex items-center justify-center">
  {stage === "idle" && (
      <div className="text-sm font-black text-black/40 uppercase tracking-widest flex items-center gap-2">
          PREZZO {packCost}
          {/* ANCHE QUI SOSTITUIAMO L'EMOJI */}
          <img 
            src="/ui/coin.png" 
            alt="Coin" 
            className="w-4 h-4 object-contain rounded-full opacity-60 grayscale" 
          />
      </div>
  )}
</div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
          {stage === "reveal" && lastCat && (
          <motion.div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center p-5"
            initial={{ opacity: 0, scale: 0.5, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", damping: 12, stiffness: 100, delay: 0.1 }}
          >
            <div className="relative">
                 <div className="absolute inset-0 bg-white/40 blur-3xl rounded-full scale-110 z-0"></div>
                 <motion.img
                  src={lastCat.image_url}
                  alt={lastCat.name}
                  className="relative z-10 w-72 h-72 object-contain drop-shadow-2xl animate-float"
                  initial={{ rotate: -5 }}
                  animate={{ rotate: 0, transition: {duration: 0.5} }}
                />
            </div>

            <motion.div 
                 className="sticker p-6 mt-8 w-full max-w-sm text-center relative z-20"
                 initial={{ y: 20, opacity: 0 }}
                 animate={{ y: 0, opacity: 1, transition: { delay: 0.3 } }}
            >
                <div className="text-2xl font-black mb-1">{lastCat.name}</div>
                <div className={`text-sm font-black tracking-[0.3em] uppercase rarity-${lastCat.rarity}`}>
                  {lastCat.rarity}
                </div>
                <button onClick={reset} className="mt-6 w-full ink-action py-3 text-lg">
                  continua
                </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .rarity-common { color: #6b7280; }
        .rarity-rare { color: #3b82f6; }
        .rarity-epic { color: #a855f7; }
        .rarity-legendary { color: #eab308; }
        .rarity-mythic { color: #ef4444; }
      `}</style>
    </div>
  );
}