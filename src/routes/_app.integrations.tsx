import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "./_app.projects";
import { usePanel } from "@/components/PanelContext";
import { toast } from "./_app";
import { Settings as SettingsIcon, ExternalLink, ShieldCheck, HelpCircle } from "lucide-react";

export const Route = createFileRoute("/_app/integrations")({
  head: () => ({ meta: [{ title: "Integrations — Field Notes" }] }),
  component: IntegrationsPage,
});

interface IntegrationItem {
  key: string;
  name: string;
  desc: string;
  category: string;
  icon: () => React.JSX.Element;
  glowClass: string;
  borderHoverClass: string;
  accentColor: string;
}

// Custom authentic high-fidelity brand SVG icons
const JiraIcon = () => (
  <svg className="h-10 w-10 shrink-0 text-[#2684FF]" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.528 2.056c-.053-.086-.142-.14-.241-.14H8.475a.28.28 0 0 0-.244.144L5.27 7.027a.28.28 0 0 0 0 .285l2.973 4.968a.28.28 0 0 0 .243.14h2.812c.099 0 .188-.054.241-.14a.28.28 0 0 0 0-.285L8.577 7.17l2.951-4.829a.28.28 0 0 0 0-.285zm6.837 0c-.053-.086-.142-.14-.241-.14h-2.812a.28.28 0 0 0-.244.144L12.11 7.027a.28.28 0 0 0 0 .285l2.973 4.968a.28.28 0 0 0 .243.14h2.812c.099 0 .188-.054.241-.14a.28.28 0 0 0 0-.285l-2.962-4.858 2.951-4.829a.28.28 0 0 0 0-.285zM6.255 11.53c-.053-.086-.142-.14-.241-.14H3.202a.28.28 0 0 0-.244.144L.004 16.5a.28.28 0 0 0 0 .285l2.973 4.968a.28.28 0 0 0 .243.14h2.812c.099 0 .188-.054.241-.14a.28.28 0 0 0 0-.285l-2.962-4.858 2.951-4.829a.28.28 0 0 0 0-.285z" />
  </svg>
);

const GitHubIcon = () => (
  <svg className="h-10 w-10 shrink-0 text-white dark:text-white light:text-neutral-900" viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.167 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.577.688.479C19.138 20.164 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
  </svg>
);

const SlackIcon = () => (
  <svg className="h-10 w-10 shrink-0" viewBox="0 0 24 24" fill="currentColor">
    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523 2.528 2.528 0 0 1-2.522-2.523 2.528 2.528 0 0 1 2.522-2.52h2.52v2.52zm1.261 0a2.528 2.528 0 0 1 2.52-2.52h5.043a2.528 2.528 0 0 1 2.522 2.52v5.043a2.528 2.528 0 0 1-2.522 2.52H8.823a2.528 2.528 0 0 1-2.52-2.52v-5.043z" fill="#E01E5A" />
    <path d="M8.835 5.042a2.528 2.528 0 0 1-2.52-2.52A2.528 2.528 0 0 1 8.835 0a2.528 2.528 0 0 1 2.52 2.522v2.52h-2.52zm0 1.261a2.528 2.528 0 0 1 2.52 2.52v5.043a2.528 2.528 0 0 1-2.52 2.522H3.792a2.528 2.528 0 0 1-2.522-2.522V8.823a2.528 2.528 0 0 1 2.522-2.52h5.043z" fill="#36C5F0" />
    <path d="M18.958 8.823a2.528 2.528 0 0 1 2.52-2.522 2.528 2.528 0 0 1 2.522 2.522 2.528 2.528 0 0 1-2.522 2.52h-2.52v-2.52zm-1.261 0a2.528 2.528 0 0 1-2.52 2.52h-5.043a2.528 2.528 0 0 1-2.522-2.52V3.792a2.528 2.528 0 0 1 2.522-2.52h5.043z" fill="#2EB67D" />
    <path d="M15.176 18.958a2.528 2.528 0 0 1 2.52 2.52 2.528 2.528 0 0 1-2.52 2.522 2.528 2.528 0 0 1-2.522-2.522v-2.52h2.522zm0-1.261a2.528 2.528 0 0 1-2.522-2.52v-5.043a2.528 2.528 0 0 1 2.522-2.52h5.043z" fill="#ECB22E" />
  </svg>
);

