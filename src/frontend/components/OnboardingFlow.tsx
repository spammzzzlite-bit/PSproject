import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Bug,
  Code2,
  ClipboardList,
  Zap,
  FileText,
  BarChart2,
  RefreshCw,
  CheckCircle,
  ArrowRight,
  ChevronLeft,
  X,
  Crown,
  Star,
  Shield,
  Eye,
  Lock,
} from "lucide-react";
import {
  useAuth,
  useSettings,
  useUserStore,
  useWorkspaceMeta,
  useWorkspaceMembersList,
  updateActiveWorkspaceMembers,
  updateActiveWorkspaceMeta,
  getAvatarColor,
  type WorkspaceMeta,
  type WorkspaceMember,
} from "@/frontend/store/store";
import { can } from "@/lib/permissions";

import { commandBrief } from "../../config/onboarding/commandBrief";
import { opsBrief } from "../../config/onboarding/opsBrief";
import { fieldBrief } from "../../config/onboarding/fieldBrief";
import { intelBrief } from "../../config/onboarding/intelBrief";
import type { OnboardingStep } from "../../config/onboarding/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = "qa_engineer" | "developer" | "project_manager";
type Direction = "next" | "back";

interface UserData {
  workspaceName: string;
  role: Role;
  archetype: string;
}

interface Props {
  currentRole?: string;
  onComplete: (userData: UserData) => void;
  onSkip: () => void;
  onNavigate?: (route: string) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ARCHETYPES: Record<Role, { title: string; tagline: string; description: string }> = {
  qa_engineer: {
    title: "The Methodical Breaker",
    tagline: "QA ENGINEER ARCHETYPE",
    description: "You find what others miss. Edge cases fear you.",
  },
  developer: {
    title: "The Ship-Fast Fixer",
    tagline: "DEVELOPER ARCHETYPE",
    description: "You break it, you own it. Speed meets precision.",
  },
  project_manager: {
    title: "The Coverage Zealot",
    tagline: "PROJECT MANAGER ARCHETYPE",
    description: "Nothing ships without your sign-off. Ever.",
  },
};

const ROLE_CARDS: { id: Role; label: string; sublabel: string; icon: React.ReactNode }[] = [
  {
    id: "qa_engineer",
    label: "QA Engineer",
    sublabel: "I write and run test cases",
    icon: <Bug size={28} strokeWidth={1.5} />,
  },
  {
    id: "developer",
    label: "Developer",
    sublabel: "I build features and fix bugs",
    icon: <Code2 size={28} strokeWidth={1.5} />,
  },
  {
    id: "project_manager",
    label: "Project Manager",
    sublabel: "I track progress and reports",
    icon: <ClipboardList size={28} strokeWidth={1.5} />,
  },
];

const SCAN_LINES = [
  "Scanning workflow patterns...",
  "Detecting edge case sensitivity...",
  "Measuring regression tolerance...",
  "Calibrating bug instinct...",
  "Cross-referencing test philosophy...",
];

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useTypewriter(text: string, speed = 45, onDone?: () => void) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const indexRef = useRef(0);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    indexRef.current = 0;

    const interval = setInterval(() => {
      indexRef.current += 1;
      setDisplayed(text.slice(0, indexRef.current));
      if (indexRef.current >= text.length) {
        clearInterval(interval);
        setDone(true);
        onDone?.();
      }
    }, speed);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, speed]);

  return { displayed, done };
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function StepLabel({ children, accentColor }: { children: React.ReactNode; accentColor: string }) {
  return (
    <span
      style={{
        fontFamily: "Inter, sans-serif",
        fontSize: "10px",
        letterSpacing: "0.15em",
        textTransform: "uppercase",
        color: accentColor,
        fontWeight: 500,
      }}
    >
      {children}
    </span>
  );
}

function ContinueButton({
  onClick,
  disabled,
  label = "Continue →",
  accentColor,
}: {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
  accentColor: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? "var(--border)" : accentColor,
        color: disabled ? "var(--ink-faint)" : "#FFFFFF",
        fontFamily: "Inter, sans-serif",
        fontSize: "14px",
        fontWeight: 600,
        padding: "12px 28px",
        borderRadius: "6px",
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background 150ms ease, transform 100ms ease",
        letterSpacing: "0.01em",
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          (e.currentTarget as HTMLButtonElement).style.filter = "brightness(0.9)";
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          (e.currentTarget as HTMLButtonElement).style.filter = "none";
        }
      }}
    >
      {label}
    </button>
  );
}

// ─── Step 1: Welcome ──────────────────────────────────────────────────────────

interface Step1WelcomeProps {
  briefingTrack: string;
  config: OnboardingStep;
  onNext: () => void;
  accentColor: string;
  iconName: string;
}

