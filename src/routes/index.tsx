import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Clock, Lock, ShieldCheck, Sparkles, ArrowRight, Loader2 } from "lucide-react";

import { Backdrop } from "@/components/quiz/Backdrop";
import { TiltCard } from "@/components/quiz/TiltCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { startAttempt } from "@/lib/quiz.functions";
import {
  ESTIMATED_MINUTES,
  QUIZ_QUESTION_COUNT,
  QUIZ_TITLE,
  registrationSchema,
} from "@/lib/quiz-schemas";
import { saveSession } from "@/lib/quiz-session";

const description =
  "Register and take the Design Thinking 25-question MCQ assessment. Server-graded, secure, and screenshot-ready results.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Design Thinking – 25 MCQs | Academic Quiz" },
      { name: "description", content: description },
      { property: "og:title", content: "Design Thinking – 25 MCQs" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WelcomePage,
});

type FieldErrors = Partial<Record<"name" | "registrationNumber" | "collegeEmail", string>>;

function WelcomePage() {
  const navigate = useNavigate();
  const start = useServerFn(startAttempt);
  const [values, setValues] = useState({ name: "", registrationNumber: "", collegeEmail: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const parsed = registrationSchema.safeParse(values);
  const isValid = parsed.success;
  const displayName = values.name.trim();

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = registrationSchema.parse(values);
      return start({ data: payload });
    },
    onSuccess: (data) => {
      saveSession({
        attemptId: data.attemptId,
        token: data.token,
        participantName: data.participantName,
      });
      navigate({ to: "/quiz" });
    },
    onError: (error: Error) => setFormError(error.message || "Something went wrong. Try again."),
  });

  function validateField(field: keyof typeof values) {
    const result = registrationSchema.safeParse(values);
    if (result.success) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
      return;
    }
    const issue = result.error.issues.find((i) => i.path[0] === field);
    setErrors((prev) => ({ ...prev, [field]: issue?.message }));
  }

  return (
    <main className="relative min-h-screen">
      <Backdrop />

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-5 py-14 md:py-20">
        <header className="animate-pop-in max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-glass-border bg-glass px-4 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
            Academic assessment
          </span>
          <h1 className="mt-6 text-4xl font-semibold leading-[1.05] md:text-6xl">
            <span className="text-gradient">{QUIZ_TITLE}</span>
          </h1>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground md:text-lg">
            A single-choice multiple choice assessment covering the Design Thinking mindset, tools,
            phases and the Double Diamond model. Answer all {QUIZ_QUESTION_COUNT} questions, then
            submit once — your paper is graded on the server.
          </p>

          <dl className="mt-8 grid gap-3 sm:grid-cols-3">
            <InfoTile
              icon={<Clock className="size-4 text-primary" aria-hidden="true" />}
              label="Estimated duration"
              value={`~${ESTIMATED_MINUTES} minutes`}
            />
            <InfoTile
              icon={<ShieldCheck className="size-4 text-primary" aria-hidden="true" />}
              label="Questions"
              value={`${QUIZ_QUESTION_COUNT} MCQs · 1 mark each`}
            />
            <InfoTile
              icon={<Lock className="size-4 text-primary" aria-hidden="true" />}
              label="Grading"
              value="Server-side only"
            />
          </dl>

          <section className="mt-8 rounded-2xl border border-glass-border bg-glass p-5 text-sm leading-relaxed text-muted-foreground">
            <h2 className="text-sm font-semibold text-foreground">Instructions & privacy</h2>
            <ul className="mt-3 space-y-1.5">
              <li>• One question at a time; you can move back and forth before submitting.</li>
              <li>• Unanswered questions are marked incorrect. You get one submission.</li>
              <li>
                • We store only your name, registration number, college email, your answers and
                basic integrity signals (such as screenshot-key presses or leaving the page). No
                camera, microphone, screen recording or browsing history is ever accessed.
              </li>
            </ul>
          </section>
        </header>

        <section className="depth-scene" aria-labelledby="registration-heading">
          <TiltCard className="animate-pop-in mx-auto w-full max-w-xl p-6 md:p-8">
            <h2 id="registration-heading" className="text-xl font-semibold">
              Participant registration
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              All fields are required and verified again on the server.
            </p>

            <form
              className="mt-6 space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                setFormError(null);
                if (!isValid) return;
                mutation.mutate();
              }}
              noValidate
            >
              <Field
                id="name"
                label="Full name"
                value={values.name}
                error={errors.name}
                autoComplete="name"
                maxLength={100}
                onChange={(v) => setValues((s) => ({ ...s, name: v }))}
                onBlur={() => validateField("name")}
              />
              <Field
                id="registrationNumber"
                label="Registration number"
                value={values.registrationNumber}
                error={errors.registrationNumber}
                autoComplete="off"
                maxLength={50}
                onChange={(v) => setValues((s) => ({ ...s, registrationNumber: v }))}
                onBlur={() => validateField("registrationNumber")}
              />
              <Field
                id="collegeEmail"
                label="College email ID"
                type="email"
                value={values.collegeEmail}
                error={errors.collegeEmail}
                autoComplete="email"
                maxLength={255}
                onChange={(v) => setValues((s) => ({ ...s, collegeEmail: v }))}
                onBlur={() => validateField("collegeEmail")}
              />

              <div
                className="rounded-2xl border border-glass-border bg-secondary/40 p-4"
                aria-live="polite"
              >
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Participant identity
                </p>
                <p className="mt-1 text-lg font-semibold">
                  {displayName ? `Welcome, ${displayName}` : "Welcome, —"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {values.registrationNumber.trim() || "Registration number"} ·{" "}
                  {values.collegeEmail.trim() || "college email"}
                </p>
              </div>

              {formError ? (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {formError}
                </p>
              ) : null}

              <Button
                type="submit"
                size="lg"
                disabled={!isValid || mutation.isPending}
                className="w-full rounded-2xl text-base"
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Preparing your
                    paper…
                  </>
                ) : (
                  <>
                    Start Quiz <ArrowRight className="size-4" aria-hidden="true" />
                  </>
                )}
              </Button>
              {!isValid ? (
                <p className="text-center text-xs text-muted-foreground">
                  Start Quiz unlocks once all three fields are valid.
                </p>
              ) : null}
            </form>
          </TiltCard>
        </section>

        <footer className="pb-4 text-center text-sm text-muted-foreground">
          Website created by JohnBlesso, ROSHAN, Srinaath.
        </footer>
      </div>
    </main>
  );
}

function InfoTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-glass-border bg-glass px-4 py-3">
      <dt className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold">{value}</dd>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  error,
  onChange,
  onBlur,
  type = "text",
  autoComplete,
  maxLength,
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  type?: string;
  autoComplete?: string;
  maxLength?: number;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        maxLength={maxLength}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        className="h-12 rounded-xl bg-secondary/50 text-base"
      />
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
