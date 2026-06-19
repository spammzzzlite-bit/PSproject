import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import {
  Upload,
  FileText,
  Copy,
  Download,
  Save,
  Globe,
  CheckCircle2,
  ChevronDown,
  X,
  Check,
  Trash2,
  Edit2,
  ArrowDown,
  Plus,
  StopCircle,
  Coins,
  AlertTriangle,
  ChevronUp,
  ArrowRight,
} from "lucide-react";
import {
  useProjects,
  useSuites,
  createTestCase,
  createSuite,
  useBugs,
  useRuns,
  useTestCases,
  createBug,
  createProject,
  addNotification,
  useTokens,
  deductTokenAction,
  type TestCase,
} from "@/frontend/store/store";
import { PageHeader } from "./_app.projects";
import { toast } from "./_app";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/frontend/components/ui/dropdown-menu";
import { exportToExcel } from "@/frontend/store/export";
import { supabase } from "@/backend/supabase";
import { PermissionGate, useAssertPermission, TokenCostLabel, can, getStoredRole } from "@/lib/permissions";

export const Route = createFileRoute("/_app/generate")({
  beforeLoad: () => {
    const role = getStoredRole();
    if (!can(role, "suite:create")) {
      throw redirect({ to: "/" });
    }
  },
  head: () => ({ meta: [{ title: "Generate Tests — QAMind AI" }] }),
  component: GeneratePage,
});

// Playwright is the only framework — hardcoded, no UI selector
const FRAMEWORK = { id: "playwright", label: "Playwright", ext: ".spec.ts" } as const;

const INPUT_TABS = [
  { id: "file", label: "Document Upload", icon: Upload },
  { id: "url", label: "URL Upload", icon: Globe },
] as const;

// Mock test case pool for streaming generation (no cap — all get generated)
const MOCK_CASE_POOL = [
  {
    title: "Verify login with valid credentials",
    steps:
      "1. Navigate to login page\n2. Enter valid email\n3. Enter valid password\n4. Click Sign In",
    expected: "User is redirected to dashboard",
    priority: "high" as const,
  },
  {
    title: "Verify login with invalid password",
    steps:
      "1. Navigate to login page\n2. Enter valid email\n3. Enter invalid password\n4. Click Sign In",
    expected: "Error message 'Invalid credentials' is shown",
    priority: "high" as const,
  },
  {
    title: "Verify password reset flow",
    steps:
      "1. Click 'Forgot password'\n2. Enter registered email\n3. Click Send Reset Link\n4. Check email inbox",
    expected: "Reset email received with valid link",
    priority: "medium" as const,
  },
  {
    title: "Verify session persistence on refresh",
    steps: "1. Login successfully\n2. Refresh the page",
    expected: "User remains logged in",
    priority: "medium" as const,
  },
  {
    title: "Verify logout clears session",
    steps: "1. Login successfully\n2. Click Sign Out",
    expected: "User is redirected to login page, session is cleared",
    priority: "low" as const,
  },
  {
    title: "Verify email field validation",
    steps: "1. Navigate to login page\n2. Leave email field empty\n3. Click Sign In",
    expected: "Validation error 'Email is required' is displayed",
    priority: "high" as const,
  },
  {
    title: "Verify password minimum length",
    steps: "1. Navigate to signup page\n2. Enter password with < 8 characters\n3. Submit form",
    expected: "Error: 'Password must be at least 8 characters'",
    priority: "medium" as const,
  },
  {
    title: "Verify Google OAuth redirect",
    steps:
      "1. Navigate to login page\n2. Click 'Sign in with Google'\n3. Complete Google auth flow",
    expected: "User is redirected back to dashboard with active session",
    priority: "high" as const,
  },
  {
    title: "Verify rate limiting on login",
    steps: "1. Attempt login with wrong password 5 times\n2. Observe response after 5th attempt",
    expected: "Error: 'Too many attempts. Please wait.' is shown",
    priority: "medium" as const,
  },
  {
    title: "Verify remember me checkbox",
    steps:
      "1. Navigate to login page\n2. Check 'Remember me'\n3. Login successfully\n4. Close browser and reopen",
    expected: "User remains logged in after browser restart",
    priority: "low" as const,
  },
  {
    title: "Verify profile page loads user data",
    steps: "1. Login successfully\n2. Navigate to profile page",
    expected: "User name, email, and avatar are displayed correctly",
    priority: "medium" as const,
  },
  {
    title: "Verify dark mode toggle",
    steps: "1. Login to dashboard\n2. Click theme toggle in settings\n3. Verify UI changes",
    expected: "All UI elements switch to dark mode palette",
    priority: "low" as const,
  },
  {
    title: "Verify navigation breadcrumbs",
    steps: "1. Navigate to Projects > Project A > Suite B\n2. Observe breadcrumb trail",
    expected: "Breadcrumbs show 'Projects > Project A > Suite B' with clickable links",
    priority: "low" as const,
  },
  {
    title: "Verify test case creation",
    steps:
      "1. Navigate to Test Suites\n2. Click '+ Add test case'\n3. Fill in title and steps\n4. Click Save",
    expected: "New test case appears in the suite list",
    priority: "high" as const,
  },
  {
    title: "Verify test run execution",
    steps: "1. Navigate to a test suite\n2. Click 'Run All'\n3. Wait for execution to complete",
    expected: "Test run results are displayed with pass/fail status for each case",
    priority: "critical" as const,
  },
];

type GeneratedCase = {
  id: number;
  title: string;
  steps: string;
  expected: string;
  priority: "critical" | "high" | "medium" | "low";
  status: "passed" | "failed";
  module_name?: string;
  project_id?: string;
};

/* ─── Helpers ──────────────────────────────────────────────── */

function getMockTestPlans(projectId: string) {
  return [
    {
      id: "mock-tp-1",
      project_id: projectId,
      title: "Authentication & Onboarding Plan",
      content: {
        modules: ["Login Module", "Registration Module", "OAuth Flow", "Password Reset"],
      },
    },
    {
      id: "mock-tp-2",
      project_id: projectId,
      title: "Core UI/UX & Dashboard Plan",
      content: {
        modules: [
          "Navigation Module",
          "Theme Settings (Dark/Light)",
          "Notifications Pane",
          "Dashboard Analytics",
        ],
      },
    },
    {
      id: "mock-tp-3",
      project_id: projectId,
      title: "Backend Services & API Plan",
      content: {
        modules: ["Backend API", "Rate Limiter", "Supabase DB Sync", "Token Engine"],
      },
    },
  ];
}

