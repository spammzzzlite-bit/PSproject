import { createFileRoute, useNavigate, Link, redirect } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { z } from "zod";
import {
  FolderPlus,
  FolderClosed,
  Trash2,
  Upload,
  FileText,
  X,
  Layers,
  ChevronRight,
  ChevronDown,
  Plus,
  MoreHorizontal,
  Play,
  Edit2,
  Check,
  Save,
  Clock,
  Calendar,
  User,
  Users,
} from "lucide-react";
import {
  useProjects,
  createProject,
  deleteProject,
  addFiles,
  removeFile,
  useSuites,
  createSuite,
  deleteSuite,
  renameSuite,
  useTestCases,
  createTestCase,
  deleteTestCase,
  updateTestCase,
  createMockRun,
  updateProject,
  deductTokens,
  addNotification,
  deductTokenAction,
  useSprints,
  fetchSprintsFromSupabase,
  updateLocalSprints,
  bulkUpsertSprintsToSupabase,
  useProfiles,
  scaffoldSprintsForProject,
  sprintsStore,
  useUserStore,
  type Project,
  type TestSuite,
  type TestCase,
  type Sprint,
  type Profile,
} from "@/frontend/store/store";
import { usePanel } from "@/frontend/components/PanelContext";
import { EmptyState } from "@/frontend/components/EmptyState";
import { PermissionGate, can, useAssertPermission, TokenCostLabel, getStoredRole } from "@/lib/permissions";
import { supabase } from "@/backend/supabase";
import { toast } from "./_app";

const projectsSearchSchema = z.object({
  projectId: z.string().optional(),
});

export const Route = createFileRoute("/_app/projects")({
  beforeLoad: () => {
    const role = getStoredRole();
    if (!can(role, "suite:create")) {
      throw redirect({ to: "/" });
    }
  },
  head: () => ({ meta: [{ title: "My Projects — QAMind AI" }] }),
  validateSearch: (search) => projectsSearchSchema.parse(search),
  component: ProjectsPage,
});

function ProjectsPage() {
  const { projectId } = Route.useSearch();
  const navigate = useNavigate();
  const [projects] = useProjects();
  const [showNew, setShowNew] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const { currentUser } = useUserStore();
  const role = currentUser?.role ?? "viewer";

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
          can(role, "project:create") ? (
            <button
              onClick={() => setShowNew(true)}
              className="rounded-full bg-[var(--c-accent)] px-[18px] py-[8px] text-[14px] font-medium text-white transition-all duration-[var(--t-normal)] hover:-translate-y-[1px] hover:bg-[var(--c-accent-dark)] hover:shadow-[var(--shadow-md)]"
            >
              + New project
            </button>
          ) : undefined
        }
      />

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[16px] border border-dashed border-[var(--c-border-strong)] bg-[var(--c-bg-card)] py-24 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-[var(--c-bg-hover)]">
            <FolderPlus className="h-7 w-7 text-[var(--c-text-muted)]" />
          </div>
          <p className="mt-6 font-display text-3xl">You have no projects</p>
          <p className="mt-2 max-w-md text-[14px] text-[var(--c-text-muted)]">
            Projects keep your test cases, files and runs together. Start with one — you can always
            add more.
          </p>
          {can(role, "project:create") && (
            <button
              onClick={() => setShowNew(true)}
              className="mt-6 rounded-[8px] bg-[var(--c-text)] px-[20px] py-[10px] text-[14px] text-[var(--c-bg)] transition-all duration-[var(--t-normal)] hover:-translate-y-[1px] hover:opacity-90 hover:shadow-[var(--shadow-md)]"
            >
              Create your first project
            </button>
          )}
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

