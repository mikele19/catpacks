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

  // 1. Client Auth (per sapere chi sei TU)
  const supabaseAuth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader } } }
  );

  // 2. Client Admin (per CANCELLARE entrambe le relazioni)
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Server Error: Service Role mancante" }, { status: 500 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Verifica utente
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // CANCELLAZIONE DOPPIA (A->B e B->A)
  // 1. Cancella la tua relazione verso di lui
  await supabaseAdmin
    .from("user_friends")
    .delete()
    .match({ user_id: user.id, friend_id: friendId });

  // 2. Cancella la sua relazione verso di te (Reciproco)
  await supabaseAdmin
    .from("user_friends")
    .delete()
    .match({ user_id: friendId, friend_id: user.id });

  return NextResponse.json({ success: true });
}