import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

/**
 * GET /api/settings/export — "Export my data" (spec §8, DPDP right of access).
 * Returns every row we hold for the caller as one JSON document, via the
 * export_my_data() SECURITY DEFINER RPC. The RPC takes no parameters and reads
 * auth.uid() itself, so it cannot be tricked into exporting another user.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase.rpc("export_my_data");
    if (error) {
      console.error("[settings/export] rpc failed", error);
      return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }

    await audit("data_export", { userId: user.id });

    const stamp = new Date().toISOString().slice(0, 10);
    return new NextResponse(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="glowos-my-data-${stamp}.json"`,
        // Never let a personal data export sit in a shared cache.
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (err) {
    console.error("[settings/export] unhandled", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
