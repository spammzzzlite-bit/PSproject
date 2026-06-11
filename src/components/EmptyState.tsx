import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  body: string;
  cta?: { label: string; to?: string; onClick?: () => void };
}

export function EmptyState({ icon: Icon, title, body, cta }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-muted">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="mt-5 font-display text-xl">{title}</p>
      <p className="mt-1.5 max-w-md text-sm text-muted-foreground">{body}</p>
      {cta && (
        cta.to ? (
          <Link to={cta.to} className="mt-5 rounded-sm border border-foreground px-4 py-2 text-sm hover:bg-foreground hover:text-background transition-colors">
            {cta.label}
          </Link>
        ) : (
          <button onClick={cta.onClick} className="mt-5 rounded-sm border border-foreground px-4 py-2 text-sm hover:bg-foreground hover:text-background transition-colors">
            {cta.label}
          </button>
        )
      )}
    </div>
  );
}
