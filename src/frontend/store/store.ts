// =========================================================
// PS PROJECT -- FRONT END (CLIENT-SIDE STATE & STORES)
// =========================================================

import { useEffect, useState } from "react";
import { supabase } from "@/backend/supabase";
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

export function createStore<T>(baseKey: string, initial: T): Store<T> {
  let state: T = initial;
  const listeners = new Set<Listener>();

  function load(): T {
    if (typeof window === "undefined" || !currentUserId) return initial;
    try {
      const raw = localStorage.getItem(`${baseKey}.${currentUserId}`);
      if (raw) return JSON.parse(raw) as T;
    } catch (err) {
      void err;
    }
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
      try {
        localStorage.setItem(`${baseKey}.${currentUserId}`, JSON.stringify(state));
      } catch (err) {
        void err;
      }
    }
    listeners.forEach((l) => l());
  };
  const subscribe = (l: Listener) => {
    listeners.add(l);
    return () => listeners.delete(l);
  };

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
} // Auth State Hook (Supabase)
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
      } catch (err) {
        void err;
      }
    }

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (typeof window !== "undefined" && localStorage.getItem("mock_auth")) return;
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
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
    if (currentUserId) {
      const prefix = `fieldnotes.user.${currentUserId}.`;
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
    }
    localStorage.removeItem("fieldnotes.workspace.meta");
    localStorage.removeItem("fieldnotes.workspace.members");
  }
  await supabase.auth.signOut();
  clearStores();
}

