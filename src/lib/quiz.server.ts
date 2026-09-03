import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { OptionKey, PublicQuestion } from "./quiz-schemas";

export const QUIZ_ID = "11111111-1111-4111-8111-111111111111";

/** Simple in-memory rate limiter (per worker instance). */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

export async function loadAttempt(attemptId: string, token: string) {
  const { data, error } = await supabaseAdmin
    .from("attempts")
    .select(
      "id, participant_id, quiz_id, started_at, submitted_at, score, max_score, status, integrity_event_count, result_token, participants(name, registration_number, college_email)",
    )
    .eq("id", attemptId)
    .maybeSingle();

  if (error) throw new Error("Could not load your attempt. Please retry.");
  if (!data || data.result_token !== token) throw new Error("Attempt not found or access denied.");
  return data;
}

export async function loadPublicQuestions(): Promise<PublicQuestion[]> {
  const { data, error } = await supabaseAdmin
    .from("questions")
    .select("id, display_order, question_text, options")
    .eq("quiz_id", QUIZ_ID)
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) throw new Error("Could not load questions. Please retry.");
  const questions = (data ?? []).map((q) => ({
    id: q.id,
    displayOrder: q.display_order,
    questionText: q.question_text,
    options: q.options as Record<OptionKey, string>,
  }));

  for (const q of questions) {
    const keys = Object.keys(q.options ?? {});
    if (keys.length !== 4) {
      throw new Error(`Question ${q.displayOrder} is misconfigured (expected exactly 4 options).`);
    }
  }
  return questions;
}

/** Server-side answer key. Never leaves the server. */
export async function loadAnswerKey(): Promise<Map<string, OptionKey>> {
  const { data, error } = await supabaseAdmin
    .from("questions")
    .select("id, correct_option")
    .eq("quiz_id", QUIZ_ID)
    .eq("is_active", true);

  if (error) throw new Error("Grading is temporarily unavailable. Please retry.");
  return new Map((data ?? []).map((q) => [q.id, q.correct_option as OptionKey]));
}

export function gradeAnswers(
  answerKey: Map<string, OptionKey>,
  answers: Record<string, OptionKey>,
) {
  let score = 0;
  const rows: { question_id: string; selected_option: OptionKey | null; is_correct: boolean }[] = [];
  for (const [questionId, correct] of answerKey.entries()) {
    const selected = answers[questionId] ?? null;
    const isCorrect = selected != null && selected === correct;
    if (isCorrect) score += 1;
    rows.push({ question_id: questionId, selected_option: selected, is_correct: isCorrect });
  }
  return { score, rows };
}

type NotifyPayload = {
  eventType: string;
  occurredAt: string;
  participantName: string;
  registrationNumber: string;
  collegeEmail: string;
  attemptId: string;
};

/**
 * Integrity notification via a backend transactional email provider.
 * Recipients/sender are environment-configured; nothing is hardcoded and no
 * credential ever reaches the browser.
 */
export async function sendIntegrityNotification(
  payload: NotifyPayload,
): Promise<"sent" | "not_configured" | "failed"> {
  const apiKey = process.env["RESEND_API_KEY"];
  const to = process.env["INTEGRITY_NOTIFY_TO"];
  const from = process.env["INTEGRITY_NOTIFY_FROM"];
  if (!apiKey || !to || !from) return "not_configured";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: to.split(",").map((value) => value.trim()),
        subject: `Quiz integrity signal: ${payload.eventType}`,
        text: [
          `Event: ${payload.eventType}`,
          `Time: ${payload.occurredAt}`,
          `Participant: ${payload.participantName}`,
          `Registration: ${payload.registrationNumber}`,
          `Email: ${payload.collegeEmail}`,
          `Attempt: ${payload.attemptId}`,
        ].join("\n"),
      }),
    });
    return res.ok ? "sent" : "failed";
  } catch {
    return "failed";
  }
}