const GitLabIcon = () => (
  <svg className="h-10 w-10 shrink-0 text-[#FC6D26]" viewBox="0 0 24 24" fill="currentColor">
    <path d="m23.505 12.015-1.92-5.91a1.127 1.127 0 0 0-.36-.495c-.174-.123-.393-.178-.609-.153a1.125 1.125 0 0 0-.742.427L12 17.61 4.125 5.88a1.125 1.125 0 0 0-.742-.426 1.116 1.116 0 0 0-.61.152c-.176.12-.303.298-.36.495L.495 12.015a1.127 1.127 0 0 0 .195 1.05l10.98 8.235a.653.653 0 0 0 .66 0l10.98-8.235a1.127 1.127 0 0 0 .195-1.05z" />
  </svg>
);

const BitbucketIcon = () => (
  <svg className="h-10 w-10 shrink-0 text-[#2684FF]" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.316 2.5a1.196 1.196 0 0 0-.895-.411H2.58a1.196 1.196 0 0 0-.895.411 1.196 1.196 0 0 0-.295.916l2.316 17.58a1.196 1.196 0 0 0 .895.905h14.598a1.196 1.196 0 0 0 .895-.905l2.316-17.58a1.196 1.196 0 0 0-.295-.916zm-7.669 11.231H9.353l-.947-4.737h7.192l-.951 4.737z" />
  </svg>
);

const AzureDevOpsIcon = () => (
  <svg className="h-10 w-10 shrink-0 text-[#0078D4]" viewBox="0 0 24 24" fill="currentColor">
    <path d="M1.37 8.356v7.355l9.215 5.568V2.857L1.37 8.356zm10.74 12.923l10.518-6.195V8.924L12.11 2.72v18.559z" />
  </svg>
);

const ZephyrIcon = () => (
  <svg className="h-10 w-10 shrink-0 text-[#00A3E0]" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 .3A11.7 11.7 0 0 0 .3 12a11.7 11.7 0 0 0 11.7 11.7 11.7 11.7 0 0 0 11.7-11.7A11.7 11.7 0 0 0 12 .3zm6.33 13.905c-.09 1.485-.81 2.835-2.025 3.51-1.395.765-3.06.855-4.5.225-.945-.405-1.71-1.125-2.205-2.07l2.16-1.17c.45.81.99 1.305 1.755 1.575.765.27 1.575.135 2.25-.27.495-.27.81-.81.81-1.35 0-.45-.18-.855-.54-1.125a12.87 12.87 0 0 0-2.385-1.17l-1.35-.54c-.99-.405-1.89-1.035-2.475-1.89C7.23 8.85 7.14 7.5 7.725 6.285 8.445 4.8 9.945 3.945 11.61 3.945c1.485 0 2.88.675 3.69 1.89.54.81.81 1.755.81 2.745l-2.475.135c-.045-.63-.18-1.215-.495-1.71-.405-.63-.99-.945-1.665-.945-.765 0-1.44.45-1.755 1.08-.225.45-.18.99.135 1.395.27.36.675.63 1.08.81l1.575.63c1.395.585 2.565 1.44 3.195 2.7.45.9.675 1.845.63 2.82z" />
  </svg>
);

const TestRailIcon = () => (
  <svg className="h-10 w-10 shrink-0 text-[#2496DF]" viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14h-2V9h2v7zm0-9h-2V5h2v2z" />
  </svg>
);

const PlaywrightIcon = () => (
  <svg className="h-10 w-10 shrink-0 text-[#2EB872]" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm-1.25 14.5a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5zm1.5-3.5a.75.75 0 0 1-.75-.75V7.75a.75.75 0 0 1 1.5 0v4.5a.75.75 0 0 1-.75.75z" />
  </svg>
);

