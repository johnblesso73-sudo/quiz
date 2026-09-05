import type { AttemptSession } from "./quiz-schemas";

const KEY = "dt-quiz-session";
const ANSWERS_KEY = "dt-quiz-answers";

export function saveSession(session: AttemptSession) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    /* storage unavailable */
  }
}

export function loadSession(): AttemptSession | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AttemptSession) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  try {
    sessionStorage.removeItem(KEY);
    sessionStorage.removeItem(ANSWERS_KEY);
    sessionStorage.removeItem("dt-quiz-deadline");
  } catch {
    /* noop */
  }
}

export function saveAnswers(attemptId: string, answers: Record<string, string>) {
  try {
    sessionStorage.setItem(ANSWERS_KEY, JSON.stringify({ attemptId, answers }));
  } catch {
    /* noop */
  }
}

export function loadAnswers(attemptId: string): Record<string, string> {
  try {
    const raw = sessionStorage.getItem(ANSWERS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { attemptId: string; answers: Record<string, string> };
    return parsed.attemptId === attemptId ? parsed.answers : {};
  } catch {
    return {};
  }
}

const DEADLINE_KEY = "dt-quiz-deadline";

/** Returns the attempt deadline (ms epoch), creating one on first call. */
export function getDeadline(attemptId: string, durationMs: number): number {
  try {
    const raw = sessionStorage.getItem(DEADLINE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { attemptId: string; deadline: number };
      if (parsed.attemptId === attemptId) return parsed.deadline;
    }
  } catch {
    /* noop */
  }
  const deadline = Date.now() + durationMs;
  try {
    sessionStorage.setItem(DEADLINE_KEY, JSON.stringify({ attemptId, deadline }));
  } catch {
    /* noop */
  }
  return deadline;
}
