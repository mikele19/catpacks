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
    vibrate(6);
  };

  useEffect(() => {
    (async () => {
      if (stage !== "charging") return;
      if (taps < tapsNeeded) return;

      setStage("opening");
      vibrate(20);

      try {
        await doOpenPack();
        await new Promise((r) => setTimeout(r, 220));
        setStage("reveal");
        vibrate(25);
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
      vibrate(20);
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
    return <div className="min-h-screen flex items-center justify-center text-black/70">Caricamento…</div>;
  }

  return (
    <div className="min-h-screen text-black">
      <div className="px-5 pt-5 max-w-md mx-auto pb-28">
        {/* top stickers (light paper) */}
        <div className="flex items-center justify-between">
          <div className="sticker px-3 py-2 flex items-center gap-2">
            {/* se coin.svg non c’è ancora, va bene anche questa fallback */}
            <span className="text-lg">🪙</span>
            <div className="font-black text-lg leading-none">{credits}</div>
          </div>

          <button className="sticker px-3 py-2 flex items-center gap-2 active:scale-[0.99] transition">
            <div className="h-9 w-9 rounded-2xl border-2 border-black/10 bg-white/70 flex items-center justify-center font-black">
              {initials}
            </div>
            <div className="text-xs font-black text-black/60">Player</div>
          </button>
        </div>

        {/* title */}
        <div className="mt-7">
          <div className="text-5xl font-black leading-none tracking-tight">
            CatPacks
          </div>
          <div className="mt-2 text-sm muted font-black">
            pack <span className="text-black">{packCost}</span>
            {stage === "charging" && <span className="ml-2">• {progress}%</span>}
          </div>
        </div>

        {/* micro actions */}
        <div className="mt-4 flex items-center justify-between">
          <button onClick={claimDaily} disabled={busy} className="ink-action disabled:opacity-40">
            +20 daily
          </button>

          <button
            onClick={stage === "idle" ? start : skip}
            disabled={busy}
            className="ink-action disabled:opacity-40"
          >
            {stage === "idle" ? "start" : "skip"}
          </button>
        </div>

        {/* Pack: NO cards, just the sticker pack */}
        <div className="mt-8 flex flex-col items-center">
          <div className="relative">
            <AnimatePresence>
              {stage === "opening" && !lowPerfMode && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.35, 0] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="absolute inset-[-22px] rounded-[60px] bg-white"
                />
              )}
            </AnimatePresence>

            <motion.button
              onClick={stage === "idle" ? start : tap}
              disabled={busy && stage === "idle"}
              className="pack-shadow"
              whileTap={{ scale: 0.985, rotate: stage === "charging" ? -0.3 : 0 }}
            >
              <PackArt state={stage === "idle" ? "idle" : stage === "charging" ? "charging" : "opening"} />
            </motion.button>
          </div>

          <div className="mt-4 text-sm muted font-black">
            {stage === "idle" ? "tocca per aprire" : "tap tap tap…"}
          </div>
        </div>

        {/* Reveal: one clean sticker */}
        <AnimatePresence>
          {stage === "reveal" && lastCat && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.99 }}
              transition={{ duration: 0.18 }}
              className="mt-6"
            >
              <div className="sticker p-4">
                <div className="flex items-center justify-between">
                  <div className="font-black text-lg">{lastCat.name}</div>
                  <div className="text-[11px] font-black tracking-[0.22em] text-black/55">
                    {lastCat.rarity.toUpperCase()}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-center">
                  <motion.img
                    src={lastCat.image_url}
                    alt={lastCat.name}
                    loading="lazy"
                    decoding="async"
                    className="h-56 w-56 rounded-[22px] border-2 border-black/10 bg-white/60"
                    initial={{ scale: 0.96 }}
                    animate={{ scale: [0.96, 1.02, 1] }}
                    transition={{ duration: 0.22 }}
                  />
                </div>

                <button onClick={reset} className="mt-4 w-full sticker py-3 font-black active:scale-[0.99] transition">
                  continua
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
