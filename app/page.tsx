"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import BottomNav from "@/app/components/BottomNav";
import { motion, AnimatePresence } from "framer-motion";

type Rarity = "common" | "rare" | "epic" | "legendary" | "mythic";

type CatResult = {
  name: string;
  rarity: Rarity;
  image_url: string;
};

function rarityGrad(r: Rarity) {
  switch (r) {
    case "common":
      return "from-zinc-900 via-black to-zinc-950";
    case "rare":
      return "from-blue-900 via-black to-slate-950";
    case "epic":
      return "from-purple-900 via-black to-slate-950";
    case "legendary":
      return "from-yellow-900 via-black to-slate-950";
    case "mythic":
      return "from-rose-900 via-black to-fuchsia-950";
  }
}

function rarityGlow(r: Rarity) {
  switch (r) {
    case "common":
      return "bg-white/10";
    case "rare":
      return "bg-blue-500/20";
    case "epic":
      return "bg-purple-500/20";
    case "legendary":
      return "bg-yellow-400/20";
    case "mythic":
      return "bg-rose-500/20";
  }
}

// piccola vibrazione (mobile)
function vibrate(ms: number) {
  if (typeof window !== "undefined" && "vibrate" in navigator) {
    // @ts-ignore
    navigator.vibrate(ms);
  }
}

// beep veloce (senza file audio)
function beep() {
  try {
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "triangle";
    o.frequency.value = 880;
    g.gain.value = 0.03;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    setTimeout(() => {
      o.stop();
      ctx.close();
    }, 80);
  } catch {
    // ignore
  }
}