export async function deleteUserAccount() {
  if (currentUserId && typeof window !== "undefined") {
    const sharedRaw = localStorage.getItem("fieldnotes.shared.workspaces");
    if (sharedRaw) {
      try {
        const shared = JSON.parse(sharedRaw);
        for (const wsId of Object.keys(shared)) {
          const ws = shared[wsId];
          if (ws.members) {
            ws.members = ws.members.filter((m: any) => m.userId !== currentUserId);
          }
        }
        localStorage.setItem("fieldnotes.shared.workspaces", JSON.stringify(shared));
      } catch (err) {
        void err;
      }
    }

    // Remove all store data for this user
    for (const store of ALL_STORES) {
      localStorage.removeItem(`${store._baseKey}.${currentUserId}`);
    }
    // Remove onboarding flags
    localStorage.removeItem(`fieldnotes_onboarding_complete.${currentUserId}`);
    localStorage.removeItem(`fieldnotes.user.${currentUserId}.onboardingComplete`);
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
  startDate: string;
  targetDate: string;
  tags: string[];
};
export const projectsStore = createStore<Project[]>("ai-test-gen.projects", []);
export const useProjects = projectsStore.useStore;

export const activeProjectStore = createStore<string>("ai-test-gen.activeProjectId", "");
export const useActiveProjectId = activeProjectStore.useStore;

export function createProject(name: string, data?: Partial<Project>): Project {
  const p: Project = {
    id: crypto.randomUUID(),
    name,
    createdAt: Date.now(),
    files: [],
    description:
      data?.description !== undefined ? data.description : "Standard web project for QA testing.",
    status: data?.status !== undefined ? data.status : "active",
    priority: data?.priority !== undefined ? data.priority : "medium",
    startDate:
      data?.startDate !== undefined ? data.startDate : new Date().toISOString().split("T")[0],
    targetDate:
      data?.targetDate !== undefined
        ? data.targetDate
        : new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split("T")[0],
    tags: data?.tags !== undefined ? data.tags : ["web"],
  };
  projectsStore.set((prev) => [p, ...prev]);
  addActivity("project_created", `Project "${name}" created`);
  scaffoldSprintsForProject(p);
  return p;
}
export function updateProject(id: string, data: Partial<Project>) {
  projectsStore.set((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
}
export function deleteProject(id: string) {
  const p = projectsStore.get().find((p) => p.id === id);
  if (!p) return;

  // 1. Get all suites belonging to this project
  const pSuites = suitesStore.get().filter((s) => s.projectId === id);
  const suiteIds = pSuites.map((s) => s.id);

  // 2. Cascade delete all test cases belonging to those suites
  testCasesStore.set((prev) => prev.filter((tc) => !suiteIds.includes(tc.suiteId)));

  // 3. Cascade delete all suites belonging to this project
  suitesStore.set((prev) => prev.filter((s) => s.projectId !== id));

  // 4. Cascade delete all runs belonging to this project
  runsStore.set((prev) => prev.filter((r) => r.projectId !== id));

  // 5. Cascade delete all bugs belonging to this project
  bugsStore.set((prev) => prev.filter((b) => b.project_id !== id));

  // 6. Cascade delete all sprints belonging to this project
  sprintsStore.set((prev) => prev.filter((s) => s.projectId !== id));

  // 7. Delete the project itself
  projectsStore.set((prev) => prev.filter((project) => project.id !== id));

  // If the active project is the one being deleted, reset it to the first remaining project
  if (activeProjectStore.get() === id) {
    const remaining = projectsStore.get();
    activeProjectStore.set(remaining.length > 0 ? remaining[0].id : "");
  }

  addActivity("project_deleted", `Project "${p.name}" deleted`);
}
export function addFiles(projectId: string, files: File[]) {
  projectsStore.set((prev) =>
    prev.map((p) =>
      p.id === projectId
        ? {
            ...p,
            files: [
              ...p.files,
              ...files.map((f) => ({
                id: crypto.randomUUID(),
                name: f.name,
                size: f.size,
                addedAt: Date.now(),
              })),
            ],
          }
        : p,
    ),
  );
  addActivity("files_added", `${files.length} file(s) added to project`);
}
export function removeFile(projectId: string, fileId: string) {
  projectsStore.set((prev) =>
    prev.map((p) =>
      p.id === projectId ? { ...p, files: p.files.filter((f) => f.id !== fileId) } : p,
    ),
  );
}

// ─── RBAC & Workspace definitions ────────────────────────
export type WorkspaceRole = "Owner" | "Admin" | "Editor" | "Viewer";

export type Workspace = {
  id: string;
  name: string;
  createdAt: number;
  billingStatus: "active" | "past_due" | "canceled";
};

export type LegacyWorkspaceMember = {
  id: string;
  workspaceId: string;
  userId: string; // Refers to Profile.id or Supabase auth.user.id
  role: WorkspaceRole;
  joinedAt: number;
};

export const DEFAULT_WORKSPACE_ID = "ws-default-123";

export const workspacesStore = createStore<Workspace[]>("ai-test-gen.workspaces", [
  {
    id: DEFAULT_WORKSPACE_ID,
    name: "My Organization",
    createdAt: Date.now(),
    billingStatus: "active",
  },
]);
export const useWorkspaces = workspacesStore.useStore;

export const workspaceMembersStore = createStore<LegacyWorkspaceMember[]>(
  "ai-test-gen.workspaceMembers",
  [
    {
      id: "wm1",
      workspaceId: DEFAULT_WORKSPACE_ID,
      userId: "p1",
      role: "Owner",
      joinedAt: Date.now(),
    },
    {
      id: "wm2",
      workspaceId: DEFAULT_WORKSPACE_ID,
      userId: "p2",
      role: "Admin",
      joinedAt: Date.now(),
    },
    {
      id: "wm3",
      workspaceId: DEFAULT_WORKSPACE_ID,
      userId: "p3",
      role: "Editor",
      joinedAt: Date.now(),
    },
    {
      id: "wm4",
      workspaceId: DEFAULT_WORKSPACE_ID,
      userId: "p4",
      role: "Editor",
      joinedAt: Date.now(),
    },
    {
      id: "wm5",
      workspaceId: DEFAULT_WORKSPACE_ID,
      userId: "p5",
      role: "Viewer",
      joinedAt: Date.now(),
    },
    // And a member for the mock agent user
    {
      id: "wm-agent",
      workspaceId: DEFAULT_WORKSPACE_ID,
      userId: "agent-user-id-007",
      role: "Owner",
      joinedAt: Date.now(),
    },
  ],
);
export const useWorkspaceMembers = workspaceMembersStore.useStore;

/**
 * Hook to get the current authenticated user's workspace role.
 * Defauts to "Viewer" if the user is not found in the workspace members list.
 */
export function useCurrentRole(): WorkspaceRole {
  const { user } = useAuth();
  if (!user) return "Viewer";

  const stored =
    typeof window !== "undefined" ? localStorage.getItem(`fieldnotes.user.${user.id}.role`) : null;
  const role = stored?.toLowerCase();
  if (role === "owner") return "Owner";
  if (role === "admin") return "Admin";
  if (role === "editor") return "Editor";
  return "Viewer";
}

/**
 * Hook to get the current user store for centralized permissions.
 */
export function useUserStore() {
  const { user } = useAuth();
  const userId = user?.id;
  const [role, setRole] = useState<"owner" | "admin" | "editor" | "viewer">("viewer");

  useEffect(() => {
    if (!userId) {
      setRole("viewer");
      return;
    }
    const stored = localStorage.getItem(`fieldnotes.user.${userId}.role`);
    const cleaned = (stored?.toLowerCase() ?? "viewer") as any;
    if (["owner", "admin", "editor", "viewer"].includes(cleaned)) {
      setRole(cleaned);
    } else {
      setRole("viewer");
    }
  }, [userId]);

  return {
    currentUser: userId ? { id: userId, role } : null,
  };
}

export interface WorkspaceMeta {
  workspaceId: string;
  workspaceName: string;
  workspaceKey: string;
  ownerId: string;
  ownerEmail: string;
  createdAt: string;
  plan: "standard" | "premium";
}

export interface WorkspaceMember {
  userId: string;
  email: string;
  displayName: string;
  role: "owner" | "admin" | "editor" | "viewer";
  jobTitle: string;
  joinedAt: string;
  addedBy: string | null;
  avatarColor: string;
  status: "active" | "pending";
  pendingRoleChangeNotification?: boolean;
}

export function getAvatarColor(name: string): string {
  const brandColors = ["#C4531A", "#2E7D32", "#1565C0", "#C2185B", "#6A1B9A", "#EF6C00"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return brandColors[Math.abs(hash) % brandColors.length];
}

export function updateActiveWorkspaceMembers(members: WorkspaceMember[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem("fieldnotes.workspace.members", JSON.stringify(members));

  const metaRaw = localStorage.getItem("fieldnotes.workspace.meta");
  if (metaRaw) {
    const meta = JSON.parse(metaRaw);
    const sharedRaw = localStorage.getItem("fieldnotes.shared.workspaces");
    const shared = sharedRaw ? JSON.parse(sharedRaw) : {};
    if (shared[meta.workspaceId]) {
      shared[meta.workspaceId].members = members;
      localStorage.setItem("fieldnotes.shared.workspaces", JSON.stringify(shared));
    }
  }

  // Trigger storage event to update state in other components
  window.dispatchEvent(new Event("storage"));
}

export function updateActiveWorkspaceMeta(meta: WorkspaceMeta) {
  if (typeof window === "undefined") return;
  localStorage.setItem("fieldnotes.workspace.meta", JSON.stringify(meta));

  const sharedRaw = localStorage.getItem("fieldnotes.shared.workspaces");
  const shared = sharedRaw ? JSON.parse(sharedRaw) : {};
  if (shared[meta.workspaceId]) {
    shared[meta.workspaceId].meta = meta;
    localStorage.setItem("fieldnotes.shared.workspaces", JSON.stringify(shared));
  }

  window.dispatchEvent(new Event("storage"));
}

export function useWorkspaceMeta() {
  const [meta, setMetaState] = useState<WorkspaceMeta | null>(() => {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("fieldnotes.workspace.meta");
    return raw ? JSON.parse(raw) : null;
  });

  useEffect(() => {
    const handler = () => {
      const raw = localStorage.getItem("fieldnotes.workspace.meta");
      setMetaState(raw ? JSON.parse(raw) : null);
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  return [meta, updateActiveWorkspaceMeta] as const;
}

export function useWorkspaceMembersList() {
  const [members, setMembersState] = useState<WorkspaceMember[]>(() => {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem("fieldnotes.workspace.members");
    return raw ? JSON.parse(raw) : [];
  });

  useEffect(() => {
    const handler = () => {
      const raw = localStorage.getItem("fieldnotes.workspace.members");
      setMembersState(raw ? JSON.parse(raw) : []);
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  return [members, updateActiveWorkspaceMembers] as const;
}

export function resolveWorkspaceMembership(userId: string, email: string) {
  if (typeof window === "undefined") return;

  const sharedRaw = localStorage.getItem("fieldnotes.shared.workspaces");
  const shared = sharedRaw ? JSON.parse(sharedRaw) : {};

  let matchedWorkspaceId: string | null = null;
  let activeMemberEntry: any = null;
  let matchedInvite: any = null;

  for (const wsId of Object.keys(shared)) {
    const ws = shared[wsId];
    const members = ws.members || [];
    const pendingInvites = ws.pendingInvites || [];

    const activeMember = members.find((m: any) => m.userId === userId && m.status === "active");
    if (activeMember) {
      matchedWorkspaceId = wsId;
      activeMemberEntry = activeMember;
      break;
    }

    const pendingInvite = pendingInvites.find(
      (inv: any) => inv.email.toLowerCase() === email.toLowerCase() && inv.status === "pending",
    );
    if (pendingInvite) {
      const expiresAt = new Date(pendingInvite.expiresAt);
      if (expiresAt > new Date()) {
        matchedWorkspaceId = wsId;
        matchedInvite = pendingInvite;
        break;
      }
    }
  }

  if (activeMemberEntry && matchedWorkspaceId) {
    const ws = shared[matchedWorkspaceId];
    localStorage.setItem("fieldnotes.workspace.meta", JSON.stringify(ws.meta));
    localStorage.setItem("fieldnotes.workspace.members", JSON.stringify(ws.members));
    localStorage.setItem(`fieldnotes.user.${userId}.role`, activeMemberEntry.role.toLowerCase());
  } else if (matchedInvite && matchedWorkspaceId) {
    const ws = shared[matchedWorkspaceId];
    ws.pendingInvites = ws.pendingInvites.filter(
      (inv: any) => inv.inviteId !== matchedInvite.inviteId,
    );

    const newMember: WorkspaceMember = {
      userId: userId,
      email: email,
      displayName: email.split("@")[0],
      role: matchedInvite.role,
      jobTitle: matchedInvite.jobTitle,
      joinedAt: new Date().toISOString(),
      addedBy: matchedInvite.invitedBy,
      avatarColor: getAvatarColor(email.split("@")[0]),
      status: "active" as const,
    };

    ws.members = [...(ws.members || []), newMember];
    localStorage.setItem("fieldnotes.shared.workspaces", JSON.stringify(shared));

    localStorage.setItem("fieldnotes.workspace.meta", JSON.stringify(ws.meta));
    localStorage.setItem("fieldnotes.workspace.members", JSON.stringify(ws.members));
    localStorage.setItem(`fieldnotes.user.${userId}.role`, matchedInvite.role.toLowerCase());

    window.location.href = "/onboarding";
  } else {
    localStorage.removeItem("fieldnotes.workspace.meta");
    localStorage.removeItem("fieldnotes.workspace.members");
    localStorage.removeItem(`fieldnotes.user.${userId}.onboardingComplete`);
    localStorage.removeItem(`fieldnotes_onboarding_complete.${userId}`);
  }
}

// ─── Profile definitions ──────────────────────────────────
export type Profile = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  avatarUrl?: string;
};

export const MOCK_PROFILES: Profile[] = [
  { id: "p1", fullName: "Vihan Malhotra", email: "vihan@qanexus.ai", role: "Product Manager" },
  { id: "p2", fullName: "Sarah Chen", email: "sarah.c@qanexus.ai", role: "Lead QA Engineer" },
  { id: "p3", fullName: "Alex Rivera", email: "alex.r@qanexus.ai", role: "Senior Developer" },
  { id: "p4", fullName: "Jessica Taylor", email: "jessica.t@qanexus.ai", role: "Automation QA" },
  { id: "p5", fullName: "Michael K.", email: "michael.k@qanexus.ai", role: "DevOps Engineer" },
];

export const profilesStore = createStore<Profile[]>("ai-test-gen.profiles", []);
export const useProfiles = profilesStore.useStore;

export function createProfile(
  fullName: string,
  email: string,
  role: string,
  avatarUrl?: string,
): Profile {
  const p: Profile = {
    id: crypto.randomUUID(),
    fullName,
    email,
    role,
    avatarUrl,
  };
  profilesStore.set((prev) => [...prev, p]);
  return p;
}

export function updateProfile(id: string, data: Partial<Profile>) {
  profilesStore.set((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
}

export function deleteProfile(id: string) {
  profilesStore.set((prev) => prev.filter((p) => p.id !== id));
}

// ─── Sprint Planning Engine ────────────────────────────────
export type Sprint = {
  id: string;
  projectId: string;
  name: string;
  goalDescription: string | null;
  status: "Upcoming" | "Active" | "Completed";
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  sprintLeadId: string | null;
  sprintMembers: string[];
  sprintDevelopers: string[];
  sprintTesters: string[];
};

export const sprintsStore = createStore<Sprint[]>("ai-test-gen.sprints", []);
export const useSprints = sprintsStore.useStore;

export function scaffoldSprintsForProject(project: Project): Sprint[] {
  const start = new Date(project.startDate);
  const end = new Date(project.targetDate);

  // Guard: if dates are invalid or end is before start, do nothing
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    console.warn(
      `scaffoldSprintsForProject: invalid dates for project "${project.name}" (start=${project.startDate}, end=${project.targetDate}). Skipping scaffold.`,
    );
    return [];
  }

  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);

  const numFullSprints = Math.floor(diffDays / 14);
  const remainderDays = diffDays % 14;

  const sprintsToCreate: { name: string; duration: number }[] = [];

  if (numFullSprints === 0) {
    sprintsToCreate.push({ name: "Sprint 1", duration: diffDays });
  } else {
    for (let i = 0; i < numFullSprints; i++) {
      sprintsToCreate.push({ name: `Sprint ${i + 1}`, duration: 14 });
    }
    if (remainderDays > 0) {
      sprintsToCreate.push({ name: `Sprint ${numFullSprints + 1}`, duration: remainderDays });
    }
  }

  const numSprints = sprintsToCreate.length;

  const generatedSprints: Sprint[] = [];
  let currentSprintStartDate = new Date(project.startDate);

  for (let i = 0; i < numSprints; i++) {
    const sConf = sprintsToCreate[i];
    const currentSprintEndDate = new Date(currentSprintStartDate);
    currentSprintEndDate.setDate(currentSprintEndDate.getDate() + sConf.duration - 1);

    const status = i === 0 ? "Active" : "Upcoming";

    generatedSprints.push({
      id: crypto.randomUUID(),
      projectId: project.id,
      name: sConf.name,
      goalDescription: null,
      status,
      startDate: currentSprintStartDate.toISOString().split("T")[0],
      endDate: currentSprintEndDate.toISOString().split("T")[0],
      sprintLeadId: null,
      sprintMembers: [],
      sprintDevelopers: [],
      sprintTesters: [],
    });

    currentSprintStartDate = new Date(currentSprintEndDate);
    currentSprintStartDate.setDate(currentSprintStartDate.getDate() + 1);
  }

  sprintsStore.set((prev) => [...generatedSprints, ...prev]);

  bulkUpsertSprintsToSupabase(project.id, generatedSprints).catch((err) => {
    console.warn("Failed to bulk upsert sprints on creation:", err);
  });

  return generatedSprints;
}

// =========================================================
// PS PROJECT -- BACKEND / DATABASE SYNC (SUPABASE)
// =========================================================

export async function bulkUpsertSprintsToSupabase(
  projectId: string,
  sprints: Sprint[],
): Promise<{ success: boolean; error?: any }> {
  const dbRows = sprints.map((s) => {
    const startDate = s.startDate ? new Date(s.startDate) : null;
    const endDate = s.endDate ? new Date(s.endDate) : null;
    return {
      id: s.id,
      project_id: s.projectId,
      name: s.name,
      goal_description: s.goalDescription,
      status: s.status,
      start_date: startDate && !isNaN(startDate.getTime()) ? startDate.toISOString() : null,
      end_date: endDate && !isNaN(endDate.getTime()) ? endDate.toISOString() : null,
      sprint_lead_id: s.sprintLeadId,
      sprint_members: s.sprintMembers || [],
      sprint_developers: s.sprintDevelopers || [],
      sprint_testers: s.sprintTesters || [],
    };
  });

  try {
    const { error } = await supabase.from("sprints").upsert(dbRows, { onConflict: "id" });

    if (error) {
      console.error("Supabase upsert error:", error);
      return { success: false, error };
    }
    return { success: true };
  } catch (err) {
    console.error("Supabase upsert exception:", err);
    return { success: false, error: err };
  }
}

export async function fetchSprintsFromSupabase(projectId: string): Promise<Sprint[]> {
  try {
    const { data, error } = await supabase.from("sprints").select("*").eq("project_id", projectId);

    if (error) {
      console.warn("Error fetching sprints from Supabase:", error);
      return [];
    }

    if (data && data.length > 0) {
      const mapped: Sprint[] = data.map((d: any) => ({
        id: d.id,
        projectId: d.project_id,
        name: d.name ?? "Untitled Sprint",
        goalDescription: d.goal_description ?? null,
        status:
          d.status === "Active" || d.status === "Completed" || d.status === "Upcoming"
            ? d.status
            : "Upcoming",
        startDate: d.start_date ? d.start_date.split("T")[0] : "",
        endDate: d.end_date ? d.end_date.split("T")[0] : "",
        sprintLeadId: d.sprint_lead_id ?? null,
        sprintMembers: d.sprint_members || [],
        sprintDevelopers: d.sprint_developers || [],
        sprintTesters: d.sprint_testers || [],
      }));

      sprintsStore.set((prev) => {
        const otherProjectsSprints = prev.filter((s) => s.projectId !== projectId);
        return [...otherProjectsSprints, ...mapped];
      });

      return mapped;
    }
  } catch (err) {
    console.warn("Exception fetching sprints from Supabase:", err);
  }
  return [];
}

export function updateLocalSprints(projectId: string, updatedSprints: Sprint[]) {
  sprintsStore.set((prev) => {
    const otherProjectsSprints = prev.filter((s) => s.projectId !== projectId);
    return [...otherProjectsSprints, ...updatedSprints];
  });
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
  const s: TestSuite = {
    id: crypto.randomUUID(),
    projectId,
    name,
    createdAt: Date.now(),
    testCaseIds: [],
  };
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
/** Authoring lifecycle status — independent of execution results */
export type TestCaseAuthorStatus = "draft" | "ready" | "approved";
/** Preserved for backwards-compat with old localStorage data; new code should use authorStatus + lastRunStatus */
export type TestCaseStatus = "draft" | "ready" | "approved" | "passed" | "failed" | "skipped";
/** Classification of the test case (STLC category) */
export type TestCaseType =
  | "functional"
  | "regression"
  | "smoke"
  | "performance"
  | "security"
  | "integration"
  | "e2e";
export type TestCase = {
  id: string;
  suiteId: string;
  title: string;
  steps: string;
  expected: string;
  priority: TestCasePriority;
  /** @deprecated Use authorStatus + lastRunStatus instead. Kept for backwards-compat migration. */
  status: TestCaseStatus;
  /** Authoring lifecycle: draft → ready → approved */
  authorStatus: TestCaseAuthorStatus;
  /** Result from the most recent test run (undefined = never run) */
  lastRunStatus?: "passed" | "failed" | "skipped";
  /** ID of the run that set lastRunStatus */
  lastRunId?: string;
  tags: string[];
  createdAt: number;
  /** STLC test case classification */
  type?: TestCaseType;
  /** Assigned team member / profile */
  assignedTo?: string;
  /** Requirement ID for traceability matrix (RTM) */
  requirementId?: string;
  /** Link to the Chrome extension recording session that generated this test case */
  sourceRecordingId?: string;
  module_name?: string;
  project_id?: string;
};
export const testCasesStore = createStore<TestCase[]>("ai-test-gen.testcases", []);
export const useTestCases = testCasesStore.useStore;

export function createTestCase(suiteId: string, data: Partial<TestCase>): TestCase {
  const authorStatus: TestCaseAuthorStatus = data.authorStatus || "draft";
  const tc: TestCase = {
    id: crypto.randomUUID(),
    suiteId,
    title: data.title || "Untitled test case",
    steps: data.steps || "",
    expected: data.expected || "",
    priority: data.priority || "medium",
    status: data.status || authorStatus, // backwards-compat
    authorStatus,
    lastRunStatus: data.lastRunStatus,
    lastRunId: data.lastRunId,
    tags: data.tags || [],
    createdAt: Date.now(),
    type: data.type,
    assignedTo: data.assignedTo,
    requirementId: data.requirementId,
    sourceRecordingId: data.sourceRecordingId,
    module_name: data.module_name,
    project_id: data.project_id,
  };
  testCasesStore.set((prev) => [tc, ...prev]);
  // Also add to suite's testCaseIds
  suitesStore.set((prev) =>
    prev.map((s) => (s.id === suiteId ? { ...s, testCaseIds: [...s.testCaseIds, tc.id] } : s)),
  );
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
    suitesStore.set((prev) =>
      prev.map((s) =>
        s.id === tc.suiteId ? { ...s, testCaseIds: s.testCaseIds.filter((i) => i !== id) } : s,
      ),
    );
    addActivity("testcase_deleted", `Test case "${tc.title}" deleted`);
  }
}

// ─── Test Runs ────────────────────────────────────────────
export type TestRunStatus = "running" | "passed" | "failed" | "aborted";
export type TestRunResult = {
  testCaseId: string;
  status: "passed" | "failed" | "skipped";
  duration: number;
  error?: string;
};
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
  coverage?: number;
  /** Environment the run was executed against (e.g., dev, staging, production) */
  environment?: string;
};
export const runsStore = createStore<TestRun[]>("ai-test-gen.runs", []);
export const useRuns = runsStore.useStore;

/**
 * Seeded pseudo-random number generator (deterministic).
 * Given the same seed string, always produces the same 0–1 float.
 * Used to make mock test runs reproducible — same test case gives
 * consistent results within the same run context.
 */
function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0; // Convert to 32-bit integer
  }
  return ((hash & 0x7fffffff) % 10000) / 10000;
}

/**
 * Creates a mock test run with deterministic (seeded) results.
 *
 * Key design decisions:
 * - Results are seeded by `testCaseId + runCounter` so the same test case
 *   produces consistent results within the same run context.
 * - `authorStatus` on TestCase is NEVER mutated — only `lastRunStatus` is updated.
 * - Coverage is calculated from actual results (passed / total * 100), not random.
 * - Run IDs are globally unique (crypto.randomUUID prefix) to prevent cross-project collisions.
 */
export function createMockRun(
  projectId: string,
  arg2?: string | { suiteIds?: string[]; testCaseIds?: string[]; environment?: string },
): TestRun {
  const project = projectsStore.get().find((p) => p.id === projectId);

  let suiteIds: string[] | undefined;
  let testCaseIds: string[] | undefined;
  let singleSuiteId: string | undefined;
  let environment: string | undefined;

  if (typeof arg2 === "string") {
    singleSuiteId = arg2;
    suiteIds = [arg2];
  } else if (arg2 && typeof arg2 === "object") {
    suiteIds = arg2.suiteIds;
    testCaseIds = arg2.testCaseIds;
    environment = arg2.environment;
  }

  const suite = singleSuiteId ? suitesStore.get().find((s) => s.id === singleSuiteId) : undefined;

  // Determine which test cases to include in this run
  let cases: TestCase[] = [];
  if (testCaseIds && testCaseIds.length > 0) {
    cases = testCasesStore.get().filter((tc) => testCaseIds!.includes(tc.id));
  } else if (suiteIds && suiteIds.length > 0) {
    cases = testCasesStore.get().filter((tc) => suiteIds!.includes(tc.suiteId));
  } else {
    // Run entire project — find all test cases belonging to this project's suites
    cases = testCasesStore.get().filter((tc) => {
      const s = suitesStore.get().find((s) => s.id === tc.suiteId);
      return s?.projectId === projectId;
    });
  }

  // Generate a unique run ID first (needed for seeding)
  const runId = `RUN-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

  // Use seeded PRNG for deterministic, reproducible test results
  const results: TestRunResult[] = cases.map((tc) => {
    const seed = `${tc.id}-${runId}`;
    const r = seededRandom(seed);
    const status: "passed" | "failed" | "skipped" =
      r > 0.2 ? "passed" : r > 0.08 ? "failed" : "skipped";
    // Duration is also seeded for consistency
    const durationSeed = seededRandom(seed + "-duration");
    return {
      testCaseId: tc.id,
      status,
      duration: Math.floor(durationSeed * 5000) + 200,
      error: status === "failed" ? "Assertion failed: expected true, got false" : undefined,
    };
  });

  // Update ONLY lastRunStatus on test cases — authorStatus is NEVER mutated by runs
  testCasesStore.set((prev) =>
    prev.map((tc) => {
      const match = results.find((r) => r.testCaseId === tc.id);
      if (match) {
        return { ...tc, lastRunStatus: match.status, lastRunId: runId };
      }
      return tc;
    }),
  );

  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  const hasFailed = results.some((r) => r.status === "failed");
  const passedCount = results.filter((r) => r.status === "passed").length;

  const run: TestRun = {
    id: runId,
    projectId,
    suiteId: singleSuiteId,
    suiteName: suite?.name,
    projectName: project?.name || "Unknown",
    startedAt: Date.now(),
    duration: totalDuration,
    status: hasFailed ? "failed" : "passed",
    results,
    // Coverage is now calculated from actual results, not random
    coverage:
      settingsStore.get().coverageEnabled && results.length > 0
        ? Math.round((passedCount / results.length) * 100)
        : undefined,
    environment: environment || "localhost",
  };
  runsStore.set((prev) => [run, ...prev]);
  addActivity(
    "run_completed",
    `Test run ${run.id} completed — ${passedCount}/${results.length} passed`,
  );
  return run;
}

// ─── Bug Reports ──────────────────────────────────────────
/** Severity levels for bug reports, following standard QA taxonomy */
export type BugSeverity = "blocker" | "critical" | "major" | "minor" | "trivial";

export interface BugReport {
  id: string;
  project_id: string;
  test_case_title: string;
  /** Direct link to the test case that caused this bug (for traceability) */
  testCaseId?: string;
  /** Link to the run that revealed this bug */
  runId?: string;
  /** Link to the Chrome extension recording session (if bug originated from recording) */
  recordingSessionId?: string;
  error_message: string;
  code_snippet: string;
  developer_notes: string | null;
  is_resolved: boolean;
  resolved_at: string | null;
  /** Bug severity classification */
  severity: BugSeverity;
  /** Environment where the bug was found (dev, staging, production) */
  environment?: string;
  created_at?: string;
}

export const bugsStore = createStore<BugReport[]>("ai-test-gen.bugs", []);
export const useBugs = bugsStore.useStore;

export function createBug(data: {
  project_id: string;
  test_case_title: string;
  error_message: string;
  code_snippet: string;
  developer_notes?: string | null;
  testCaseId?: string;
  runId?: string;
  recordingSessionId?: string;
  severity?: BugSeverity;
  environment?: string;
}): BugReport {
  const bug: BugReport = {
    id: `BUG-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    project_id: data.project_id,
    test_case_title: data.test_case_title,
    testCaseId: data.testCaseId,
    runId: data.runId,
    recordingSessionId: data.recordingSessionId,
    error_message: data.error_message,
    code_snippet: data.code_snippet,
    developer_notes: data.developer_notes !== undefined ? data.developer_notes : null,
    is_resolved: false,
    resolved_at: null,
    severity: data.severity || "major",
    environment: data.environment,
    created_at: new Date().toISOString(),
  };
  bugsStore.set((prev) => [bug, ...prev]);
  addActivity("bug_filed", `Bug filed: "${bug.test_case_title}"`);
  return bug;
}

export function updateBugNotes(id: string, notes: string | null) {
  bugsStore.set((prev) => prev.map((b) => (b.id === id ? { ...b, developer_notes: notes } : b)));
}

export function resolveBug(id: string) {
  bugsStore.set((prev) =>
    prev.map((b) =>
      b.id === id ? { ...b, is_resolved: true, resolved_at: new Date().toISOString() } : b,
    ),
  );
  addActivity("bug_updated", `Bug ${id} marked as resolved`);
}

export function restoreBug(id: string) {
  bugsStore.set((prev) =>
    prev.map((b) => (b.id === id ? { ...b, is_resolved: false, resolved_at: null } : b)),
  );
  addActivity("bug_updated", `Bug ${id} restored to active list`);
}

export function deleteBug(id: string) {
  bugsStore.set((prev) => prev.filter((b) => b.id !== id));
}

// ─── Activity Feed ────────────────────────────────────────
export type ActivityType =
  | "project_created"
  | "project_deleted"
  | "suite_created"
  | "suite_deleted"
  | "testcase_created"
  | "testcase_deleted"
  | "run_completed"
  | "bug_filed"
  | "bug_updated"
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
  lastRefillDate?: string;
};
export const tokenStore = createStore<TokenInfo>("ai-test-gen.tokens", {
  balance: 100,
  plan: "Standard",
  maxTokens: 100,
});
export const useTokens = tokenStore.useStore;

export function checkAndRefillTokens() {
  const current = tokenStore.get();
  const todayStr = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD local format

  if (current.lastRefillDate !== todayStr) {
    if (current.plan === "Standard") {
      tokenStore.set({
        balance: 100,
        plan: "Standard",
        maxTokens: 100,
        lastRefillDate: todayStr,
      });
      if (currentUserId) {
        addNotification(
          "Tokens Refilled",
          "Your daily balance has been restored to 100 tokens.",
          "success",
        );
      }
    } else {
      tokenStore.set((prev) => ({
        ...prev,
        lastRefillDate: todayStr,
      }));
    }
  }
}

export function deductTokens(amount: number): boolean {
  checkAndRefillTokens();
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

export type TokenDeduction = {
  id: string;
  action: string;
  amount: number;
  timestamp: number;
};
export const tokenDeductionsStore = createStore<TokenDeduction[]>("ai-test-gen.tokenDeductions", []);
export const useTokenDeductions = tokenDeductionsStore.useStore;

/**
 * deductTokenAction — call this before any user-initiated task to:
 *  1. Deduct 5 tokens (or return false if insufficient)
 *  2. Push an in-app notification about the deduction
 *  3. Return true so the caller knows it can proceed
 *
 * Usage:  if (!deductTokenAction("Created test suite")) return;
 */
export function deductTokenAction(actionLabel: string): boolean {
  const ok = deductTokens(5);
  if (!ok) {
    addNotification(
      "Insufficient Tokens",
      `You don't have enough tokens to perform "${actionLabel}". Please upgrade your plan or wait for your daily refill.`,
      "error",
    );
    return false;
  }
  addNotification(
    "5 Tokens Used",
    `5 tokens were deducted for: ${actionLabel}. Check your token balance in the top bar.`,
    "info",
  );
  tokenDeductionsStore.set((prev) => [
    {
      id: crypto.randomUUID(),
      action: actionLabel,
      amount: 5,
      timestamp: Date.now(),
    },
    ...prev,
  ].slice(0, 10));
  return true;
}

export function setPlan(plan: "Standard" | "Premium") {
  tokenStore.set((prev) => ({
    ...prev,
    plan,
    balance: plan === "Premium" ? 10000 : 100,
    maxTokens: plan === "Premium" ? 10000 : 100,
    lastRefillDate: new Date().toLocaleDateString("en-CA"),
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
  coverageEnabled: boolean;
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
  coverageEnabled: false,
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
    title: "Welcome to QAMind AI!",
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
  },
]);
export const useNotifications = notificationsStore.useStore;

export function addNotification(
  title: string,
  message: string,
  type: AppNotification["type"] = "info",
) {
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
  notificationsStore.set((prev) => prev.map((n) => ({ ...n, read: true })));
}

export function deleteAllNotifications() {
  notificationsStore.set([]);
}

export function deleteNotification(id: string) {
  notificationsStore.set((prev) => prev.filter((n) => n.id !== id));
}

export function markNotificationAsRead(id: string) {
  notificationsStore.set((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
}

// ─── Store Initialization (user-scoped) ───────────────────
const ALL_STORES: Store<any>[] = [
  projectsStore,
  suitesStore,
  testCasesStore,
  runsStore,
  bugsStore,
  activityStore,
  tokenStore,
  settingsStore,
  notificationsStore,
  activeProjectStore,
  sprintsStore,
  profilesStore,
  tokenDeductionsStore,
];

/**
 * Call this after authentication to scope all stores to the current user.
 * Re-reads data from localStorage using the user-scoped key.
 */
export function initializeStores(userId: string, userEmail?: string, userName?: string) {
  const isNewUser = currentUserId !== userId;
  if (isNewUser) {
    currentUserId = userId;
    // Re-read all stores from their new user-scoped keys
    for (const store of ALL_STORES) {
      store._reinit();
    }
  }

  // Seeding the bypass-workspace-001 shared storage if not exists
  if (typeof window !== "undefined") {
    const sharedRaw = localStorage.getItem("fieldnotes.shared.workspaces");
    const shared = sharedRaw ? JSON.parse(sharedRaw) : {};
    if (!shared["bypass-workspace-001"]) {
      const bypassMeta: WorkspaceMeta = {
        workspaceId: "bypass-workspace-001",
        workspaceName: "QAMind AI Demo Workspace",
        workspaceKey: "FNQ-DEMO-0001",
        ownerId: "agent-user-id-007",
        ownerEmail: "agent@fieldnotes.qa",
        createdAt: new Date().toISOString(),
        plan: "premium",
      };

      const bypassMembers: WorkspaceMember[] = [
        {
          userId: "agent-user-id-007",
          email: "agent@fieldnotes.qa",
          displayName: "Agent Owner",
          role: "owner",
          jobTitle: "Workspace Owner",
          joinedAt: new Date().toISOString(),
          addedBy: null,
          avatarColor: getAvatarColor("Agent Owner"),
          status: "active",
        },
        {
          userId: "admin-user-id-008",
          email: "admin@fieldnotes.qa",
          displayName: "Demo Admin",
          role: "admin",
          jobTitle: "Lead QA Engineer",
          joinedAt: new Date().toISOString(),
          addedBy: "agent-user-id-007",
          avatarColor: getAvatarColor("Demo Admin"),
          status: "active",
        },
        {
          userId: "editor-user-id-009",
          email: "editor@fieldnotes.qa",
          displayName: "Demo Editor",
          role: "editor",
          jobTitle: "QA Engineer",
          joinedAt: new Date().toISOString(),
          addedBy: "agent-user-id-007",
          avatarColor: getAvatarColor("Demo Editor"),
          status: "active",
        },
        {
          userId: "viewer-user-id-010",
          email: "viewer@fieldnotes.qa",
          displayName: "Demo Viewer",
          role: "viewer",
          jobTitle: "Project Manager",
          joinedAt: new Date().toISOString(),
          addedBy: "agent-user-id-007",
          avatarColor: getAvatarColor("Demo Viewer"),
          status: "active",
        },
      ];

      shared["bypass-workspace-001"] = {
        meta: bypassMeta,
        members: bypassMembers,
        pendingInvites: [],
      };
      localStorage.setItem("fieldnotes.shared.workspaces", JSON.stringify(shared));
    }

    // Checking if the user is a bypass credential user
    const isBypassUser = [
      "agent-user-id-007",
      "admin-user-id-008",
      "editor-user-id-009",
      "viewer-user-id-010",
    ].includes(userId);

    if (isBypassUser) {
      let role = "viewer";
      if (userId === "agent-user-id-007") role = "owner";
      else if (userId === "admin-user-id-008") role = "admin";
      else if (userId === "editor-user-id-009") role = "editor";
      else if (userId === "viewer-user-id-010") role = "viewer";
      localStorage.setItem(`fieldnotes.user.${userId}.role`, role);

      // Pre-populate data if projects are empty
      const currentProj = projectsStore.get();
      if (currentProj.length === 0) {
        const p1Id = "demo-proj-001";
        const p2Id = "demo-proj-002";
        const s1Id = "demo-suite-001";
        const s2Id = "demo-suite-002";
        const s3Id = "demo-suite-003";

        projectsStore.set([
          {
            id: p1Id,
            name: "Acme Web App Core",
            createdAt: Date.now() - 5 * 24 * 3600 * 1000,
            files: [],
            description: "Core test suite for Acme E-Commerce frontend web application.",
            status: "active",
            priority: "high",
            startDate: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString().split("T")[0],
            targetDate: new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString().split("T")[0],
            tags: ["web", "react"],
          },
          {
            id: p2Id,
            name: "Acme Billing Services",
            createdAt: Date.now() - 2 * 24 * 3600 * 1000,
            files: [],
            description: "Backend microservice API suite for billing and subscriptions.",
            status: "planning",
            priority: "critical",
            startDate: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString().split("T")[0],
            targetDate: new Date(Date.now() + 20 * 24 * 3600 * 1000).toISOString().split("T")[0],
            tags: ["api", "billing"],
          },
        ]);
        activeProjectStore.set(p1Id);

        suitesStore.set([
          {
            id: s1Id,
            projectId: p1Id,
            name: "User Authentication Suite",
            createdAt: Date.now() - 4 * 24 * 3600 * 1000,
            testCaseIds: ["demo-tc-001", "demo-tc-002", "demo-tc-003"],
          },
          {
            id: s2Id,
            projectId: p1Id,
            name: "Shopping Cart & Checkout",
            createdAt: Date.now() - 3 * 24 * 3600 * 1000,
            testCaseIds: ["demo-tc-004"],
          },
          {
            id: s3Id,
            projectId: p2Id,
            name: "Subscription Lifecycle Webhooks",
            createdAt: Date.now() - 1 * 24 * 3600 * 1000,
            testCaseIds: ["demo-tc-005"],
          },
        ]);

        testCasesStore.set([
          {
            id: "demo-tc-001",
            suiteId: s1Id,
            title: "Verify login with valid credentials",
            steps: "1. Navigate to /login\n2. Enter agent@fieldnotes.qa\n3. Enter password123\n4. Click Submit",
            expected: "User is redirected to the main dashboard with a success greeting.",
            priority: "critical",
            status: "passed",
            authorStatus: "approved",
            lastRunStatus: "passed",
            tags: ["auth", "smoke"],
            createdAt: Date.now() - 4 * 24 * 3600 * 1000,
            type: "functional",
          },
          {
            id: "demo-tc-002",
            suiteId: s1Id,
            title: "Verify password strength validator",
            steps: "1. Navigate to /signup\n2. Enter weak password '123'\n3. Observe indicator text",
            expected: "Password requirements warning is displayed in red.",
            priority: "medium",
            status: "passed",
            authorStatus: "ready",
            lastRunStatus: "passed",
            tags: ["validation"],
            createdAt: Date.now() - 4 * 24 * 3600 * 1000,
            type: "functional",
          },
          {
            id: "demo-tc-003",
            suiteId: s1Id,
            title: "Verify MFA enforcement modal prompt",
            steps: "1. Log in with a 2FA-enabled account\n2. Wait for redirect\n3. Verify MFA code entry screen",
            expected: "MFA code input field focuses automatically and requests six digits.",
            priority: "high",
            status: "failed",
            authorStatus: "ready",
            lastRunStatus: "failed",
            tags: ["security"],
            createdAt: Date.now() - 4 * 24 * 3600 * 1000,
            type: "security",
          },
          {
            id: "demo-tc-004",
            suiteId: s2Id,
            title: "Verify card payment rejection",
            steps: "1. Add item to cart\n2. Proceed to checkout\n3. Submit expired Visa credit card",
            expected: "Alert warns card has expired; checkout block remains active.",
            priority: "high",
            status: "passed",
            authorStatus: "draft",
            lastRunStatus: "passed",
            tags: ["checkout", "payment"],
            createdAt: Date.now() - 3 * 24 * 3600 * 1000,
            type: "functional",
          },
          {
            id: "demo-tc-005",
            suiteId: s3Id,
            title: "Verify cancel-subscription webhook event processing",
            steps: "1. Send raw webhook payload to listener\n2. Observe service logger",
            expected: "Webhook processed status 200, user state sets to cancelled in DB.",
            priority: "high",
            status: "passed",
            authorStatus: "approved",
            lastRunStatus: "passed",
            tags: ["webhooks", "backend"],
            createdAt: Date.now() - 1 * 24 * 3600 * 1000,
            type: "e2e",
          },
        ]);
      }
    }
  }

  // Seed user's own profile if empty
  const currentProfiles = profilesStore.get();
  if (currentProfiles.length === 0) {
    const email = userEmail || "";
    const name = userName || email.split("@")[0] || "Workspace Owner";
    profilesStore.set([
      {
        id: userId,
        fullName: name,
        email: email,
        role: "Workspace Owner",
      },
    ]);
  }

  // Seed user's role in namespaced localStorage if not set yet
  if (typeof window !== "undefined") {
    const existing = localStorage.getItem(`fieldnotes.user.${userId}.role`);
    if (!existing) {
      const member = workspaceMembersStore
        .get()
        .find((m) => m.userId === userId && m.workspaceId === DEFAULT_WORKSPACE_ID);
      const roleToSet = member ? member.role.toLowerCase() : "viewer";
      localStorage.setItem(`fieldnotes.user.${userId}.role`, roleToSet);
    }
  }

  // Resolve workspace membership
  if (userId) {
    resolveWorkspaceMembership(userId, userEmail || "");
  }

  checkAndRefillTokens();
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
