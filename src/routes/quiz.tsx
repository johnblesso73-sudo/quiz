import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Timer as TimerIcon,
} from "lucide-react";

import { Backdrop } from "@/components/quiz/Backdrop";
import { TiltCard } from "@/components/quiz/TiltCard";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getQuizQuestions, recordIntegrityEvent, submitAttempt } from "@/lib/quiz.functions";
import {
  CAUGHT_MESSAGE,
  INTEGRITY_EVENT_TYPES,
  OPTION_KEYS,
  QUIZ_TITLE,
  type OptionKey,
  type PublicQuestion,
} from "@/lib/quiz-schemas";
import { clearSession, getDeadline, loadAnswers, loadSession, saveAnswers } from "@/lib/quiz-session";
import type { AttemptSession } from "@/lib/quiz-schemas";
import { cn } from "@/lib/utils";
const QUIZ_DURATION_MS = 25 * 60 * 1000;


export const Route = createFileRoute("/quiz")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Quiz in progress | Design Thinking – 25 MCQs" },
      {
        name: "description",
        content: "Answer the 25 Design Thinking multiple choice questions and submit once.",
      },
      { property: "og:title", content: "Quiz in progress | Design Thinking – 25 MCQs" },
      {
        property: "og:description",
        content: "Answer the 25 Design Thinking multiple choice questions and submit once.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: QuizPage,
});

function QuizPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<AttemptSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = loadSession();
    if (!stored) {
      navigate({ to: "/" });
      return;
    }
    setSession(stored);
    setReady(true);
  }, [navigate]);

  if (!ready || !session) {
    return (
      <main className="relative flex min-h-screen items-center justify-center">
        <Backdrop />
        <p className="text-sm text-muted-foreground">
          <Loader2 className="mr-2 inline size-4 animate-spin" aria-hidden="true" />
          Loading your paper…
        </p>
      </main>
    );
  }

  return <QuizRunner session={session} />;
}

