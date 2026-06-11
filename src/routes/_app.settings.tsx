import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Sparkles, Bell, Coins, ShieldAlert, Key, User, Trash2, X, Settings
} from "lucide-react";
import { PageHeader } from "./_app.projects";
import { useSettings, useTokens, setPlan, signOut, deleteUserAccount } from "@/lib/store";
import { toast } from "./_app";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings — Field Notes" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const [settings, setSettings] = useSettings();
  const [tokens] = useTokens();
  const navigate = useNavigate();

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

  function savePreferences(e: React.FormEvent) {
    e.preventDefault();
    setSettings((prev) => ({
      ...prev,
      defaultProjectView: prefView as any,
      timezone: prefTimezone,
      dateFormat: prefDateFormat,
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
              <label className="block font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">AI Model Provider</label>
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
                  {(profileName ? profileName[0] : (profileEmail ? profileEmail[0] : "U")).toUpperCase()}
                </div>
                <div>
                  <p className="text-[14px] font-medium text-[var(--c-text)]">Profile initials avatar</p>
                  <p className="text-[11px] text-[var(--c-text-muted)]">Generated automatically from your name.</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">Full name</label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full rounded-[6px] border border-[var(--c-border)] bg-[var(--c-bg-input)] px-[12px] py-[8px] text-[13px] outline-none focus:border-[var(--c-accent)]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">Username</label>
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
                  <label className="block font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">Email address</label>
                  <input
                    type="email"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    placeholder="jane@example.com"
                    className="w-full rounded-[6px] border border-[var(--c-border)] bg-[var(--c-bg-input)] px-[12px] py-[8px] text-[13px] outline-none focus:border-[var(--c-accent)]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">Role / Title</label>
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
                  <label className="block font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-[6px] border border-[var(--c-border)] bg-[var(--c-bg-input)] px-[12px] py-[8px] text-[13px] outline-none focus:border-[var(--c-accent)]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-[6px] border border-[var(--c-border)] bg-[var(--c-bg-input)] px-[12px] py-[8px] text-[13px] outline-none focus:border-[var(--c-accent)]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">Confirm Password</label>
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
                  <p className="text-[13px] font-medium text-[var(--c-text)]">Two-factor Authentication (2FA)</p>
                  <p className="text-[11px] text-[var(--c-text-muted)]">Add an extra layer of security using an authenticator app.</p>
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
                  <label className="block font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">Default View</label>
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
                  <label className="block font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">Timezone</label>
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
                  <label className="block font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--c-text-muted)]">Date Format</label>
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

        {/* Right Column: Billing, Notifications, Danger Zone */}
        <div className="space-y-6">
          {/* Card 5: Token Billing (Keep as is) */}
          <div className="rounded-[12px] border border-[var(--c-border)] bg-[var(--c-bg-card)] p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-[var(--c-border)] pb-3">
              <Coins className="h-5 w-5 text-[var(--c-accent)]" />
              <h3 className="font-display text-[20px] text-[var(--c-text)]">Token usage</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-[13px] text-[var(--c-text-muted)] font-medium">Plan level</span>
                <span className={`rounded-sm px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider ${tokens.plan === "Premium" ? "bg-[var(--c-accent-soft)] text-[var(--c-accent)]" : "bg-[var(--c-bg-hover)] text-[var(--c-text-muted)] border border-[var(--c-border)]"}`}>
                  {tokens.plan}
                </span>
              </div>
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[13px] font-medium">
                  <span>Balance</span>
                  <span>{tokens.plan === "Premium" ? "Unlimited" : `${tokens.balance} / ${tokens.maxTokens} pts`}</span>
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
            <button
              onClick={handleTogglePlan}
              className={`w-full rounded-[8px] py-2 text-[12px] font-medium transition-all ${
                tokens.plan === "Premium"
                  ? "border border-[var(--c-border)] bg-transparent text-[var(--c-text-muted)] hover:bg-[var(--c-bg-hover)]"
                  : "bg-[var(--c-accent)] text-white hover:bg-[var(--c-accent-dark)]"
              }`}
            >
              {tokens.plan === "Premium" ? "Downgrade to Standard" : "Upgrade to Premium (Free Demo)"}
            </button>
          </div>

          {/* Card 6: Notification Toggles (Keep as is) */}
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

          {/* Card 7: Danger Zone */}
          <div className="rounded-[12px] border border-[var(--c-fail)] bg-[var(--c-fail-soft)] p-6 space-y-3">
            <div className="flex items-center gap-2 text-[var(--c-fail)]">
              <ShieldAlert className="h-5 w-5" />
              <h3 className="font-display text-[20px] font-semibold leading-none">Danger Zone</h3>
            </div>
            <p className="text-[12px] text-[var(--c-fail)] leading-normal">
              Permanently wipe all projects, tests, activities, settings, and tokens.
            </p>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-[8px] bg-[var(--c-fail)] py-2 text-[12px] font-medium text-white hover:bg-[#8A3232]"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(26,23,20,0.4)] p-4 backdrop-blur-[4px] animate-[fade-in-up_var(--t-normal)_var(--ease-out)_both]" onClick={() => setShowDeleteModal(false)}>
          <div className="w-full max-w-md rounded-[16px] border border-[var(--c-border)] bg-[var(--c-bg-card)] p-[28px] shadow-[var(--shadow-lg)]" onClick={(e) => e.stopPropagation()}>
            <div className="mb-[24px] flex items-center justify-between">
              <p className="font-display text-[26px] text-[var(--c-fail)]">Delete Account</p>
              <button onClick={() => setShowDeleteModal(false)} className="rounded-full p-2 text-[var(--c-text-muted)] transition-colors hover:bg-[var(--c-bg-hover)]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-4 text-[13px] text-[var(--c-text-muted)] leading-relaxed">
              This action is permanent and cannot be undone. All your projects, suites, test cases, and history will be deleted.
            </p>
            <p className="mb-4 text-[13px] font-mono text-[var(--c-text-muted)]">
              Type <span className="font-semibold text-[var(--c-text)]">"{expectedUsername}"</span> to confirm:
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
              <button type="button" onClick={() => setShowDeleteModal(false)} className="rounded-[8px] border-[1.5px] border-[var(--c-border)] bg-transparent px-[16px] py-[8px] text-[13px] font-medium transition-all hover:bg-[var(--c-bg-hover)]">Cancel</button>
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
    </div>
  );
}