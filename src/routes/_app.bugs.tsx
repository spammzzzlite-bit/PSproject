import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bug, Plus, ArrowRight, Trash2 } from "lucide-react";
import {
  useBugs, useProjects, useRuns, useSuites,
  createBug, updateBugStatus, deleteBug,
  type BugReport, type BugSeverity, type BugStatus,
} from "@/lib/store";
import { usePanel } from "@/components/PanelContext";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "./_app.projects";
import { toast } from "./_app";

export const Route = createFileRoute("/_app/bugs")({
  head: () => ({ meta: [{ title: "Bugs — Field Notes" }] }),
  component: BugsPage,
});

const SEVERITY_ORDER: BugSeverity[] = ["critical", "high", "medium", "low"];
const STATUS_OPTIONS: BugStatus[] = ["open", "in_progress", "fixed", "verified", "closed"];
const STATUS_LABELS: Record<BugStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  fixed: "Fixed",
  verified: "Verified",
  closed: "Closed",
};

import { Download, CheckCircle2, ShieldAlert } from "lucide-react";
import { useTestCases, type TestCase } from "@/lib/store";
import { exportToExcel } from "@/lib/export";

// ...

function BugsPage() {
  const [bugs] = useBugs();
  const [projects] = useProjects();
  const [cases] = useTestCases();
  const [runs] = useRuns();
  const [filter, setFilter] = useState<"all" | BugStatus>("all");
  const { openPanel, closePanel } = usePanel();

  const filtered = filter === "all" ? bugs : bugs.filter((b) => b.status === filter);

  const openCount = bugs.filter((b) => b.status === "open").length;
  const inFixCount = bugs.filter((b) => b.status === "in_progress").length;
  const closedCount = bugs.filter(
    (b) => b.status === "closed" && Date.now() - b.createdAt < 30 * 24 * 60 * 60 * 1000
  ).length;

  const handleExport = () => {
    if (projects.length === 0) {
      toast.error("No project context for export.");
      return;
    }
    exportToExcel({
      projectName: projects[0].name,
      cases,
      runs,
      bugs,
      inputInfo: { type: "Manual Export", summary: "Bug Report Export" },
    });
    toast.success("Bug report exported");
  };

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        section="§ Bugs"
        title="Bug tracker"
        subtitle="Track defects found during testing."
      />

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-3 mb-10">
        <div className={`group relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-[2px] hover:shadow-md ${openCount > 0 ? "border-l-[3px] border-l-[var(--c-fail)]" : ""}`}>
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-muted/50 p-2"><Bug className="h-5 w-5 text-foreground" /></div>
            <div>
              <p className="label-eyebrow text-muted-foreground">Open Bugs</p>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-3xl">{openCount}</span>
                <span className="text-xs text-muted-foreground">{openCount > 0 ? "Needs attention" : "All clear"}</span>
              </div>
            </div>
          </div>
        </div>
        <div className={`group relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-[2px] hover:shadow-md ${inFixCount > 0 ? "border-l-[3px] border-l-[var(--c-warn)]" : ""}`}>
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-muted/50 p-2"><ShieldAlert className="h-5 w-5 text-foreground" /></div>
            <div>
              <p className="label-eyebrow text-muted-foreground">In Fix</p>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-3xl">{inFixCount}</span>
                <span className="text-xs text-muted-foreground">Being worked on</span>
              </div>
            </div>
          </div>
        </div>
        <div className={`group relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-[2px] hover:shadow-md ${closedCount > 0 ? "border-l-[3px] border-l-[var(--c-pass)]" : ""}`}>
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-muted/50 p-2"><CheckCircle2 className="h-5 w-5 text-foreground" /></div>
            <div>
              <p className="label-eyebrow text-muted-foreground">Closed (30D)</p>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-3xl">{closedCount}</span>
                <span className="text-xs text-muted-foreground">{closedCount > 0 ? "Good progress" : "No closures yet"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-full border px-4 py-1.5 text-xs tracking-wider transition-colors ${filter === "all" ? "border-foreground bg-foreground text-background" : "border-border bg-card hover:border-foreground"}`}
          >
            All ({bugs.length})
          </button>
          {STATUS_OPTIONS.map((s) => {
            const count = bugs.filter((b) => b.status === s).length;
            return (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`rounded-full border px-4 py-1.5 text-xs tracking-wider transition-colors ${filter === s ? "border-foreground bg-foreground text-background" : "border-border bg-card hover:border-foreground"}`}
              >
                {STATUS_LABELS[s]} ({count})
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-[13px] font-medium hover:border-foreground transition-colors shadow-sm">
            <Download className="h-4 w-4" /> Export Bug Report
          </button>
          <button
            onClick={() => openPanel(<NewBugDrawer onClose={closePanel} />, [{ label: "Bugs" }, { label: "Create Ticket" }])}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-[13px] font-medium text-white hover:bg-[#C25838] transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" /> Create Bug
          </button>
        </div>
      </div>

      {cases.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center shadow-sm">
          <Bug className="mx-auto h-10 w-10 text-muted-foreground opacity-50" />
          <h3 className="mt-4 font-display text-xl text-foreground">No test cases found</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
            Generate or add test cases first before reporting a bug. A bug CANNOT be created unless it is linked to an existing test case.
          </p>
          <div className="mt-6">
            <a href="/generate" className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:bg-accent transition-colors">
              Go to Generate Tests <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Bug}
          title={filter === "all" ? "No bugs filed yet" : `No ${STATUS_LABELS[filter as BugStatus].toLowerCase()} bugs`}
          body="File bugs from test runs or manually to track defects."
          cta={{ label: "File a bug", onClick: () => openPanel(<NewBugDrawer onClose={closePanel} />, [{ label: "Bugs" }, { label: "Create Ticket" }]) }}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          {/* Table header */}
          <div className="grid grid-cols-[100px_minmax(200px,1fr)_120px_100px_100px_80px] gap-4 bg-[var(--c-bg-sidebar)] px-5 py-2.5 text-[10px] uppercase tracking-[0.1em] text-muted-foreground border-b border-border">
            <span>Bug ID</span><span>Title</span><span>Linked TC</span><span>Severity</span><span>Status</span><span className="text-right">Actions</span>
          </div>
          {filtered.map((bug, i) => {
            const statusColor = bug.status === "open" ? "#9C9088" : bug.status === "closed" ? "var(--c-pass)" : "var(--c-accent)";
            return (
              <div
                key={bug.id}
                className={`stagger-item grid w-full grid-cols-[100px_minmax(200px,1fr)_120px_100px_100px_80px] items-center gap-4 px-5 py-3.5 text-left text-sm transition-colors hover:bg-[var(--c-bg-hover)] cursor-pointer ${i > 0 ? "border-t border-border" : ""}`}
                onClick={() => openPanel(<BugDetail bug={bug} />, [{ label: "Bugs" }, { label: bug.id }])}
              >
                <span className="font-mono text-[12px] text-muted-foreground">{bug.id}</span>
                <span className="truncate text-[14px] text-foreground max-w-[400px]">{bug.title}</span>
                <div>
                  {bug.testCaseId ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const tc = cases.find((c) => c.id === bug.testCaseId);
                        if (tc) {
                          toast.info(`Opening ${tc.id}`);
                        }
                      }}
                      className="inline-flex rounded bg-[var(--c-accent-soft)] px-1.5 py-0.5 font-mono text-[12px] text-accent hover:opacity-80 transition-opacity"
                    >
                      {bug.testCaseId.slice(0, 8).toUpperCase()}
                    </button>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </div>
                <span
                  className="inline-flex w-fit items-center justify-center rounded px-2.5 py-0.5 text-[12px] font-medium text-white"
                  style={{
                    backgroundColor: bug.severity === "critical" ? "#E53E3E" : bug.severity === "high" ? "#DD6B20" : bug.severity === "medium" ? "#D69E2E" : "#718096"
                  }}
                >
                  {bug.severity.charAt(0).toUpperCase() + bug.severity.slice(1)}
                </span>
                <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: statusColor }} />
                  {STATUS_LABELS[bug.status]}
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Remove bug ${bug.id}?`)) {
                        deleteBug(bug.id);
                        toast.success(`Bug ${bug.id} deleted successfully`);
                      }
                    }}
                    title="Remove Bug"
                    className="p-1.5 rounded-[6px] text-muted-foreground hover:text-[var(--c-fail)] hover:bg-[var(--c-fail)]/10 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── New Bug Drawer (Panel) ─────────────────────────────── */