function ProjectCard({
  project: p,
  index,
  onEdit,
}: {
  project: Project;
  index: number;
  onEdit: () => void;
}) {
  const { openPanel } = usePanel();
  const [suites] = useSuites();
  const projectSuites = suites.filter((s) => s.projectId === p.id);

  return (
    <div
      className="stagger-item group relative flex flex-col items-start rounded-[12px] border border-[var(--c-border)] bg-[var(--c-bg-card)] p-6 text-left transition-all duration-[var(--t-normal)] hover:-translate-y-[3px] hover:border-[var(--c-border-strong)] hover:shadow-[var(--shadow-md)]"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="flex w-full items-start justify-between">
        <FolderClosed className="h-7 w-7 text-[var(--c-accent)] shrink-0" />
        <div className="flex items-center gap-2">
          <span
            className={`inline-block rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${
              (p.status || "active") === "completed"
                ? "bg-[var(--c-pass-soft)] text-[var(--c-pass)]"
                : (p.status || "active") === "on_hold"
                  ? "bg-[var(--c-warn-soft)] text-[var(--c-warn)]"
                  : "bg-[var(--c-bg-hover)] text-[var(--c-text-muted)] border border-[var(--c-border)]"
            }`}
          >
            {p.status || "active"}
          </span>
          <span
            className={`inline-block rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider badge-${p.priority || "medium"}`}
          >
            {p.priority || "medium"}
          </span>
        </div>
      </div>

      <Link to="/projects" search={{ projectId: p.id }} className="w-full text-left mt-4 block">
        <p className="font-display text-[25px] leading-tight text-[var(--c-text)] transition-colors group-hover:text-[var(--c-accent)] truncate">
          {p.name}
        </p>
        <p className="mt-1.5 text-[13px] text-[var(--c-text-muted)] line-clamp-2 leading-relaxed">
          {p.description || "No project description provided."}
        </p>
      </Link>

      {/* Project Info */}
      <div className="mt-4 w-full flex items-center justify-between text-[11px] font-mono text-[var(--c-text-muted)] border-t border-[var(--c-border)]/30 pt-3">
        <span>Suites: {projectSuites.length}</span>
        <span>Files: {p.files.length}</span>
      </div>

      {/* Dates & Tags */}
      <div className="mt-4 w-full flex flex-wrap gap-2 justify-between items-center text-[11px] font-mono text-[var(--c-text-muted)]">
        <span>
          {p.startDate || "N/A"} → {p.targetDate || "N/A"}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {(p.tags || []).map((tag) => (
            <span
              key={tag}
              className="rounded-sm border border-[var(--c-border)] bg-[var(--c-bg)] px-1.5 py-0.5 text-[9px]"
            >
              {tag}
            </span>
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
          <PermissionGate action="project:delete">
            <button
              onClick={() => {
                if (confirm(`Delete "${p.name}"?`)) {
                  if (!deductTokenAction(`Delete project "${p.name}"`)) return;
                  deleteProject(p.id);
                  toast.success(`Project deleted`);
                }
              }}
              className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--c-text-muted)] hover:text-[var(--c-fail)] transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </PermissionGate>
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
  const assertPermission = useAssertPermission();

  // Refresh from store
  const p = projects.find((x) => x.id === project.id) ?? project;
  const projectSuites = suites.filter((s) => s.projectId === p.id);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      if (!deductTokenAction(`Add ${e.target.files.length} file(s) to project`)) {
        e.target.value = "";
        return;
      }
      addFiles(p.id, Array.from(e.target.files));
      toast.success(`${e.target.files.length} file(s) added`);
    }
    e.target.value = "";
  }

  function handleRunAll() {
    if (!assertPermission("tests:run")) return;
    if (!deductTokenAction(`Run all tests for project "${p.name}"`)) return;
    const run = createMockRun(p.id);
    toast.success(
      `Run ${run.id} completed — ${run.results.filter((r) => r.status === "passed").length}/${run.results.length} passed`,
    );
  }



  const [storeSprints] = useSprints();

  useEffect(() => {
    if (p.id) {
      fetchSprintsFromSupabase(p.id).then((fetched) => {
        const currentStore = sprintsStore.get();
        const projectLocal = currentStore.filter((s) => s.projectId === p.id);
        if (fetched.length === 0 && projectLocal.length === 0) {
          scaffoldSprintsForProject(p);
        }
      });
    }
  }, [p.id]);

  const dbSprints = storeSprints
    .filter((s) => s.projectId === p.id)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  const [profiles] = useProfiles();
  const [selectedSprint, setSelectedSprint] = useState<Sprint | null>(null);
  const [showNewSprint, setShowNewSprint] = useState(false);
  const [editName, setEditName] = useState("");
  const [editStatus, setEditStatus] = useState<"Upcoming" | "Active" | "Completed">("Upcoming");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editGoal, setEditGoal] = useState("");
  const [editLead, setEditLead] = useState<string | null>(null);
  const [editMembers, setEditMembers] = useState<string[]>([]);
  const [editDevelopers, setEditDevelopers] = useState<string[]>([]);
  const [editTesters, setEditTesters] = useState<string[]>([]);

  useEffect(() => {
    if (selectedSprint) {
      setEditName(selectedSprint.name);
      setEditStatus(selectedSprint.status);
      setEditStart(selectedSprint.startDate);
      setEditEnd(selectedSprint.endDate);
      setEditGoal(selectedSprint.goalDescription || "");
      setEditLead(selectedSprint.sprintLeadId);
      setEditMembers(selectedSprint.sprintMembers || []);
      setEditDevelopers(selectedSprint.sprintDevelopers || []);
      setEditTesters(selectedSprint.sprintTesters || []);
    }
  }, [selectedSprint]);

  const getEditingDuration = () => {
    if (!editStart || !editEnd) return 0;
    const startD = new Date(editStart);
    const endD = new Date(editEnd);
    if (isNaN(startD.getTime()) || isNaN(endD.getTime())) return 0;
    return Math.max(1, Math.ceil((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  };

  const handleSaveSprint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSprint) return;

    if (!editName.trim()) {
      toast.error("Sprint name is required.");
      return;
    }
    if (!deductTokenAction(`Save sprint configuration: ${editName.trim()}`)) return;
    if (!editStart || !editEnd) {
      toast.error("Start and end dates are required.");
      return;
    }
    if (new Date(editEnd) < new Date(editStart)) {
      toast.error("End date cannot be before start date.");
      return;
    }

    const updatedSprint: Sprint = {
      ...selectedSprint,
      name: editName.trim(),
      status: editStatus,
      startDate: editStart,
      endDate: editEnd,
      goalDescription: editGoal.trim() || null,
      sprintLeadId: editLead,
      sprintMembers: editMembers,
      sprintDevelopers: editDevelopers,
      sprintTesters: editTesters,
    };

    const otherSprints = dbSprints.filter((s) => s.id !== selectedSprint.id);
    const newSprints = [...otherSprints, updatedSprint];

    updateLocalSprints(p.id, newSprints);
    setSelectedSprint(null);

    const saveToast = toast.loading("Saving sprint configuration...");
    try {
      const res = await bulkUpsertSprintsToSupabase(p.id, newSprints);
      if (res.success) {
        toast.success("Sprint saved successfully", { id: saveToast });
      } else {
        toast.error("Failed to save to database. Preserved in local session.", { id: saveToast });
      }
    } catch (err) {
      toast.error("Failed to save to database. Preserved in local session.", { id: saveToast });
    }
  };

  const handleAddNewSprint = async (newSprint: Sprint) => {
    if (!assertPermission("plans:create")) return;
    if (!deductTokenAction(`Add sprint "${newSprint.name}" to project`)) return;
    const newSprints = [...dbSprints, newSprint];
    updateLocalSprints(p.id, newSprints);
    setShowNewSprint(false);

    const saveToast = toast.loading("Adding new sprint cycle...");
    try {
      const res = await bulkUpsertSprintsToSupabase(p.id, newSprints);
      if (res.success) {
        toast.success(`Sprint "${newSprint.name}" added successfully`, { id: saveToast });
      } else {
        toast.error("Failed to save to database. Preserved in local session.", { id: saveToast });
      }
    } catch (err) {
      toast.error("Failed to save to database. Preserved in local session.", { id: saveToast });
    }
  };

  const handleDeleteSprint = async (sprintId: string, sprintName: string) => {
    if (!confirm(`Are you sure you want to delete "${sprintName}"?`)) return;
    if (!deductTokenAction(`Delete sprint "${sprintName}"`)) return;

    const newSprints = dbSprints.filter((s) => s.id !== sprintId);
    updateLocalSprints(p.id, newSprints);

    if (selectedSprint?.id === sprintId) {
      setSelectedSprint(null);
    }

    const saveToast = toast.loading("Deleting sprint cycle...");
    try {
      const { error } = await supabase.from("sprints").delete().eq("id", sprintId);

      if (!error) {
        toast.success(`Sprint "${sprintName}" deleted successfully`, { id: saveToast });
      } else {
        console.error("Supabase delete error:", error);
        toast.error("Failed to delete from database. Preserved in local session.", {
          id: saveToast,
        });
      }
    } catch (err) {
      console.error("Supabase delete exception:", err);
      toast.error("Failed to delete from database. Preserved in local session.", { id: saveToast });
    }
  };

  return (
    <div className="space-y-6">
      {/* Project header */}
      <div>
        <p className="label-eyebrow text-[var(--c-accent)]">§ Project Details</p>
        <h2 className="mt-1 font-display text-[32px]">{p.name}</h2>
        <p className="mt-1 font-mono text-[11px] text-[var(--c-text-muted)]">
          {projectSuites.length} suite{projectSuites.length !== 1 ? "s" : ""} · {p.files.length}{" "}
          file{p.files.length !== 1 ? "s" : ""} · Created{" "}
          {new Date(p.createdAt).toLocaleDateString()}
        </p>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => fileInput.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-[8px] border-[1.5px] border-[var(--c-border)] bg-transparent px-[14px] py-[6px] text-[13px] font-medium transition-all duration-[var(--t-normal)] hover:-translate-y-[1px] hover:border-[var(--c-accent)] hover:bg-[var(--c-accent-soft)] hover:text-[var(--c-accent)]"
        >
          <Upload className="h-3 w-3" /> Add Files
        </button>
        {projectSuites.length > 0 && (
          <button
            onClick={handleRunAll}
            className="inline-flex items-center gap-1.5 rounded-[8px] bg-[var(--c-accent)] px-[14px] py-[6px] text-[13px] font-medium text-white transition-all duration-[var(--t-normal)] hover:-translate-y-[1px] hover:bg-[var(--c-accent-dark)] hover:shadow-[var(--shadow-md)]"
          >
            <Play className="h-3 w-3" /> Run All
          </button>
        )}
      </div>
      <input ref={fileInput} type="file" multiple hidden onChange={onPick} />

      {/* Sprints list */}
      <div className="space-y-2 border-t border-[var(--c-border)] pt-5">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--c-text-muted)]">
            Sprints Tracker
            </p>
            <button
              onClick={() => setShowNewSprint(true)}
              className="inline-flex items-center gap-1 rounded bg-[var(--c-accent-soft)] px-2.5 py-1 text-[11px] font-mono text-[var(--c-accent)] hover:opacity-90 transition-all"
            >
              + Add Sprint
            </button>
          </div>
          <div className="space-y-2 mt-2">
            {dbSprints.map((s) => {
              const isActive = s.status === "Active";
              const isCompleted = s.status === "Completed";
              const lead = profiles.find((p) => p.id === s.sprintLeadId);

              const startD = s.startDate ? new Date(s.startDate) : null;
              const endD = s.endDate ? new Date(s.endDate) : null;

              const isValidStart = startD && !isNaN(startD.getTime());
              const isValidEnd = endD && !isNaN(endD.getTime());

              const durationDays =
                isValidStart && isValidEnd
                  ? Math.max(
                      1,
                      Math.ceil((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)) + 1,
                    )
                  : 0;

              const formattedStart = isValidStart
                ? startD.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                : "N/A";
              const formattedEnd = isValidEnd
                ? endD.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                : "N/A";

              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedSprint(s)}
                  className={`group relative flex flex-col gap-2 rounded-[8px] border bg-[var(--c-bg-card)] px-3 py-2.5 text-[13px] cursor-pointer transition-all hover:bg-[var(--c-bg-hover)]
                    ${
                      isActive
                        ? "border-[var(--c-accent)] shadow-[0_0_10px_var(--c-accent-soft)]"
                        : "border-[var(--c-border)]"
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${isCompleted ? "bg-[var(--c-pass)]" : isActive ? "bg-[var(--c-accent)]" : "bg-[var(--c-text-dim)]"}`}
                      />
                      <span className="font-semibold text-[14px]">{s.name}</span>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-[10.5px]">
                      <span
                        className={`rounded-sm px-1.5 py-0.2 uppercase text-[9px] font-semibold
                        ${
                          isCompleted
                            ? "bg-[var(--c-pass-soft)] text-[var(--c-pass)]"
                            : isActive
                              ? "bg-[var(--c-accent-soft)] text-[var(--c-accent)]"
                              : "bg-[var(--c-bg-hover)] text-[var(--c-text-muted)]"
                        }`}
                      >
                        {s.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[var(--c-text-muted)] font-mono border-t border-[var(--c-border)]/50 pt-2 mt-1">
                    <span>
                      📅 {formattedStart} – {formattedEnd} ({durationDays}d)
                    </span>
                    <div className="flex items-center gap-1.5">
                      {lead ? (
                        <span className="truncate max-w-[80px]" title={`Lead: ${lead.fullName}`}>
                          👤 {lead.fullName.split(" ")[0]}
                        </span>
                      ) : (
                        <span className="text-[var(--c-text-dim)]">No Lead</span>
                      )}
                      <span>·</span>
                      <span
                        title={`${s.sprintMembers?.length || 0} Members, ${s.sprintDevelopers?.length || 0} Developers, ${s.sprintTesters?.length || 0} Testers`}
                      >
                        👥{" "}
                        {(s.sprintMembers?.length || 0) +
                          (s.sprintDevelopers?.length || 0) +
                          (s.sprintTesters?.length || 0)}
                      </span>
                    </div>
                  </div>

                  {/* Delete Sprint Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSprint(s.id, s.name);
                    }}
                    className="absolute right-2 top-2 z-10 p-1 text-[var(--c-text-muted)] opacity-0 hover:text-[var(--c-fail)] group-hover:opacity-100 transition-opacity"
                    title="Delete Sprint"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

      {/* Files */}
      {p.files.length > 0 && (
        <div>
          <p className="label-eyebrow mb-3">Files</p>
          <div className="rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg-card)] overflow-hidden">
            {p.files.map((f, i) => (
              <div
                key={f.id}
                className={`flex items-center justify-between gap-4 px-4 py-3 hover:bg-[var(--c-bg-hover)] transition-colors ${i > 0 ? "border-t border-[var(--c-border)]" : ""}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-4 w-4 text-[var(--c-accent)] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium truncate">{f.name}</p>
                    <p className="font-mono text-[10px] text-[var(--c-text-muted)]">
                      {(f.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (!deductTokenAction(`Remove file "${f.name}" from project`)) return;
                    removeFile(p.id, f.id);
                    toast.success("File removed");
                  }}
                  className="text-[var(--c-text-muted)] hover:text-[var(--c-fail)] shrink-0 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Sprint Override Side-Drawer Overlay */}
      {selectedSprint && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedSprint(null)}
          />

          {/* Drawer Container */}
          <div className="relative w-full max-w-lg bg-[var(--c-bg-card)] border-l border-[var(--c-border)] shadow-2xl flex flex-col h-full z-50 transform transition-transform duration-300">
            {/* Drawer Header */}
            <div className="p-6 border-b border-[var(--c-border)] flex items-center justify-between">
              <div>
                <span className="font-mono text-[10px] text-[var(--c-accent)] uppercase tracking-wider">
                  Configure Sprint
                </span>
                <h3 className="font-display text-[22px] text-[var(--c-text)] mt-1">
                  {editName || selectedSprint.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedSprint(null)}
                className="rounded-full p-2 text-[var(--c-text-muted)] hover:text-[var(--c-text)] hover:bg-[var(--c-bg-hover)] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <form
              id="sprint-edit-form"
              onSubmit={handleSaveSprint}
              className="flex-1 overflow-y-auto p-6 space-y-6 pb-6"
            >
              {/* Sprint Name */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--c-text-muted)]">
                  Sprint Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-[6px] border border-[var(--c-border)] bg-[var(--c-bg-card)] px-3 py-2 text-[13px] text-[var(--c-text)] focus:border-[var(--c-accent)] focus:outline-none"
                  placeholder="e.g. Sprint 1"
                />
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--c-text-muted)]">
                  Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full rounded-[6px] border border-[var(--c-border)] bg-[var(--c-bg-card)] px-3 py-2 text-[13px] text-[var(--c-text)] focus:border-[var(--c-accent)] focus:outline-none"
                >
                  <option value="Upcoming">Upcoming</option>
                  <option value="Active">Active</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              {/* Date Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--c-text-muted)]">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={editStart}
                    onChange={(e) => setEditStart(e.target.value)}
                    className="w-full rounded-[6px] border border-[var(--c-border)] bg-[var(--c-bg-card)] px-3 py-2 text-[13px] text-[var(--c-text)] focus:border-[var(--c-accent)] focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--c-text-muted)]">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={editEnd}
                    onChange={(e) => setEditEnd(e.target.value)}
                    className="w-full rounded-[6px] border border-[var(--c-border)] bg-[var(--c-bg-card)] px-3 py-2 text-[13px] text-[var(--c-text)] focus:border-[var(--c-accent)] focus:outline-none"
                  />
                </div>
              </div>

              {/* Duration */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--c-text-muted)]">
                  Duration
                </label>
                <div className="w-full rounded-[6px] border border-[var(--c-border)] bg-[var(--c-bg-hover)] px-3 py-2 text-[13px] font-mono text-[var(--c-text-muted)]">
                  {getEditingDuration()} days
                </div>
              </div>

              {/* Notes / Sprint Goal */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--c-text-muted)]">
                  Sprint Goal & Notes
                </label>
                <textarea
                  value={editGoal}
                  onChange={(e) => setEditGoal(e.target.value)}
                  className="w-full rounded-[6px] border border-[var(--c-border)] bg-[var(--c-bg-card)] px-3 py-2 text-[13px] text-[var(--c-text)] focus:border-[var(--c-accent)] focus:outline-none min-h-[80px]"
                  placeholder="Notes about what is to be done in this cycle..."
                />
              </div>

              {/* Sprint Leader (Sprint Lead) */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--c-text-muted)]">
                  Sprint Leader
                </label>
                <select
                  value={editLead || ""}
                  onChange={(e) => setEditLead(e.target.value || null)}
                  className="w-full rounded-[6px] border border-[var(--c-border)] bg-[var(--c-bg-card)] px-3 py-2 text-[13px] text-[var(--c-text)] focus:border-[var(--c-accent)] focus:outline-none"
                >
                  <option value="">Unassigned</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} ({p.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Developers */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--c-text-muted)]">
                  Developers
                </label>
                <div className="border border-[var(--c-border)] rounded-[6px] bg-[var(--c-bg-card)] overflow-hidden max-h-[140px] overflow-y-auto divide-y divide-[var(--c-border)]">
                  {profiles.map((p) => {
                    const isChecked = editDevelopers.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-[var(--c-bg-hover)] select-none"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setEditDevelopers(editDevelopers.filter((id) => id !== p.id));
                            } else {
                              setEditDevelopers([...editDevelopers, p.id]);
                            }
                          }}
                          className="rounded border-[var(--c-border)] text-[var(--c-accent)] focus:ring-[var(--c-accent)]"
                        />
                        <div className="text-[12px]">
                          <p className="font-medium text-[var(--c-text)]">{p.fullName}</p>
                          <p className="text-[10px] text-[var(--c-text-muted)] font-mono">
                            {p.role}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Testers */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--c-text-muted)]">
                  Testers
                </label>
                <div className="border border-[var(--c-border)] rounded-[6px] bg-[var(--c-bg-card)] overflow-hidden max-h-[140px] overflow-y-auto divide-y divide-[var(--c-border)]">
                  {profiles.map((p) => {
                    const isChecked = editTesters.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-[var(--c-bg-hover)] select-none"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setEditTesters(editTesters.filter((id) => id !== p.id));
                            } else {
                              setEditTesters([...editTesters, p.id]);
                            }
                          }}
                          className="rounded border-[var(--c-border)] text-[var(--c-accent)] focus:ring-[var(--c-accent)]"
                        />
                        <div className="text-[12px]">
                          <p className="font-medium text-[var(--c-text)]">{p.fullName}</p>
                          <p className="text-[10px] text-[var(--c-text-muted)] font-mono">
                            {p.role}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Sprint Members */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--c-text-muted)]">
                  Sprint Members
                </label>
                <div className="border border-[var(--c-border)] rounded-[6px] bg-[var(--c-bg-card)] overflow-hidden max-h-[140px] overflow-y-auto divide-y divide-[var(--c-border)]">
                  {profiles.map((p) => {
                    const isChecked = editMembers.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-[var(--c-bg-hover)] select-none"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setEditMembers(editMembers.filter((id) => id !== p.id));
                            } else {
                              setEditMembers([...editMembers, p.id]);
                            }
                          }}
                          className="rounded border-[var(--c-border)] text-[var(--c-accent)] focus:ring-[var(--c-accent)]"
                        />
                        <div className="text-[12px]">
                          <p className="font-medium text-[var(--c-text)]">{p.fullName}</p>
                          <p className="text-[10px] text-[var(--c-text-muted)] font-mono">
                            {p.role}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </form>

            {/* Drawer Footer */}
            <div className="p-6 border-t border-[var(--c-border)] bg-[var(--c-bg-card)] flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedSprint(null)}
                className="rounded-full border border-[var(--c-border)] bg-transparent px-[18px] py-[8px] text-[13px] font-medium text-[var(--c-text-muted)] hover:text-[var(--c-text)] hover:border-[var(--c-border-strong)] transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="sprint-edit-form"
                className="inline-flex items-center gap-2 rounded-full bg-[var(--c-accent)] px-[18px] py-[8px] text-[13px] font-medium text-white hover:opacity-90 transition-all shadow-[var(--shadow-sm)]"
              >
                <Save className="h-[14px] w-[14px]" /> Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}
      {/* New Sprint Modal */}
      <NewSprintModal
        open={showNewSprint}
        onClose={() => setShowNewSprint(false)}
        project={p}
        dbSprints={dbSprints}
        profiles={profiles}
        onSave={handleAddNewSprint}
      />
    </div>
  );
}

/* ─── Suite Folder (collapsible tree node) ──────────────── */

function SuiteFolder({
  suite,
  testCases,
  projectName,
}: {
  suite: TestSuite;
  testCases: TestCase[];
  projectName: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showAddCase, setShowAddCase] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState(suite.name);
  const { openPanel } = usePanel();

  function handleAddCase(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    if (!deductTokenAction(`Create test case "${newTitle.trim()}"`)) return;
    createTestCase(suite.id, { title: newTitle.trim() });
    setNewTitle("");
    setShowAddCase(false);
    toast.success("Test case created");
  }

  function handleRename() {
    if (editName.trim() && editName.trim() !== suite.name) {
      if (!deductTokenAction(`Rename suite to "${editName.trim()}"`)) {
        setEditingName(false);
        return;
      }
      renameSuite(suite.id, editName.trim());
      toast.success("Suite renamed");
    }
    setEditingName(false);
  }

  return (
    <div className="overflow-hidden rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg-card)]">
      <div className="flex items-center gap-2 px-3 py-2.5 transition-colors hover:bg-[var(--c-bg-hover)]">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[var(--c-text-muted)] hover:text-[var(--c-text)] transition-colors"
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <Layers className="h-4 w-4 text-[var(--c-accent)]" />
        {editingName ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleRename();
            }}
            className="flex items-center gap-1 flex-1"
          >
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
          <button
            onClick={() => setShowAddCase(true)}
            className="p-1.5 text-[var(--c-text-muted)] hover:text-[var(--c-text)] transition-colors"
            title="Add test case"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => {
              setEditingName(true);
              setEditName(suite.name);
            }}
            className="p-1.5 text-[var(--c-text-muted)] hover:text-[var(--c-text)] transition-colors"
            title="Rename"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => {
              if (confirm(`Delete suite "${suite.name}"?`)) {
                if (!deductTokenAction(`Delete suite "${suite.name}"`)) return;
                deleteSuite(suite.id);
                toast.success("Suite deleted");
              }
            }}
            className="p-1.5 text-[var(--c-text-muted)] hover:text-[var(--c-fail)] transition-colors"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[var(--c-border)] bg-[var(--c-bg)]">
          {showAddCase && (
            <form
              onSubmit={handleAddCase}
              className="flex items-center gap-2 border-b border-[var(--c-border)] bg-[var(--c-bg-hover)] px-4 py-2"
            >
              <input
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Test case title…"
                className="flex-1 bg-transparent text-[13px] outline-none"
              />
              <button
                type="submit"
                className="text-[12px] font-medium text-[var(--c-accent)] hover:text-[var(--c-accent-dark)]"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setShowAddCase(false)}
                className="text-[12px] text-[var(--c-text-muted)] hover:text-[var(--c-text)]"
              >
                Cancel
              </button>
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
                onClick={() =>
                  openPanel(<TestCaseDetail testCase={tc} />, [
                    { label: "Projects" },
                    { label: projectName },
                    { label: suite.name },
                    { label: tc.title },
                  ])
                }
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[13px] border-b border-[var(--c-border)] last:border-0 hover:bg-[var(--c-bg-hover)] transition-colors"
              >
                <FileText className="h-3.5 w-3.5 text-[var(--c-text-muted)]" />
                <span className="flex-1 truncate">{tc.title}</span>
                <span
                  className={`rounded-sm px-2 py-0.5 font-mono text-[10px] status-${tc.status}`}
                >
                  {tc.status}
                </span>
                <span
                  className={`rounded-sm px-2 py-0.5 font-mono text-[10px] badge-${tc.priority}`}
                >
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
    if (!deductTokenAction(`Update test case "${tc.title}"`)) return;
    updateTestCase(tc.id, {
      title: form.title,
      steps: form.steps,
      expected: form.expected,
      priority: form.priority,
      status: form.status,
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
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
        <span
          className={`rounded-sm px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider status-${tc.status}`}
        >
          {tc.status}
        </span>
        <span
          className={`rounded-sm px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider badge-${tc.priority}`}
        >
          {tc.priority}
        </span>
        {tc.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-sm border border-border px-2.5 py-1 font-mono text-[10px]"
          >
            {tag}
          </span>
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
            <button
              onClick={save}
              className="rounded-sm bg-foreground px-4 py-2 text-sm text-background hover:bg-accent"
            >
              Save
            </button>
            <button
              onClick={() => setEditing(false)}
              className="rounded-sm border border-border px-4 py-2 text-sm"
            >
              Cancel
            </button>
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
            <p className="text-sm whitespace-pre-wrap">
              {tc.expected || "No expected result defined"}
            </p>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 text-xs hover:border-foreground"
            >
              <Edit2 className="h-3 w-3" /> Edit
            </button>
            <button
              onClick={() => {
                if (confirm("Delete this test case?")) {
                  if (!deductTokenAction(`Delete test case "${tc.title}"`)) return;
                  deleteTestCase(tc.id);
                  toast.success("Test case deleted");
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 text-xs text-destructive hover:border-destructive"
            >
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

export function PageHeader({
  section,
  title,
  subtitle,
  action,
}: {
  section: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
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

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(26,23,20,0.4)] p-4 backdrop-blur-[4px] animate-[fade-in-up_var(--t-normal)_var(--ease-out)_both]">
      <div className="w-full max-w-md rounded-[16px] border border-[var(--c-border)] bg-[var(--c-bg-card)] p-[28px] shadow-[var(--shadow-lg)]">
        <div className="mb-[24px] flex items-center justify-between">
          <p className="font-display text-[26px]">{title}</p>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-[var(--c-text-muted)] transition-colors hover:bg-[var(--c-bg-hover)] hover:text-[var(--c-accent)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function DetailedNewProjectModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess?: (p: Project) => void;
}) {
  const assertPermission = useAssertPermission();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [status, setStatus] = useState("planning"); // default to planning / Not Started
  const [priority, setPriority] = useState("medium"); // default to medium
  const [start, setStart] = useState("");
  const [target, setTarget] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const todayStr = `${yyyy}-${mm}-${dd}`;

  const showStartWarning = start !== "" && start < todayStr;
  const showTargetWarning = target !== "" && start !== "" && target <= start;

  const isFormValid =
    name.trim() !== "" &&
    status !== "" &&
    priority !== "" &&
    start !== "" &&
    target !== "" &&
    !showStartWarning &&
    !showTargetWarning;

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
    if (!isFormValid) return;
    if (!assertPermission("project:create")) return;

    if (!deductTokenAction(`Create project "${name.trim()}"`)) return;
    const p = createProject(name.trim(), {
      description: desc.trim() || "No project description provided.",
      status: status as any,
      priority: priority as any,
      startDate: start,
      targetDate: target,
      tags: tags.length > 0 ? tags : [],
    });
    setName("");
    setDesc("");
    setStatus("planning");
    setPriority("medium");
    setStart("");
    setTarget("");
    setTags([]);
    setTagInput("");
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
          <label className="block font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">
            Description
          </label>
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
            <label className="block font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">
              Status <span className="text-[var(--c-fail)]">*</span>
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg-input)] p-[10px] text-[13px] outline-none focus:border-[var(--c-accent)]"
            >
              <option value="planning">Not Started</option>
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">
              Priority <span className="text-[var(--c-fail)]">*</span>
            </label>
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
            <label className="block font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">
              Start Date <span className="text-[var(--c-fail)]">*</span>
            </label>
            <input
              type="date"
              required
              value={start}
              min={todayStr}
              onChange={(e) => setStart(e.target.value)}
              className="w-full rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg-input)] p-[10px] text-[13px] outline-none focus:border-[var(--c-accent)]"
            />
            {showStartWarning && (
              <p className="text-[11.5px] text-[var(--c-fail)] font-semibold mt-1">
                Project start date cannot be set prior to today.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="block font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">
              Target Date <span className="text-[var(--c-fail)]">*</span>
            </label>
            <input
              type="date"
              required
              value={target}
              min={start || todayStr}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg-input)] p-[10px] text-[13px] outline-none focus:border-[var(--c-accent)]"
            />
            {showTargetWarning && (
              <p className="text-[11.5px] text-[var(--c-fail)] font-semibold mt-1">
                Target date must be after the start date.
              </p>
            )}
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="block font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">
            Tags
          </label>
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
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-[4px] border border-[var(--c-border)] bg-[var(--c-bg-card)] px-1.5 py-0.5 text-[11px]"
                >
                  {tag}
                  <button
                    onClick={(e) => handleRemoveTag(tag, e)}
                    className="text-[var(--c-text-muted)] hover:text-[var(--c-fail)]"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="mt-6 flex justify-end gap-2 pt-2 border-t border-[var(--c-border)]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[8px] border-[1.5px] border-[var(--c-border)] bg-transparent px-[16px] py-[8px] text-[13px] font-medium transition-all hover:bg-[var(--c-bg-hover)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isFormValid}
            className="rounded-[8px] bg-[var(--c-text)] px-[16px] py-[8px] text-[13px] font-medium text-[var(--c-bg)] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <TokenCostLabel baseText="Create Project" />
          </button>
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
  const [start, setStart] = useState(p.startDate || "");
  const [target, setTarget] = useState(p.targetDate || "");
  const [tagsInput, setTagsInput] = useState(p.tags?.join(", ") || "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const newTags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const oldTags = p.tags || [];
    const tagsChanged =
      newTags.length !== oldTags.length || newTags.some((t, i) => t !== oldTags[i]);

    const isIdentical =
      p.name === name.trim() &&
      (p.description || "") === desc.trim() &&
      p.status === status &&
      p.priority === priority &&
      (p.startDate || "") === start &&
      (p.targetDate || "") === target &&
      !tagsChanged;

    if (isIdentical) {
      toast.info("No changes detected. Workspace saved.");
      onClose();
      return;
    }

    if (!deductTokenAction(`Edit project "${name.trim()}"`)) {
      toast.error("Insufficient tokens to edit project.");
      return;
    }

    updateProject(p.id, {
      name: name.trim(),
      description: desc.trim(),
      status: status as any,
      priority: priority as any,
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
          <label className="block font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">
            Project Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg-input)] p-[10px] text-[13px] outline-none focus:border-[var(--c-accent)]"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">
            Description
          </label>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={2}
            className="w-full rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg-input)] p-[10px] text-[13px] outline-none resize-none focus:border-[var(--c-accent)]"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">
              Status
            </label>
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
            <label className="block font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">
              Priority
            </label>
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
            <label className="block font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">
              Start Date
            </label>
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-full rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg-input)] p-[10px] text-[13px] outline-none focus:border-[var(--c-accent)]"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">
              Target Date
            </label>
            <input
              type="date"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg-input)] p-[10px] text-[13px] outline-none focus:border-[var(--c-accent)]"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="block font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">
            Tags (comma-separated)
          </label>
          <input
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            className="w-full rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg-input)] p-[10px] text-[13px] outline-none focus:border-[var(--c-accent)]"
            placeholder="web, signup, auth"
          />
        </div>
        <div className="mt-6 flex justify-end gap-2 pt-2 border-t border-[var(--c-border)]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[8px] border-[1.5px] border-[var(--c-border)] bg-transparent px-[16px] py-[8px] text-[13px] font-medium transition-all hover:bg-[var(--c-bg-hover)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-[8px] bg-[var(--c-text)] px-[16px] py-[8px] text-[13px] font-medium text-[var(--c-bg)] hover:opacity-90"
          >
            Save changes
          </button>
        </div>
      </form>
    </Modal>
  );
}

interface NewSprintModalProps {
  open: boolean;
  onClose: () => void;
  project: Project;
  dbSprints: Sprint[];
  profiles: Profile[];
  onSave: (newSprint: Sprint) => void;
}

export function NewSprintModal({
  open,
  onClose,
  project,
  dbSprints,
  profiles,
  onSave,
}: NewSprintModalProps) {
  const nextNum = dbSprints.length + 1;
  const [name, setName] = useState(`Sprint ${nextNum}`);
  const [status, setStatus] = useState<"Upcoming" | "Active" | "Completed">("Upcoming");

  let nextStart = new Date();
  if (project.startDate) {
    const d = new Date(project.startDate);
    if (!isNaN(d.getTime())) {
      nextStart = d;
    }
  }
  if (dbSprints.length > 0) {
    const lastSprint = dbSprints[dbSprints.length - 1];
    const lastEnd = new Date(lastSprint.endDate);
    if (!isNaN(lastEnd.getTime())) {
      nextStart = new Date(lastEnd);
      nextStart.setDate(nextStart.getDate() + 1);
    }
  }
  const defaultStart = nextStart.toISOString().split("T")[0];
  const nextEnd = new Date(nextStart);
  nextEnd.setDate(nextEnd.getDate() + 13);
  const defaultEnd = nextEnd.toISOString().split("T")[0];

  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState(defaultEnd);
  const [goal, setGoal] = useState("");
  const [lead, setLead] = useState<string | null>(null);
  const [members, setMembers] = useState<string[]>([]);
  const [developers, setDevelopers] = useState<string[]>([]);
  const [testers, setTesters] = useState<string[]>([]);

  // Update default values when modal opens or dbSprints changes
  useEffect(() => {
    if (open) {
      setName(`Sprint ${dbSprints.length + 1}`);
      setStatus("Upcoming");

      let nStart = new Date();
      if (project.startDate) {
        const d = new Date(project.startDate);
        if (!isNaN(d.getTime())) {
          nStart = d;
        }
      }
      if (dbSprints.length > 0) {
        const lastSprint = dbSprints[dbSprints.length - 1];
        const lastEnd = new Date(lastSprint.endDate);
        if (!isNaN(lastEnd.getTime())) {
          nStart = new Date(lastEnd);
          nStart.setDate(nStart.getDate() + 1);
        }
      }
      const dfStart = nStart.toISOString().split("T")[0];
      const nEnd = new Date(nStart);
      nEnd.setDate(nEnd.getDate() + 13);
      const dfEnd = nEnd.toISOString().split("T")[0];

      setStart(dfStart);
      setEnd(dfEnd);
      setGoal("");
      setLead(null);
      setMembers([]);
      setDevelopers([]);
      setTesters([]);
    }
  }, [open, dbSprints, project.startDate]);

  const getDuration = () => {
    if (!start || !end) return 0;
    const startD = new Date(start);
    const endD = new Date(end);
    if (isNaN(startD.getTime()) || isNaN(endD.getTime())) return 0;
    return Math.max(1, Math.ceil((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Sprint name is required.");
      return;
    }
    if (!start || !end) {
      toast.error("Start and end dates are required.");
      return;
    }
    if (new Date(end) < new Date(start)) {
      toast.error("End date cannot be before start date.");
      return;
    }

    const newSprint: Sprint = {
      id: crypto.randomUUID(),
      projectId: project.id,
      name: name.trim(),
      status,
      startDate: start,
      endDate: end,
      goalDescription: goal.trim() || null,
      sprintLeadId: lead,
      sprintMembers: members,
      sprintDevelopers: developers,
      sprintTesters: testers,
    };

    onSave(newSprint);
  };

  if (!open) return null;

  return (
    <Modal onClose={onClose} title="Add New Sprint">
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
        {/* Name */}
        <div className="space-y-1.5">
          <label className="block font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">
            Sprint Name <span className="text-[var(--c-fail)]">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg-input)] p-[10px] text-[13px] outline-none focus:border-[var(--c-accent)]"
            placeholder="e.g. Sprint 1"
          />
        </div>

        {/* Status */}
        <div className="space-y-1.5">
          <label className="block font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="w-full rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg-input)] p-[10px] text-[13px] outline-none focus:border-[var(--c-accent)]"
          >
            <option value="Upcoming">Upcoming</option>
            <option value="Active">Active</option>
            <option value="Completed">Completed</option>
          </select>
        </div>

        {/* Date Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">
              Start Date <span className="text-[var(--c-fail)]">*</span>
            </label>
            <input
              type="date"
              required
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-full rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg-input)] p-[10px] text-[13px] outline-none focus:border-[var(--c-accent)]"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">
              End Date <span className="text-[var(--c-fail)]">*</span>
            </label>
            <input
              type="date"
              required
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="w-full rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg-input)] p-[10px] text-[13px] outline-none focus:border-[var(--c-accent)]"
            />
          </div>
        </div>

        {/* Duration */}
        <div className="space-y-1.5">
          <label className="block font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">
            Duration
          </label>
          <div className="w-full rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg-hover)] p-[10px] text-[13px] font-mono text-[var(--c-text-muted)]">
            {getDuration()} days
          </div>
        </div>

        {/* Goal Description */}
        <div className="space-y-1.5">
          <label className="block font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">
            Sprint Goal & Notes
          </label>
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="w-full rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg-input)] p-[10px] text-[13px] outline-none resize-none focus:border-[var(--c-accent)] min-h-[70px]"
            placeholder="Notes about what is to be done in this cycle..."
          />
        </div>

        {/* Sprint Leader */}
        <div className="space-y-1.5">
          <label className="block font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">
            Sprint Leader
          </label>
          <select
            value={lead || ""}
            onChange={(e) => setLead(e.target.value || null)}
            className="w-full rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg-input)] p-[10px] text-[13px] outline-none focus:border-[var(--c-accent)]"
          >
            <option value="">Unassigned</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.fullName} ({p.role})
              </option>
            ))}
          </select>
        </div>

        {/* Developers */}
        <div className="space-y-1.5">
          <label className="block font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">
            Developers
          </label>
          <div className="border border-[var(--c-border)] rounded-[8px] bg-[var(--c-bg-input)] overflow-hidden max-h-[120px] overflow-y-auto divide-y divide-[var(--c-border)]">
            {profiles.map((p) => {
              const isChecked = developers.includes(p.id);
              return (
                <label
                  key={p.id}
                  className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-[var(--c-bg-hover)] select-none"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {
                      if (isChecked) {
                        setDevelopers(developers.filter((id) => id !== p.id));
                      } else {
                        setDevelopers([...developers, p.id]);
                      }
                    }}
                    className="rounded border-[var(--c-border)] text-[var(--c-accent)] focus:ring-[var(--c-accent)]"
                  />
                  <div className="text-[12px]">
                    <p className="font-medium text-[var(--c-text)]">{p.fullName}</p>
                    <p className="text-[10px] text-[var(--c-text-muted)] font-mono">{p.role}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Testers */}
        <div className="space-y-1.5">
          <label className="block font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">
            Testers
          </label>
          <div className="border border-[var(--c-border)] rounded-[8px] bg-[var(--c-bg-input)] overflow-hidden max-h-[120px] overflow-y-auto divide-y divide-[var(--c-border)]">
            {profiles.map((p) => {
              const isChecked = testers.includes(p.id);
              return (
                <label
                  key={p.id}
                  className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-[var(--c-bg-hover)] select-none"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {
                      if (isChecked) {
                        setTesters(testers.filter((id) => id !== p.id));
                      } else {
                        setTesters([...testers, p.id]);
                      }
                    }}
                    className="rounded border-[var(--c-border)] text-[var(--c-accent)] focus:ring-[var(--c-accent)]"
                  />
                  <div className="text-[12px]">
                    <p className="font-medium text-[var(--c-text)]">{p.fullName}</p>
                    <p className="text-[10px] text-[var(--c-text-muted)] font-mono">{p.role}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Sprint Members */}
        <div className="space-y-1.5">
          <label className="block font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">
            Sprint Members
          </label>
          <div className="border border-[var(--c-border)] rounded-[8px] bg-[var(--c-bg-input)] overflow-hidden max-h-[120px] overflow-y-auto divide-y divide-[var(--c-border)]">
            {profiles.map((p) => {
              const isChecked = members.includes(p.id);
              return (
                <label
                  key={p.id}
                  className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-[var(--c-bg-hover)] select-none"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {
                      if (isChecked) {
                        setMembers(members.filter((id) => id !== p.id));
                      } else {
                        setMembers([...members, p.id]);
                      }
                    }}
                    className="rounded border-[var(--c-border)] text-[var(--c-accent)] focus:ring-[var(--c-accent)]"
                  />
                  <div className="text-[12px]">
                    <p className="font-medium text-[var(--c-text)]">{p.fullName}</p>
                    <p className="text-[10px] text-[var(--c-text-muted)] font-mono">{p.role}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-2 pt-2 border-t border-[var(--c-border)]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[8px] border-[1.5px] border-[var(--c-border)] bg-transparent px-[16px] py-[8px] text-[13px] font-medium transition-all hover:bg-[var(--c-bg-hover)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-[8px] bg-[var(--c-text)] px-[16px] py-[8px] text-[13px] font-medium text-[var(--c-bg)] hover:opacity-90 transition-all"
          >
            Create Sprint
          </button>
        </div>
      </form>
    </Modal>
  );
}
