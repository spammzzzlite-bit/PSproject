import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
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
} from 'lucide-react';
import { useAuth, useSettings } from '@/lib/store';

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = 'qa_engineer' | 'developer' | 'project_manager';
type Direction = 'next' | 'back';

interface UserData {
  workspaceName: string;
  role: Role;
  archetype: string;
}

interface Props {
  onComplete: (userData: UserData) => void;
  onSkip: () => void;
  onNavigate?: (route: string) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ARCHETYPES: Record<Role, { title: string; tagline: string; description: string }> = {
  qa_engineer: {
    title: 'The Methodical Breaker',
    tagline: 'QA ENGINEER ARCHETYPE',
    description: 'You find what others miss. Edge cases fear you.',
  },
  developer: {
    title: 'The Ship-Fast Fixer',
    tagline: 'DEVELOPER ARCHETYPE',
    description: 'You break it, you own it. Speed meets precision.',
  },
  project_manager: {
    title: 'The Coverage Zealot',
    tagline: 'PROJECT MANAGER ARCHETYPE',
    description: 'Nothing ships without your sign-off. Ever.',
  },
};

const ROLE_CARDS: { id: Role; label: string; sublabel: string; icon: React.ReactNode }[] = [
  {
    id: 'qa_engineer',
    label: 'QA Engineer',
    sublabel: 'I write and run test cases',
    icon: <Bug size={28} strokeWidth={1.5} />,
  },
  {
    id: 'developer',
    label: 'Developer',
    sublabel: 'I build features and fix bugs',
    icon: <Code2 size={28} strokeWidth={1.5} />,
  },
  {
    id: 'project_manager',
    label: 'Project Manager',
    sublabel: 'I track progress and reports',
    icon: <ClipboardList size={28} strokeWidth={1.5} />,
  },
];

const FEATURE_CARDS = [
  {
    icon: <Zap size={22} strokeWidth={1.5} />,
    title: 'Generate Tests',
    description: 'Describe a feature, AI writes the test cases.',
  },
  {
    icon: <Bug size={22} strokeWidth={1.5} />,
    title: 'Bug Reporter',
    description: 'Flag failures and auto-log bugs in one click.',
  },
  {
    icon: <RefreshCw size={22} strokeWidth={1.5} />,
    title: 'Regression',
    description: 'Run full suite checks across your projects.',
  },
  {
    icon: <BarChart2 size={22} strokeWidth={1.5} />,
    title: 'Reports',
    description: 'Export PDF and CSV reports for any project.',
  },
];

const CHECKLIST_ITEMS = [
  {
    label: 'Create your first project',
    description: 'Set up a workspace project to organize your test suites.',
    route: '/projects',
    action: 'New Project modal',
  },
  {
    label: 'Generate your first test case',
    description: 'Describe a feature and let AI draft your tests.',
    route: '/generate',
    action: 'Generate Tests',
  },
  {
    label: 'Set up a test suite',
    description: 'Group related test cases for organised runs.',
    route: '/suites',
    action: 'Test Suites',
  },
  {
    label: 'Run your first regression',
    description: 'Execute a full suite check across your project.',
    route: '/regression',
    action: 'Regression',
  },
];

const SCAN_LINES = [
  'Scanning workflow patterns...',
  'Detecting edge case sensitivity...',
  'Measuring regression tolerance...',
  'Calibrating bug instinct...',
  'Cross-referencing test philosophy...',
];

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useTypewriter(text: string, speed = 45, onDone?: () => void) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const indexRef = useRef(0);

  useEffect(() => {
    setDisplayed('');
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

function StepLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontFamily: 'Inter, sans-serif',
        fontSize: '10px',
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        color: 'var(--orange)',
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
  label = 'Continue →',
}: {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? 'var(--border)' : 'var(--ink)',
        color: disabled ? 'var(--ink-faint)' : '#F8F5F0',
        fontFamily: 'Inter, sans-serif',
        fontSize: '14px',
        fontWeight: 500,
        padding: '12px 28px',
        borderRadius: '6px',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 150ms ease, transform 100ms ease',
        letterSpacing: '0.01em',
      }}
      onMouseEnter={e => {
        if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = '#2D2924';
      }}
      onMouseLeave={e => {
        if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = 'var(--ink)';
      }}
    >
      {label}
    </button>
  );
}

// ─── Step 1: Welcome ──────────────────────────────────────────────────────────