function NewBugDrawer({ onClose }: { onClose: () => void }) {
  const [projects] = useProjects();
  const [cases] = useTestCases();
  const [suites] = useSuites();
  const [form, setForm] = useState({
    projectId: projects[0]?.id || "",
    testCaseId: "",
    title: "",
    severity: "" as BugSeverity | "",
    description: "",
  });

  const availableCases = cases.filter((c) => {
    const s = suites.find((s) => s.id === c.suiteId);
    return s?.projectId === form.projectId;
  });

  const isValid = form.title.trim() !== "" && form.testCaseId !== "" && form.severity !== "";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    const bug = createBug({
      projectId: form.projectId,
      testCaseId: form.testCaseId,
      title: form.title.trim(),
      severity: form.severity as BugSeverity,
      description: form.description,
    });
    toast.success(`Bug ${bug.id} filed`);
    onClose();
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="label-eyebrow text-accent">§ Ticket Creator</p>
        <h2 className="mt-1 font-display text-2xl">Create New Bug</h2>
        <p className="mt-1 text-xs text-muted-foreground font-mono">
          Fill in details below to manually report a defect.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="block font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Project</label>
          <select
            value={form.projectId}
            onChange={(e) => setForm({ ...form, projectId: e.target.value, testCaseId: "" })}
            className="w-full rounded-[8px] border border-border bg-[var(--c-bg-input)] p-[10px] text-[13px] outline-none focus:border-[var(--c-accent)]"
          >
            <option value="" disabled>Select project...</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="block font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Title <span className="text-destructive">*</span></label>
          <input
            autoFocus
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Short description of the bug"
            className="w-full rounded-[8px] border border-border bg-[var(--c-bg-input)] px-[14px] py-[10px] text-[13px] outline-none focus:border-[var(--c-accent)]"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Link to Test Case <span className="text-destructive">*</span></label>
          {cases.length === 0 ? (
            <p className="text-[13px] text-destructive font-semibold">No test cases available. Create test cases first.</p>
          ) : (
            <select
              value={form.testCaseId}
              onChange={(e) => setForm({ ...form, testCaseId: e.target.value })}
              className="w-full rounded-[8px] border border-border bg-[var(--c-bg-input)] p-[10px] text-[13px] outline-none focus:border-[var(--c-accent)]"
            >
              <option value="" disabled>Select a test case...</option>
              {availableCases.map((tc) => (
                <option key={tc.id} value={tc.id}>
                  {tc.id.slice(0, 8).toUpperCase()} — {tc.title}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="block font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Severity <span className="text-destructive">*</span></label>
          <div className="flex gap-2">
            {SEVERITY_ORDER.map((s) => {
              const isSelected = form.severity === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm({ ...form, severity: s })}
                  className={`flex-1 rounded-[6px] border px-3 py-1.5 font-mono text-[10px] tracking-wider transition-all ${
                    isSelected 
                    ? "border-[var(--c-accent)] bg-[var(--c-accent-soft)] text-[var(--c-accent)] font-semibold" 
                    : "border-border bg-[var(--c-bg-input)] text-muted-foreground hover:border-foreground hover:text-foreground"
                  }`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Steps to reproduce, observed behavior..."
            rows={4}
            className="w-full rounded-[8px] border border-border bg-[var(--c-bg-input)] p-3 text-[13px] outline-none focus:border-[var(--c-accent)] resize-none transition-colors"
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-border mt-6">
          <button type="button" onClick={onClose} className="rounded-[8px] border-[1.5px] border-border bg-transparent px-[16px] py-[8px] text-[13px] font-medium transition-all hover:bg-[var(--c-bg-hover)]">
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isValid}
            className="rounded-[8px] bg-[var(--c-text)] px-[16px] py-[8px] text-[13px] font-medium text-white transition-all hover:bg-[#2C2825] disabled:opacity-40"
          >
            Report Bug
          </button>
        </div>
      </form>
    </div>
  );
}

/* ─── Bug Detail (panel) ────────────────────────────────── */

function BugDetail({ bug }: { bug: BugReport }) {
  const [bugs] = useBugs();
  const [projects] = useProjects();
  const b = bugs.find((x) => x.id === bug.id) ?? bug;
  const project = projects.find((p) => p.id === b.projectId);

  return (
    <div className="space-y-5">
      <div>
        <p className="label-eyebrow text-accent">§ Bug Report</p>
        <h2 className="mt-1 font-display text-2xl">{b.title}</h2>
        <p className="mt-1 font-mono text-[11px] text-muted-foreground">
          {b.id} · {project?.name || "Unknown project"} · Filed {new Date(b.createdAt).toLocaleDateString()}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className={`rounded-sm px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider badge-${b.severity}`}>
          {b.severity}
        </span>
        <span className={`rounded-sm px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider status-${b.status}`}>
          {STATUS_LABELS[b.status]}
        </span>
      </div>

      <div>
        <p className="label-eyebrow mb-1.5">Description</p>
        <p className="text-sm whitespace-pre-wrap">{b.description || "No description provided."}</p>
      </div>

      {/* Status flow */}
      <div>
        <p className="label-eyebrow mb-3">Update Status</p>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.filter((s) => s !== b.status).map((s) => (
            <button
              key={s}
              onClick={() => { updateBugStatus(b.id, s); toast.success(`Bug status → ${STATUS_LABELS[s]}`); }}
              className="inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 text-xs hover:border-foreground transition-colors"
            >
              <ArrowRight className="h-3 w-3" /> {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-2 border-t border-border">
        <button
          onClick={() => { if (confirm("Delete this bug?")) { deleteBug(b.id); toast.success("Bug deleted"); } }}
          className="inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 text-xs text-destructive hover:border-destructive"
        >
          <Trash2 className="h-3 w-3" /> Delete
        </button>
      </div>
    </div>
  );
}
