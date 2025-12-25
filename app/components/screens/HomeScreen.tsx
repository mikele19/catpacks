"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { AnimatePresence, motion } from "framer-motion";
import PackArt from "@/app/components/PackArt";

type Rarity = "common" | "rare" | "epic" | "legendary" | "mythic";
type CatResult = { name: string; rarity: Rarity; image_url: string };

const tapsNeeded = 10;
const packCost = 10;

function vibrate(ms: number) {
  if (typeof window !== "undefined" && "vibrate" in navigator) {
    // @ts-ignore
    navigator.vibrate(ms);
  }
}

export default function HomeScreen({ lowPerfMode }: { lowPerfMode?: boolean }) {
  const [email, setEmail] = useState("");
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);

  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<"idle" | "charging" | "opening" | "reveal">("idle");
  const [taps, setTaps] = useState(0);
  const [lastCat, setLastCat] = useState<CatResult | null>(null);

  const initials = useMemo(() => (email ? email.slice(0, 2).toUpperCase() : "ME"), [email]);
  const progress = Math.round((taps / tapsNeeded) * 100);

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

    const { data, error } = await supabase
      .from("users_profile")
      .select("credits")
      .eq("user_id", user.id)
      .single();

    if (error) {
      await supabase.from("users_profile").upsert({ user_id: user.id, credits: 0 });
      setCredits(0);
    } else {
      setCredits(data?.credits ?? 0);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const claimDaily = async () => {
    setBusy(true);
    try {
      const headers = await getAuthHeader();
      const res = await fetch("/api/claim-daily", { method: "POST", headers });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Errore claim");
      setCredits(json.credits);
      vibrate(20);
    } finally {
      setBusy(false);
    }
  };

  const doOpenPack = async () => {
    const headers = await getAuthHeader();
    const res = await fetch("/api/open-pack", { method: "POST", headers });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Errore apertura");
    setCredits(json.credits);
    setLastCat(json.cat);
  };

  const start = () => {
    if (busy) return;
    setBusy(true);
    setLastCat(null);
    setTaps(0);
    setStage("charging");
    vibrate(10);
  };

  const tap = () => {
    if (stage !== "charging") return;
    setTaps((t) => Math.min(tapsNeeded, t + 1));
    vibrate(8);
  };

  useEffect(() => {
    (async () => {
      if (stage !== "charging") return;
      if (taps < tapsNeeded) return;

      setStage("opening");
      vibrate(25);

      try {
        await doOpenPack();
        await new Promise((r) => setTimeout(r, 320));
        setStage("reveal");
        vibrate(30);
      } catch {
        setStage("idle");
      } finally {
        setBusy(false);
      }
    })();
  }, [taps, stage]);

  const skip = async () => {
    if (stage === "reveal" || busy) return;
    setStage("opening");
    setBusy(true);
    try {
      await doOpenPack();
      setStage("reveal");
      vibrate(25);
    } catch {
      setStage("idle");
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setStage("idle");
    setTaps(0);
    setLastCat(null);
    setBusy(false);
  };

  if (loading) {
    return <div className="min-h-screen text-white flex items-center justify-center">Caricamento…</div>;
  }

  return (
    <div className="min-h-screen text-white">
      <div className="px-5 pt-5 max-w-md mx-auto pb-28">
        {/* Top bar minimal */}
        <div className="flex items-center justify-between">
          <div className="sketch-chip px-3 py-2 flex items-center gap-2">
            <img src="/ui/coin.svg" alt="Coin" className="h-6 w-6" />
            <div className="font-black text-lg leading-none">{credits}</div>
          </div>

          <div className="sketch-chip px-3 py-2 flex items-center gap-2">
            <div className="h-9 w-9 rounded-2xl border-2 border-white/20 bg-white/5 flex items-center justify-center font-black">
              {initials}
            </div>
            <div className="text-xs text-white/70 font-bold">Player</div>
          </div>
        </div>

        {/* Title */}
        <div className="mt-7">
          <div className="text-4xl font-black sketch-title">CatPacks</div>
          <div className="text-sm text-white/60 mt-2">
            Pack <span className="font-black text-white/80">{packCost}</span>
            {stage === "charging" && <span className="ml-2 text-white/50">• {progress}%</span>}
          </div>
        </div>

        {/* Small actions row */}
        <div className="mt-4 flex items-center gap-3">
          <button onClick={claimDaily} disabled={busy} className="sketch-btn-solid px-5 py-3 font-black disabled:opacity-40">
            Daily +20
          </button>

          <button
            onClick={stage === "idle" ? start : skip}
            disabled={busy}
            className="sketch-btn flex-1 py-3 font-black disabled:opacity-40"
          >
            {stage === "idle" ? "Start" : "Skip"}
          </button>
        </div>

        {/* Single main card */}
        <div className="mt-5 sketch-card p-5">
          <div className="h-[420px] flex items-center justify-center relative overflow-hidden rounded-[20px] border-2 border-white/10 bg-black/30">
            <AnimatePresence>
              {stage === "opening" && !lowPerfMode && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.65, 0] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.32 }}
                  className="absolute inset-0 bg-white"
                />
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {stage !== "reveal" && (
                <motion.button
                  key="pack"
                  onClick={stage === "idle" ? start : tap}
                  initial={{ opacity: 0, y: 10, scale: 0.985 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.985 }}
                  transition={{ duration: 0.16 }}
                  className="relative"
                >
                  <PackArt state={stage === "idle" ? "idle" : stage === "charging" ? "charging" : "opening"} />
                  <div className="mt-4 text-center text-sm text-white/65 font-semibold">
                    {stage === "idle" ? "Tocca per aprire" : "Tocca…"}
                  </div>
                </motion.button>
              )}

              {stage === "reveal" && lastCat && (
                <motion.div
                  key="reveal"
                  initial={{ opacity: 0, y: 10, scale: 0.985 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.16 }}
                  className="w-full px-2"
                >
                  <div className="sketch-card p-4">
                    <div className="flex items-center justify-between">
                      <div className="font-black text-lg">{lastCat.name}</div>
                      <div className="text-[11px] font-black tracking-[0.22em] text-white/70">
                        {lastCat.rarity.toUpperCase()}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-center">
                      <motion.img
                        src={lastCat.image_url}
                        alt={lastCat.name}
                        loading="lazy"
                        decoding="async"
                        className="h-56 w-56 rounded-[22px] border-2 border-white/10"
                        initial={{ scale: 0.93 }}
                        animate={{ scale: [0.93, 1.03, 1] }}
                        transition={{ duration: 0.28 }}
                      />
                    </div>

                    <div className="mt-4">
                      <button onClick={reset} className="sketch-btn-solid w-full py-3 font-black">
                        Continua
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
