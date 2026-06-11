import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { History, CheckCircle2, XCircle, MinusCircle, Clock, Play } from "lucide-react";
import { useRuns, useProjects, useTestCases, createMockRun, type TestRun, type TestRunResult } from "@/lib/store";
import { usePanel } from "@/components/PanelContext";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "./_app.projects";
import { toast } from "./_app";

export const Route = createFileRoute("/_app/runs")({
  head: () => ({ meta: [{ title: "Test Runs — Field Notes" }] }),
  component: RunsPage,
});

const FILTERS = ["All", "Passed", "Failed", "Running"] as const;

function RunsPage() {
  const [runs] = useRuns();
  const [projects] = useProjects();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const { openPanel } = usePanel();

  const filteredRuns = filter === "All"
    ? runs
    : runs.filter((r) => r.status === filter.toLowerCase());

  function handleNewRun() {
    if (projects.length === 0) {
      toast.error("Create a project first");
      return;
    }
    const run = createMockRun(projects[0].id);
    toast.success(`Run ${run.id} completed — ${run.results.filter((r) => r.status === "passed").length}/${run.results.length} passed`);
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        section="§ Runs"
        title="Test runs"
        subtitle="A ledger of every execution."
        action={
          <button onClick={handleNewRun} className="rounded-sm bg-foreground px-4 py-2 text-sm text-background hover:bg-accent transition-colors">
            <Play className="mr-1.5 inline h-3.5 w-3.5" /> New run
          </button>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-4 py-1.5 text-xs transition-colors ${filter === f ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground"}`}
          >
            {f}
          </button>
        ))}
      </div>

      {filteredRuns.length === 0 ? (
        <div className="border border-border bg-card">
          <div className="grid grid-cols-[80px_1fr_100px_120px_100px_120px] gap-4 border-b border-border bg-muted/40 px-5 py-3 label-eyebrow">
            <span>Run ID</span><span>Project</span><span>Status</span><span>Started</span><span>Duration</span><span>Results</span>
          </div>
          <EmptyState
            icon={History}
            title="No test runs yet"
            body="When you run a suite, it'll appear here as a row in the ledger."
            cta={{ label: "Run now", onClick: handleNewRun }}
          />
        </div>
      ) : (
        <div className="border border-border bg-card">
          {/* Table header */}
          <div className="grid grid-cols-[80px_1fr_100px_120px_100px_120px] gap-4 border-b border-border bg-muted/40 px-5 py-3 label-eyebrow">
            <span>Run ID</span><span>Project</span><span>Status</span><span>Started</span><span>Duration</span><span>Results</span>
          </div>
          {/* Rows */}
          {filteredRuns.map((run, i) => {
            const passed = run.results.filter((r) => r.status === "passed").length;
            const failed = run.results.filter((r) => r.status === "failed").length;
            const skipped = run.results.filter((r) => r.status === "skipped").length;

            return (
              <button
                key={run.id}
                onClick={() => openPanel(
                  <RunDetail run={run} />,
                  [{ label: "Test Runs" }, { label: run.id }]
                )}
                className={`stagger-item grid w-full grid-cols-[80px_1fr_100px_120px_100px_120px] gap-4 px-5 py-3.5 text-left text-sm hover:bg-muted/40 transition-colors ${i > 0 ? "border-t border-border" : ""}`}
              >
                <span className="font-mono text-xs">{run.id}</span>
                <span className="truncate">{run.projectName || "—"}</span>
                <span className={`inline-flex w-fit rounded-sm px-2 py-0.5 font-mono text-[10px] status-${run.status}`}>
                  {run.status}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {new Date(run.startedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {(run.duration / 1000).toFixed(1)}s
                </span>
                <span className="flex items-center gap-2 font-mono text-xs">
                  <span className="text-sage">{passed}</span>/
                  <span className="text-rust">{failed}</span>/
                  <span className="text-muted-foreground">{skipped}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Run Detail (panel) ────────────────────────────────── */

function RunDetail({ run }: { run: TestRun }) {
  const [testCases] = useTestCases();
  const passed = run.results.filter((r) => r.status === "passed").length;
  const failed = run.results.filter((r) => r.status === "failed").length;
  const skipped = run.results.filter((r) => r.status === "skipped").length;

  return (
    <div className="space-y-5">
      <div>
        <p className="label-eyebrow text-accent">§ Test Run</p>
        <h2 className="mt-1 font-display text-3xl">{run.id}</h2>
        <p className="mt-1 font-mono text-[11px] text-muted-foreground">
          {run.projectName} {run.suiteName ? `· ${run.suiteName}` : ""} · {new Date(run.startedAt).toLocaleString()}
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-3">
        <MiniStat label="Total" value={String(run.results.length)} />
        <MiniStat label="Passed" value={String(passed)} className="text-sage" />
        <MiniStat label="Failed" value={String(failed)} className="text-rust" />
        <MiniStat label="Skipped" value={String(skipped)} />
      </div>

      <div className="flex items-center gap-3">
        <span className={`rounded-sm px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider status-${run.status}`}>
          {run.status}
        </span>
        <span className="font-mono text-xs text-muted-foreground">
          Duration: {(run.duration / 1000).toFixed(1)}s
        </span>
      </div>

      {/* Per-test results */}
      <div>
        <p className="label-eyebrow mb-3">Test Results</p>
        <div className="border border-border bg-background">
          {run.results.map((result, i) => {
            const tc = testCases.find((c) => c.id === result.testCaseId);
            return (
              <div key={i} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-border" : ""}`}>
                {result.status === "passed" ? <CheckCircle2 className="h-4 w-4 text-sage shrink-0" /> :
                 result.status === "failed" ? <XCircle className="h-4 w-4 text-rust shrink-0" /> :
                 <MinusCircle className="h-4 w-4 text-muted-foreground shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{tc?.title || `Test ${i + 1}`}</p>
                  {result.error && (
                    <p className="mt-0.5 font-mono text-[10px] text-rust">{result.error}</p>
                  )}
                </div>
                <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                  {(result.duration / 1000).toFixed(1)}s
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className="border border-border bg-muted/20 p-3 text-center">
      <p className={`font-display text-2xl ${className}`}>{value}</p>
      <p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{label}</p>
    </div>
  );
}