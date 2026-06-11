import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import OnboardingFlow from "@/components/OnboardingFlow";
import { useAuth } from "@/lib/store";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Onboarding — Field Notes" },
      { name: "description", content: "Complete your onboarding setup." },
    ],
  }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (auth.loading) return;

    if (!auth.session) {
      navigate({ to: "/auth" });
    } else {
      const onboardingComplete = typeof window !== "undefined" && localStorage.getItem(`fieldnotes_onboarding_complete.${auth.user?.id}`) === "true";
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

  const onboardingComplete = typeof window !== "undefined" && localStorage.getItem(`fieldnotes_onboarding_complete.${auth.user?.id}`) === "true";
  if (onboardingComplete) {
    return null;
  }

  return (
    <OnboardingFlow
      onComplete={handleComplete}
      onSkip={handleSkip}
      onNavigate={handleNavigate}
    />
  );
}
