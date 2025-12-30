import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { friendCode } = body; // Ora riceviamo "friendCode", non "friendId"

    console.log("--- RICHIESTA AMICIZIA (CODICE BREVE) ---");
    console.log("Codice ricevuto:", friendCode);

    if (!friendCode) return NextResponse.json({ error: "Codice amico mancante" }, { status: 400 });

    const headersList = await headers();
    const authHeader = headersList.get("authorization");
    if (!authHeader) return NextResponse.json({ error: "No Token" }, { status: 401 });

    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: authHeader } } }
    );

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Server Error: Service Role mancante" }, { status: 500 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Chi sei TU?
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 2. TROVA L'AMICO TRAMITE IL CODICE BREVE (123-456)
    const { data: friendProfile } = await supabaseAdmin
      .from("users_profile")
      .select("user_id")
      .eq("friend_code", friendCode) // Cerchiamo nella nuova colonna
      .single();

    if (!friendProfile) {
      return NextResponse.json({ error: "Codice amico non valido." }, { status: 404 });
    }

    const friendId = friendProfile.user_id;

    if (user.id === friendId) {
      return NextResponse.json({ error: "Non puoi aggiungere te stesso!" }, { status: 400 });
    }

    // 3. Controlla se siete già amici
    const { count } = await supabaseAdmin
      .from("user_friends")
      .select("*", { count: 'exact', head: true })
      .eq("user_id", user.id)
      .eq("friend_id", friendId);

    if (count && count > 0) {
      return NextResponse.json({ error: "Siete già amici!" }, { status: 400 });
    }

    // 4. Crea amicizia reciproca
    await supabaseAdmin.from("user_friends").insert([
      { user_id: user.id, friend_id: friendId },
      { user_id: friendId, friend_id: user.id }
    ]);

    return NextResponse.json({ success: true });

  } catch (e: any) {
    console.error("Errore server:", e);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}