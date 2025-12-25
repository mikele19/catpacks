"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { AnimatePresence, motion } from "framer-motion";
import PackArt from "@/app/components/PackArt";

type Rarity = "common" | "rare" | "epic" | "legendary" | "mythic";
type CatResult = { name: string; rarity: Rarity; image_url: string };

const tapsNeeded = 12;
const packCost = 10;

function rarityLabel(r: Rarity) {
  switch (r) {
    case "common":
      return "COMMON";
    case "rare":
      return "RARE";
    case "epic":
      return "EPIC";
    case "legendary":
      return "LEGENDARY";
    case "mythic":
      return "MYTHIC";
  }
}

function rarityBorder(r: Rarity) {
  switch (r) {
    case "common":
      return "border-white/18";
    case "rare":
      return "border-blue-300/30";
    case "epic":
      return "border-purple-300/30";
    case "legendary":
      return "border-yellow-200/35";
    case "mythic":
      return "border-fuchsia-200/35";
  }
}

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
    if (!user) {
      setLoading(false);
      return;
    }

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
        await new Promise((r) => setTimeout(r, 450)); // più snello
        setStage("reveal");
        vibrate(35);
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
      vibrate(30);
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
    return (
      <div className="min-h-screen text-white flex items-center justify-center">
        Caricamento…
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white relative">
      {/* niente blob blur: leggero */}
      <div className="px-5 pt-5 max-w-md mx-auto pb-28">
        {/* Header sketch */}
        <div className="flex items-center justify-between">
          <div className="sketch-chip px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-2xl border-2 border-white/20 bg-white/5" />
              <div>
                <div className="text-[11px] text-white/60 font-semibold">Coins</div>
                <div className="font-black text-lg">{credits}</div>
              </div>
            </div>
          </div>

          <div className="sketch-chip px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-2xl border-2 border-white/20 bg-white/5 flex items-center justify-center font-black">
                {initials}
              </div>
              <div className="text-xs text-white/70 font-bold">Player</div>
            </div>
          </div>
        </div>

        <div className="mt-7">
          <div className="text-3xl font-black sketch-title">CatPacks</div>
          <div className="text-sm text-white/65 mt-2">
            Tap-to-open • pack cost <span className="font-black text-white/85">{packCost}</span>
          </div>
        </div>

        {/* Actions (sketch buttons) */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button onClick={claimDaily} disabled={busy} className="sketch-btn-solid py-3 font-black disabled:opacity-40">
            Daily +20
          </button>

          <button onClick={stage === "idle" ? start : skip} disabled={busy} className="sketch-btn py-3 font-black disabled:opacity-40">
            {stage === "idle" ? "Start" : "Skip"}
          </button>
        </div>

        {/* Main pack card */}
        <div className="mt-5 sketch-card p-5">
          <div className="flex items-center justify-between">
            <div className="text-[11px] text-white/60 font-semibold tracking-[0.25em]">OPEN PACK</div>

            {stage === "charging" && (
              <div className="text-xs font-black text-white/70">{progress}%</div>
            )}
          </div>

          {/* progress (light) */}
          {stage === "charging" && (
            <div className="mt-3">
              <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden border border-white/10">
                <div
                  className="h-full bg-white/80"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-2 text-[11px] text-white/55">
                Tap: {taps}/{tapsNeeded}
              </div>
            </div>
          )}

          {/* stage area */}
          <div className="mt-4 h-[360px] flex items-center justify-center relative overflow-hidden rounded-[22px] border-2 border-white/10 bg-black/30">
            {/* flash leggero */}
            <AnimatePresence>
              {stage === "opening" && !lowPerfMode && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.8, 0] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.45 }}
                  className="absolute inset-0 bg-white"
                />
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {stage !== "reveal" && (
                <motion.button
                  key="pack"
                  onClick={stage === "idle" ? start : tap}
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.98 }}
                  transition={{ duration: 0.18 }}
                  className="relative"
                >
                  <PackArt
                    state={stage === "idle" ? "idle" : stage === "charging" ? "charging" : "opening"}
                  />

                  <div className="mt-4 text-center text-sm text-white/65 font-semibold">
                    {stage === "idle"
                      ? "Tocca la bustina"
                      : stage === "charging"
                      ? "Ancora…"
                      : "Opening…"}
                  </div>

                  <div className="mt-1 text-center text-[11px] text-white/45">
                    (Tap ripetuti per aprire)
                  </div>
                </motion.button>
              )}

              {stage === "reveal" && lastCat && (
                <motion.div
                  key="reveal"
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.18 }}
                  className="w-full px-2"
                >
                  <div className={`sketch-card p-4 border-2 ${rarityBorder(lastCat.rarity)}`}>
                    <div className="flex items-center justify-between">
                      <div className="font-black text-lg">{lastCat.name}</div>
                      <div className="text-[11px] font-black tracking-[0.25em] text-white/70">
                        {rarityLabel(lastCat.rarity)}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-center">
                      <motion.img
                        src={lastCat.image_url}
                        alt={lastCat.name}
                        loading="lazy"
                        decoding="async"
                        className="h-52 w-52 rounded-[22px] border-2 border-white/10"
                        initial={{ scale: 0.92 }}
                        animate={{ scale: [0.92, 1.02, 1] }}
                        transition={{ duration: 0.35 }}
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

          <div className="mt-3 text-[12px] text-white/55">
            Tip: più tap = più veloce. (UI sketch: niente blur → più fluida)
          </div>
        </div>
      </div>
    </div>
  );
}
