import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { z } from "zod";
import {
  FolderPlus, FolderClosed, Trash2, Upload, FileText,
  X, Layers, ChevronRight, ChevronDown, Plus, MoreHorizontal,
  Play, Edit2, Check,
} from "lucide-react";
import {
  useProjects, createProject, deleteProject, addFiles, removeFile,
  useSuites, createSuite, deleteSuite, renameSuite,
  useTestCases, createTestCase, deleteTestCase, updateTestCase,
  createMockRun, updateProject, deductTokens, addNotification,
  type Project, type TestSuite, type TestCase,
} from "@/lib/store";
import { usePanel } from "@/components/PanelContext";
import { EmptyState } from "@/components/EmptyState";
import { toast } from "./_app";

const projectsSearchSchema = z.object({
  projectId: z.string().optional(),
});

export const Route = createFileRoute("/_app/projects")({
  head: () => ({ meta: [{ title: "My Projects — Field Notes" }] }),
  validateSearch: (search) => projectsSearchSchema.parse(search),
  component: ProjectsPage,
});

function ProjectsPage() {
  const { projectId } = Route.useSearch();
  const navigate = useNavigate();
  const [projects] = useProjects();
  const [showNew, setShowNew] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const selectedProject = projects.find((p) => p.id === projectId);

  if (selectedProject) {
    return (
      <div className="mx-auto max-w-7xl">
        <button
          onClick={() => navigate({ to: "/projects", search: { projectId: undefined } })}
          className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--c-text-muted)] hover:text-[var(--c-accent)] transition-colors"
        >
          ← Back to projects
        </button>
        <ProjectDetail project={selectedProject} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        section="§ Projects"
        title="My projects"
        subtitle="A binder for each thing you're testing."
        action={
          <button onClick={() => setShowNew(true)} className="rounded-full bg-[var(--c-accent)] px-[18px] py-[8px] text-[14px] font-medium text-white transition-all duration-[var(--t-normal)] hover:-translate-y-[1px] hover:bg-[var(--c-accent-dark)] hover:shadow-[var(--shadow-md)]">
            + New project
          </button>
        }
      />

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[16px] border border-dashed border-[var(--c-border-strong)] bg-[var(--c-bg-card)] py-24 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-[var(--c-bg-hover)]">
            <FolderPlus className="h-7 w-7 text-[var(--c-text-muted)]" />
          </div>
          <p className="mt-6 font-display text-3xl">You have no projects</p>
          <p className="mt-2 max-w-md text-[14px] text-[var(--c-text-muted)]">
            Projects keep your test cases, files and runs together. Start with one — you can always add more.
          </p>
          <button onClick={() => setShowNew(true)} className="mt-6 rounded-[8px] bg-[var(--c-text)] px-[20px] py-[10px] text-[14px] text-[var(--c-bg)] transition-all duration-[var(--t-normal)] hover:-translate-y-[1px] hover:opacity-90 hover:shadow-[var(--shadow-md)]">
            Create your first project
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p, i) => (
            <ProjectCard key={p.id} project={p} index={i} onEdit={() => setEditingProject(p)} />
          ))}
        </div>
      )}

      <DetailedNewProjectModal
        open={showNew}
        onClose={() => setShowNew(false)}
        onSuccess={(p) => {
          navigate({ to: "/projects", search: { projectId: p.id } });
        }}
      />

      {editingProject && (
        <EditProjectModal project={editingProject} onClose={() => setEditingProject(null)} />
      )}
    </div>
  );
}

