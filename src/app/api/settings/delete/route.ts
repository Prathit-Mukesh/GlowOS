import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";
import { clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * POST /api/settings/delete — "Delete my data" (spec §8, DPDP right of erasure).
 *
 * Hard delete: every row AND every storage object, via the delete_my_data()
 * SECURITY DEFINER RPC. The RPC takes no parameters and derives the target from
 * auth.uid(), so it can only ever delete the caller. Irreversible.
 *
 * Requires the user to type DELETE — a mis-tap must not destroy an account.
 * The audit row is written BEFORE the delete, because afterwards there is no
 * user left to attribute it to (the row's user_id is nulled by the RPC, so the
 * event survives as an anonymous record of the deletion).
 */
const bodySchema = z
  .object({
    confirm: z.literal("DELETE", {
      errorMap: () => ({ message: "Type DELETE to confirm." }),
    }),
  })
  .strict();

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    if (!bodySchema.safeParse(raw).success) {
      return NextResponse.json({ error: "Confirmation required" }, { status: 400 });
    }

    await audit("data_deletion", {
      userId: user.id,
      ip: clientIp(request.headers),
      meta: { requested_at: new Date().toISOString() },
    });

    const { error } = await supabase.rpc("delete_my_data");
    if (error) {
      console.error("[settings/delete] rpc failed", error);
      return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }

    // The auth user is gone; clear the session cookies so the browser doesn't
    // keep presenting a token for a deleted account.
    await supabase.auth.signOut().catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[settings/delete] unhandled", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