export default function Home() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);

  const packCost = 10;

  // flow
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<"idle" | "charging" | "opening" | "reveal">("idle");

  // tap-to-open
  const tapsNeeded = 12;
  const [taps, setTaps] = useState(0);

  // result
  const [lastCat, setLastCat] = useState<CatResult | null>(null);
  const [rarityBg, setRarityBg] = useState<Rarity>("common");

  // particles
  const [burstKey, setBurstKey] = useState(0);

  const initials = useMemo(() => (email ? email.slice(0, 2).toUpperCase() : "ME"), [email]);

  const getAuthHeader = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return { Authorization: `Bearer ${token}` };
  };

  const loadProfile = async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      router.push("/login");
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // chiama davvero l’API e prepara reveal
  const doOpenPack = async () => {
    const headers = await getAuthHeader();
    const res = await fetch("/api/open-pack", { method: "POST", headers });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Errore apertura pacchetto");

    setCredits(json.credits);
    setLastCat(json.cat);
    setRarityBg(json.cat.rarity as Rarity);
  };

  // start tap mode
  const startTapOpen = async () => {
    if (busy) return;
    setBusy(true);
    setLastCat(null);
    setTaps(0);
    setStage("charging");
    setRarityBg("common");
    vibrate(15);
  };

  // handle each tap
  const onTapPack = async () => {
    if (stage !== "charging") return;

    setTaps((prev) => {
      const next = Math.min(tapsNeeded, prev + 1);
      return next;
    });

    vibrate(10);
    beep();

    // se arriva al massimo, apri
    // NB: usiamo ref per leggere valore aggiornato dopo setState
    // quindi facciamo check con un timeout micro
    setTimeout(async () => {
      // calcolo “taps” aggiornato leggendo dal DOM state tramite funzione:
      // (in pratica, se taps era a tapsNeeded-1, ora siamo al massimo)
      // ci basiamo su condizione “taps + 1 >= tapsNeeded” usando la variabile chiusa:
    }, 0);
  };

  // quando taps cambia, se raggiunge soglia -> opening
  useEffect(() => {
    const run = async () => {
      if (stage !== "charging") return;
      if (taps < tapsNeeded) return;

      setStage("opening");
      setBurstKey((k) => k + 1);

      try {
        await doOpenPack();
        // mini attesa per effetto
        await new Promise((r) => setTimeout(r, 700));
        setStage("reveal");
        vibrate(40);
      } catch {
        setStage("idle");
      } finally {
        setBusy(false);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taps, stage]);

  const skipToReveal = async () => {
    if (busy) return;
    if (stage === "reveal") return;

    setBusy(true);
    setStage("opening");
    setBurstKey((k) => k + 1);

    try {
      await doOpenPack();
      setStage("reveal");
      vibrate(35);
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
    setRarityBg("common");
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const progress = Math.round((taps / tapsNeeded) * 100);

  // particelle “semplici” (10 pallini che esplodono)
  const particles = useMemo(() => {
    const count = 10;
    return Array.from({ length: count }).map((_, i) => {
      const angle = (Math.PI * 2 * i) / count;
      const dist = 120 + Math.random() * 40;
      return {
        id: i,
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        s: 0.8 + Math.random() * 0.8,
      };
    });
  }, [burstKey]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Caricamento…
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-20 text-white bg-gradient-to-b ${rarityGrad(rarityBg)}`}>
      {/* TOP BAR */}
      <div className="px-5 pt-5 flex items-center justify-between">
        <div className="flex items-center gap-2 rounded-2xl bg-white/5 px-3 py-2 border border-white/10">
          <div className="h-7 w-7 rounded-xl bg-yellow-400/20 border border-yellow-400/30 flex items-center justify-center">
            🪙
          </div>
          <div className="font-extrabold">{credits}</div>
        </div>

        <button
          onClick={() => router.push("/profile")}
          className="flex items-center gap-2 rounded-2xl bg-white/5 px-3 py-2 border border-white/10"
        >
          <div className="h-8 w-8 rounded-2xl bg-blue-500/30 border border-blue-500/30 flex items-center justify-center font-extrabold">
            {initials}
          </div>
          <div className="text-xs opacity-80">Profilo</div>
        </button>
      </div>

      {/* CONTENT */}
      <div className="px-5 mt-8 max-w-md mx-auto">
        <h1 className="text-2xl font-extrabold">CatPacks</h1>
        <p className="text-sm opacity-70 mt-1">
          Tocca la bustina per aprirla. Pack: {packCost} crediti.
        </p>

        <div className="mt-5 grid gap-3">
          <button
            disabled={busy}
            onClick={claimDaily}
            className="rounded-2xl bg-green-500 px-4 py-3 font-extrabold text-black disabled:opacity-40"
          >
            Riscatta giornalieri (+20)
          </button>

          {stage === "idle" ? (
            <button
              disabled={busy}
              onClick={startTapOpen}
              className="rounded-2xl bg-blue-500 px-4 py-3 font-extrabold text-white disabled:opacity-40"
            >
              Inizia apertura (tocca per aprire)
            </button>
          ) : (
            <button
              disabled={busy}
              onClick={skipToReveal}
              className="rounded-2xl border border-white/15 px-4 py-3 font-extrabold text-white/90"
            >
              Skip animazione
            </button>
          )}

          <button
            onClick={logout}
            className="rounded-2xl border border-white/15 px-4 py-3 font-extrabold text-white/90"
          >
            Logout
          </button>
        </div>

        {/* PACK ZONE */}
        <div className="mt-8">
          <div className="rounded-3xl bg-white/5 border border-white/10 p-5">
            <div className="flex items-center justify-between">
              <div className="text-xs opacity-70">Spacchettamento</div>
              {stage === "charging" && (
                <div className="text-xs font-extrabold opacity-80">{progress}%</div>
              )}
            </div>

            {/* progress bar */}
            {stage === "charging" && (
              <div className="mt-3 h-2 w-full rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-blue-500" style={{ width: `${progress}%` }} />
              </div>
            )}

            <div className="h-[300px] flex items-center justify-center relative overflow-hidden mt-4">
              {/* FLASH */}
              <AnimatePresence>
                {stage === "opening" && (
                  <motion.div
                    key="flash"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.7 }}
                    className="absolute inset-0 bg-white"
                  />
                )}
              </AnimatePresence>

              {/* PARTICLES */}
              <AnimatePresence>
                {stage === "opening" && (
                  <motion.div key={`burst-${burstKey}`} className="absolute inset-0 flex items-center justify-center">
                    {particles.map((p) => (
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 0, x: 0, y: 0, scale: 0.6 }}
                        animate={{ opacity: [0, 1, 0], x: p.x, y: p.y, scale: p.s }}
                        transition={{ duration: 0.7 }}
                        className={`h-3 w-3 rounded-full ${rarityGlow(rarityBg)}`}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                {/* PACK */}
                {stage !== "reveal" && (
                  <motion.button
                    key="pack"
                    onClick={onTapPack}
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      y: 0,
                      rotate: stage === "charging" ? [0, -2, 2, -2, 2, 0] : 0,
                    }}
                    transition={{ duration: stage === "charging" ? 0.25 : 0.2 }}
                    className="relative w-[190px] h-[240px] rounded-3xl border border-white/15 bg-gradient-to-b from-white/10 to-white/5 flex flex-col items-center justify-center"
                  >
                    <div className="text-6xl">📦</div>
                    <div className="mt-3 font-extrabold">BUSTINA</div>
                    <div className="text-xs opacity-70 mt-1">
                      {stage === "idle"
                        ? "Pronta"
                        : stage === "charging"
                        ? `Tocca (${taps}/${tapsNeeded})`
                        : "Apertura..."}
                    </div>

                    {stage === "charging" && (
                      <div className="mt-4 text-[11px] opacity-70">
                        Tocca ripetutamente per aprire
                      </div>
                    )}

                    {/* hint */}
                    {stage === "idle" && (
                      <div className="absolute -bottom-10 text-xs opacity-60">
                        Premi “Inizia apertura”
                      </div>
                    )}
                  </motion.button>
                )}

                {/* REVEAL */}
                {stage === "reveal" && lastCat && (
                  <motion.div
                    key="reveal"
                    initial={{ opacity: 0, scale: 0.85, y: 14 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="w-full"
                  >
                    <div className={`rounded-3xl p-[2px] bg-gradient-to-br ${rarityGrad(lastCat.rarity)}`}>
                      <div className="rounded-3xl bg-black/75 p-4 border border-white/10">
                        <div className="flex items-center justify-between">
                          <div className="font-extrabold">{lastCat.name}</div>
                          <div className="text-xs uppercase tracking-wider opacity-80">
                            {lastCat.rarity}
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-center">
                          <motion.img
                            src={lastCat.image_url}
                            alt={lastCat.name}
                            className="h-44 w-44 rounded-3xl"
                            initial={{ scale: 0.9 }}
                            animate={{ scale: [0.9, 1.08, 1] }}
                            transition={{ duration: 0.45 }}
                          />
                        </div>

                        <div className="mt-4 grid gap-3">
                          <button
                            onClick={reset}
                            className="w-full rounded-2xl bg-white text-black px-4 py-3 font-extrabold"
                          >
                            Ok
                          </button>
                          <button
                            onClick={() => router.push("/collection")}
                            className="w-full rounded-2xl border border-white/15 px-4 py-3 font-extrabold"
                          >
                            Vai alla collezione
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* footer tips */}
            <div className="text-xs opacity-60 mt-2">
              Tip: se vuoi vedere subito la carta usa “Skip animazione”.
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
