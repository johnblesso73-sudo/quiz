import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Camera, Loader2, RefreshCw, Trophy } from "lucide-react";
import { z } from "zod";

import { Backdrop } from "@/components/quiz/Backdrop";
import { TiltCard } from "@/components/quiz/TiltCard";
import { Button } from "@/components/ui/button";
import { getResult } from "@/lib/quiz.functions";

const searchSchema = z.object({
  a: z.string().uuid().optional(),
  t: z.string().uuid().optional(),
});

export const Route = createFileRoute("/result")({
  ssr: false,
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Your result | Design Thinking – 25 MCQs" },
      {
        name: "description",
        content: "Your server-graded Design Thinking quiz result out of 25.",
      },
      { property: "og:title", content: "Your result | Design Thinking – 25 MCQs" },
      {
        property: "og:description",
        content: "Your server-graded Design Thinking quiz result out of 25.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResultPage,
});

function ResultPage() {
  const { a: attemptId, t: token } = Route.useSearch();
  const fetchResult = useServerFn(getResult);

  const query = useQuery({
    queryKey: ["result", attemptId],
    enabled: Boolean(attemptId && token),
    retry: 2,
    queryFn: () => fetchResult({ data: { attemptId: attemptId!, token: token! } }),
  });

  return (
    <main className="relative flex min-h-screen items-center justify-center px-5 py-14">
      <Backdrop />

      <div className="depth-scene w-full max-w-2xl">
        {!attemptId || !token ? (
          <TiltCard className="p-8 text-center">
            <h1 className="text-xl font-semibold">Result link is incomplete</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Open the result from your quiz submission, or start a new attempt.
            </p>
            <Button asChild className="mt-6 rounded-xl">
              <Link to="/">Back to registration</Link>
            </Button>
          </TiltCard>
        ) : query.isPending ? (
          <p className="text-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 inline size-4 animate-spin" aria-hidden="true" />
            Fetching your result…
          </p>
        ) : query.isError ? (
          <TiltCard className="p-8 text-center">
            <h1 className="text-xl font-semibold">We couldn't load this result</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {(query.error as Error).message}
            </p>
            <Button className="mt-6 rounded-xl" onClick={() => query.refetch()}>
              <RefreshCw className="size-4" aria-hidden="true" /> Retry
            </Button>
          </TiltCard>
        ) : (
          <TiltCard className="animate-pop-in p-8 text-center md:p-12" intensity={5}>
            <span className="mx-auto flex size-16 items-center justify-center rounded-2xl border border-glass-border bg-primary/20">
              <Trophy className="size-7 text-primary" aria-hidden="true" />
            </span>

            <p className="mt-6 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Quiz completed
            </p>
            <h1 className="mt-2 text-2xl font-semibold md:text-3xl">
              {query.data.participantName}
            </h1>

            <p className="mt-8 font-display text-6xl font-semibold md:text-7xl">
              <span className="text-gradient">
                {query.data.score}/{query.data.maxScore}
              </span>
            </p>
            <p className="mt-2 text-lg font-medium text-muted-foreground">
              {query.data.percentage}%
            </p>

            <div className="mx-auto mt-6 h-3 w-full max-w-sm overflow-hidden rounded-full border border-glass-border bg-secondary/60">
              <div
                className="h-full rounded-full transition-[width] duration-700 ease-out"
                style={{
                  width: `${query.data.percentage}%`,
                  backgroundImage: "var(--gradient-primary)",
                }}
              />
            </div>

            <p className="mt-6 text-sm text-muted-foreground">
              Thank you for completing the Design Thinking assessment. Your answers were graded on
              the server.
            </p>

            <div className="glow-ring mt-8 flex items-center justify-center gap-3 rounded-2xl border border-glass-border bg-primary/12 px-5 py-4">
              <Camera className="size-5 shrink-0 text-primary" aria-hidden="true" />
              <p className="text-sm font-semibold">
                Please take a screenshot of this result for your records.
              </p>
            </div>

            <p className="mt-6 text-xs text-muted-foreground">
              Attempt ID: <span className="font-mono">{query.data.attemptId}</span>
            </p>

            <footer className="mt-10 text-xs text-muted-foreground">
              Website created by JohnBlesso, ROSHAN, Srinaath.
            </footer>
          </TiltCard>
        )}
      </div>
    </main>
  );
}
