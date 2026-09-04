import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Download, KeyRound, Loader2, Lock } from "lucide-react";

import { Backdrop } from "@/components/quiz/Backdrop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminListAttempts, type AdminAttemptRow, type AdminResponse } from "@/lib/admin.functions";
import { INTEGRITY_EVENT_TYPES } from "@/lib/quiz-schemas";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin · Attempts | Design Thinking Quiz" },
      { name: "description", content: "Protected administration area for quiz attempts." },
      { property: "og:title", content: "Admin · Attempts | Design Thinking Quiz" },
      { property: "og:description", content: "Protected administration area for quiz attempts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const list = useServerFn(adminListAttempts);
  const [accessKey, setAccessKey] = useState("");
  const [search, setSearch] = useState("");
  const [eventType, setEventType] = useState("");
  const [minScore, setMinScore] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [state, setState] = useState<AdminResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      list({
        data: {
          accessKey,
          search: search || undefined,
          eventType: eventType || undefined,
          minScore: minScore ? Number(minScore) : undefined,
          from: from ? new Date(from).toISOString() : undefined,
          to: to ? new Date(`${to}T23:59:59`).toISOString() : undefined,
        },
      }),
    onSuccess: (data) => {
      setState(data);
      setError(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  const rows: AdminAttemptRow[] =
    state && state.configured && state.authorized ? state.rows : [];

  function exportCsv() {
    const header = [
      "attempt_id",
      "name",
      "registration_number",
      "college_email",
      "started_at",
      "submitted_at",
      "score",
      "max_score",
      "status",
      "integrity_events",
      "event_types",
    ];
    const body = rows.map((r) =>
      [
        r.attemptId,
        r.name,
        r.registrationNumber,
        r.collegeEmail,
        r.startedAt,
        r.submittedAt ?? "",
        r.score ?? "",
        r.maxScore,
        r.status,
        r.integrityEventCount,
        r.eventTypes.join("|"),
      ]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...body].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `quiz-attempts-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="relative min-h-screen px-5 py-12">
      <Backdrop />
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Protected area</p>
          <h1 className="mt-1 text-3xl font-semibold">
            <span className="text-gradient">Attempt monitor</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Answer keys and per-question correctness are never exposed here — only attempt metadata,
            scores and integrity signals.
          </p>
        </header>

        <section className="surface-glass rounded-3xl p-6">
          <form
            className="grid gap-4 md:grid-cols-3"
            onSubmit={(event) => {
              event.preventDefault();
              mutation.mutate();
            }}
          >
            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="key">Admin access key</Label>
              <Input
                id="key"
                type="password"
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
                className="h-11 rounded-xl bg-secondary/50"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="search">Name / registration / email</Label>
              <Input
                id="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 rounded-xl bg-secondary/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event">Integrity event type</Label>
              <select
                id="event"
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="h-11 w-full rounded-xl border border-input bg-secondary/50 px-3 text-sm"
              >
                <option value="">Any</option>
                {INTEGRITY_EVENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="minScore">Minimum score</Label>
              <Input
                id="minScore"
                type="number"
                min={0}
                max={25}
                value={minScore}
                onChange={(e) => setMinScore(e.target.value)}
                className="h-11 rounded-xl bg-secondary/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="from">From date</Label>
              <Input
                id="from"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="h-11 rounded-xl bg-secondary/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="to">To date</Label>
              <Input
                id="to"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="h-11 rounded-xl bg-secondary/50"
              />
            </div>
            <div className="flex items-end gap-3">
              <Button type="submit" className="rounded-xl" disabled={mutation.isPending}>
                {mutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <KeyRound className="size-4" aria-hidden="true" />
                )}
                Load attempts
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="rounded-xl"
                onClick={exportCsv}
                disabled={rows.length === 0}
              >
                <Download className="size-4" aria-hidden="true" /> CSV
              </Button>
            </div>
          </form>

          {error ? (
            <p role="alert" className="mt-4 text-sm font-medium text-destructive">
              {error}
            </p>
          ) : null}

          {state && !state.configured ? (
            <div className="mt-6 rounded-2xl border border-warning/40 bg-warning/10 p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Lock className="size-4" aria-hidden="true" /> Admin access is not configured
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                This area stays locked until an <code>ADMIN_ACCESS_KEY</code> secret is configured
                in the backend settings. Add it in Project Settings → Secrets, then reload.
              </p>
            </div>
          ) : null}

          {state && state.configured && !state.authorized ? (
            <p role="alert" className="mt-4 text-sm font-medium text-destructive">
              Invalid access key.
            </p>
          ) : null}
        </section>

        {rows.length > 0 ? (
          <section className="surface-glass mt-6 overflow-x-auto rounded-3xl p-2">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="p-3">Name</th>
                  <th className="p-3">Registration</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Started</th>
                  <th className="p-3">Score</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Integrity</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.attemptId} className="border-t border-glass-border">
                    <td className="p-3 font-medium">{row.name}</td>
                    <td className="p-3">{row.registrationNumber}</td>
                    <td className="p-3">{row.collegeEmail}</td>
                    <td className="p-3">{new Date(row.startedAt).toLocaleString()}</td>
                    <td className="p-3">
                      {row.score == null ? "—" : `${row.score}/${row.maxScore}`}
                    </td>
                    <td className="p-3">{row.status}</td>
                    <td className="p-3">
                      {row.integrityEventCount}
                      {row.eventTypes.length ? (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {row.eventTypes.join(", ")}
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}
      </div>
    </main>
  );
}
