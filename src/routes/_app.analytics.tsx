import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  BarChart3, TrendingUp, Zap, Clock, ShieldCheck,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, ResponsiveContainer, YAxis, XAxis, Tooltip, Cell, PieChart, Pie,
} from "recharts";
import { useRuns, useTestCases, useSuites, useProjects, useBugs } from "@/lib/store";
import { PageHeader } from "./_app.projects";

export const Route = createFileRoute("/_app/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Field Notes" }] }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const [runs] = useRuns();
  const [testCases] = useTestCases();
  const [suites] = useSuites();
  const [projects] = useProjects();
  const [bugs] = useBugs();
  const [selectedProjectId, setSelectedProjectId] = useState("");

  // Scope data depending on project selection
  const scopedSuites = selectedProjectId ? suites.filter(s => s.projectId === selectedProjectId) : suites;
  const scopedCases = selectedProjectId ? testCases.filter(tc => scopedSuites.some(s => s.id === tc.suiteId)) : testCases;
  const scopedRuns = selectedProjectId ? runs.filter(r => r.projectId === selectedProjectId) : runs;
  const scopedBugs = selectedProjectId ? bugs.filter(b => b.projectId === selectedProjectId) : bugs;

  // Compute metrics
  const totalCases = scopedCases.length;
  const passedCases = scopedCases.filter((tc) => tc.status === "passed").length;
  const failedCases = scopedCases.filter((tc) => tc.status === "failed").length;
  const passRate = totalCases > 0 ? Math.round((passedCases / totalCases) * 100) : 0;
  const avgDuration = scopedRuns.length > 0
    ? Math.round(scopedRuns.reduce((s, r) => s + r.duration, 0) / scopedRuns.length / 1000)
    : 0;
  const openBugs = scopedBugs.filter((b) => b.status === "open" || b.status === "in_progress").length;

  // Pass rate trend (last 7 runs)
  const passRateTrend = scopedRuns.slice(0, 7).reverse().map((run) => {
    const p = run.results.length > 0
      ? Math.round(run.results.filter((r) => r.status === "passed").length / run.results.length * 100)
      : 0;
    return { run: run.id, rate: p };
  });

  // Test execution time trend
  const durationTrend = scopedRuns.slice(0, 10).reverse().map((run) => ({
    run: run.id,
    duration: Math.round(run.duration / 1000),
  }));

  // Cases by status
  const statusData = [
    { name: "Draft", count: scopedCases.filter((tc) => tc.status === "draft").length, color: "var(--color-muted-foreground)" },
    { name: "Ready", count: scopedCases.filter((tc) => tc.status === "ready").length, color: "oklch(0.55 0.08 250)" },
    { name: "Passed", count: passedCases, color: "var(--color-sage)" },
    { name: "Failed", count: failedCases, color: "var(--color-rust)" },
    { name: "Skipped", count: scopedCases.filter((tc) => tc.status === "skipped").length, color: "var(--color-border)" },
  ].filter((d) => d.count > 0);

  // Coverage by project (showing selected or all)
  const displayProjects = selectedProjectId ? projects.filter(p => p.id === selectedProjectId) : projects;
  const projectCoverage = displayProjects.map((p) => {
    const pSuites = suites.filter((s) => s.projectId === p.id);
    const pCases = testCases.filter((tc) => pSuites.some((s) => s.id === tc.suiteId));
    const pPassed = pCases.filter((tc) => tc.status === "passed").length;
    return {
      name: p.name.length > 12 ? p.name.slice(0, 12) + "…" : p.name,
      total: pCases.length,
      passed: pPassed,
      coverage: pCases.length > 0 ? Math.round((pPassed / pCases.length) * 100) : 0,
    };
  });

  // Flaky tests leaderboard
  const flakyMap = new Map<string, number>();
  scopedRuns.forEach((run) => {
    run.results.forEach((r) => {
      if (r.status === "passed" && r.duration > 3000) {
        flakyMap.set(r.testCaseId, (flakyMap.get(r.testCaseId) || 0) + 1);
      }
    });
  });
  const flakyList = Array.from(flakyMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, count]) => ({
      id,
      title: scopedCases.find((tc) => tc.id === id)?.title || id.slice(0, 8),
      count,
    }));

  const tooltipStyle = {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "2px",
    fontFamily: "var(--font-mono)",
    fontSize: "11px",
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col justify-between md:flex-row md:items-end gap-4 border-b-[2px] border-[var(--c-text)] pb-6 mt-[20px] mb-8">
        <div className="stagger-item">
          <p className="label-eyebrow text-[var(--c-accent)]">§ Analytics</p>
          <h1 className="mt-2 font-display text-[42px] leading-tight md:text-5xl">Analytics</h1>
          <p className="mt-2 text-[15px] text-[var(--c-text-muted)]">Coverage trends, performance metrics, and quality insights.</p>
        </div>
        <div className="stagger-item shrink-0 flex items-center gap-2">
          <label className="font-mono text-[11px] uppercase tracking-wider text-[var(--c-text-muted)]">Filter Project:</label>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="rounded-[6px] border border-[var(--c-border)] bg-[var(--c-bg-card)] px-3 py-1.5 text-[13px] outline-none focus:border-[var(--c-accent)]"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Top-level metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-10">
        <MetricCard icon={ShieldCheck} label="Pass rate" value={`${passRate}%`} />
        <MetricCard icon={BarChart3} label="Total cases" value={String(totalCases)} />
        <MetricCard icon={TrendingUp} label="Total runs" value={String(scopedRuns.length)} />
        <MetricCard icon={Clock} label="Avg duration" value={`${avgDuration}s`} />
        <MetricCard icon={Zap} label="Open bugs" value={String(openBugs)} />
      </div>

      {/* Charts row 1 */}
      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        <ChartCard title="Pass Rate Trend" subtitle="Last 7 runs">
          {passRateTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={passRateTrend}>
                <XAxis dataKey="run" stroke="var(--color-muted-foreground)" fontSize={10} tickLine={false} axisLine={{ stroke: "var(--color-border)" }} />
                <YAxis domain={[0, 100]} stroke="var(--color-muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="rate" stroke="var(--color-sage)" strokeWidth={2} dot={{ fill: "var(--color-sage)", r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="Run tests to see pass rate trends" />
          )}
        </ChartCard>

        <ChartCard title="Test Cases by Status" subtitle="Current distribution">
          {statusData.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie data={statusData} dataKey="count" cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={2}>
                    {statusData.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-3 mt-4 lg:mt-0">
                {statusData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-[13px]">
                    <div className="flex items-center gap-3">
                      <span className="inline-block h-[10px] w-[10px] rounded-[3px]" style={{ backgroundColor: d.color }} />
                      <span className="text-[var(--c-text-muted)] font-medium">{d.name}</span>
                    </div>
                    <span className="font-mono text-[12px] text-[var(--c-text)]">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyChart message="Create test cases to see distribution" />
          )}
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        <ChartCard title="Execution Time Trend" subtitle="Last 10 runs (seconds)">
          {durationTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={durationTrend}>
                <XAxis dataKey="run" stroke="var(--color-muted-foreground)" fontSize={10} tickLine={false} axisLine={{ stroke: "var(--color-border)" }} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="duration" fill="var(--color-accent)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="Run tests to see execution trends" />
          )}
        </ChartCard>

        <ChartCard title="Coverage by Project" subtitle="Passed / Total per project">
          {projectCoverage.length > 0 ? (
            <div className="space-y-5">
              {projectCoverage.map((p) => (
                <div key={p.name}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[13px] font-medium text-[var(--c-text)] truncate">{p.name}</span>
                    <span className="font-mono text-[11px] text-[var(--c-text-muted)]">{p.passed}/{p.total} ({p.coverage}%)</span>
                  </div>
                  <div className="h-[6px] w-full bg-[var(--c-bg-hover)] rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--c-accent)] rounded-full transition-all duration-[var(--t-slow)]" style={{ width: `${p.coverage}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyChart message="Create projects and test cases" />
          )}
        </ChartCard>
      </div>

      {/* Flaky leaderboard */}
      <div className="rounded-[12px] border border-[var(--c-border)] bg-[var(--c-bg-card)] p-6 md:p-10 shadow-[var(--shadow-sm)] mb-12">
        <div className="mb-8 border-b border-[var(--c-border)] pb-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--c-accent)] font-medium">Flaky Tests</p>
          <h2 className="mt-3 font-display text-[28px] text-[var(--c-text)]">Flakiness Leaderboard</h2>
          <p className="mt-2 text-[14px] text-[var(--c-text-muted)] leading-relaxed">Tests that passed but took &gt;3s — the ones quietly costing you.</p>
        </div>
        {flakyList.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[8px] bg-[var(--c-bg-hover)] text-[var(--c-text-muted)]">
              <Zap className="h-6 w-6" />
            </div>
            <p className="mt-4 text-[14px] text-[var(--c-text-muted)]">No flaky tests detected yet.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[8px] border border-[var(--c-border)]">
            <div className="grid grid-cols-[40px_1fr_100px] gap-4 border-b border-[var(--c-border)] bg-[var(--c-bg-hover)] px-5 py-3 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">
              <span>#</span><span>Test case</span><span>Flaky runs</span>
            </div>
            {flakyList.map((item, i) => (
              <div key={item.id} className={`grid grid-cols-[40px_1fr_100px] gap-4 px-5 py-4 text-[13px] hover:bg-[var(--c-bg-hover)] transition-colors ${i > 0 ? "border-t border-[var(--c-border)]" : ""}`}>
                <span className="font-mono text-[11px] text-[var(--c-text-muted)] pt-0.5">{i + 1}</span>
                <span className="truncate font-medium text-[var(--c-text)]">{item.title}</span>
                <span className="font-mono text-[11px] text-[var(--c-fail)] font-medium pt-0.5">{item.count}×</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Sub-components ────────────────────────────────────── */

function MetricCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-[12px] border border-[var(--c-border)] bg-[var(--c-bg-card)] p-6 stagger-item shadow-[var(--shadow-sm)] hover:-translate-y-[2px] hover:shadow-[var(--shadow-md)] transition-all duration-[var(--t-normal)]">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--c-text-muted)]">{label}</p>
        <div className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-[var(--c-bg-hover)] text-[var(--c-text)]">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-4 font-display text-[32px] text-[var(--c-text)] leading-none">{value}</p>
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[12px] border border-[var(--c-border)] bg-[var(--c-bg-card)] p-6 md:p-8 shadow-[var(--shadow-sm)]">
      <div className="mb-6">
        <h3 className="font-display text-[22px] text-[var(--c-text)]">{title}</h3>
        <p className="mt-1 text-[13px] text-[var(--c-text-muted)]">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-[200px] items-center justify-center rounded-[8px] border border-dashed border-[var(--c-border-strong)] bg-[var(--c-bg-input)] text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">{message}</p>
    </div>
  );
}