function Step1Welcome({ briefingTrack, config, onNext, accentColor, iconName }: Step1WelcomeProps) {
  const [subtextVisible, setSubtextVisible] = useState(false);
  const [ctaVisible, setCtaVisible] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [cursorBlink, setCursorBlink] = useState(false);

  const typewriterSpeed = briefingTrack === "field" ? 30 : briefingTrack === "intel" ? 60 : 45;

  const { displayed } = useTypewriter(config.welcomeHeader || "", typewriterSpeed, () => {
    setCursorBlink(true);
    setTimeout(() => {
      setCursorVisible(false);
      setSubtextVisible(true);
      setTimeout(() => setCtaVisible(true), 200);
    }, 800);
  });

  const renderIcon = () => {
    if (iconName === "Crown" || iconName === "Star") {
      return (
        <div className="relative flex items-center justify-center">
          <div className="absolute w-20 h-20 rounded-full border border-[var(--c-border)] animate-[spin_8s_linear_infinite]" />
          <div className="absolute w-28 h-28 rounded-full border border-dashed border-[var(--c-border)] animate-[spin_12s_linear_infinite_reverse]" />
          <div
            className="flex items-center justify-center w-16 h-16 rounded-full bg-[var(--c-bg-card)] border shadow-md animate-pulse"
            style={{ borderColor: accentColor }}
          >
            <Crown size={28} style={{ color: accentColor }} />
          </div>
        </div>
      );
    }
    if (iconName === "Shield") {
      return (
        <div className="relative flex items-center justify-center">
          <div
            className="absolute w-24 h-24 rounded-full border-2 border-dashed animate-[spin_16s_linear_infinite]"
            style={{ borderColor: `${accentColor}22` }}
          />
          <div
            className="flex items-center justify-center w-16 h-16 rounded-full bg-[var(--c-bg-card)] border shadow-md"
            style={{ borderColor: accentColor }}
          >
            <Shield size={28} style={{ color: accentColor }} className="animate-pulse" />
          </div>
        </div>
      );
    }
    if (iconName === "Zap") {
      return (
        <div className="relative flex items-center justify-center">
          <div
            className="absolute w-20 h-20 rounded-full border-2 animate-ping opacity-25"
            style={{ borderColor: accentColor }}
          />
          <div
            className="flex items-center justify-center w-16 h-16 rounded-full bg-[var(--c-bg-card)] border shadow-md animate-bounce"
            style={{ borderColor: accentColor, animationDuration: "2.5s" }}
          >
            <Zap size={28} style={{ color: accentColor }} />
          </div>
        </div>
      );
    }
    if (iconName === "Eye") {
      return (
        <div className="relative flex items-center justify-center">
          <div
            className="absolute w-22 h-22 rounded-full border border-solid opacity-30 animate-pulse"
            style={{ borderColor: accentColor, animationDuration: "4s" }}
          />
          <div
            className="flex items-center justify-center w-16 h-16 rounded-full bg-[var(--c-bg-card)] border"
            style={{ borderColor: accentColor }}
          >
            <Eye size={28} style={{ color: accentColor }} />
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      className="step-fade-up flex flex-col items-center justify-center text-center animate-[fade-slide-up_300ms_ease-out_forwards]"
      style={{ maxWidth: 560, margin: "0 auto" }}
    >
      <div
        className="flex items-center justify-center mb-10 h-32"
        style={{ opacity: subtextVisible ? 1 : 0, transition: "opacity 400ms ease" }}
      >
        {renderIcon()}
      </div>

      <h1
        style={{
          fontFamily: "Playfair Display, Georgia, serif",
          fontSize: "clamp(30px, 4.5vw, 48px)",
          fontWeight: 700,
          color: "var(--ink)",
          lineHeight: 1.15,
          marginBottom: 0,
          minHeight: "1.2em",
        }}
      >
        {displayed}
        {cursorVisible && (
          <span
            style={{
              display: "inline-block",
              width: "3px",
              height: "0.85em",
              background: accentColor,
              marginLeft: "3px",
              verticalAlign: "middle",
              animation: cursorBlink ? "blink 0.8s step-end infinite" : "none",
            }}
          />
        )}
      </h1>

      <p
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: "16px",
          color: "var(--ink-muted)",
          marginTop: 20,
          lineHeight: 1.6,
          opacity: subtextVisible ? 1 : 0,
          transform: subtextVisible ? "translateY(0)" : "translateY(8px)",
          transition: "opacity 400ms ease, transform 400ms ease",
          maxWidth: 440,
        }}
      >
        {config.welcomeSubtext}
      </p>

      <div
        style={{
          marginTop: 36,
          opacity: ctaVisible ? 1 : 0,
          transform: ctaVisible ? "translateY(0)" : "translateY(8px)",
          transition: "opacity 200ms ease, transform 200ms ease",
        }}
      >
        <ContinueButton onClick={onNext} label={config.welcomeButton} accentColor={accentColor} />
      </div>
    </div>
  );
}

// ─── Step 2: Workspace Setup ──────────────────────────────────────────────────

function Step2Workspace({
  workspaceName,
  onChange,
  onNext,
  config,
  accentColor,
}: {
  workspaceName: string;
  onChange: (v: string) => void;
  onNext: () => void;
  config: OnboardingStep;
  accentColor: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [shaking, setShaking] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  const handleContinue = () => {
    if (!workspaceName.trim()) {
      setShaking(true);
      setTouched(true);
      setTimeout(() => setShaking(false), 400);
      return;
    }
    onNext();
  };

  const isEmpty = touched && !workspaceName.trim();

  return (
    <div
      className="step-slide-right flex flex-col items-center text-center"
      style={{ maxWidth: 480, margin: "0 auto" }}
    >
      <StepLabel accentColor={accentColor}>Workspace Setup</StepLabel>

      <h2
        style={{
          fontFamily: "Playfair Display, Georgia, serif",
          fontSize: "clamp(28px, 4vw, 42px)",
          fontWeight: 700,
          color: "var(--ink)",
          marginTop: 16,
          marginBottom: 8,
          lineHeight: 1.2,
        }}
      >
        {config.label}.
      </h2>

      <p style={{ color: "var(--ink-muted)", fontSize: 15, marginBottom: 36 }}>{config.note}</p>

      <div style={{ width: "100%", maxWidth: 400 }}>
        <input
          ref={inputRef}
          type="text"
          value={workspaceName}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleContinue()}
          placeholder={config.placeholder}
          className={shaking ? "input-shake" : ""}
          style={{
            width: "100%",
            padding: "14px 18px",
            fontSize: "17px",
            fontFamily: "Inter, sans-serif",
            background: "var(--cream-50)",
            border: `1.5px solid ${isEmpty ? "#D94F35" : "var(--border)"}`,
            borderRadius: "8px",
            color: "var(--ink)",
            outline: "none",
            transition: "border-color 150ms ease",
            boxSizing: "border-box",
          }}
          onFocus={(e) => {
            if (!isEmpty) e.currentTarget.style.borderColor = accentColor;
          }}
          onBlur={(e) => {
            if (!isEmpty) e.currentTarget.style.borderColor = "var(--border)";
          }}
        />
        {isEmpty && (
          <p style={{ color: "#D94F35", fontSize: 12, marginTop: 6, textAlign: "left" }}>
            Please name your workspace to continue.
          </p>
        )}
      </div>

      <div style={{ marginTop: 36 }}>
        <ContinueButton onClick={handleContinue} accentColor={accentColor} />
      </div>
    </div>
  );
}

// ─── Step 3: Specialty Selection ───────────────────────────────────────────────

