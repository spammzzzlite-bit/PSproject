import { createFileRoute, Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  LayoutGrid,
  FolderClosed,
  Sparkles,
  History,
  BookOpen,
  Plug,
  Settings,
  LifeBuoy,
  Search,
  Menu,
  X,
  LogOut,
  Bug,
  BarChart3,
  Layers,
  FlaskConical,
  ClipboardList,
  Coins,
  Bell,
  Trash,
  Sun,
  Moon,
  Video,
  ShieldCheck,
  ShieldAlert,
  Star,
  Mail,
  CheckCircle,
} from "lucide-react";
import { useAuth, signOut, initializeStores } from "@/frontend/store/store";
import { supabase } from "@/backend/supabase";
import { checkSuperAdminStatus } from "@/backend/api/super-admin.functions";
import { PanelProvider, usePanel } from "@/frontend/components/PanelContext";
import { PanelShell } from "@/frontend/components/PanelShell";
import { CommandPalette } from "@/frontend/components/CommandPalette";
import { Toaster, toast } from "sonner";
import {
  useProjects,
  useSuites,
  createProject,
  useTokens,
  useNotifications,
  markAllNotificationsAsRead,
  deleteAllNotifications,
  deleteNotification,
  markNotificationAsRead,
  setPlan,
  useBugs,
  useUserStore,
} from "@/frontend/store/store";
import { can } from "@/lib/permissions";
import { DetailedNewProjectModal } from "./_app.projects";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

// Re-export toast for use across the app
export { toast };

const NAV = [
  {
    group: "Workspace",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutGrid, exact: true },
      { to: "/projects", label: "My Projects", icon: FolderClosed },
      { to: "/suites", label: "Test Suites", icon: Layers },
      { to: "/planner", label: "Test Plan", icon: ClipboardList },
      { to: "/generate", label: "Generate Tests", icon: Sparkles },
      { to: "/recordings", label: "Recordings", icon: Video },
      { to: "/runs", label: "Test Runs", icon: History },
      { to: "/bugs", label: "Bugs", icon: Bug },
    ],
  },
  {
    group: "Insights",
    items: [
      { to: "/analytics", label: "Analytics", icon: BarChart3 },
      { to: "/regression", label: "Regression", icon: FlaskConical },
      { to: "/traceability", label: "Traceability", icon: ShieldCheck },
      { to: "/reports", label: "Reports", icon: BookOpen },
    ],
  },
  {
    group: "Account",
    items: [
      { to: "/integrations", label: "Integrations", icon: Plug },
      { to: "/account/super-admin", label: "SuperAdmin", icon: ShieldAlert },
      { to: "/settings", label: "Settings", icon: Settings },
      { to: "/help", label: "Help & Docs", icon: LifeBuoy },
    ],
  },
] as const;

const ROLE_NAV_LABELS: Record<string, readonly string[]> = {
  owner: [
    "Dashboard",
    "My Projects",
    "Test Suites",
    "Generate Tests",
    "Test Plan",
    "Recordings",
    "Test Runs",
    "Bugs",
    "Integrations",
    "Analytics",
    "Regression",
    "Traceability",
    "Reports",
    "Settings",
    "Help & Docs",
  ],
  admin: [
    "Dashboard",
    "My Projects",
    "Test Suites",
    "Generate Tests",
    "Test Plan",
    "Recordings",
    "Test Runs",
    "Bugs",
    "Integrations",
    "Analytics",
    "Regression",
    "Traceability",
    "Reports",
    "Settings",
    "Help & Docs",
  ],
  editor: [
    "Dashboard",
    "My Projects",
    "Test Suites",
    "Generate Tests",
    "Test Plan",
    "Recordings",
    "Test Runs",
    "Bugs",
    "Analytics",
    "Regression",
    "Traceability",
    "Reports",
    "Settings",
    "Help & Docs",
  ],
  viewer: [
    "Dashboard",
    "Test Runs",
    "Bugs",
    "Analytics",
    "Regression",
    "Traceability",
    "Reports",
    "Settings",
    "Help & Docs",
  ],
};

