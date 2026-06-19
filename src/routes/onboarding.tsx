import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import OnboardingFlow from "@/frontend/components/OnboardingFlow";
import { useAuth, useCurrentRole } from "@/frontend/store/store";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Onboarding — QAMind AI" },
      { name: "description", content: "Complete your onboarding setup." },
    ],
  }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const currentRole = useCurrentRole();

  useEffect(() => {
    if (auth.loading) return;

    if (!auth.session) {
      navigate({ to: "/auth" });
    } else {
      const onboardingComplete =
        typeof window !== "undefined" &&
        localStorage.getItem(`fieldnotes.user.${auth.user?.id}.onboardingComplete`) === "true" &&
        !!localStorage.getItem("fieldnotes.workspace.meta");
      if (onboardingComplete) {
        navigate({ to: "/" });
      }
    }
  }, [auth.session, auth.loading, auth.user?.id, navigate]);

  const handleComplete = () => {
    navigate({ to: "/" });
  };

  const handleSkip = () => {
    navigate({ to: "/" });
  };

  const handleNavigate = (route: string) => {
    navigate({ to: route });
  };

  if (auth.loading || !auth.session) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[var(--c-bg)]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--c-border)] border-t-[var(--c-text)]" />
      </div>
    );
  }

  const onboardingComplete =
    typeof window !== "undefined" &&
    localStorage.getItem(`fieldnotes.user.${auth.user?.id}.onboardingComplete`) === "true" &&
    !!localStorage.getItem("fieldnotes.workspace.meta");
  if (onboardingComplete) {
    return null;
  }

  return (
    <OnboardingFlow
      currentRole={currentRole}
      onComplete={handleComplete}
      onSkip={handleSkip}
      onNavigate={handleNavigate}
    />
  );
}
