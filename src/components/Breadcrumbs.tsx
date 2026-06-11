import { ChevronRight } from "lucide-react";
import type { BreadcrumbItem } from "./PanelContext";

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <nav className="flex items-center gap-1 text-sm" aria-label="Breadcrumb">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
          {item.onClick && i < items.length - 1 ? (
            <button
              onClick={item.onClick}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {item.label}
            </button>
          ) : (
            <span className={i === items.length - 1 ? "font-medium text-foreground" : "text-muted-foreground"}>
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