function ProjectCard({ project: p, index, onEdit }: { project: Project; index: number; onEdit: () => void }) {
  const { openPanel } = usePanel();
  const [suites] = useSuites();
  const projectSuites = suites.filter((s) => s.projectId === p.id);

  const completedPoints = (p.totalStoryPoints || 0) - (p.remainingStoryPoints || 0);
  const completionPct = p.totalStoryPoints > 0 ? Math.round((completedPoints / p.totalStoryPoints) * 100) : 0;

  return (
    <div
      className="stagger-item group relative flex flex-col items-start rounded-[12px] border border-[var(--c-border)] bg-[var(--c-bg-card)] p-6 text-left transition-all duration-[var(--t-normal)] hover:-translate-y-[3px] hover:border-[var(--c-border-strong)] hover:shadow-[var(--shadow-md)]"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="flex w-full items-start justify-between">
        <FolderClosed className="h-7 w-7 text-[var(--c-accent)] shrink-0" />
        <div className="flex items-center gap-2">
          <span className={`inline-block rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${
            (p.status || "active") === "completed"
              ? "bg-[var(--c-pass-soft)] text-[var(--c-pass)]"
              : (p.status || "active") === "on_hold"
              ? "bg-[var(--c-warn-soft)] text-[var(--c-warn)]"
              : "bg-[var(--c-bg-hover)] text-[var(--c-text-muted)] border border-[var(--c-border)]"
          }`}>
            {p.status || "active"}
          </span>
          <span className={`inline-block rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider badge-${p.priority || "medium"}`}>
            {p.priority || "medium"}
          </span>
        </div>
      </div>

      <Link
        to="/projects"
        search={{ projectId: p.id }}
        className="w-full text-left mt-4 block"
      >
        <p className="font-display text-[25px] leading-tight text-[var(--c-text)] transition-colors group-hover:text-[var(--c-accent)] truncate">{p.name}</p>
        <p className="mt-1.5 text-[13px] text-[var(--c-text-muted)] line-clamp-2 leading-relaxed">
          {p.description || "No project description provided."}
        </p>
      </Link>

      {/* Progress Bar & Story Points */}
      <div className="mt-4 w-full space-y-1.5">
        <div className="flex justify-between text-[11px] font-mono text-[var(--c-text-muted)]">
          <span>Points: {completedPoints} / {p.totalStoryPoints || 0} completed</span>
          <span>{completionPct}%</span>
        </div>
        <div className="h-[6px] w-full bg-[var(--c-bg-hover)] rounded-full overflow-hidden border border-[var(--c-border)]">
          <div 
            className="h-full bg-[var(--c-accent)] rounded-full transition-all duration-[var(--t-slow)]" 
            style={{ width: `${completionPct}%` }}
          />
        </div>
      </div>

      {/* Dates & Tags */}
      <div className="mt-4 w-full flex flex-wrap gap-2 justify-between items-center text-[11px] font-mono text-[var(--c-text-muted)]">
        <span>{p.startDate || "N/A"} → {p.targetDate || "N/A"}</span>
        <div className="flex flex-wrap gap-1.5">
          {(p.tags || []).map(tag => (
            <span key={tag} className="rounded-sm border border-[var(--c-border)] bg-[var(--c-bg)] px-1.5 py-0.5 text-[9px]">{tag}</span>
          ))}
        </div>
      </div>

      {/* Footer buttons */}
      <div className="w-full border-t border-[var(--c-border)] mt-4 pt-3 flex justify-between items-center">
        <span className="font-mono text-[10px] text-[var(--c-text-muted)]">
          {projectSuites.length} suite{projectSuites.length !== 1 ? "s" : ""}
        </span>
        <div className="flex gap-2">
          <button 
            onClick={onEdit} 
            className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--c-text-muted)] hover:text-[var(--c-accent)] transition-colors"
          >
            <Edit2 className="h-3.5 w-3.5" /> Edit
          </button>
          <button 
            onClick={() => { if (confirm(`Delete "${p.name}"?`)) { deleteProject(p.id); toast.success(`Project deleted`); } }} 
            className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--c-text-muted)] hover:text-[var(--c-fail)] transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Project Detail (renders in panel) ─────────────────── */

