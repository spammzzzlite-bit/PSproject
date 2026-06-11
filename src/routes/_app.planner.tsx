import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { Upload, FileText, Globe, Code2, ClipboardList, Check, X as XIcon, Edit2, Download, ChevronDown } from "lucide-react";
import { useProjects } from "@/lib/store";
import { PageHeader } from "./_app.projects";
import { toast } from "./_app";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { exportToExcel } from "@/lib/export";

export const Route = createFileRoute("/_app/planner")({
  head: () => ({ meta: [{ title: "AI Test Planner — Field Notes" }] }),
  component: PlannerPage,
});

const TESTING_TYPES = ["Functional", "Regression", "Smoke", "Integration", "UAT", "Performance"];

const INPUT_TABS = [
  { id: "text", label: "Text", icon: FileText },
  { id: "file", label: "File Upload", icon: Upload },
  { id: "url", label: "URL", icon: Globe },
  { id: "api", label: "API Spec", icon: Code2 },
] as const;

function PlannerPage() {
  const [projects] = useProjects();
  const inputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [projectId, setProjectId] = useState("");
  const [moduleName, setModuleName] = useState("");
  const [testingTypes, setTestingTypes] = useState<string[]>([]);
  const [environment, setEnvironment] = useState("");
  const [tester, setTester] = useState("");
  
  const [inputTab, setInputTab] = useState<string>("text");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [apiSpec, setApiSpec] = useState("");

  const [includeRisks, setIncludeRisks] = useState(false);

  // UI State
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [generatedPlan, setGeneratedPlan] = useState<any>(null);

  const toggleTestingType = (type: string) => {
    setTestingTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const hasInput = () => {
    if (!projectId || !moduleName) return false;
    switch (inputTab) {
      case "text": return text.trim().length > 0;
      case "file": return file !== null;
      case "url": return url.trim().length > 0;
      case "api": return apiSpec.trim().length > 0;
      default: return false;
    }
  };

  const generate = () => {
    setState("loading");
    setTimeout(() => {
      const proj = projects.find(p => p.id === projectId);
      setGeneratedPlan({
        id: `TP-${proj?.name.substring(0, 3).toUpperCase() || "UNK"}-${new Date().toISOString().split("T")[0].replace(/-/g, "")}-001`,
        scope: `Testing the ${moduleName} feature based on the provided specifications.`,
        objectives: ["Verify core functionality", "Ensure regressions are caught", "Validate UI state transitions"],
        featuresInScope: ["Main user flow", "Error handling scenarios", "Edge cases defined in requirements"],
        featuresNotInScope: ["Load testing (unless specified)", "Third-party integration deep-dives"],
        testingApproach: testingTypes.length > 0 ? testingTypes.join(", ") + " testing approach." : "Functional testing.",
        passFail: "Pass: All critical test cases execute successfully. Fail: Any P0/P1 bugs discovered.",
        environment: environment || "Not specified",
        risks: includeRisks ? [
          { risk: "Data loss during timeout", mitigation: "Implement robust retry and fallback logic" },
          { risk: "Third-party API limit reached", mitigation: "Use mock responses for 80% of test runs" }
        ] : null
      });
      setState("done");
      toast.success("Test plan generated successfully");
    }, 2000);
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader section="§ PLAN" title="AI Test Planner" subtitle="Generate a test plan and its test cases from a requirement, spec, or user story." />

      {state !== "done" ? (
        <div className="space-y-8">
          {/* Section A: Plan Context */}
          <section className="border border-border bg-card p-6">
            <h3 className="font-display text-lg mb-4">Plan Context</h3>
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="label-eyebrow mb-2 block">Project</label>
                <select 
                  value={projectId} 
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full border border-border bg-background p-2.5 text-sm outline-none focus:border-accent"
                >
                  <option value="" disabled>Select a project...</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-eyebrow mb-2 block">Module / Feature being tested</label>
                <input 
                  type="text" 
                  value={moduleName} 
                  onChange={(e) => setModuleName(e.target.value)}
                  placeholder="e.g. User Authentication"
                  className="w-full border border-border bg-background p-2.5 text-sm outline-none focus:border-accent"
                />
              </div>
              <div className="md:col-span-2">
                <label className="label-eyebrow mb-2 block">Testing Type</label>
                <div className="flex flex-wrap gap-2">
                  {TESTING_TYPES.map(type => (
                    <button
                      key={type}
                      onClick={() => toggleTestingType(type)}
                      className={`rounded-sm border px-3 py-1.5 text-sm transition-colors ${testingTypes.includes(type) ? "border-accent bg-accent/10 text-accent" : "border-border hover:border-foreground"}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label-eyebrow mb-2 block">Environment</label>
                <input 
                  type="text" 
                  value={environment} 
                  onChange={(e) => setEnvironment(e.target.value)}
                  placeholder="e.g. Staging, Production"
                  className="w-full border border-border bg-background p-2.5 text-sm outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="label-eyebrow mb-2 block">Tester / Assigned to (Optional)</label>
                <input 
                  type="text" 
                  value={tester} 
                  onChange={(e) => setTester(e.target.value)}
                  placeholder="e.g. QA Team"
                  className="w-full border border-border bg-background p-2.5 text-sm outline-none focus:border-accent"
                />
              </div>
            </div>
          </section>

          {/* Section B: Input Spec */}
          <section className="border border-border bg-card">
            <div className="flex border-b border-border">
              {INPUT_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setInputTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-3 text-sm border-b-2 transition-colors ${inputTab === tab.id ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="p-5">
              {inputTab === "text" && (
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={6}
                  placeholder="Paste user stories, acceptance criteria, or a short description..."
                  className="w-full resize-none border border-border bg-background p-4 text-sm outline-none focus:border-accent"
                />
              )}
              {inputTab === "file" && (
                <>
                  <div
                    onClick={() => inputRef.current?.click()}
                    className="flex cursor-pointer flex-col items-center border-2 border-dashed border-border px-6 py-8 text-center hover:border-accent transition-colors"
                  >
                    {file ? (
                      <><FileText className="h-6 w-6 text-accent" /><p className="mt-3 font-medium">{file.name}</p></>
                    ) : (
                      <><Upload className="h-6 w-6 text-muted-foreground" /><p className="mt-3 font-display text-lg">Drop a file</p></>
                    )}
                  </div>
                  <input ref={inputRef} type="file" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                </>
              )}
              {inputTab === "url" && (
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/spec"
                  className="w-full border border-border bg-background p-3 text-sm outline-none focus:border-accent"
                />
              )}
              {inputTab === "api" && (
                <textarea
                  value={apiSpec}
                  onChange={(e) => setApiSpec(e.target.value)}
                  rows={6}
                  placeholder='Paste OpenAPI spec...'
                  className="w-full resize-none border border-border bg-background p-4 font-mono text-sm outline-none focus:border-accent"
                />
              )}
            </div>
          </section>

          {/* Section C: Options */}
          <section className="border border-border bg-card p-6">
            <h3 className="font-display text-lg mb-4">Options</h3>
            <div className="flex items-center gap-3">
              <input 
                type="checkbox" 
                id="includeRisks" 
                checked={includeRisks} 
                onChange={(e) => setIncludeRisks(e.target.checked)}
                className="h-4 w-4 accent-accent"
              />
              <label htmlFor="includeRisks" className="text-sm">Include risk assessment in plan</label>
            </div>
          </section>

          <div className="flex justify-end">
            <button
              onClick={generate}
              disabled={state === "loading" || !hasInput()}
              className="inline-flex items-center gap-2 rounded-sm bg-foreground px-6 py-3 text-sm text-background hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {state === "loading" ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" /> Generating...</> : <>Generate Test Plan →</>}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Export Actions */}
          <div className="flex justify-end gap-3 mb-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="inline-flex items-center gap-2 rounded-sm border border-border bg-card px-4 py-2 text-sm hover:border-foreground transition-colors">
                  <Download className="h-4 w-4" />
                  Download Test Plan
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-card border border-border shadow-lg font-sans">
                <DropdownMenuItem className="text-sm cursor-pointer hover:bg-muted p-2" onClick={() => {
                  const json = JSON.stringify(generatedPlan, null, 2);
                  const blob = new Blob([json], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "test-plan.json";
                  a.click();
                }}>
                  Download as JSON
                </DropdownMenuItem>
                <DropdownMenuItem className="text-sm cursor-pointer hover:bg-muted p-2" onClick={() => {
                  const md = `# Test Plan\n\n**Scope:** ${generatedPlan.scope}\n\n**Objectives:**\n${generatedPlan.objectives.map((o:string) => `- ${o}`).join("\n")}\n\n**Approach:** ${generatedPlan.testingApproach}`;
                  const blob = new Blob([md], { type: "text/markdown" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "test-plan.md";
                  a.click();
                }}>
                  Download as Markdown (.md)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Generated Part 1: Test Plan */}
          <div id="planner-document-container" className="border border-border bg-card p-8">
            <div className="flex items-center justify-between border-b border-border pb-6 mb-6">
              <div>
                <p className="label-eyebrow">Test Plan Document</p>
                <h2 className="font-display text-3xl mt-2">{moduleName || "Feature"} Testing</h2>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm text-muted-foreground">{generatedPlan.id}</p>
                <p className="text-sm mt-1">{new Date().toLocaleDateString()}</p>
              </div>
            </div>

            <div className="space-y-6 text-sm">
              <div><h4 className="font-bold text-foreground mb-1">1. Scope</h4><p className="text-muted-foreground">{generatedPlan.scope}</p></div>
              <div><h4 className="font-bold text-foreground mb-1">2. Objectives</h4><ul className="list-disc pl-5 text-muted-foreground">{generatedPlan.objectives.map((o: string, i: number) => <li key={i}>{o}</li>)}</ul></div>
              <div className="grid grid-cols-2 gap-4">
                <div><h4 className="font-bold text-foreground mb-1">3. Features to be Tested</h4><ul className="list-disc pl-5 text-muted-foreground">{generatedPlan.featuresInScope.map((f: string, i: number) => <li key={i}>{f}</li>)}</ul></div>
                <div><h4 className="font-bold text-foreground mb-1">4. Features NOT in Scope</h4><ul className="list-disc pl-5 text-muted-foreground">{generatedPlan.featuresNotInScope.map((f: string, i: number) => <li key={i}>{f}</li>)}</ul></div>
              </div>
              <div><h4 className="font-bold text-foreground mb-1">5. Testing Approach</h4><p className="text-muted-foreground">{generatedPlan.testingApproach}</p></div>
              <div><h4 className="font-bold text-foreground mb-1">6. Pass / Fail Criteria</h4><p className="text-muted-foreground">{generatedPlan.passFail}</p></div>
              <div><h4 className="font-bold text-foreground mb-1">7. Test Environment</h4><p className="text-muted-foreground">{generatedPlan.environment}</p></div>
              
              {generatedPlan.risks && (
                <div>
                  <h4 className="font-bold text-foreground mb-2">8. Risks & Mitigations</h4>
                  <div className="border border-border rounded-sm overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-muted text-muted-foreground"><tr><th className="p-3 font-medium">Risk</th><th className="p-3 font-medium">Mitigation</th></tr></thead>
                      <tbody className="divide-y divide-border">
                        {generatedPlan.risks.map((r: any, i: number) => (
                          <tr key={i}><td className="p-3">{r.risk}</td><td className="p-3">{r.mitigation}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                <div>
                  <h4 className="font-bold text-foreground mb-2">Schedule</h4>
                  <div className="flex items-center gap-2 text-muted-foreground"><span className="w-20">Start:</span><input type="text" className="border-b border-dashed border-border bg-transparent outline-none focus:border-accent" defaultValue="TBD" /></div>
                  <div className="flex items-center gap-2 mt-1 text-muted-foreground"><span className="w-20">End:</span><input type="text" className="border-b border-dashed border-border bg-transparent outline-none focus:border-accent" defaultValue="TBD" /></div>
                </div>
                <div>
                  <h4 className="font-bold text-foreground mb-2">Approvals</h4>
                  <div className="flex items-center gap-2 text-muted-foreground"><span className="w-24">Prepared by:</span><input type="text" className="border-b border-dashed border-border bg-transparent outline-none focus:border-accent" defaultValue={tester || "QA"} /></div>
                  <div className="flex items-center gap-2 mt-1 text-muted-foreground"><span className="w-24">Reviewed by:</span><input type="text" className="border-b border-dashed border-border bg-transparent outline-none focus:border-accent" defaultValue="" /></div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4">
            <button onClick={() => setState("idle")} className="text-sm text-muted-foreground hover:text-foreground">← Back to planner</button>
            <Link 
              to="/generate" 
              search={{ projectId: projectId }}
              className="rounded-sm bg-foreground px-6 py-2.5 text-sm text-background hover:bg-accent transition-colors"
            >
              Generate Test Cases for this Plan →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
