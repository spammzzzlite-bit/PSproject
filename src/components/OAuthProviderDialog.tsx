import { useEffect, useState } from "react";
import {
  authErrorMessage,
  getAccountsForProvider,
  registerWithEmail,
  signInWithEmail,
  signInWithOAuthProfile,
  type AuthProvider,
} from "@/lib/auth";
import { signIn } from "@/lib/store";

type Props = {
  provider: Extract<AuthProvider, "google" | "github">;
  open: boolean;
  isSignup: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

const META = {
  google: {
    title: "Sign in with Google",
    signupTitle: "Sign up with Google",
    subtitle: "Use your Google Account",
    brandClass: "bg-white text-[#4285F4] border border-border shadow-sm",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
    ),
  },
  github: {
    title: "Sign in to GitHub",
    signupTitle: "Join with GitHub",
    subtitle: "Continue to Field Notes",
    brandClass: "bg-foreground text-background",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.15 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.62.24 2.85.12 3.15.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
      </svg>
    ),
  },
} as const;

export function OAuthProviderDialog({ provider, open, isSignup, onClose, onSuccess }: Props) {
  const meta = META[provider];
  const twoStep = provider === "google";
  const [step, setStep] = useState<"account" | "password">("account");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [knownAccounts, setKnownAccounts] = useState<typeof import("@/lib/auth").StoredUser[]>([]);

  useEffect(() => {
    if (!open) return;
    setStep("account");
    setEmail("");
    setPassword("");
    setError(null);
    
    (async () => {
      const accounts = await getAccountsForProvider(provider);
      setKnownAccounts(accounts);
    })();
  }, [open, provider]);

  if (!open) return null;

  async function completeSignIn() {
    setError(null);
    setLoading(true);
    try {
      const result = isSignup
        ? await registerWithEmail(email, password)
        : await signInWithEmail(email, password);

      if (!result.ok) {
        setError(authErrorMessage(result.code));
        return;
      }

      const oauthUser = await signInWithOAuthProfile({
        ...result.user,
        provider,
      });
      signIn(oauthUser);
      onSuccess();
    } finally {
      setLoading(false);
    }
  }

  function pickAccount(accountEmail: string) {
    setEmail(accountEmail);
    setStep("password");
    setError(null);
  }

  function handleAccountNext(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      setError("Enter your email address.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setError("Enter a valid email address.");
      return;
    }
    setEmail(normalized);
    setStep("password");
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    await completeSignIn();
  }

  const title = isSignup ? meta.signupTitle : meta.title;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="oauth-dialog-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[400px] overflow-hidden rounded-lg border border-border bg-background shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-border px-6 py-5">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full ${meta.brandClass}`}
            >
              {meta.icon}
            </div>
            <div>
              <h2 id="oauth-dialog-title" className="text-lg font-semibold text-foreground">
                {title}
              </h2>
              <p className="text-sm text-muted-foreground">{meta.subtitle}</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5">
          {twoStep && step === "account" ? (
            <form onSubmit={handleAccountNext} className="space-y-4">
              {knownAccounts.length > 0 && (
                <ul className="space-y-1">
                  {knownAccounts.map((account) => (
                    <li key={account.email}>
                      <button
                        type="button"
                        onClick={() => pickAccount(account.email)}
                        className="flex w-full items-center gap-3 rounded-md border border-transparent px-3 py-2.5 text-left hover:border-border hover:bg-muted"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted font-medium">
                          {account.name[0]?.toUpperCase() ?? account.email[0]?.toUpperCase()}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{account.name}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {account.email}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                  <li className="pt-1">
                    <p className="px-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      Use another account
                    </p>
                  </li>
                </ul>
              )}

              <label className="block">
                <span className="sr-only">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email or phone"
                  autoComplete="email"
                  autoFocus
                  className="w-full rounded-sm border border-border px-3 py-2.5 text-sm outline-none focus:border-[#4285F4] focus:ring-1 focus:ring-[#4285F4]/30"
                />
              </label>

              {error && <ErrorBox message={error} />}

              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-sm bg-[#1a73e8] px-5 py-2 text-sm font-medium text-white hover:bg-[#1765cc]"
                >
                  Next
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {twoStep && (
                <button
                  type="button"
                  onClick={() => {
                    setStep("account");
                    setPassword("");
                    setError(null);
                  }}
                  className="flex w-full items-center gap-3 rounded-md border border-border px-3 py-2 text-left hover:bg-muted"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
                    {email[0]?.toUpperCase()}
                  </span>
                  <span className="truncate text-sm">{email}</span>
                </button>
              )}

              {!twoStep && (
                <label className="block">
                  <span className="label-eyebrow mb-1 block">Email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className="w-full rounded-sm border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                </label>
              )}

              <label className="block">
                <span className="label-eyebrow mb-1 block">
                  {twoStep ? "Enter your password" : "Password"}
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  autoFocus={twoStep}
                  className="w-full rounded-sm border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </label>

              {error && <ErrorBox message={error} />}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-sm border border-border py-2.5 text-sm hover:border-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`flex-1 rounded-sm py-2.5 text-sm text-white disabled:opacity-60 ${
                    provider === "google"
                      ? "bg-[#1a73e8] hover:bg-[#1765cc]"
                      : "bg-foreground hover:bg-accent"
                  }`}
                >
                  {loading ? "Please wait…" : isSignup ? "Create account" : "Sign in"}
                </button>
              </div>
            </form>
          )}
        </div>

        {provider === "google" && (
          <p className="border-t border-border px-6 py-3 text-center text-xs text-muted-foreground">
            Field Notes · local workspace auth
          </p>
        )}
      </div>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <p className="rounded-sm border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
      {message}
    </p>
  );
}
