import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const adminQuerySchema = z.object({
  accessKey: z.string().min(1).max(200),
  search: z.string().trim().max(120).optional(),
  eventType: z.string().trim().max(60).optional(),
  minScore: z.number().int().min(0).max(25).optional(),
  from: z.string().max(40).optional(),
  to: z.string().max(40).optional(),
});

export type AdminAttemptRow = {
  attemptId: string;
  name: string;
  registrationNumber: string;
  collegeEmail: string;
  startedAt: string;
  submittedAt: string | null;
  score: number | null;
  maxScore: number;
  status: string;
  integrityEventCount: number;
  eventTypes: string[];
};

export type AdminResponse =
  | { configured: false }
  | { configured: true; authorized: false }
  | { configured: true; authorized: true; rows: AdminAttemptRow[] };

export const adminListAttempts = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => adminQuerySchema.parse(data))
  .handler(async ({ data }): Promise<AdminResponse> => {
    const expected = process.env["ADMIN_ACCESS_KEY"];
    if (!expected) return { configured: false };
    if (data.accessKey !== expected) return { configured: true, authorized: false };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let query = supabaseAdmin
      .from("attempts")
      .select(
        "id, started_at, submitted_at, score, max_score, status, integrity_event_count, participants(name, registration_number, college_email), integrity_events(event_type)",
      )
      .order("started_at", { ascending: false })
      .limit(500);

    if (data.from) query = query.gte("started_at", data.from);
    if (data.to) query = query.lte("started_at", data.to);
    if (typeof data.minScore === "number") query = query.gte("score", data.minScore);

    const { data: rows, error } = await query;
    if (error) throw new Error("Could not load attempts.");

    const search = data.search?.toLowerCase();
    const mapped: AdminAttemptRow[] = (rows ?? [])
      .map((row) => ({
        attemptId: row.id,
        name: row.participants?.name ?? "",
        registrationNumber: row.participants?.registration_number ?? "",
        collegeEmail: row.participants?.college_email ?? "",
        startedAt: row.started_at,
        submittedAt: row.submitted_at,
        score: row.score,
        maxScore: row.max_score,
        status: row.status,
        integrityEventCount: row.integrity_event_count,
        eventTypes: Array.from(
          new Set((row.integrity_events ?? []).map((e: { event_type: string }) => e.event_type)),
        ),
      }))
      .filter((row) => {
        if (search) {
          const haystack =
            `${row.name} ${row.registrationNumber} ${row.collegeEmail}`.toLowerCase();
          if (!haystack.includes(search)) return false;
        }
        if (data.eventType && !row.eventTypes.includes(data.eventType)) return false;
        return true;
      });

    return { configured: true, authorized: true, rows: mapped };
  });