function QuizRunner({ session }: { session: AttemptSession }) {
  const navigate = useNavigate();
  const fetchQuestions = useServerFn(getQuizQuestions);
  const submit = useServerFn(submitAttempt);
  const logEvent = useServerFn(recordIntegrityEvent);

  const [answers, setAnswers] = useState<Record<string, OptionKey>>({});
  const [index, setIndex] = useState(0);
  const [warning, setWarning] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const warnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const query = useQuery({
    queryKey: ["quiz-questions", session.attemptId],
    queryFn: () => fetchQuestions({ data: { attemptId: session.attemptId, token: session.token } }),
    retry: 2,
    staleTime: Infinity,
  });

  useEffect(() => {
    setAnswers(loadAnswers(session.attemptId) as Record<string, OptionKey>);
  }, [session.attemptId]);

  const questions: PublicQuestion[] = useMemo(() => query.data?.questions ?? [], [query.data]);
  const total = questions.length;
  const current = questions[index];
  const answeredCount = questions.filter((q) => answers[q.id]).length;
  const progress = total > 0 ? (answeredCount / total) * 100 : 0;

  const report = useCallback(
    (eventType: (typeof INTEGRITY_EVENT_TYPES)[number], showCaught = false) => {
      if (showCaught) {
        setWarning(`${CAUGHT_MESSAGE} — this screenshot signal has been recorded.`);
        if (warnTimer.current) clearTimeout(warnTimer.current);
        warnTimer.current = setTimeout(() => setWarning(null), 6000);
      }
      void logEvent({
        data: {
          attemptId: session.attemptId,
          token: session.token,
          eventType,
          metadata: { at: new Date().toISOString() },
        },
      }).catch(() => undefined);
    },
    [logEvent, session.attemptId, session.token],
  );

  // Browser-available integrity signals. These are best-effort browser hints —
  // operating-system screenshots cannot be reliably detected.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key;
      if (key === "PrintScreen") {
        report("screenshot_key", true);
        return;
      }
      const meta = event.metaKey || event.ctrlKey;
      if (meta && key.toLowerCase() === "p") {
        event.preventDefault();
        report("print_attempt", true);
        return;
      }
      if (meta && event.shiftKey && ["3", "4", "5", "s"].includes(key.toLowerCase())) {
        report("screenshot_key", true);
        return;
      }
      if (meta && event.shiftKey && ["i", "j", "c"].includes(key.toLowerCase())) {
        report("devtools_shortcut");
      }
    };
    const onCopy = () => report("copy_attempt");
    const onCut = () => report("cut_attempt");
    const onVisibility = () => {
      if (document.visibilityState === "hidden") report("visibility_hidden");
    };
    const onBlur = () => report("window_blur");

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCut);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCut);
      if (warnTimer.current) clearTimeout(warnTimer.current);
    };
  }, [report]);

  const mutation = useMutation({
    mutationFn: () =>
      submit({ data: { attemptId: session.attemptId, token: session.token, answers } }),
    onSuccess: (result) => {
      clearSession();
      navigate({
        to: "/result",
        search: { a: result.attemptId, t: session.token },
      });
    },
    onError: (error: Error) =>
      setSubmitError(error.message || "Submission failed. Check your connection and retry."),
  });

  // Countdown timer: 25 minutes from the first time this attempt opens the quiz.
  const deadline = useMemo(
    () => getDeadline(session.attemptId, QUIZ_DURATION_MS),
    [session.attemptId],
  );
  const [remaining, setRemaining] = useState(() => Math.max(0, deadline - Date.now()));
  const autoSubmitted = useRef(false);

  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, deadline - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline]);

  useEffect(() => {
    if (remaining > 0 || autoSubmitted.current || mutation.isPending || mutation.isSuccess) return;
    autoSubmitted.current = true;
    setConfirmOpen(false);
    mutation.mutate();
  }, [remaining, mutation]);

  const totalSeconds = Math.ceil(remaining / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  const lowTime = remaining <= 60_000;


  function choose(option: OptionKey) {
    if (!current) return;
    const next = { ...answers, [current.id]: option };
    setAnswers(next);
    saveAnswers(session.attemptId, next);
  }

  if (query.isPending) {
    return (
      <main className="relative flex min-h-screen items-center justify-center">
        <Backdrop />
        <p className="text-sm text-muted-foreground">
          <Loader2 className="mr-2 inline size-4 animate-spin" aria-hidden="true" />
          Loading questions…
        </p>
      </main>
    );
  }

  if (query.isError || !current) {
    return (
      <main className="relative flex min-h-screen items-center justify-center px-5">
        <Backdrop />
        <div className="surface-glass max-w-md rounded-3xl p-8 text-center">
          <ShieldAlert className="mx-auto size-8 text-destructive" aria-hidden="true" />
          <h1 className="mt-4 text-lg font-semibold">We couldn't load your quiz</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {(query.error as Error | null)?.message ?? "Please check your connection and retry."}
          </p>
          <Button className="mt-6 rounded-xl" onClick={() => query.refetch()}>
            <RefreshCw className="size-4" aria-hidden="true" /> Retry
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen">
      <Backdrop />

      {warning ? (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4"
        >
          <div className="glow-ring flex max-w-xl items-start gap-3 rounded-2xl border border-glass-border bg-glass px-5 py-4 backdrop-blur-xl">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden="true" />
            <p className="text-sm font-semibold">{warning}</p>
          </div>
        </div>
      ) : null}

      <div className="mx-auto w-full max-w-5xl px-5 py-10 md:py-14">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {QUIZ_TITLE}
            </p>
            <h1 className="mt-1 text-2xl font-semibold md:text-3xl">
              Question {index + 1} of {total}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div
              role="timer"
              aria-live="off"
              aria-label={`Time remaining: ${minutes} minutes ${seconds} seconds`}
              className={cn(
                "flex items-center gap-2 rounded-2xl border px-4 py-2 tabular-nums",
                lowTime
                  ? "glow-ring border-destructive/60 bg-destructive/15 text-destructive"
                  : "border-glass-border bg-glass",
              )}
            >
              <TimerIcon className="size-4" aria-hidden="true" />
              <div className="text-left">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  Time left
                </p>
                <p className="text-sm font-semibold">
                  {minutes}:{seconds}
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-glass-border bg-glass px-4 py-2 text-right">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Participant
              </p>
              <p className="text-sm font-semibold">{query.data?.participantName}</p>
            </div>
          </div>

        </header>

        <div className="mt-6">
          <div
            role="progressbar"
            aria-valuenow={answeredCount}
            aria-valuemin={0}
            aria-valuemax={total}
            aria-label={`${answeredCount} of ${total} questions answered`}
            className="relative h-3 overflow-hidden rounded-full border border-glass-border bg-secondary/60"
          >
            <div
              className="h-full rounded-full transition-[width] duration-500 ease-out"
              style={{ width: `${progress}%`, backgroundImage: "var(--gradient-primary)" }}
            />
            <div className="sheen-bar pointer-events-none absolute inset-0" />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {answeredCount} answered · {total - answeredCount} remaining
          </p>
        </div>

        <div className="depth-scene mt-8 grid gap-6 lg:grid-cols-[1fr_auto]">
          <TiltCard
            className="no-select animate-pop-in p-6 md:p-8"
            key={current.id}
            intensity={4}
          >
            <div
              onContextMenu={(event) => {
                event.preventDefault();
                report("context_menu");
              }}
              onCopy={(event) => event.preventDefault()}
            >
              <p className="text-xs uppercase tracking-[0.18em] text-primary">
                Question {current.displayOrder}
              </p>
              <h2 className="mt-3 text-xl font-semibold leading-snug md:text-2xl">
                {current.questionText}
              </h2>

              <fieldset className="mt-6 space-y-3">
                <legend className="sr-only">Choose one option</legend>
                {OPTION_KEYS.map((key) => {
                  const selected = answers[current.id] === key;
                  return (
                    <label
                      key={key}
                      className={cn(
                        "flex cursor-pointer items-start gap-4 rounded-2xl border px-4 py-4 transition-all duration-300",
                        selected
                          ? "glow-ring border-primary/60 bg-primary/15"
                          : "border-glass-border bg-secondary/40 hover:-translate-y-0.5 hover:border-primary/40",
                      )}
                    >
                      <input
                        type="radio"
                        name={`q-${current.id}`}
                        value={key}
                        checked={selected}
                        onChange={() => choose(key)}
                        className="sr-only"
                      />
                      <span
                        aria-hidden="true"
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-xl border text-sm font-semibold",
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-glass-border bg-background/40 text-muted-foreground",
                        )}
                      >
                        {key}
                      </span>
                      <span className="text-sm leading-relaxed md:text-base">
                        {current.options[key]}
                      </span>
                    </label>
                  );
                })}
              </fieldset>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
              <Button
                variant="secondary"
                className="rounded-xl"
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                disabled={index === 0}
              >
                <ArrowLeft className="size-4" aria-hidden="true" /> Previous
              </Button>

              {index < total - 1 ? (
                <Button
                  className="rounded-xl"
                  onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
                >
                  Next <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
              ) : (
                <Button
                  className="rounded-xl"
                  onClick={() => {
                    setSubmitError(null);
                    setConfirmOpen(true);
                  }}
                  disabled={mutation.isPending}
                >
                  <CheckCircle2 className="size-4" aria-hidden="true" /> Submit Quiz
                </Button>
              )}
            </div>

            {submitError ? (
              <p role="alert" className="mt-4 text-sm font-medium text-destructive">
                {submitError}{" "}
                <button
                  className="underline underline-offset-4"
                  onClick={() => mutation.mutate()}
                  type="button"
                >
                  Retry submission
                </button>
              </p>
            ) : null}
          </TiltCard>

          <nav
            aria-label="Question navigator"
            className="surface-glass h-fit rounded-3xl p-5 lg:w-64"
          >
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Navigator</p>
            <div className="mt-4 grid grid-cols-8 gap-2 lg:grid-cols-5">
              {questions.map((q, i) => {
                const isAnswered = Boolean(answers[q.id]);
                const isCurrent = i === index;
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-current={isCurrent ? "true" : undefined}
                    aria-label={`Question ${q.displayOrder}${isAnswered ? ", answered" : ", not answered"}`}
                    className={cn(
                      "flex aspect-square items-center justify-center rounded-lg border text-xs font-semibold transition-transform duration-200 hover:-translate-y-0.5",
                      isCurrent && "ring-2 ring-ring",
                      isAnswered
                        ? "border-primary/60 bg-primary/25 text-foreground"
                        : "border-glass-border bg-secondary/50 text-muted-foreground",
                    )}
                  >
                    {q.displayOrder}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 space-y-1 text-xs text-muted-foreground">
              <p>
                <span className="mr-2 inline-block size-2 rounded-full bg-primary" />
                Answered
              </p>
              <p>
                <span className="mr-2 inline-block size-2 rounded-full bg-muted-foreground/60" />
                Unanswered
              </p>
            </div>
            <Button
              variant="secondary"
              className="mt-5 w-full rounded-xl"
              onClick={() => {
                setSubmitError(null);
                setConfirmOpen(true);
              }}
              disabled={mutation.isPending}
            >
              Submit Quiz
            </Button>
          </nav>
        </div>

        <footer className="mt-12 text-center text-xs text-muted-foreground">
          Website created by JohnBlesso, ROSHAN, Srinaath.
        </footer>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="surface-glass rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Submit your quiz?</AlertDialogTitle>
            <AlertDialogDescription>
              {total - answeredCount > 0
                ? `You have ${total - answeredCount} unanswered question${total - answeredCount === 1 ? "" : "s"}. Unanswered questions are counted as incorrect. This submission is final.`
                : "All questions are answered. This submission is final and cannot be changed."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Keep reviewing</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Submitting…
                </>
              ) : (
                "Submit now"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
