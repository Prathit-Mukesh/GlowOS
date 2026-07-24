import "server-only";
import { createHash } from "crypto";
import { createAdminClient } from "./supabase/admin";

/**
 * Audit logging (spec §9). Events: login, failed_auth, data_export,
 * data_deletion, admin_action, webhook_received, ai_generation, quiz_submit.
 * IPs are salted-SHA-256 hashed before storage — raw IPs never persist.
 */

export type AuditEvent =
  | "login"
  | "failed_auth"
  | "data_export"
  | "data_deletion"
  | "admin_action"
  | "webhook_received"
  | "ai_generation"
  | "quiz_submit"
  | "score_computed";

export function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT ?? "";
  return createHash("sha256").update(`${ip}${salt}`).digest("hex");
}

export async function audit(
  event: AuditEvent,
  opts: { userId?: string; ip?: string; meta?: Record<string, unknown> } = {}
): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("audit_log").insert({
      user_id: opts.userId ?? null,
      event,
      ip_hash: opts.ip ? hashIp(opts.ip) : null,
      meta: opts.meta ?? {},
    });
  } catch (err) {
    // Auditing must never take down the request path.
    console.error("[audit] failed to write audit log", err);
  }
}
