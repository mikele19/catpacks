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

  const doOpenPack = async () => {
    const headers = await getAuthHeader();
    const res = await fetch("/api/open-pack", { method: "POST", headers });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Errore apertura");
    setCredits(json.credits);
    setLastCat(json.cat);
    const img = new Image();
    img.src = `/ui/cat-${json.cat.rarity}.png`;
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
        console.error(e);
        setStage("idle");
        setIsRevealing(false);
      } finally {
        setBusy(false);
      }
    })();
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taps, stage]);

  const skip = async () => {
    if (stage === "reveal" || busy || isRevealing) return;
    setStage("opening");
    setBusy(true);
    setIsRevealing(true);
    try {
      await doOpenPack();
      setStage("reveal");
      vibrate(30);
    } catch {
      setStage("idle");
      setIsRevealing(false);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setStage("idle");
    setIsRevealing(false);
    setTaps(0);
    setLastCat(null);
    setBusy(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-white font-black">Caricamento…</div>;

  return (
    <div 
      className="min-h-screen text-black bg-cover bg-center bg-no-repeat overflow-hidden relative"
      style={{ backgroundImage: "url('/ui/bg.png')" }}
    >
      <AnimatePresence>
        {isRevealing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-40 pointer-events-none"
            style={{
                background: "radial-gradient(circle at center, rgba(255,255,220,1) 0%, rgba(255,230,150,0.8) 40%, rgba(255,215,0,0) 70%)"
            }}
          />
        )}
      </AnimatePresence>

      <div className={`px-5 pt-5 max-w-md mx-auto pb-28 relative z-10 transition-opacity duration-500 ${isRevealing ? 'opacity-40 blur-sm' : 'opacity-100'}`}>
        <div className="flex items-center justify-between">
          <div className="sticker px-3 py-2 flex items-center gap-2">
            <span className="text-lg">🪙</span><div className="font-black text-lg leading-none">{credits}</div>
          </div>
          <button className="sticker px-3 py-2 flex items-center gap-2 active:scale-[0.99] transition">
            <div className="h-9 w-9 rounded-2xl border-2 border-black/10 bg-white/70 flex items-center justify-center font-black">{initials}</div>
            <div className="text-xs font-black text-black/60">Player</div>
          </button>
        </div>

        <div className="mt-7">
          <div className="text-5xl font-black leading-none tracking-tight">CatPacks</div>
          {/* RIMOSSO: Percentuale rimossa */}
          <div className="mt-2 text-sm muted font-black">pack <span className="text-black">{packCost}</span></div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button onClick={claimDaily} disabled={busy || isRevealing} className="ink-action disabled:opacity-40">+20 daily</button>
          <button onClick={stage === "idle" ? start : skip} disabled={busy || isRevealing} className="ink-action disabled:opacity-40">{stage === "idle" ? "start" : "skip"}</button>
        </div>

        <div className="mt-16 flex flex-col items-center">
          <div className="relative pack-shadow">
            <PackArt state={stage} onTap={tap} shakeTrigger={taps} />
          </div>
          
          {/* RIMOSSO: Testo 'tap tap tap' rimosso. Appare testo solo se idle. */}
          <div className="mt-6 text-sm muted font-black h-6">
            {stage === "idle" ? "tocca il pacco per aprire" : ""}
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
                  src={`/ui/cat-${lastCat.rarity}.png`}
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