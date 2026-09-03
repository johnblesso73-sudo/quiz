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
