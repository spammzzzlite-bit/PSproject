import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  FlaskConical, Plus, Play, CheckCircle2, XCircle, Trash2, Tag, Coins
} from "lucide-react";
import {
  useProjects, useSuites, useTestCases, useRuns,
  createMockRun, deductTokens, addNotification,
  type TestCase,
} from "@/lib/store";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader, Modal } from "./_app.projects";
import { toast } from "./_app";

export const Route = createFileRoute("/_app/regression")({
  head: () => ({ meta: [{ title: "Regression — Field Notes" }] }),
  component: RegressionPage,
});

// Regression suites are stored in localStorage separately
type RegressionSuite = {
  id: string;
  name: string;
  tags: string[];
  testCaseIds: string[];
  createdAt: number;
};

function useRegressionSuites() {
  const key = "ai-test-gen.regression-suites";
  const [suites, setSuites] = useState<RegressionSuite[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
  });
  const save = (next: RegressionSuite[]) => {
    setSuites(next);
    localStorage.setItem(key, JSON.stringify(next));
  };
  return { suites, save };
}

const TAG_PRESETS = ["smoke", "regression", "critical-path", "e2e", "api", "ui"];

function RegressionPage() {
  const [projects] = useProjects();
  const [allSuites] = useSuites();
  const [testCases] = useTestCases();
  const [runs] = useRuns();
  const { suites: regSuites, save } = useRegressionSuites();
  const [showNew, setShowNew] = useState(false);

  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedSuiteId, setSelectedSuiteId] = useState("");

  function handleDelete(id: string) {
    if (confirm("Delete this regression suite?")) {
      save(regSuites.filter((s) => s.id !== id));
      toast.success("Regression suite deleted");
    }
  }

  function handleRun(suite: RegressionSuite) {
    if (projects.length === 0) {
      toast.error("Create a project first");
      return;
    }
    if (!deductTokens(10)) {
      toast.error("Insufficient tokens to run regression.");
      return;
    }
    addNotification("Tokens Deducted", "Deducted 10 tokens for running regression suite.", "info");

    const run = createMockRun(projects[0].id);
    addNotification("Regression Run Complete", `Regression run ${run.id} finished: ${run.results.filter(r => r.status === "passed").length}/${run.results.length} passed.`, "success");
    toast.success(`Regression run ${run.id} — ${run.results.filter((r) => r.status === "passed").length}/${run.results.length} passed`);
  }

  function handleRunFocused() {
    if (!selectedProjectId) {
      toast.error("Please select a project.");
      return;
    }
    if (!deductTokens(10)) {
      toast.error("Insufficient tokens to run regression.");
      return;
    }
    addNotification("Tokens Deducted", "Deducted 10 tokens for running regression tests.", "info");

    const run = createMockRun(selectedProjectId, selectedSuiteId || undefined);
    addNotification("Regression Run Complete", `Regression run ${run.id} finished: ${run.results.filter(r => r.status === "passed").length}/${run.results.length} passed.`, "success");
    toast.success(`Regression run ${run.id} complete — ${run.results.filter((r) => r.status === "passed").length}/${run.results.length} passed`);
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        section="§ Regression"
        title="Regression suites"
        subtitle="Cherry-pick test cases into regression suites for focused re-runs."
        action={
          <button onClick={() => setShowNew(true)} className="rounded-sm bg-foreground px-4 py-2 text-sm text-background hover:bg-accent transition-colors" disabled={testCases.length === 0}>
            + New regression suite
          </button>
        }
      />

      {/* Focused Run Panel */}
      <div className="mb-8 rounded-[12px] border border-[var(--c-border)] bg-[var(--c-bg-card)] p-6 shadow-[var(--shadow-sm)]">
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--c-accent)] font-medium mb-4">Run Focused Regression</p>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <label className="block font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">Select Project</label>
            <select
              value={selectedProjectId}
              onChange={(e) => { setSelectedProjectId(e.target.value); setSelectedSuiteId(""); }}
              className="w-full rounded-[6px] border border-[var(--c-border)] bg-[var(--c-bg-input)] p-[10px] text-[13px] outline-none focus:border-[var(--c-accent)]"
            >
              <option value="">Select project…</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="flex-1 space-y-1.5">
            <label className="block font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">Select Suite</label>
            <select
              value={selectedSuiteId}
              onChange={(e) => setSelectedSuiteId(e.target.value)}
              disabled={!selectedProjectId}
              className="w-full rounded-[6px] border border-[var(--c-border)] bg-[var(--c-bg-input)] p-[10px] text-[13px] outline-none focus:border-[var(--c-accent)] disabled:opacity-40"
            >
              <option value="">All Suites</option>
              {allSuites.filter((s) => s.projectId === selectedProjectId).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleRunFocused}
            disabled={!selectedProjectId}
            className="rounded-[8px] bg-[var(--c-text)] px-[20px] py-[10px] text-[13px] font-medium text-white transition-all hover:-translate-y-[1px] hover:bg-[#2C2825]"
          >
            Run Regression
          </button>
        </div>
      </div>

      {regSuites.length === 0 ? (
        <EmptyState
          icon={FlaskConical}
          title="No regression suites yet"
          body="Create a regression suite by picking test cases from across your projects."
          cta={testCases.length > 0 ? { label: "Create one", onClick: () => setShowNew(true) } : { label: "Create test cases first", to: "/suites" }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {regSuites.map((suite, i) => {
            // Last 5 simulated health
            const health = Array.from({ length: 5 }, () => Math.random() > 0.25);
            return (
              <div key={suite.id} className="stagger-item border border-border bg-card p-6" style={{ animationDelay: `${i * 40}ms` }}>
                <div className="flex items-start justify-between">
                  <FlaskConical className="h-6 w-6 text-accent" />
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleRun(suite)} className="p-1.5 text-muted-foreground hover:text-accent" title="Run">
                      <Play className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDelete(suite.id)} className="p-1.5 text-muted-foreground hover:text-destructive" title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <h3 className="mt-4 font-display text-2xl">{suite.name}</h3>
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                  {suite.testCaseIds.length} test case{suite.testCaseIds.length !== 1 ? "s" : ""}
                </p>

                {/* Tags */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {suite.tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 rounded-sm border border-border px-2 py-0.5 font-mono text-[10px]">
                      <Tag className="h-2.5 w-2.5" />{tag}
                    </span>
                  ))}
                </div>

                {/* Health */}
                <div className="mt-4 pt-3 border-t border-border">
                  <p className="label-eyebrow mb-2">Last 5 runs</p>
                  <div className="flex gap-1.5">
                    {health.map((passed, j) => (
                      <div key={j} className={`h-6 flex-1 flex items-center justify-center rounded-sm ${passed ? "bg-sage/15" : "bg-rust/15"}`}>
                        {passed
                          ? <CheckCircle2 className="h-3 w-3 text-sage" />
                          : <XCircle className="h-3 w-3 text-rust" />
                        }
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showNew && <NewRegressionModal testCases={testCases} onClose={() => setShowNew(false)} onSave={(suite) => { save([suite, ...regSuites]); setShowNew(false); }} />}
    </div>
  );
}

/* ─── New Regression Suite Modal ────────────────────────── */

function NewRegressionModal({
  testCases,
  onClose,
  onSave,
}: {
  testCases: TestCase[];
  onClose: () => void;
  onSave: (suite: RegressionSuite) => void;
}) {
  const [name, setName] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedCases, setSelectedCases] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const filteredCases = testCases.filter((tc) => {
    const matchesSearch = !search || tc.title.toLowerCase().includes(search.toLowerCase());
    const matchesTags = selectedTags.length === 0 || selectedTags.some((t) => tc.tags.includes(t));
    return matchesSearch && matchesTags;
  });

  function toggle(id: string) {
    setSelectedCases((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || selectedCases.size === 0) return;
    const suite: RegressionSuite = {
      id: crypto.randomUUID(),
      name: name.trim(),
      tags: selectedTags,
      testCaseIds: Array.from(selectedCases),
      createdAt: Date.now(),
    };
    onSave(suite);
    toast.success(`Regression suite "${suite.name}" created with ${suite.testCaseIds.length} cases`);
  }

  return (
    <Modal onClose={onClose} title="New regression suite">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="mb-2 block font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--c-text-muted)]">Suite name</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Nightly Smoke"
            className="w-full rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg-input)] px-[14px] py-[10px] text-[14px] outline-none transition-all duration-[var(--t-fast)] focus:border-[var(--c-accent)] focus:shadow-[0_0_0_3px_var(--c-accent-soft)]"
          />
        </div>

        <div>
          <label className="mb-2 block font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--c-text-muted)]">Tags</label>
          <div className="flex flex-wrap gap-2">
            {TAG_PRESETS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])}
                className={`rounded-[6px] border px-2.5 py-1 font-mono text-[10px] transition-colors ${selectedTags.includes(tag) ? "border-[var(--c-accent)] bg-[var(--c-accent-soft)] text-[var(--c-accent)]" : "border-[var(--c-border)] hover:border-[var(--c-border-strong)]"}`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--c-text-muted)]">Select test cases ({selectedCases.size} selected)</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by name…"
            className="w-full rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg-input)] px-[14px] py-[10px] text-[14px] outline-none focus:border-[var(--c-accent)] mb-2"
          />
          <div className="max-h-48 overflow-y-auto border border-[var(--c-border)] rounded-[8px] bg-[var(--c-bg-card)]">
            {filteredCases.length === 0 ? (
              <p className="py-6 text-center text-sm text-[var(--c-text-muted)]">No matching test cases</p>
            ) : (
              filteredCases.map((tc) => (
                <button
                  key={tc.id}
                  type="button"
                  onClick={() => toggle(tc.id)}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm border-b border-[var(--c-border)] last:border-0 transition-colors ${selectedCases.has(tc.id) ? "bg-[var(--c-accent-soft)]/20" : "hover:bg-[var(--c-bg-hover)]"}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 rounded-sm border ${selectedCases.has(tc.id) ? "bg-[var(--c-accent)] border-[var(--c-accent)]" : "border-[var(--c-border)]"}`} />
                  <span className="flex-1 truncate text-[13px] text-[var(--c-text)]">{tc.title}</span>
                  <span className={`rounded-sm px-1.5 py-0.5 font-mono text-[9px] badge-${tc.priority}`}>{tc.priority}</span>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-[8px] border-[1.5px] border-[var(--c-border)] bg-transparent px-[16px] py-[8px] text-[13px] font-medium transition-all hover:bg-[var(--c-bg-hover)]">Cancel</button>
          <button type="submit" disabled={!name.trim() || selectedCases.size === 0} className="rounded-[8px] bg-[var(--c-text)] px-[16px] py-[8px] text-[13px] font-medium text-white transition-all hover:-translate-y-[1px] hover:bg-[#2C2825] disabled:opacity-40">
            Create suite
          </button>
        </div>
      </form>
    </Modal>
  );
}
