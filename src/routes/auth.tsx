import { createFileRoute, useNavigate, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/backend/supabase";
import { isValidEmail, parseAuthError } from "@/frontend/store/auth";
import { useAuth, getAvatarColor } from "@/frontend/store/store";
import { toast } from "sonner";

const search = z.object({
  mode: z.enum(["signin", "signup", "join"]).optional(),
  email: z.string().optional(),
  message: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — QAMind AI" },
      { name: "description", content: "Sign in to your QAMind AI workspace." },
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
  const [workspaceKey, setWorkspaceKey] = useState("");

  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [workspaceKeyError, setWorkspaceKeyError] = useState<string | null>(null);
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
    setWorkspaceKey("");
    setEmailError(null);
    setPasswordError(null);
    setConfirmError(null);
    setWorkspaceKeyError(null);
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
    if (mode === "join") {
      setFormError(null);
      setFormMessage(null);
      setWorkspaceKeyError(null);

      const isEmailValid = validateEmail();
      const isPassValid = validatePassword();
      const isConfirmValid = password === confirmPassword;
      if (!isConfirmValid) {
        setConfirmError("Passwords do not match.");
      }

      const isKeyValid = /^[A-Z0-9]{3}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(workspaceKey.trim());
      if (!workspaceKey.trim()) {
        setWorkspaceKeyError("Workspace key is required.");
      } else if (!isKeyValid) {
        setWorkspaceKeyError("Invalid workspace key format (expected FNQ-XXXX-XXXX).");
      }

      if (!isEmailValid || !isPassValid || !isConfirmValid || !isKeyValid) return;

      setLoading(true);

      let matchedWorkspaceId: string | null = null;
      let matchedRole: string | null = null;

      try {
        // Find matching pending invite in Supabase
        const { data: pendingInvite, error: inviteError } = await supabase
          .from("workspace_members")
          .select(`
            workspace_id,
            role,
            workspaces!inner (
              workspace_key
            )
          `)
          .eq("email", email)
          .eq("status", "pending")
          .eq("workspaces.workspace_key", workspaceKey.trim().toUpperCase())
          .maybeSingle();

        if (inviteError || !pendingInvite) {
          setFormError(
            "No active invite found. Check your workspace key and email, or ask your team owner to resend the invite.",
          );
          setLoading(false);
          return;
        }

        matchedWorkspaceId = pendingInvite.workspace_id;
        matchedRole = pendingInvite.role;
      } catch (err) {
        setFormError("Failed to verify invite.");
        setLoading(false);
        return;
      }

      let userId = "";
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/auth/callback" },
        });

        if (error) {
          setFormError(parseAuthError(error));
          setLoading(false);
          return;
        } else {
          userId = data.user?.id || "";
        }
      } catch (err) {
        setFormError("Authentication exception occurred.");
        setLoading(false);
        return;
      }

      if (userId) {
        // Activate their membership in Supabase
        await supabase
          .from("workspace_members")
          .update({
            user_id: userId,
            status: "active"
          })
          .eq("email", email)
          .eq("workspace_id", matchedWorkspaceId);

        toast.success("Successfully joined workspace!");

        const hasSession = (await supabase.auth.getSession()).data.session;
        if (hasSession) {
          window.location.href = "/onboarding";
        } else {
          navigate({ to: "/auth/verify-pending", search: { email } });
        }
      }
      setLoading(false);
      return;
    }

    setFormError(null);
    setFormMessage(null);

    const isEmailValid = validateEmail();
    const isPassValid = validatePassword();
    const isConfirmValid = isSignup ? validateConfirmPassword() : true;

    if (!isEmailValid || !isPassValid || !isConfirmValid) return;



    setLoading(true);
    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/auth/callback" },
        });

        if (error) {
          const parsed = parseAuthError(error);
          setFormError(parsed);
        } else if (data.user?.identities?.length === 0) {
          // Supabase returns identities: [] if the user already exists.
          // We trigger a verification email resend. If it succeeds, they were unverified and the email is sent.
          // If it fails with already confirmed, we tell them the account exists.
          const { error: resendError } = await supabase.auth.resend({
            type: "signup",
            email,
            options: { emailRedirectTo: window.location.origin + "/auth/callback" },
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
          const isUnconfirmed =
            error.message.includes("Email not confirmed") ||
            error.message.includes("Email not verified") ||
            error.message.includes("not confirmed") ||
            parsed === "Email not confirmed";
          if (isUnconfirmed) {
            // Case B (Login): Exists but not verified
            await supabase.auth.resend({ type: "signup", email });
            navigate({ to: "/auth/verify-pending", search: { email } });
          } else {
            // Case C & D
            setFormError(parsed);
            setPassword(""); // Do not clear email
          }
        } else {
          if (!data.user?.email_confirmed_at) {
            // Unlikely if Supabase enforces "Confirm email", but just in case
            await supabase.auth.resend({ type: "signup", email });
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

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin + "/auth/callback" },
      });
      if (error) {
        setFormError(parseAuthError(error));
      }
    } catch (err: any) {
      setFormError("Google sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-[var(--c-bg-card)] md:grid-cols-2">
      <aside className="relative hidden flex-col justify-between border-r border-[var(--c-border)] bg-[var(--c-bg-sidebar)] p-12 md:flex overflow-hidden">
        {/* Background Hand-Drawn Testing Doodles */}
        <div className="absolute inset-0 pointer-events-none select-none z-0">
          {/* Connecting lines */}
          <svg
            className="absolute inset-0 w-full h-full text-[var(--c-border-strong)] opacity-[0.25]"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            {/* Top lines */}
            <path d="M22 18 C28 20 32 22 36 25" strokeDasharray="3 4" />
            <path d="M30 30 C27 34 23 38 18 42" strokeDasharray="3 4" />
            <path d="M72 18 C78 21 82 23 86 26" strokeDasharray="3 4" />
            {/* New upper center connecting lines */}
            <path d="M40 22 C43 20 46 18 48 16" strokeDasharray="3 4" />
            <path d="M54 16 C60 15 67 14 74 13" strokeDasharray="3 4" />
            <path d="M54 22 C56 24 58 26 60 28" strokeDasharray="3 4" />
            <path d="M42 28 C40 26 38 24 35 22" strokeDasharray="3 4" />
            {/* Middle lines */}
            <path d="M88 32 C92 35 93 39 92 42" strokeDasharray="3 4" />
            <path d="M88 48 C85 50 82 52 79 53" strokeDasharray="3 4" />
            <path d="M76 60 C78 64 80 67 81 70" strokeDasharray="3 4" />
            <path d="M81 76 C84 78 86 80 88 82" strokeDasharray="3 4" />
            {/* Bottom lines */}
            <path d="M26 75 C24 78 22 80 20 83" strokeDasharray="3 4" />
            <path d="M12 58 C15 62 18 65 21 68" strokeDasharray="3 4" />
            {/* New bottom center connecting lines */}
            <path d="M42 84 C45 86 48 88 51 90" strokeDasharray="3 4" />
            <path d="M58 90 C62 88 66 86 70 84" strokeDasharray="3 4" />
            <path d="M76 80 C80 78 84 76 88 74" strokeDasharray="3 4" />
          </svg>

          {/* Sketched Bug (Top Left) */}
          <svg
            viewBox="0 0 100 100"
            className="absolute top-10 left-10 w-16 h-16 opacity-50 text-[var(--c-text-dim)]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M50 30 C40 30 35 45 35 60 C35 75 40 80 50 80 C60 80 65 75 65 60 C65 45 60 30 50 30 Z" />
            <path d="M50 30 C45 30 43 23 50 20 C57 23 55 30 50 30" />
            <path d="M35 45 C25 43 20 40 18 42" />
            <path d="M35 60 C23 60 18 58 15 62" />
            <path d="M35 75 C25 78 20 82 18 85" />
            <path d="M65 45 C75 43 80 40 82 42" />
            <path d="M65 60 C77 60 82 58 85 62" />
            <path d="M65 75 C75 78 80 82 82 85" />
            <path d="M47 20 C42 15 35 12 33 14" />
            <path d="M53 20 C58 15 65 12 67 14" />
          </svg>

          {/* Sketched Pencil (Notebook/Drafting - Upper Left Middle) */}
          <svg
            viewBox="0 0 100 100"
            className="absolute top-[18%] left-[24%] w-14 h-14 opacity-50 text-[var(--c-text-dim)]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ transform: "rotate(-45deg)" }}
          >
            <path d="M20 80 L20 70 L70 20 L80 30 L30 80 Z" />
            <path d="M20 70 L10 90 L30 80" />
            <path d="M10 90 L15 85 L10 90" fill="currentColor" />
            <path d="M70 20 L75 15 C77 13 83 19 80 22 L75 25" />
          </svg>

          {/* Sketched Database (Storage/Data - Upper Center) */}
          <svg
            viewBox="0 0 100 100"
            className="absolute top-[15%] left-[48%] w-14 h-14 opacity-50 text-[var(--c-text-dim)]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <ellipse cx="50" cy="30" rx="25" ry="10" />
            <path d="M25 30 L25 50 C25 55 35 60 50 60 C65 60 75 55 75 50 L75 30" />
            <path d="M25 50 L25 70 C25 75 35 80 50 80 C65 80 75 75 75 70 L75 50" />
          </svg>

          {/* Sketched Lightbulb (Top Right) */}
          <svg
            viewBox="0 0 100 100"
            className="absolute top-12 right-20 w-14 h-14 opacity-50 text-[var(--c-text-dim)]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M50 20 C35 20 30 35 30 48 C30 60 40 68 45 72 L45 80 L55 80 L55 72 C60 68 70 60 70 48 C70 35 65 20 50 20 Z" />
            <path d="M43 80 L57 80" />
            <path d="M45 84 L55 84" />
            <path d="M47 88 L53 88" strokeWidth="3" />
            <path d="M45 60 L48 45 L52 45 L55 60" />
            <path d="M50 10 L50 15" stroke="var(--c-accent)" />
            <path d="M22 25 L27 30" stroke="var(--c-accent)" />
            <path d="M78 25 L73 30" stroke="var(--c-accent)" />
            <path d="M15 48 L22 48" stroke="var(--c-accent)" />
            <path d="M85 48 L78 48" stroke="var(--c-accent)" />
          </svg>

          {/* Sketched Gear (Middle Upper Right) */}
          <svg
            viewBox="0 0 100 100"
            className="absolute top-1/4 right-8 w-16 h-16 opacity-50 text-[var(--c-text-dim)]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="50" cy="50" r="20" />
            <circle cx="50" cy="50" r="8" />
            <path d="M47 25 C47 21 53 21 53 25" />
            <path d="M47 75 C47 79 53 79 53 75" />
            <path d="M25 47 C21 47 21 53 25 53" />
            <path d="M75 47 C79 47 79 53 75 53" />
            <path d="M32 32 C29 29 34 24 37 27" />
            <path d="M68 68 C71 71 66 76 63 73" />
            <path d="M32 68 C29 71 34 76 37 73" />
            <path d="M68 32 C71 29 66 24 63 27" />
          </svg>

          {/* Sketched Magnifier (Search/Inspect - Upper Middle Left) */}
          <svg
            viewBox="0 0 100 100"
            className="absolute top-[28%] left-[38%] w-12 h-12 opacity-50 text-[var(--c-text-dim)]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ transform: "rotate(-15deg)" }}
          >
            <circle cx="45" cy="45" r="20" />
            <path d="M60 60 L85 85" strokeWidth="3.5" />
            <path d="M40 35 C45 32 50 35 52 38" stroke="var(--c-accent)" strokeWidth="1.5" />
          </svg>

          {/* Sketched Curly Braces (Code brackets - Upper Middle Right) */}
          <svg
            viewBox="0 0 100 100"
            className="absolute top-[26%] right-[32%] w-12 h-12 opacity-50 text-[var(--c-text-dim)]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M30 30 L20 50 L30 70" />
            <path d="M70 30 L80 50 L70 70" stroke="var(--c-accent)" />
            <path d="M55 25 L45 75" strokeWidth="2" />
          </svg>

          {/* Sketched Key (Security / Auth - Upper Left Middle) */}
          <svg
            viewBox="0 0 100 100"
            className="absolute top-[32%] left-[12%] w-14 h-14 opacity-50 text-[var(--c-text-dim)]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="40" cy="40" r="15" />
            <circle cx="40" cy="40" r="5" />
            <path d="M51 51 L80 80" />
            <path d="M70 70 L77 63" />
            <path d="M76 76 L83 69" />
          </svg>

          {/* Sketched Cloud Upload (CI/CD Deployment - Upper Right Middle) */}
          <svg
            viewBox="0 0 100 100"
            className="absolute top-[40%] right-[5%] w-15 h-15 opacity-50 text-[var(--c-text-dim)]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M25 65 C18 65 15 58 20 50 C18 40 28 30 38 35 C43 25 58 25 63 35 C73 30 83 40 80 50 C85 58 82 65 75 65 Z" />
            <path d="M50 45 L50 75 M40 65 L50 75 L60 65" stroke="var(--c-accent)" />
          </svg>

          {/* Sketched Atom / Network (Middle Left) */}
          <svg
            viewBox="0 0 100 100"
            className="absolute top-1/2 left-8 w-18 h-18 opacity-50 text-[var(--c-text-dim)]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="50" cy="25" r="7" />
            <circle cx="25" cy="65" r="7" />
            <circle cx="75" cy="65" r="7" />
            <circle cx="50" cy="75" r="7" />
            <path d="M46 31 L29 59" strokeDasharray="3 3" />
            <path d="M54 31 L71 59" strokeDasharray="3 3" />
            <path d="M32 65 L68 65" />
            <path d="M29 70 L44 73" />
            <path d="M71 70 L56 73" />
          </svg>

          {/* Sketched Clock (Timing / Performance - Middle Right) */}
          <svg
            viewBox="0 0 100 100"
            className="absolute top-[45%] right-[22%] w-14 h-14 opacity-50 text-[var(--c-text-dim)]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="50" cy="50" r="35" />
            <path d="M50 50 L50 28" />
            <path d="M50 50 L70 50" />
            <path d="M50 15 L50 20" />
            <path d="M50 85 L50 80" />
            <path d="M15 50 L20 50" />
            <path d="M85 50 L80 50" />
          </svg>

          {/* Sketched Warning / Shield (Assert / Security - Lower Left Middle) */}
          <svg
            viewBox="0 0 100 100"
            className="absolute bottom-[38%] left-[4%] w-14 h-14 opacity-50 text-[var(--c-text-dim)]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M50 15 C65 20 80 15 80 15 C80 15 80 50 80 60 C80 75 65 85 50 90 C35 85 20 75 20 60 C20 50 20 15 20 15 C20 15 35 20 50 15 Z" />
            <circle cx="50" cy="50" r="10" stroke="var(--c-accent)" />
            <path d="M50 45 L50 55" stroke="var(--c-accent)" />
          </svg>

          {/* Sketched Chemical Flask (Middle Lower Right) */}
          <svg
            viewBox="0 0 100 100"
            className="absolute top-[62%] right-[12%] w-16 h-16 opacity-50 text-[var(--c-text-dim)]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M43 20 L57 20 M50 20 L50 40 L25 80 C22 84 25 90 30 90 L70 90 C75 90 78 84 75 80 L50 40" />
            <path
              d="M33 70 C40 73 45 68 50 70 C55 72 60 68 67 70"
              stroke="var(--c-accent)"
              strokeWidth="2"
            />
            <circle cx="45" cy="55" r="2" fill="var(--c-accent)" stroke="none" />
            <circle cx="53" cy="62" r="3" fill="var(--c-accent)" stroke="none" />
            <circle cx="42" cy="78" r="1.5" fill="var(--c-accent)" stroke="none" />
          </svg>

          {/* Sketched Rocket (Launch / Ship - Lower Left Middle) */}
          <svg
            viewBox="0 0 100 100"
            className="absolute top-[60%] left-[20%] w-18 h-18 opacity-50 text-[var(--c-text-dim)]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M50 15 C55 30 65 50 65 70 L35 70 C35 50 45 30 50 15 Z" />
            <path d="M35 70 L20 85 L35 80" />
            <path d="M65 70 L80 85 L65 80" />
            <circle cx="50" cy="45" r="7" />
            <path d="M45 80 C45 92 50 95 50 95 C50 95 55 92 55 80" stroke="var(--c-accent)" />
          </svg>

          {/* Sketched Folder (Workspace - Lower Right Middle) */}
          <svg
            viewBox="0 0 100 100"
            className="absolute bottom-[32%] right-[16%] w-16 h-16 opacity-50 text-[var(--c-text-dim)]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 30 C20 25 25 25 30 25 L45 25 L53 35 L80 35 C85 35 85 40 85 45 L85 75 C85 80 80 80 75 80 L25 80 C20 80 20 75 20 70 Z" />
            <path d="M35 50 L65 50" stroke="var(--c-accent)" />
            <path d="M35 60 L55 60" />
          </svg>

          {/* Sketched Bar Chart (Lower Middle) */}
          <svg
            viewBox="0 0 100 100"
            className="absolute bottom-[18%] left-[35%] w-18 h-18 opacity-50 text-[var(--c-text-dim)]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 15 L15 85 L85 85" />
            <path d="M25 85 L25 55 L35 55 L35 85" stroke="var(--c-accent)" />
            <path d="M45 85 L45 35 L55 35 L55 85" />
            <path d="M65 85 L65 20 L75 20 L75 85" stroke="var(--c-accent)" />
          </svg>

          {/* Sketched Checkmark Badge (Success - Bottom Center) */}
          <svg
            viewBox="0 0 100 100"
            className="absolute bottom-[8%] left-[52%] w-12 h-12 opacity-50 text-[var(--c-text-dim)]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="50" cy="50" r="25" stroke="var(--c-accent)" />
            <path d="M40 50 L47 57 L62 42" stroke="var(--c-accent)" />
          </svg>

          {/* Sketched Balance Scale (Validation/Integrity - Bottom Center) */}
          <svg
            viewBox="0 0 100 100"
            className="absolute bottom-[12%] right-[30%] w-14 h-14 opacity-50 text-[var(--c-text-dim)]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M50 20 L50 75 M30 75 L70 75" />
            <path d="M30 35 L70 35" />
            <path d="M30 35 L20 60 L40 60 Z" />
            <path d="M70 35 L60 60 L80 60 Z" />
          </svg>

          {/* Sketched Target (Bottom Left) */}
          <svg
            viewBox="0 0 100 100"
            className="absolute bottom-16 left-16 w-20 h-20 opacity-50 text-[var(--c-text-dim)]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="50" cy="50" r="40" />
            <circle cx="50" cy="50" r="28" />
            <circle cx="50" cy="50" r="15" />
            <circle cx="50" cy="50" r="5" fill="currentColor" />
            <path d="M85 15 L52 48" stroke="var(--c-accent)" strokeWidth="3" />
            <path d="M48 44 L52 48 L48 52" fill="var(--c-accent)" />
            <path d="M80 12 L88 20" stroke="var(--c-accent)" strokeWidth="2" />
            <path d="M83 9 L91 17" stroke="var(--c-accent)" strokeWidth="1.5" />
          </svg>

          {/* Sketched Clipboard (Bottom Right) */}
          <svg
            viewBox="0 0 100 100"
            className="absolute bottom-28 right-10 w-20 h-20 opacity-50 text-[var(--c-text-dim)]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M35 25 C30 25 25 30 25 35 L25 80 C25 85 30 90 35 90 L70 90 C75 90 80 85 80 80 L80 35 C80 30 75 25 70 25 Z" />
            <path d="M45 25 C45 20 48 15 52 15 L58 15 C62 15 65 20 65 25 Z" />
            <path d="M35 45 L40 50 L50 40" stroke="var(--c-accent)" />
            <path d="M57 45 L72 45" />
            <path d="M35 60 L40 65 L50 55" stroke="var(--c-accent)" />
            <path d="M57 60 L72 60" />
            <path d="M35 75 L40 80 L50 70" stroke="var(--c-accent)" />
            <path d="M57 75 L72 75" />
          </svg>
        </div>

        <Link to="/welcome" className="relative font-display text-2xl font-bold z-10">
          QAMind <span style={{ color: "#C2552E" }}>AI</span>
        </Link>
        <div className="relative space-y-8 z-10">
          <p className="font-display text-3xl leading-snug opacity-0 animate-[fade-in-up_600ms_var(--ease-out)_both]">
            "Draft your specs, run your tests.
            <br />
            Build software that stands the
            <span className="italic text-[var(--c-accent)]"> test of time</span>."
          </p>
        </div>
        <p className="relative font-mono text-[12px] text-[var(--c-text-dim)] z-10"></p>
      </aside>

      <main className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <Link
            to="/welcome"
            className="label-eyebrow text-[var(--c-text-muted)] hover:text-[var(--c-accent)] transition-colors duration-[var(--t-instant)]"
          >
            ← Back to home
          </Link>
          <h1 className="mt-6 font-display text-[28px] font-semibold text-[var(--c-text)]">
            {mode === "join" ? "Join a Workspace" : isSignup ? "Open an account" : "Sign in"}
          </h1>
          <p className="mt-2 text-[14px] text-[var(--c-text-muted)] mb-[32px]">
            {mode === "join"
              ? "Enter your email, invite key and set your password."
              : isSignup
                ? "Create your account with email and password."
                : "Use the email and password you registered with."}
          </p>

          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="block">
              <span className="mb-1 block font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--c-text-muted)]">
                Email
              </span>
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
                className={`w-full rounded-[8px] bg-[var(--c-bg-input)] px-[14px] py-[10px] text-[14px] outline-none transition-all duration-[var(--t-fast)] border ${
                  emailError
                    ? "border-[var(--c-fail)] focus:border-[var(--c-fail)] focus:shadow-[0_0_0_3px_var(--c-fail-soft)]"
                    : "border-[var(--c-border)] focus:border-[var(--c-accent)] focus:shadow-[0_0_0_3px_var(--c-accent-soft)]"
                }`}
              />
              {emailError && <p className="mt-1 text-xs text-[var(--c-fail)]">{emailError}</p>}
            </div>

            {mode === "join" && (
              <div className="block">
                <span className="mb-1 block font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--c-text-muted)]">
                  Workspace Key
                </span>
                <input
                  type="text"
                  value={workspaceKey}
                  onChange={(e) => {
                    setWorkspaceKey(e.target.value.toUpperCase());
                    setWorkspaceKeyError(null);
                  }}
                  placeholder="FNQ-XXXX-XXXX"
                  required
                  className={`w-full rounded-[8px] bg-[var(--c-bg-input)] px-[14px] py-[10px] text-[14px] outline-none transition-all duration-[var(--t-fast)] border ${
                    workspaceKeyError
                      ? "border-[var(--c-fail)] focus:border-[var(--c-fail)] focus:shadow-[0_0_0_3px_var(--c-fail-soft)]"
                      : "border-[var(--c-border)] focus:border-[var(--c-accent)] focus:shadow-[0_0_0_3px_var(--c-accent-soft)]"
                  }`}
                />
                {workspaceKeyError && (
                  <p className="mt-1 text-xs text-[var(--c-fail)]">{workspaceKeyError}</p>
                )}
              </div>
            )}

            <div className="block">
              <div className="flex items-center justify-between mb-1">
                <span className="block font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--c-text-muted)]">
                  Password
                </span>
                {!isSignup && (
                  <Link
                    to="/auth/reset"
                    className="text-[12px] text-[var(--c-text-dim)] hover:text-[var(--c-accent)] transition-colors duration-[var(--t-instant)]"
                  >
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
                  autoComplete={isSignup || mode === "join" ? "new-password" : "current-password"}
                  required
                  className={`w-full rounded-[8px] bg-[var(--c-bg-input)] px-[14px] py-[10px] pr-10 text-[14px] outline-none transition-all duration-[var(--t-fast)] border ${
                    passwordError
                      ? "border-[var(--c-fail)] focus:border-[var(--c-fail)] focus:shadow-[0_0_0_3px_var(--c-fail-soft)]"
                      : "border-[var(--c-border)] focus:border-[var(--c-accent)] focus:shadow-[0_0_0_3px_var(--c-accent-soft)]"
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
              {passwordError && (
                <p className="mt-1 text-xs text-[var(--c-fail)]">{passwordError}</p>
              )}
            </div>

            {(isSignup || mode === "join") && (
              <div className="block">
                <span className="mb-1 block font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--c-text-muted)]">
                  Confirm Password
                </span>
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
                    className={`w-full rounded-[8px] bg-[var(--c-bg-input)] px-[14px] py-[10px] pr-10 text-[14px] outline-none transition-all duration-[var(--t-fast)] border ${
                      confirmError
                        ? "border-[var(--c-fail)] focus:border-[var(--c-fail)] focus:shadow-[0_0_0_3px_var(--c-fail-soft)]"
                        : "border-[var(--c-border)] focus:border-[var(--c-accent)] focus:shadow-[0_0_0_3px_var(--c-accent-soft)]"
                    }`}
                  />
                </div>
                {confirmError && (
                  <p className="mt-1 text-xs text-[var(--c-fail)]">{confirmError}</p>
                )}
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
              {loading && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[rgba(255,255,255,0.3)] border-t-white" />
              )}
              {loading
                ? "Please wait…"
                : mode === "join"
                  ? "Join Workspace →"
                  : isSignup
                    ? "Open account →"
                    : "Sign in →"}
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
            Continue with Google
          </button>

          <p className="mt-8 text-center text-[14px] text-[var(--c-text-muted)]">
            {mode === "join" ? (
              <>
                Already have an invite account?{" "}
                <Link
                  to="/auth"
                  search={{ mode: "signin", email }}
                  className="text-[var(--c-accent)] transition-colors hover:underline"
                >
                  Sign in
                </Link>
              </>
            ) : (
              <>
                {isSignup ? "Already have an account?" : "New here?"}{" "}
                <Link
                  to="/auth"
                  search={{ mode: isSignup ? "signin" : "signup", email }}
                  className="text-[var(--c-accent)] transition-colors hover:underline"
                >
                  {isSignup ? "Sign in" : "Open an account"}
                </Link>
              </>
            )}
            {mode !== "join" && (
              <span className="block mt-2">
                <Link
                  to="/auth"
                  search={{ mode: "join", email }}
                  className="text-[var(--c-accent)] transition-colors hover:underline text-xs"
                >
                  Join a Workspace
                </Link>
              </span>
            )}
          </p>
        </div>
      </main>
    </div>
  );
}
