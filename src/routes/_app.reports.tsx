import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  BookOpen, Download, BarChart3, Clock, AlertTriangle, PlayCircle, FolderClosed, ShieldCheck
} from "lucide-react";
import { PageHeader } from "./_app.projects";
import { useTestCases, useRuns, useBugs, useProjects, useActivity, useSuites, deductTokens, addNotification } from "@/lib/store";
import { toast } from "./_app";

export const Route = createFileRoute("/_app/reports")({
  head: () => ({ meta: [{ title: "Reports — Field Notes" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const [cases] = useTestCases();
  const [runs] = useRuns();
  const [bugs] = useBugs();
  const [projects] = useProjects();
  const [activity] = useActivity();
  const [suites] = useSuites();

  // Compute summary values
  const totalProjects = projects.length;
  const completedProjects = projects.filter(p => p.status === "completed" || p.remainingStoryPoints === 0).length;
  const totalStoryPoints = projects.reduce((sum, p) => sum + (p.totalStoryPoints || 0), 0);
  const remainingStoryPoints = projects.reduce((sum, p) => sum + (p.remainingStoryPoints || 0), 0);
  const storyPointsDone = totalStoryPoints - remainingStoryPoints;

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
    if (!deductTokens(5)) {
      toast.error(`Insufficient tokens to export ${actionName}.`);
      return false;
    }
    addNotification("Tokens Deducted", `Deducted 5 tokens for exporting ${actionName}.`, "info");
    return true;
  }

  // Reports Generation Triggers
  function exportExecutiveSummary() {
    if (!checkAndDeduct("Executive Summary")) return;

    const content = `FIELD NOTES QA — EXECUTIVE SUMMARY REPORT\n` +
      `Generated: ${new Date().toLocaleString()}\n` +
      `==================================================\n\n` +
      `OVERALL METRICS:\n` +
      `- Total Projects: ${totalProjects}\n` +
      `- Total Test Suites: ${suites.length}\n` +
      `- Total Test Cases: ${cases.length}\n` +
      `- Total Executed Runs: ${runs.length}\n` +
      `- Open Bugs: ${bugs.filter(b => b.status === "open").length}\n\n` +
      `PROJECT DETAIL LISTING:\n` +
      `--------------------------------------------------\n` +
      projects.map(p => {
        const pct = p.totalStoryPoints > 0 ? Math.round(((p.totalStoryPoints - p.remainingStoryPoints) / p.totalStoryPoints) * 100) : 0;
        return `* ${p.name}\n` +
          `  Status: ${p.status.toUpperCase()} | Priority: ${p.priority.toUpperCase()}\n` +
          `  Story Points Completed: ${p.totalStoryPoints - p.remainingStoryPoints} of ${p.totalStoryPoints} (${pct}%)\n` +
          `  Schedule: ${p.startDate} to ${p.targetDate}`;
      }).join("\n\n");

    downloadFile("executive-summary-report.pdf", content, "text/plain");
    toast.success("Executive Summary report downloaded.");
  }

  function exportSprintBurndown() {
    if (!checkAndDeduct("Sprint Burndown Report")) return;

    const content = `FIELD NOTES QA — SPRINT BURNDOWN REPORT\n` +
      `Generated: ${new Date().toLocaleString()}\n` +
      `==================================================\n\n` +
      `BURNDOWN OVERVIEW:\n` +
      `- Total Story Points Committed: ${totalStoryPoints} pts\n` +
      `- Completed Story Points: ${storyPointsDone} pts\n` +
      `- Remaining Story Points: ${remainingStoryPoints} pts\n` +
      `- Sprint Completion Velocity: ${totalStoryPoints > 0 ? Math.round((storyPointsDone / totalStoryPoints) * 100) : 0}%\n\n` +
      `PROJECT BURN HISTORIES:\n` +
      `--------------------------------------------------\n` +
      projects.map(p => {
        const completed = p.totalStoryPoints - p.remainingStoryPoints;
        const progressLines = Array.from({ length: p.totalStoryPoints }, (_, i) => {
          return i < completed ? "█" : "░";
        }).join("");
        return `* ${p.name}\n` +
          `  Progress Chart: [${progressLines}] (${completed}/${p.totalStoryPoints} pts completed)\n` +
          `  Remaining Points: ${p.remainingStoryPoints} pts\n` +
          `  Target Date: ${p.targetDate}`;
      }).join("\n\n");

    downloadFile("sprint-burndown-report.pdf", content, "text/plain");
    toast.success("Sprint Burndown report downloaded.");
  }

  function exportTestCoverage() {
    if (!checkAndDeduct("Test Coverage Report")) return;

    let csv = "ID,Title,Suite Name,Priority,Status,Created At\n";
    cases.forEach(c => {
      const s = suites.find(suite => suite.id === c.suiteId);
      csv += `"${c.id.slice(0, 8)}","${c.title.replace(/"/g, '""')}","${(s?.name || "Global").replace(/"/g, '""')}","${c.priority}","${c.status}","${new Date(c.createdAt).toLocaleDateString()}"\n`;
    });

    downloadFile("test-coverage-report.csv", csv, "text/csv");
    toast.success("Test Coverage CSV report downloaded.");
  }

  function exportActivityAuditLog() {
    if (!checkAndDeduct("Activity Audit Log")) return;

    let csv = "ID,Timestamp,Type,Message\n";
    activity.forEach(a => {
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
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--c-text-muted)]">Total Projects</p>
          <p className="mt-4 font-display text-4xl text-[var(--c-text)]">{totalProjects}</p>
          <p className="mt-2 font-mono text-[11px] text-[var(--c-text-muted)]">Active test binders</p>
        </div>
        <div className="rounded-[12px] border border-[var(--c-border)] bg-[var(--c-bg-card)] p-5 transition-all duration-[var(--t-normal)] hover:-translate-y-[2px] hover:shadow-[var(--shadow-sm)]">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--c-text-muted)]">Completed</p>
          <p className="mt-4 font-display text-4xl text-[var(--c-text)]">{completedProjects}</p>
          <p className="mt-2 font-mono text-[11px] text-[var(--c-text-muted)]">Finished project builds</p>
        </div>
        <div className="rounded-[12px] border border-[var(--c-border)] bg-[var(--c-bg-card)] p-5 transition-all duration-[var(--t-normal)] hover:-translate-y-[2px] hover:shadow-[var(--shadow-sm)]">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--c-text-muted)]">Story Points Done</p>
          <p className="mt-4 font-display text-4xl text-[var(--c-text)]">{storyPointsDone}</p>
          <p className="mt-2 font-mono text-[11px] text-[var(--c-text-muted)]">Out of {totalStoryPoints} committed</p>
        </div>
        <div className="rounded-[12px] border border-[var(--c-border)] bg-[var(--c-bg-card)] p-5 transition-all duration-[var(--t-normal)] hover:-translate-y-[2px] hover:shadow-[var(--shadow-sm)]">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--c-text-muted)]">Total Points</p>
          <p className="mt-4 font-display text-4xl text-[var(--c-text)]">{totalStoryPoints}</p>
          <p className="mt-2 font-mono text-[11px] text-[var(--c-text-muted)]">Sprint velocity capacity</p>
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
            <h4 className="font-display text-[20px] text-[var(--c-text)] leading-tight">Executive Summary</h4>
            <p className="mt-2 text-[13px] text-[var(--c-text-muted)] flex-1 leading-relaxed">
              Overall project status, test case numbers, run success rates, and outstanding bugs.
            </p>
            <button
              onClick={exportExecutiveSummary}
              className="mt-6 inline-flex w-full items-center justify-center gap-1.5 rounded-[8px] bg-[var(--c-text)] py-2 text-[12px] font-medium text-white hover:bg-[#2C2825]"
            >
              <Download className="h-3.5 w-3.5" /> Export PDF
            </button>
          </div>

          {/* Card 2: Sprint Burndown */}
          <div className="flex flex-col rounded-[12px] border border-[var(--c-border)] bg-[var(--c-bg-card)] p-6 transition-all duration-[var(--t-normal)] hover:-translate-y-[2px] hover:shadow-[var(--shadow-md)]">
            <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[var(--c-bg-hover)] text-[var(--c-accent)] mb-4">
              <Clock className="h-5 w-5" />
            </div>
            <h4 className="font-display text-[20px] text-[var(--c-text)] leading-tight">Sprint Burndown</h4>
            <p className="mt-2 text-[13px] text-[var(--c-text-muted)] flex-1 leading-relaxed">
              Analysis of committed story points, completed items, velocity rates, and sprint completion charts.
            </p>
            <button
              onClick={exportSprintBurndown}
              className="mt-6 inline-flex w-full items-center justify-center gap-1.5 rounded-[8px] bg-[var(--c-text)] py-2 text-[12px] font-medium text-white hover:bg-[#2C2825]"
            >
              <Download className="h-3.5 w-3.5" /> Export PDF
            </button>
          </div>

          {/* Card 3: Test Coverage */}
          <div className="flex flex-col rounded-[12px] border border-[var(--c-border)] bg-[var(--c-bg-card)] p-6 transition-all duration-[var(--t-normal)] hover:-translate-y-[2px] hover:shadow-[var(--shadow-md)]">
            <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[var(--c-bg-hover)] text-[var(--c-accent)] mb-4">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h4 className="font-display text-[20px] text-[var(--c-text)] leading-tight">Test Coverage</h4>
            <p className="mt-2 text-[13px] text-[var(--c-text-muted)] flex-1 leading-relaxed">
              Granular tabular breakdown of all test cases, including linked suite, priority, and draft statuses.
            </p>
            <button
              onClick={exportTestCoverage}
              className="mt-6 inline-flex w-full items-center justify-center gap-1.5 rounded-[8px] bg-[var(--c-text)] py-2 text-[12px] font-medium text-white hover:bg-[#2C2825]"
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </button>
          </div>

          {/* Card 4: Activity Audit */}
          <div className="flex flex-col rounded-[12px] border border-[var(--c-border)] bg-[var(--c-bg-card)] p-6 transition-all duration-[var(--t-normal)] hover:-translate-y-[2px] hover:shadow-[var(--shadow-md)]">
            <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[var(--c-bg-hover)] text-[var(--c-accent)] mb-4">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h4 className="font-display text-[20px] text-[var(--c-text)] leading-tight">Activity Audit Log</h4>
            <p className="mt-2 text-[13px] text-[var(--c-text-muted)] flex-1 leading-relaxed">
              Chronological security audit log of all project and suite modifications, test runs, and deleted resources.
            </p>
            <button
              onClick={exportActivityAuditLog}
              className="mt-6 inline-flex w-full items-center justify-center gap-1.5 rounded-[8px] bg-[var(--c-text)] py-2 text-[12px] font-medium text-white hover:bg-[#2C2825]"
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
                  <th className="px-6 py-4">Total Pts</th>
                  <th className="px-6 py-4">Remaining</th>
                  <th className="px-6 py-4">Completion %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--c-border)]">
                {projects.map((p) => {
                  const completed = (p.totalStoryPoints || 0) - (p.remainingStoryPoints || 0);
                  const completionPercent = p.totalStoryPoints > 0 ? Math.round((completed / p.totalStoryPoints) * 100) : 0;
                  return (
                    <tr key={p.id} className="text-[13px] hover:bg-[var(--c-bg-hover)]/30 transition-colors">
                      <td className="px-6 py-4 flex items-center gap-2 font-medium text-[var(--c-text)]">
                        <FolderClosed className="h-4 w-4 text-[var(--c-accent)] shrink-0" />
                        {p.name}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${
                          p.status === "completed"
                            ? "bg-[var(--c-pass-soft)] text-[var(--c-pass)]"
                            : p.status === "on_hold"
                            ? "bg-[var(--c-warn-soft)] text-[var(--c-warn)]"
                            : "bg-[var(--c-bg-hover)] text-[var(--c-text-muted)] border border-[var(--c-border)]"
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider badge-${p.priority}`}>
                          {p.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono font-medium">{p.totalStoryPoints}</td>
                      <td className="px-6 py-4 font-mono font-medium">{p.remainingStoryPoints}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-[6px] w-24 bg-[var(--c-bg-hover)] rounded-full overflow-hidden border border-[var(--c-border)] shrink-0">
                            <div 
                              className="h-full bg-[var(--c-accent)] rounded-full transition-all duration-[var(--t-slow)]" 
                              style={{ width: `${completionPercent}%` }}
                            />
                          </div>
                          <span className="font-mono text-[11px] font-semibold">{completionPercent}%</span>
                        </div>
                      </td>
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