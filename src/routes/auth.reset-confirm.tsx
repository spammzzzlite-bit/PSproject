import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/auth/reset-confirm")({
  component: AuthResetConfirmPage,
});

function AuthResetConfirmPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      
      // On success, redirect to login with a success indicator
      navigate({ to: "/auth", search: { mode: "signin", message: "Password updated. You can now log in." } as any });
    } catch (err: any) {
      setError(err.message || "Failed to update password. Your link may have expired.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-3xl">Set new password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Please enter your new password below.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <label className="block">
            <span className="label-eyebrow mb-1 block">New Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => {
                if (password && password.length < 8) setError("Password must be at least 8 characters.");
                else if (error === "Password must be at least 8 characters.") setError(null);
              }}
              placeholder="••••••••"
              required
              minLength={8}
              className="w-full border-b border-border bg-transparent py-2 text-base outline-none focus:border-accent"
            />
          </label>

          <label className="block">
            <span className="label-eyebrow mb-1 block">Confirm Password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onBlur={() => {
                if (confirmPassword && password !== confirmPassword) setError("Passwords do not match.");
                else if (error === "Passwords do not match.") setError(null);
              }}
              placeholder="••••••••"
              required
              className="w-full border-b border-border bg-transparent py-2 text-base outline-none focus:border-accent"
            />
          </label>

          {error && (
            <p className="rounded-sm border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full rounded-sm bg-foreground py-3 text-sm text-background hover:bg-accent disabled:opacity-60"
          >
            {loading ? "Updating..." : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
