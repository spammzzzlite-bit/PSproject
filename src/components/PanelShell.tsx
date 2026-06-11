import { X } from "lucide-react";
import { Breadcrumbs } from "./Breadcrumbs";
import { usePanel } from "./PanelContext";

export function PanelShell() {
  const { isOpen, content, breadcrumbs, closePanel } = usePanel();

  if (!isOpen || !content) return null;

  return (
    <div className="flex h-full flex-col border-l border-border bg-card panel-enter">
      {/* Panel header */}
      <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-3">
        <Breadcrumbs items={breadcrumbs} />
        <button
          onClick={closePanel}
          className="rounded-sm p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title="Close panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {/* Panel body */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        {content}
      </div>
    </div>
  );
}