const CypressIcon = () => (
  <svg className="h-10 w-10 shrink-0 text-[#12AF77]" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.167 15.35c.808-.883 1.25-2.042 1.25-3.233 0-2.658-2.158-4.817-4.817-4.817H9.283v8.05h6.317c1.192 0 2.35-.442 3.233-1.25l4.317 4.317a1.187 1.187 0 0 0 1.683 0 1.187 1.187 0 0 0 0-1.683l-5.666-5.666V15.35zM3.467 12c0-3.325 2.708-6.033 6.033-6.033h6.1c1.242 0 2.25.967 2.35 2.192.1.867-.283 1.708-.967 2.192-.483.333-1.075.525-1.7.525H9.5c-.825 0-1.5.675-1.5 1.5s.675 1.5 1.5 1.5h5.783c.625 0 1.217.192 1.7.525.683.483 1.067 1.325.967 2.192-.1 1.225-1.108 2.192-2.35 2.192H9.5A6.039 6.039 0 0 1 3.467 12z" />
  </svg>
);

const JenkinsIcon = () => (
  <svg className="h-10 w-10 shrink-0 text-[#D2503C]" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.336 9.387c-.894 0-1.618.724-1.618 1.619 0 .894.724 1.618 1.618 1.618.895 0 1.619-.724 1.619-1.618 0-.895-.724-1.619-1.619-1.619zm-3.235 0c-.895 0-1.618.724-1.618 1.619 0 .894.723 1.618 1.618 1.618.894 0 1.618-.724 1.618-1.618 0-.895-.724-1.619-1.618-1.619zm6.47 1.619c0-.895-.724-1.619-1.618-1.619-.895 0-1.619.724-1.619 1.619 0 .894.724 1.618 1.619 1.618.894 0 1.618-.724 1.618-1.618zm-9.706-6.47c-.894 0-1.618.723-1.618 1.618 0 .895.724 1.619 1.618 1.619s1.618-.724 1.618-1.619c0-.895-.724-1.618-1.618-1.618zm0 9.705c-.894 0-1.618.724-1.618 1.618 0 .895.724 1.619 1.618 1.619s1.618-.724 1.618-1.619c0-.894-.724-1.618-1.618-1.618zm-3.235-3.235c-.895 0-1.618.724-1.618 1.618 0 .895.723 1.619 1.618 1.619.894 0 1.618-.724 1.618-1.619 0-.894-.724-1.618-1.618-1.618zm6.47 0c-.894 0-1.618.724-1.618 1.618 0 .895.724 1.619 1.618 1.619s1.618-.724 1.618-1.619c0-.894-.724-1.618-1.618-1.618z" />
  </svg>
);

const JenkinsCiIcon = () => (
  <svg className="h-10 w-10 shrink-0 text-[#D2503C]" viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
  </svg>
);

