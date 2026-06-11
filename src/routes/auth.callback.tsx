import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/store";

const search = z.object({ code: z.string().optional() });

export const Route = createFileRoute("/auth/callback")({
  validateSearch: (s) => search.parse(s),
  component: AuthCallbackPage,
});

type Status = "exchanging" | "success" | "invalid_or_expired" | "idle";

function AuthCallbackPage() {
  const { code } = Route.useSearch();
  const navigate = useNavigate();
  const auth = useAuth();
  const [status, setStatus] = useState<Status>(code ? "exchanging" : "idle");
  const [resendEmail, setResendEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const exchanged = useRef(false);

  useEffect(() => {
    if (!code || exchanged.current) return;
    exchanged.current = true;

    async function exchange() {
      try {
        const { error } = await supabase.auth.exchangeCodeForSession(code!);
        if (error) throw error;
        setStatus("success");
        setTimeout(() => {
          navigate({ to: "/" });
        }, 1500);
      } catch (err) {
        console.error(err);
        setStatus("invalid_or_expired");
      }
    }
    exchange();
  }, [code, navigate]);

  useEffect(() => {
    if (!code && auth.user?.email_confirmed_at) {
      navigate({ to: "/" });
    }
  }, [code, auth.user, navigate]);

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    const targetEmail = auth.email || resendEmail;
    if (!targetEmail) return;

    setLoading(true);
    try {
      await supabase.auth.resend({
        type: 'signup',
        email: targetEmail,
        options: {
          emailRedirectTo: window.location.origin + '/auth/callback',
        }
      });
      navigate({ to: "/auth/verify-pending", search: { email: targetEmail } });
    } finally {
      setLoading(false);
    }
  }

  if (status === "idle" && !code) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-muted-foreground">Invalid link.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-6 text-center">
        {status === "exchanging" && (
          <div className="space-y-4">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-border border-t-foreground" />
            <p className="font-medium text-foreground">Verifying your email...</p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10 text-green-500">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="font-medium text-foreground">Email verified! Taking you in...</p>
          </div>
        )}

        {status === "invalid_or_expired" && (
          <div className="space-y-6">
            <h2 className="font-display text-3xl">Link expired or invalid</h2>
            <p className="text-sm text-muted-foreground">
              This verification link has expired or is no longer valid. It may have already been used.
            </p>

            <form onSubmit={handleResend} className="space-y-4 text-left">
              {!auth.email && (
                <label className="block">
                  <span className="mb-1 block text-sm font-medium">Enter your email to resend</span>
                  <input
                    type="email"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full rounded-sm border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                </label>
              )}
              
              <button
                type="submit"
                disabled={loading || (!auth.email && !resendEmail)}
                className="w-full rounded-sm bg-foreground py-2.5 text-sm text-background hover:bg-accent disabled:opacity-60"
              >
                {loading ? "Sending..." : "Request a new link"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
