import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// Percentuali normali
const DROP_RATES = {
  common: 60,
  rare: 25,
  epic: 10,
  legendary: 4,
  mythic: 1
};

function pickRarity() {
  const rand = Math.random() * 100;
  let sum = 0;
  if (rand < (sum += DROP_RATES.common)) return "common";
  if (rand < (sum += DROP_RATES.rare)) return "rare";
  if (rand < (sum += DROP_RATES.epic)) return "epic";
  if (rand < (sum += DROP_RATES.legendary)) return "legendary";
  return "mythic";
}

export const dynamic = 'force-dynamic';

export async function POST() {
  // --- MODIFICA: Creazione manuale del client (bypassiamo l'errore) ---
  const cookieStore = cookies();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
      },
      global: {
        headers: {
          // Passiamo i cookie manualmente così sa chi siamo
          cookie: typeof cookieStore.toString === 'function' ? cookieStore.toString() : '', 
        },
      },
    }
  );
  // -------------------------------------------------------------------

  // 1. Verifica Utente
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 2. Verifica Crediti
  const COST = 10;
  const { data: profile } = await supabase.from("users_profile").select("credits").eq("user_id", user.id).single();
  
  if (!profile || profile.credits < COST) {
    return NextResponse.json({ error: "Non hai abbastanza monete!" }, { status: 400 });
  }

  // 3. Pesca Rarità
  const wonRarity = pickRarity();

  // 4. PESCA DAL CATALOGO NUOVO
  const { data: catsPool } = await supabase
    .from("cats_catalog") 
    .select("*")
    .eq("rarity", wonRarity);

  // Fallback se il catalogo è vuoto per quella rarità
  if (!catsPool || catsPool.length === 0) {
    console.error(`Nessun gatto trovato per rarità ${wonRarity}. Provo con common.`);
    const { data: fallbackPool } = await supabase.from("cats_catalog").select("*").eq("rarity", "common");
    
    if (!fallbackPool || fallbackPool.length === 0) {
       return NextResponse.json({ error: "Errore critico: Catalogo vuoto!" }, { status: 500 });
    }
    const randomCat = fallbackPool[Math.floor(Math.random() * fallbackPool.length)];
    
    await supabase.from("users_profile").update({ credits: profile.credits - COST }).eq("user_id", user.id);
    await supabase.from("user_cats").insert({ user_id: user.id, cat_id: randomCat.id });

    return NextResponse.json({
      success: true,
      credits: profile.credits - COST,
      cat: randomCat
    });
  }

  // Caso normale
  const randomCat = catsPool[Math.floor(Math.random() * catsPool.length)];

  // 5. Salva Transazione
  await supabase.from("users_profile").update({ credits: profile.credits - COST }).eq("user_id", user.id);
  await supabase.from("user_cats").insert({ user_id: user.id, cat_id: randomCat.id });

  return NextResponse.json({
    success: true,
    credits: profile.credits - COST,
    cat: randomCat
  });
}