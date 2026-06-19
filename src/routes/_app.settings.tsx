import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Sparkles,
  Bell,
  Coins,
  ShieldAlert,
  Key,
  User,
  Trash2,
  X,
  Settings,
  Users,
  Plus,
  Edit2,
  Mail,
  Pencil,
} from "lucide-react";
import { PageHeader } from "./_app.projects";
import {
  useSettings,
  useTokens,
  setPlan,
  signOut,
  deleteUserAccount,
  useAuth,
  useWorkspaceMeta,
  useWorkspaceMembersList,
  useCurrentRole,
  getAvatarColor,
  useTokenDeductions,
  type WorkspaceMeta,
  type WorkspaceMember,
} from "@/frontend/store/store";
import { PermissionGate, can } from "@/lib/permissions";
import { toast } from "./_app";

function generateWorkspaceKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const genPart = (length: number) => {
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };
  return `FNQ-${genPart(4)}-${genPart(4)}`;
}

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings — QAMind AI" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const [settings, setSettings] = useSettings();
  const [tokens] = useTokens();
  const navigate = useNavigate();
  const auth = useAuth();
  const [workspaceMeta, updateWorkspaceMeta] = useWorkspaceMeta();
  const currentRole = useCurrentRole();
  const [deductions] = useTokenDeductions();
  const [members, updateMembers] = useWorkspaceMembersList();
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  // Form states - Profile
  const [profileName, setProfileName] = useState(settings.userName || "");
  const [profileUsername, setProfileUsername] = useState(settings.username || "");
  const [profileEmail, setProfileEmail] = useState(settings.userEmail || "");
  const [profileRole, setProfileRole] = useState(settings.role || "QA Engineer");

  // Form states - Security
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [twoFactor, setTwoFactor] = useState(settings.twoFactorEnabled || false);

  // Form states - Preferences
  const [prefView, setPrefView] = useState(settings.defaultProjectView || "card");
  const [prefTimezone, setPrefTimezone] = useState(settings.timezone || "America/New_York");
  const [prefDateFormat, setPrefDateFormat] = useState(settings.dateFormat || "MM/DD/YYYY");
  const [prefCoverage, setPrefCoverage] = useState(settings.coverageEnabled || false);

  // Modal state - Danger Zone Delete Account
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmUsername, setConfirmUsername] = useState("");
  const expectedUsername = settings.username || settings.userName || "delete";

  function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    const emailChanged = profileEmail !== settings.userEmail;
    setSettings((prev) => ({
      ...prev,
      userName: profileName,
      userEmail: profileEmail,
      username: profileUsername,
      role: profileRole,
    }));
    toast.success("Profile settings updated successfully.");
    if (emailChanged) {
      toast.info(`Verification email sent to ${profileEmail}. Please check your inbox.`);
    }
  }

  function saveSecurity(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword && newPassword !== confirmPassword) {
      toast.error("New passwords do not match!");
      return;
    }
    setSettings((prev) => ({
      ...prev,
      twoFactorEnabled: twoFactor,
    }));
    toast.success("Security configuration updated.");
    if (newPassword) {
      toast.success("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  }

  const canToggleCoverage = useMemo(() => {
    return can(currentRole.toLowerCase() as any, "project:create");
  }, [currentRole]);

  function savePreferences(e: React.FormEvent) {
    e.preventDefault();
    setSettings((prev) => ({
      ...prev,
      defaultProjectView: prefView as any,
      timezone: prefTimezone,
      dateFormat: prefDateFormat,
      coverageEnabled: canToggleCoverage ? prefCoverage : prev.coverageEnabled,
    }));
    toast.success("Workspace preferences updated.");
  }

  function toggleNotification(key: keyof typeof settings.notifications) {
    setSettings((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: !prev.notifications[key],
      },
    }));
    toast.success("Notification preferences updated.");
  }

  function handleModelChange(val: string) {
    setSettings((prev) => ({ ...prev, aiModel: val }));
    toast.success(`Active AI Model set to ${val}`);
  }

  function handleTogglePlan() {
    const nextPlan = tokens.plan === "Standard" ? "Premium" : "Standard";
    setPlan(nextPlan);
    toast.success(`Plan changed to ${nextPlan}. Token balance initialized.`);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageHeader
        section="§ Workspace"
        title="Settings"
        subtitle="Manage models, billing, notifications, and profile details."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Profile & Settings Sections */}
        <div className="space-y-6 lg:col-span-2">
          {/* Workspace & Members Section */}
          <div className="space-y-6">
            <div className="border-b border-[var(--c-border)] pb-2">
              <h2 className="font-display text-[20px] font-semibold text-[var(--c-text)]">
                Workspace
              </h2>
              <p className="text-[12px] text-[var(--c-text-muted)]">
                Manage your organization details, invite keys, and team member permissions.
              </p>
            </div>

            {/* Subsection: Workspace Key display + copy + regenerate (Owner only) */}
            {can(currentRole.toLowerCase() as any, "workspace:viewKey") && workspaceMeta && (
              <div className="rounded-[12px] border border-[var(--c-border)] bg-[var(--c-bg-card)] p-6 space-y-4">
                <div className="flex items-center gap-2 border-b border-[var(--c-border)] pb-3">
                  <Key className="h-5 w-5 text-[var(--c-accent)]" />
                  <h3 className="font-display text-[18px] text-[var(--c-text)]">
                    Workspace Invite Key
                  </h3>
                </div>
                <p className="text-[13px] text-[var(--c-text-muted)]">
                  Manage your workspace invite key. Share this key with team members to let them join
                  your organization.
                </p>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="block font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">
                      Workspace Invite Key
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={workspaceMeta.workspaceKey}
                        className="flex-1 rounded-[6px] border border-[var(--c-border)] bg-[var(--c-bg-input)] px-[12px] py-[8px] text-[13px] font-mono outline-none"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(workspaceMeta.workspaceKey);
                          toast.success("Workspace invite key copied to clipboard.");
                        }}
                        className="rounded-[6px] border border-[var(--c-border)] bg-[var(--c-bg-input)] px-4 py-[8px] text-[12px] font-medium text-[var(--c-text)] hover:bg-[var(--c-bg-hover)] transition-colors"
                      >
                        Copy
                      </button>
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              "Are you sure you want to regenerate the invite key? This will invalidate all pending invitations.",
                            )
                          ) {
                            const newKey = generateWorkspaceKey();
                            const updatedMeta = { ...workspaceMeta, workspaceKey: newKey };

                            // Save locally and update in shared workspaces
                            updateWorkspaceMeta(updatedMeta);

                            // Clear pending invites in the registry
                            const sharedRaw = localStorage.getItem("fieldnotes.shared.workspaces");
                            if (sharedRaw) {
                              const shared = JSON.parse(sharedRaw);
                              if (shared[workspaceMeta.workspaceId]) {
                                shared[workspaceMeta.workspaceId].pendingInvites = [];
                                localStorage.setItem(
                                  "fieldnotes.shared.workspaces",
                                  JSON.stringify(shared),
                                );
                              }
                            }

                            toast.success(
                              "Workspace invite key regenerated. All pending invites have been invalidated.",
                            );
                            window.dispatchEvent(new Event("storage"));
                          }
                        }}
                        className="rounded-[6px] border border-[var(--c-fail)]/40 hover:border-[var(--c-fail)] text-[var(--c-fail)] px-4 py-[8px] text-[12px] font-medium transition-colors"
                      >
                        Regenerate
                      </button>
                    </div>
                  </div>

                  <div className="rounded-[6px] bg-[var(--c-bg-hover)] p-3 border border-[var(--c-border)]/50">
                    <p className="text-[11px] text-[var(--c-text-muted)] leading-relaxed">
                      <strong>Note:</strong> Regenerating the invite key immediately invalidates all
                      active, pending invitations. Previously onboarded team members will not be
                      affected.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Subsection: Workspace & Members panel (visible to all) */}
            <TeamMembersCard />
          </div>

          {/* Card 1: AI Integration (Keep as is) */}
          <div className="rounded-[12px] border border-[var(--c-border)] bg-[var(--c-bg-card)] p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-[var(--c-border)] pb-3">
              <Sparkles className="h-5 w-5 text-[var(--c-accent)]" />
              <h3 className="font-display text-[20px] text-[var(--c-text)]">AI Integration</h3>
            </div>
            <p className="text-[13px] text-[var(--c-text-muted)]">
              Choose the default LLM engine that powers test case draft generation.
            </p>
            <div className="space-y-1.5">
              <label className="block font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">
                AI Model Provider
              </label>
              <select
                value={settings.aiModel}
                onChange={(e) => handleModelChange(e.target.value)}
                className="w-full rounded-[6px] border border-[var(--c-border)] bg-[var(--c-bg-input)] p-[10px] text-[13px] outline-none focus:border-[var(--c-accent)]"
              >
                <option value="gpt-4o">GPT-4o (OpenAI)</option>
                <option value="claude-3-5">Claude 3.5 Sonnet (Anthropic)</option>
                <option value="gemini-1-5">Gemini 1.5 Pro (Google)</option>
                <option value="llama-3">Llama 3 70B (Meta)</option>
              </select>
            </div>
          </div>

          {/* Card 2: Expanded Profile Section */}
          <div className="rounded-[12px] border border-[var(--c-border)] bg-[var(--c-bg-card)] p-6 space-y-5">
            <div className="flex items-center gap-2 border-b border-[var(--c-border)] pb-3">
              <User className="h-5 w-5 text-[var(--c-accent)]" />
              <h3 className="font-display text-[20px] text-[var(--c-text)]">Account profile</h3>
            </div>
            <form onSubmit={saveProfile} className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--c-accent)] text-[18px] font-bold text-white shadow-[var(--shadow-sm)]">
                  {(profileName
                    ? profileName[0]
                    : profileEmail
                      ? profileEmail[0]
                      : "U"
                  ).toUpperCase()}
                </div>
                <div>
                  <p className="text-[14px] font-medium text-[var(--c-text)]">
                    Profile initials avatar
                  </p>
                  <p className="text-[11px] text-[var(--c-text-muted)]">
                    Generated automatically from your name.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">
                    Full name
                  </label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full rounded-[6px] border border-[var(--c-border)] bg-[var(--c-bg-input)] px-[12px] py-[8px] text-[13px] outline-none focus:border-[var(--c-accent)]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">
                    Username
                  </label>
                  <input
                    type="text"
                    value={profileUsername}
                    onChange={(e) => setProfileUsername(e.target.value)}
                    placeholder="janedoe"
                    className="w-full rounded-[6px] border border-[var(--c-border)] bg-[var(--c-bg-input)] px-[12px] py-[8px] text-[13px] outline-none focus:border-[var(--c-accent)]"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">
                    Email address
                  </label>
                  <input
                    type="email"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    placeholder="jane@example.com"
                    className="w-full rounded-[6px] border border-[var(--c-border)] bg-[var(--c-bg-input)] px-[12px] py-[8px] text-[13px] outline-none focus:border-[var(--c-accent)]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">
                    Role / Title
                  </label>
                  <input
                    type="text"
                    value={profileRole}
                    onChange={(e) => setProfileRole(e.target.value)}
                    placeholder="QA Lead"
                    className="w-full rounded-[6px] border border-[var(--c-border)] bg-[var(--c-bg-input)] px-[12px] py-[8px] text-[13px] outline-none focus:border-[var(--c-accent)]"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="rounded-[8px] bg-[var(--c-text)] px-4 py-2 text-[12px] font-medium text-[var(--c-bg)] hover:opacity-90 transition-colors"
                >
                  Save profile
                </button>
              </div>
            </form>
          </div>

          {/* Card 3: Security & 2FA */}
          <div className="rounded-[12px] border border-[var(--c-border)] bg-[var(--c-bg-card)] p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-[var(--c-border)] pb-3">
              <Key className="h-5 w-5 text-[var(--c-accent)]" />
              <h3 className="font-display text-[20px] text-[var(--c-text)]">Security settings</h3>
            </div>
            <form onSubmit={saveSecurity} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="block font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-[6px] border border-[var(--c-border)] bg-[var(--c-bg-input)] px-[12px] py-[8px] text-[13px] outline-none focus:border-[var(--c-accent)]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-[6px] border border-[var(--c-border)] bg-[var(--c-bg-input)] px-[12px] py-[8px] text-[13px] outline-none focus:border-[var(--c-accent)]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-[6px] border border-[var(--c-border)] bg-[var(--c-bg-input)] px-[12px] py-[8px] text-[13px] outline-none focus:border-[var(--c-accent)]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg-input)]/25 p-4 mt-2">
                <div className="space-y-0.5">
                  <p className="text-[13px] font-medium text-[var(--c-text)]">
                    Two-factor Authentication (2FA)
                  </p>
                  <p className="text-[11px] text-[var(--c-text-muted)]">
                    Add an extra layer of security using an authenticator app.
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={twoFactor}
                    onChange={(e) => setTwoFactor(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-[var(--c-border-strong)] after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-[var(--c-accent)] peer-checked:after:translate-x-full"></div>
                </label>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="rounded-[8px] bg-[var(--c-text)] px-4 py-2 text-[12px] font-medium text-[var(--c-bg)] hover:opacity-90 transition-colors"
                >
                  Save security
                </button>
              </div>
            </form>
          </div>

          {/* Card 4: Preferences */}
          <div className="rounded-[12px] border border-[var(--c-border)] bg-[var(--c-bg-card)] p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-[var(--c-border)] pb-3">
              <Settings className="h-5 w-5 text-[var(--c-accent)]" />
              <h3 className="font-display text-[20px] text-[var(--c-text)]">Preferences</h3>
            </div>
            <form onSubmit={savePreferences} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="block font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">
                    Default View
                  </label>
                  <select
                    value={prefView}
                    onChange={(e) => setPrefView(e.target.value as any)}
                    className="w-full rounded-[6px] border border-[var(--c-border)] bg-[var(--c-bg-input)] p-[8px] text-[13px] outline-none focus:border-[var(--c-accent)]"
                  >
                    <option value="card">Card Grid</option>
                    <option value="list">Compact List</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">
                    Timezone
                  </label>
                  <select
                    value={prefTimezone}
                    onChange={(e) => setPrefTimezone(e.target.value)}
                    className="w-full rounded-[6px] border border-[var(--c-border)] bg-[var(--c-bg-input)] p-[8px] text-[13px] outline-none focus:border-[var(--c-accent)]"
                  >
                    <option value="America/New_York">EST (New York)</option>
                    <option value="Europe/London">GMT (London)</option>
                    <option value="Asia/Kolkata">IST (India)</option>
                    <option value="Asia/Tokyo">JST (Tokyo)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">
                    Date Format
                  </label>
                  <select
                    value={prefDateFormat}
                    onChange={(e) => setPrefDateFormat(e.target.value)}
                    className="w-full rounded-[6px] border border-[var(--c-border)] bg-[var(--c-bg-input)] p-[8px] text-[13px] outline-none focus:border-[var(--c-accent)]"
                  >
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>
              </div>

              {/* Coverage Metrics Toggle - Visible to Owner and Admin only */}
              {can(currentRole.toLowerCase() as any, "project:create") && (
                <div className="flex items-center gap-3 rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg-input)]/25 p-4 mt-4">
                  <div className="space-y-0.5 flex-1">
                    <p className="text-[13px] font-medium text-[var(--c-text)]">
                      Enable test coverage collection
                    </p>
                    <p className="text-[11px] text-[var(--c-text-muted)]">
                      Instruct the mock test runner to collect and display line/branch coverage data
                      for project runs.
                    </p>
                  </div>
                  <label className={`relative inline-flex items-center ${canToggleCoverage ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}>
                    <input
                      type="checkbox"
                      checked={prefCoverage}
                      onChange={(e) => {
                        if (canToggleCoverage) {
                          setPrefCoverage(e.target.checked);
                        }
                      }}
                      disabled={!canToggleCoverage}
                      className="peer sr-only"
                    />
                    <div className="peer h-6 w-11 rounded-full bg-[var(--c-border-strong)] after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-[var(--c-accent)] peer-checked:after:translate-x-full peer-disabled:opacity-50"></div>
                  </label>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="rounded-[8px] bg-[var(--c-text)] px-4 py-2 text-[12px] font-medium text-[var(--c-bg)] hover:opacity-90 transition-colors"
                >
                  Save preferences
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Billing, Notifications, Danger Zone, Membership */}
        <div className="space-y-6">
          {/* Card 5: Token Billing / Plan & Billing (Owner only) */}
          {can(currentRole.toLowerCase() as any, "workspace:viewKey") && (
            <div className="rounded-[12px] border border-[var(--c-border)] bg-[var(--c-bg-card)] p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-[var(--c-border)] pb-3">
                <Coins className="h-5 w-5 text-[var(--c-accent)]" />
                <h3 className="font-display text-[20px] text-[var(--c-text)]">Token usage</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-[13px] text-[var(--c-text-muted)] font-medium">
                    Plan level
                  </span>
                  <span
                    className={`rounded-sm px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider ${tokens.plan === "Premium" ? "bg-[var(--c-accent-soft)] text-[var(--c-accent)]" : "bg-[var(--c-bg-hover)] text-[var(--c-text-muted)] border border-[var(--c-border)]"}`}
                  >
                    {tokens.plan}
                  </span>
                </div>
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[13px] font-medium">
                    <span>Balance</span>
                    <span>
                      {tokens.plan === "Premium"
                        ? "Unlimited"
                        : `${tokens.balance} / ${tokens.maxTokens} pts`}
                    </span>
                  </div>
                  {tokens.plan !== "Premium" && (
                    <div className="h-[6px] w-full bg-[var(--c-bg-hover)] rounded-full overflow-hidden border border-[var(--c-border)]">
                      <div
                        className="h-full bg-[var(--c-accent)] rounded-full transition-all duration-[var(--t-slow)]"
                        style={{ width: `${(tokens.balance / tokens.maxTokens) * 100}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
              <PermissionGate action="settings:plan">
                <button
                  onClick={handleTogglePlan}
                  className={`w-full rounded-[8px] py-2 text-[12px] font-medium transition-all ${
                    tokens.plan === "Premium"
                      ? "border border-[var(--c-border)] bg-transparent text-[var(--c-text-muted)] hover:bg-[var(--c-bg-hover)]"
                      : "bg-[var(--c-accent)] text-white hover:bg-[var(--c-accent-dark)]"
                  }`}
                >
                  {tokens.plan === "Premium"
                    ? "Downgrade to Standard"
                    : "Upgrade to Premium (Free Demo)"}
                </button>
              </PermissionGate>

              {/* Deductions History List */}
              <div className="pt-4 border-t border-[var(--c-border)]/60 space-y-3">
                <h4 className="font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">
                  Token Deduction History
                </h4>
                {deductions.length === 0 ? (
                  <p className="text-[12px] text-[var(--c-text-muted)] italic">
                    No token usage logs found yet.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                    {deductions.map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center justify-between text-[12px] rounded-[6px] border border-[var(--c-border)]/40 bg-[var(--c-bg-hover)]/10 p-2"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="font-medium text-[var(--c-text)] truncate" title={d.action}>
                            {d.action}
                          </p>
                          <p className="text-[10px] text-[var(--c-text-muted)]">
                            {new Date(d.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            · {new Date(d.timestamp).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                        <span className="font-mono text-[11px] font-semibold text-[var(--c-fail)] shrink-0">
                          -{d.amount} pts
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Card 6: Notification Toggles */}
          <div className="rounded-[12px] border border-[var(--c-border)] bg-[var(--c-bg-card)] p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-[var(--c-border)] pb-3">
              <Bell className="h-5 w-5 text-[var(--c-accent)]" />
              <h3 className="font-display text-[20px] text-[var(--c-text)]">Notifications</h3>
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer text-[13px]">
                <input
                  type="checkbox"
                  checked={settings.notifications.runComplete}
                  onChange={() => toggleNotification("runComplete")}
                  className="rounded border-[var(--c-border)] text-[var(--c-accent)] focus:ring-[var(--c-accent)]"
                />
                <span>Test execution runs complete</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer text-[13px]">
                <input
                  type="checkbox"
                  checked={settings.notifications.bugFiled}
                  onChange={() => toggleNotification("bugFiled")}
                  className="rounded border-[var(--c-border)] text-[var(--c-accent)] focus:ring-[var(--c-accent)]"
                />
                <span>Bugs reported & logged</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer text-[13px]">
                <input
                  type="checkbox"
                  checked={settings.notifications.tokenLow}
                  onChange={() => toggleNotification("tokenLow")}
                  className="rounded border-[var(--c-border)] text-[var(--c-accent)] focus:ring-[var(--c-accent)]"
                />
                <span>Token low alert warning</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer text-[13px]">
                <input
                  type="checkbox"
                  checked={settings.notifications.weeklyDigest}
                  onChange={() => toggleNotification("weeklyDigest")}
                  className="rounded border-[var(--c-border)] text-[var(--c-accent)] focus:ring-[var(--c-accent)]"
                />
                <span>Weekly summary digest</span>
              </label>
            </div>
          </div>

          {/* Card 7: Danger Zone (Owner Only) - Restyled to be aesthetic */}
          {can(currentRole.toLowerCase() as any, "settings:danger") && (
            <div className="rounded-[12px] border border-[var(--c-border)] bg-[var(--c-bg-card)] p-6 space-y-3 transition-colors hover:border-[var(--c-fail)]/30">
              <div className="flex items-center gap-2 text-[var(--c-text)]">
                <ShieldAlert className="h-5 w-5 text-[var(--c-fail)]" />
                <h3 className="font-display text-[20px] font-semibold leading-none">Danger Zone</h3>
              </div>
              <p className="text-[12px] text-[var(--c-text-muted)] leading-normal">
                Permanently wipe all projects, tests, activities, settings, and tokens.
              </p>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-[8px] border border-[var(--c-fail)]/30 bg-transparent text-[var(--c-fail)] hover:bg-[var(--c-fail)]/5 hover:border-[var(--c-fail)] py-2 text-[12px] font-medium transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete Account
              </button>
            </div>
          )}

          {/* Card 8: My Workspace Membership (non-Owner Roles) */}
          {!can(currentRole.toLowerCase() as any, "workspace:viewKey") && (
            <div className="rounded-[12px] border border-[var(--c-border)] bg-[var(--c-bg-card)] p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-[var(--c-border)] pb-3">
                <Users className="h-5 w-5 text-[var(--c-accent)]" />
                <h3 className="font-display text-[20px] text-[var(--c-text)]">
                  My Membership
                </h3>
              </div>

              {(() => {
                const currentUserMember = members.find((m) => m.userId === auth.user?.id);
                const inviter = members.find((m) => m.userId === currentUserMember?.addedBy);
                const inviterName = inviter
                  ? (inviter.displayName || inviter.email.split("@")[0])
                  : "Workspace Owner";
                const joinDate = currentUserMember?.joinedAt
                  ? new Date(currentUserMember.joinedAt).toLocaleDateString([], {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "N/A";
                const roleBadge = getRoleBadgeStyle(currentRole);

                return (
                  <div className="space-y-4">
                    <div className="space-y-3 text-[13px]">
                      <div className="flex justify-between items-center">
                        <span className="text-[var(--c-text-muted)]">Workspace</span>
                        <span className="font-medium text-[var(--c-text)]">
                          {workspaceMeta?.workspaceName || "My Workspace"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[var(--c-text-muted)]">Assigned Role</span>
                        <span
                          className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide"
                          style={{ backgroundColor: roleBadge.bg, color: roleBadge.text }}
                        >
                          {roleBadge.label}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[var(--c-text-muted)]">Added By</span>
                        <span className="font-medium text-[var(--c-text)]">
                          {inviterName}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[var(--c-text-muted)]">Date Joined</span>
                        <span className="font-medium font-mono text-[12px] text-[var(--c-text)]">
                          {joinDate}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => setShowLeaveModal(true)}
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-[8px] border border-[var(--c-fail)]/30 bg-transparent text-[var(--c-fail)] hover:bg-[var(--c-fail)]/5 hover:border-[var(--c-fail)] py-2 text-[12px] font-medium transition-colors"
                    >
                      Leave workspace
                    </button>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Danger Zone Confirmation Modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(26,23,20,0.4)] p-4 backdrop-blur-[4px] animate-[fade-in-up_var(--t-normal)_var(--ease-out)_both]"
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            className="w-full max-w-md rounded-[16px] border border-[var(--c-border)] bg-[var(--c-bg-card)] p-[28px] shadow-[var(--shadow-lg)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-[24px] flex items-center justify-between">
              <p className="font-display text-[26px] text-[var(--c-fail)]">Delete Account</p>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="rounded-full p-2 text-[var(--c-text-muted)] transition-colors hover:bg-[var(--c-bg-hover)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-4 text-[13px] text-[var(--c-text-muted)] leading-relaxed">
              This action is permanent and cannot be undone. All your projects, suites, test cases,
              and history will be deleted.
            </p>
            <p className="mb-4 text-[13px] font-mono text-[var(--c-text-muted)]">
              Type <span className="font-semibold text-[var(--c-text)]">"{expectedUsername}"</span>{" "}
              to confirm:
            </p>
            <input
              autoFocus
              type="text"
              value={confirmUsername}
              onChange={(e) => setConfirmUsername(e.target.value)}
              placeholder="Type username here..."
              className="w-full rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg-input)] px-[14px] py-[10px] text-[14px] outline-none transition-all focus:border-[var(--c-fail)] focus:shadow-[0_0_0_3px_rgba(168,59,59,0.15)]"
            />
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="rounded-[8px] border-[1.5px] border-[var(--c-border)] bg-transparent px-[16px] py-[8px] text-[13px] font-medium transition-all hover:bg-[var(--c-bg-hover)]"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (confirmUsername === expectedUsername) {
                    setShowDeleteModal(false);
                    await deleteUserAccount();
                    toast.success("Account deleted successfully.");
                    navigate({ to: "/welcome" });
                  }
                }}
                disabled={confirmUsername !== expectedUsername}
                className="rounded-[8px] bg-[var(--c-fail)] px-[16px] py-[8px] text-[13px] font-medium text-white transition-all hover:bg-[#8A3232] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Workspace Confirmation Modal */}
      {showLeaveModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(26,23,20,0.4)] p-4 backdrop-blur-[4px] animate-[fade-in-up_var(--t-normal)_var(--ease-out)_both]"
          onClick={() => setShowLeaveModal(false)}
        >
          <div
            className="w-full max-w-md rounded-[16px] border border-[var(--c-border)] bg-[var(--c-bg-card)] p-[28px] shadow-[var(--shadow-lg)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-[24px] flex items-center justify-between">
              <p className="font-display text-[26px] text-[var(--c-fail)]">Leave Workspace</p>
              <button
                onClick={() => setShowLeaveModal(false)}
                className="rounded-full p-2 text-[var(--c-text-muted)] transition-colors hover:bg-[var(--c-bg-hover)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-6 text-[13px] text-[var(--c-text-muted)] leading-relaxed">
              You will lose access to <strong className="text-[var(--c-text)]">{workspaceMeta?.workspaceName || "this workspace"}</strong> immediately. This cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowLeaveModal(false)}
                className="rounded-[8px] border-[1.5px] border-[var(--c-border)] bg-transparent px-[16px] py-[8px] text-[13px] font-medium transition-all hover:bg-[var(--c-bg-hover)]"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowLeaveModal(false);
                  const userId = auth.user?.id;
                  if (userId) {
                    const updated = members.filter((m) => m.userId !== userId);
                    updateMembers(updated);
                    localStorage.removeItem("fieldnotes.workspace.meta");
                    localStorage.removeItem("fieldnotes.workspace.members");
                    localStorage.removeItem(`fieldnotes.user.${userId}.role`);
                    localStorage.removeItem(`fieldnotes.user.${userId}.onboardingComplete`);
                    localStorage.removeItem(`fieldnotes_onboarding_complete.${userId}`);
                  }
                  await signOut();
                  toast.success("You have successfully left the workspace.");
                  navigate({ to: "/welcome" });
                }}
                className="rounded-[8px] bg-[var(--c-fail)] px-[16px] py-[8px] text-[13px] font-medium text-white transition-all hover:bg-[#8A3232]"
              >
                Confirm & Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Developer Reset Section */}
      <div className="mt-8 pt-8 border-t border-[var(--c-border)] max-w-[600px]">
        <h3 className="font-display text-[18px] text-[var(--c-text)] mb-2">Developer Actions</h3>
        <p className="text-[13px] text-[var(--c-text-muted)] mb-4">
          Actions used for testing the application flows.
        </p>
        <button
          onClick={() => {
            const userId = auth.user?.id;
            localStorage.removeItem("fieldnotes_onboarding_complete");
            if (userId) {
              localStorage.removeItem(`fieldnotes_onboarding_complete.${userId}`);
              localStorage.removeItem(`fieldnotes.user.${userId}.onboardingComplete`);
              localStorage.removeItem(`fieldnotes_onboarding_data.${userId}`);
              localStorage.removeItem("fieldnotes.workspace.meta");
              localStorage.removeItem("fieldnotes.workspace.members");
            }
            window.location.href = "/onboarding";
          }}
          className="rounded-[8px] border border-[var(--c-border)] bg-transparent px-[16px] py-[8px] text-[13px] font-medium transition-all hover:bg-[var(--c-bg-hover)] text-[var(--c-text)]"
        >
          Reset Onboarding
        </button>
      </div>
    </div>
  );
}

function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    const first = parts[0].charAt(0);
    const last = parts[parts.length - 1].charAt(0);
    return (first + last).toUpperCase();
  }
  const nameClean = parts[0];
  const subParts = nameClean.split(/[._-]+/);
  if (subParts.length >= 2) {
    const first = subParts[0].charAt(0);
    const last = subParts[subParts.length - 1].charAt(0);
    return (first + last).toUpperCase();
  }
  return nameClean.slice(0, 2).toUpperCase();
}

const getRoleValue = (r: string) => {
  const role = r.toLowerCase() as any;
  if (can(role, "workspace:viewKey")) return 4;
  if (can(role, "project:create")) return 3;
  if (can(role, "suite:create")) return 2;
  return 1;
};

const getRoleBadgeStyle = (roleStr: string) => {
  const role = roleStr.toLowerCase() as any;
  if (can(role, "workspace:viewKey")) return { bg: "#F59E0B", text: "#FFFFFF", label: "Owner" };
  if (can(role, "project:create")) return { bg: "var(--c-accent)", text: "#FFFFFF", label: "Admin" }; // app's primary orange
  if (can(role, "suite:create")) return { bg: "#3B82F6", text: "#FFFFFF", label: "Editor" };
  return { bg: "#64748B", text: "#FFFFFF", label: "Viewer" }; // viewer / slate
};

function TeamMembersCard() {
  const auth = useAuth();
  const [workspaceMeta] = useWorkspaceMeta();
  const [members, updateMembers] = useWorkspaceMembersList();
  const currentRole = useCurrentRole();
  const [, setSettings] = useSettings();

  // Get pending invites
  const pendingInvites = useMemo(() => {
    if (typeof window === "undefined" || !workspaceMeta) return [];
    const sharedRaw = localStorage.getItem("fieldnotes.shared.workspaces");
    if (!sharedRaw) return [];
    try {
      const shared = JSON.parse(sharedRaw);
      const ws = shared[workspaceMeta.workspaceId];
      return ws?.pendingInvites || [];
    } catch (e) {
      return [];
    }
  }, [workspaceMeta]);

  const updatePendingInvites = (newInvites: any[]) => {
    if (typeof window === "undefined" || !workspaceMeta) return;
    const sharedRaw = localStorage.getItem("fieldnotes.shared.workspaces");
    const shared = sharedRaw ? JSON.parse(sharedRaw) : {};
    if (shared[workspaceMeta.workspaceId]) {
      shared[workspaceMeta.workspaceId].pendingInvites = newInvites;
      localStorage.setItem("fieldnotes.shared.workspaces", JSON.stringify(shared));
      window.dispatchEvent(new Event("storage"));
    }
  };

  // State for Invite / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit" | "edit_self">("add");
  const [modalStep, setModalStep] = useState(1);

  // Form state
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<"admin" | "editor" | "viewer">("editor");
  const [jobTitle, setJobTitle] = useState("QA Engineer");
  const [emailError, setEmailError] = useState("");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const resetFormState = () => {
    setEmail("");
    setDisplayName("");
    setRole("editor");
    setJobTitle("QA Engineer");
    setEmailError("");
    setEditingUserId(null);
    setModalStep(1);
  };

  const validateEmail = (emailVal: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailVal) {
      setEmailError("Email is required.");
      return false;
    }
    if (!emailRegex.test(emailVal)) {
      setEmailError("Please enter a valid email address.");
      return false;
    }
    if (members.some((m) => m.email.toLowerCase() === emailVal.toLowerCase())) {
      setEmailError("This email is already an active member of the workspace.");
      return false;
    }
    if (pendingInvites.some((inv: any) => inv.email.toLowerCase() === emailVal.toLowerCase())) {
      setEmailError("This email already has a pending invitation.");
      return false;
    }
    setEmailError("");
    return true;
  };

  const handleSendInvite = () => {
    if (!validateEmail(email)) return;

    const existingInvites = JSON.parse(
      localStorage.getItem("fieldnotes.pending_invites") || "{}"
    );

    const emailLower = email.toLowerCase().trim();

    // Block duplicate pending invites for same email
    if (
      existingInvites[emailLower] &&
      existingInvites[emailLower].status === "pending"
    ) {
      toast.error("An invite is already pending for this email.");
      return;
    }

    // Also block if already an active member
    if (members.some((m) => m.email.toLowerCase() === emailLower)) {
      toast.error("This email is already an active member of the workspace.");
      return;
    }

    const newInvite = {
      inviteId: crypto.randomUUID(),
      inviterUserId: auth.user?.id ?? "",
      inviterName: auth.user?.user_metadata?.name || auth.user?.email?.split("@")[0] || "Your teammate",
      workspaceName: workspaceMeta?.workspaceName || "the workspace",
      assignedRole: role,           // the WorkspaceRole selected in the form
      jobTitle: jobTitle.trim(),    // the job title string from the form
      displayName: displayName.trim() || emailLower.split("@")[0],
      email: emailLower,
      status: "pending",
      createdAt: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,  // 7 days
    };

    existingInvites[emailLower] = newInvite;

    localStorage.setItem(
      "fieldnotes.pending_invites",
      JSON.stringify(existingInvites)
    );

    // Keep it in the shared workspaces list for the inviter to see
    const updatedInvites = [...pendingInvites, newInvite];
    updatePendingInvites(updatedInvites);

    toast.success(`Invite sent to ${emailLower}. They will be prompted to accept on next login.`);
    setIsModalOpen(false);
    resetFormState();
  };

  const handleEditSelfClick = (member: any) => {
    setModalMode("edit_self");
    setEditingUserId(member.userId);
    setDisplayName(member.displayName || member.email.split("@")[0]);
    setRole(member.role.toLowerCase() as any);
    setJobTitle(member.jobTitle);
    setIsModalOpen(true);
  };

  const handleSaveSelfEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const userId = auth.user?.id;
    if (!userId) return;

    const updated = members.map((m) => {
      if (m.userId === userId) {
        return {
          ...m,
          displayName: displayName.trim(),
          jobTitle: jobTitle.trim(),
        };
      }
      return m;
    });
    updateMembers(updated);

    setSettings((prev) => ({
      ...prev,
      userName: displayName.trim(),
      role: jobTitle.trim(),
    }));

    toast.success("Profile display info updated.");
    setIsModalOpen(false);
    resetFormState();
  };

  const handleEditClick = (member: any) => {
    setModalMode("edit");
    setEditingUserId(member.id);
    setEmail(member.email);
    setDisplayName(member.name);
    setRole(member.role.toLowerCase() as any);
    setJobTitle(member.jobTitle);
    setIsModalOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserId) return;

    const updated = members.map((m) => {
      if (m.userId === editingUserId) {
        const roleChanged = m.role.toLowerCase() !== role.toLowerCase();
        return {
          ...m,
          role: role,
          jobTitle: jobTitle.trim(),
          ...(roleChanged ? { pendingRoleChangeNotification: true } : {}),
        };
      }
      return m;
    });

    updateMembers(updated);
    localStorage.setItem(`fieldnotes.user.${editingUserId}.role`, role.toLowerCase());

    toast.success(`Role updated to ${role.charAt(0).toUpperCase() + role.slice(1)}`);
    setIsModalOpen(false);
    resetFormState();
  };

  const handleDeleteMember = (userId: string, emailVal: string) => {
    if (userId === auth.user?.id) {
      toast.error("You cannot remove your own profile.");
      return;
    }

    const memberToDelete = members.find((m) => m.userId === userId);
    if (memberToDelete && can(memberToDelete.role, "workspace:viewKey")) {
      toast.error("The owner of the workspace cannot be removed.");
      return;
    }

    if (
      confirm(
        `Remove ${memberToDelete?.displayName || emailVal} from the workspace?\nThey will lose access immediately.`,
      )
    ) {
      const updated = members.filter((m) => m.userId !== userId);
      updateMembers(updated);
      localStorage.removeItem(`fieldnotes.user.${userId}.role`);
      toast.success(`${memberToDelete?.displayName || emailVal} removed.`);
    }
  };

  const handleResendInvite = (inviteId: string, emailVal: string) => {
    const updated = pendingInvites.map((inv: any) => {
      if (inv.inviteId === inviteId) {
        return {
          ...inv,
          expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        };
      }
      return inv;
    });
    updatePendingInvites(updated);
    toast.success(`Invite resent to ${emailVal}`);
  };

  const handleCancelInvite = (inviteId: string, emailVal: string) => {
    if (confirm(`Are you sure you want to cancel the invitation for ${emailVal}?`)) {
      const updated = pendingInvites.filter((inv: any) => inv.inviteId !== inviteId);
      updatePendingInvites(updated);
      toast.success("Invite cancelled");
    }
  };

  return (
    <div className="rounded-[12px] border border-[var(--c-border)] bg-[var(--c-bg-card)] p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-[var(--c-border)] pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[var(--c-accent)]" />
            <h3 className="font-display text-[20px] text-[var(--c-text)]">Workspace & Members</h3>
          </div>
          <p className="text-[12px] text-[var(--c-text-muted)]">
            {members.length} member{members.length === 1 ? "" : "s"} ·{" "}
            {workspaceMeta?.workspaceName || "My Workspace"}
          </p>
        </div>
        <PermissionGate action="members:add">
          <button
            onClick={() => {
              setModalMode("add");
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-1 rounded bg-[var(--c-accent-soft)] px-2.5 py-1 text-[11px] font-mono text-[var(--c-accent)] hover:opacity-90 transition-all"
          >
            <Plus className="h-3 w-3" /> Add Member
          </button>
        </PermissionGate>
      </div>

      <div className="divide-y divide-[var(--c-border)]/50">
        {members.map((p) => {
          const isSelf = p.userId === auth.user?.id;
          const wRole = p.role;
          const initials = getInitials(p.displayName || p.email);
          const badge = getRoleBadgeStyle(wRole);

          const viewerRoleVal = getRoleValue(currentRole);
          const targetRoleVal = getRoleValue(wRole);

          const isLower = targetRoleVal < viewerRoleVal;
          const canManageOthers = can(currentRole.toLowerCase() as any, "members:edit");

          const showEditSelf = isSelf;
          const showEditOther = !isSelf && canManageOthers && isLower;

          return (
            <div
              key={p.userId}
              className="flex items-center justify-between min-h-[64px] py-3 border-b border-[var(--c-border)]/50 last:border-b-0 group transition-colors hover:bg-[var(--c-bg-hover)]/30 px-2"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full font-mono text-[14px] font-semibold text-white animate-fade-in"
                  style={{ backgroundColor: p.avatarColor }}
                >
                  {initials}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-medium text-[var(--c-text)] truncate">
                      {p.displayName || p.email.split("@")[0]}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide"
                      style={{ backgroundColor: badge.bg, color: badge.text }}
                    >
                      {badge.label}
                    </span>
                    {isSelf && (
                      <span className="px-2 py-0.5 border border-[var(--c-border)] rounded-full text-[10px] font-medium text-[var(--c-text-muted)] bg-transparent">
                        you
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-[var(--c-text-muted)] mt-0.5">
                    {p.jobTitle} · <span className="font-mono">{p.email}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {showEditSelf && (
                  <button
                    onClick={() => handleEditSelfClick(p)}
                    className="p-1 text-[var(--c-text-muted)] hover:text-[var(--c-accent)] transition-colors"
                    title="Edit My Display Info"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
                {showEditOther && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1.5">
                    <button
                      onClick={() => handleEditClick(p)}
                      className="p-1 text-[var(--c-text-muted)] hover:text-[var(--c-accent)] transition-colors"
                      title="Edit Member Role"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteMember(p.userId, p.email)}
                      className="p-1 text-[var(--c-text-muted)] hover:text-[var(--c-fail)] transition-colors"
                      title="Remove Member"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {pendingInvites.length > 0 && (
        <div className="pt-6">
          <div className="text-[10px] font-mono font-semibold tracking-wider text-[var(--c-text-muted)] uppercase border-b border-[var(--c-border)]/50 pb-2 mb-2">
            Pending Invites
          </div>
          <div className="divide-y divide-[var(--c-border)]/50">
            {pendingInvites.map((inv: any) => {
              const badge = getRoleBadgeStyle(inv.role);
              const now = new Date();
              const expires = new Date(inv.expiresAt);
              const diffTime = expires.getTime() - now.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              const isExpired = diffDays <= 0;
              const isUrgent = diffDays > 0 && diffDays <= 2;

              const inviter = members.find((m) => m.userId === inv.invitedBy);
              const inviterName = inviter
                ? inviter.displayName || inviter.email.split("@")[0]
                : "Unknown";

              return (
                <div
                  key={inv.inviteId}
                  className="flex items-center justify-between min-h-[64px] py-3 border-b border-[var(--c-border)]/50 last:border-b-0 px-2"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full border-2 border-dashed border-[var(--c-text-muted)]/40 bg-[var(--c-bg-hover)]/20 text-[var(--c-text-muted)]/60">
                      <Mail className="h-4 w-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-medium font-mono text-[var(--c-text)] truncate">
                          {inv.email}
                        </span>
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide"
                          style={{ backgroundColor: badge.bg, color: badge.text }}
                        >
                          {badge.label}
                        </span>
                        {isExpired && (
                          <span className="px-2 py-0.5 bg-[var(--c-fail-soft)] text-[var(--c-fail)] rounded-full text-[10px] font-semibold uppercase">
                            Expired
                          </span>
                        )}
                      </div>

                      <p className="text-[12px] text-[var(--c-text-muted)] mt-0.5">
                        Invited by {inviterName} ·{" "}
                        {isExpired ? (
                          <span className="text-[var(--c-fail)] font-semibold">Expired</span>
                        ) : (
                          <span className={isUrgent ? "text-[#F59E0B] font-semibold" : ""}>
                            Expires in {diffDays} day{diffDays === 1 ? "" : "s"}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isExpired ? (
                      <PermissionGate action="members:add">
                        <button
                          onClick={() => handleResendInvite(inv.inviteId, inv.email)}
                          className="rounded border border-[var(--c-border)] bg-[var(--c-bg-input)] px-2.5 py-1 text-[11px] font-medium text-[var(--c-accent)] hover:bg-[var(--c-bg-hover)] transition-colors"
                        >
                          Resend
                        </button>
                      </PermissionGate>
                    ) : (
                      <PermissionGate action="members:add">
                        <button
                          onClick={() => handleCancelInvite(inv.inviteId, inv.email)}
                          className="p-1 text-[var(--c-text-muted)] hover:text-[var(--c-fail)] transition-colors"
                          title="Cancel Invite"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </PermissionGate>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isModalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(26,23,20,0.4)] p-4 backdrop-blur-[4px] animate-[fade-in-up_var(--t-normal)_var(--ease-out)_both]"
          onClick={() => {
            setIsModalOpen(false);
            resetFormState();
          }}
        >
          <div
            className="w-full max-w-md rounded-[16px] border border-[var(--c-border)] bg-[var(--c-bg-card)] p-[28px] shadow-[var(--shadow-lg)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-[20px] flex items-center justify-between">
              <p className="font-display text-[22px] text-[var(--c-text)]">
                {modalMode === "add" && "Invite Team Member"}
                {modalMode === "edit" && "Edit Member Role"}
                {modalMode === "edit_self" && "Edit My Display Info"}
              </p>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  resetFormState();
                }}
                className="rounded-full p-2 text-[var(--c-text-muted)] transition-colors hover:bg-[var(--c-bg-hover)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {modalMode === "add" && (
              <div className="space-y-4">
                <div className="flex items-center gap-1 mb-2">
                  {[1, 2, 3].map((s) => (
                    <div
                      key={s}
                      className={`h-1.5 flex-1 rounded-full transition-all duration-200 ${
                        s <= modalStep ? "bg-[var(--c-accent)]" : "bg-[var(--c-border)]"
                      }`}
                    />
                  ))}
                  <span className="text-[11px] text-[var(--c-text-muted)] font-mono ml-2">
                    Step {modalStep} of 3
                  </span>
                </div>

                {modalStep === 1 && (
                  <div className="space-y-4">
                    <p className="text-[13px] text-[var(--c-text-muted)] leading-relaxed">
                      Enter the email address of the person you want to invite to your workspace.
                    </p>
                    <div className="space-y-1.5">
                      <label className="block font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">
                        Email Address
                      </label>
                      <input
                        type="email"
                        autoFocus
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (emailError) setEmailError("");
                        }}
                        onBlur={() => validateEmail(email)}
                        placeholder="colleague@company.com"
                        className={`w-full rounded-[6px] border bg-[var(--c-bg-input)] px-[12px] py-[10px] text-[13px] outline-none focus:border-[var(--c-accent)] transition-colors ${
                          emailError ? "border-[var(--c-fail)]" : "border-[var(--c-border)]"
                        }`}
                      />
                      {emailError && (
                        <p className="text-[11px] text-[var(--c-fail)] font-medium mt-1">
                          {emailError}
                        </p>
                      )}
                    </div>
                    <div className="flex justify-end pt-2">
                      <button
                        onClick={() => {
                          if (validateEmail(email)) {
                            setModalStep(2);
                          }
                        }}
                        className="rounded-[8px] bg-[var(--c-text)] px-4 py-2 text-[12px] font-medium text-[var(--c-bg)] hover:opacity-90 transition-colors animate-[pulse-subtle_2s_infinite]"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}

                {modalStep === 2 && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="block font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">
                        Workspace Role
                      </label>
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value as any)}
                        className="w-full rounded-[6px] border border-[var(--c-border)] bg-[var(--c-bg-input)] p-[10px] text-[13px] outline-none focus:border-[var(--c-accent)]"
                      >
                        {can(currentRole.toLowerCase() as any, "workspace:viewKey") && (
                          <option value="admin">Admin (Manage users & settings)</option>
                        )}
                        <option value="editor">Editor (Create/Edit tests)</option>
                        <option value="viewer">Viewer (Read-only)</option>
                      </select>
                      <p className="text-[11px] text-[var(--c-text-muted)]">
                        {(can(role as any, "project:create") && !can(role as any, "workspace:viewKey")) &&
                          "Admins can invite/remove members and configure most settings."}
                        {(can(role as any, "suite:create") && !can(role as any, "project:create")) &&
                          "Editors can fully write, execute, and manage tests/bugs."}
                        {!can(role as any, "suite:create") &&
                          "Viewers have read-only access to dashboards and reports."}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">
                        Job Title / Persona
                      </label>
                      <select
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        className="w-full rounded-[6px] border border-[var(--c-border)] bg-[var(--c-bg-input)] p-[10px] text-[13px] outline-none focus:border-[var(--c-accent)]"
                      >
                        <option value="QA Engineer">QA Engineer</option>
                        <option value="Developer">Developer</option>
                        <option value="Project Manager">Project Manager</option>
                      </select>
                    </div>

                    <div className="flex justify-between pt-2">
                      <button
                        onClick={() => setModalStep(1)}
                        className="rounded-[8px] border border-[var(--c-border)] px-4 py-2 text-[12px] font-medium text-[var(--c-text-muted)] hover:text-[var(--c-text)] transition-colors"
                      >
                        Back
                      </button>
                      <button
                        onClick={() => {
                          setModalStep(3);
                        }}
                        className="rounded-[8px] bg-[var(--c-text)] px-4 py-2 text-[12px] font-medium text-[var(--c-bg)] hover:opacity-90 transition-colors animate-[pulse-subtle_2s_infinite]"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}

                {modalStep === 3 && (
                  <div className="space-y-4">
                    <p className="text-[13px] text-[var(--c-text-muted)] leading-relaxed">
                      Confirm the invitation details below:
                    </p>

                    <div className="rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg-input)]/30 p-4 space-y-2 font-sans">
                      <div className="flex justify-between text-[12px]">
                        <span className="text-[var(--c-text-muted)]">Email:</span>
                        <span className="font-semibold text-[var(--c-text)]">{email}</span>
                      </div>
                      <div className="flex justify-between text-[12px]">
                        <span className="text-[var(--c-text-muted)]">Role:</span>
                        <span className="font-semibold text-[var(--c-accent)] capitalize">
                          {role}
                        </span>
                      </div>
                      <div className="flex justify-between text-[12px]">
                        <span className="text-[var(--c-text-muted)]">Title:</span>
                        <span className="font-semibold text-[var(--c-text)]">{jobTitle}</span>
                      </div>
                    </div>

                    <div className="flex justify-between pt-2">
                      <button
                        onClick={() => setModalStep(2)}
                        className="rounded-[8px] border border-[var(--c-border)] px-4 py-2 text-[12px] font-medium text-[var(--c-text-muted)] hover:text-[var(--c-text)] transition-colors"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleSendInvite}
                        className="rounded-[8px] bg-[var(--c-accent)] px-4 py-2 text-[12px] font-medium text-white hover:bg-[var(--c-accent-dark)] transition-colors"
                      >
                        Send Invite
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {modalMode === "edit" && (
              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div className="flex items-center gap-3 bg-[var(--c-bg-hover)]/30 p-3 rounded-[8px] border border-[var(--c-border)]/50 mb-4">
                  <div className="font-semibold text-[14px] text-[var(--c-text)]">
                    {displayName}
                  </div>
                  {(() => {
                    const badge = getRoleBadgeStyle(role);
                    return (
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase"
                        style={{ backgroundColor: badge.bg, color: badge.text }}
                      >
                        {badge.label}
                      </span>
                    );
                  })()}
                </div>

                <div className="space-y-1.5">
                  <label className="block font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">
                    Workspace Role
                  </label>
                  <div
                    className={`grid gap-2 ${can(currentRole.toLowerCase() as any, "workspace:viewKey") ? "grid-cols-3" : "grid-cols-2"}`}
                  >
                    {can(currentRole.toLowerCase() as any, "workspace:viewKey") && (
                      <button
                        type="button"
                        onClick={() => setRole("admin")}
                        className={`rounded-[8px] border p-3 text-left transition-all flex flex-col justify-between h-[80px] outline-none ${
                          (can(role as any, "project:create") && !can(role as any, "workspace:viewKey"))
                            ? "border-[var(--c-accent)] bg-[var(--c-accent-soft)]"
                            : "border-[var(--c-border)] bg-[var(--c-bg-input)] hover:bg-[var(--c-bg-hover)]"
                        }`}
                      >
                        <span className="text-[12px] font-semibold text-[var(--c-text)]">
                          Admin
                        </span>
                        <span className="text-[9px] text-[var(--c-text-muted)] leading-tight">
                          Manage members
                        </span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setRole("editor")}
                      className={`rounded-[8px] border p-3 text-left transition-all flex flex-col justify-between h-[80px] outline-none ${
                        (can(role as any, "suite:create") && !can(role as any, "project:create"))
                          ? "border-[var(--c-accent)] bg-[var(--c-accent-soft)]"
                          : "border-[var(--c-border)] bg-[var(--c-bg-input)] hover:bg-[var(--c-bg-hover)]"
                      }`}
                    >
                      <span className="text-[12px] font-semibold text-[var(--c-text)]">Editor</span>
                      <span className="text-[9px] text-[var(--c-text-muted)] leading-tight">
                        Edit tests/runs
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole("viewer")}
                      className={`rounded-[8px] border p-3 text-left transition-all flex flex-col justify-between h-[80px] outline-none ${
                        !can(role as any, "suite:create")
                          ? "border-[var(--c-accent)] bg-[var(--c-accent-soft)]"
                          : "border-[var(--c-border)] bg-[var(--c-bg-input)] hover:bg-[var(--c-bg-hover)]"
                      }`}
                    >
                      <span className="text-[12px] font-semibold text-[var(--c-text)]">Viewer</span>
                      <span className="text-[9px] text-[var(--c-text-muted)] leading-tight">
                        Read-only view
                      </span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">
                    Job Title / Persona
                  </label>
                  <select
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="w-full rounded-[6px] border border-[var(--c-border)] bg-[var(--c-bg-input)] p-[10px] text-[13px] outline-none focus:border-[var(--c-accent)]"
                  >
                    <option value="QA Engineer">QA Engineer</option>
                    <option value="Developer">Developer</option>
                    <option value="Project Manager">Project Manager</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[var(--c-border)]/50">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      resetFormState();
                    }}
                    className="rounded-[8px] border border-[var(--c-border)] bg-transparent px-[16px] py-[8px] text-[13px] font-medium transition-all hover:bg-[var(--c-bg-hover)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-[8px] bg-[var(--c-text)] px-[16px] py-[8px] text-[13px] font-medium text-[var(--c-bg)] hover:opacity-90 transition-all"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            )}

            {modalMode === "edit_self" && (
              <form onSubmit={handleSaveSelfEdit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">
                    Display Name
                  </label>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your display name"
                    className="w-full rounded-[6px] border border-[var(--c-border)] bg-[var(--c-bg-input)] px-[12px] py-[10px] text-[13px] outline-none focus:border-[var(--c-accent)]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">
                    Job Title / Persona
                  </label>
                  <select
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="w-full rounded-[6px] border border-[var(--c-border)] bg-[var(--c-bg-input)] p-[10px] text-[13px] outline-none focus:border-[var(--c-accent)]"
                  >
                    <option value="QA Engineer">QA Engineer</option>
                    <option value="Developer">Developer</option>
                    <option value="Project Manager">Project Manager</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">
                    Workspace Role (Read-Only)
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={role.toUpperCase()}
                    className="w-full rounded-[6px] border border-[var(--c-border)] bg-[var(--c-bg-input)] opacity-60 px-[12px] py-[10px] text-[13px] outline-none capitalize"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[var(--c-border)]/50">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      resetFormState();
                    }}
                    className="rounded-[8px] border border-[var(--c-border)] bg-transparent px-[16px] py-[8px] text-[13px] font-medium transition-all hover:bg-[var(--c-bg-hover)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-[8px] bg-[var(--c-text)] px-[16px] py-[8px] text-[13px] font-medium text-[var(--c-bg)] hover:opacity-90 transition-all"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
