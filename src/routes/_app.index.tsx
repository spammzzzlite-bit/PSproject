import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
  FileText, CheckCircle2, XCircle, Clock,
  FolderPlus, FolderClosed, Trash2,
  ShieldAlert, Zap, Sparkles, ClipboardList, BookOpen,
  ArrowRight, Plus,
} from "lucide-react";
import { useProjects, useTestCases, useRuns, useSuites, createProject, deleteProject, useAuth } from "@/lib/store";
import { Modal, DetailedNewProjectModal, ProjectDetail } from "./_app.projects";
import { toast } from "./_app";
import { usePanel } from "@/components/PanelContext";

export const Route = createFileRoute("/_app/")({
  head: () => ({
    meta: [{ title: "Dashboard — Field Notes" }],
  }),
  component: Dashboard,
});

/* ─── Count-up animation hook ──────────────────────────────── */
function useCountUp(target: number, duration = 300): number {
  const [value, setValue] = useState(0);
  const prevTarget = useRef(0);

  useEffect(() => {
    if (target === prevTarget.current) return;
    const start = prevTarget.current;
    const diff = target - start;
    const startTime = performance.now();

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out quad
      const eased = 1 - (1 - progress) * (1 - progress);
      setValue(Math.round(start + diff * eased));
      if (progress < 1) requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
    prevTarget.current = target;
  }, [target, duration]);

  return value;
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length === 0 || data.every((d) => d === 0)) {
    return null;
  }
  const max = Math.max(...data, 1);
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 60;
    const y = 18 - (v / max) * 16;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg viewBox="0 0 60 20" className="h-5 w-16 shrink-0">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Dashboard() {
  const [projects] = useProjects();
  const [testCases] = useTestCases();
  const [runs] = useRuns();
  const [suites] = useSuites();
  const [showNewProject, setShowNewProject] = useState(false);
  const { openPanel } = usePanel();

  // ─── Empty state: user has no projects (onboarding CTA) ───
  if (projects.length === 0) {
    return (
      <div className="mx-auto max-w-7xl space-y-10">
        <Masthead />
        <div className="flex items-center justify-center py-16">
          <div className="w-full max-w-md border-2 border-dashed border-border bg-card p-10 text-center">
            <FolderPlus className="mx-auto h-10 w-10 text-muted-foreground" />
            <h2 className="mt-6 font-display text-3xl">Start your first project.</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Create a project to unlock test generation, test runs, and reports.
            </p>
            <button
              onClick={() => setShowNewProject(true)}
              className="mt-8 w-full rounded-sm bg-accent px-5 py-3 text-sm font-medium text-accent-foreground hover:opacity-90 transition-colors"
            >
              + Create Project
            </button>
          </div>
        </div>
        <DetailedNewProjectModal open={showNewProject} onClose={() => setShowNewProject(false)} />
      </div>
    );
  }

  // ─── Full dashboard (user has projects) ─────────────────────

  // Compute stats
  const totalCases = testCases.length;
  const passedCases = testCases.filter((tc) => tc.status === "passed").length;
  const failedCases = testCases.filter((tc) => tc.status === "failed").length;
  const lastRun = runs[0];
  const coveragePercent = totalCases > 0 ? Math.round((passedCases / totalCases) * 100) : 0;
  const flakyCases = runs.reduce((count, run) => {
    return count + run.results.filter((r) => r.status === "passed" && r.duration > 3000).length;
  }, 0);

  // Sparkline data: last 7 days of passed/failed counts
  const sparklineData = (statusFilter: "passed" | "failed") => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const dayRuns = runs.filter((r) => {
        const runDate = new Date(r.startedAt);
        return runDate.toDateString() === date.toDateString();
      });
      return dayRuns.reduce((s, r) => s + r.results.filter((x) => x.status === statusFilter).length, 0);
    });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-10">
      <Masthead />

      {/* Quick Actions Row */}
      <div className="flex flex-wrap gap-3 mt-6">
        <Link
          to="/generate"
          className="inline-flex items-center gap-2 rounded-[8px] border-[1.5px] border-[var(--c-border)] bg-transparent px-[16px] py-[8px] text-[13px] font-medium transition-all duration-[var(--t-normal)] hover:-translate-y-[1px] hover:border-[var(--c-accent)] hover:bg-[var(--c-accent-soft)] hover:text-[var(--c-accent)]"
        >
          <Sparkles className="h-[14px] w-[14px]" /> Generate Tests
        </Link>
        <Link
          to="/planner"
          className="inline-flex items-center gap-2 rounded-[8px] border-[1.5px] border-[var(--c-border)] bg-transparent px-[16px] py-[8px] text-[13px] font-medium transition-all duration-[var(--t-normal)] hover:-translate-y-[1px] hover:border-[var(--c-accent)] hover:bg-[var(--c-accent-soft)] hover:text-[var(--c-accent)]"
        >
          <ClipboardList className="h-[14px] w-[14px]" /> New Test Plan
        </Link>
        <Link
          to="/reports"
          className="inline-flex items-center gap-2 rounded-[8px] border-[1.5px] border-[var(--c-border)] bg-transparent px-[16px] py-[8px] text-[13px] font-medium transition-all duration-[var(--t-normal)] hover:-translate-y-[1px] hover:border-[var(--c-accent)] hover:bg-[var(--c-accent-soft)] hover:text-[var(--c-accent)]"
        >
          <BookOpen className="h-[14px] w-[14px]" /> View Reports
        </Link>
      </div>

      {/* Stats — 6 columns */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mt-6">
        <StatCard label="Total test cases" value={totalCases} sub={`${suites.length} suite${suites.length !== 1 ? "s" : ""}`} icon={FileText} />
        <StatCard label="Tests passed" value={passedCases} sub={totalCases > 0 ? `${Math.round((passedCases / totalCases) * 100)}% pass rate` : "No runs"} icon={CheckCircle2} sparkline={sparklineData("passed")} sparkColor="var(--c-accent)" />
        <StatCard label="Tests failed" value={failedCases} sub={totalCases > 0 ? `${Math.round((failedCases / totalCases) * 100)}% fail rate` : "No runs"} icon={XCircle} alert={failedCases > 0} sparkline={sparklineData("failed")} sparkColor="var(--c-fail)" />
        <StatCard label="Last run" value={0} displayValue={lastRun ? `#${lastRun.id.replace("RUN-", "")}` : "—"} sub={lastRun ? `Status: ${lastRun.status} · ${formatRelativeTime(lastRun.startedAt)}` : "Never run"} icon={Clock} />
        <StatCard label="Coverage" value={coveragePercent} suffix="%" sub={`${projects.length} project${projects.length !== 1 ? "s" : ""}`} icon={ShieldAlert} />
        <StatCard label="Flaky tests" value={flakyCases} sub="Slow pass (>3s)" icon={Zap} alert={flakyCases > 0} />
      </section>



      {/* My Projects */}
      <section>
        <div className="mb-6 flex items-end justify-between gap-4 border-b border-[var(--c-border)] pb-4">
          <div>
            <p className="label-eyebrow text-[var(--c-accent)]">§ 01</p>
            <h2 className="mt-1 font-display text-2xl md:text-3xl">My Projects</h2>
          </div>
          <button
            onClick={() => setShowNewProject(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--c-accent)] px-[14px] py-[6px] text-[13px] font-medium text-white transition-all duration-[var(--t-normal)] hover:-translate-y-[1px] hover:bg-[var(--c-accent-dark)] hover:shadow-[var(--shadow-md)]"
          >
            <Plus className="h-3 w-3" /> New Project
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p, i) => {
            const pSuites = suites.filter((s) => s.projectId === p.id);
            const pCases = testCases.filter((tc) => pSuites.some((s) => s.id === tc.suiteId));
            const pRuns = runs.filter((r) => r.projectId === p.id);
            const lastProjectRun = pRuns[0];
            const passCount = pCases.filter((tc) => tc.status === "passed").length;
            const coveragePct = pCases.length > 0 ? Math.round((passCount / pCases.length) * 100) : 0;
            const statusColor = !lastProjectRun ? "bg-muted-foreground/40" : lastProjectRun.status === "passed" ? "bg-sage" : "bg-rust";

            return (
              <div
                key={p.id}
                className="group stagger-item relative flex flex-col rounded-[12px] border border-[var(--c-border)] bg-[var(--c-bg-card)] transition-all duration-[var(--t-normal)] hover:-translate-y-[2px] hover:border-[var(--c-border-strong)] hover:shadow-[var(--shadow-sm)]"
                style={{
                  animationDelay: `${i * 40}ms`,
                }}
              >
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (confirm(`Delete project "${p.name}"? This will remove all its suites and test cases.`)) {
                      deleteProject(p.id);
                      toast.success(`Project deleted`);
                    }
                  }}
                  className="absolute right-2 top-2 z-10 p-2 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  title="Delete project"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <Link
                  to="/projects"
                  search={{ projectId: p.id }}
                  className="flex h-full w-full flex-col p-5 text-left bg-transparent border-0 outline-none cursor-pointer text-current no-underline hover:no-underline"
                >
                  <div className="flex items-start justify-between w-full">
                    <div className="flex items-center gap-2">
                      <FolderClosed className="h-4 w-4 text-[var(--c-accent)]" />
                      <p className="font-medium text-[15px] pr-8 text-[var(--c-text)]">{p.name}</p>
                    </div>
                    <span className={`inline-block h-2 w-2 rounded-full ${statusColor}`} title={lastProjectRun ? lastProjectRun.status : "Never run"} />
                  </div>
                  <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                    Created {new Date(p.createdAt).toLocaleDateString()}
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <span className="rounded-sm bg-muted px-2 py-0.5 font-mono text-[10px] group-hover:bg-accent/10 group-hover:text-accent transition-colors">
                      {pCases.length} cases
                    </span>
                  </div>
                  {/* Coverage bar */}
                  <div className="mt-3 w-full">
                    <div className="h-1 w-full rounded-full bg-border overflow-hidden">
                      <div
                        className="h-full rounded-full bg-sage transition-all"
                        style={{ width: `${coveragePct}%` }}
                      />
                    </div>
                    <p className="mt-1 font-mono text-[9px] text-muted-foreground">{coveragePct}% coverage</p>
                  </div>
                  <div className="mt-auto pt-4 flex items-center justify-between w-full">
                    <p className="font-mono text-[10px] text-[var(--c-text-muted)]">
                      {lastProjectRun ? `${lastProjectRun.id} · ${formatRelativeTime(lastProjectRun.startedAt)}` : "Never run"}
                    </p>
                    <span className="text-[12px] font-medium text-[var(--c-accent)] opacity-0 transition-opacity duration-[var(--t-normal)] group-hover:opacity-100">
                      Open <ArrowRight className="inline h-3 w-3" />
                    </span>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </section>





      <DetailedNewProjectModal open={showNewProject} onClose={() => setShowNewProject(false)} />
    </div>
  );
}

