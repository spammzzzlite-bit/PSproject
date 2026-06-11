import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/auth/reset")({
  component: AuthResetPage,
});

function AuthResetPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    
    // We intentionally ignore errors and always show success to prevent email enumeration
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/auth/reset-confirm',
    });
    
    setLoading(false);
    setSuccess(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <Link to="/auth" className="group mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          Back to sign in
        </Link>
        
        <h1 className="font-display text-3xl">Reset your password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your email address and we'll send you a link to reset your password.
        </p>

        {success ? (
          <div className="mt-8 rounded-sm border border-border bg-accent/5 p-4 text-sm text-foreground">
            If an account with that email exists, you'll receive a reset link shortly.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <label className="block">
              <span className="label-eyebrow mb-1 block">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full border-b border-border bg-transparent py-2 text-base outline-none focus:border-accent"
              />
            </label>

            <button
              type="submit"
              disabled={loading || !email}
              className="mt-4 w-full rounded-sm bg-foreground py-3 text-sm text-background hover:bg-accent disabled:opacity-60"
            >
              {loading ? "Sending link..." : "Send reset link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
