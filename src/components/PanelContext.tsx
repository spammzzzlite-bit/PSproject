import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type BreadcrumbItem = { label: string; onClick?: () => void };

type PanelState = {
  isOpen: boolean;
  content: ReactNode | null;
  breadcrumbs: BreadcrumbItem[];
};

type PanelContextType = PanelState & {
  openPanel: (content: ReactNode, breadcrumbs?: BreadcrumbItem[]) => void;
  closePanel: () => void;
  updateBreadcrumbs: (breadcrumbs: BreadcrumbItem[]) => void;
  setContent: (content: ReactNode) => void;
};

const PanelContext = createContext<PanelContextType | null>(null);

export function PanelProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PanelState>({
    isOpen: false,
    content: null,
    breadcrumbs: [],
  });

  const openPanel = useCallback((content: ReactNode, breadcrumbs: BreadcrumbItem[] = []) => {
    setState({ isOpen: true, content, breadcrumbs });
  }, []);

  const closePanel = useCallback(() => {
    setState({ isOpen: false, content: null, breadcrumbs: [] });
  }, []);

  const updateBreadcrumbs = useCallback((breadcrumbs: BreadcrumbItem[]) => {
    setState((prev) => ({ ...prev, breadcrumbs }));
  }, []);

  const setContent = useCallback((content: ReactNode) => {
    setState((prev) => ({ ...prev, content }));
  }, []);

  return (
    <PanelContext.Provider value={{ ...state, openPanel, closePanel, updateBreadcrumbs, setContent }}>
      {children}
    </PanelContext.Provider>
  );
}

export function usePanel() {
  const ctx = useContext(PanelContext);
  if (!ctx) throw new Error("usePanel must be used within PanelProvider");
  return ctx;
}