/* ─── Helper: relative time ─────────────────────────────── */
function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/* ─── Sub-components ────────────────────────────────────── */

function guessLocationFromTimezone(tz: string): { city: string; region: string } {
  const tzMap: Record<string, { city: string; region: string }> = {
    "America/New_York": { city: "New York", region: "NY" },
    "America/Los_Angeles": { city: "Los Angeles", region: "CA" },
    "America/Chicago": { city: "Chicago", region: "IL" },
    "America/Denver": { city: "Denver", region: "CO" },
    "America/Phoenix": { city: "Phoenix", region: "AZ" },
    "America/Anchorage": { city: "Anchorage", region: "AK" },
    "America/Honolulu": { city: "Honolulu", region: "HI" },
    "Europe/London": { city: "London", region: "UK" },
    "Europe/Paris": { city: "Paris", region: "FR" },
    "Europe/Berlin": { city: "Berlin", region: "DE" },
    "Asia/Kolkata": { city: "Kolkata", region: "India" },
    "Asia/Calcutta": { city: "Kolkata", region: "India" },
    "Asia/Tokyo": { city: "Tokyo", region: "JP" },
    "Asia/Shanghai": { city: "Shanghai", region: "CN" },
    "Asia/Singapore": { city: "Singapore", region: "SG" },
    "Australia/Sydney": { city: "Sydney", region: "NSW" },
  };

  if (tzMap[tz]) return tzMap[tz];

  const parts = tz.split("/");
  if (parts.length > 1) {
    const city = parts[parts.length - 1].replace(/_/g, " ");
    return { city, region: parts[0] };
  }
  return { city: "Brooklyn", region: "NY" };
}