export function ProjectDetail({ project }: { project: Project }) {
  const [projects] = useProjects();
  const [suites] = useSuites();
  const { openPanel } = usePanel();
  const fileInput = useRef<HTMLInputElement>(null);

  // Refresh from store
  const p = projects.find((x) => x.id === project.id) ?? project;
  const projectSuites = suites.filter((s) => s.projectId === p.id);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      addFiles(p.id, Array.from(e.target.files));
      toast.success(`${e.target.files.length} file(s) added`);
    }
    e.target.value = "";
  }

  function handleRunAll() {
    const run = createMockRun(p.id);
    toast.success(`Run ${run.id} completed — ${run.results.filter(r => r.status === "passed").length}/${run.results.length} passed`);
  }

  const totalPoints = p.totalStoryPoints || 10;
  const completedPoints = Math.max(0, totalPoints - (p.remainingStoryPoints || 0));
  const remainingPoints = p.remainingStoryPoints || 0;

  const spr1Points = Math.round(completedPoints * 0.4);
  const spr2Points = Math.round(completedPoints * 0.4);
  const spr3Points = completedPoints - (spr1Points + spr2Points);
  const spr4Points = remainingPoints;

  const sprints = [
    { id: "s1", name: "Sprint 1", points: spr1Points, status: "completed" as const },
    { id: "s2", name: "Sprint 2", points: spr2Points, status: "completed" as const },
    { id: "s3", name: "Sprint 3", points: spr3Points, status: p.status === "completed" ? "completed" as const : "active" as const },
    { id: "s4", name: "Sprint 4", points: spr4Points, status: p.status === "completed" ? "completed" as const : "future" as const },
  ];

  const completedSprintsCount = sprints.filter(s => s.status === "completed").length;
  const velocity = completedSprintsCount > 0 
    ? (sprints.filter(s => s.status === "completed").reduce((sum, s) => sum + s.points, 0) / completedSprintsCount).toFixed(1)
    : "0.0";

  const getX = (index: number) => 40 + index * 86.6;
  const getY = (val: number) => 20 + ((totalPoints - val) / (totalPoints || 1)) * 120;

  const pt0 = { x: getX(0), y: getY(totalPoints) };
  const pt1 = { x: getX(1), y: getY(totalPoints - spr1Points) };
  const pt2 = { x: getX(2), y: getY(totalPoints - spr1Points - spr2Points) };
  const pt3 = { x: getX(3), y: getY(totalPoints - spr1Points - spr2Points - spr3Points) };

  const actualPoints = [pt0, pt1, pt2];
  if (p.status === "completed" || sprints[2].status === "completed") {
    actualPoints.push(pt3);
  }

  const actualPath = actualPoints.map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`).join(" ");

  return (
    <div className="space-y-6">
      {/* Project header */}
      <div>
        <p className="label-eyebrow text-[var(--c-accent)]">§ Project Details</p>
        <h2 className="mt-1 font-display text-[32px]">{p.name}</h2>
        <p className="mt-1 font-mono text-[11px] text-[var(--c-text-muted)]">
          {projectSuites.length} suite{projectSuites.length !== 1 ? "s" : ""} · {p.files.length} file{p.files.length !== 1 ? "s" : ""} · Created {new Date(p.createdAt).toLocaleDateString()}
        </p>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => fileInput.current?.click()} className="inline-flex items-center gap-1.5 rounded-[8px] border-[1.5px] border-[var(--c-border)] bg-transparent px-[14px] py-[6px] text-[13px] font-medium transition-all duration-[var(--t-normal)] hover:-translate-y-[1px] hover:border-[var(--c-accent)] hover:bg-[var(--c-accent-soft)] hover:text-[var(--c-accent)]">
          <Upload className="h-3 w-3" /> Add Files
        </button>
        {projectSuites.length > 0 && (
          <button onClick={handleRunAll} className="inline-flex items-center gap-1.5 rounded-[8px] bg-[var(--c-accent)] px-[14px] py-[6px] text-[13px] font-medium text-white transition-all duration-[var(--t-normal)] hover:-translate-y-[1px] hover:bg-[var(--c-accent-dark)] hover:shadow-[var(--shadow-md)]">
            <Play className="h-3 w-3" /> Run All
          </button>
        )}
      </div>
      <input ref={fileInput} type="file" multiple hidden onChange={onPick} />

      {/* Project Metrics Section */}
      <div className="space-y-6 border-t border-[var(--c-border)] pt-5">
        <h3 className="font-display text-[20px] text-[var(--c-text)]">Project Metrics</h3>
        
        {/* Story Points & Velocity Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg-card)] p-4">
            <p className="font-mono text-[9px] uppercase tracking-wider text-[var(--c-text-muted)]">Story Points</p>
            <p className="mt-1 font-display text-[22px] font-semibold text-[var(--c-text)] leading-none">
              {completedPoints} <span className="text-[11px] font-normal text-[var(--c-text-muted)]">/ {totalPoints} completed</span>
            </p>
          </div>
          <div className="rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg-card)] p-4">
            <p className="font-mono text-[9px] uppercase tracking-wider text-[var(--c-text-muted)]">Velocity</p>
            <p className="mt-1 font-display text-[22px] font-semibold text-[var(--c-text)] leading-none">
              {velocity} <span className="text-[11px] font-normal text-[var(--c-text-muted)]">pts/spr</span>
            </p>
          </div>
        </div>

        {/* Burndown Chart */}
        <div className="rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg-card)] p-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--c-text-muted)] mb-3">Burndown Chart</p>
          <div className="flex justify-center">
            <svg viewBox="0 0 320 160" className="w-full h-[150px]">
              {/* Grid lines */}
              <line x1="40" y1="20" x2="300" y2="20" stroke="var(--c-border)" strokeWidth="0.5" strokeDasharray="3" />
              <line x1="40" y1="60" x2="300" y2="60" stroke="var(--c-border)" strokeWidth="0.5" strokeDasharray="3" />
              <line x1="40" y1="100" x2="300" y2="100" stroke="var(--c-border)" strokeWidth="0.5" strokeDasharray="3" />
              <line x1="40" y1="140" x2="300" y2="140" stroke="var(--c-border)" strokeWidth="1" />
              
              {/* Vertical lines */}
              <line x1="40" y1="20" x2="40" y2="140" stroke="var(--c-border)" strokeWidth="1" />
              <line x1="126" y1="20" x2="126" y2="140" stroke="var(--c-border)" strokeWidth="0.5" strokeDasharray="3" />
              <line x1="213" y1="20" x2="213" y2="140" stroke="var(--c-border)" strokeWidth="0.5" strokeDasharray="3" />
              <line x1="300" y1="20" x2="300" y2="140" stroke="var(--c-border)" strokeWidth="0.5" strokeDasharray="3" />
              
              {/* Ideal Line */}
              <line x1="40" y1="20" x2="300" y2="140" stroke="var(--c-text-dim)" strokeWidth="1.2" strokeDasharray="4" />
              
              {/* Actual Line */}
              <path
                d={actualPath}
                fill="none"
                stroke="var(--c-accent)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              
              {/* Actual points */}
              {actualPoints.map((pt, index) => (
                <circle key={index} cx={pt.x} cy={pt.y} r="3.5" fill="var(--c-accent)" />
              ))}

              {/* Labels */}
              <text x="35" y="24" className="font-mono text-[9px] fill-[var(--c-text-muted)] text-right" textAnchor="end">{totalPoints}</text>
              <text x="35" y="80" className="font-mono text-[9px] fill-[var(--c-text-muted)] text-right" textAnchor="end">{Math.round(totalPoints / 2)}</text>
              <text x="35" y="144" className="font-mono text-[9px] fill-[var(--c-text-muted)] text-right" textAnchor="end">0</text>
              
              <text x="40" y="155" className="font-mono text-[9px] fill-[var(--c-text-muted)]" textAnchor="middle">S1</text>
              <text x="126" y="155" className="font-mono text-[9px] fill-[var(--c-text-muted)]" textAnchor="middle">S2</text>
              <text x="213" y="155" className="font-mono text-[9px] fill-[var(--c-text-muted)]" textAnchor="middle">S3</text>
              <text x="300" y="155" className="font-mono text-[9px] fill-[var(--c-text-muted)]" textAnchor="middle">S4</text>
            </svg>
          </div>
          <div className="flex items-center justify-between mt-2.5 font-mono text-[9px] text-[var(--c-text-muted)]">
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 bg-[var(--c-accent)] inline-block"></span>Actual Burndown</span>
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 bg-[var(--c-text-dim)] border-dashed border-t inline-block"></span>Ideal Path</span>
          </div>
        </div>

        {/* Sprints list */}
        <div className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--c-text-muted)]">Sprints Tracker</p>
          <div className="space-y-1.5">
            {sprints.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-[6px] border border-[var(--c-border)] bg-[var(--c-bg-card)] px-3 py-2.5 text-[13px]">
                <div className="flex items-center gap-2">
                  <span className={`inline-block h-2 w-2 rounded-full ${s.status === "completed" ? "bg-[var(--c-pass)]" : s.status === "active" ? "bg-[var(--c-accent)]" : "bg-[var(--c-text-dim)]"}`} />
                  <span className="font-medium">{s.name}</span>
                </div>
                <div className="flex items-center gap-3 font-mono text-[10.5px] text-[var(--c-text-muted)]">
                  <span>{s.points} pts</span>
                  <span className={`rounded-sm px-1.5 py-0.2 uppercase text-[9px] ${s.status === "completed" ? "bg-[var(--c-pass-soft)] text-[var(--c-pass)]" : s.status === "active" ? "bg-[var(--c-accent-soft)] text-[var(--c-accent)]" : "bg-[var(--c-bg-hover)]"}`}>
                    {s.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Files */}
      {p.files.length > 0 && (
        <div>
          <p className="label-eyebrow mb-3">Files</p>
          <div className="rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg-card)] overflow-hidden">
            {p.files.map((f, i) => (
              <div key={f.id} className={`flex items-center justify-between gap-4 px-4 py-3 hover:bg-[var(--c-bg-hover)] transition-colors ${i > 0 ? "border-t border-[var(--c-border)]" : ""}`}>
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-4 w-4 text-[var(--c-accent)] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium truncate">{f.name}</p>
                    <p className="font-mono text-[10px] text-[var(--c-text-muted)]">
                      {(f.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button onClick={() => { removeFile(p.id, f.id); toast.success("File removed"); }} className="text-[var(--c-text-muted)] hover:text-[var(--c-fail)] shrink-0 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Suite Folder (collapsible tree node) ──────────────── */

function SuiteFolder({ suite, testCases, projectName }: { suite: TestSuite; testCases: TestCase[]; projectName: string }) {
  const [expanded, setExpanded] = useState(false);
  const [showAddCase, setShowAddCase] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState(suite.name);
  const { openPanel } = usePanel();

  function handleAddCase(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    createTestCase(suite.id, { title: newTitle.trim() });
    setNewTitle("");
    setShowAddCase(false);
    toast.success("Test case created");
  }

  function handleRename() {
    if (editName.trim() && editName.trim() !== suite.name) {
      renameSuite(suite.id, editName.trim());
      toast.success("Suite renamed");
    }
    setEditingName(false);
  }

  return (
    <div className="overflow-hidden rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg-card)]">
      <div className="flex items-center gap-2 px-3 py-2.5 transition-colors hover:bg-[var(--c-bg-hover)]">
        <button onClick={() => setExpanded(!expanded)} className="text-[var(--c-text-muted)] hover:text-[var(--c-text)] transition-colors">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <Layers className="h-4 w-4 text-[var(--c-accent)]" />
        {editingName ? (
          <form onSubmit={(e) => { e.preventDefault(); handleRename(); }} className="flex items-center gap-1 flex-1">
            <input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleRename}
              className="flex-1 bg-transparent text-[13px] font-medium outline-none border-b border-[var(--c-accent)]"
            />
          </form>
        ) : (
          <span className="flex-1 text-[14px] font-medium">{suite.name}</span>
        )}
        <span className="font-mono text-[10px] text-[var(--c-text-muted)]">{testCases.length}</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowAddCase(true)} className="p-1.5 text-[var(--c-text-muted)] hover:text-[var(--c-text)] transition-colors" title="Add test case">
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => { setEditingName(true); setEditName(suite.name); }} className="p-1.5 text-[var(--c-text-muted)] hover:text-[var(--c-text)] transition-colors" title="Rename">
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => { if (confirm(`Delete suite "${suite.name}"?`)) { deleteSuite(suite.id); toast.success("Suite deleted"); } }} className="p-1.5 text-[var(--c-text-muted)] hover:text-[var(--c-fail)] transition-colors" title="Delete">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[var(--c-border)] bg-[var(--c-bg)]">
          {showAddCase && (
            <form onSubmit={handleAddCase} className="flex items-center gap-2 border-b border-[var(--c-border)] bg-[var(--c-bg-hover)] px-4 py-2">
              <input
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Test case title…"
                className="flex-1 bg-transparent text-[13px] outline-none"
              />
              <button type="submit" className="text-[12px] font-medium text-[var(--c-accent)] hover:text-[var(--c-accent-dark)]">Add</button>
              <button type="button" onClick={() => setShowAddCase(false)} className="text-[12px] text-[var(--c-text-muted)] hover:text-[var(--c-text)]">Cancel</button>
            </form>
          )}
          {testCases.length === 0 && !showAddCase ? (
            <div className="px-4 py-6 text-center text-[13px] text-[var(--c-text-muted)]">
              No test cases. Click + to add one.
            </div>
          ) : (
            testCases.map((tc) => (
              <button
                key={tc.id}
                onClick={() => openPanel(
                  <TestCaseDetail testCase={tc} />,
                  [
                    { label: "Projects" },
                    { label: projectName },
                    { label: suite.name },
                    { label: tc.title },
                  ]
                )}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[13px] border-b border-[var(--c-border)] last:border-0 hover:bg-[var(--c-bg-hover)] transition-colors"
              >
                <FileText className="h-3.5 w-3.5 text-[var(--c-text-muted)]" />
                <span className="flex-1 truncate">{tc.title}</span>
                <span className={`rounded-sm px-2 py-0.5 font-mono text-[10px] status-${tc.status}`}>
                  {tc.status}
                </span>
                <span className={`rounded-sm px-2 py-0.5 font-mono text-[10px] badge-${tc.priority}`}>
                  {tc.priority}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Test Case Detail (renders in panel) ───────────────── */

function TestCaseDetail({ testCase }: { testCase: TestCase }) {
  const [cases] = useTestCases();
  const tc = cases.find((c) => c.id === testCase.id) ?? testCase;
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    title: tc.title,
    steps: tc.steps,
    expected: tc.expected,
    priority: tc.priority,
    status: tc.status,
    tags: tc.tags.join(", "),
  });

  function save() {
    updateTestCase(tc.id, {
      title: form.title,
      steps: form.steps,
      expected: form.expected,
      priority: form.priority,
      status: form.status,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
    });
    setEditing(false);
    toast.success("Test case updated");
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="label-eyebrow text-accent">§ Test Case</p>
        {editing ? (
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="mt-1 w-full bg-transparent font-display text-2xl outline-none border-b border-accent"
          />
        ) : (
          <h2 className="mt-1 font-display text-2xl">{tc.title}</h2>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <span className={`rounded-sm px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider status-${tc.status}`}>
          {tc.status}
        </span>
        <span className={`rounded-sm px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider badge-${tc.priority}`}>
          {tc.priority}
        </span>
        {tc.tags.map((tag) => (
          <span key={tag} className="rounded-sm border border-border px-2.5 py-1 font-mono text-[10px]">{tag}</span>
        ))}
      </div>

      {editing ? (
        <div className="space-y-4">
          <div>
            <label className="label-eyebrow mb-1.5 block">Steps</label>
            <textarea
              value={form.steps}
              onChange={(e) => setForm({ ...form, steps: e.target.value })}
              rows={4}
              className="w-full border border-border bg-background p-3 text-sm outline-none focus:border-accent resize-none"
            />
          </div>
          <div>
            <label className="label-eyebrow mb-1.5 block">Expected result</label>
            <textarea
              value={form.expected}
              onChange={(e) => setForm({ ...form, expected: e.target.value })}
              rows={3}
              className="w-full border border-border bg-background p-3 text-sm outline-none focus:border-accent resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-eyebrow mb-1.5 block">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as any })}
                className="w-full border border-border bg-background p-2 text-sm outline-none"
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className="label-eyebrow mb-1.5 block">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                className="w-full border border-border bg-background p-2 text-sm outline-none"
              >
                <option value="draft">Draft</option>
                <option value="ready">Ready</option>
                <option value="passed">Passed</option>
                <option value="failed">Failed</option>
                <option value="skipped">Skipped</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label-eyebrow mb-1.5 block">Tags (comma-separated)</label>
            <input
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              className="w-full border border-border bg-background p-2 text-sm outline-none focus:border-accent"
              placeholder="smoke, regression, critical-path"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={save} className="rounded-sm bg-foreground px-4 py-2 text-sm text-background hover:bg-accent">Save</button>
            <button onClick={() => setEditing(false)} className="rounded-sm border border-border px-4 py-2 text-sm">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="label-eyebrow mb-1.5">Steps</p>
            <p className="text-sm whitespace-pre-wrap">{tc.steps || "No steps defined"}</p>
          </div>
          <div>
            <p className="label-eyebrow mb-1.5">Expected result</p>
            <p className="text-sm whitespace-pre-wrap">{tc.expected || "No expected result defined"}</p>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 text-xs hover:border-foreground">
              <Edit2 className="h-3 w-3" /> Edit
            </button>
            <button onClick={() => { if (confirm("Delete this test case?")) { deleteTestCase(tc.id); toast.success("Test case deleted"); } }} className="inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 text-xs text-destructive hover:border-destructive">
              <Trash2 className="h-3 w-3" /> Delete
            </button>
          </div>
        </div>
      )}

      <div className="border-t border-border pt-4">
        <p className="font-mono text-[10px] text-muted-foreground">
          Created {new Date(tc.createdAt).toLocaleDateString()} · ID: {tc.id.slice(0, 8)}
        </p>
      </div>
    </div>
  );
}

/* ─── Shared Components ─────────────────────────────────── */

export function PageHeader({ section, title, subtitle, action }: { section: string; title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <header className="mb-8 flex items-end justify-between gap-4 border-b-[2px] border-[var(--c-text)] pb-6 mt-[20px]">
      <div className="stagger-item">
        <p className="label-eyebrow text-[var(--c-accent)]">{section}</p>
        <h1 className="mt-2 font-display text-[42px] leading-tight md:text-5xl">{title}</h1>
        {subtitle && <p className="mt-2 text-[15px] text-[var(--c-text-muted)]">{subtitle}</p>}
      </div>
      <div className="stagger-item">{action}</div>
    </header>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(26,23,20,0.4)] p-4 backdrop-blur-[4px] animate-[fade-in-up_var(--t-normal)_var(--ease-out)_both]">
      <div className="w-full max-w-md rounded-[16px] border border-[var(--c-border)] bg-[var(--c-bg-card)] p-[28px] shadow-[var(--shadow-lg)]">
        <div className="mb-[24px] flex items-center justify-between">
          <p className="font-display text-[26px]">{title}</p>
          <button onClick={onClose} className="rounded-full p-2 text-[var(--c-text-muted)] transition-colors hover:bg-[var(--c-bg-hover)] hover:text-[var(--c-accent)]"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function DetailedNewProjectModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess?: (p: Project) => void }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [status, setStatus] = useState("planning"); // default to planning / Not Started
  const [priority, setPriority] = useState("medium"); // default to medium
  const [totalPts, setTotalPts] = useState(0);
  const [remPts, setRemPts] = useState(0);
  const [start, setStart] = useState("");
  const [target, setTarget] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [dateError, setDateError] = useState("");

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const todayStr = `${yyyy}-${mm}-${dd}`;

  if (!open) return null;

  const handleAddTag = (e: React.MouseEvent) => {
    e.preventDefault();
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string, e: React.MouseEvent) => {
    e.preventDefault();
    setTags(tags.filter((t) => t !== tag));
  };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    if (start && start < todayStr) {
      setDateError("Project start date cannot be set prior to today.");
      return;
    }

    const p = createProject(name.trim(), {
      description: desc.trim() || "No project description provided.",
      status: status as any,
      priority: priority as any,
      totalStoryPoints: Number(totalPts),
      remainingStoryPoints: Number(remPts),
      startDate: start || "N/A",
      targetDate: target || "N/A",
      tags: tags.length > 0 ? tags : [],
    });
    setName("");
    setDesc("");
    setStatus("planning");
    setPriority("medium");
    setTotalPts(0);
    setRemPts(0);
    setStart("");
    setTarget("");
    setTags([]);
    setTagInput("");
    setDateError("");
    toast.success(`Project "${p.name}" created`);
    if (onSuccess) onSuccess(p);
    onClose();
  }

  return (
    <Modal onClose={onClose} title="New project">
      <form onSubmit={submit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
        <div className="space-y-1.5">
          <label className="block font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">
            Project Name <span className="text-[var(--c-fail)]">*</span>
          </label>
          <input
            autoFocus
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. User Authentication Module"
            className="w-full rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg-input)] p-[10px] text-[13px] outline-none focus:border-[var(--c-accent)]"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">Description</label>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Brief overview of the project scope and goals..."
            rows={2}
            className="w-full rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg-input)] p-[10px] text-[13px] outline-none resize-none focus:border-[var(--c-accent)]"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg-input)] p-[10px] text-[13px] outline-none focus:border-[var(--c-accent)]"
            >
              <option value="planning">Not Started</option>
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg-input)] p-[10px] text-[13px] outline-none focus:border-[var(--c-accent)]"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">Total Story Points</label>
            <input
              type="number"
              min={0}
              value={totalPts}
              onChange={(e) => setTotalPts(Number(e.target.value))}
              className="w-full rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg-input)] p-[10px] text-[13px] outline-none focus:border-[var(--c-accent)]"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">Remaining Points</label>
            <input
              type="number"
              min={0}
              value={remPts}
              onChange={(e) => setRemPts(Number(e.target.value))}
              className="w-full rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg-input)] p-[10px] text-[13px] outline-none focus:border-[var(--c-accent)]"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">Start Date</label>
            <input
              type="date"
              value={start}
              min={todayStr}
              onChange={(e) => {
                setStart(e.target.value);
                setDateError("");
              }}
              className="w-full rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg-input)] p-[10px] text-[13px] outline-none focus:border-[var(--c-accent)]"
            />
            {dateError && (
              <p className="text-[11.5px] text-[var(--c-fail)] font-semibold mt-1">
                {dateError}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="block font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">Target Date</label>
            <input
              type="date"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg-input)] p-[10px] text-[13px] outline-none focus:border-[var(--c-accent)]"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="block font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">Tags</label>
          <div className="flex gap-2">
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="Add a tag..."
              className="flex-1 rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg-input)] px-[12px] py-[8px] text-[13px] outline-none focus:border-[var(--c-accent)]"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (tagInput.trim() && !tags.includes(tagInput.trim())) {
                    setTags([...tags, tagInput.trim()]);
                    setTagInput("");
                  }
                }
              }}
            />
            <button
              onClick={handleAddTag}
              className="rounded-[8px] border-[1.5px] border-[var(--c-border)] bg-transparent px-[14px] py-[8px] text-[13px] font-medium transition-all hover:bg-[var(--c-bg-hover)]"
            >
              +
            </button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1.5">
              {tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 rounded-[4px] border border-[var(--c-border)] bg-[var(--c-bg-card)] px-1.5 py-0.5 text-[11px]">
                  {tag}
                  <button onClick={(e) => handleRemoveTag(tag, e)} className="text-[var(--c-text-muted)] hover:text-[var(--c-fail)]"><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="mt-6 flex justify-end gap-2 pt-2 border-t border-[var(--c-border)]">
          <button type="button" onClick={onClose} className="rounded-[8px] border-[1.5px] border-[var(--c-border)] bg-transparent px-[16px] py-[8px] text-[13px] font-medium transition-all hover:bg-[var(--c-bg-hover)]">Cancel</button>
          <button type="submit" className="rounded-[8px] bg-[var(--c-text)] px-[16px] py-[8px] text-[13px] font-medium text-[var(--c-bg)] hover:opacity-90">Create Project</button>
        </div>
      </form>
    </Modal>
  );
}

function EditProjectModal({ project: p, onClose }: { project: Project; onClose: () => void }) {
  const [name, setName] = useState(p.name);
  const [desc, setDesc] = useState(p.description || "");
  const [status, setStatus] = useState(p.status || "active");
  const [priority, setPriority] = useState(p.priority || "medium");
  const [totalPts, setTotalPts] = useState(p.totalStoryPoints || 0);
  const [remPts, setRemPts] = useState(p.remainingStoryPoints || 0);
  const [start, setStart] = useState(p.startDate || "");
  const [target, setTarget] = useState(p.targetDate || "");
  const [tagsInput, setTagsInput] = useState(p.tags?.join(", ") || "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const newTags = tagsInput.split(",").map(t => t.trim()).filter(Boolean);
    const oldTags = p.tags || [];
    const tagsChanged = newTags.length !== oldTags.length || newTags.some((t, i) => t !== oldTags[i]);

    const isIdentical = 
      p.name === name.trim() &&
      (p.description || "") === desc.trim() &&
      p.status === status &&
      p.priority === priority &&
      Number(p.totalStoryPoints || 0) === Number(totalPts) &&
      Number(p.remainingStoryPoints || 0) === Number(remPts) &&
      (p.startDate || "") === start &&
      (p.targetDate || "") === target &&
      !tagsChanged;

    if (isIdentical) {
      toast.info("No changes detected. Workspace saved.");
      onClose();
      return;
    }

    if (!deductTokens(3)) {
      toast.error("Insufficient tokens to edit project.");
      return;
    }
    addNotification("Tokens Deducted", "Deducted 3 tokens for editing project.", "info");

    updateProject(p.id, {
      name: name.trim(),
      description: desc.trim(),
      status: status as any,
      priority: priority as any,
      totalStoryPoints: Number(totalPts),
      remainingStoryPoints: Number(remPts),
      startDate: start,
      targetDate: target,
      tags: newTags,
    });
    toast.success("Changes successfully committed. 3 Tokens updated.");
    onClose();
  }

  return (
    <Modal onClose={onClose} title="Edit project">
      <form onSubmit={submit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
        <div className="space-y-1.5">
          <label className="block font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">Project Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg-input)] p-[10px] text-[13px] outline-none focus:border-[var(--c-accent)]"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">Description</label>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={2}
            className="w-full rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg-input)] p-[10px] text-[13px] outline-none resize-none focus:border-[var(--c-accent)]"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg-input)] p-[10px] text-[13px] outline-none focus:border-[var(--c-accent)]"
            >
              <option value="active">Active</option>
              <option value="planning">Planning</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg-input)] p-[10px] text-[13px] outline-none focus:border-[var(--c-accent)]"
            >
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">Total Points</label>
            <input
              type="number"
              value={totalPts}
              onChange={(e) => setTotalPts(Number(e.target.value))}
              className="w-full rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg-input)] p-[10px] text-[13px] outline-none focus:border-[var(--c-accent)]"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">Remaining Points</label>
            <input
              type="number"
              value={remPts}
              onChange={(e) => setRemPts(Number(e.target.value))}
              className="w-full rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg-input)] p-[10px] text-[13px] outline-none focus:border-[var(--c-accent)]"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">Start Date</label>
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-full rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg-input)] p-[10px] text-[13px] outline-none focus:border-[var(--c-accent)]"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">Target Date</label>
            <input
              type="date"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg-input)] p-[10px] text-[13px] outline-none focus:border-[var(--c-accent)]"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="block font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">Tags (comma-separated)</label>
          <input
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            className="w-full rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg-input)] p-[10px] text-[13px] outline-none focus:border-[var(--c-accent)]"
            placeholder="web, signup, auth"
          />
        </div>
        <div className="mt-6 flex justify-end gap-2 pt-2 border-t border-[var(--c-border)]">
          <button type="button" onClick={onClose} className="rounded-[8px] border-[1.5px] border-[var(--c-border)] bg-transparent px-[16px] py-[8px] text-[13px] font-medium transition-all hover:bg-[var(--c-bg-hover)]">Cancel</button>
          <button type="submit" className="rounded-[8px] bg-[var(--c-text)] px-[16px] py-[8px] text-[13px] font-medium text-[var(--c-bg)] hover:opacity-90">Save changes</button>
        </div>
      </form>
    </Modal>
  );
}