const INTEGRATIONS: IntegrationItem[] = [
  { key: "jira", name: "Jira", desc: "Sync failed test cases directly into Jira tickets to bridge QA and development pipelines.", category: "Project Management", icon: JiraIcon, glowClass: "hover:shadow-[0_0_30px_rgba(38,132,255,0.15)]", borderHoverClass: "hover:border-[#2684FF]", accentColor: "#2684FF" },
  { key: "github", name: "GitHub Actions", desc: "Link test runs to pull requests and trigger automatic repository status checks.", category: "CI/CD & Code", icon: GitHubIcon, glowClass: "hover:shadow-[0_0_30px_rgba(255,255,255,0.12)]", borderHoverClass: "hover:border-white/30", accentColor: "#FFFFFF" },
  { key: "slack", name: "Slack", desc: "Pipe real-time test run results, alert notifications, and bug filings into team Slack channels.", category: "Communication", icon: SlackIcon, glowClass: "hover:shadow-[0_0_30px_rgba(224,30,90,0.15)]", borderHoverClass: "hover:border-[#E01E5A]", accentColor: "#E01E5A" },
  { key: "gitlab", name: "GitLab CI", desc: "Trigger automated test executions on push event merge requests and parse pipelines reports.", category: "CI/CD & Code", icon: GitLabIcon, glowClass: "hover:shadow-[0_0_30px_rgba(252,109,38,0.15)]", borderHoverClass: "hover:border-[#FC6D26]", accentColor: "#FC6D26" },
  { key: "bitbucket", name: "Bitbucket", desc: "Verify repository builds with automated testing checklists on pull requests.", category: "CI/CD & Code", icon: BitbucketIcon, glowClass: "hover:shadow-[0_0_30px_rgba(38,132,255,0.15)]", borderHoverClass: "hover:border-[#0052CC]", accentColor: "#0052CC" },
  { key: "azure", name: "Azure DevOps", desc: "Integrate QA suites directly with Azure pipelines and test plan boards.", category: "CI/CD & Code", icon: AzureDevOpsIcon, glowClass: "hover:shadow-[0_0_30px_rgba(0,120,212,0.15)]", borderHoverClass: "hover:border-[#0078D4]", accentColor: "#0078D4" },
  { key: "zephyr", name: "Zephyr Scale", desc: "Track and link test cases inside Jira with Zephyr Scale enterprise suites.", category: "Test Management", icon: ZephyrIcon, glowClass: "hover:shadow-[0_0_30px_rgba(0,163,224,0.15)]", borderHoverClass: "hover:border-[#00A3E0]", accentColor: "#00A3E0" },
  { key: "testrail", name: "TestRail", desc: "Synchronize test runs, status logs, and QA metrics with TestRail dashboards.", category: "Test Management", icon: TestRailIcon, glowClass: "hover:shadow-[0_0_30px_rgba(36,150,223,0.15)]", borderHoverClass: "hover:border-[#2496DF]", accentColor: "#2496DF" },
  { key: "playwright", name: "Playwright", desc: "Sync end-to-end browser test definitions and execute runs in the cloud.", category: "Automation Frameworks", icon: PlaywrightIcon, glowClass: "hover:shadow-[0_0_30px_rgba(46,184,114,0.15)]", borderHoverClass: "hover:border-[#2EB872]", accentColor: "#2EB872" },
  { key: "cypress", name: "Cypress", desc: "Upload and analyze Cypress Test Runner execution recordings and test matrices.", category: "Automation Frameworks", icon: CypressIcon, glowClass: "hover:shadow-[0_0_30px_rgba(18,175,119,0.15)]", borderHoverClass: "hover:border-[#12AF77]", accentColor: "#12AF77" },
  { key: "jenkins", name: "Jenkins", desc: "Hook test generation pipelines into classical Jenkins freestyle builds.", category: "CI/CD & Code", icon: JenkinsIcon, glowClass: "hover:shadow-[0_0_30px_rgba(210,80,60,0.15)]", borderHoverClass: "hover:border-[#D2503C]", accentColor: "#D2503C" },
  { key: "jenkinsci", name: "Jenkins CI", desc: "Integrate declarative pipeline scripts for continuous QA regression verification.", category: "CI/CD & Code", icon: JenkinsCiIcon, glowClass: "hover:shadow-[0_0_30px_rgba(210,80,60,0.2)]", borderHoverClass: "hover:border-[#D2503C]", accentColor: "#D2503C" },
];

const CATEGORIES = ["all", ...new Set(INTEGRATIONS.map((i) => i.category))];