function AppLayout() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [onboardingComplete, setOnboardingComplete] = useState(() => {
    if (typeof window === "undefined" || !auth.user?.id) return false;
    return (
      localStorage.getItem(`fieldnotes.user.${auth.user.id}.onboardingComplete`) === "true" &&
      !!localStorage.getItem("fieldnotes.workspace.meta")
    );
  });

  // Authentication and onboarding gatekeeper. Runs whenever auth session, loading state, or user metadata updates.
  useEffect(() => {
    if (auth.loading) return;

    if (!auth.session) {
      // 1. Redirection if user is not signed in
      navigate({ to: "/auth" });
    } else if (!auth.user?.email_confirmed_at) {
      // 2. Gatekeeper: if email is not verified, redirect to verification pending screen
      if (auth.user?.email) {
        supabase.auth.resend({ type: "signup", email: auth.user.email }).catch(console.error);
      }
      navigate({ to: "/auth/verify-pending" });
    } else {
      // 3. User is authenticated. Setup database-sync parameters.
      if (auth.user?.id) {
        const uEmail = auth.user.email || "";
        const uName = auth.user.user_metadata?.name || uEmail.split("@")[0] || "Workspace Owner";
        initializeStores(auth.user.id, uEmail, uName);

        // BUG 3 PART B: Detect pending invite
        const uEmailLower = uEmail.toLowerCase();
        const sharedInvites = JSON.parse(
          localStorage.getItem("fieldnotes.pending_invites") || "{}"
        );
        const pendingInvite = sharedInvites[uEmailLower];
        if (
          pendingInvite &&
          pendingInvite.status === "pending" &&
          pendingInvite.expiresAt > Date.now()
        ) {
          localStorage.setItem(
            `fieldnotes.invite_pending.${auth.user.id}`,
            JSON.stringify(pendingInvite)
          );
        }
      }

      // 4. Force new users to complete onboarding sequence before dashboard access
      const completed =
        typeof window !== "undefined" &&
        localStorage.getItem(`fieldnotes.user.${auth.user?.id}.onboardingComplete`) === "true" &&
        !!localStorage.getItem("fieldnotes.workspace.meta");
      setOnboardingComplete(completed);
      if (!completed) {
        navigate({ to: "/onboarding" });
      }
    }
  }, [auth.session, auth.user, auth.loading, navigate]);

  // Show generic loading spinner until auth state resolves, email is verified, and onboarding is completed.
  if (auth.loading || !auth.session || !auth.user?.email_confirmed_at || !onboardingComplete) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-foreground" />
      </div>
    );
  }

  return (
    <PanelProvider>
      <InviteAcceptModal userId={auth.user?.id ?? ""} />
      <AppShell />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            fontFamily: "var(--font-sans)",
            background: "var(--c-bg-card)",
            color: "var(--c-text)",
            border: "1px solid var(--c-border)",
            borderRadius: "12px",
            boxShadow: "var(--shadow-md)",
          },
        }}
      />
    </PanelProvider>
  );
}