function Step3Role({
  selectedRole,
  onSelect,
  onNext,
  config,
  accentColor,
}: {
  selectedRole: Role | null;
  onSelect: (r: Role) => void;
  onNext: () => void;
  config: OnboardingStep;
  accentColor: string;
}) {
  return (
    <div
      className="step-slide-right flex flex-col items-center text-center animate-[fade-slide-up_300ms_ease-out_forwards]"
      style={{ maxWidth: 680, margin: "0 auto" }}
    >
      <StepLabel accentColor={accentColor}>Your Expertise</StepLabel>

      <h2
        style={{
          fontFamily: "Playfair Display, Georgia, serif",
          fontSize: "clamp(26px, 4vw, 40px)",
          fontWeight: 700,
          color: "var(--ink)",
          marginTop: 16,
          marginBottom: 8,
          lineHeight: 1.2,
        }}
      >
        {config.specialtyHeader}
      </h2>

      <p style={{ color: "var(--ink-muted)", fontSize: 15, marginBottom: 36 }}>
        {config.specialtySubtext}
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16,
          width: "100%",
        }}
      >
        {ROLE_CARDS.map((card) => {
          const isSelected = selectedRole === card.id;
          const isDimmed = selectedRole !== null && !isSelected;

          return (
            <div
              key={card.id}
              className="flip-card"
              style={{ height: 180, cursor: "pointer" }}
              onClick={() => onSelect(card.id)}
            >
              <div className={`flip-card-inner ${isSelected ? "flipped" : ""}`}>
                {/* Front */}
                <div
                  className="flip-card-front"
                  style={{
                    background: isSelected ? "var(--cream-100)" : "var(--cream-50)",
                    border: `1.5px solid ${isSelected ? accentColor : "var(--border)"}`,
                    borderRadius: 10,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 12,
                    padding: 20,
                    opacity: isDimmed ? 0.4 : 1,
                    transition: "opacity 200ms ease",
                  }}
                >
                  <div style={{ color: accentColor }}>{card.icon}</div>
                  <div>
                    <div
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontWeight: 600,
                        fontSize: 15,
                        color: "var(--ink)",
                        marginBottom: 4,
                      }}
                    >
                      {card.label}
                    </div>
                    <div
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: 12,
                        color: "var(--ink-muted)",
                      }}
                    >
                      {card.sublabel}
                    </div>
                  </div>
                </div>

                {/* Back */}
                <div
                  className="flip-card-back"
                  style={{
                    background: "var(--ink)",
                    borderRadius: 10,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    padding: 20,
                  }}
                >
                  <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                    <circle cx="18" cy="18" r="17" stroke={accentColor} strokeWidth="1.5" />
                    <path
                      className="check-path"
                      d="M11 18.5L15.5 23L25 13"
                      stroke={accentColor}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontWeight: 700,
                      fontSize: 14,
                      color: "#F8F5F0",
                      letterSpacing: "0.02em",
                    }}
                  >
                    Locked in.
                  </div>
                  <div
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: 11,
                      color: "var(--ink-faint)",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    {card.label}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 36 }}>
        <ContinueButton onClick={onNext} disabled={!selectedRole} accentColor={accentColor} />
      </div>
    </div>
  );
}

// ─── Step 4: Feature Highlights ───────────────────────────────────────────────

const FEATURE_CARDS_LEAD = [
  {
    icon: <Zap size={22} strokeWidth={1.5} />,
    title: "Generate Tests",
    description: "Describe a feature, AI writes the test cases.",
  },
  {
    icon: <Bug size={22} strokeWidth={1.5} />,
    title: "Bug Reporter",
    description: "Flag failures and auto-log bugs in one click.",
  },
  {
    icon: <RefreshCw size={22} strokeWidth={1.5} />,
    title: "Regression",
    description: "Run full suite checks across your projects.",
  },
  {
    icon: <BarChart2 size={22} strokeWidth={1.5} />,
    title: "Reports",
    description: "Export PDF and CSV reports for any project.",
  },
];

function Step4Features({
  onNext,
  config,
  accentColor,
}: {
  onNext: () => void;
  config: OnboardingStep;
  accentColor: string;
}) {
  return (
    <div
      className="step-fade flex flex-col items-center text-center animate-[fade-slide-up_300ms_ease-out_forwards]"
      style={{ maxWidth: 600, margin: "0 auto" }}
    >
      <StepLabel accentColor={accentColor}>Features</StepLabel>

      <h2
        style={{
          fontFamily: "Playfair Display, Georgia, serif",
          fontSize: "clamp(26px, 4vw, 40px)",
          fontWeight: 700,
          color: "var(--ink)",
          marginTop: 16,
          marginBottom: 8,
          lineHeight: 1.2,
        }}
      >
        {config.featuresHeader}
      </h2>

      <p style={{ color: "var(--ink-muted)", fontSize: 15, marginBottom: 36 }}>
        {config.featuresSubtext}
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 14,
          width: "100%",
        }}
      >
        {FEATURE_CARDS_LEAD.map((card, i) => (
          <div
            key={card.title}
            className="feature-card animate-[scaleInFade_300ms_ease_forwards]"
            style={{
              animationDelay: `${i * 80}ms`,
              background: "var(--cream-50)",
              border: "1.5px solid var(--border-light)",
              borderRadius: 10,
              padding: "20px 22px",
              textAlign: "left",
            }}
          >
            <div
              style={{
                color: accentColor,
                marginBottom: 10,
              }}
            >
              {card.icon}
            </div>
            <div
              style={{
                fontFamily: "Inter, sans-serif",
                fontWeight: 600,
                fontSize: 14,
                color: "var(--ink)",
                marginBottom: 5,
              }}
            >
              {card.title}
            </div>
            <div
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 13,
                color: "var(--ink-muted)",
                lineHeight: 1.5,
              }}
            >
              {card.description}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 36 }}>
        <ContinueButton onClick={onNext} accentColor={accentColor} />
      </div>
    </div>
  );
}

// ─── Step 5: QA DNA Reveal ────────────────────────────────────────────────────

type DNAPhase = "scanning" | "reveal";

