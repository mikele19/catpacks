"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type PackResult = {
  name: string;
  rarity: "common" | "rare" | "epic" | "legendary" | "mythic";
  image_url: string;
};

export default function HomePage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [credits, setCredits] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [lastPull, setLastPull] = useState<PackResult | null>(null);

  const loadProfile = async () => {
    setLoading(true);
    setMessage("");

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      router.push("/login");
      return;
    }

    setEmail(user.email ?? "");

    // Legge credits dal profilo
    const { data, error } = await supabase
      .from("users_profile")
      .select("credits")
      .eq("user_id", user.id)
      .single();

    if (error) {
      // Se non esiste ancora il profilo, lo creiamo (fallback)
      await supabase.from("users_profile").upsert({
        user_id: user.id,
        credits: 0,
      });
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
    setMessage("");
    try {
      const res = await fetch("/api/claim-daily", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Errore claim");

      setCredits(json.credits);
      setMessage(json.message || "Crediti aggiunti!");
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  };

  const openPack = async () => {
    setBusy(true);
    setMessage("");
    setLastPull(null);
    try {
      const res = await fetch("/api/open-pack", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Errore apertura pacchetto");

      setCredits(json.credits);
      setLastPull(json.cat);
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <div style={{ padding: 24, fontFamily: "system-ui" }}>
        <p>Caricamento…</p>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 24,
        fontFamily: "system-ui",
        background: "#0b0b12",
        color: "white",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ opacity: 0.8, fontSize: 12 }}>Loggato come</div>
          <div style={{ fontWeight: 700 }}>{email}</div>
        </div>
        <button
          onClick={logout}
          style={{
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.2)",
            color: "white",
            padding: "10px 12px",
            borderRadius: 12,
          }}
        >
          Logout
        </button>
      </div>

      <div style={{ marginTop: 24, padding: 16, borderRadius: 16, background: "rgba(255,255,255,0.06)" }}>
        <div style={{ opacity: 0.8, fontSize: 12 }}>Crediti</div>
        <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1 }}>{credits}</div>
        <div style={{ opacity: 0.7, fontSize: 12, marginTop: 6 }}>
          Pack base: costo 10 crediti • Daily claim: +20 crediti
        </div>
      </div>

      <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
        <button
          disabled={busy}
          onClick={claimDaily}
          style={{
            padding: 14,
            borderRadius: 16,
            border: "none",
            fontWeight: 800,
            background: busy ? "#2a2a38" : "#22c55e",
            color: "#07130b",
          }}
        >
          Riscatta crediti giornalieri (+20)
        </button>

        <button
          disabled={busy}
          onClick={openPack}
          style={{
            padding: 14,
            borderRadius: 16,
            border: "none",
            fontWeight: 800,
            background: busy ? "#2a2a38" : "#3b82f6",
            color: "white",
          }}
        >
          Apri pacchetto (10 crediti)
        </button>

        <button
          onClick={() => router.push("/collection")}
          style={{
            padding: 14,
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.2)",
            background: "transparent",
            color: "white",
            fontWeight: 800,
          }}
        >
          Vai alla collezione
        </button>
      </div>

      {message && (
        <p style={{ marginTop: 16, color: "#fca5a5", fontWeight: 700 }}>
          {message}
        </p>
      )}

      {lastPull && (
        <div style={{ marginTop: 18, padding: 16, borderRadius: 16, background: "rgba(255,255,255,0.06)" }}>
          <div style={{ opacity: 0.8, fontSize: 12 }}>Hai trovato:</div>
          <div style={{ display: "flex", gap: 14, alignItems: "center", marginTop: 10 }}>
            <img
              src={lastPull.image_url}
              alt={lastPull.name}
              width={96}
              height={96}
              style={{ borderRadius: 16, background: "rgba(0,0,0,0.2)" }}
            />
            <div>
              <div style={{ fontSize: 18, fontWeight: 900 }}>{lastPull.name}</div>
              <div style={{ opacity: 0.8, textTransform: "uppercase", fontSize: 12, letterSpacing: 1 }}>
                {lastPull.rarity}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}