function IntegrationsPage() {
  const [connected, setConnected] = useState<Record<string, boolean>>(() => {
    // Read from localStorage to persist mock connections
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("nexus_connected_integrations");
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });

  const { openPanel } = usePanel();
  const [filterCat, setFilterCat] = useState<string>("all");

  const toggleConnection = (key: string, name: string) => {
    const newState = !connected[key];
    const newMap = { ...connected, [key]: newState };
    setConnected(newMap);
    localStorage.setItem("nexus_connected_integrations", JSON.stringify(newMap));
    toast.success(newState ? `${name} connected` : `${name} disconnected`);
  };

  const filtered = filterCat === "all" ? INTEGRATIONS : INTEGRATIONS.filter((i) => i.category === filterCat);
  const connectedCount = Object.values(connected).filter(Boolean).length;

  return (
    <div className="mx-auto max-w-7xl px-2">
      <PageHeader
        section="Integrations"
        title="Integrations Hub"
        subtitle={`Connected to ${connectedCount} out of ${INTEGRATIONS.length} platforms.`}
      />

      {/* Category filter tabs */}
      <div className="mb-8 flex flex-wrap items-center gap-2 border-b border-[var(--c-border)]/40 pb-4">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCat(cat)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium uppercase tracking-wider transition-all duration-[var(--t-normal)] ${
              filterCat === cat
                ? "bg-[var(--c-accent)] text-white shadow-[var(--shadow-sm)]"
                : "border border-[var(--c-border)] bg-[var(--c-bg-card)]/40 text-[var(--c-text-muted)] hover:border-[var(--c-text)] hover:text-[var(--c-text)]"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Bento Grid layout */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((i, idx) => {
          const isOn = !!connected[i.key];
          const BrandSVG = i.icon;
          return (
            <div
              key={i.key}
              className={`group stagger-item relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/5 bg-[var(--c-bg-card)]/40 p-6 backdrop-blur-md transition-all duration-300 ease-out hover:scale-[1.04] hover:-translate-y-1.5 hover:z-10 ${i.glowClass} ${i.borderHoverClass}`}
              style={{ animationDelay: `${idx * 45}ms` }}
            >
              <div>
                {/* Top Row: Brand Icon & Toggle Switch */}
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 p-2 transition-transform duration-300 group-hover:scale-110">
                    <BrandSVG />
                  </div>
                  
                  {/* Custom Premium High-Contrast Toggle Switch */}
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-mono uppercase tracking-wider ${isOn ? "text-[var(--c-pass)] font-semibold" : "text-[var(--c-text-muted)]"}`}>
                      {isOn ? "Online" : "Offline"}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleConnection(i.key, i.name);
                      }}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isOn ? "bg-[var(--c-pass)]" : "bg-[var(--c-border-strong)]"
                      }`}
                      title={isOn ? "Disconnect" : "Connect"}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          isOn ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Middle Row: Title & Description */}
                <div className="mt-5 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-display text-xl leading-tight text-[var(--c-text)]">{i.name}</h3>
                    {isOn && <ShieldCheck className="h-4 w-4 text-[var(--c-pass)]" />}
                  </div>
                  <p className="text-[13px] leading-relaxed text-[var(--c-text-muted)] line-clamp-3">
                    {i.desc}
                  </p>
                </div>
              </div>

              {/* Bottom Row: Accent Category Badge & Revealable Configuration Action */}
              <div className="mt-6 border-t border-[var(--c-border)]/20 pt-4 flex items-center justify-between">
                <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--c-text-dim)] border border-[var(--c-border)]/20 rounded px-1.5 py-0.5">
                  {i.category}
                </span>

                <button
                  onClick={() =>
                    openPanel(
                      <IntegrationConfig integration={i} connected={connected} toggleConnection={toggleConnection} />,
                      [{ label: "Integrations" }, { label: i.name }]
                    )
                  }
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--c-accent)] opacity-0 transform translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 ease-out hover:text-[var(--c-accent-dark)]"
                >
                  Configure <SettingsIcon className="h-3 w-3 animate-[spin_4s_linear_infinite]" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Integration Config Panel ──────────────────────────── */

interface ConfigPanelProps {
  integration: IntegrationItem;
  connected: Record<string, boolean>;
  toggleConnection: (key: string, name: string) => void;
}

