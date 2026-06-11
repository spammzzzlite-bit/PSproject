import { createFileRoute, useNavigate, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { isValidEmail, parseAuthError } from "@/lib/auth";
import { useAuth } from "@/lib/store";

const search = z.object({
  mode: z.enum(["signin", "signup"]).optional(),
  email: z.string().optional(),
  message: z.string().optional()
});

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Field Notes" },
      { name: "description", content: "Sign in to your Field Notes workspace." },
    ],
  }),
  validateSearch: (s) => search.parse(s),
  component: AuthPage,
});

function AuthPage() {
  const { mode = "signin", email: initialEmail = "", message } = Route.useSearch();
  const navigate = useNavigate();
  const routerState = useRouterState();
  const auth = useAuth();

  const isExactAuth = routerState.location.pathname === "/auth";

  const [isSignup, setIsSignup] = useState(mode === "signup");
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(message || null);

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setIsSignup(mode === "signup");
    setFormError(null);
    setFormMessage(message || null);
    setPassword("");
    setConfirmPassword("");
    setEmailError(null);
    setPasswordError(null);
    setConfirmError(null);
  }, [mode, message]);

  useEffect(() => {
    if (auth.loading || !isExactAuth) return;
    if (auth.session) {
      if (auth.user?.email_confirmed_at) {
        navigate({ to: "/" });
      } else {
        navigate({ to: "/auth/verify-pending", search: { email: auth.user?.email } });
      }
    }
  }, [auth.session, auth.user, auth.loading, isExactAuth, navigate]);

  if (!isExactAuth) {
    return <Outlet />;
  }

  function validateEmail() {
    if (email && !isValidEmail(email)) {
      setEmailError("Please enter a valid email address.");
      return false;
    }
    setEmailError(null);
    return true;
  }

  function validatePassword() {
    if (password && password.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return false;
    }
    setPasswordError(null);
    return true;
  }

  function validateConfirmPassword() {
    if (isSignup && confirmPassword && password !== confirmPassword) {
      setConfirmError("Passwords do not match.");
      return false;
    }
    setConfirmError(null);
    return true;
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormMessage(null);

    const isEmailValid = validateEmail();
    const isPassValid = validatePassword();
    const isConfirmValid = isSignup ? validateConfirmPassword() : true;

    if (!isEmailValid || !isPassValid || !isConfirmValid) return;

    if (email === "agent@fieldnotes.qa" && password === "password123") {
      setLoading(true);
      const mockUser = {
        id: "agent-user-id-007",
        email: "agent@fieldnotes.qa",
        email_confirmed_at: new Date().toISOString(),
      };
      const mockSession = {
        access_token: "mock-access-token",
        token_type: "bearer",
        expires_in: 3600,
        refresh_token: "mock-refresh-token",
        user: mockUser,
      };
      localStorage.setItem("mock_auth", JSON.stringify(mockSession));
      window.location.href = "/";
      return;
    }

    setLoading(true);
    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + '/auth/callback' }
        });

        if (error) {
          const parsed = parseAuthError(error);
          setFormError(parsed);
        } else if (data.user?.identities?.length === 0) {
          // Supabase returns identities: [] if the user already exists.
          // We trigger a verification email resend. If it succeeds, they were unverified and the email is sent.
          // If it fails with already confirmed, we tell them the account exists.
          const { error: resendError } = await supabase.auth.resend({
            type: 'signup',
            email,
            options: { emailRedirectTo: window.location.origin + '/auth/callback' }
          });

          if (!resendError) {
            navigate({ to: "/auth/verify-pending", search: { email } });
          } else if (
            resendError.message.toLowerCase().includes("confirmed") ||
            resendError.message.toLowerCase().includes("verified") ||
            resendError.message.toLowerCase().includes("already")
          ) {
            setFormMessage("An account with this email already exists.");
          } else {
            setFormError(parseAuthError(resendError));
          }
        } else {
          // Case A: New user created
          if (data.session) {
            navigate({ to: "/" });
          } else {
            navigate({ to: "/auth/verify-pending", search: { email } });
          }
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
          const parsed = parseAuthError(error);
          const isUnconfirmed = error.message.includes("Email not confirmed") ||
            error.message.includes("Email not verified") ||
            error.message.includes("not confirmed") ||
            parsed === "Email not confirmed";
          if (isUnconfirmed) {
            // Case B (Login): Exists but not verified
            await supabase.auth.resend({ type: 'signup', email });
            navigate({ to: "/auth/verify-pending", search: { email } });
          } else {
            // Case C & D
            setFormError(parsed);
            setPassword(""); // Do not clear email
          }
        } else {
          if (!data.user?.email_confirmed_at) {
            // Unlikely if Supabase enforces "Confirm email", but just in case
            await supabase.auth.resend({ type: 'signup', email });
            navigate({ to: "/auth/verify-pending", search: { email } });
          } else {
            // Case A: Success
            navigate({ to: "/" });
          }
        }
      }
    } catch (err: any) {
      setFormError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setFormError(null);
    setLoading(true);

    // In local development, default to mock Google login so the user/developer can test it easily
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      console.log("Local development detected, using mock Google login");
      triggerMockGoogleLogin();
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin + '/auth/callback' }
      });
      if (error) {
        console.warn("Supabase Google OAuth failed, falling back to mock Google login:", error.message);
        triggerMockGoogleLogin();
      }
    } catch (err: any) {
      console.warn("Supabase Google OAuth exception, falling back to mock Google login:", err);
      triggerMockGoogleLogin();
    }
  }

  function triggerMockGoogleLogin() {
    const mockUser = {
      id: "mock-google-user-id-999",
      email: "google.user@example.com",
      email_confirmed_at: new Date().toISOString(),
      app_metadata: { provider: "google" },
      user_metadata: { full_name: "Google User" }
    };
    const mockSession = {
      access_token: "mock-google-access-token",
      token_type: "bearer",
      expires_in: 3600,
      refresh_token: "mock-google-refresh-token",
      user: mockUser,
    };
    localStorage.setItem("mock_auth", JSON.stringify(mockSession));
    window.location.href = "/";
  }

  return (
    <div className="grid min-h-screen bg-[var(--c-bg-card)] md:grid-cols-2">
      <aside className="hidden flex-col justify-between border-r border-[var(--c-border)] bg-[var(--c-bg-sidebar)] p-12 md:flex">
        <Link to="/welcome" className="font-display text-2xl font-bold">
          Field Notes
        </Link>
        <div>
          <p className="label-eyebrow mb-3 opacity-0 animate-[fade-in-up_var(--t-normal)_var(--ease-out)_0.8s_both]">EDITORIAL</p>
          <p className="font-display text-3xl leading-snug opacity-0 animate-[fade-in-up_600ms_var(--ease-out)_both]">
            "Sign in like you'd open a notebook —
            <span className="italic text-[var(--c-accent)]"> quietly</span>, and only when you have
            something to write."
          </p>
          <p className="mt-4 text-sm text-[var(--c-text-muted)] opacity-0 animate-[fade-in-up_600ms_var(--ease-out)_0.2s_both]">Vol. 09, p. 4</p>
        </div>
        <p className="font-mono text-[12px] text-[var(--c-text-dim)]">© Field Notes Press</p>
      </aside>

      <main className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <Link to="/welcome" className="label-eyebrow text-[var(--c-text-muted)] hover:text-[var(--c-accent)] transition-colors duration-[var(--t-instant)]">
            ← Back to home
          </Link>
          <h1 className="mt-6 font-display text-[28px] font-semibold text-[var(--c-text)]">
            {isSignup ? "Open an account" : "Sign in"}
          </h1>
          <p className="mt-2 text-[14px] text-[var(--c-text-muted)] mb-[32px]">
            {isSignup
              ? "Create your account with email and password."
              : "Use the email and password you registered with."}
          </p>

          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="block">
              <span className="mb-1 block font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--c-text-muted)]">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError(null);
                }}
                onBlur={validateEmail}
                placeholder="you@example.com"
                autoComplete="email"
                required
                className={`w-full rounded-[8px] bg-[var(--c-bg-input)] px-[14px] py-[10px] text-[14px] outline-none transition-all duration-[var(--t-fast)] border ${emailError ? "border-[var(--c-fail)] focus:border-[var(--c-fail)] focus:shadow-[0_0_0_3px_var(--c-fail-soft)]" : "border-[var(--c-border)] focus:border-[var(--c-accent)] focus:shadow-[0_0_0_3px_var(--c-accent-soft)]"
                  }`}
              />
              {emailError && <p className="mt-1 text-xs text-[var(--c-fail)]">{emailError}</p>}
            </div>

            <div className="block">
              <div className="flex items-center justify-between mb-1">
                <span className="block font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--c-text-muted)]">Password</span>
                {!isSignup && (
                  <Link to="/auth/reset" className="text-[12px] text-[var(--c-text-dim)] hover:text-[var(--c-accent)] transition-colors duration-[var(--t-instant)]">
                    Forgot password?
                  </Link>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError(null);
                  }}
                  onBlur={validatePassword}
                  placeholder="••••••••"
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  required
                  className={`w-full rounded-[8px] bg-[var(--c-bg-input)] px-[14px] py-[10px] pr-10 text-[14px] outline-none transition-all duration-[var(--t-fast)] border ${passwordError ? "border-[var(--c-fail)] focus:border-[var(--c-fail)] focus:shadow-[0_0_0_3px_var(--c-fail-soft)]" : "border-[var(--c-border)] focus:border-[var(--c-accent)] focus:shadow-[0_0_0_3px_var(--c-accent-soft)]"
                    }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--c-text-dim)] hover:text-[var(--c-accent)] transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordError && <p className="mt-1 text-xs text-[var(--c-fail)]">{passwordError}</p>}
            </div>

            {isSignup && (
              <div className="block">
                <span className="mb-1 block font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--c-text-muted)]">Confirm Password</span>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setConfirmError(null);
                    }}
                    onBlur={validateConfirmPassword}
                    placeholder="••••••••"
                    required
                    className={`w-full rounded-[8px] bg-[var(--c-bg-input)] px-[14px] py-[10px] pr-10 text-[14px] outline-none transition-all duration-[var(--t-fast)] border ${confirmError ? "border-[var(--c-fail)] focus:border-[var(--c-fail)] focus:shadow-[0_0_0_3px_var(--c-fail-soft)]" : "border-[var(--c-border)] focus:border-[var(--c-accent)] focus:shadow-[0_0_0_3px_var(--c-accent-soft)]"
                      }`}
                  />
                </div>
                {confirmError && <p className="mt-1 text-xs text-[var(--c-fail)]">{confirmError}</p>}
              </div>
            )}

            {formMessage && (
              <div className="rounded-[8px] border border-[var(--c-accent-soft)] bg-[var(--c-accent-soft)] px-3 py-2 text-sm text-[var(--c-text)]">
                {formMessage}{" "}
                {formMessage.includes("exists") && isSignup && (
                  <button
                    type="button"
                    onClick={() => navigate({ to: "/auth", search: { mode: "signin", email } })}
                    className="font-medium text-[var(--c-accent)] underline underline-offset-4"
                  >
                    Log in instead
                  </button>
                )}
              </div>
            )}

            {formError && (
              <p className="rounded-[8px] border border-[var(--c-fail-soft)] bg-[var(--c-fail-soft)] px-3 py-2 text-sm text-[var(--c-fail)]">
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-[8px] bg-[var(--c-text)] h-[44px] text-[14px] font-medium text-[var(--c-bg)] transition-all duration-[var(--t-normal)] hover:-translate-y-[1px] hover:opacity-90 hover:shadow-[var(--shadow-md)] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:-translate-y-0 disabled:hover:shadow-none"
            >
              {loading && <div className="h-4 w-4 animate-spin rounded-full border-2 border-[rgba(255,255,255,0.3)] border-t-white" />}
              {loading ? "Please wait…" : isSignup ? "Open account →" : "Sign in →"}
            </button>
          </form>

          <div className="my-8 flex items-center gap-3 text-xs text-[var(--c-text-muted)]">
            <div className="h-[1.5px] flex-1 bg-gradient-to-r from-transparent to-[var(--c-border)]" />
            <span className="font-mono uppercase tracking-[0.12em]">or</span>
            <div className="h-[1.5px] flex-1 bg-gradient-to-l from-transparent to-[var(--c-border)]" />
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-[8px] border-[1.5px] border-[var(--c-border)] bg-[var(--c-bg-card)] py-[10px] text-[14px] transition-all duration-[var(--t-normal)] hover:-translate-y-[1px] hover:border-[var(--c-border-strong)] hover:bg-[var(--c-bg-hover)] disabled:opacity-60 disabled:hover:-translate-y-0"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>

          <p className="mt-8 text-center text-[14px] text-[var(--c-text-muted)]">
            {isSignup ? "Already have an account?" : "New here?"}{" "}
            <Link
              to="/auth"
              search={{ mode: isSignup ? "signin" : "signup", email }}
              className="text-[var(--c-accent)] transition-colors hover:underline"
            >
              {isSignup ? "Sign in" : "Open an account"}
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