function Step1Welcome({ onNext }: { onNext: () => void }) {
  const [subtextVisible, setSubtextVisible] = useState(false);
  const [ctaVisible, setCtaVisible] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [cursorBlink, setCursorBlink] = useState(false);

  const { displayed } = useTypewriter(
    'Welcome to Field Notes QA.',
    45,
    () => {
      setCursorBlink(true);
      setTimeout(() => {
        setCursorVisible(false);
        setSubtextVisible(true);
        setTimeout(() => setCtaVisible(true), 200);
      }, 800);
    }
  );

  return (
    <div
      className="step-fade-up flex flex-col items-center justify-center text-center animate-[fade-slide-up_300ms_ease-out_forwards]"
      style={{ maxWidth: 560, margin: '0 auto' }}
    >
      {/* Floating SVG icon cluster */}
      <div
        className="flex items-center gap-8 mb-10"
        style={{ height: 64, opacity: subtextVisible ? 1 : 0, transition: 'opacity 400ms ease' }}
      >
        <div
          className="animate-float"
          style={{ color: 'var(--orange)', opacity: 0.8 }}
        >
          <Bug size={32} strokeWidth={1.5} />
        </div>
        <div
          className="animate-float-delay-1"
          style={{ color: 'var(--ink)', opacity: 0.6 }}
        >
          <FileText size={36} strokeWidth={1.2} />
        </div>
        <div
          className="animate-float-delay-2"
          style={{ color: 'var(--orange)', opacity: 0.7 }}
        >
          <BarChart2 size={30} strokeWidth={1.5} />
        </div>
        <div
          className="animate-float"
          style={{ color: 'var(--ink)', opacity: 0.5, animationDelay: '1.2s' }}
        >
          <CheckCircle size={28} strokeWidth={1.5} />
        </div>
        <div
          className="animate-float-delay-1"
          style={{ color: 'var(--orange)', opacity: 0.65, animationDelay: '0.6s' }}
        >
          <Code2 size={26} strokeWidth={1.5} />
        </div>
      </div>

      {/* Typewriter heading */}
      <h1
        style={{
          fontFamily: 'Playfair Display, Georgia, serif',
          fontSize: 'clamp(32px, 5vw, 52px)',
          fontWeight: 700,
          color: 'var(--ink)',
          lineHeight: 1.15,
          marginBottom: 0,
          minHeight: '1.2em',
        }}
      >
        {displayed}
        {cursorVisible && (
          <span
            style={{
              display: 'inline-block',
              width: '3px',
              height: '0.85em',
              background: 'var(--orange)',
              marginLeft: '3px',
              verticalAlign: 'middle',
              animation: cursorBlink ? 'blink 0.8s step-end infinite' : 'none',
            }}
          />
        )}
      </h1>

      {/* Subtext */}
      <p
        style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: '16px',
          color: 'var(--ink-muted)',
          marginTop: 20,
          lineHeight: 1.6,
          opacity: subtextVisible ? 1 : 0,
          transform: subtextVisible ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 400ms ease, transform 400ms ease',
          maxWidth: 440,
        }}
      >
        Your workspace for smarter QA &mdash; let&apos;s get you set up in 2 minutes.
      </p>

      {/* CTA */}
      <div
        style={{
          marginTop: 36,
          opacity: ctaVisible ? 1 : 0,
          transform: ctaVisible ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 200ms ease, transform 200ms ease',
        }}
      >
        <button
          onClick={onNext}
          style={{
            background: 'var(--orange)',
            color: '#fff',
            fontFamily: 'Inter, sans-serif',
            fontSize: '15px',
            fontWeight: 500,
            padding: '13px 32px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            letterSpacing: '0.01em',
            transition: 'background 150ms ease',
          }}
          onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--orange-hover)')}
          onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--orange)')}
        >
          Let&apos;s go &rarr;
        </button>
      </div>
    </div>
  );
}

// ─── Step 2: Workspace Setup ──────────────────────────────────────────────────

