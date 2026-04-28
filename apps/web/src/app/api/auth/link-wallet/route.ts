import { NextResponse } from "next/server";
import { linkWallet } from "@/lib/auth/wallet";
import { createClient } from "@/lib/supabase/server";

const usedNonces = new Set<string>();

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      walletAddress?: string;
      signature?: string;
      nonce?: string;
    };

    const walletAddress = body.walletAddress?.trim();
    const signature = body.signature?.trim();
    const nonce = body.nonce?.trim();

    if (!walletAddress || !signature || !nonce) {
      return NextResponse.json({ error: "Missing walletAddress, signature, or nonce" }, { status: 400 });
    }

    if (usedNonces.has(nonce)) {
      return NextResponse.json({ error: "Nonce already used" }, { status: 400 });
    }

    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase env is not configured" }, { status: 500 });
    }
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await linkWallet(user.id, walletAddress, signature, nonce);
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    usedNonces.add(nonce);
    if (usedNonces.size > 5000) {
      usedNonces.clear();
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to link wallet" }, { status: 500 });
  }
}