function Step5DNA({
  role,
  onNext,
  config,
  accentColor,
}: {
  role: Role;
  onNext: () => void;
  config: OnboardingStep;
  accentColor: string;
}) {
  const archetype = ARCHETYPES[role];
  const [phase, setPhase] = useState<DNAPhase>("scanning");
  const [progress, setProgress] = useState(0);
  const [visibleLines, setVisibleLines] = useState<string[]>([]);
  const [lineTexts, setLineTexts] = useState<string[]>([]);
  const [ctaVisible, setCtaVisible] = useState(false);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; size: number }[]>(
    [],
  );

  const logs = config.terminalLogs || SCAN_LINES;
  const progressLabel = config.progressLabel || "Analysing your QA profile...";

  useEffect(() => {
    const totalDuration = 1800;
    const lineInterval = totalDuration / logs.length;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    logs.forEach((line, lineIdx) => {
      const lineStart = lineIdx * lineInterval;

      timeouts.push(
        setTimeout(() => {
          setVisibleLines((prev) => [...prev, ""]);
        }, lineStart),
      );

      for (let c = 0; c < line.length; c++) {
        timeouts.push(
          setTimeout(
            () => {
              setLineTexts((prev) => {
                const next = [...prev];
                while (next.length <= lineIdx) next.push("");
                next[lineIdx] = line.slice(0, c + 1);
                return next;
              });
            },
            lineStart + c * 20,
          ),
        );
      }
    });

    const startTime = Date.now();
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / 1800) * 100, 100);
      setProgress(pct);
      if (pct >= 100) clearInterval(progressInterval);
    }, 30);

    timeouts.push(
      setTimeout(() => {
        setPhase("reveal");
        setParticles(
          Array.from({ length: 14 }, (_, i) => ({
            id: i,
            x: 45 + Math.random() * 10,
            y: 45 + Math.random() * 10,
            size: 4 + Math.random() * 5,
          })),
        );
        setTimeout(() => setCtaVisible(true), 500);
      }, 2000),
    );

    return () => {
      timeouts.forEach(clearTimeout);
      clearInterval(progressInterval);
    };
  }, [logs]);

  const ArchetypeIcon = useMemo(() => {
    if (role === "qa_engineer")
      return (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="22" stroke={accentColor} strokeWidth="1.5" />
          <path
            d="M16 24 L20 28 L32 16"
            stroke={accentColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M24 12 L24 8 M32 16 L36 12 M12 24 L8 24"
            stroke={accentColor}
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.4"
          />
        </svg>
      );
    if (role === "developer")
      return (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="22" stroke={accentColor} strokeWidth="1.5" />
          <path
            d="M19 17 L12 24 L19 31"
            stroke={accentColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M29 17 L36 24 L29 31"
            stroke={accentColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M26 14 L22 34"
            stroke={accentColor}
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.5"
          />
        </svg>
      );
    return (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="22" stroke={accentColor} strokeWidth="1.5" />
        <rect x="15" y="13" width="18" height="22" rx="2" stroke={accentColor} strokeWidth="1.5" />
        <path
          d="M19 19 H29 M19 23 H29 M19 27 H25"
          stroke={accentColor}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path d="M21 12 H27" stroke={accentColor} strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }, [role, accentColor]);

  return (
    <div
      className="step-fade animate-pulse-subtle flex flex-col items-center text-center animate-[fade-slide-up_300ms_ease-out_forwards]"
      style={{ maxWidth: 560, margin: "0 auto", position: "relative" }}
    >
      {phase === "scanning" && (
        <>
          <StepLabel accentColor={accentColor}>QA DNA</StepLabel>
          <h2
            style={{
              fontFamily: "Playfair Display, Georgia, serif",
              fontSize: "clamp(24px, 3.5vw, 36px)",
              fontWeight: 700,
              color: "var(--ink)",
              marginTop: 16,
              marginBottom: 28,
            }}
          >
            {progressLabel}
          </h2>

          {/* Terminal block */}
          <div
            style={{
              width: "100%",
              maxWidth: 420,
              background: "var(--ink)",
              borderRadius: 10,
              padding: "20px 24px",
              textAlign: "left",
              marginBottom: 24,
              minHeight: 140,
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 6,
                marginBottom: 14,
              }}
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: i === 0 ? "#FF5F56" : i === 1 ? "#FFBD2E" : "#27C93F",
                    opacity: 0.6,
                  }}
                />
              ))}
            </div>
            {visibleLines.map((_, lineIdx) => (
              <div
                key={lineIdx}
                className="terminal-line"
                style={{
                  fontFamily: "monospace",
                  fontSize: 12,
                  color: "#A8A29E",
                  marginBottom: 4,
                  minHeight: "1.4em",
                }}
              >
                <span style={{ color: accentColor, marginRight: 6 }}>&gt;</span>
                {lineTexts[lineIdx] || ""}
                {lineIdx === visibleLines.length - 1 && lineTexts[lineIdx] !== logs[lineIdx] && (
                  <span
                    style={{
                      display: "inline-block",
                      width: "6px",
                      height: "12px",
                      background: accentColor,
                      marginLeft: "1px",
                      verticalAlign: "middle",
                      animation: "blink 0.6s step-end infinite",
                    }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div
            style={{
              width: "100%",
              maxWidth: 420,
              height: 3,
              background: "var(--border)",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <div
              className="progress-fill"
              style={{
                height: "100%",
                width: `${progress}%`,
                background: accentColor,
                borderRadius: 2,
              }}
            />
          </div>
          <p style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 8 }}>
            {Math.round(progress)}% complete
          </p>
        </>
      )}

      {phase === "reveal" && (
        <div className="step-fade flex flex-col items-center" style={{ width: "100%" }}>
          <StepLabel accentColor={accentColor}>Your QA Identity</StepLabel>

          <div style={{ position: "relative", marginTop: 28, marginBottom: 28 }}>
            {/* Energy pulse particles */}
            {particles.map((p) => (
              <div
                key={p.id}
                style={{
                  position: "absolute",
                  top: `${p.y}%`,
                  left: `${p.x}%`,
                  width: p.size,
                  height: p.size,
                  borderRadius: "50%",
                  background: accentColor,
                  animation: "onboardingEnergyPulse 600ms ease forwards",
                  animationDelay: `${Math.random() * 200}ms`,
                  pointerEvents: "none",
                  transform: "translate(-50%, -50%)",
                }}
              />
            ))}

            {/* Badge */}
            <div
              className="badge-spring"
              style={{
                background: "var(--cream-50)",
                border: `2px solid ${accentColor}`,
                borderRadius: 16,
                padding: "36px 48px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 14,
                maxWidth: 360,
                margin: "0 auto",
                boxShadow: `0 4px 40px ${accentColor}1F`,
              }}
            >
              {ArchetypeIcon}

              <div
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 10,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: accentColor,
                  fontWeight: 500,
                }}
              >
                {archetype.tagline}
              </div>

              <div
                style={{
                  fontFamily: "Playfair Display, Georgia, serif",
                  fontSize: "clamp(20px, 3vw, 28px)",
                  fontWeight: 700,
                  color: "var(--ink)",
                  lineHeight: 1.2,
                }}
              >
                {config.badgeLabel}
              </div>

              <div
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 14,
                  color: "var(--ink-muted)",
                  fontStyle: "italic",
                  lineHeight: 1.5,
                  maxWidth: 240,
                }}
              >
                {config.badgeSubtitle}
              </div>
            </div>
          </div>

          <p
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 14,
              color: "var(--ink-muted)",
              letterSpacing: "0.02em",
              marginBottom: 32,
            }}
          >
            This is your QA identity. Own it.
          </p>

          <div
            style={{
              opacity: ctaVisible ? 1 : 0,
              transform: ctaVisible ? "translateY(0)" : "translateY(8px)",
              transition: "opacity 400ms ease, transform 400ms ease",
            }}
          >
            <ContinueButton onClick={onNext} accentColor={accentColor} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step 6: Interactive Checklist ────────────────────────────────────────────

function StepChecklist({
  workspaceName,
  onComplete,
  onNavigate,
  config,
  accentColor,
}: {
  workspaceName: string;
  onComplete: () => void;
  onNavigate: (route: string) => void;
  config: OnboardingStep;
  accentColor: string;
}) {
  const items = config.checklistItems || [];
  const [checked, setChecked] = useState<boolean[]>(() => items.map(() => false));
  const [confettiPieces, setConfettiPieces] = useState<
    { id: number; x: number; size: number; delay: number; color: string; drift: number }[]
  >([]);
  const [curtainVisible, setCurtainVisible] = useState(false);

  useEffect(() => {
    // Fire confetti immediately
    setConfettiPieces(
      Array.from({ length: 60 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        size: 6 + Math.random() * 8,
        delay: Math.random() * 0.4,
        color: Math.random() > 0.5 ? accentColor : "#F2EDE5",
        drift: (Math.random() - 0.5) * 80,
      })),
    );

    const t = setTimeout(() => setCurtainVisible(true), 400);
    return () => clearTimeout(t);
  }, [accentColor]);

  const toggleCheck = (i: number) => {
    setChecked((prev) => {
      const next = [...prev];
      next[i] = !next[i];
      return next;
    });
  };

  return (
    <div style={{ position: "relative", overflow: "hidden" }}>
      {/* Confetti */}
      {confettiPieces.map((p) => (
        <div
          key={p.id}
          style={{
            position: "fixed",
            top: -20,
            left: `${p.x}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
            animation: `onboardingConfettiFall 1.5s ease-in ${p.delay}s forwards`,
            pointerEvents: "none",
            zIndex: 100,
            transform: `translateX(${p.drift}px)`,
          }}
        />
      ))}

      {/* Dashboard silhouette curtain */}
      {curtainVisible && (
        <div
          className="curtain-reveal"
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            height: "35%",
            background: `linear-gradient(to top, var(--sidebar) 0%, var(--cream-200) 100%)`,
            opacity: 0,
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
      )}

      {/* Content */}
      <div
        className="step-fade flex flex-col animate-[fade-slide-up_300ms_ease-out_forwards]"
        style={{ maxWidth: 560, margin: "0 auto", position: "relative", zIndex: 1 }}
      >
        <div style={{ marginBottom: 6 }}>
          <StepLabel accentColor={accentColor}>
            [{workspaceName || "Your workspace"} is ready.]
          </StepLabel>
        </div>

        <h2
          style={{
            fontFamily: "Playfair Display, Georgia, serif",
            fontSize: "clamp(26px, 4vw, 40px)",
            fontWeight: 700,
            color: "var(--ink)",
            marginTop: 10,
            marginBottom: 8,
            lineHeight: 1.2,
          }}
        >
          {config.checklistHeader}
        </h2>

        <p style={{ color: "var(--ink-muted)", fontSize: 15, marginBottom: 28 }}>
          {config.checklistSubtext}
        </p>

        {/* Checklist */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map((item, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                background: "var(--cream-50)",
                border: `1.5px solid ${checked[i] ? accentColor : "var(--border-light)"}`,
                borderRadius: 8,
                padding: "14px 16px",
                transition: "border-color 200ms ease",
              }}
            >
              {/* Checkbox */}
              <button
                onClick={() => toggleCheck(i)}
                style={{
                  flexShrink: 0,
                  width: 22,
                  height: 22,
                  borderRadius: 5,
                  border: `1.5px solid ${checked[i] ? accentColor : "var(--border)"}`,
                  background: checked[i] ? accentColor : "transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background 150ms ease, border-color 150ms ease",
                  padding: 0,
                }}
              >
                {checked[i] && (
                  <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                    <path
                      d="M1 5L4.5 8.5L11 1"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>

              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: 14,
                    fontWeight: 500,
                    color: "var(--ink)",
                    textDecoration: checked[i] ? "line-through" : "none",
                    opacity: checked[i] ? 0.5 : 1,
                    transition: "opacity 150ms ease",
                    textAlign: "left",
                  }}
                >
                  {item.label}
                </div>
              </div>

              {/* "Do it now →" button */}
              <button
                onClick={() => onNavigate(item.route)}
                style={{
                  flexShrink: 0,
                  padding: "5px 12px",
                  border: "1px solid var(--border)",
                  borderRadius: 5,
                  background: "transparent",
                  fontFamily: "Inter, sans-serif",
                  fontSize: 11,
                  fontWeight: 500,
                  color: "var(--ink-muted)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  letterSpacing: "0.02em",
                  transition: "border-color 150ms ease, color 150ms ease",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.borderColor = accentColor;
                  el.style.color = accentColor;
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.borderColor = "var(--border)";
                  el.style.color = "var(--ink-muted)";
                }}
              >
                Do it now &rarr;
              </button>
            </div>
          ))}
        </div>

        {/* Token balance row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginTop: 20,
            padding: "10px 14px",
            background: "var(--cream-100)",
            border: "1px solid var(--border-light)",
            borderRadius: 7,
          }}
        >
          <div
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 10,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--ink-faint)",
              fontWeight: 500,
            }}
          >
            TOKENS
          </div>
          <div
            style={{
              flex: 1,
              height: 4,
              background: "var(--border)",
              borderRadius: 2,
              overflow: "hidden",
              maxWidth: 80,
            }}
          >
            <div
              style={{
                height: "100%",
                width: "100%",
                background: accentColor,
                borderRadius: 2,
              }}
            />
          </div>
          <div
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 12,
              fontWeight: 500,
              color: "var(--ink)",
            }}
          >
            100 pts
          </div>
          <div
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 10,
              color: "var(--ink-faint)",
            }}
          >
            / 100
          </div>
          <div
            style={{
              padding: "2px 8px",
              border: "1px solid var(--border)",
              borderRadius: 3,
              fontFamily: "Inter, sans-serif",
              fontSize: 9,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--ink-faint)",
            }}
          >
            STANDARD
          </div>
        </div>

        {/* Main CTA */}
        <button
          onClick={onComplete}
          style={{
            width: "100%",
            marginTop: 20,
            padding: "15px 24px",
            background: accentColor,
            color: "#FFFFFF",
            fontFamily: "Inter, sans-serif",
            fontSize: "15px",
            fontWeight: 600,
            borderRadius: 7,
            border: "none",
            cursor: "pointer",
            letterSpacing: "0.01em",
            transition: "filter 150ms ease",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.filter = "brightness(0.9)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.filter = "none";
          }}
        >
          {config.ctaButtonText || "Go to my dashboard"} &rarr;
        </button>
      </div>
    </div>
  );
}

// ─── Step Scope (Admin) ───────────────────────────────────────────────────────

function StepScope({
  onNext,
  config,
  accentColor,
}: {
  onNext: () => void;
  config: OnboardingStep;
  accentColor: string;
}) {
  return (
    <div
      className="step-fade flex flex-col items-center text-center animate-[fade-slide-up_300ms_ease-out_forwards]"
      style={{ maxWidth: 620, margin: "0 auto" }}
    >
      <StepLabel accentColor={accentColor}>
        {config.scopeHeader || "Your operational scope:"}
      </StepLabel>

      <h2
        style={{
          fontFamily: "Playfair Display, Georgia, serif",
          fontSize: "clamp(26px, 4vw, 40px)",
          fontWeight: 700,
          color: "var(--ink)",
          marginTop: 16,
          marginBottom: 28,
          lineHeight: 1.2,
        }}
      >
        Your operational scope.
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16,
          width: "100%",
          marginBottom: 36,
        }}
      >
        {/* CAN Column */}
        <div
          style={{
            background: "var(--cream-50)",
            border: "1.5px solid var(--border-light)",
            borderRadius: 10,
            padding: 20,
            textAlign: "left",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span
              style={{
                color: "#2E7D32",
                fontWeight: 700,
                fontSize: 13,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              CAN
            </span>
          </div>
          <ul
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              fontSize: 13,
              color: "var(--ink-muted)",
              listStyleType: "none",
              padding: 0,
              margin: 0,
            }}
          >
            <li>✓ Manage projects</li>
            <li>✓ Configure integrations</li>
            <li>✓ Add team members</li>
            <li>✓ Generate & run tests</li>
            <li>✓ Log bug reports</li>
          </ul>
        </div>

        {/* CANNOT Column */}
        <div
          style={{
            background: "var(--cream-50)",
            border: "1.5px solid var(--border-light)",
            borderRadius: 10,
            padding: 20,
            textAlign: "left",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span
              style={{
                color: "#64748B",
                fontWeight: 700,
                fontSize: 13,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              CANNOT
            </span>
          </div>
          <ul
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              fontSize: 13,
              color: "var(--ink-muted)",
              listStyleType: "none",
              padding: 0,
              margin: 0,
            }}
          >
            <li>✕ Delete projects</li>
            <li>✕ Change billing plan</li>
          </ul>
        </div>

        {/* NEEDS OWNER Column */}
        <div
          style={{
            background: "var(--cream-50)",
            border: "1.5px solid var(--border-light)",
            borderRadius: 10,
            padding: 20,
            textAlign: "left",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span
              style={{
                color: "#B8801a",
                fontWeight: 700,
                fontSize: 13,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              NEEDS OWNER
            </span>
          </div>
          <ul
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              fontSize: 13,
              color: "var(--ink-muted)",
              listStyleType: "none",
              padding: 0,
              margin: 0,
            }}
          >
            <li>🔒 Account deletion</li>
            <li>🔒 Workspace key access</li>
          </ul>
        </div>
      </div>

      <ContinueButton onClick={onNext} accentColor={accentColor} />
    </div>
  );
}

// ─── Step Loadout (Editor) ────────────────────────────────────────────────────

function StepLoadout({
  onNext,
  config,
  accentColor,
}: {
  onNext: () => void;
  config: OnboardingStep;
  accentColor: string;
}) {
  const loadoutItems = [
    { label: "Generate test cases from specs", allowed: true },
    { label: "Record user journeys", allowed: true },
    { label: "Create test suites", allowed: true },
    { label: "Execute test runs", allowed: true },
    { label: "Log bugs", allowed: true },
    { label: "Create test plans", allowed: true },
    { label: "Project deletion", allowed: false, note: "Owner only" },
    { label: "Billing management", allowed: false, note: "Owner only" },
  ];

  return (
    <div
      className="step-fade flex flex-col items-center text-center animate-[fade-slide-up_300ms_ease-out_forwards]"
      style={{ maxWidth: 600, margin: "0 auto" }}
    >
      <StepLabel accentColor={accentColor}>
        {config.loadoutHeader || "Here's what you're equipped with:"}
      </StepLabel>

      <h2
        style={{
          fontFamily: "Playfair Display, Georgia, serif",
          fontSize: "clamp(26px, 4vw, 40px)",
          fontWeight: 700,
          color: "var(--ink)",
          marginTop: 16,
          marginBottom: 28,
          lineHeight: 1.2,
        }}
      >
        Your Field Loadout.
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 12,
          width: "100%",
          marginBottom: 36,
        }}
      >
        {loadoutItems.map((item, i) => (
          <div
            key={i}
            style={{
              background: "var(--cream-50)",
              border: "1.5px solid var(--border-light)",
              borderRadius: 10,
              padding: "16px 20px",
              textAlign: "left",
              display: "flex",
              alignItems: "center",
              gap: 12,
              opacity: item.allowed ? 1 : 0.55,
            }}
          >
            {item.allowed ? (
              <div
                style={{
                  color: accentColor,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CheckCircle size={18} strokeWidth={2.5} />
              </div>
            ) : (
              <div
                style={{
                  color: "var(--ink-faint)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Lock size={16} />
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>
                {item.label}
              </span>
              {!item.allowed && (
                <span style={{ fontSize: 10, color: "var(--ink-faint)", marginTop: 1 }}>
                  Not in your mission scope &middot; {item.note}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <ContinueButton onClick={onNext} accentColor={accentColor} />
    </div>
  );
}

// ─── Step Intel Access (Viewer) ────────────────────────────────────────────────

function StepIntelAccess({
  onNext,
  config,
  accentColor,
}: {
  onNext: () => void;
  config: OnboardingStep;
  accentColor: string;
}) {
  const accessItems = [
    "View all test cases and runs",
    "Read test plans and reports",
    "Monitor bug registry",
    "Access analytics and dashboards",
  ];

  return (
    <div
      className="step-fade flex flex-col items-center text-center animate-[fade-slide-up_300ms_ease-out_forwards]"
      style={{ maxWidth: 520, margin: "0 auto" }}
    >
      <StepLabel accentColor={accentColor}>
        {config.accessHeader || "What's in your intel package:"}
      </StepLabel>

      <h2
        style={{
          fontFamily: "Playfair Display, Georgia, serif",
          fontSize: "clamp(26px, 4vw, 40px)",
          fontWeight: 700,
          color: "var(--ink)",
          marginTop: 16,
          marginBottom: 28,
          lineHeight: 1.2,
        }}
      >
        Your Intel Package.
      </h2>

      <div
        style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          marginBottom: 36,
        }}
      >
        {accessItems.map((item, i) => (
          <div
            key={i}
            style={{
              background: "var(--cream-50)",
              border: "1.5px solid var(--border-light)",
              borderRadius: 10,
              padding: "16px 20px",
              textAlign: "left",
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                color: accentColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Eye size={18} strokeWidth={2} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{item}</span>
          </div>
        ))}

        <div
          style={{
            marginTop: 8,
            background: "var(--cream-100)",
            border: "1.5px dashed var(--border)",
            borderRadius: 10,
            padding: "16px 20px",
            textAlign: "left",
            fontSize: 12,
            color: "var(--ink-muted)",
            lineHeight: 1.5,
          }}
        >
          — Creating or modifying records is outside your scope. Contact your Ops Officer to request
          role changes.
        </div>
      </div>

      <ContinueButton onClick={onNext} accentColor={accentColor} />
    </div>
  );
}

// ─── Progress Indicator ───────────────────────────────────────────────────────

function ProgressBar({
  step,
  total,
  accentColor,
}: {
  step: number;
  total: number;
  accentColor: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          style={{
            height: 3,
            width: i < step ? 24 : 14,
            background: i < step ? accentColor : "var(--border)",
            borderRadius: 2,
            transition: "width 250ms ease, background 250ms ease",
          }}
        />
      ))}
      <span
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 11,
          color: "var(--ink-faint)",
          letterSpacing: "0.05em",
          marginLeft: 4,
        }}
      >
        {step} / {total}
      </span>
    </div>
  );
}

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

// ─── Main OnboardingFlow ──────────────────────────────────────────────────────

export default function OnboardingFlow({ onComplete, onSkip, onNavigate, currentRole: propRole }: Props) {
  const auth = useAuth();
  const [, setSettings] = useSettings();
  const { currentUser } = useUserStore();
  const currentRole = (propRole || currentUser?.role || "viewer").toLowerCase();


  const [workspaceMeta] = useWorkspaceMeta();
  const [members, updateActiveWorkspaceMembers] = useWorkspaceMembersList();

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<Direction>("next");
  const [workspaceName, setWorkspaceName] = useState("");
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [stepKey, setStepKey] = useState(0);

  const currentUserMember = useMemo(() => {
    return members.find((m) => m.userId === auth.user?.id);
  }, [members, auth.user?.id]);

  // Derived briefing track
  const derivedTrack = useMemo(() => {
    if (!auth.user?.id) return "command";
    if (!workspaceMeta) return "command";

    const storeRole = currentRole.toLowerCase() as any;
    if (can(storeRole, "workspace:viewKey")) return "command";
    if (can(storeRole, "project:create")) return "ops";
    if (can(storeRole, "suite:create")) return "field";
    return "intel";
  }, [auth.user?.id, workspaceMeta, currentRole]);

  const [briefingTrack, setBriefingTrack] = useState<"command" | "ops" | "field" | "intel">(
    "command",
  );

  useEffect(() => {
    setBriefingTrack(derivedTrack);
  }, [derivedTrack]);

  const trackConfig = useMemo(() => {
    if (briefingTrack === "command") return commandBrief;
    if (briefingTrack === "ops") return opsBrief;
    if (briefingTrack === "field") return fieldBrief;
    return intelBrief;
  }, [briefingTrack]);

  const TOTAL_STEPS = trackConfig.steps.length;

  useEffect(() => {
    const userId = auth.user?.id;
    if (userId) {
      const saved = localStorage.getItem(`fieldnotes_onboarding_data.${userId}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.workspaceName) setWorkspaceName(parsed.workspaceName);
          if (parsed.role) setSelectedRole(parsed.role);
        } catch (e) {
          void e;
        }
      }
    }

    if (workspaceMeta) {
      setWorkspaceName(workspaceMeta.workspaceName);
    }
    if (currentUserMember) {
      const jt = currentUserMember.jobTitle?.toLowerCase() || "";
      if (jt.includes("qa") || jt.includes("tester")) {
        setSelectedRole("qa_engineer");
      } else if (jt.includes("dev") || jt.includes("engineer") || jt.includes("programmer")) {
        setSelectedRole("developer");
      } else if (jt.includes("manager") || jt.includes("pm") || jt.includes("product")) {
        setSelectedRole("project_manager");
      }
    }
  }, [auth.user?.id, workspaceMeta, currentUserMember]);

  const goNext = useCallback(() => {
    setDirection("next");
    setStep((s) => s + 1);
    setStepKey((k) => k + 1);
  }, []);

  const goBack = useCallback(() => {
    setDirection("back");
    setStep((s) => s - 1);
    setStepKey((k) => k + 1);
  }, []);

  const completeWorkspaceSetup = useCallback(async () => {
    const userId = auth.user?.id;
    const email = auth.user?.email || "";
    if (!userId) return;

    let jobTitle = "QA Engineer";
    if (selectedRole === "developer") jobTitle = "Developer";
    if (selectedRole === "project_manager") jobTitle = "Project Manager";

    if (workspaceMeta) {
      if (briefingTrack === "command" && workspaceName) {
        // Update workspace name in Supabase
        await supabase
          .from("workspaces")
          .update({ name: workspaceName })
          .eq("id", workspaceMeta.workspaceId);
          
        updateActiveWorkspaceMeta({
          ...workspaceMeta,
          workspaceName: workspaceName
        });
      }
      
      // Update member job title in Supabase
      await supabase
        .from("workspace_members")
        .update({ job_title: jobTitle })
        .eq("workspace_id", workspaceMeta.workspaceId)
        .eq("user_id", userId);

      const updatedMembers = members.map((m) => {
        if (m.userId === userId) {
          return {
            ...m,
            displayName: email.split("@")[0] || m.displayName,
            jobTitle: jobTitle,
          };
        }
        return m;
      });
      updateActiveWorkspaceMembers(updatedMembers);
    }
  }, [
    auth.user?.id,
    auth.user?.email,
    briefingTrack,
    workspaceMeta,
    selectedRole,
    workspaceName,
    members,
    updateActiveWorkspaceMembers,
  ]);

  const handleComplete = useCallback(() => {
    const userId = auth.user?.id;
    localStorage.setItem("fieldnotes_onboarding_complete", "true");
    if (userId) {
      localStorage.setItem(`fieldnotes_onboarding_complete.${userId}`, "true");
      localStorage.setItem(`fieldnotes.user.${userId}.onboardingComplete`, "true");
      localStorage.setItem(
        `fieldnotes_onboarding_data.${userId}`,
        JSON.stringify({
          workspaceName,
          role: selectedRole ?? "qa_engineer",
          archetype: selectedRole ? ARCHETYPES[selectedRole].title : ARCHETYPES.qa_engineer.title,
        }),
      );
    }

    let mappedRole = "QA Engineer";
    if (selectedRole === "developer") mappedRole = "Developer";
    if (selectedRole === "project_manager") mappedRole = "Project Manager";

    setSettings((prev) => ({
      ...prev,
      role: mappedRole,
    }));

    completeWorkspaceSetup();

    onComplete({
      workspaceName,
      role: selectedRole ?? "qa_engineer",
      archetype: selectedRole ? ARCHETYPES[selectedRole].title : ARCHETYPES.qa_engineer.title,
    });
  }, [auth.user?.id, onComplete, workspaceName, selectedRole, setSettings, completeWorkspaceSetup]);

  const handleNavigate = useCallback(
    (route: string) => {
      const userId = auth.user?.id;
      localStorage.setItem("fieldnotes_onboarding_complete", "true");
      if (userId) {
        localStorage.setItem(`fieldnotes_onboarding_complete.${userId}`, "true");
        localStorage.setItem(`fieldnotes.user.${userId}.onboardingComplete`, "true");
        localStorage.setItem(
          `fieldnotes_onboarding_data.${userId}`,
          JSON.stringify({
            workspaceName,
            role: selectedRole ?? "qa_engineer",
            archetype: selectedRole ? ARCHETYPES[selectedRole].title : ARCHETYPES.qa_engineer.title,
          }),
        );
      }

      let mappedRole = "QA Engineer";
      if (selectedRole === "developer") mappedRole = "Developer";
      if (selectedRole === "project_manager") mappedRole = "Project Manager";

      setSettings((prev) => ({
        ...prev,
        role: mappedRole,
      }));

      completeWorkspaceSetup();

      if (onNavigate) {
        onNavigate(route);
      } else {
        onComplete({
          workspaceName,
          role: selectedRole ?? "qa_engineer",
          archetype: selectedRole ? ARCHETYPES[selectedRole].title : ARCHETYPES.qa_engineer.title,
        });
      }
    },
    [
      auth.user?.id,
      onComplete,
      onNavigate,
      workspaceName,
      selectedRole,
      setSettings,
      completeWorkspaceSetup,
    ],
  );

  const handleSkip = useCallback(() => {
    const userId = auth.user?.id;
    localStorage.setItem("fieldnotes_onboarding_complete", "true");
    if (userId) {
      localStorage.setItem(`fieldnotes_onboarding_complete.${userId}`, "true");
      localStorage.setItem(`fieldnotes.user.${userId}.onboardingComplete`, "true");
      if (workspaceName.trim()) {
        localStorage.setItem(
          `fieldnotes_onboarding_data.${userId}`,
          JSON.stringify({
            workspaceName,
            role: selectedRole ?? "qa_engineer",
            archetype: selectedRole ? ARCHETYPES[selectedRole].title : ARCHETYPES.qa_engineer.title,
          }),
        );
      }
    }
    // Make sure we trigger setup so Owner gets workspace created even if they skip
    if (briefingTrack === "command" && workspaceName.trim()) {
      completeWorkspaceSetup();
    }
    onSkip();
  }, [auth.user?.id, onSkip, workspaceName, selectedRole, briefingTrack, completeWorkspaceSetup]);

  const currentStepConfig = trackConfig.steps[step - 1];

  const showBack = step >= 2 && step < TOTAL_STEPS;
  const showSkip = step < TOTAL_STEPS;

  const skipLabel = useMemo(() => {
    if (briefingTrack === "command" || briefingTrack === "ops") return "Skip setup";
    if (briefingTrack === "field") return "Skip briefing";
    return "Skip to dashboard";
  }, [briefingTrack]);

  const renderStep = () => {
    if (!currentStepConfig) return null;

    switch (currentStepConfig.type) {
      case "welcome":
        return (
          <Step1Welcome
            briefingTrack={briefingTrack}
            config={currentStepConfig}
            onNext={goNext}
            accentColor={trackConfig.accentColor}
            iconName={trackConfig.iconName}
          />
        );
      case "workspace_setup":
        return (
          <Step2Workspace
            workspaceName={workspaceName}
            onChange={setWorkspaceName}
            onNext={goNext}
            config={currentStepConfig}
            accentColor={trackConfig.accentColor}
          />
        );
      case "specialty":
        return (
          <Step3Role
            selectedRole={selectedRole}
            onSelect={setSelectedRole}
            onNext={goNext}
            config={currentStepConfig}
            accentColor={trackConfig.accentColor}
          />
        );
      case "features":
        return (
          <Step4Features
            onNext={goNext}
            config={currentStepConfig}
            accentColor={trackConfig.accentColor}
          />
        );
      case "scope":
        return (
          <StepScope
            onNext={goNext}
            config={currentStepConfig}
            accentColor={trackConfig.accentColor}
          />
        );
      case "loadout":
        return (
          <StepLoadout
            onNext={goNext}
            config={currentStepConfig}
            accentColor={trackConfig.accentColor}
          />
        );
      case "intel_access":
        return (
          <StepIntelAccess
            onNext={goNext}
            config={currentStepConfig}
            accentColor={trackConfig.accentColor}
          />
        );
      case "dna_reveal":
        return (
          <Step5DNA
            role={selectedRole ?? "qa_engineer"}
            onNext={goNext}
            config={currentStepConfig}
            accentColor={trackConfig.accentColor}
          />
        );
      case "checklist":
        return (
          <StepChecklist
            workspaceName={workspaceName}
            onComplete={handleComplete}
            onNavigate={handleNavigate}
            config={currentStepConfig}
            accentColor={trackConfig.accentColor}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="onboarding-container"
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--cream)",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 32px",
          borderBottom: "1px solid var(--border-light)",
          flexShrink: 0,
        }}
      >
        {/* Logo */}
        <div
          style={{
            fontFamily: "Playfair Display, Georgia, serif",
            fontWeight: 700,
            fontSize: 16,
            color: "var(--ink)",
            letterSpacing: "-0.01em",
          }}
        >
          QAMind AI{" "}
          <span style={{ color: "var(--ink-faint)", fontWeight: 400, fontSize: 12 }}>QA</span>
        </div>

        {/* Progress */}
        <ProgressBar step={step} total={TOTAL_STEPS} accentColor={trackConfig.accentColor} />

        {/* Skip */}
        {showSkip ? (
          <button
            onClick={handleSkip}
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 12,
              color: "var(--ink-faint)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
              letterSpacing: "0.04em",
              padding: "4px 0",
              transition: "color 150ms ease",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.color = "var(--ink)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.color = "var(--ink-faint)")
            }
          >
            <X size={14} />
            {skipLabel}
          </button>
        ) : (
          <div style={{ width: 60 }} />
        )}
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 32px",
        }}
      >
        <div style={{ width: "100%", maxWidth: 720 }}>
          {/* Using key to force remount and re-trigger animations on step change */}
          <div key={stepKey}>{renderStep()}</div>
        </div>
      </div>

      {/* Footer — back button */}
      {showBack && (
        <div
          style={{
            padding: "16px 32px",
            borderTop: "1px solid var(--border-light)",
            flexShrink: 0,
          }}
        >
          <button
            onClick={goBack}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontFamily: "Inter, sans-serif",
              fontSize: 13,
              color: "var(--ink-faint)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              transition: "color 150ms ease",
              padding: 0,
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.color = "var(--ink)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.color = "var(--ink-faint)")
            }
          >
            <ChevronLeft size={15} />
            Back
          </button>
        </div>
      )}
    </div>
  );
}