function Step2Workspace({
  workspaceName,
  onChange,
  onNext,
}: {
  workspaceName: string;
  onChange: (v: string) => void;
  onNext: () => void;
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
      style={{ maxWidth: 480, margin: '0 auto' }}
    >
      <StepLabel>Step 2 of 6 &mdash; Workspace</StepLabel>

      <h2
        style={{
          fontFamily: 'Playfair Display, Georgia, serif',
          fontSize: 'clamp(28px, 4vw, 42px)',
          fontWeight: 700,
          color: 'var(--ink)',
          marginTop: 16,
          marginBottom: 8,
          lineHeight: 1.2,
        }}
      >
        Name your workspace.
      </h2>

      <p style={{ color: 'var(--ink-muted)', fontSize: 15, marginBottom: 36 }}>
        This is how your workspace will appear across the app.
      </p>

      <div style={{ width: '100%', maxWidth: 400 }}>
        <input
          ref={inputRef}
          type="text"
          value={workspaceName}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleContinue()}
          placeholder="e.g. Acme QA Team"
          className={shaking ? 'input-shake' : ''}
          style={{
            width: '100%',
            padding: '14px 18px',
            fontSize: '17px',
            fontFamily: 'Inter, sans-serif',
            background: 'var(--cream-50)',
            border: `1.5px solid ${isEmpty ? '#D94F35' : 'var(--border)'}`,
            borderRadius: '8px',
            color: 'var(--ink)',
            outline: 'none',
            transition: 'border-color 150ms ease',
            boxSizing: 'border-box',
          }}
          onFocus={e => {
            if (!isEmpty) e.currentTarget.style.borderColor = 'var(--ink)';
          }}
          onBlur={e => {
            if (!isEmpty) e.currentTarget.style.borderColor = 'var(--border)';
          }}
        />
        {isEmpty && (
          <p style={{ color: '#D94F35', fontSize: 12, marginTop: 6, textAlign: 'left' }}>
            Please name your workspace to continue.
          </p>
        )}
      </div>

      <div style={{ marginTop: 36 }}>
        <ContinueButton onClick={handleContinue} disabled={false} />
      </div>
    </div>
  );
}

// ─── Step 3: Role Selection ───────────────────────────────────────────────────

function Step3Role({
  selectedRole,
  onSelect,
  onNext,
}: {
  selectedRole: Role | null;
  onSelect: (r: Role) => void;
  onNext: () => void;
}) {
  return (
    <div
      className="step-slide-right flex flex-col items-center text-center"
      style={{ maxWidth: 680, margin: '0 auto' }}
    >
      <StepLabel>Step 3 of 6 &mdash; Role</StepLabel>

      <h2
        style={{
          fontFamily: 'Playfair Display, Georgia, serif',
          fontSize: 'clamp(26px, 4vw, 40px)',
          fontWeight: 700,
          color: 'var(--ink)',
          marginTop: 16,
          marginBottom: 8,
          lineHeight: 1.2,
        }}
      >
        What&apos;s your role?
      </h2>

      <p style={{ color: 'var(--ink-muted)', fontSize: 15, marginBottom: 36 }}>
        We&apos;ll tailor the experience to what matters to you.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
          width: '100%',
        }}
      >
        {ROLE_CARDS.map(card => {
          const isSelected = selectedRole === card.id;
          const isDimmed = selectedRole !== null && !isSelected;

          return (
            <div
              key={card.id}
              className="flip-card"
              style={{ height: 180, cursor: 'pointer' }}
              onClick={() => onSelect(card.id)}
            >
              <div className={`flip-card-inner ${isSelected ? 'flipped' : ''}`}>
                {/* Front */}
                <div
                  className="flip-card-front"
                  style={{
                    background: isSelected ? 'var(--cream-100)' : 'var(--cream-50)',
                    border: `1.5px solid ${isSelected ? 'var(--orange)' : 'var(--border)'}`,
                    borderRadius: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 12,
                    padding: 20,
                    opacity: isDimmed ? 0.4 : 1,
                    transition: 'opacity 200ms ease',
                  }}
                >
                  <div style={{ color: 'var(--orange)' }}>{card.icon}</div>
                  <div>
                    <div
                      style={{
                        fontFamily: 'Inter, sans-serif',
                        fontWeight: 600,
                        fontSize: 15,
                        color: 'var(--ink)',
                        marginBottom: 4,
                      }}
                    >
                      {card.label}
                    </div>
                    <div
                      style={{
                        fontFamily: 'Inter, sans-serif',
                        fontSize: 12,
                        color: 'var(--ink-muted)',
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
                    background: 'var(--ink)',
                    borderRadius: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    padding: 20,
                  }}
                >
                  <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                    <circle cx="18" cy="18" r="17" stroke="#C4531A" strokeWidth="1.5" />
                    <path
                      className="check-path"
                      d="M11 18.5L15.5 23L25 13"
                      stroke="#C4531A"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 700,
                      fontSize: 14,
                      color: '#F8F5F0',
                      letterSpacing: '0.02em',
                    }}
                  >
                    Locked in.
                  </div>
                  <div
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize: 11,
                      color: 'var(--ink-faint)',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
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
        <ContinueButton onClick={onNext} disabled={!selectedRole} />
      </div>
    </div>
  );
}

