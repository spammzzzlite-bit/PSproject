import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Layers, Plus, FolderClosed, ChevronRight, ChevronDown,
  FileText, Trash2, Edit2, Play, Check, X,
} from "lucide-react";
import {
  useProjects, useSuites, useTestCases,
  createSuite, deleteSuite, renameSuite,
  createTestCase, deleteTestCase, updateTestCase, createMockRun,
  type TestSuite, type TestCase,
} from "@/lib/store";
import { usePanel } from "@/components/PanelContext";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader, Modal } from "./_app.projects";
import { toast } from "./_app";

export const Route = createFileRoute("/_app/suites")({
  head: () => ({ meta: [{ title: "Test Suites — Field Notes" }] }),
  component: SuitesPage,
});

function SuitesPage() {
  const [projects] = useProjects();
  const [suites] = useSuites();
  const [testCases] = useTestCases();
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newProjectId, setNewProjectId] = useState("");

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !newProjectId) return;
    const s = createSuite(newProjectId, newName.trim());
    setNewName(""); setShowNew(false);
    toast.success(`Suite "${s.name}" created`);
  }

  // Group suites by project
  const projectGroups = projects.map((p) => ({
    project: p,
    suites: suites.filter((s) => s.projectId === p.id),
  })).filter((g) => g.suites.length > 0 || projects.length > 0);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        section="§ Suites"
        title="Test suites"
        subtitle="Folders for your test cases, grouped by project."
        action={
          <button onClick={() => { setShowNew(true); setNewProjectId(projects[0]?.id || ""); }} className="rounded-full bg-[var(--c-text)] px-[16px] py-[8px] text-[13px] font-medium text-white transition-all duration-[var(--t-normal)] hover:-translate-y-[1px] hover:bg-[#2C2825] hover:shadow-[var(--shadow-md)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none" disabled={projects.length === 0}>
            + New suite
          </button>
        }
      />

      {suites.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No test suites yet"
          body="Create a project first, then add suites to organize your test cases into logical groups."
          cta={projects.length > 0 ? { label: "Create a suite", onClick: () => { setShowNew(true); setNewProjectId(projects[0]?.id || ""); } } : { label: "Create a project", to: "/projects" }}
        />
      ) : (
        <div className="space-y-6">
          {projectGroups.map(({ project, suites: pSuites }) => (
            <div key={project.id} className="stagger-item">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-[var(--c-accent-soft)] text-[var(--c-accent)]">
                  <FolderClosed className="h-4 w-4" />
                </div>
                <h3 className="font-display text-[22px] text-[var(--c-text)]">{project.name}</h3>
                <span className="font-mono text-[11px] text-[var(--c-text-muted)] mt-1">
                  {pSuites.length} suite{pSuites.length !== 1 ? "s" : ""}
                </span>
              </div>
              {pSuites.length === 0 ? (
                <div className="rounded-[12px] border border-dashed border-[var(--c-border-strong)] bg-[var(--c-bg-input)] py-8 text-center">
                  <p className="text-[13px] text-[var(--c-text-muted)]">No suites in this project.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {pSuites.map((suite) => (
                    <SuiteRow
                      key={suite.id}
                      suite={suite}
                      projectName={project.name}
                      testCases={testCases.filter((tc) => tc.suiteId === suite.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showNew && (
        <Modal onClose={() => setShowNew(false)} title="New test suite">
          <form onSubmit={handleCreate}>
            <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--c-text-muted)] font-medium">Project</label>
            <select
              value={newProjectId}
              onChange={(e) => setNewProjectId(e.target.value)}
              className="mb-4 w-full rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg-input)] p-[10px] text-[13px] outline-none transition-all duration-[var(--t-fast)] focus:border-[var(--c-accent)] focus:shadow-[0_0_0_3px_var(--c-accent-soft)]"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--c-text-muted)] font-medium">Suite name</label>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Login Flow"
              className="w-full rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg-input)] p-[10px] text-[13px] outline-none transition-all duration-[var(--t-fast)] focus:border-[var(--c-accent)] focus:shadow-[0_0_0_3px_var(--c-accent-soft)]"
            />
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setShowNew(false)} className="rounded-[8px] border-[1.5px] border-[var(--c-border)] bg-transparent px-[16px] py-[8px] text-[13px] font-medium transition-all hover:bg-[var(--c-bg-hover)]">Cancel</button>
              <button type="submit" className="rounded-[8px] bg-[var(--c-text)] px-[16px] py-[8px] text-[13px] font-medium text-white transition-all hover:bg-[#2C2825]">Create suite</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function SuiteRow({ suite, projectName, testCases }: { suite: TestSuite; projectName: string; testCases: TestCase[] }) {
  const [expanded, setExpanded] = useState(false);
  const [showAddCase, setShowAddCase] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const { openPanel } = usePanel();

  const passedCount = testCases.filter((tc) => tc.status === "passed").length;
  const failedCount = testCases.filter((tc) => tc.status === "failed").length;

  function handleAddCase(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    createTestCase(suite.id, { title: newTitle.trim() });
    setNewTitle(""); setShowAddCase(false);
    toast.success("Test case created");
  }

  return (
    <div className="overflow-hidden rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg-card)] transition-all duration-[var(--t-normal)] hover:border-[var(--c-border-strong)]">
      <div className="flex items-center gap-3 px-5 py-4">
        <button onClick={() => setExpanded(!expanded)} className="text-[var(--c-text-muted)] hover:text-[var(--c-text)]">
          {expanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        </button>
        <Layers className="h-5 w-5 text-[var(--c-accent)]" />
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-medium text-[var(--c-text)] truncate">{suite.name}</p>
          <p className="mt-1 font-mono text-[11px] text-[var(--c-text-muted)]">
            {testCases.length} case{testCases.length !== 1 ? "s" : ""}
            {passedCount > 0 && <> · <span className="text-[var(--c-sage)]">{passedCount} passed</span></>}
            {failedCount > 0 && <> · <span className="text-[var(--c-rust)]">{failedCount} failed</span></>}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowAddCase(true)} className="p-2 text-[var(--c-text-muted)] hover:text-[var(--c-text)] hover:bg-[var(--c-bg-hover)] rounded-[6px] transition-colors" title="Add test case">
            <Plus className="h-4 w-4" />
          </button>
          <button onClick={() => {
            const run = createMockRun(suite.projectId, suite.id);
            toast.success(`Run ${run.id} completed`);
          }} className="p-2 text-[var(--c-text-muted)] hover:text-[var(--c-accent)] hover:bg-[var(--c-accent-soft)] rounded-[6px] transition-colors" title="Run suite">
            <Play className="h-4 w-4" />
          </button>
          <button onClick={() => { if (confirm(`Delete "${suite.name}"?`)) { deleteSuite(suite.id); toast.success("Suite deleted"); } }} className="p-2 text-[var(--c-text-muted)] hover:text-[var(--c-fail)] hover:bg-[rgba(196,85,26,0.1)] rounded-[6px] transition-colors" title="Delete">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[var(--c-border)] bg-[var(--c-bg)]">
          {showAddCase && (
            <form onSubmit={handleAddCase} className="flex items-center gap-3 border-b border-[var(--c-border)] bg-[var(--c-bg-hover)] px-5 py-3">
              <input
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Test case title…"
                className="flex-1 bg-transparent text-[13px] outline-none text-[var(--c-text)] placeholder-[var(--c-text-muted)]"
              />
              <button type="submit" className="text-[12px] font-medium text-[var(--c-accent)] hover:text-[var(--c-accent-dark)]">Add</button>
              <button type="button" onClick={() => setShowAddCase(false)} className="text-[12px] text-[var(--c-text-muted)] hover:text-[var(--c-text)]">Cancel</button>
            </form>
          )}
          {testCases.length === 0 && !showAddCase ? (
            <div className="px-5 py-10 text-center text-[13px] text-[var(--c-text-muted)]">
              No test cases. Click + to add one.
            </div>
          ) : (
            testCases.map((tc) => (
              <div
                key={tc.id}
                onClick={() => openPanel(
                  <TestCasePanel testCase={tc} />,
                  [{ label: "Suites" }, { label: projectName }, { label: suite.name }, { label: tc.title }]
                )}
                className="group flex w-full items-center gap-4 px-5 py-3.5 text-left text-[13px] border-b border-[var(--c-border)] last:border-0 hover:bg-[var(--c-bg-hover)] cursor-pointer transition-colors"
              >
                <FileText className="h-4 w-4 text-[var(--c-text-muted)] shrink-0" />
                <span className="flex-1 truncate font-medium text-[var(--c-text)]">{tc.title}</span>
                <span className={`rounded-sm px-[8px] py-[3px] font-mono text-[9px] status-${tc.status}`}>{tc.status}</span>
                <span className={`rounded-sm px-[8px] py-[3px] font-mono text-[9px] badge-${tc.priority}`}>{tc.priority}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete test case "${tc.title}"?`)) {
                      deleteTestCase(tc.id);
                      toast.success("Test case deleted");
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-[var(--c-text-muted)] hover:text-[var(--c-fail)] hover:bg-[rgba(196,85,26,0.1)] rounded-[4px] transition-all shrink-0"
                  title="Delete test case"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function TestCasePanel({ testCase }: { testCase: TestCase }) {
  const [cases] = useTestCases();
  const tc = cases.find((c) => c.id === testCase.id) ?? testCase;
  const { closePanel } = usePanel();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    title: tc.title,
    steps: tc.steps,
    expected: tc.expected,
    priority: tc.priority,
    status: tc.status,
    tags: tc.tags.join(", "),
  });

  function handleSave() {
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

  function handleDelete() {
    if (confirm(`Delete test case "${tc.title}"?`)) {
      deleteTestCase(tc.id);
      closePanel();
      toast.success("Test case deleted");
    }
  }

  return (
    <div className="space-y-6 text-[14px]">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--c-accent)] font-medium">§ Test Case</p>
        {editing ? (
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="mt-2 w-full rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg-input)] p-[10px] text-[15px] font-medium text-[var(--c-text)] outline-none transition-all duration-[var(--t-fast)] focus:border-[var(--c-accent)] focus:shadow-[0_0_0_3px_var(--c-accent-soft)]"
            placeholder="Test case title"
          />
        ) : (
          <h2 className="mt-2 font-display text-[28px] text-[var(--c-text)] leading-tight">{tc.title}</h2>
        )}
      </div>

      {!editing && (
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-[4px] px-[10px] py-[4px] font-mono text-[10px] uppercase tracking-wider status-${tc.status}`}>{tc.status}</span>
          <span className={`rounded-[4px] px-[10px] py-[4px] font-mono text-[10px] uppercase tracking-wider badge-${tc.priority}`}>{tc.priority}</span>
          {tc.tags.map((tag) => <span key={tag} className="rounded-[4px] border border-[var(--c-border)] bg-[var(--c-bg-card)] px-[10px] py-[4px] font-mono text-[10px] text-[var(--c-text-muted)]">{tag}</span>)}
        </div>
      )}

      {editing ? (
        <div className="space-y-4">
          <div>
            <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--c-text-muted)] font-medium">Steps</label>
            <textarea
              value={form.steps}
              onChange={(e) => setForm({ ...form, steps: e.target.value })}
              rows={5}
              className="w-full resize-none rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg-input)] p-[10px] text-[13.5px] text-[var(--c-text)] outline-none transition-all duration-[var(--t-fast)] focus:border-[var(--c-accent)] focus:shadow-[0_0_0_3px_var(--c-accent-soft)]"
              placeholder="1. Step one..."
            />
          </div>
          
          <div>
            <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--c-text-muted)] font-medium">Expected result</label>
            <textarea
              value={form.expected}
              onChange={(e) => setForm({ ...form, expected: e.target.value })}
              rows={3}
              className="w-full resize-none rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg-input)] p-[10px] text-[13.5px] text-[var(--c-text)] outline-none transition-all duration-[var(--t-fast)] focus:border-[var(--c-accent)] focus:shadow-[0_0_0_3px_var(--c-accent-soft)]"
              placeholder="Expected result description"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--c-text-muted)] font-medium">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as any })}
                className="w-full rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg-input)] p-[10px] text-[13.5px] text-[var(--c-text)] outline-none transition-all duration-[var(--t-fast)] focus:border-[var(--c-accent)]"
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            
            <div>
              <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--c-text-muted)] font-medium">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                className="w-full rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg-input)] p-[10px] text-[13.5px] text-[var(--c-text)] outline-none transition-all duration-[var(--t-fast)] focus:border-[var(--c-accent)]"
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
            <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--c-text-muted)] font-medium">Tags (comma-separated)</label>
            <input
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              className="w-full rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg-input)] p-[10px] text-[13.5px] text-[var(--c-text)] outline-none transition-all duration-[var(--t-fast)] focus:border-[var(--c-accent)] focus:shadow-[0_0_0_3px_var(--c-accent-soft)]"
              placeholder="e.g. login, regression, api"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={handleSave} className="rounded-[8px] bg-[var(--c-text)] px-[16px] py-[8px] text-[13px] font-medium text-white transition-all hover:bg-[#2C2825]">
              Save Changes
            </button>
            <button onClick={() => setEditing(false)} className="rounded-[8px] border-[1.5px] border-[var(--c-border)] bg-transparent px-[16px] py-[8px] text-[13px] font-medium transition-all hover:bg-[var(--c-bg-hover)]">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--c-text-muted)] mb-2 font-medium">Steps</p>
            <p className="text-[14px] text-[var(--c-text)] whitespace-pre-wrap leading-relaxed">{tc.steps || "No steps defined"}</p>
          </div>
          
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--c-text-muted)] mb-2 font-medium">Expected result</p>
            <p className="text-[14px] text-[var(--c-text)] whitespace-pre-wrap leading-relaxed">{tc.expected || "No expected result defined"}</p>
          </div>

          <div className="flex gap-2 border-t border-[var(--c-border)] pt-5">
            <button
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1.5 rounded-[8px] border-[1.5px] border-[var(--c-border)] bg-transparent px-[14px] py-[8px] text-[13px] font-medium transition-all hover:bg-[var(--c-bg-hover)]"
            >
              <Edit2 className="h-4 w-4" /> Edit
            </button>
            <button
              onClick={handleDelete}
              className="inline-flex items-center gap-1.5 rounded-[8px] border-[1.5px] border-[var(--c-border)] bg-transparent px-[14px] py-[8px] text-[13px] font-medium text-[var(--c-fail)] transition-all hover:border-[var(--c-fail)] hover:bg-[rgba(196,85,26,0.05)]"
            >
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          </div>
        </div>
      )}

      <div className="border-t border-[var(--c-border)] pt-5">
        <p className="font-mono text-[11px] text-[var(--c-text-muted)]">
          Created {new Date(tc.createdAt).toLocaleDateString()} · ID: {tc.id.slice(0, 8)}
        </p>
      </div>
    </div>
  );
}
