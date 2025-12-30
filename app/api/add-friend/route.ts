import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { friendId } = body;

  if (!friendId) return NextResponse.json({ error: "ID amico mancante" }, { status: 400 });

  const headersList = await headers();
  const authHeader = headersList.get("authorization");
  if (!authHeader) return NextResponse.json({ error: "No Token" }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (user.id === friendId) {
    return NextResponse.json({ error: "Non puoi aggiungere te stesso!" }, { status: 400 });
  }

  // 1. Controlla se l'amico esiste
  const { data: friendProfile } = await supabase
    .from("users_profile")
    .select("user_id")
    .eq("user_id", friendId)
    .single();

  if (!friendProfile) {
    return NextResponse.json({ error: "Utente non trovato." }, { status: 404 });
  }

  // 2. Controlla se siete già amici
  const { count } = await supabase
    .from("user_friends")
    .select("*", { count: 'exact', head: true })
    .eq("user_id", user.id)
    .eq("friend_id", friendId);

  if (count && count > 0) {
    return NextResponse.json({ error: "Siete già amici!" }, { status: 400 });
  }

  // 3. Crea l'amicizia (reciproca)
  // Inseriamo A->B e B->A così entrambi vedono l'altro nella lista
  const { error } = await supabase.from("user_friends").insert([
    { user_id: user.id, friend_id: friendId },
    { user_id: friendId, friend_id: user.id }
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}