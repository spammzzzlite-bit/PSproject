import { useEffect, useState, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  LayoutGrid, FolderClosed, Sparkles, History, BookOpen, Plug,
  Settings, LifeBuoy, Bug, BarChart3, Layers, FlaskConical,
  Search, FileText, Plus,
} from "lucide-react";
import { useProjects, useSuites, useTestCases } from "@/lib/store";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

type CommandItem = {
  id: string;
  label: string;
  section: string;
  icon: React.ElementType;
  action: () => void;
  keywords?: string;
};

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [projects] = useProjects();
  const [suites] = useSuites();
  const [testCases] = useTestCases();

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const go = (to: string) => { navigate({ to }); onClose(); };

  const commands: CommandItem[] = [
    // Navigation
    { id: "nav-dash", label: "Dashboard", section: "Navigate", icon: LayoutGrid, action: () => go("/"), keywords: "home workspace" },
    { id: "nav-proj", label: "My Projects", section: "Navigate", icon: FolderClosed, action: () => go("/projects"), keywords: "folders" },
    { id: "nav-suites", label: "Test Suites", section: "Navigate", icon: Layers, action: () => go("/suites"), keywords: "folders groups" },
    { id: "nav-gen", label: "Generate Tests", section: "Navigate", icon: Sparkles, action: () => go("/generate"), keywords: "ai draft" },
    { id: "nav-runs", label: "Test Runs", section: "Navigate", icon: History, action: () => go("/runs"), keywords: "executions" },
    { id: "nav-bugs", label: "Bugs", section: "Navigate", icon: Bug, action: () => go("/bugs"), keywords: "issues defects" },
    { id: "nav-analytics", label: "Analytics", section: "Navigate", icon: BarChart3, action: () => go("/analytics"), keywords: "charts coverage" },
    { id: "nav-regression", label: "Regression", section: "Navigate", icon: FlaskConical, action: () => go("/regression"), keywords: "smoke critical" },
    { id: "nav-reports", label: "Reports", section: "Navigate", icon: BookOpen, action: () => go("/reports") },
    { id: "nav-int", label: "Integrations", section: "Navigate", icon: Plug, action: () => go("/integrations") },
    { id: "nav-set", label: "Settings", section: "Navigate", icon: Settings, action: () => go("/settings") },
    { id: "nav-help", label: "Help & Docs", section: "Navigate", icon: LifeBuoy, action: () => go("/help") },
    // Actions
    { id: "act-new-proj", label: "Create new project", section: "Actions", icon: Plus, action: () => go("/projects"), keywords: "add" },
    { id: "act-gen", label: "Generate test cases", section: "Actions", icon: Sparkles, action: () => go("/generate"), keywords: "ai create" },
    // Projects
    ...projects.map((p) => ({
      id: `proj-${p.id}`,
      label: p.name,
      section: "Projects",
      icon: FolderClosed,
      action: () => go("/projects"),
      keywords: "project folder",
    })),
    // Suites
    ...suites.slice(0, 10).map((s) => ({
      id: `suite-${s.id}`,
      label: s.name,
      section: "Test Suites",
      icon: Layers,
      action: () => go("/suites"),
      keywords: "suite group",
    })),
    // Test Cases
    ...testCases.slice(0, 10).map((tc) => ({
      id: `tc-${tc.id}`,
      label: tc.title,
      section: "Test Cases",
      icon: FileText,
      action: () => go("/suites"),
      keywords: "test case",
    })),
  ];

  const q = query.toLowerCase().trim();
  const filtered = q
    ? commands.filter((c) => c.label.toLowerCase().includes(q) || c.keywords?.toLowerCase().includes(q) || c.section.toLowerCase().includes(q))
    : commands;

  // Group by section
  const groups = filtered.reduce<Record<string, CommandItem[]>>((acc, item) => {
    (acc[item.section] = acc[item.section] || []).push(item);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-foreground/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-xl border border-border bg-card shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands, projects, test cases…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <span className="font-mono text-[10px] text-muted-foreground">ESC</span>
        </div>
        <div className="max-h-[50vh] overflow-y-auto">
          {Object.keys(groups).length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No results for "{query}"
            </div>
          ) : (
            Object.entries(groups).map(([section, items]) => (
              <div key={section}>
                <p className="label-eyebrow px-4 pt-3 pb-1.5">{section}</p>
                {items.map((item) => (
                  <button
                    key={item.id}
                    onClick={item.action}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-muted transition-colors"
                  >
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
        <div className="border-t border-border px-4 py-2 flex items-center justify-between">
          <span className="font-mono text-[10px] text-muted-foreground">↑↓ Navigate</span>
          <span className="font-mono text-[10px] text-muted-foreground">↵ Select</span>
        </div>
      </div>
    </div>
  );
}
