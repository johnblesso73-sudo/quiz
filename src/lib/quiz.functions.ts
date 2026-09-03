import { createServerFn } from "@tanstack/react-start";
import {
  attemptCredentialsSchema,
  integrityEventSchema,
  registrationSchema,
  submitSchema,
  type OptionKey,
  type PublicQuestion,
  type QuizResult,
} from "./quiz-schemas";

/** Registers a participant, opens an attempt and returns the public questions. */
export const startAttempt = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => registrationSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { QUIZ_ID, loadPublicQuestions, rateLimit } = await import("./quiz.server");

    if (!rateLimit(`start:${data.collegeEmail.toLowerCase()}`, 8, 60_000)) {
      throw new Error("Too many attempts started. Please wait a minute and try again.");
    }

    const questions = await loadPublicQuestions();

    const { data: participant, error: participantError } = await supabaseAdmin
      .from("participants")
      .insert({
        name: data.name,
        registration_number: data.registrationNumber,
        college_email: data.collegeEmail.toLowerCase(),
      })
      .select("id, name")
      .single();
    if (participantError || !participant) throw new Error("Could not register you. Please retry.");

    const { data: attempt, error: attemptError } = await supabaseAdmin
      .from("attempts")
      .insert({
        participant_id: participant.id,
        quiz_id: QUIZ_ID,
        max_score: questions.length,
        status: "in_progress",
      })
      .select("id, result_token")
      .single();
    if (attemptError || !attempt) throw new Error("Could not start the quiz. Please retry.");

    return {
      attemptId: attempt.id,
      token: attempt.result_token,
      participantName: participant.name,
      questions,
    };
  });

/** Loads questions/options only — never correct answers. */
export const getQuizQuestions = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => attemptCredentialsSchema.parse(data))
  .handler(async ({ data }): Promise<{ participantName: string; questions: PublicQuestion[] }> => {
    const { loadAttempt, loadPublicQuestions } = await import("./quiz.server");
    const attempt = await loadAttempt(data.attemptId, data.token);
    const questions = await loadPublicQuestions();
    return {
      participantName: attempt.participants?.name ?? "Participant",
      questions,
    };
  });

/** Server-side grading. Idempotent: re-submitting returns the stored result. */
export const submitAttempt = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => submitSchema.parse(data))
  .handler(async ({ data }): Promise<QuizResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { loadAttempt, loadAnswerKey, gradeAnswers, rateLimit } = await import("./quiz.server");

    if (!rateLimit(`submit:${data.attemptId}`, 10, 60_000)) {
      throw new Error("Too many submission attempts. Please wait a moment.");
    }

    const attempt = await loadAttempt(data.attemptId, data.token);
    const participantName = attempt.participants?.name ?? "Participant";

    if (attempt.status === "submitted" && attempt.submitted_at) {
      const score = attempt.score ?? 0;
      return {
        attemptId: attempt.id,
        participantName,
        score,
        maxScore: attempt.max_score,
        percentage: Math.round((score / attempt.max_score) * 100),
        submittedAt: attempt.submitted_at,
        integrityEventCount: attempt.integrity_event_count,
      };
    }

    const answerKey = await loadAnswerKey();
    const { score, rows } = gradeAnswers(answerKey, data.answers as Record<string, OptionKey>);

    const { error: responseError } = await supabaseAdmin.from("responses").upsert(
      rows.map((row) => ({ ...row, attempt_id: attempt.id })),
      { onConflict: "attempt_id,question_id" },
    );
    if (responseError) throw new Error("Could not save your answers. Please retry.");

    const submittedAt = new Date().toISOString();
    // Guarded update: only the first submission writes a score.
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("attempts")
      .update({ score, submitted_at: submittedAt, status: "submitted" })
      .eq("id", attempt.id)
      .eq("status", "in_progress")
      .select("score, submitted_at, max_score, integrity_event_count")
      .maybeSingle();
    if (updateError) throw new Error("Could not submit your quiz. Please retry.");

    const finalScore = updated?.score ?? score;
    const maxScore = updated?.max_score ?? attempt.max_score;
    return {
      attemptId: attempt.id,
      participantName,
      score: finalScore,
      maxScore,
      percentage: Math.round((finalScore / maxScore) * 100),
      submittedAt: updated?.submitted_at ?? submittedAt,
      integrityEventCount: updated?.integrity_event_count ?? attempt.integrity_event_count,
    };
  });

export const getResult = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => attemptCredentialsSchema.parse(data))
  .handler(async ({ data }): Promise<QuizResult> => {
    const { loadAttempt } = await import("./quiz.server");
    const attempt = await loadAttempt(data.attemptId, data.token);
    if (attempt.status !== "submitted" || attempt.submitted_at == null) {
      throw new Error("This attempt has not been submitted yet.");
    }
    const score = attempt.score ?? 0;
    return {
      attemptId: attempt.id,
      participantName: attempt.participants?.name ?? "Participant",
      score,
      maxScore: attempt.max_score,
      percentage: Math.round((score / attempt.max_score) * 100),
      submittedAt: attempt.submitted_at,
      integrityEventCount: attempt.integrity_event_count,
    };
  });

export const recordIntegrityEvent = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => integrityEventSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { loadAttempt, rateLimit, sendIntegrityNotification } = await import("./quiz.server");

    if (!rateLimit(`integrity:${data.attemptId}`, 40, 60_000)) {
      return { recorded: false, notificationStatus: "throttled" as const };
    }

    const attempt = await loadAttempt(data.attemptId, data.token);
    const occurredAt = new Date().toISOString();

    const { data: inserted, error } = await supabaseAdmin
      .from("integrity_events")
      .insert({
        attempt_id: attempt.id,
        participant_id: attempt.participant_id,
        event_type: data.eventType,
        occurred_at: occurredAt,
        metadata: data.metadata,
        notification_status: "pending",
      })
      .select("id")
      .single();
    if (error || !inserted) return { recorded: false, notificationStatus: "failed" as const };

    await supabaseAdmin
      .from("attempts")
      .update({ integrity_event_count: attempt.integrity_event_count + 1 })
      .eq("id", attempt.id);

    let notificationStatus: string = "skipped";
    if (data.eventType === "screenshot_key" || data.eventType === "print_attempt") {
      notificationStatus = await sendIntegrityNotification({
        eventType: data.eventType,
        occurredAt,
        participantName: attempt.participants?.name ?? "",
        registrationNumber: attempt.participants?.registration_number ?? "",
        collegeEmail: attempt.participants?.college_email ?? "",
        attemptId: attempt.id,
      });
    }

    await supabaseAdmin
      .from("integrity_events")
      .update({ notification_status: notificationStatus })
      .eq("id", inserted.id);

    return { recorded: true, notificationStatus };
  });