// ─── Step 4: Feature Highlights ───────────────────────────────────────────────

function Step4Features({ onNext }: { onNext: () => void }) {
  return (
    <div
      className="step-fade flex flex-col items-center text-center"
      style={{ maxWidth: 600, margin: '0 auto' }}
    >
      <StepLabel>Step 4 of 6 &mdash; Features</StepLabel>

      <h2
        style={{
          fontFamily: 'Playfair Display, Georgia, serif',
          fontSize: 'clamp(26px, 4vw, 40px)',
          fontWeight: 700,
          color: 'var(--ink)',
          marginTop: 16,
          marginBottom: 8,
          lineHeight: 1.2,
        }}
      >
        Here&apos;s what you can do.
      </h2>

      <p style={{ color: 'var(--ink-muted)', fontSize: 15, marginBottom: 36 }}>
        Everything you need to run QA without the noise.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 14,
          width: '100%',
        }}
      >
        {FEATURE_CARDS.map((card, i) => (
          <div
            key={card.title}
            className="feature-card animate-[scaleInFade_300ms_ease_forwards]"
            style={{
              animationDelay: `${i * 80}ms`,
              background: 'var(--cream-50)',
              border: '1.5px solid var(--border-light)',
              borderRadius: 10,
              padding: '20px 22px',
              textAlign: 'left',
            }}
          >
            <div
              style={{
                color: 'var(--orange)',
                marginBottom: 10,
              }}
            >
              {card.icon}
            </div>
            <div
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                fontSize: 14,
                color: 'var(--ink)',
                marginBottom: 5,
              }}
            >
              {card.title}
            </div>
            <div
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 13,
                color: 'var(--ink-muted)',
                lineHeight: 1.5,
              }}
            >
              {card.description}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 36 }}>
        <ContinueButton onClick={onNext} />
      </div>
    </div>
  );
}

// ─── Step 5: QA DNA Reveal ────────────────────────────────────────────────────

type DNAPhase = 'scanning' | 'reveal';

