import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import type { Session, User } from "@supabase/supabase-js";

// ─── User-scoped localStorage stores ──────────────────────
// Every store key is namespaced by the authenticated user's ID
// so that User A never sees User B's data.

type Listener = () => void;

let currentUserId: string | null = null;

interface Store<T> {
  get: () => T;
  set: (next: T | ((prev: T) => T)) => void;
  subscribe: (l: Listener) => () => boolean;
  useStore: () => [T, (n: T | ((p: T) => T)) => void];
  _reinit: () => void;
  _baseKey: string;
  _initial: T;
}

function createStore<T>(baseKey: string, initial: T): Store<T> {
  let state: T = initial;
  const listeners = new Set<Listener>();

  function load(): T {
    if (typeof window === "undefined" || !currentUserId) return initial;
    try {
      const raw = localStorage.getItem(`${baseKey}.${currentUserId}`);
      if (raw) return JSON.parse(raw) as T;
    } catch {}
    return initial;
  }

  // Initial load
  state = load();

  const get = () => {
    if (!currentUserId) return initial;
    return state;
  };
  
  const set = (next: T | ((prev: T) => T)) => {
    if (!currentUserId) return; // Prevent writing without an active user
    state = typeof next === "function" ? (next as (p: T) => T)(state) : next;
    if (typeof window !== "undefined") {
      try { localStorage.setItem(`${baseKey}.${currentUserId}`, JSON.stringify(state)); } catch {}
    }
    listeners.forEach((l) => l());
  };
  const subscribe = (l: Listener) => { listeners.add(l); return () => listeners.delete(l); };

  function useStore(): [T, (n: T | ((p: T) => T)) => void] {
    const [, force] = useState(0);
    useEffect(() => subscribe(() => force((n) => n + 1)) as unknown as () => void, []);
    return [get(), set];
  }

  function _reinit() {
    state = load();
    listeners.forEach((l) => l());
  }

  return { get, set, subscribe, useStore, _reinit, _baseKey: baseKey, _initial: initial };
}// Auth State Hook (Supabase)
export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const mock = typeof window !== "undefined" ? localStorage.getItem("mock_auth") : null;
    if (mock) {
      try {
        const mockSession = JSON.parse(mock);
        setSession(mockSession);
        setUser(mockSession.user ?? null);
        setLoading(false);
        return;
      } catch {}
    }

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (typeof window !== "undefined" && localStorage.getItem("mock_auth")) return;
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      if (typeof window !== "undefined" && localStorage.getItem("mock_auth")) return;
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { session, user, loading, email: user?.email };
}

export async function signOut() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("mock_auth");
  }
  await supabase.auth.signOut();
  clearStores();
}

export async function deleteUserAccount() {
  if (currentUserId && typeof window !== "undefined") {
    // Remove all store data for this user
    for (const store of ALL_STORES) {
      localStorage.removeItem(`${store._baseKey}.${currentUserId}`);
    }
    // Remove onboarding flags
    localStorage.removeItem(`fieldnotes_onboarding_complete.${currentUserId}`);
    localStorage.removeItem(`fieldnotes_onboarding_data.${currentUserId}`);
  }

  // If there's an RPC or edge function to delete the Supabase user, it would go here.
  // For now, we clear the local data and sign them out.
  await signOut();
}
// ─── Projects ─────────────────────────────────────────────
export type ProjectFile = { id: string; name: string; size: number; addedAt: number };
export type Project = {
  id: string;
  name: string;
  createdAt: number;
  files: ProjectFile[];
  description: string;
  status: "active" | "completed" | "on_hold" | "planning";
  priority: "critical" | "high" | "medium" | "low";
  totalStoryPoints: number;
  remainingStoryPoints: number;
  startDate: string;
  targetDate: string;
  tags: string[];
};
export const projectsStore = createStore<Project[]>("ai-test-gen.projects", []);
export const useProjects = projectsStore.useStore;

