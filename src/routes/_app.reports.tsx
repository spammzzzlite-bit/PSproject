import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  BookOpen,
  Download,
  BarChart3,
  Clock,
  AlertTriangle,
  PlayCircle,
  FolderClosed,
  ShieldCheck,
} from "lucide-react";
import { PageHeader } from "./_app.projects";
import {
  useTestCases,
  useRuns,
  useBugs,
  useProjects,
  useActivity,
  useSuites,
  deductTokenAction,
  useSprints,
} from "@/frontend/store/store";
import { toast } from "./_app";

export const Route = createFileRoute("/_app/reports")({
  head: () => ({ meta: [{ title: "Reports — QAMind AI" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const [cases] = useTestCases();
  const [runs] = useRuns();
  const [bugs] = useBugs();
  const [projects] = useProjects();
  const [activity] = useActivity();
  const [suites] = useSuites();

  const [sprints] = useSprints();

  // Compute summary values
  const totalProjects = projects.length;
  const completedProjects = projects.filter((p) => p.status === "completed").length;

  // Helper for initiating downloads
  function downloadFile(filename: string, content: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Deduct tokens utility helper
  function checkAndDeduct(actionName: string): boolean {
    if (!deductTokenAction(`Export ${actionName}`)) {
      toast.error(`Insufficient tokens to export ${actionName}.`);
      return false;
    }
    return true;
  }

  // Reports Generation Triggers
  function exportExecutiveSummary() {
    if (!checkAndDeduct("Executive Summary")) return;

    const content =
      `QAMind AI — EXECUTIVE SUMMARY REPORT\n` +
      `Generated: ${new Date().toLocaleString()}\n` +
      `==================================================\n\n` +
      `OVERALL METRICS:\n` +
      `- Total Projects: ${totalProjects}\n` +
      `- Total Test Suites: ${suites.length}\n` +
      `- Total Test Cases: ${cases.length}\n` +
      `- Total Executed Runs: ${runs.length}\n` +
      `- Open Bugs: ${bugs.filter((b) => !b.is_resolved).length}\n\n` +
      `PROJECT DETAIL LISTING:\n` +
      `--------------------------------------------------\n` +
      projects
        .map((p) => {
          return (
            `* ${p.name}\n` +
            `  Status: ${p.status.toUpperCase()} | Priority: ${p.priority.toUpperCase()}\n` +
            `  Schedule: ${p.startDate} to ${p.targetDate}`
          );
        })
        .join("\n\n");

    downloadFile("executive-summary-report.pdf", content, "text/plain");
    toast.success("Executive Summary report downloaded.");
  }

  function exportSprintSchedules() {
    if (!checkAndDeduct("Sprint Schedules Report")) return;

    const content =
      `QAMind AI — SPRINT SCHEDULES REPORT\n` +
      `Generated: ${new Date().toLocaleString()}\n` +
      `==================================================\n\n` +
      `PROJECT SPRINT CYCLES:\n` +
      `--------------------------------------------------\n` +
      projects
        .map((p) => {
          const pSprints = sprints
            .filter((s) => s.projectId === p.id)
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

          const sprintLines = pSprints
            .map((s) => {
              const startD = s.startDate ? new Date(s.startDate) : null;
              const endD = s.endDate ? new Date(s.endDate) : null;
              const duration =
                startD && endD
                  ? Math.max(1, Math.ceil((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)) + 1)
                  : 0;
              return `  - ${s.name}: ${s.status} (${s.startDate} to ${s.endDate}, ${duration} days)`;
            })
            .join("\n");

          return `* ${p.name} (${p.status.toUpperCase()})\n` + (sprintLines || "  No sprints scheduled.");
        })
        .join("\n\n");

    downloadFile("sprint-schedules-report.pdf", content, "text/plain");
    toast.success("Sprint Schedules report downloaded.");
  }

  function exportTestCoverage() {
    if (!checkAndDeduct("Test Coverage Report")) return;

    let csv = "ID,Title,Suite Name,Priority,Status,Created At\n";
    cases.forEach((c) => {
      const s = suites.find((suite) => suite.id === c.suiteId);
      csv += `"${c.id.slice(0, 8)}","${c.title.replace(/"/g, '""')}","${(s?.name || "Global").replace(/"/g, '""')}","${c.priority}","${c.status}","${new Date(c.createdAt).toLocaleDateString()}"\n`;
    });

    downloadFile("test-coverage-report.csv", csv, "text/csv");
    toast.success("Test Coverage CSV report downloaded.");
  }

  function exportActivityAuditLog() {
    if (!checkAndDeduct("Activity Audit Log")) return;

    let csv = "ID,Timestamp,Type,Message\n";
    activity.forEach((a) => {
      csv += `"${a.id.slice(0, 8)}","${new Date(a.timestamp).toLocaleString()}","${a.type}","${a.message.replace(/"/g, '""')}"\n`;
    });

    downloadFile("activity-audit-log.csv", csv, "text/csv");
    toast.success("Activity Audit Log CSV report downloaded.");
  }

  return (
    <div className="mx-auto max-w-7xl space-y-10">
      <PageHeader
        section="§ Reports"
        title="Reports center"
        subtitle="Generate interactive sprint audit documents and test coverage logbooks."
      />

      {/* Summary Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[12px] border border-[var(--c-border)] bg-[var(--c-bg-card)] p-5 transition-all duration-[var(--t-normal)] hover:-translate-y-[2px] hover:shadow-[var(--shadow-sm)]">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--c-text-muted)]">
            Total Projects
          </p>
          <p className="mt-4 font-display text-4xl text-[var(--c-text)]">{totalProjects}</p>
          <p className="mt-2 font-mono text-[11px] text-[var(--c-text-muted)]">
            Active test binders
          </p>
        </div>
        <div className="rounded-[12px] border border-[var(--c-border)] bg-[var(--c-bg-card)] p-5 transition-all duration-[var(--t-normal)] hover:-translate-y-[2px] hover:shadow-[var(--shadow-sm)]">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--c-text-muted)]">
            Completed
          </p>
          <p className="mt-4 font-display text-4xl text-[var(--c-text)]">{completedProjects}</p>
          <p className="mt-2 font-mono text-[11px] text-[var(--c-text-muted)]">
            Finished project builds
          </p>
        </div>
        <div className="rounded-[12px] border border-[var(--c-border)] bg-[var(--c-bg-card)] p-5 transition-all duration-[var(--t-normal)] hover:-translate-y-[2px] hover:shadow-[var(--shadow-sm)]">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--c-text-muted)]">
            Test Suites
          </p>
          <p className="mt-4 font-display text-4xl text-[var(--c-text)]">{suites.length}</p>
          <p className="mt-2 font-mono text-[11px] text-[var(--c-text-muted)]">
            Organized test collections
          </p>
        </div>
        <div className="rounded-[12px] border border-[var(--c-border)] bg-[var(--c-bg-card)] p-5 transition-all duration-[var(--t-normal)] hover:-translate-y-[2px] hover:shadow-[var(--shadow-sm)]">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--c-text-muted)]">
            Test Cases
          </p>
          <p className="mt-4 font-display text-4xl text-[var(--c-text)]">{cases.length}</p>
          <p className="mt-2 font-mono text-[11px] text-[var(--c-text-muted)]">
            Drafted validation checks
          </p>
        </div>
      </div>

      {/* Generate Reports Grid */}
      <div className="space-y-4">
        <h3 className="font-display text-[26px]">Generate document exports</h3>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Executive Summary */}
          <div className="flex flex-col rounded-[12px] border border-[var(--c-border)] bg-[var(--c-bg-card)] p-6 transition-all duration-[var(--t-normal)] hover:-translate-y-[2px] hover:shadow-[var(--shadow-md)]">
            <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[var(--c-bg-hover)] text-[var(--c-accent)] mb-4">
              <BarChart3 className="h-5 w-5" />
            </div>
            <h4 className="font-display text-[20px] text-[var(--c-text)] leading-tight">
              Executive Summary
            </h4>
            <p className="mt-2 text-[13px] text-[var(--c-text-muted)] flex-1 leading-relaxed">
              Overall project status, test case numbers, run success rates, and outstanding bugs.
            </p>
            <button
              onClick={exportExecutiveSummary}
              className="mt-6 inline-flex w-full items-center justify-center gap-1.5 rounded-[8px] bg-[var(--c-text)] py-2 text-[12px] font-medium text-[var(--c-bg)] hover:opacity-90"
            >
              <Download className="h-3.5 w-3.5" /> Export PDF
            </button>
          </div>

          {/* Card 2: Sprint Schedules */}
          <div className="flex flex-col rounded-[12px] border border-[var(--c-border)] bg-[var(--c-bg-card)] p-6 transition-all duration-[var(--t-normal)] hover:-translate-y-[2px] hover:shadow-[var(--shadow-md)]">
            <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[var(--c-bg-hover)] text-[var(--c-accent)] mb-4">
              <Clock className="h-5 w-5" />
            </div>
            <h4 className="font-display text-[20px] text-[var(--c-text)] leading-tight">
              Sprint Schedules
            </h4>
            <p className="mt-2 text-[13px] text-[var(--c-text-muted)] flex-1 leading-relaxed">
              Overall sprint cycles, durations, status, dates, and team allocation metrics.
            </p>
            <button
              onClick={exportSprintSchedules}
              className="mt-6 inline-flex w-full items-center justify-center gap-1.5 rounded-[8px] bg-[var(--c-text)] py-2 text-[12px] font-medium text-[var(--c-bg)] hover:opacity-90"
            >
              <Download className="h-3.5 w-3.5" /> Export PDF
            </button>
          </div>

          {/* Card 3: Test Coverage */}
          <div className="flex flex-col rounded-[12px] border border-[var(--c-border)] bg-[var(--c-bg-card)] p-6 transition-all duration-[var(--t-normal)] hover:-translate-y-[2px] hover:shadow-[var(--shadow-md)]">
            <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[var(--c-bg-hover)] text-[var(--c-accent)] mb-4">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h4 className="font-display text-[20px] text-[var(--c-text)] leading-tight">
              Test Coverage
            </h4>
            <p className="mt-2 text-[13px] text-[var(--c-text-muted)] flex-1 leading-relaxed">
              Granular tabular breakdown of all test cases, including linked suite, priority, and
              draft statuses.
            </p>
            <button
              onClick={exportTestCoverage}
              className="mt-6 inline-flex w-full items-center justify-center gap-1.5 rounded-[8px] bg-[var(--c-text)] py-2 text-[12px] font-medium text-[var(--c-bg)] hover:opacity-90"
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </button>
          </div>

          {/* Card 4: Activity Audit */}
          <div className="flex flex-col rounded-[12px] border border-[var(--c-border)] bg-[var(--c-bg-card)] p-6 transition-all duration-[var(--t-normal)] hover:-translate-y-[2px] hover:shadow-[var(--shadow-md)]">
            <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[var(--c-bg-hover)] text-[var(--c-accent)] mb-4">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h4 className="font-display text-[20px] text-[var(--c-text)] leading-tight">
              Activity Audit Log
            </h4>
            <p className="mt-2 text-[13px] text-[var(--c-text-muted)] flex-1 leading-relaxed">
              Chronological security audit log of all project and suite modifications, test runs,
              and deleted resources.
            </p>
            <button
              onClick={exportActivityAuditLog}
              className="mt-6 inline-flex w-full items-center justify-center gap-1.5 rounded-[8px] bg-[var(--c-text)] py-2 text-[12px] font-medium text-[var(--c-bg)] hover:opacity-90"
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Project Summary Table */}
      <div className="space-y-4">
        <h3 className="font-display text-[26px]">Project Summary Table</h3>
        {projects.length === 0 ? (
          <div className="rounded-[12px] border border-dashed border-[var(--c-border-strong)] bg-[var(--c-bg-card)] py-12 text-center text-[var(--c-text-muted)]">
            No projects available yet. Create a project to view metrics.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[12px] border border-[var(--c-border)] bg-[var(--c-bg-card)]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--c-border)] bg-[var(--c-bg-hover)] text-[10px] font-mono uppercase tracking-[0.12em] text-[var(--c-text-muted)]">
                  <th className="px-6 py-4">Project Name</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Priority</th>
                  <th className="px-6 py-4">Start Date</th>
                  <th className="px-6 py-4">Target Date</th>
                  <th className="px-6 py-4">Test Suites</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--c-border)]">
                {projects.map((p) => {
                  const suitesCount = suites.filter((s) => s.projectId === p.id).length;
                  return (
                    <tr
                      key={p.id}
                      className="text-[13px] hover:bg-[var(--c-bg-hover)]/30 transition-colors"
                    >
                      <td className="px-6 py-4 flex items-center gap-2 font-medium text-[var(--c-text)]">
                        <FolderClosed className="h-4 w-4 text-[var(--c-accent)] shrink-0" />
                        {p.name}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${
                            p.status === "completed"
                              ? "bg-[var(--c-pass-soft)] text-[var(--c-pass)]"
                              : p.status === "on_hold"
                                ? "bg-[var(--c-warn-soft)] text-[var(--c-warn)]"
                                : "bg-[var(--c-bg-hover)] text-[var(--c-text-muted)] border border-[var(--c-border)]"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider badge-${p.priority}`}
                        >
                          {p.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono font-medium">{p.startDate || "N/A"}</td>
                      <td className="px-6 py-4 font-mono font-medium">{p.targetDate || "N/A"}</td>
                      <td className="px-6 py-4 font-mono font-semibold text-[var(--c-accent)]">{suitesCount}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
