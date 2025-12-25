"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import BottomNav from "@/app/components/BottomNav";
import PackArt from "@/app/components/PackArt";
import { AnimatePresence, motion } from "framer-motion";

type Rarity = "common" | "rare" | "epic" | "legendary" | "mythic";
type CatResult = { name: string; rarity: Rarity; image_url: string };

const tapsNeeded = 12;
const packCost = 10;

function rarityFrame(r: Rarity) {
  switch (r) {
    case "common":
      return "from-white/20 to-white/5";
    case "rare":
      return "from-blue-400/35 to-blue-500/10";
    case "epic":
      return "from-purple-400/35 to-purple-500/10";
    case "legendary":
      return "from-yellow-300/40 to-yellow-500/10";
    case "mythic":
      return "from-fuchsia-400/40 to-rose-500/10";
  }
}

function vibrate(ms: number) {
  if (typeof window !== "undefined" && "vibrate" in navigator) {
    // @ts-ignore
    navigator.vibrate(ms);
  }
}

export default function Home() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);

  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<"idle" | "charging" | "opening" | "reveal">(
    "idle"
  );
  const [taps, setTaps] = useState(0);
  const [lastCat, setLastCat] = useState<CatResult | null>(null);

  const initials = useMemo(
    () => (email ? email.slice(0, 2).toUpperCase() : "ME"),
    [email]
  );

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
        await new Promise((r) => setTimeout(r, 650));
        setStage("reveal");
        vibrate(40);
      } catch {
        setStage("idle");
      } finally {
        setBusy(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taps, stage]);

  const skip = async () => {
    if (stage === "reveal" || busy) return;
    setStage("opening");
    setBusy(true);
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
    setBusy(false);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const particles = useMemo(() => {
    const count = 14;
    return Array.from({ length: count }).map((_, i) => {
      const a = (Math.PI * 2 * i) / count;
      const d = 130 + Math.random() * 40;
      return { id: i, x: Math.cos(a) * d, y: Math.sin(a) * d, s: 0.8 + Math.random() * 1.2 };
    });
  }, [lastCat?.rarity]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Caricamento…
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28 text-white bg-black relative overflow-hidden">
      {/* background blobs */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[520px] w-[520px] rounded-full bg-blue-500/10 blur-[70px]" />
      <div className="absolute -bottom-52 right-0 h-[560px] w-[560px] rounded-full bg-fuchsia-500/10 blur-[80px]" />

      {/* header */}
      <div className="relative px-5 pt-5 max-w-md mx-auto">
        <div className="flex items-center justify-between">
          {/* coins chip */}
          <div className="rounded-2xl px-3 py-2 bg-white/6 border border-white/10 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-xl bg-gradient-to-b from-yellow-200/30 to-yellow-500/10 border border-yellow-300/20" />
              <div className="font-extrabold">{credits}</div>
            </div>
          </div>

          {/* avatar */}
          <button
            onClick={() => router.push("/profile")}
            className="rounded-2xl px-3 py-2 bg-white/6 border border-white/10 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
          >
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-blue-500/35 to-fuchsia-500/20 border border-white/10 flex items-center justify-center font-black">
                {initials}
              </div>
              <div className="text-xs text-white/70 font-bold">Profilo</div>
            </div>
          </button>
        </div>

        <div className="mt-8">
          <div className="text-3xl font-black tracking-tight">CatPacks</div>
          <div className="text-sm text-white/65 mt-2">
            Tocca per caricare • costo pack <span className="font-bold text-white/85">{packCost}</span>
          </div>
        </div>

        {/* main card */}
        <div className="mt-6 rounded-[28px] bg-white/6 border border-white/10 backdrop-blur-2xl shadow-[0_26px_90px_rgba(0,0,0,0.55)] p-5">
          <div className="flex items-center justify-between">
            <div className="text-xs text-white/60 font-semibold tracking-wider">
              OPEN PACK
            </div>

            {stage !== "idle" && stage !== "reveal" && (
              <button
                onClick={skip}
                className="text-xs font-bold text-white/70 hover:text-white"
              >
                Skip
              </button>
            )}
          </div>

          {/* progress */}
          {stage === "charging" && (
            <div className="mt-3">
              <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 to-fuchsia-500"
                  initial={{ width: "0%" }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.12 }}
                />
              </div>
              <div className="mt-2 text-[11px] text-white/55">
                Tocchi: {taps}/{tapsNeeded}
              </div>
            </div>
          )}

          {/* stage zone */}
          <div className="mt-4 h-[340px] flex items-center justify-center relative overflow-hidden rounded-[22px]">
            {/* flash */}
            <AnimatePresence>
              {stage === "opening" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 0] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.7 }}
                  className="absolute inset-0 bg-white"
                />
              )}
            </AnimatePresence>

            {/* particles */}
            <AnimatePresence>
              {stage === "opening" && (
                <motion.div className="absolute inset-0 flex items-center justify-center">
                  {particles.map((p) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, x: 0, y: 0, scale: 0.7 }}
                      animate={{ opacity: [0, 1, 0], x: p.x, y: p.y, scale: p.s }}
                      transition={{ duration: 0.7 }}
                      className="h-3 w-3 rounded-full bg-white/12"
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {stage !== "reveal" && (
                <motion.button
                  key="pack"
                  onClick={stage === "idle" ? start : tap}
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: -10 }}
                  transition={{ duration: 0.25 }}
                  className="relative"
                >
                  <PackArt state={stage === "idle" ? "idle" : stage === "charging" ? "charging" : "opening"} />

                  {/* hint */}
                  {stage === "idle" && (
                    <div className="mt-4 text-center text-sm text-white/65 font-semibold">
                      Tocca la bustina per iniziare
                    </div>
                  )}
                  {stage === "charging" && (
                    <div className="mt-4 text-center text-sm text-white/65 font-semibold">
                      Tocca ancora…
                    </div>
                  )}
                </motion.button>
              )}

              {stage === "reveal" && lastCat && (
                <motion.div
                  key="reveal"
                  initial={{ opacity: 0, scale: 0.92, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="w-full"
                >
                  <div className={`rounded-[26px] p-[2px] bg-gradient-to-br ${rarityFrame(lastCat.rarity)}`}>
                    <div className="rounded-[26px] bg-black/70 border border-white/10 p-4">
                      <div className="flex items-center justify-between">
                        <div className="font-black text-lg">{lastCat.name}</div>
                        <div className="text-[11px] uppercase tracking-[0.25em] text-white/70 font-bold">
                          {lastCat.rarity}
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-center">
                        <motion.img
                          src={lastCat.image_url}
                          alt={lastCat.name}
                          className="h-52 w-52 rounded-[26px] shadow-[0_30px_90px_rgba(0,0,0,0.6)]"
                          initial={{ scale: 0.9 }}
                          animate={{ scale: [0.9, 1.08, 1] }}
                          transition={{ duration: 0.55 }}
                        />
                      </div>

                      <div className="mt-4 grid gap-3">
                        <button
                          onClick={reset}
                          className="w-full rounded-2xl bg-white text-black py-3 font-black"
                        >
                          Continua
                        </button>
                        <button
                          onClick={() => router.push("/collection")}
                          className="w-full rounded-2xl bg-white/6 border border-white/10 py-3 font-black text-white"
                        >
                          Vai alla collezione
                        </button>
                        <button
                          onClick={logout}
                          className="w-full rounded-2xl bg-white/4 border border-white/10 py-3 font-black text-white/80"
                        >
                          Logout
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* footer microcopy */}
          <div className="mt-4 text-[12px] text-white/55">
            Pro tip: tap veloci = apertura più rapida.
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