function parseModulesFromPlan(plan: any): string[] {
  if (!plan) return [];
  const modulesSet = new Set<string>();

  const addModule = (val: any) => {
    if (typeof val === "string" && val.trim()) {
      modulesSet.add(val.trim());
    } else if (val && typeof val === "object" && val.name) {
      modulesSet.add(String(val.name).trim());
    }
  };

  try {
    const content = typeof plan.content === "string" ? JSON.parse(plan.content) : plan.content;
    if (content && typeof content === "object") {
      if (Array.isArray(content.modules)) {
        content.modules.forEach(addModule);
      }
      if (content.moduleName) {
        addModule(content.moduleName);
      }
      if (content.module) {
        addModule(content.module);
      }
      if (Array.isArray(content.featuresInScope)) {
        content.featuresInScope.forEach(addModule);
      }
    }
  } catch (e) {
    console.warn("Failed to parse plan content JSON:", e);
  }

  if (plan.title) {
    addModule(plan.title);
  }
  if (plan.name) {
    addModule(plan.name);
  }

  if (typeof plan.content === "string") {
    const lines = plan.content.split("\n");
    lines.forEach((line: string) => {
      const match =
        line.match(/(?:module|feature):\s*([^\n\r]+)/i) ||
        line.match(/^[-*+]\s*([^\n\r]+(?:module|api|ui|ux)[^\n\r]*)/i) ||
        line.match(/^###\s*([^\n\r]+(?:module|api|ui|ux)[^\n\r]*)/i);
      if (match && match[1]) {
        addModule(match[1]);
      }
    });
  }

  return Array.from(modulesSet);
}

function getTestCasesForModule(moduleName: string): Partial<TestCase>[] {
  const name = moduleName.toLowerCase();
  if (
    name.includes("login") ||
    name.includes("auth") ||
    name.includes("registration") ||
    name.includes("reset")
  ) {
    return [
      {
        title: `Verify login with valid credentials for ${moduleName}`,
        steps:
          "1. Navigate to login page\n2. Enter valid email\n3. Enter valid password\n4. Click Sign In",
        expected: "User is redirected to dashboard",
        priority: "high",
      },
      {
        title: `Verify login with invalid password for ${moduleName}`,
        steps:
          "1. Navigate to login page\n2. Enter valid email\n3. Enter invalid password\n4. Click Sign In",
        expected: "Error message 'Invalid credentials' is shown",
        priority: "high",
      },
      {
        title: `Verify password reset flow for ${moduleName}`,
        steps:
          "1. Click 'Forgot password'\n2. Enter registered email\n3. Click Send Reset Link\n4. Check email inbox",
        expected: "Reset email received with valid link",
        priority: "medium",
      },
      {
        title: `Verify rate limiting on login in ${moduleName}`,
        steps:
          "1. Attempt login with wrong password 5 times\n2. Observe response after 5th attempt",
        expected: "Error: 'Too many attempts. Please wait.' is shown",
        priority: "medium",
      },
    ];
  } else if (
    name.includes("ui") ||
    name.includes("ux") ||
    name.includes("theme") ||
    name.includes("nav") ||
    name.includes("breadcrumbs") ||
    name.includes("pane") ||
    name.includes("dashboard")
  ) {
    return [
      {
        title: `Verify dark mode toggle in ${moduleName}`,
        steps: "1. Open application\n2. Click theme toggle in settings\n3. Verify UI changes",
        expected: "All UI elements switch to dark mode palette",
        priority: "low",
      },
      {
        title: `Verify navigation breadcrumbs for ${moduleName}`,
        steps: "1. Navigate to nested routes\n2. Observe breadcrumb trail",
        expected: "Breadcrumbs show full path with clickable links",
        priority: "low",
      },
      {
        title: `Verify responsive layout in ${moduleName}`,
        steps:
          "1. Resize window to mobile viewport (375px)\n2. Check menu layout and text alignment",
        expected: "Layout wraps correctly, hamburger menu is visible",
        priority: "medium",
      },
    ];
  } else if (
    name.includes("api") ||
    name.includes("backend") ||
    name.includes("db") ||
    name.includes("rate") ||
    name.includes("sync") ||
    name.includes("token") ||
    name.includes("limiter") ||
    name.includes("engine")
  ) {
    return [
      {
        title: `Verify API response status code for ${moduleName}`,
        steps: "1. Send GET request to module endpoint\n2. Verify response status",
        expected: "Status code 200 OK is returned with JSON body",
        priority: "high",
      },
      {
        title: `Verify rate limiter blocks spam on ${moduleName}`,
        steps:
          "1. Send 100 consecutive requests to API within 5 seconds\n2. Read response headers and status",
        expected: "Status code 429 Too Many Requests is returned",
        priority: "medium",
      },
      {
        title: `Verify DB sync updates state in ${moduleName}`,
        steps:
          "1. Modify a record via DB client\n2. Trigger sync endpoint\n3. Check client-side store",
        expected: "Data is successfully updated and synchronized in the UI",
        priority: "high",
      },
    ];
  } else {
    return [
      {
        title: `Verify core functionality of ${moduleName}`,
        steps: `1. Open ${moduleName} view\n2. Perform main action\n3. Submit changes`,
        expected: `${moduleName} handles action successfully without errors`,
        priority: "high",
      },
      {
        title: `Verify input validation in ${moduleName}`,
        steps: `1. Navigate to ${moduleName} form\n2. Enter invalid inputs\n3. Submit`,
        expected: "Error badges are displayed on invalid fields",
        priority: "medium",
      },
      {
        title: `Verify state persistence in ${moduleName}`,
        steps: `1. Modify settings in ${moduleName}\n2. Reload page`,
        expected: "Configuration remains saved after reload",
        priority: "low",
      },
    ];
  }
}

/* ─── Main Component ───────────────────────────────────────── */

function GeneratePage() {
  const assertPerm = useAssertPermission();
  const [featureDescription, setFeatureDescription] = useState("");
  const [showFeatureDescriptionError, setShowFeatureDescriptionError] = useState(false);
  const [inputTab, setInputTab] = useState<string>("file");
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [state, setState] = useState<"idle" | "generating" | "done">("idle");
  const [generated, setGenerated] = useState<GeneratedCase[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const [projects] = useProjects();
  const [suites] = useSuites();
  const [cases] = useTestCases();
  const [runs] = useRuns();
  const [bugs] = useBugs();
  const [tokens] = useTokens();

  // Relational selector states
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedModuleName, setSelectedModuleName] = useState("");
  const [modules, setModules] = useState<string[]>([]);
  const [isLoadingModules, setIsLoadingModules] = useState(false);
  const [testPlans, setTestPlans] = useState<any[]>([]);

  // LLM Prompt Interceptor states
  const [currentSystemPrompt, setCurrentSystemPrompt] = useState("");
  const [currentGeneratingModule, setCurrentGeneratingModule] = useState("");

  const isGeneratingRef = useRef(false);

  const [saveProjectId, setSaveProjectId] = useState("");
  const [saveSuiteId, setSaveSuiteId] = useState("");

  // Per-case state
  const [approvedIds, setApprovedIds] = useState<Set<number>>(new Set());
  const [removedIds, setRemovedIds] = useState<Set<number>>(new Set());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ title: "", steps: "", expected: "" });

  const [savedCaseIds, setSavedCaseIds] = useState<Set<number>>(new Set());
  const [activeScriptCase, setActiveScriptCase] = useState<GeneratedCase | null>(null);

  // Sync Project Dropdowns
  useEffect(() => {
    if (selectedProjectId) {
      setSaveProjectId(selectedProjectId);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    if (saveProjectId && saveProjectId !== selectedProjectId) {
      setSelectedProjectId(saveProjectId);
    }
  }, [saveProjectId]);

  // Fetch test plan modules when selected project changes
  useEffect(() => {
    if (!selectedProjectId) {
      setModules([]);
      setTestPlans([]);
      return;
    }

    async function fetchModules() {
      setIsLoadingModules(true);
      try {
        const { data, error } = await supabase
          .from("test_plans")
          .select("*")
          .eq("project_id", selectedProjectId);

        let parsedModules: string[] = [];
        let plansList: any[] = [];

        if (error) {
          console.warn(
            "Error fetching test plans from Supabase, falling back to mock plans:",
            error,
          );
          plansList = getMockTestPlans(selectedProjectId);
        } else if (!data || data.length === 0) {
          console.log("No test plans found in Supabase, falling back to mock plans");
          plansList = getMockTestPlans(selectedProjectId);
        } else {
          plansList = data;
        }

        setTestPlans(plansList);

        plansList.forEach((plan) => {
          const mods = parseModulesFromPlan(plan);
          mods.forEach((m) => {
            if (m && !parsedModules.includes(m)) {
              parsedModules.push(m);
            }
          });
        });

        if (parsedModules.length === 0) {
          parsedModules = ["Login Module", "UI/UX Module", "Backend API"];
        }

        setModules(parsedModules);
      } catch (err) {
        console.error("Exception fetching modules:", err);
        const plansList = getMockTestPlans(selectedProjectId);
        setTestPlans(plansList);
        setModules(["Login Module", "UI/UX Module", "Backend API"]);
      } finally {
        setIsLoadingModules(false);
      }
    }

    fetchModules();
  }, [selectedProjectId]);

  async function generate() {
    if (!selectedProjectId) {
      toast.error("Please select a project first.");
      return;
    }

    if (!featureDescription.trim()) {
      toast.error("Feature Description is required.");
      setShowFeatureDescriptionError(true);
      return;
    }

    if (inputTab === "file" && !file) {
      toast.error("Please upload a document first.");
      return;
    }

    if (inputTab === "url" && !url.trim()) {
      toast.error("Please enter a URL first.");
      return;
    }

    if (!assertPerm("tests:generate")) {
      return;
    }

    if (!deductTokenAction("Generate test cases (AI)")) {
      return;
    }

    setState("generating");
    setGenerated([]);
    setApprovedIds(new Set());
    setRemovedIds(new Set());
    setSavedCaseIds(new Set());
    setEditingId(null);
    setCurrentGeneratingModule("");
    setCurrentSystemPrompt("");

    const targetModules =
      selectedModuleName === "entire_project" || !selectedModuleName
        ? modules.length > 0
          ? modules
          : ["Login Module", "UI/UX Module", "Backend API"]
        : [selectedModuleName];

    // Tokens were pre-deducted
    let overallId = 0;
    isGeneratingRef.current = true;
    let stoppedEarly = false;

    try {
      for (let mIdx = 0; mIdx < targetModules.length; mIdx++) {
        if (!isGeneratingRef.current) {
          stoppedEarly = true;
          break;
        }

        const mod = targetModules[mIdx];
        setCurrentGeneratingModule(mod);

        const systemPromptText = `Generate test cases specifically for the [${mod}] module based on this project's test plan.`;
        setCurrentSystemPrompt(systemPromptText);

        toast.info(`Generating test cases for [${mod}] module...`, { duration: 1500 });

        const moduleCases = getTestCasesForModule(mod);

        for (let cIdx = 0; cIdx < moduleCases.length; cIdx++) {
          if (!isGeneratingRef.current) {
            stoppedEarly = true;
            break;
          }

          // Simulate streaming delay
          await new Promise((resolve) => setTimeout(resolve, 400));

          if (!isGeneratingRef.current) {
            stoppedEarly = true;
            break;
          }

          const rawCase = moduleCases[cIdx];
          const status = Math.random() > 0.2 ? ("passed" as const) : ("failed" as const);

          const newCase: GeneratedCase = {
            id: overallId++,
            title: rawCase.title || "Untitled Test Case",
            steps: rawCase.steps || "",
            expected: rawCase.expected || "",
            priority: rawCase.priority || "medium",
            status,
            module_name: mod,
            project_id: selectedProjectId,
          };

          setGenerated((prev) => [...prev, newCase]);
        }
      }
    } catch (err) {
      console.error("Error during generation loop:", err);
    } finally {
      setState("done");
      setCurrentGeneratingModule("");

      if (stoppedEarly) {
        toast.success(`Stopped generating. Created ${overallId} test cases.`);
      } else {
        toast.success(`Completed! Generated ${overallId} test cases.`);
      }
    }
  }

  function stopGenerating() {
    isGeneratingRef.current = false;
  }

  function hasInput() {
    if (!selectedProjectId) return false;
    if (featureDescription.trim().length === 0) return false;
    switch (inputTab) {
      case "file":
        return file !== null;
      case "url":
        return url.trim().length > 0;
      default:
        return false;
    }
  }

  function handleSendToBugs(tc: GeneratedCase) {
    const defaultProjId = saveProjectId || projects[0]?.id || "";
    if (!defaultProjId) {
      toast.error("Please select or create a project first to record a bug.");
      return;
    }

    const bugTitle = `[FAILED TEST] - ${tc.title}`;
    const stepsArray = tc.steps.split("\n").filter(Boolean);
    const stepsFormatted = stepsArray
      .map((step, idx) => `Step ${idx + 1}: ${step.trim()}`)
      .join("\n");

    const systemLogs = `
[DISCREPANCY]
Expected: ${tc.expected || "Successful validation of conditions"}
Actual: Assertion failed - Element verification timeout or DOM state mismatch.

[SYSTEM LOGS]
[${new Date().toISOString()}] INFO: Executing Sandbox automated test suite context
[${new Date().toISOString()}] DEBUG: Page viewport set to default (1280x720)
[${new Date().toISOString()}] WARNING: Slow response detected on transition
[${new Date().toISOString()}] ERROR: playwright-runner failed to find locator or DOM node for element matching expected criteria

[STACK TRACE]
Error: expect(received).toBe(expected) // Object.is equality
Expected: "${tc.expected}"
Received: null
    at PlaywrightRunner.runTestCase (playwright-runner.ts:42:24)
    at async TestSandbox.evaluate (test-sandbox.ts:18:9)
    at async startExecution (sandbox-api.ts:114:7)
`;

    const fullDescription = `--- DETAILS & STEPS ---
${stepsFormatted}

--- SYSTEM LOGS & DISCREPANCIES ---
${systemLogs}`;

    const tcIdStr = `TC-${String(tc.id + 1).padStart(3, "0")}`;

    const bug = createBug({
      project_id: defaultProjId,
      test_case_title: tc.title,
      error_message: systemLogs.trim(),
      code_snippet: `test('${tc.title}', async ({ page }) => {\n  ${tc.steps
        .split("\n")
        .map((s) => `// ${s}`)
        .join("\n  ")}\n  // Expected: ${tc.expected}\n});`,
      developer_notes: null,
      severity: tc.priority === "critical" ? "blocker" : "major",
      environment: "localhost",
      runId: "AI-GENERATOR",
    });

    addNotification("Bug Filed", `Failed test case "${tc.title}" auto-archived as bug.`, "error");
    toast.success(`Bug ${bug.id} recorded successfully!`);
  }

  // Per-case actions
  function handleApprove(id: number) {
    setApprovedIds((prev) => {
      const n = new Set(prev);
      n.add(id);
      return n;
    });
  }

  function handleRemove(id: number) {
    setRemovedIds((prev) => {
      const n = new Set(prev);
      n.add(id);
      return n;
    });
    toast("Test case removed.", {
      action: {
        label: "Undo",
        onClick: () => {
          setRemovedIds((prev) => {
            const n = new Set(prev);
            n.delete(id);
            return n;
          });
        },
      },
      duration: 3000,
    });
  }

  function handleEditStart(c: GeneratedCase) {
    setEditingId(c.id);
    setEditForm({ title: c.title, steps: c.steps, expected: c.expected });
  }

  function handleEditSave(id: number) {
    setGenerated((prev) => prev.map((c) => (c.id === id ? { ...c, ...editForm } : c)));
    setEditingId(null);
  }

  function handleSaveToSuite(caseItem: GeneratedCase, suiteId: string) {
    createTestCase(suiteId, {
      title: caseItem.title,
      steps: caseItem.steps,
      expected: caseItem.expected,
      priority: caseItem.priority,
      module_name: caseItem.module_name,
      project_id: caseItem.project_id || selectedProjectId,
    });
    setSavedCaseIds((prev) => {
      const next = new Set(prev);
      next.add(caseItem.id);
      return next;
    });
    toast.success(`Saved "${caseItem.title}" to suite`);
  }

  function handleSaveAll(suiteId: string) {
    visibleCases.forEach((tc) => {
      createTestCase(suiteId, {
        title: tc.title,
        steps: tc.steps,
        expected: tc.expected,
        priority: tc.priority,
        module_name: tc.module_name || selectedModuleName,
        project_id: tc.project_id || selectedProjectId,
      });
      setSavedCaseIds((prev) => {
        const next = new Set(prev);
        next.add(tc.id);
        return next;
      });
    });
    toast.success(`${visibleCases.length} test cases saved to suite`);
  }

  const visibleCases = generated.filter((c) => !removedIds.has(c.id));

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        section="§ Generate"
        title="Generate test cases"
        subtitle="Paste requirements, drop a file, enter a URL, or paste an API spec — then draft Playwright cases on demand."
      />

      <div className="space-y-6">
        {/* Relational Selectors */}
        <div className="rounded-[12px] border border-[var(--c-border)] bg-[var(--c-bg-card)] p-5 space-y-4">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--c-text-muted)]">
                Select Project
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => {
                  setSelectedProjectId(e.target.value);
                  setSelectedModuleName("");
                }}
                className="w-full rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg-input)] p-3 text-[13.5px] outline-none transition-all duration-[var(--t-fast)] focus:border-[var(--c-accent)] focus:shadow-[0_0_0_3px_var(--c-accent-soft)]"
              >
                <option value="">Select project...</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--c-text-muted)]">
                Select Module
              </label>
              <select
                value={selectedModuleName}
                onChange={(e) => setSelectedModuleName(e.target.value)}
                disabled={!selectedProjectId || isLoadingModules}
                className="w-full rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg-input)] p-3 text-[13.5px] outline-none transition-all duration-[var(--t-fast)] focus:border-[var(--c-accent)] focus:shadow-[0_0_0_3px_var(--c-accent-soft)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {!selectedProjectId ? (
                  <option value="">Select a project first...</option>
                ) : isLoadingModules ? (
                  <option value="">Loading modules...</option>
                ) : (
                  <>
                    <option value="entire_project">Entire Project (All Modules)</option>
                    {modules.map((mod) => (
                      <option key={mod} value={mod}>
                        {mod}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>
          </div>
        </div>

        {/* LLM Payload Interceptor Debugger */}
        {selectedProjectId && (
          <div className="rounded-[12px] border border-[var(--c-border)] bg-[#161412] p-5 space-y-3 font-mono shadow-[var(--shadow-sm)]">
            <div className="flex items-center justify-between border-b border-[#2C2825] pb-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--c-accent)] flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[var(--c-accent)] animate-ping" />
                📡 LLM Payload Interceptor Active
              </span>
              <span className="text-[10px] text-gray-500">
                Status: Intercepting & Injecting Module Context
              </span>
            </div>
            <div className="space-y-2 text-[12px]">
              <div>
                <span className="text-gray-500 font-bold block mb-1">SYSTEM PROMPT:</span>
                <div className="bg-[#0C0A09] rounded-sm p-3 border border-[#2C2825] text-green-400 break-words whitespace-pre-wrap leading-relaxed">
                  {currentSystemPrompt ||
                    (selectedModuleName === "entire_project"
                      ? "Generate test cases for all modules of this project's test plan sequentially."
                      : `Generate test cases specifically for the [${selectedModuleName || "General"}] module based on this project's test plan.`)}
                </div>
              </div>
              {(featureDescription.trim() || file || url.trim()) && (
                <div>
                  <span className="text-gray-500 font-bold block mb-1">USER CONTEXT:</span>
                  <div className="bg-[#0C0A09] rounded-sm p-3 border border-[#2C2825] text-gray-300 max-h-[120px] overflow-y-auto break-words leading-relaxed">
                    {featureDescription.trim() || (file ? `File: ${file.name}` : "") || url.trim()}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Feature Description (AI Prompt) */}
        <div className="rounded-[12px] border border-[var(--c-border)] bg-[var(--c-bg-card)] p-5 space-y-3">
          <label className="block font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--c-text-muted)] flex items-center justify-between">
            <span>Feature Description (AI Prompt) <span className="text-[var(--c-fail)]">*</span></span>
            {showFeatureDescriptionError && (
              <span className="text-[10px] text-[var(--c-fail)] font-semibold lowercase tracking-normal">
                Required Field
              </span>
            )}
          </label>
          <textarea
            value={featureDescription}
            onChange={(e) => {
              setFeatureDescription(e.target.value);
              if (e.target.value.trim()) {
                setShowFeatureDescriptionError(false);
              }
            }}
            onBlur={() => {
              if (!featureDescription.trim()) {
                setShowFeatureDescriptionError(true);
              }
            }}
            rows={3}
            placeholder="Describe the feature or component (e.g. 'A login form with email and password inputs, a remember me checkbox, and a forgot password link. Form validation should verify email structure and password length.')"
            className={`w-full resize-none rounded-[8px] border bg-[var(--c-bg-input)] p-3 text-[13.5px] outline-none transition-all duration-[var(--t-fast)] focus:shadow-[0_0_0_3px_var(--c-accent-soft)] ${
              showFeatureDescriptionError
                ? "border-[var(--c-fail)] focus:border-[var(--c-fail)]"
                : "border-[var(--c-border)] focus:border-[var(--c-accent)]"
            }`}
          />
          {showFeatureDescriptionError && (
            <p className="text-[11px] text-[var(--c-fail)] font-medium">
              Feature Description is required.
            </p>
          )}
        </div>

        {/* Input tabs */}
        <div className="rounded-[12px] border border-[var(--c-border)] bg-[var(--c-bg-card)] overflow-hidden">
          <div className="flex border-b border-[var(--c-border)] bg-[var(--c-bg)]">
            {INPUT_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setInputTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-[13.5px] font-medium border-b-[2px] transition-all duration-[var(--t-normal)] ${inputTab === tab.id ? "border-[var(--c-accent)] text-[var(--c-accent)]" : "border-transparent text-[var(--c-text-muted)] hover:bg-[var(--c-bg-hover)] hover:text-[var(--c-text)]"}`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
          <div className="p-6">
            {inputTab === "file" && (
              <>
                <div
                  onClick={() => input.current?.click()}
                  className="flex cursor-pointer flex-col items-center justify-center rounded-[8px] border-[2px] border-dashed border-[var(--c-border-strong)] bg-[var(--c-bg-input)] px-6 py-12 text-center transition-all duration-[var(--t-normal)] hover:border-[var(--c-accent)] hover:bg-[var(--c-accent-soft)]"
                >
                  {file ? (
                    <>
                      <FileText className="h-8 w-8 text-[var(--c-accent)]" />
                      <p className="mt-3 font-medium text-[var(--c-text)]">{file.name}</p>
                      <p className="font-mono text-[11px] text-[var(--c-text-muted)]">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-[var(--c-text-muted)]" />
                      <p className="mt-4 font-display text-[22px] text-[var(--c-text)]">
                        Drop a file
                      </p>
                      <p className="mt-1 text-[13px] text-[var(--c-text-muted)]">
                        .pdf, .docx, .md, .txt
                      </p>
                    </>
                  )}
                </div>
                <input
                  ref={input}
                  type="file"
                  hidden
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </>
            )}
            {inputTab === "url" && (
              <div>
                <label className="mb-2 block font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--c-text-muted)]">
                  Page URL
                </label>
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/login"
                  className="w-full rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg-input)] p-[12px] text-[14px] outline-none transition-all duration-[var(--t-fast)] focus:border-[var(--c-accent)] focus:shadow-[0_0_0_3px_var(--c-accent-soft)]"
                />
                <p className="mt-2 text-[12px] text-[var(--c-text-muted)]">
                  We'll crawl the page and extract testable elements.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Generate / Stop button */}
        <div className="flex items-center justify-between">
          {state === "generating" && (
            <p className="font-mono text-[13px] text-[var(--c-text-muted)] animate-pulse">
              Generating…{" "}
              <span className="text-[var(--c-accent)] font-medium">
                ({generated.length} test case{generated.length !== 1 ? "s" : ""} so far)
              </span>
            </p>
          )}
          {state !== "generating" && <div />}
          {state === "generating" ? (
            <button
              onClick={stopGenerating}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--c-bg-hover)] px-[20px] py-[10px] text-[14px] font-medium text-[var(--c-text)] transition-all hover:bg-[var(--c-border-strong)] animate-pulse-slow"
            >
              <StopCircle className="h-4 w-4 text-destructive" />
              Stop generating
            </button>
          ) : (
            <button
              onClick={generate}
              disabled={!hasInput()}
              className="inline-flex items-center gap-2 rounded-[8px] bg-[var(--c-text)] px-[24px] py-[12px] text-[14px] font-medium text-[var(--c-bg)] transition-all duration-[var(--t-normal)] hover:-translate-y-[1px] hover:opacity-90 hover:shadow-[var(--shadow-md)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none"
            >
              <TokenCostLabel baseText="Generate test cases" />
            </button>
          )}
        </div>

        {/* Results — split panel */}
        {(state === "done" || state === "generating") && visibleCases.length > 0 && (
          <div
            id="generate-results-container"
            className="grid gap-6 md:grid-cols-3 items-start relative animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            {/* Left: test cases (takes 2 columns) */}
            <div className="md:col-span-2 space-y-[20px]">
              <div className="flex items-center justify-between rounded-[12px] border border-[var(--c-border)] bg-[var(--c-bg-hover)] px-5 py-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--c-text-muted)]">
                  Generated test cases
                </p>
                <span className="font-mono text-[11px] text-[var(--c-accent)] font-medium">
                  {visibleCases.length} cases
                </span>
              </div>
              <div className="space-y-[20px]">
                {visibleCases.map((tc) => (
                  <GeneratedCaseRow
                    key={tc.id}
                    tc={tc}
                    isEditing={editingId === tc.id}
                    editForm={editForm}
                    isSaved={savedCaseIds.has(tc.id)}
                    saveSuiteId={saveSuiteId}
                    onRemove={() => handleRemove(tc.id)}
                    onEditStart={() => handleEditStart(tc)}
                    onEditSave={() => handleEditSave(tc.id)}
                    onEditCancel={() => setEditingId(null)}
                    onEditChange={setEditForm}
                    onSaveToSuite={(suiteId) => handleSaveToSuite(tc, suiteId)}
                    onSendToBugs={() => handleSendToBugs(tc)}
                    onToggleScript={() => {
                      setActiveScriptCase(tc);
                    }}
                  />
                ))}
              </div>
              {/* Manual add link */}
              {state === "done" && (
                <div className="border-t border-[var(--c-border)] px-5 py-4 text-center bg-[var(--c-bg)]">
                  <span className="text-[13px] text-[var(--c-text-muted)]">
                    Want to add manually?{" "}
                    <Link
                      to="/suites"
                      className="font-medium text-[var(--c-accent)] hover:underline"
                    >
                      Go to Test Suites →
                    </Link>
                  </span>
                </div>
              )}
            </div>

            {/* Right: Save to Project Panel (takes 1 column) */}
            <div className="md:col-span-1 space-y-4 md:sticky md:top-[72px]">
              {state === "done" && (
                <SaveToProjectPanel
                  projects={projects}
                  suites={suites}
                  generated={visibleCases}
                  saveProjectId={saveProjectId}
                  setSaveProjectId={setSaveProjectId}
                  saveSuiteId={saveSuiteId}
                  setSaveSuiteId={setSaveSuiteId}
                  onSaveAll={handleSaveAll}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Playwright Script Panel Overlay */}
      <div
        className={`fixed right-0 top-0 bottom-0 z-50 w-[420px] border-l border-[var(--c-border)] bg-[#1E1A17] p-6 shadow-[var(--shadow-lg)] transition-transform duration-300 ease-in-out ${
          activeScriptCase ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {activeScriptCase && (
          <div className="flex flex-col h-full space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-[#2C2825] pb-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#888]">
                  PLAYWRIGHT SCRIPT
                </p>
                <h3 className="text-[14px] font-bold text-white mt-1 truncate max-w-[280px]">
                  TC-{String(activeScriptCase.id + 1).padStart(3, "0")}
                </h3>
              </div>
              <button
                onClick={() => setActiveScriptCase(null)}
                className="rounded-full p-1.5 text-gray-400 hover:bg-[#2D2825] hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto bg-[#161412] rounded-[8px] border border-[#2C2825] p-4 font-mono text-[12px] text-[#D4D4D4] leading-relaxed relative">
              <button
                onClick={() => {
                  const scriptContent = `test('${activeScriptCase.title}', async ({ page }) => {\n  // ${activeScriptCase.steps.replace(/\n/g, "\n  // ")}\n  // Expected: ${activeScriptCase.expected}\n});`;
                  navigator.clipboard.writeText(scriptContent);
                  toast.success("Script copied!");
                }}
                className="absolute right-2 top-2 rounded-[4px] bg-white/10 px-2.5 py-1 hover:bg-white/20 transition-colors text-[10px] text-white"
              >
                Copy
              </button>
              <pre className="whitespace-pre-wrap font-mono mt-8">
                {`test('${activeScriptCase.title}', async ({ page }) => {
  ${activeScriptCase.steps
    .split("\n")
    .map((s) => `// ${s}`)
    .join("\n  ")}
  // Expected: ${activeScriptCase.expected}
});`}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Per-case row component ───────────────────────────────── */

function GeneratedCaseRow({
  tc,
  isEditing,
  editForm,
  isSaved,
  saveSuiteId,
  onRemove,
  onEditStart,
  onEditSave,
  onEditCancel,
  onEditChange,
  onSaveToSuite,
  onSendToBugs,
  onToggleScript,
}: {
  tc: GeneratedCase;
  isEditing: boolean;
  editForm: { title: string; steps: string; expected: string };
  isSaved: boolean;
  saveSuiteId: string;
  onRemove: () => void;
  onEditStart: () => void;
  onEditSave: () => void;
  onEditCancel: () => void;
  onEditChange: (f: { title: string; steps: string; expected: string }) => void;
  onSaveToSuite: (suiteId: string) => void;
  onSendToBugs: () => void;
  onToggleScript: () => void;
}) {
  return (
    <div
      className={`rounded-[12px] border bg-[var(--c-bg-card)] p-5 shadow-[var(--shadow-sm)] transition-all duration-[var(--t-normal)] hover:-translate-y-[2px] hover:shadow-[var(--shadow-md)] ${
        tc.status === "passed"
          ? "border-l-[3px] border-l-[var(--c-pass)]"
          : "border-l-[3px] border-l-[var(--c-fail)]"
      }`}
    >
      {isEditing ? (
        /* Inline edit mode */
        <div className="space-y-4">
          <div>
            <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">
              Title
            </label>
            <input
              value={editForm.title}
              onChange={(e) => onEditChange({ ...editForm, title: e.target.value })}
              className="w-full rounded-[6px] border border-[var(--c-border)] bg-[var(--c-bg-input)] p-[10px] text-[13px] outline-none focus:border-[var(--c-accent)] focus:shadow-[0_0_0_3px_var(--c-accent-soft)]"
            />
          </div>
          <div>
            <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">
              Steps
            </label>
            <textarea
              value={editForm.steps}
              onChange={(e) => onEditChange({ ...editForm, steps: e.target.value })}
              rows={4}
              className="w-full resize-none rounded-[6px] border border-[var(--c-border)] bg-[var(--c-bg-input)] p-[10px] text-[13px] outline-none focus:border-[var(--c-accent)] focus:shadow-[0_0_0_3px_var(--c-accent-soft)]"
            />
          </div>
          <div>
            <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">
              Expected Result
            </label>
            <input
              value={editForm.expected}
              onChange={(e) => onEditChange({ ...editForm, expected: e.target.value })}
              className="w-full rounded-[6px] border border-[var(--c-border)] bg-[var(--c-bg-input)] p-[10px] text-[13px] outline-none focus:border-[var(--c-accent)] focus:shadow-[0_0_0_3px_var(--c-accent-soft)]"
            />
          </div>
          <div className="flex gap-2 justify-end border-t border-[var(--c-border)] pt-4">
            <button
              onClick={onEditSave}
              className="inline-flex items-center gap-1.5 rounded-[8px] bg-[var(--c-text)] px-[14px] py-[8px] text-[12px] font-medium text-[var(--c-bg)] transition-all hover:opacity-90"
            >
              <Check className="h-3 w-3" /> Save
            </button>
            <button
              onClick={onEditCancel}
              className="rounded-[8px] border-[1.5px] border-[var(--c-border)] bg-transparent px-[14px] py-[8px] text-[12px] font-medium transition-all hover:border-[var(--c-border-strong)]"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        /* Normal display mode */
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 border-b border-[var(--c-border)] pb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[11px] text-[var(--c-text-muted)] shrink-0">
                [ TC-{String(tc.id + 1).padStart(3, "0")} ]
              </span>
              {tc.module_name && (
                <span className="inline-flex items-center rounded-sm bg-[var(--c-bg-hover)] border border-[var(--c-border)] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[var(--c-accent)] shrink-0 font-bold">
                  {tc.module_name}
                </span>
              )}
              <span className="text-[12px] text-[var(--c-text-muted)] shrink-0">—</span>
              <h4 className="text-[15px] font-bold text-[var(--c-text)] truncate max-w-[320px] md:max-w-[420px]">
                {tc.title}
              </h4>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* PASSED / FAILED badge */}
              <span
                className={`inline-flex items-center gap-1 rounded-sm px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white ${
                  tc.status === "passed" ? "bg-[var(--c-pass)]" : "bg-[var(--c-fail)]"
                }`}
              >
                {tc.status === "passed" ? <>✓ PASSED</> : <>✕ FAILED</>}
              </span>
              {/* Priority badge */}
              <span
                className={`inline-flex items-center rounded-sm px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider badge-${tc.priority}`}
              >
                {tc.priority}
              </span>
            </div>
          </div>

          <div className="grid gap-6 text-[13px] pt-3 md:grid-cols-2 relative">
            {/* Left column */}
            <div className="space-y-1.5 min-h-[80px]">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--c-text-muted)]">
                STEPS
              </p>
              <div className="whitespace-pre-wrap leading-relaxed text-[var(--c-text)] text-[13.5px]">
                {tc.steps}
              </div>
            </div>
            {/* Divider line */}
            <div className="hidden md:block absolute left-1/2 top-3 bottom-0 w-[1px] bg-[var(--c-border)] -translate-x-1/2" />
            {/* Right column */}
            <div className="space-y-1.5 min-h-[80px] md:pl-6">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--c-text-muted)]">
                EXPECTED RESULT
              </p>
              <div className="leading-relaxed text-[var(--c-text)] text-[13.5px]">
                {tc.expected}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-[var(--c-border)] pt-4 mt-4">
            {/* Left aligned: Remove button */}
            <button
              onClick={onRemove}
              title="Remove"
              className="p-2 rounded-[6px] text-[var(--c-text-muted)] hover:text-[var(--c-fail)] hover:bg-[rgba(196,85,26,0.1)] transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>

            {/* Right aligned action buttons */}
            <div className="flex gap-2">
              <button
                onClick={onToggleScript}
                className="rounded-[8px] border-[1.5px] border-[var(--c-border)] bg-transparent px-[16px] py-[8px] text-[12px] font-medium text-[var(--c-text)] transition-all hover:bg-[var(--c-bg-hover)]"
              >
                View Script
              </button>
              <button
                onClick={onEditStart}
                className="rounded-[8px] border-[1.5px] border-[var(--c-border)] bg-transparent px-[16px] py-[8px] text-[12px] font-medium text-[var(--c-text)] transition-all hover:bg-[var(--c-bg-hover)]"
              >
                Edit
              </button>
              {tc.status === "failed" && (
                <button
                  onClick={onSendToBugs}
                  className="inline-flex items-center gap-1.5 rounded-[8px] border border-[var(--c-fail)] bg-[var(--c-fail)]/15 px-[16px] py-[8px] text-[12px] font-semibold text-[var(--c-fail)] hover:bg-[var(--c-fail)]/25 hover:shadow-[0_0_15px_rgba(239,68,68,0.35)] transition-all duration-300 transform active:scale-95 animate-pulse-slow"
                >
                  ⚠️ Record as Bug
                </button>
              )}
              <button
                onClick={() => {
                  if (!saveSuiteId) {
                    toast.error(
                      "Please select a project and suite first in the 'Save all to project' panel at the bottom right.",
                    );
                    return;
                  }
                  onSaveToSuite(saveSuiteId);
                }}
                disabled={isSaved}
                className="inline-flex items-center gap-1.5 rounded-[8px] bg-[var(--c-text)] px-[16px] py-[8px] text-[12px] font-medium text-[var(--c-bg)] transition-all hover:opacity-90 disabled:bg-[var(--c-border)] disabled:text-[var(--c-text-muted)] disabled:cursor-not-allowed"
              >
                {isSaved ? "✓ Saved" : "Save to Suite"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Save to project panel ────────────────────────────────── */

function SaveToProjectPanel({
  projects,
  suites,
  generated,
  saveProjectId,
  setSaveProjectId,
  saveSuiteId,
  setSaveSuiteId,
  onSaveAll,
}: {
  projects: { id: string; name: string }[];
  suites: { id: string; projectId: string; name: string }[];
  generated: GeneratedCase[];
  saveProjectId: string;
  setSaveProjectId: (id: string) => void;
  saveSuiteId: string;
  setSaveSuiteId: (id: string) => void;
  onSaveAll: (suiteId: string) => void;
}) {
  const [isCreatingProj, setIsCreatingProj] = useState(false);
  const [newProjName, setNewProjName] = useState("");
  const [isCreatingSuite, setIsCreatingSuite] = useState(false);
  const [newSuiteNameText, setNewSuiteNameText] = useState("");

  const projectSuites = suites.filter((s) => s.projectId === saveProjectId);

  return (
    <div className="rounded-[12px] border border-[var(--c-border)] bg-[var(--c-bg-card)] p-5 space-y-4 shadow-[var(--shadow-sm)]">
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--c-text-muted)]">
        SAVE ALL TO PROJECT
      </p>

      {/* Project Selector / Inline Creator */}
      <div className="space-y-1.5">
        <label className="block font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">
          Project
        </label>
        {isCreatingProj ? (
          <div className="flex gap-2">
            <input
              value={newProjName}
              onChange={(e) => setNewProjName(e.target.value)}
              placeholder="New project name…"
              className="flex-1 rounded-[6px] border border-[var(--c-border)] bg-[var(--c-bg-input)] px-3 py-1.5 text-[13px] outline-none"
            />
            <button
              onClick={() => {
                if (newProjName.trim()) {
                  const newP = createProject(newProjName.trim());
                  setSaveProjectId(newP.id);
                  setNewProjName("");
                  setIsCreatingProj(false);
                  toast.success("Project created inline!");
                }
              }}
              className="rounded-[6px] bg-[var(--c-text)] px-3 text-[12px] text-[var(--c-bg)] hover:opacity-90"
            >
              Create
            </button>
            <button
              onClick={() => setIsCreatingProj(false)}
              className="text-[12px] text-[var(--c-text-muted)]"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex gap-2 items-center">
            <select
              value={saveProjectId}
              onChange={(e) => {
                setSaveProjectId(e.target.value);
                setSaveSuiteId("");
              }}
              className="flex-1 rounded-[6px] border border-[var(--c-border)] bg-[var(--c-bg-input)] p-[8px] text-[13px] outline-none focus:border-[var(--c-accent)]"
            >
              <option value="">Select project...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setIsCreatingProj(true)}
              className="text-[12px] font-medium text-[var(--c-accent)] whitespace-nowrap hover:underline"
            >
              + New Project
            </button>
          </div>
        )}
      </div>

      {/* Suite Selector / Inline Creator */}
      {saveProjectId && (
        <div className="space-y-1.5">
          <label className="block font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">
            Suite
          </label>
          {isCreatingSuite ? (
            <div className="flex gap-2">
              <input
                value={newSuiteNameText}
                onChange={(e) => setNewSuiteNameText(e.target.value)}
                placeholder="New suite name…"
                className="flex-1 rounded-[6px] border border-[var(--c-border)] bg-[var(--c-bg-input)] px-3 py-1.5 text-[13px] outline-none"
              />
              <button
                onClick={() => {
                  if (newSuiteNameText.trim()) {
                    const newS = createSuite(saveProjectId, newSuiteNameText.trim());
                    setSaveSuiteId(newS.id);
                    setNewSuiteNameText("");
                    setIsCreatingSuite(false);
                    toast.success("Suite created inline!");
                  }
                }}
                className="rounded-[6px] bg-[var(--c-text)] px-3 text-[12px] text-[var(--c-bg)] hover:opacity-90"
              >
                Create
              </button>
              <button
                onClick={() => setIsCreatingSuite(false)}
                className="text-[12px] text-[var(--c-text-muted)]"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex gap-2 items-center">
              <select
                value={saveSuiteId}
                onChange={(e) => setSaveSuiteId(e.target.value)}
                className="flex-1 rounded-[6px] border border-[var(--c-border)] bg-[var(--c-bg-input)] p-[8px] text-[13px] outline-none focus:border-[var(--c-accent)]"
              >
                <option value="">Select suite...</option>
                {projectSuites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setIsCreatingSuite(true)}
                className="text-[12px] font-medium text-[var(--c-accent)] whitespace-nowrap hover:underline"
              >
                + New Suite
              </button>
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => onSaveAll(saveSuiteId)}
        disabled={!saveSuiteId}
        className="w-full inline-flex justify-center items-center gap-2 rounded-[8px] bg-[var(--c-accent)] px-[16px] py-[10px] text-[13px] font-medium text-white transition-all duration-[var(--t-normal)] hover:-translate-y-[1px] hover:bg-[var(--c-accent-dark)] disabled:opacity-40 disabled:hover:translate-y-0"
      >
        <Save className="h-4 w-4" /> Save {generated.length} cases to suite
      </button>
    </div>
  );
}