function AppShell() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const location = useRouterState({ select: (s) => s.location.pathname });
  const { isOpen: panelOpen, closePanel } = usePanel();
  const [pageSearchOpen, setPageSearchOpen] = useState(false);
  const [pageQuery, setPageQuery] = useState("");
  const [matchCount, setMatchCount] = useState(0);
  const [activeMatchIndex, setActiveMatchIndex] = useState<number>(-1);
  const highlightElementsRef = useRef<HTMLElement[]>([]);

  const removePageHighlights = useCallback(() => {
    const container = document.querySelector(".page-content");
    if (!container) return;
    const highlights = container.querySelectorAll(".custom-highlight");
    highlights.forEach((span) => {
      const parent = span.parentNode;
      if (parent) {
        const textNode = document.createTextNode(span.textContent || "");
        parent.replaceChild(textNode, span);
      }
    });
    container.normalize();
    highlightElementsRef.current = [];
  }, []);

  const closePageSearch = useCallback(() => {
    setPageSearchOpen(false);
    setPageQuery("");
    setMatchCount(0);
    setActiveMatchIndex(-1);
    removePageHighlights();
  }, [removePageHighlights]);

  const applyPageHighlights = useCallback(
    (query: string) => {
      removePageHighlights();
      const container = document.querySelector(".page-content");
      if (!container || !query.trim()) {
        setMatchCount(0);
        setActiveMatchIndex(-1);
        return;
      }

      const lowercaseQuery = query.toLowerCase().trim();
      const textNodes: Text[] = [];

      const walk = (node: Node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          if (
            el.tagName === "SCRIPT" ||
            el.tagName === "STYLE" ||
            el.tagName === "TEXTAREA" ||
            el.tagName === "INPUT" ||
            el.tagName === "SELECT" ||
            el.closest(".search-overlay-container") ||
            el.closest("header")
          ) {
            return;
          }
        }

        if (node.nodeType === Node.TEXT_NODE) {
          const val = node.nodeValue || "";
          if (val.toLowerCase().includes(lowercaseQuery)) {
            textNodes.push(node as Text);
          }
        } else {
          const children = Array.from(node.childNodes);
          children.forEach(walk);
        }
      };

      walk(container);

      const matches: HTMLElement[] = [];
      const regex = new RegExp(`(${escapeRegExp(lowercaseQuery)})`, "gi");

      textNodes.forEach((node) => {
        const parent = node.parentNode;
        if (!parent) return;

        const text = node.nodeValue || "";
        const parts = text.split(regex);
        const fragment = document.createDocumentFragment();

        parts.forEach((part) => {
          if (part.toLowerCase() === lowercaseQuery) {
            const span = document.createElement("span");
            span.className = "custom-highlight";
            span.textContent = part;
            fragment.appendChild(span);
            matches.push(span);
          } else if (part) {
            fragment.appendChild(document.createTextNode(part));
          }
        });

        parent.replaceChild(fragment, node);
      });

      highlightElementsRef.current = matches;
      setMatchCount(matches.length);
      if (matches.length > 0) {
        setActiveMatchIndex(0);
        matches[0].classList.add("custom-highlight-active");
        matches[0].scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        setActiveMatchIndex(-1);
      }
    },
    [removePageHighlights],
  );

  const handlePageSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPageQuery(val);
    applyPageHighlights(val);
  };

  const handleNextMatch = useCallback(() => {
    const matches = highlightElementsRef.current;
    if (matches.length <= 1) return;

    if (activeMatchIndex >= 0 && activeMatchIndex < matches.length) {
      matches[activeMatchIndex].classList.remove("custom-highlight-active");
    }

    const nextIndex = (activeMatchIndex + 1) % matches.length;
    setActiveMatchIndex(nextIndex);

    matches[nextIndex].classList.add("custom-highlight-active");
    matches[nextIndex].scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeMatchIndex]);

  useEffect(() => {
    closePageSearch();
  }, [location, closePageSearch]);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [projects] = useProjects();
  const [tokens] = useTokens();
  const [bugs] = useBugs();

  const openBugsCount = bugs.filter(
    (b) => !b.is_resolved && projects.some((p) => p.id === b.project_id),
  ).length;

  // Theme support
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme");
      if (saved === "light" || saved === "dark") return saved;
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "light";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Detailed New Project Modal state
  const [newProjectModalOpen, setNewProjectModalOpen] = useState(false);
  const [notifications] = useNotifications();
  const [notifOpen, setNotifOpen] = useState(false);
  const unreadNotifCount = notifications.filter((n) => !n.read).length;

  // Sidebar auth gating: hide most nav items when user has no projects
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    if (auth.session?.access_token) {
      checkSuperAdminStatus({ data: { accessToken: auth.session.access_token } })
        .then((res) => {
          setIsSuperAdmin(res.isSuperAdmin);
        })
        .catch(console.error);
    } else {
      setIsSuperAdmin(false);
    }
  }, [auth.session?.access_token]);

  const { currentUser } = useUserStore();
  const role = currentUser?.role ?? "viewer";

  const hasProjects = projects.length > 0;
  const GATED_LABELS = new Set(["Dashboard", "Settings", "Help & Docs", "SuperAdmin"]);

  const roleLabels = ROLE_NAV_LABELS[role] || ROLE_NAV_LABELS.viewer;

  const filteredNav = NAV.map((g) => ({
    ...g,
    items: g.items.filter((it) => {
      let isAllowed = roleLabels.includes(it.label);
      if (it.label === "SuperAdmin") {
        isAllowed = isSuperAdmin;
      }
      if (!hasProjects && !GATED_LABELS.has(it.label)) {
        isAllowed = false;
      }
      return isAllowed;
    }),
  })).filter((g) => g.items.length > 0);

  // Close mobile sidebar on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  // Close panel on navigation
  useEffect(() => {
    closePanel();
  }, [location, closePanel]);

  // Ctrl+K page search shortcut
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPageSearchOpen((prev) => {
          if (prev) {
            closePageSearch();
            return false;
          } else {
            setPageQuery("");
            setMatchCount(0);
            setActiveMatchIndex(-1);
            return true;
          }
        });
      }
    },
    [closePageSearch],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const userEmail = auth.user?.email || "";
  const userName = auth.user?.user_metadata?.name || userEmail.split("@")[0];
  const userPicture = auth.user?.user_metadata?.picture;
  const provider = auth.user?.app_metadata?.provider || "email";

  return (
    <div className="flex h-screen flex-col bg-[var(--c-bg)] text-[var(--c-text)]">
      {/* Mobile top bar (optional, keeping minimal for mobile) */}
      <div className="flex items-center justify-between border-b border-[var(--c-border)] px-4 py-3 md:hidden">
        <Link
          to="/"
          className="font-display text-[26px] transition-transform duration-300 hover:scale-[1.02]"
        >
          QAMind AI
        </Link>
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-sm border border-[var(--c-border)] p-2"
        >
          <Menu className="h-4 w-4" />
        </button>
      </div>

      {/* Topbar */}
      <header className="sticky top-0 z-20 hidden h-[52px] shrink-0 items-center gap-4 bg-[var(--c-topbar)] px-4 md:flex md:px-6">
        <Link to="/" className="mr-4 flex w-[186px] shrink-0 items-center text-white">
          <span
            className="font-display font-medium transition-transform duration-300 hover:scale-[1.02]"
            style={{ fontSize: "20px", letterSpacing: "-0.01em" }}
          >
            QAMind AI
          </span>
        </Link>
        <button
          onClick={() => setPageSearchOpen(true)}
          className="flex max-w-2xl flex-1 items-center gap-3 rounded-[8px] border border-white/10 bg-white/5 px-3 py-1.5 text-left text-[#888] outline-none transition-all duration-[var(--t-normal)] hover:border-white/25 hover:bg-white/10 focus:border-white/25 focus:bg-white/10"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-[13px]">Search on this page...</span>
          <span className="font-mono text-[10px]">Ctrl+K</span>
        </button>
        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
            className="rounded-[8px] border border-white/10 bg-white/5 p-2 text-white transition-all duration-[var(--t-normal)] hover:border-white/25 hover:bg-white/10"
            title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          >
            {theme === "light" ? (
              <Moon className="h-[15px] w-[15px]" />
            ) : (
              <Sun className="h-[15px] w-[15px]" />
            )}
          </button>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative rounded-[8px] border border-white/10 bg-white/5 p-2 text-white transition-all duration-[var(--t-normal)] hover:border-white/25 hover:bg-white/10"
            title="Notifications"
          >
            <Bell className="h-[15px] w-[15px]" />
            {unreadNotifCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--c-accent)] text-[9px] font-bold text-white animate-pulse">
                {unreadNotifCount > 9 ? "9+" : unreadNotifCount}
              </span>
            )}
          </button>
          {can(role, "project:create") && (
            <button
              onClick={() => setNewProjectModalOpen(true)}
              className="rounded-[8px] bg-[var(--c-accent)] px-4 py-1.5 text-[13px] font-medium text-white transition-all duration-[var(--t-normal)] ease-[var(--ease)] hover:-translate-y-[1px] hover:bg-[var(--c-accent-dark)] hover:shadow-[0_4px_12px_rgba(196,85,26,0.35)]"
            >
              + New project
            </button>
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Sidebar */}
        <aside
          className={`${mobileOpen ? "fixed inset-0 z-40 block" : "hidden"} md:sticky md:top-0 md:block md:w-[210px] md:shrink-0 md:border-r md:border-[var(--c-border)] md:bg-[var(--c-bg-sidebar)]`}
        >
          <div
            className={`${mobileOpen ? "absolute inset-y-0 left-0 w-[210px] bg-[var(--c-bg-sidebar)] border-r border-[var(--c-border)]" : ""} flex h-full flex-col`}
          >
            {mobileOpen && (
              <div className="flex items-center justify-between border-b border-[var(--c-border)] px-5 py-5 md:hidden">
                <span className="font-display text-lg">QAMind AI</span>
                <button onClick={() => setMobileOpen(false)}>
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
             <nav className="flex-1 overflow-y-auto px-3 py-2">
              {filteredNav.map((g) => (
                <div key={g.group} className="mb-2">
                  <p className="mb-[4px] mt-[20px] px-3 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--c-text-dim)] flex items-center justify-between">
                    <span>
                      {g.group}
                    </span>
                    {g.group === "Workspace" && can(role, "workspace:viewKey") && (
                      <span className="rounded-full bg-amber-500/15 text-[8.5px] text-amber-600 dark:text-amber-400 px-1.5 py-0.2 font-mono font-medium uppercase tracking-wider scale-90">
                        Owner Control
                      </span>
                    )}
                  </p>
                  <ul className="space-y-[2px]">
                    {g.items.map((it) => (
                      <li key={it.to}>
                        <Link
                          to={it.to}
                          activeOptions={{ exact: (it as any).exact }}
                          activeProps={{
                            className:
                              "bg-[var(--c-accent-soft)] text-[var(--c-accent)] font-medium",
                          }}
                          inactiveProps={{
                            className:
                              "text-[var(--c-text-muted)] hover:bg-[var(--c-bg-hover)] hover:text-[var(--c-text)]",
                          }}
                          className="flex h-[34px] items-center gap-[8px] rounded-[6px] px-[10px] text-[13.5px] transition-all duration-[var(--t-fast)] hover:translate-x-[4px] w-full"
                        >
                          <it.icon className="h-[16px] w-[16px] shrink-0" />
                          <span className="flex-1 truncate">{it.label}</span>
                          {it.label === "Bugs" && openBugsCount > 0 && (
                            <span className="rounded-full bg-[var(--c-fail)] px-1.5 py-[1px] font-mono text-[9px] font-bold text-white shrink-0 leading-none">
                              {openBugsCount}
                            </span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>

            {/* Viewer Special Access Card */}
            {!can(role, "suite:create") && (
              <div className="mx-3 my-2 rounded-[12px] border border-[var(--c-border)] bg-[var(--c-bg-card)] p-4 space-y-3 shadow-[var(--shadow-sm)]">
                <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--c-text-muted)] font-bold">
                  Your Access
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[12px] text-[var(--c-text-muted)]">
                    <span className="text-[12px] text-[var(--c-text-dim)]">👁</span>
                    <span>View runs & bugs</span>
                  </div>
                  <div className="flex items-center gap-2 text-[12px] text-[var(--c-text-muted)]">
                    <span className="text-[12px] text-[var(--c-text-dim)]">👁</span>
                    <span>Read reports</span>
                  </div>
                  <div className="flex items-center gap-2 text-[12px] text-[var(--c-text-muted)]">
                    <span className="text-[12px] text-[var(--c-text-dim)]">👁</span>
                    <span>Monitor analytics</span>
                  </div>
                </div>
                <p className="text-[10px] text-[var(--c-text-dim)] leading-normal pt-2 border-t border-[var(--c-border)]/50">
                  Need more access? Contact your workspace Owner.
                </p>
              </div>
            )}

            {/* Token & Plan Widget */}
            <div className="border-t border-[var(--c-border)] px-4 py-4 space-y-2.5 bg-[rgba(26,23,20,0.02)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Coins className="h-3.5 w-3.5 text-[var(--c-accent)]" />
                  <span className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--c-text-muted)]">
                    Tokens
                  </span>
                </div>
                <span
                  className={`rounded-sm px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider ${tokens.plan === "Premium" ? "bg-[var(--c-accent-soft)] text-[var(--c-accent)]" : "bg-[var(--c-bg-hover)] text-[var(--c-text-muted)] border border-[var(--c-border)]"}`}
                >
                  {tokens.plan}
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex items-baseline justify-between text-[13px] font-medium">
                  <span>{tokens.plan === "Premium" ? "Unlimited" : `${tokens.balance} pts`}</span>
                  <span className="font-mono text-[10px] text-[var(--c-text-muted)]">
                    {tokens.plan === "Premium" ? "" : `/ ${tokens.maxTokens}`}
                  </span>
                </div>
                {tokens.plan !== "Premium" && (
                  <div className="h-[5px] w-full bg-[var(--c-bg-hover)] rounded-full overflow-hidden border border-[var(--c-border)]">
                    <div
                      className="h-full bg-[var(--c-accent)] rounded-full transition-all duration-[var(--t-slow)]"
                      style={{
                        width: `${Math.min(100, (tokens.balance / tokens.maxTokens) * 100)}%`,
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="group relative flex cursor-pointer items-center gap-3 border-t border-[var(--c-border)] px-[10px] py-[12px] transition-colors hover:bg-[var(--c-bg-hover)]">
              {userPicture ? (
                <img
                  src={userPicture}
                  alt=""
                  className="h-[28px] w-[28px] shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full bg-[var(--c-accent)] text-[11px] font-medium text-white">
                  {userName[0]?.toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1 pr-6 flex flex-col justify-center">
                <div className="flex items-center justify-between w-full">
                  <p className="max-w-[100px] truncate text-[13px] font-medium text-[var(--c-text)]">
                    {userName}
                  </p>
                  {can(role, "settings:plan") ? (
                    <Link
                      to="/settings"
                      hash="plan"
                      onClick={(e) => e.stopPropagation()}
                      className={`rounded-full px-2 py-0.5 font-mono text-[8px] font-bold tracking-wider transition-all hover:-translate-y-[0.5px] ${
                        tokens.plan === "Premium"
                          ? "bg-amber-500 text-white hover:bg-amber-600 shadow-sm animate-pulse"
                          : "bg-gray-200 text-gray-800 hover:bg-gray-300 border border-gray-300"
                      }`}
                    >
                      {tokens.plan}
                    </Link>
                  ) : (
                    <span
                      className={`rounded-full px-2 py-0.5 font-mono text-[8px] font-bold tracking-wider ${
                        tokens.plan === "Premium"
                          ? "bg-amber-500/20 text-amber-600"
                          : "bg-gray-200/50 text-gray-600"
                      }`}
                    >
                      {tokens.plan}
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex">
                  {(() => {
                    const rBadge = (() => {
                      switch (role) {
                        case "owner":
                          return { bg: "#F59E0B", text: "#FFFFFF", label: "Owner" };
                        case "admin":
                          return { bg: "var(--c-accent)", text: "#FFFFFF", label: "Admin" };
                        case "editor":
                          return { bg: "#3B82F6", text: "#FFFFFF", label: "Editor" };
                        case "viewer":
                        default:
                          return { bg: "#64748B", text: "#FFFFFF", label: "Viewer" };
                      }
                    })();
                    return (
                      <span
                        style={{ backgroundColor: rBadge.bg, color: rBadge.text }}
                        className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-sans text-[8px] font-bold uppercase tracking-wider"
                      >
                        {can(role, "workspace:viewKey") && <Star className="h-[8px] w-[8px] fill-current" />}
                        {rBadge.label}
                      </span>
                    );
                  })()}
                </div>
              </div>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  await signOut();
                  navigate({ to: "/welcome" });
                }}
                title="Sign out"
                className="absolute right-[10px] text-[var(--c-text-muted)] opacity-0 transition-opacity hover:text-[var(--c-accent)] group-hover:opacity-100"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
          {mobileOpen && (
            <button
              className="absolute inset-0 -z-0 bg-black/20 md:hidden"
              onClick={() => setMobileOpen(false)}
            />
          )}
        </aside>

        {/* Main content area */}
        <div className="flex min-w-0 flex-1 flex-col bg-[var(--c-bg)]">
          {/* Content with optional panel */}
          <div className="flex min-h-0 flex-1">
            {/* Main panel */}
            <main
              className={`page-content flex-1 overflow-y-auto px-6 py-8 transition-all md:px-10 md:py-10 ${panelOpen ? "max-w-[calc(100%-420px)]" : ""}`}
            >
              <Outlet />
            </main>

            {/* Detail panel */}
            {panelOpen && (
              <div className="hidden w-[420px] shrink-0 overflow-hidden md:block">
                <PanelShell />
              </div>
            )}
          </div>

          {/* Mobile detail panel overlay */}
          {panelOpen && (
            <div className="fixed inset-0 z-50 md:hidden">
              <button className="absolute inset-0 bg-black/20" onClick={closePanel} />
              <div className="absolute bottom-0 right-0 top-0 w-full max-w-md bg-[var(--c-bg-card)]">
                <PanelShell />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Command palette */}
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />

      {/* Page Search Overlay */}
      {pageSearchOpen && (
        <div className="fixed left-1/2 top-4 z-[9999] w-full max-w-md -translate-x-1/2 rounded-[12px] border border-[var(--c-border)] bg-[var(--c-bg-card)] p-4 shadow-[var(--shadow-lg)] animate-[fade-in-up_var(--t-normal)]">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-[var(--c-text-muted)]" />
            <input
              autoFocus
              value={pageQuery}
              onChange={handlePageSearchChange}
              placeholder="Search on this page..."
              className="flex-1 bg-transparent text-[14px] outline-none text-[var(--c-text)] placeholder-[var(--c-text-muted)]"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  closePageSearch();
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  handleNextMatch();
                }
              }}
            />
            <button
              onClick={closePageSearch}
              className="rounded-full p-1 text-[var(--c-text-muted)] hover:bg-[var(--c-bg-hover)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2.5 flex items-center justify-between font-mono text-[10px] text-[var(--c-text-muted)] border-t border-[var(--c-border)] pt-2">
            <span>
              {matchCount} match{matchCount !== 1 ? "es" : ""} found
            </span>
            <span>Press ESC to close</span>
          </div>
        </div>
      )}

      {/* Project Selection Modal */}
      <ProjectSelectionModal
        open={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        onSelect={(id) => {
          setProjectModalOpen(false);
          navigate({ to: "/generate", search: { projectId: id } });
        }}
        onSkip={() => {
          setProjectModalOpen(false);
          navigate({ to: "/generate" });
        }}
      />

      <DetailedNewProjectModal
        open={newProjectModalOpen}
        onClose={() => setNewProjectModalOpen(false)}
      />

      {/* Non-dismissible Token Exhausted Upgrade Modal */}
      {tokens.plan === "Standard" && tokens.balance === 0 && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(26,23,20,0.65)] p-4 backdrop-blur-[6px]">
          <div className="w-full max-w-md rounded-[16px] border border-[var(--c-border)] bg-[var(--c-bg-card)] p-8 text-center shadow-[var(--shadow-lg)]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--c-accent-soft)] text-[var(--c-accent)] mb-6">
              <Coins className="h-8 w-8" />
            </div>
            <h2 className="font-display text-[30px] leading-tight text-[var(--c-text)]">
              Tokens Exhausted
            </h2>
            <p className="mt-4 text-[14px] text-[var(--c-text-muted)] leading-relaxed">
              You've run out of tokens in your Standard account. Upgrade to Premium for higher
              limits, priority generations, and unlimited execution power.
            </p>
            <button
              onClick={() => {
                setPlan("Premium");
                toast.success("Successfully upgraded to Premium Plan! Tokens refilled.");
              }}
              className="mt-8 w-full rounded-[8px] bg-[var(--c-text)] px-5 py-3 text-[14px] font-medium text-[var(--c-bg)] transition-all hover:-translate-y-[1px] hover:opacity-90 hover:shadow-[var(--shadow-md)]"
            >
              Upgrade to Premium
            </button>
            <div className="mt-4">
              <button
                onClick={async () => {
                  await signOut();
                  navigate({ to: "/welcome" });
                }}
                className="text-[12px] text-[var(--c-text-muted)] hover:underline"
              >
                Or sign out and switch accounts
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Drawer overlay */}
      {notifOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-[2px]">
          <div className="absolute inset-0" onClick={() => setNotifOpen(false)} />
          <div className="relative z-10 flex h-full w-full max-w-sm flex-col border-l border-[var(--c-border)] bg-[var(--c-bg-card)] p-6 shadow-[var(--shadow-lg)] animate-[slide-in-right_var(--t-normal)_var(--ease-out)_both]">
            <div className="flex items-center justify-between border-b border-[var(--c-border)] pb-4">
              <div>
                <h3 className="font-display text-[22px]">Notifications</h3>
                <p className="font-mono text-[10px] text-[var(--c-text-muted)] uppercase tracking-wider">
                  {unreadNotifCount > 9 ? "9+" : unreadNotifCount} unread
                </p>
              </div>
              <button
                onClick={() => setNotifOpen(false)}
                className="rounded-full p-2 text-[var(--c-text-muted)] hover:bg-[var(--c-bg-hover)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 flex gap-2 border-b border-[var(--c-border)] pb-3">
              <button
                onClick={() => {
                  markAllNotificationsAsRead();
                  toast.success("All notifications marked as read");
                }}
                disabled={notifications.length === 0}
                className="flex-1 rounded-[6px] border border-[var(--c-border)] bg-[var(--c-bg)] py-1.5 text-center font-mono text-[10px] uppercase tracking-wider font-semibold text-[var(--c-text)] hover:bg-[var(--c-bg-hover)] disabled:opacity-50"
              >
                Mark Read
              </button>
              <button
                onClick={() => {
                  deleteAllNotifications();
                  toast.success("All notifications deleted");
                }}
                disabled={notifications.length === 0}
                className="flex-1 rounded-[6px] border border-[var(--c-border)] bg-[var(--c-bg)] py-1.5 text-center font-mono text-[10px] uppercase tracking-wider font-semibold text-[var(--c-fail)] hover:bg-[var(--c-fail-soft)] disabled:opacity-50"
              >
                Delete All
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-[var(--c-text-muted)]">
                  <Bell className="h-8 w-8 opacity-40 mb-3" />
                  <p className="text-[13px] font-medium">All caught up!</p>
                  <p className="text-[11px] opacity-75 mt-1">No new notifications.</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => markNotificationAsRead(n.id)}
                    className={`relative cursor-pointer rounded-[8px] border p-4 transition-all duration-[var(--t-fast)] ${
                      n.read
                        ? "border-[var(--c-border)] bg-transparent"
                        : "border-[var(--c-accent)]/30 bg-[var(--c-accent-soft)]/20 shadow-[var(--shadow-sm)]"
                    }`}
                  >
                    {!n.read && (
                      <span className="absolute left-2 top-2 h-1.5 w-1.5 rounded-full bg-[var(--c-accent)]" />
                    )}
                    <div className="flex items-start justify-between gap-2 pl-1.5">
                      <div className="space-y-0.5">
                        <p
                          className={`text-[13px] leading-tight font-medium ${n.read ? "text-[var(--c-text)]" : "text-[var(--c-accent)] font-semibold"}`}
                        >
                          {n.title}
                        </p>
                        <p className="text-[12px] text-[var(--c-text-muted)] leading-normal">
                          {n.message}
                        </p>
                        <p className="font-mono text-[9px] text-[var(--c-text-dim)] pt-1">
                          {new Date(n.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(n.id);
                          toast.success("Notification deleted");
                        }}
                        className="rounded-full p-1 text-[var(--c-text-muted)] hover:bg-[var(--c-bg-hover)] hover:text-[var(--c-fail)]"
                        title="Delete notification"
                      >
                        <Trash className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectSelectionModal({
  open,
  onClose,
  onSelect,
  onSkip,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (projectId: string) => void;
  onSkip: () => void;
}) {
  const [projects] = useProjects();
  const [suites] = useSuites();
  const [newProjectName, setNewProjectName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(26,23,20,0.4)] p-4 backdrop-blur-[4px] animate-[fade-in-up_var(--t-normal)_var(--ease-out)_both]">
      <div className="w-full max-w-lg rounded-[16px] border border-[var(--c-border)] bg-[var(--c-bg-card)] p-[28px] shadow-[var(--shadow-lg)]">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="font-display text-[26px]">Where should this go?</h2>
            <p className="mt-1 text-[14px] text-[var(--c-text-muted)]">
              Select a project to attach this test case to.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-[var(--c-text-muted)] transition-colors hover:bg-[var(--c-bg-hover)] hover:text-[var(--c-accent)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[300px] overflow-y-auto rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg)]">
          {projects.map((p) => {
            const suiteCount = suites.filter((s) => s.projectId === p.id).length;
            return (
              <button
                key={p.id}
                onClick={() => onSelect(p.id)}
                className="flex w-full items-center justify-between border-b border-[var(--c-border)] p-4 text-left hover:bg-[var(--c-bg-hover)] transition-colors last:border-b-0"
              >
                <span className="font-medium text-[14px] text-[var(--c-text)]">{p.name}</span>
                <div className="flex items-center gap-4 text-[12px] text-[var(--c-text-muted)]">
                  <span>{suiteCount} suites</span>
                  <span className="font-mono text-[10px]">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </button>
            );
          })}
          {projects.length === 0 && (
            <div className="p-4 text-[13px] text-[var(--c-text-muted)] text-center">
              No projects yet. Create one below.
            </div>
          )}
        </div>

        <div className="mt-4">
          {isCreating ? (
            <input
              autoFocus
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newProjectName.trim()) {
                  const newProject = createProject(newProjectName.trim());
                  onSelect(newProject.id);
                  setNewProjectName("");
                  setIsCreating(false);
                } else if (e.key === "Escape") {
                  setIsCreating(false);
                }
              }}
              placeholder="Project name... (Press Enter to create)"
              className="w-full rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg-input)] p-[12px] text-[14px] outline-none transition-all duration-[var(--t-fast)] focus:border-[var(--c-accent)] focus:shadow-[0_0_0_3px_var(--c-accent-soft)]"
            />
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className="text-[13px] font-medium text-[var(--c-accent)] hover:text-[var(--c-accent-dark)]"
            >
              + Create new project
            </button>
          )}
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={onSkip}
            className="text-[13px] text-[var(--c-text-muted)] hover:text-[var(--c-text)]"
          >
            Skip / No project
          </button>
        </div>
      </div>
    </div>
  );
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function InviteAcceptModal({ userId }: { userId: string }) {
  const [invite, setInvite] = useState<any>(null);

  useEffect(() => {
    const pending = localStorage.getItem(`fieldnotes.invite_pending.${userId}`);
    if (pending) {
      const parsed = JSON.parse(pending);
      const accepted = localStorage.getItem(`fieldnotes.accepted_role.${userId}`);
      if (!accepted) {
        setInvite(parsed);
      }
    }
  }, [userId]);

  if (!invite) return null;

  const handleAccept = () => {
    localStorage.setItem(`fieldnotes.accepted_role.${userId}`, invite.assignedRole);
    
    const sharedInvites = JSON.parse(
      localStorage.getItem("fieldnotes.pending_invites") || "{}"
    );
    if (sharedInvites[invite.email]) {
      sharedInvites[invite.email].status = "accepted";
      sharedInvites[invite.email].acceptedAt = Date.now();
      sharedInvites[invite.email].acceptedByUserId = userId;
      localStorage.setItem("fieldnotes.pending_invites", JSON.stringify(sharedInvites));
    }
    
    localStorage.removeItem(`fieldnotes.invite_pending.${userId}`);
    setInvite(null);
    toast.success(`Welcome to ${invite.workspaceName}! You joined as ${invite.assignedRole}.`);
  };

  const handleDecline = () => {
    localStorage.removeItem(`fieldnotes.invite_pending.${userId}`);
    setInvite(null);
    toast("Invite declined.");
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-xl bg-[var(--c-bg-card)] p-6 shadow-2xl border border-[var(--c-border)] relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--c-accent)] to-transparent" />
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-[var(--c-accent)] opacity-10 rounded-full blur-2xl pointer-events-none" />

        <div className="mb-6 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--c-accent-soft)] border border-[var(--c-accent)] shadow-[0_0_15px_rgba(217,103,38,0.3)]">
            <Mail className="h-6 w-6 text-[var(--c-accent)]" />
          </div>
        </div>

        <h2 className="mb-2 text-center font-display text-2xl text-[var(--c-text)]">
          You've been invited
        </h2>
        
        <p className="mb-6 text-center text-sm text-[var(--c-text-muted)]">
          <strong className="text-[var(--c-text)] font-semibold">{invite.inviterName}</strong> invited you to join <strong className="text-[var(--c-text)] font-semibold">{invite.workspaceName}</strong> as <strong className="text-[var(--c-text)] font-semibold">{invite.assignedRole}</strong>.
        </p>

        <div className="mb-8 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-4 shadow-inner">
          <div className="flex items-center gap-3 mb-3 pb-3 border-b border-[var(--c-border)]">
            <div className="h-8 w-8 rounded-full bg-[var(--c-border)] flex items-center justify-center text-xs font-bold text-[var(--c-text)]">
              {invite.workspaceName.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--c-text-dim)] mb-0.5">Workspace</p>
              <p className="text-sm font-medium text-[var(--c-text)]">{invite.workspaceName}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--c-text-dim)] mb-0.5">Role</p>
              <p className="text-sm font-medium text-[var(--c-text)] capitalize">{invite.assignedRole}</p>
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--c-text-dim)] mb-0.5">Job Title</p>
              <p className="text-sm font-medium text-[var(--c-text)]">{invite.jobTitle}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleDecline}
            className="flex-1 rounded-md px-4 py-2.5 text-sm font-medium text-[var(--c-text)] transition-colors hover:bg-[var(--c-bg-hover)] hover:text-white border border-[var(--c-border)]"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            className="flex-1 rounded-md bg-[var(--c-accent)] px-4 py-2.5 text-sm font-medium text-white transition-all hover:brightness-110 shadow-lg shadow-[var(--c-accent)]/20 flex justify-center items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Accept & Join
          </button>
        </div>
      </div>
    </div>
  );
}