function GoogleUserLocationHeader() {
  const [loc, setLoc] = useState<{ city: string; region: string; timezone: string } | null>(null);
  const [timeStr, setTimeStr] = useState<string>("");

  useEffect(() => {
    const defaultTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const fallbackLoc = guessLocationFromTimezone(defaultTz);

    // Fetch from ipwho.is (fast, CORS-enabled, reliable)
    fetch("https://ipwho.is/")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success) {
          setLoc({
            city: data.city || fallbackLoc.city,
            region: data.region || data.region_code || fallbackLoc.region,
            timezone: data.timezone?.id || defaultTz,
          });
        } else {
          throw new Error("ipwho.is failed");
        }
      })
      .catch(() => {
        // Fallback 1: ipapi.co
        fetch("https://ipapi.co/json/")
          .then((res) => res.json())
          .then((data) => {
            if (data && data.city) {
              setLoc({
                city: data.city,
                region: data.region_code || data.region || fallbackLoc.region,
                timezone: data.timezone || defaultTz,
              });
            } else {
              throw new Error("ipapi.co failed");
            }
          })
          .catch(() => {
            // Fallback 2: ipinfo.io
            fetch("https://ipinfo.io/json")
              .then((res) => res.json())
              .then((data) => {
                if (data && data.city) {
                  setLoc({
                    city: data.city,
                    region: data.region || fallbackLoc.region,
                    timezone: data.timezone || defaultTz,
                  });
                } else {
                  throw new Error("ipinfo.io failed");
                }
              })
              .catch(() => {
                // Fallback 3: local timezone guess
                setLoc({
                  city: fallbackLoc.city,
                  region: fallbackLoc.region,
                  timezone: defaultTz,
                });
              });
          });
      });
  }, []);

  useEffect(() => {
    if (!loc) return;

    const updateTime = () => {
      try {
        const formatter = new Intl.DateTimeFormat("en-US", {
          timeZone: loc.timezone,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        });
        setTimeStr(formatter.format(new Date()));
      } catch (e) {
        setTimeStr(new Date().toLocaleTimeString());
      }
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [loc]);

  if (!loc) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-3.5 w-32 rounded bg-[var(--c-border)] ml-auto" />
        <div className="h-3.5 w-24 rounded bg-[var(--c-border)] ml-auto" />
      </div>
    );
  }

  return (
    <div className="text-right font-mono text-[11px] text-[var(--c-text-muted)]">
      <p>{loc.city}, {loc.region}</p>
      <p className="mt-1">{timeStr}</p>
    </div>
  );
}