export function createProject(name: string, data?: Partial<Project>): Project {
  const p: Project = {
    id: crypto.randomUUID(),
    name,
    createdAt: Date.now(),
    files: [],
    description: data?.description !== undefined ? data.description : "Standard web project for QA testing.",
    status: data?.status !== undefined ? data.status : "active",
    priority: data?.priority !== undefined ? data.priority : "medium",
    totalStoryPoints: data?.totalStoryPoints !== undefined ? data.totalStoryPoints : 10,
    remainingStoryPoints: data?.remainingStoryPoints !== undefined ? data.remainingStoryPoints : 10,
    startDate: data?.startDate !== undefined ? data.startDate : new Date().toISOString().split("T")[0],
    targetDate: data?.targetDate !== undefined ? data.targetDate : new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split("T")[0],
    tags: data?.tags !== undefined ? data.tags : ["web"],
  };
  projectsStore.set((prev) => [p, ...prev]);
  addActivity("project_created", `Project "${name}" created`);
  return p;
}
export function updateProject(id: string, data: Partial<Project>) {
  projectsStore.set((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
}
export function deleteProject(id: string) {
  const p = projectsStore.get().find((p) => p.id === id);
  projectsStore.set((prev) => prev.filter((p) => p.id !== id));
  if (p) addActivity("project_deleted", `Project "${p.name}" deleted`);
}
export function addFiles(projectId: string, files: File[]) {
  projectsStore.set((prev) =>
    prev.map((p) =>
      p.id === projectId
        ? {
            ...p,
            files: [
              ...p.files,
              ...files.map((f) => ({ id: crypto.randomUUID(), name: f.name, size: f.size, addedAt: Date.now() })),
            ],
          }
        : p,
    ),
  );
  addActivity("files_added", `${files.length} file(s) added to project`);
}
export function removeFile(projectId: string, fileId: string) {
  projectsStore.set((prev) =>
    prev.map((p) => (p.id === projectId ? { ...p, files: p.files.filter((f) => f.id !== fileId) } : p)),
  );
}

// ─── Test Suites ──────────────────────────────────────────
export type TestSuite = {
  id: string;
  projectId: string;
  name: string;
  createdAt: number;
  testCaseIds: string[];
};
export const suitesStore = createStore<TestSuite[]>("ai-test-gen.suites", []);
export const useSuites = suitesStore.useStore;

export function createSuite(projectId: string, name: string): TestSuite {
  const s: TestSuite = { id: crypto.randomUUID(), projectId, name, createdAt: Date.now(), testCaseIds: [] };
  suitesStore.set((prev) => [s, ...prev]);
  addActivity("suite_created", `Suite "${name}" created`);
  return s;
}
export function deleteSuite(id: string) {
  const s = suitesStore.get().find((s) => s.id === id);
  suitesStore.set((prev) => prev.filter((s) => s.id !== id));
  // Also remove all test cases in this suite
  testCasesStore.set((prev) => prev.filter((tc) => tc.suiteId !== id));
  if (s) addActivity("suite_deleted", `Suite "${s.name}" deleted`);
}
export function renameSuite(id: string, name: string) {
  suitesStore.set((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
}

// ─── Test Cases ───────────────────────────────────────────
export type TestCasePriority = "critical" | "high" | "medium" | "low";
export type TestCaseStatus = "draft" | "ready" | "passed" | "failed" | "skipped";
export type TestCase = {
  id: string;
  suiteId: string;
  title: string;
  steps: string;
  expected: string;
  priority: TestCasePriority;
  status: TestCaseStatus;
  tags: string[];
  createdAt: number;
};
export const testCasesStore = createStore<TestCase[]>("ai-test-gen.testcases", []);
export const useTestCases = testCasesStore.useStore;

export function createTestCase(suiteId: string, data: Partial<TestCase>): TestCase {
  const tc: TestCase = {
    id: crypto.randomUUID(),
    suiteId,
    title: data.title || "Untitled test case",
    steps: data.steps || "",
    expected: data.expected || "",
    priority: data.priority || "medium",
    status: data.status || "draft",
    tags: data.tags || [],
    createdAt: Date.now(),
  };
  testCasesStore.set((prev) => [tc, ...prev]);
  // Also add to suite's testCaseIds
  suitesStore.set((prev) => prev.map((s) => (s.id === suiteId ? { ...s, testCaseIds: [...s.testCaseIds, tc.id] } : s)));
  addActivity("testcase_created", `Test case "${tc.title}" created`);
  return tc;
}
export function updateTestCase(id: string, data: Partial<TestCase>) {
  testCasesStore.set((prev) => prev.map((tc) => (tc.id === id ? { ...tc, ...data } : tc)));
}
export function deleteTestCase(id: string) {
  const tc = testCasesStore.get().find((t) => t.id === id);
  testCasesStore.set((prev) => prev.filter((tc) => tc.id !== id));
  if (tc) {
    suitesStore.set((prev) => prev.map((s) => (s.id === tc.suiteId ? { ...s, testCaseIds: s.testCaseIds.filter((i) => i !== id) } : s)));
    addActivity("testcase_deleted", `Test case "${tc.title}" deleted`);
  }
}

// ─── Test Runs ────────────────────────────────────────────
export type TestRunStatus = "running" | "passed" | "failed" | "aborted";
export type TestRunResult = { testCaseId: string; status: "passed" | "failed" | "skipped"; duration: number; error?: string };
export type TestRun = {
  id: string;
  projectId: string;
  suiteId?: string;
  suiteName?: string;
  projectName?: string;
  startedAt: number;
  duration: number;
  status: TestRunStatus;
  results: TestRunResult[];
};
export const runsStore = createStore<TestRun[]>("ai-test-gen.runs", []);
export const useRuns = runsStore.useStore;

export function createMockRun(projectId: string, suiteId?: string): TestRun {
  const project = projectsStore.get().find((p) => p.id === projectId);
  const suite = suiteId ? suitesStore.get().find((s) => s.id === suiteId) : undefined;
  const cases = suiteId
    ? testCasesStore.get().filter((tc) => tc.suiteId === suiteId)
    : testCasesStore.get().filter((tc) => {
        const s = suitesStore.get().find((s) => s.id === tc.suiteId);
        return s?.projectId === projectId;
      });

  const results: TestRunResult[] = cases.map((tc) => {
    const r = Math.random();
    const status: "passed" | "failed" | "skipped" = r > 0.2 ? "passed" : r > 0.08 ? "failed" : "skipped";
    return { testCaseId: tc.id, status, duration: Math.floor(Math.random() * 5000) + 200, error: status === "failed" ? "Assertion failed: expected true, got false" : undefined };
  });

  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  const hasFailed = results.some((r) => r.status === "failed");

  const run: TestRun = {
    id: `RUN-${String(runsStore.get().length + 1).padStart(3, "0")}`,
    projectId,
    suiteId,
    suiteName: suite?.name,
    projectName: project?.name || "Unknown",
    startedAt: Date.now(),
    duration: totalDuration,
    status: hasFailed ? "failed" : "passed",
    results,
  };
  runsStore.set((prev) => [run, ...prev]);
  addActivity("run_completed", `Test run ${run.id} completed — ${results.filter((r) => r.status === "passed").length}/${results.length} passed`);
  return run;
}

// ─── Bug Reports ──────────────────────────────────────────
export type BugSeverity = "critical" | "high" | "medium" | "low";
export type BugStatus = "open" | "in_progress" | "fixed" | "verified" | "closed";
export type BugReport = {
  id: string;
  projectId: string;
  runId?: string;
  testCaseId: string;
  title: string;
  severity: BugSeverity;
  description: string;
  status: BugStatus;
  createdAt: number;
};
export const bugsStore = createStore<BugReport[]>("ai-test-gen.bugs", []);
export const useBugs = bugsStore.useStore;

export function createBug(data: Omit<BugReport, "id" | "createdAt" | "status">): BugReport {
  const bug: BugReport = { ...data, id: `BUG-${String(bugsStore.get().length + 1).padStart(3, "0")}`, status: "open", createdAt: Date.now() };
  bugsStore.set((prev) => [bug, ...prev]);
  addActivity("bug_filed", `Bug "${bug.title}" filed (${bug.severity})`);
  return bug;
}
export function updateBugStatus(id: string, status: BugStatus) {
  bugsStore.set((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
  addActivity("bug_updated", `Bug ${id} status changed to ${status.replace("_", " ")}`);
}
export function deleteBug(id: string) {
  bugsStore.set((prev) => prev.filter((b) => b.id !== id));
}

// ─── Activity Feed ────────────────────────────────────────
export type ActivityType =
  | "project_created" | "project_deleted"
  | "suite_created" | "suite_deleted"
  | "testcase_created" | "testcase_deleted"
  | "run_completed"
  | "bug_filed" | "bug_updated"
  | "files_added"
  | "general";
export type ActivityItem = {
  id: string;
  type: ActivityType;
  message: string;
  timestamp: number;
};
export const activityStore = createStore<ActivityItem[]>("ai-test-gen.activity", []);
export const useActivity = activityStore.useStore;

export function addActivity(type: ActivityType, message: string) {
  const item: ActivityItem = { id: crypto.randomUUID(), type, message, timestamp: Date.now() };
  activityStore.set((prev) => [item, ...prev].slice(0, 100)); // Keep last 100
}

// ─── Token System ─────────────────────────────────────────
export type TokenInfo = {
  balance: number;
  plan: "Standard" | "Premium";
  maxTokens: number;
};
export const tokenStore = createStore<TokenInfo>("ai-test-gen.tokens", {
  balance: 100,
  plan: "Standard",
  maxTokens: 100,
});
export const useTokens = tokenStore.useStore;

export function deductTokens(amount: number): boolean {
  const current = tokenStore.get();
  if (current.plan === "Premium") {
    // Premium has unlimited balance virtually
    tokenStore.set((prev) => ({
      ...prev,
      balance: Math.max(0, prev.balance - amount),
    }));
    return true;
  }
  if (current.balance < amount) {
    return false;
  }
  tokenStore.set((prev) => ({
    ...prev,
    balance: Math.max(0, prev.balance - amount),
  }));
  return true;
}

export function setPlan(plan: "Standard" | "Premium") {
  tokenStore.set((prev) => ({
    ...prev,
    plan,
    balance: plan === "Premium" ? 10000 : 100,
    maxTokens: plan === "Premium" ? 10000 : 100,
  }));
}

// ─── Settings Store ───────────────────────────────────────
export type SettingsInfo = {
  aiModel: string;
  notifications: {
    runComplete: boolean;
    bugFiled: boolean;
    tokenLow: boolean;
    weeklyDigest: boolean;
  };
  userName: string;
  userEmail: string;
  username: string;
  role: string;
  defaultProjectView: "card" | "list";
  timezone: string;
  dateFormat: string;
  twoFactorEnabled: boolean;
};
export const settingsStore = createStore<SettingsInfo>("ai-test-gen.settings", {
  aiModel: "gpt-4o",
  notifications: {
    runComplete: true,
    bugFiled: true,
    tokenLow: true,
    weeklyDigest: false,
  },
  userName: "",
  userEmail: "",
  username: "",
  role: "QA Engineer",
  defaultProjectView: "card",
  timezone: "America/New_York",
  dateFormat: "MM/DD/YYYY",
  twoFactorEnabled: false,
});
export const useSettings = settingsStore.useStore;

// ─── Notifications Store ──────────────────────────────────
export type AppNotification = {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: number;
  type: "info" | "warning" | "success" | "error";
};

export const notificationsStore = createStore<AppNotification[]>("ai-test-gen.notifications", [
  {
    id: "1",
    title: "Welcome to Field Notes!",
    message: "Create your first project to get started with test case generation.",
    read: false,
    createdAt: Date.now() - 3600000 * 2,
    type: "info",
  },
  {
    id: "2",
    title: "Initial Balance Credited",
    message: "100 tokens have been added to your standard plan balance.",
    read: false,
    createdAt: Date.now() - 3600000,
    type: "success",
  }
]);
export const useNotifications = notificationsStore.useStore;

export function addNotification(title: string, message: string, type: AppNotification["type"] = "info") {
  // Check settings toggle
  const settings = settingsStore.get();
  if (type === "warning" && !settings.notifications.tokenLow) return;
  if (type === "success" && !settings.notifications.runComplete) return;
  if (type === "error" && !settings.notifications.bugFiled) return;

  const newNotif: AppNotification = {
    id: crypto.randomUUID(),
    title,
    message,
    read: false,
    createdAt: Date.now(),
    type,
  };
  notificationsStore.set((prev) => [newNotif, ...prev]);
}

export function markAllNotificationsAsRead() {
  notificationsStore.set((prev) => prev.map(n => ({ ...n, read: true })));
}

export function deleteAllNotifications() {
  notificationsStore.set([]);
}

export function deleteNotification(id: string) {
  notificationsStore.set((prev) => prev.filter(n => n.id !== id));
}

export function markNotificationAsRead(id: string) {
  notificationsStore.set((prev) => prev.map(n => n.id === id ? { ...n, read: true } : n));
}

// ─── Store Initialization (user-scoped) ───────────────────
const ALL_STORES: Store<any>[] = [
  projectsStore, suitesStore, testCasesStore,
  runsStore, bugsStore, activityStore,
  tokenStore, settingsStore, notificationsStore
];

/**
 * Call this after authentication to scope all stores to the current user.
 * Re-reads data from localStorage using the user-scoped key.
 */
export function initializeStores(userId: string) {
  if (currentUserId === userId) return; // Already initialized for this user
  currentUserId = userId;

  // Re-read all stores from their new user-scoped keys
  for (const store of ALL_STORES) {
    store._reinit();
  }
}

/**
 * Call on sign-out to reset stores to empty state.
 */
export function clearStores() {
  currentUserId = null;
  for (const store of ALL_STORES) {
    store._reinit();
  }
}