function Step5DNA({
  role,
  onNext,
}: {
  role: Role;
  onNext: () => void;
}) {
  const archetype = ARCHETYPES[role];
  const [phase, setPhase] = useState<DNAPhase>('scanning');
  const [progress, setProgress] = useState(0);
  const [visibleLines, setVisibleLines] = useState<string[]>([]);
  const [lineTexts, setLineTexts] = useState<string[]>([]);
  const [ctaVisible, setCtaVisible] = useState(false);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; size: number }[]>([]);

  // Build line text char by char for each line
  useEffect(() => {
    const totalDuration = 1800;
    const lineInterval = totalDuration / SCAN_LINES.length;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    SCAN_LINES.forEach((line, lineIdx) => {
      const lineStart = lineIdx * lineInterval;

      // Add blank line slot first
      timeouts.push(
        setTimeout(() => {
          setVisibleLines(prev => [...prev, '']);
        }, lineStart)
      );

      // Type chars for this line
      for (let c = 0; c < line.length; c++) {
        timeouts.push(
          setTimeout(() => {
            setLineTexts(prev => {
              const next = [...prev];
              while (next.length <= lineIdx) next.push('');
              next[lineIdx] = line.slice(0, c + 1);
              return next;
            });
          }, lineStart + c * 20)
        );
      }
    });

    // Progress bar
    const startTime = Date.now();
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / 1800) * 100, 100);
      setProgress(pct);
      if (pct >= 100) clearInterval(progressInterval);
    }, 30);

    // Transition to reveal
    timeouts.push(
      setTimeout(() => {
        setPhase('reveal');
        // Spawn particles
        setParticles(
          Array.from({ length: 14 }, (_, i) => ({
            id: i,
            x: 45 + Math.random() * 10,
            y: 45 + Math.random() * 10,
            size: 4 + Math.random() * 5,
          }))
        );
        setTimeout(() => setCtaVisible(true), 500);
      }, 2000)
    );

    return () => {
      timeouts.forEach(clearTimeout);
      clearInterval(progressInterval);
    };
  }, []);

  const ArchetypeIcon = useMemo(() => {
    if (role === 'qa_engineer')
      return (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="22" stroke="var(--orange)" strokeWidth="1.5" />
          <path d="M16 24 L20 28 L32 16" stroke="var(--orange)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M24 12 L24 8 M32 16 L36 12 M12 24 L8 24" stroke="var(--orange)" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
        </svg>
      );
    if (role === 'developer')
      return (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="22" stroke="var(--orange)" strokeWidth="1.5" />
          <path d="M19 17 L12 24 L19 31" stroke="var(--orange)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M29 17 L36 24 L29 31" stroke="var(--orange)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M26 14 L22 34" stroke="var(--orange)" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
        </svg>
      );
    return (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="22" stroke="var(--orange)" strokeWidth="1.5" />
        <rect x="15" y="13" width="18" height="22" rx="2" stroke="var(--orange)" strokeWidth="1.5" />
        <path d="M19 19 H29 M19 23 H29 M19 27 H25" stroke="var(--orange)" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M21 12 H27" stroke="var(--orange)" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }, [role]);

  return (
    <div
      className="step-fade animate-pulse-subtle flex flex-col items-center text-center"
      style={{ maxWidth: 560, margin: '0 auto', position: 'relative' }}
    >
      {phase === 'scanning' && (
        <>
          <StepLabel>Step 5 of 6 &mdash; QA DNA</StepLabel>
          <h2
            style={{
              fontFamily: 'Playfair Display, Georgia, serif',
              fontSize: 'clamp(24px, 3.5vw, 36px)',
              fontWeight: 700,
              color: 'var(--ink)',
              marginTop: 16,
              marginBottom: 28,
            }}
          >
            Analysing your QA profile...
          </h2>

          {/* Terminal block */}
          <div
            style={{
              width: '100%',
              maxWidth: 420,
              background: 'var(--ink)',
              borderRadius: 10,
              padding: '20px 24px',
              textAlign: 'left',
              marginBottom: 24,
              minHeight: 140,
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: 6,
                marginBottom: 14,
              }}
            >
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: i === 0 ? '#FF5F56' : i === 1 ? '#FFBD2E' : '#27C93F',
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
                  fontFamily: 'monospace',
                  fontSize: 12,
                  color: '#A8A29E',
                  marginBottom: 4,
                  minHeight: '1.4em',
                }}
              >
                <span style={{ color: 'var(--orange)', marginRight: 6 }}>&gt;</span>
                {lineTexts[lineIdx] || ''}
                {lineIdx === visibleLines.length - 1 &&
                  lineTexts[lineIdx] !== SCAN_LINES[lineIdx] && (
                    <span
                      style={{
                        display: 'inline-block',
                        width: '6px',
                        height: '12px',
                        background: 'var(--orange)',
                        marginLeft: '1px',
                        verticalAlign: 'middle',
                        animation: 'blink 0.6s step-end infinite',
                      }}
                    />
                  )}
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div
            style={{
              width: '100%',
              maxWidth: 420,
              height: 3,
              background: 'var(--border)',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <div
              className="progress-fill"
              style={{
                height: '100%',
                width: `${progress}%`,
                background: 'var(--orange)',
                borderRadius: 2,
              }}
            />
          </div>
          <p style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 8 }}>
            {Math.round(progress)}% complete
          </p>
        </>
      )}

      {phase === 'reveal' && (
        <div className="step-fade flex flex-col items-center" style={{ width: '100%' }}>
          <StepLabel>Your QA Identity</StepLabel>

          <div style={{ position: 'relative', marginTop: 28, marginBottom: 28 }}>
            {/* Energy pulse particles */}
            {particles.map(p => (
              <div
                key={p.id}
                style={{
                  position: 'absolute',
                  top: `${p.y}%`,
                  left: `${p.x}%`,
                  width: p.size,
                  height: p.size,
                  borderRadius: '50%',
                  background: 'var(--orange)',
                  animation: 'onboardingEnergyPulse 600ms ease forwards',
                  animationDelay: `${Math.random() * 200}ms`,
                  pointerEvents: 'none',
                  transform: 'translate(-50%, -50%)',
                }}
              />
            ))}

            {/* Badge */}
            <div
              className="badge-spring"
              style={{
                background: 'var(--cream-50)',
                border: '2px solid var(--orange)',
                borderRadius: 16,
                padding: '36px 48px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 14,
                maxWidth: 360,
                margin: '0 auto',
                boxShadow: '0 4px 40px rgba(196,83,26,0.12)',
              }}
            >
              {ArchetypeIcon}

              <div
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: 10,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  color: 'var(--orange)',
                  fontWeight: 500,
                }}
              >
                {archetype.tagline}
              </div>

              <div
                style={{
                  fontFamily: 'Playfair Display, Georgia, serif',
                  fontSize: 'clamp(20px, 3vw, 28px)',
                  fontWeight: 700,
                  color: 'var(--ink)',
                  lineHeight: 1.2,
                }}
              >
                {archetype.title}
              </div>

              <div
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: 14,
                  color: 'var(--ink-muted)',
                  fontStyle: 'italic',
                  lineHeight: 1.5,
                  maxWidth: 240,
                }}
              >
                &ldquo;{archetype.description}&rdquo;
              </div>
            </div>
          </div>

          <p
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 14,
              color: 'var(--ink-muted)',
              letterSpacing: '0.02em',
              marginBottom: 32,
            }}
          >
            This is your QA identity. Own it.
          </p>

          <div
            style={{
              opacity: ctaVisible ? 1 : 0,
              transform: ctaVisible ? 'translateY(0)' : 'translateY(8px)',
              transition: 'opacity 400ms ease, transform 400ms ease',
            }}
          >
            <ContinueButton onClick={onNext} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step 6: Interactive Checklist ────────────────────────────────────────────

