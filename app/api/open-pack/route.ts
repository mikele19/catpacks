import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

// --- CONFIGURAZIONE ---
const PACK_TIERS: Record<string, { cost: number, rates: any }> = {
  'basic': { cost: 10, rates: { common: 70, rare: 25, epic: 4, legendary: 0.9, mythic: 0.1 } },
  'advanced': { cost: 50, rates: { common: 40, rare: 45, epic: 12, legendary: 2.5, mythic: 0.5 } },
  'elite': { cost: 200, rates: { common: 0, rare: 40, epic: 45, legendary: 13, mythic: 2 } },
  'god': { cost: 1000, rates: { common: 0, rare: 0, epic: 30, legendary: 60, mythic: 10 } }
};

const XP_TABLE: Record<string, number> = {
  common: 10, rare: 25, epic: 50, legendary: 200, mythic: 1000,
};

function pickRarity(tier: string) {
  const rates = PACK_TIERS[tier].rates;
  const rand = Math.random() * 100;
  let sum = 0;
  if (rand < (sum += rates.common)) return "common";
  if (rand < (sum += rates.rare)) return "rare";
  if (rand < (sum += rates.epic)) return "epic";
  if (rand < (sum += rates.legendary)) return "legendary";
  return "mythic";
}

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const packType = body.packId || 'basic';

  if (!PACK_TIERS[packType]) return NextResponse.json({ error: "Pack invalido" }, { status: 400 });

  const { cost: COST } = PACK_TIERS[packType];
  const headersList = await headers();
  const authHeader = headersList.get("authorization");
  if (!authHeader) return NextResponse.json({ error: "No Token" }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Login scaduto" }, { status: 401 });

  const wonRarity = pickRarity(packType);

  // --- OTTIMIZZAZIONE 1: FETCH PARALLELO ---
  // Scarichiamo Profilo e Catalogo Gatti CONTEMPORANEAMENTE (risparmia ~300ms)
  const [profileRes, catsRes] = await Promise.all([
    supabase.from("users_profile").select("credits, xp, level").eq("user_id", user.id).single(),
    supabase.from("cats_catalog").select("*").eq("rarity", wonRarity)
  ]);

  const profile = profileRes.data;
  const catsPool = catsRes.data;

  if (!profile || profile.credits < COST) {
    return NextResponse.json({ error: `Ti servono ${COST} monete!` }, { status: 400 });
  }

  let finalCat;
  if (!catsPool || catsPool.length === 0) {
    const { data: fallback } = await supabase.from("cats_catalog").select("*").eq("rarity", "common");
    finalCat = fallback ? fallback[0] : null;
  } else {
    finalCat = catsPool[Math.floor(Math.random() * catsPool.length)];
  }

  if (!finalCat) return NextResponse.json({ error: "Errore catalogo" }, { status: 500 });

  // --- OTTIMIZZAZIONE 2: CONTROLLO "NUOVO" VELOCE ---
  const { count } = await supabase
    .from("user_cats")
    .select("*", { count: 'exact', head: true })
    .eq("user_id", user.id)
    .eq("cat_id", finalCat.id);

  const isNew = count === 0;

  // Calcolo XP
  const xpGained = XP_TABLE[wonRarity] || 10;
  let currentXp = (profile.xp || 0) + xpGained;
  let currentLevel = profile.level || 1;
  let xpNeeded = currentLevel * 100;

  while (currentXp >= xpNeeded) {
    currentXp -= xpNeeded;
    currentLevel++;
    xpNeeded = currentLevel * 100;
  }

  // --- OTTIMIZZAZIONE 3: SCRITTURA PARALLELA ---
  // Aggiorniamo il profilo e inseriamo il gatto CONTEMPORANEAMENTE (risparmia ~300ms)
  await Promise.all([
    supabase.from("users_profile").update({ 
      credits: profile.credits - COST,
      xp: currentXp,
      level: currentLevel
    }).eq("user_id", user.id),
    
    supabase.from("user_cats").insert({ user_id: user.id, cat_id: finalCat.id })
  ]);

  return NextResponse.json({
    success: true,
    credits: profile.credits - COST,
    cat: finalCat,
    xpGained,
    isNew,
    newLevel: currentLevel
  });
}