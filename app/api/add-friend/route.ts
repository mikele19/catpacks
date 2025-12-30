import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { friendId } = body;

  console.log("--- RICHIESTA AMICIZIA RECIPROCA ---");
  
  if (!friendId) return NextResponse.json({ error: "ID amico mancante" }, { status: 400 });

  const headersList = await headers();
  const authHeader = headersList.get("authorization");
  if (!authHeader) return NextResponse.json({ error: "No Token" }, { status: 401 });

  // 1. Client Standard (per verificare CHI sta facendo la richiesta)
  const supabaseAuth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader } } }
  );

  // 2. Client ADMIN (Necessario per creare l'amicizia inversa "Lui -> Te")
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Server non configurato (Manca Service Role)" }, { status: 500 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Verifica utente loggato
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (user.id === friendId) {
    return NextResponse.json({ error: "Non puoi aggiungere te stesso!" }, { status: 400 });
  }

  // Controlla se l'amico esiste
  const { data: friendProfile } = await supabaseAdmin
    .from("users_profile")
    .select("user_id")
    .eq("user_id", friendId)
    .single();

  if (!friendProfile) {
    return NextResponse.json({ error: "Utente non trovato." }, { status: 404 });
  }

  // Controlla se siete già amici (basta controllare una direzione)
  const { count } = await supabaseAdmin
    .from("user_friends")
    .select("*", { count: 'exact', head: true })
    .eq("user_id", user.id)
    .eq("friend_id", friendId);

  if (count && count > 0) {
    return NextResponse.json({ error: "Siete già amici!" }, { status: 400 });
  }

  // --- PUNTO CHIAVE: INSERIMENTO DOPPIO ---
  // Inseriamo sia A->B che B->A in un colpo solo
  const { error: insertError } = await supabaseAdmin.from("user_friends").insert([
    { user_id: user.id, friend_id: friendId }, // Tu aggiungi Lui
    { user_id: friendId, friend_id: user.id }  // Lui aggiunge Te (Automatico)
  ]);

  if (insertError) {
    console.error("Errore inserimento:", insertError);
    return NextResponse.json({ error: "Errore database" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}