import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { PageHeader } from "./_app.projects";

export const Route = createFileRoute("/_app/help")({
  head: () => ({ meta: [{ title: "Help & Docs — Field Notes" }] }),
  component: HelpPage,
});

const FAQ = [
  {
    q: "How do I generate test cases?",
    a: "Open the Generate page from the sidebar, paste your requirements (or upload a doc), and press Generate. Cases are drafted as plain rows you can edit or delete.",
  },
  {
    q: "How do I connect CI/CD?",
    a: "Visit Integrations and connect a runner — GitHub Actions, Jenkins, or GitLab CI. The current build uses mock connections; OAuth wiring is in the next issue.",
  },
  {
    q: "What file formats are supported?",
    a: ".pdf, .docx, .xlsx, .csv, .json, .yaml, .md and .txt. Files up to 25 MB per upload.",
  },
  {
    q: "Can I export my test cases?",
    a: "Yes — every project has an Export action that produces a .csv or .json snapshot. Coming alongside the first run.",
  },
];

function HelpPage() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader section="§ Help" title="Help & docs" subtitle="A short field guide. Email hello@fieldnotes.qa for anything else." />
      <div className="space-y-4">
        {FAQ.map((item, i) => (
          <div key={item.q} className="rounded-[12px] border border-[var(--c-border)] bg-[var(--c-bg-card)] overflow-hidden transition-all duration-[var(--t-normal)] stagger-item delay-${i * 100}">
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left hover:bg-[var(--c-bg-hover)] transition-colors"
            >
              <span className="font-display text-[22px] text-[var(--c-text)]">{item.q}</span>
              <ChevronDown className={`h-5 w-5 shrink-0 transition-transform duration-[var(--t-normal)] ${open === i ? "rotate-180 text-[var(--c-accent)]" : "text-[var(--c-text-muted)]"}`} />
            </button>
            <div className={`px-6 overflow-hidden transition-all duration-[var(--t-normal)] ${open === i ? "max-h-[500px] opacity-100 pb-6" : "max-h-0 opacity-0 pb-0"}`}>
              <div className="h-[1px] w-full bg-[var(--c-border)] mb-4" />
              <p className="text-[14px] leading-relaxed text-[var(--c-text-muted)]">{item.a}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}