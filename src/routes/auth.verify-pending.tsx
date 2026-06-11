import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mail, ArrowLeft } from "lucide-react";
import { z } from "zod";
import { useAuth } from "@/lib/store";
import { supabase } from "@/lib/supabase";

const search = z.object({ email: z.string().optional() });

export const Route = createFileRoute("/auth/verify-pending")({
  validateSearch: (s) => search.parse(s),
  component: VerifyPendingPage,
});

function VerifyPendingPage() {
  const { email: queryEmail } = Route.useSearch();
  const auth = useAuth();
  const navigate = useNavigate();
  
  const displayEmail = queryEmail || auth.email;

  const [countdown, setCountdown] = useState(60);
  const [loading, setLoading] = useState(false);
  const [resendStatus, setResendStatus] = useState<"idle" | "success" | "error">("idle");

  useEffect(() => {
    // Start countdown immediately on mount assuming an email was just sent
    let timer: number;
    if (countdown > 0) {
      timer = window.setTimeout(() => setCountdown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  async function handleResend() {
    if (!displayEmail || countdown > 0) return;
    setLoading(true);
    setResendStatus("idle");
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: displayEmail,
        options: {
          emailRedirectTo: window.location.origin + '/auth/callback',
        }
      });
      if (error) throw error;
      setResendStatus("success");
      setCountdown(60);
    } catch (err) {
      console.error(err);
      setResendStatus("error");
    } finally {
      setLoading(false);
    }
  }

  // If verified, redirect to app
  useEffect(() => {
    if (auth.user?.email_confirmed_at) {
      navigate({ to: "/" });
    }
  }, [auth.user?.email_confirmed_at, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-accent/10">
          <Mail className="h-12 w-12 text-accent" />
        </div>
        
        <div className="space-y-3">
          <h2 className="font-display text-4xl">Check your email</h2>
          <p className="text-muted-foreground">
            We sent a verification link to <span className="font-medium text-foreground">{displayEmail || "your email address"}</span>. 
            The link expires in 12 hours.
          </p>
        </div>

        <div className="space-y-4 pt-4">
          <button
            onClick={handleResend}
            disabled={countdown > 0 || loading || !displayEmail}
            className="w-full rounded-sm bg-foreground py-3 text-sm text-background transition-colors hover:bg-accent disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
          >
            {loading ? "Sending..." : countdown > 0 ? `Resend in ${countdown}s` : "Resend email"}
          </button>
          
          {resendStatus === "success" && (
            <p className="text-sm text-accent">Verification email resent.</p>
          )}
          {resendStatus === "error" && (
            <p className="text-sm text-destructive">Failed to resend. Please try again later.</p>
          )}

          <div className="flex flex-col items-center justify-center space-y-4 pt-6 text-sm text-muted-foreground">
            <Link
              to="/auth"
              search={{ mode: "signup", email: displayEmail || "" }}
              className="group flex items-center gap-1.5 hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
              Wrong email address?
            </Link>
            <p className="text-xs">Check your spam folder if you don't see it.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