function Step6Checklist({
  workspaceName,
  onComplete,
  onNavigate,
}: {
  workspaceName: string;
  onComplete: () => void;
  onNavigate: (route: string) => void;
}) {
  const [checked, setChecked] = useState<boolean[]>([false, false, false, false]);
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
        color: Math.random() > 0.5 ? '#C4531A' : '#F2EDE5',
        drift: (Math.random() - 0.5) * 80,
      }))
    );

    // Curtain reveal after 400ms
    const t = setTimeout(() => setCurtainVisible(true), 400);
    return () => clearTimeout(t);
  }, []);

  const toggleCheck = (i: number) => {
    setChecked(prev => {
      const next = [...prev];
      next[i] = !next[i];
      return next;
    });
  };

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Confetti */}
      {confettiPieces.map(p => (
        <div
          key={p.id}
          style={{
            position: 'fixed',
            top: -20,
            left: `${p.x}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            animation: `onboardingConfettiFall 1.5s ease-in ${p.delay}s forwards`,
            pointerEvents: 'none',
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
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: '35%',
            background: `linear-gradient(to top, var(--sidebar) 0%, var(--cream-200) 100%)`,
            opacity: 0,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
      )}

      {/* Content */}
      <div
        className="step-fade flex flex-col"
        style={{ maxWidth: 560, margin: '0 auto', position: 'relative', zIndex: 1 }}
      >
        <div style={{ marginBottom: 6 }}>
          <StepLabel>
            [{workspaceName || 'Your workspace'} is ready.]
          </StepLabel>
        </div>

        <h2
          style={{
            fontFamily: 'Playfair Display, Georgia, serif',
            fontSize: 'clamp(26px, 4vw, 40px)',
            fontWeight: 700,
            color: 'var(--ink)',
            marginTop: 10,
            marginBottom: 8,
            lineHeight: 1.2,
          }}
        >
          You&apos;re in. Here&apos;s where to start.
        </h2>

        <p style={{ color: 'var(--ink-muted)', fontSize: 15, marginBottom: 28 }}>
          Knock these out first to get the most out of Field Notes QA.
        </p>

        {/* Checklist */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {CHECKLIST_ITEMS.map((item, i) => (
            <div
              key={item.route}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                background: 'var(--cream-50)',
                border: `1.5px solid ${checked[i] ? 'var(--orange)' : 'var(--border-light)'}`,
                borderRadius: 8,
                padding: '14px 16px',
                transition: 'border-color 200ms ease',
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
                  border: `1.5px solid ${checked[i] ? 'var(--orange)' : 'var(--border)'}`,
                  background: checked[i] ? 'var(--orange)' : 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 150ms ease, border-color 150ms ease',
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
                    fontFamily: 'Inter, sans-serif',
                    fontSize: 14,
                    fontWeight: 500,
                    color: 'var(--ink)',
                    textDecoration: checked[i] ? 'line-through' : 'none',
                    opacity: checked[i] ? 0.5 : 1,
                    transition: 'opacity 150ms ease',
                  }}
                >
                  {item.label}
                </div>
                <div
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: 12,
                    color: 'var(--ink-faint)',
                    marginTop: 2,
                  }}
                >
                  {item.description}
                </div>
              </div>

              {/* "Do it now →" button */}
              <button
                onClick={() => onNavigate(item.route)}
                style={{
                  flexShrink: 0,
                  padding: '5px 12px',
                  border: '1px solid var(--border)',
                  borderRadius: 5,
                  background: 'transparent',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: 11,
                  fontWeight: 500,
                  color: 'var(--ink-muted)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  letterSpacing: '0.02em',
                  transition: 'border-color 150ms ease, color 150ms ease',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.borderColor = 'var(--orange)';
                  el.style.color = 'var(--orange)';
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.borderColor = 'var(--border)';
                  el.style.color = 'var(--ink-muted)';
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
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginTop: 20,
            padding: '10px 14px',
            background: 'var(--cream-100)',
            border: '1px solid var(--border-light)',
            borderRadius: 7,
          }}
        >
          <div
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 10,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--ink-faint)',
              fontWeight: 500,
            }}
          >
            TOKENS
          </div>
          <div
            style={{
              flex: 1,
              height: 4,
              background: 'var(--border)',
              borderRadius: 2,
              overflow: 'hidden',
              maxWidth: 80,
            }}
          >
            <div
              style={{
                height: '100%',
                width: '100%',
                background: 'var(--orange)',
                borderRadius: 2,
              }}
            />
          </div>
          <div
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--ink)',
            }}
          >
            100 pts
          </div>
          <div
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 10,
              color: 'var(--ink-faint)',
            }}
          >
            / 100
          </div>
          <div
            style={{
              padding: '2px 8px',
              border: '1px solid var(--border)',
              borderRadius: 3,
              fontFamily: 'Inter, sans-serif',
              fontSize: 9,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--ink-faint)',
            }}
          >
            STANDARD
          </div>
        </div>

        {/* Main CTA */}
        <button
          onClick={onComplete}
          style={{
            width: '100%',
            marginTop: 20,
            padding: '15px 24px',
            background: 'var(--orange)',
            color: '#fff',
            fontFamily: 'Inter, sans-serif',
            fontSize: '15px',
            fontWeight: 500,
            borderRadius: 7,
            border: 'none',
            cursor: 'pointer',
            letterSpacing: '0.01em',
            transition: 'background 150ms ease',
          }}
          onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--orange-hover)')}
          onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--orange)')}
        >
          Go to my dashboard &rarr;
        </button>
      </div>
    </div>
  );
}

// ─── Progress Indicator ───────────────────────────────────────────────────────

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          style={{
            height: 3,
            width: i < step ? 24 : 14,
            background: i < step ? 'var(--orange)' : 'var(--border)',
            borderRadius: 2,
            transition: 'width 250ms ease, background 250ms ease',
          }}
        />
      ))}
      <span
        style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: 11,
          color: 'var(--ink-faint)',
          letterSpacing: '0.05em',
          marginLeft: 4,
        }}
      >
        {step} / {total}
      </span>
    </div>
  );
}

// ─── Main OnboardingFlow ──────────────────────────────────────────────────────

export default function OnboardingFlow({ onComplete, onSkip, onNavigate }: Props) {
  const auth = useAuth();
  const [, setSettings] = useSettings();

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<Direction>('next');
  const [workspaceName, setWorkspaceName] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [stepKey, setStepKey] = useState(0);

  const goNext = useCallback(() => {
    setDirection('next');
    setStep(s => s + 1);
    setStepKey(k => k + 1);
  }, []);

  const goBack = useCallback(() => {
    setDirection('back');
    setStep(s => s - 1);
    setStepKey(k => k + 1);
  }, []);

  const handleComplete = useCallback(() => {
    const userId = auth.user?.id;
    localStorage.setItem('fieldnotes_onboarding_complete', 'true');
    if (userId) {
      localStorage.setItem(`fieldnotes_onboarding_complete.${userId}`, 'true');
      localStorage.setItem(`fieldnotes_onboarding_data.${userId}`, JSON.stringify({
        workspaceName,
        role: selectedRole ?? 'qa_engineer',
        archetype: selectedRole ? ARCHETYPES[selectedRole].title : ARCHETYPES.qa_engineer.title,
      }));
    }

    let mappedRole = "QA Engineer";
    if (selectedRole === "developer") mappedRole = "Developer";
    if (selectedRole === "project_manager") mappedRole = "Project Manager";

    setSettings(prev => ({
      ...prev,
      role: mappedRole,
    }));

    onComplete({
      workspaceName,
      role: selectedRole ?? 'qa_engineer',
      archetype: selectedRole ? ARCHETYPES[selectedRole].title : ARCHETYPES.qa_engineer.title,
    });
  }, [auth.user?.id, onComplete, workspaceName, selectedRole, setSettings]);

  const handleNavigate = useCallback(
    (route: string) => {
      const userId = auth.user?.id;
      localStorage.setItem('fieldnotes_onboarding_complete', 'true');
      if (userId) {
        localStorage.setItem(`fieldnotes_onboarding_complete.${userId}`, 'true');
        localStorage.setItem(`fieldnotes_onboarding_data.${userId}`, JSON.stringify({
          workspaceName,
          role: selectedRole ?? 'qa_engineer',
          archetype: selectedRole ? ARCHETYPES[selectedRole].title : ARCHETYPES.qa_engineer.title,
        }));
      }

      let mappedRole = "QA Engineer";
      if (selectedRole === "developer") mappedRole = "Developer";
      if (selectedRole === "project_manager") mappedRole = "Project Manager";

      setSettings(prev => ({
        ...prev,
        role: mappedRole,
      }));

      if (onNavigate) {
        onNavigate(route);
      } else {
        onComplete({
          workspaceName,
          role: selectedRole ?? 'qa_engineer',
          archetype: selectedRole ? ARCHETYPES[selectedRole].title : ARCHETYPES.qa_engineer.title,
        });
      }
    },
    [auth.user?.id, onComplete, onNavigate, workspaceName, selectedRole, setSettings]
  );

  const handleSkip = useCallback(() => {
    const userId = auth.user?.id;
    localStorage.setItem('fieldnotes_onboarding_complete', 'true');
    if (userId) {
      localStorage.setItem(`fieldnotes_onboarding_complete.${userId}`, 'true');
    }
    onSkip();
  }, [auth.user?.id, onSkip]);

  const TOTAL_STEPS = 6;
  const showBack = step >= 2 && step < 6;
  const showSkip = step < 6;

  return (
    <div
      className="onboarding-container"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--cream)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 32px',
          borderBottom: '1px solid var(--border-light)',
          flexShrink: 0,
        }}
      >
        {/* Logo */}
        <div
          style={{
            fontFamily: 'Playfair Display, Georgia, serif',
            fontWeight: 700,
            fontSize: 16,
            color: 'var(--ink)',
            letterSpacing: '-0.01em',
          }}
        >
          Field Notes{' '}
          <span style={{ color: 'var(--ink-faint)', fontWeight: 400, fontSize: 12 }}>QA</span>
        </div>

        {/* Progress */}
        <ProgressBar step={step} total={TOTAL_STEPS} />

        {/* Skip */}
        {showSkip ? (
          <button
            onClick={handleSkip}
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 12,
              color: 'var(--ink-faint)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              letterSpacing: '0.04em',
              padding: '4px 0',
              transition: 'color 150ms ease',
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--ink)')}
            onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--ink-faint)')}
          >
            <X size={14} />
            Skip
          </button>
        ) : (
          <div style={{ width: 60 }} />
        )}
      </div>

      {/* Step content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 32px',
        }}
      >
        <div style={{ width: '100%', maxWidth: 720 }}>
          {/* Using key to force remount and re-trigger animations on step change */}
          <div key={stepKey}>
            {step === 1 && <Step1Welcome onNext={goNext} />}
            {step === 2 && (
              <Step2Workspace
                workspaceName={workspaceName}
                onChange={setWorkspaceName}
                onNext={goNext}
              />
            )}
            {step === 3 && (
              <Step3Role
                selectedRole={selectedRole}
                onSelect={setSelectedRole}
                onNext={goNext}
              />
            )}
            {step === 4 && <Step4Features onNext={goNext} />}
            {step === 5 && (
              <Step5DNA role={selectedRole ?? 'qa_engineer'} onNext={goNext} />
            )}
            {step === 6 && (
              <Step6Checklist
                workspaceName={workspaceName}
                onComplete={handleComplete}
                onNavigate={handleNavigate}
              />
            )}
          </div>
        </div>
      </div>

      {/* Footer — back button */}
      {showBack && (
        <div
          style={{
            padding: '16px 32px',
            borderTop: '1px solid var(--border-light)',
            flexShrink: 0,
          }}
        >
          <button
            onClick={goBack}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: 'Inter, sans-serif',
              fontSize: 13,
              color: 'var(--ink-faint)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              transition: 'color 150ms ease',
              padding: 0,
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--ink)')}
            onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--ink-faint)')}
          >
            <ChevronLeft size={15} />
            Back
          </button>
        </div>
      )}
    </div>
  );
}