function IntegrationConfig({ integration, connected, toggleConnection }: ConfigPanelProps) {
  const [apiKey, setApiKey] = useState("");
  const [webhook, setWebhook] = useState("");
  const isOn = !!connected[integration.key];

  return (
    <div className="space-y-6">
      <div>
        <p className="label-eyebrow text-accent">§ Setup Configuration</p>
        <div className="mt-1.5 flex items-center gap-3">
          <h2 className="font-display text-3xl text-[var(--c-text)]">{integration.name}</h2>
          <span className={`rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${
            isOn ? "bg-[var(--c-pass-soft)] text-[var(--c-pass)]" : "bg-[var(--c-bg-hover)] text-[var(--c-text-muted)]"
          }`}>
            {isOn ? "Active" : "Disabled"}
          </span>
        </div>
        <p className="mt-2 text-sm text-[var(--c-text-muted)] leading-relaxed">{integration.desc}</p>
      </div>

      {/* Toggle connection inside config */}
      <div className="rounded-xl border border-[var(--c-border)]/40 bg-[var(--c-bg-card)]/50 p-4 flex items-center justify-between">
        <div className="space-y-0.5">
          <p className="text-sm font-medium">Sync Connection State</p>
          <p className="text-xs text-[var(--c-text-muted)]">Enable webhook streaming and background updates.</p>
        </div>
        <button
          onClick={() => toggleConnection(integration.key, integration.name)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            isOn ? "bg-[var(--c-pass)]" : "bg-[var(--c-border-strong)]"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
              isOn ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="label-eyebrow mb-1.5 block">Integration API Secret Key / Token</label>
          <input
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            type="password"
            placeholder="••••••••••••••••••••••••"
            className="w-full border border-[var(--c-border)] bg-[var(--c-bg-input)] p-3 text-sm outline-none focus:border-[var(--c-accent)] rounded-lg font-mono text-[var(--c-text)] placeholder-[var(--c-text-dim)]"
          />
        </div>
        <div>
          <label className="label-eyebrow mb-1.5 block">Streaming Webhook Callback URL</label>
          <input
            value={webhook}
            onChange={(e) => setWebhook(e.target.value)}
            placeholder="https://nexus.api.io/webhooks/v1/stream"
            className="w-full border border-[var(--c-border)] bg-[var(--c-bg-input)] p-3 text-sm outline-none focus:border-[var(--c-accent)] rounded-lg font-mono text-[var(--c-text)] placeholder-[var(--c-text-dim)]"
          />
        </div>
        
        <div className="space-y-2.5">
          <label className="label-eyebrow block">Notification Event Subscriptions</label>
          <div className="rounded-lg border border-[var(--c-border)]/40 bg-[var(--c-bg-card)]/30 p-3.5 space-y-3">
            <label className="flex items-center gap-3 text-sm cursor-pointer text-[var(--c-text)]">
              <input type="checkbox" defaultChecked className="rounded border-[var(--c-border)] text-[var(--c-accent)] focus:ring-[var(--c-accent)]" /> 
              <span>On test suite regression execution completes</span>
            </label>
            <label className="flex items-center gap-3 text-sm cursor-pointer text-[var(--c-text)]">
              <input type="checkbox" defaultChecked className="rounded border-[var(--c-border)] text-[var(--c-accent)] focus:ring-[var(--c-accent)]" /> 
              <span>On generation AI parsing failure alerts</span>
            </label>
            <label className="flex items-center gap-3 text-sm cursor-pointer text-[var(--c-text)]">
              <input type="checkbox" className="rounded border-[var(--c-border)] text-[var(--c-accent)] focus:ring-[var(--c-accent)]" /> 
              <span>On continuous bug sync ticket updates</span>
            </label>
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          onClick={() => {
            toast.success("Integration settings saved");
          }}
          className="rounded-lg bg-[var(--c-text)] px-4 py-2.5 text-sm font-semibold text-[var(--c-bg)] hover:bg-[var(--c-accent)] hover:shadow-md transition-all"
        >
          Save Configuration
        </button>
        <a
          href="#"
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--c-border)] px-4 py-2.5 text-xs font-semibold hover:border-[var(--c-text)] hover:text-[var(--c-text)] transition-colors"
        >
          <ExternalLink className="h-3 w-3" /> API Documentation
        </a>
      </div>
    </div>
  );
}