function Masthead() {
  const auth = useAuth();
  const isGoogleUser =
    auth.user?.app_metadata?.provider === "google" ||
    auth.user?.identities?.some((id) => id.provider === "google") ||
    auth.user?.email === "google.user@example.com";

  return (
    <header className="border-b-[2px] border-[var(--c-text)] pb-6 mt-[20px]">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="mt-3 font-display text-[48px] leading-[1.1] md:text-6xl text-[var(--c-text)]">The workspace.</h1>
          <p className="mt-3 max-w-2xl text-[15px] text-[var(--c-text-muted)]">A fresh page. Add a project, drop a spec, and start drafting.</p>
        </div>
        <div className="hidden md:block">
          {isGoogleUser && <GoogleUserLocationHeader />}
        </div>
      </div>
    </header>
  );
}

function StatCard({
  label, value, displayValue, suffix = "", sub, icon: Icon, alert, sparkline, sparkColor,
}: {
  label: string;
  value: number;
  displayValue?: string;
  suffix?: string;
  sub: string;
  icon: any;
  alert?: boolean;
  sparkline?: number[];
  sparkColor?: string;
}) {
  const animatedValue = useCountUp(value);

  return (
    <div
      className="relative flex flex-col justify-between overflow-hidden rounded-[12px] border border-[var(--c-border)] bg-[var(--c-bg-card)] p-5 stagger-item transition-all duration-[var(--t-normal)] hover:-translate-y-[3px] hover:border-[var(--c-border-strong)] hover:shadow-[var(--shadow-sm)]"
    >
      <div>
        <div className="flex items-center justify-between">
          <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-[var(--c-text-muted)]">{label}</p>
          <Icon className="h-3.5 w-3.5 text-[var(--c-text-muted)]" />
        </div>
        <div className="mt-2.5 flex items-baseline justify-between gap-2">
          <p className="font-display text-[30px] font-medium leading-none text-[var(--c-text)]">
            {displayValue ?? `${animatedValue}${suffix}`}
          </p>
          {sparkline && sparkColor && (
            <Sparkline data={sparkline} color={sparkColor} />
          )}
        </div>
      </div>
      <p className="mt-3 font-mono text-[10.5px] text-[var(--c-text-muted)]">{sub}</p>
    </div>
  );
}