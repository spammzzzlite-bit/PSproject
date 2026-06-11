import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { PAGE_TEXT } from "../content";

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { title: "Field Notes - Quality engineering, written down" },
      {
        name: "description",
        content:
          "A quieter test-case workspace. Built for QA teams who'd rather read a one-pager than a dashboard.",
      },
      { property: "og:title", content: "Field Notes - Quality engineering, written down" },
      { property: "og:description", content: "A quieter test-case workspace for QA teams." },
    ],
  }),
  component: Welcome,
});

function renderWithFallWords(text: string) {
  const words = PAGE_TEXT.fallWords || [];
  if (!words.length || !text) return <>{text}</>;
  
  const regex = new RegExp(`\\b(${words.join('|')})\\b`, 'gi');
  const parts = text.split(regex);
  
  return (
    <>
      {parts.map((part, i) => {
        if (words.some(w => w.toLowerCase() === part.toLowerCase())) {
          return <span key={i} className="fall-word" data-fall-word="true">{part}</span>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

type GsapInstance = {
  registerPlugin: (...plugins: unknown[]) => void;
  timeline: (vars?: Record<string, unknown>) => GsapTimeline;
  set: (targets: unknown, vars: Record<string, unknown>) => void;
  to: (targets: unknown, vars: Record<string, unknown>) => GsapTween;
  from: (targets: unknown, vars: Record<string, unknown>) => GsapTween;
  fromTo: (
    targets: unknown,
    fromVars: Record<string, unknown>,
    toVars: Record<string, unknown>,
  ) => GsapTween;
  utils: {
    toArray: <T = Element>(targets: string | Element[] | NodeListOf<Element>) => T[];
  };
};

type GsapTimeline = {
  from: (targets: unknown, vars: Record<string, unknown>, position?: string | number) => GsapTimeline;
  to: (targets: unknown, vars: Record<string, unknown>, position?: string | number) => GsapTimeline;
  set: (targets: unknown, vars: Record<string, unknown>, position?: string | number) => GsapTimeline;
  kill: () => void;
};

type GsapTween = { kill: () => void };

type ScrollTriggerInstance = {
  create: (vars: Record<string, unknown>) => { kill: () => void };
  update: () => void;
  refresh: () => void;
  getAll: () => Array<{ kill: () => void }>;
};

type SplitTextInstance = {
  chars?: Element[];
  words?: Element[];
  revert: () => void;
};

type SplitTextConstructor = new (
  element: Element,
  vars: { type: string; charsClass?: string; wordsClass?: string },
) => SplitTextInstance;

type LenisConstructor = new (vars: {
  duration: number;
  easing: (t: number) => number;
  smoothWheel: boolean;
  wheelMultiplier?: number;
}) => {
  raf: (time: number) => void;
  destroy: () => void;
};

declare global {
  interface Window {
    gsap?: GsapInstance;
    ScrollTrigger?: ScrollTriggerInstance;
    SplitText?: SplitTextConstructor;
    Lenis?: LenisConstructor;
  }
}

const CDN_SCRIPTS = [
  "https://cdn.jsdelivr.net/npm/@studio-freight/lenis@1.0.42/bundled/lenis.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js",
  "https://assets.codepen.io/16327/SplitText3.min.js",
];

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);

    const handler = (event: MediaQueryListEvent) => setReduced(event.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return reduced;
}

function useScrolledNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 60);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return scrolled;
}

function useCdnScripts() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadOne = (src: string) =>
      new Promise<void>((resolve) => {
        const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
        if (existing) {
          if (existing.dataset.loaded === "true") resolve();
          else existing.addEventListener("load", () => resolve(), { once: true });
          return;
        }

        const script = document.createElement("script");
        script.src = src;
        script.async = false;
        script.dataset.fieldNotesMotion = "true";
        script.addEventListener("load", () => {
          script.dataset.loaded = "true";
          resolve();
        });
        script.addEventListener("error", () => resolve());
        document.head.appendChild(script);
      });

    CDN_SCRIPTS.reduce(
      (promise, src) => promise.then(() => loadOne(src)),
      Promise.resolve(),
    ).then(() => {
      if (!cancelled) setLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return loaded;
}

function useLenis(ready: boolean, reduced: boolean) {
  useEffect(() => {
    if (!ready || reduced || !window.Lenis) return;

    const lenis = new window.Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.95,
    });

    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      window.ScrollTrigger?.update();
      frame = requestAnimationFrame(raf);
    };

    frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, [ready, reduced]);
}

function CustomCursor({ enabled }: { enabled: boolean }) {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) return;

    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring || window.matchMedia("(pointer: coarse), (hover: none)").matches) return;

    let ringX = window.innerWidth / 2;
    let ringY = window.innerHeight / 2;
    let targetX = ringX;
    let targetY = ringY;
    let frame = 0;

    const move = (event: MouseEvent) => {
      targetX = event.clientX;
      targetY = event.clientY;
      dot.style.transform = `translate3d(${targetX - 3}px, ${targetY - 3}px, 0)`;
      dot.style.opacity = "1";
      ring.style.opacity = "1";
    };

    const tick = () => {
      ringX += (targetX - ringX) * 0.22;
      ringY += (targetY - ringY) * 0.22;
      ring.style.transform = `translate3d(${ringX - 14}px, ${ringY - 14}px, 0)`;
      frame = requestAnimationFrame(tick);
    };

    const onPointerOver = (event: PointerEvent) => {
      if ((event.target as Element).closest("a, button, .fn-hover-target")) {
        ring.classList.add("is-expanded");
      }
    };

    const onPointerOut = (event: PointerEvent) => {
      if ((event.target as Element).closest("a, button, .fn-hover-target")) {
        ring.classList.remove("is-expanded");
      }
    };

    document.documentElement.classList.add("has-field-cursor");
    window.addEventListener("mousemove", move, { passive: true });
    document.addEventListener("pointerover", onPointerOver);
    document.addEventListener("pointerout", onPointerOut);
    frame = requestAnimationFrame(tick);

    return () => {
      document.documentElement.classList.remove("has-field-cursor");
      window.removeEventListener("mousemove", move);
      document.removeEventListener("pointerover", onPointerOver);
      document.removeEventListener("pointerout", onPointerOut);
      cancelAnimationFrame(frame);
    };
  }, [enabled]);

  return (
    <>
      <div ref={dotRef} className="fn-cursor fn-cursor-dot" aria-hidden="true" />
      <div ref={ringRef} className="fn-cursor fn-cursor-ring" aria-hidden="true" />
    </>
  );
}

function useMotionSystem(ready: boolean, reduced: boolean, rootRef: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    if (reduced) {
      root.classList.add("motion-reduced");
      return () => root.classList.remove("motion-reduced");
    }

    if (!ready || !window.gsap || !window.ScrollTrigger) return;

    const gsap = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;
    const splitInstances: SplitTextInstance[] = [];
    const cleanupFns: Array<() => void> = [];

    gsap.registerPlugin(ScrollTrigger);
    if (window.SplitText) gsap.registerPlugin(window.SplitText);

    const split = (element: Element, type: "chars" | "words") => {
      if (!window.SplitText) return null;
      const instance = new window.SplitText(element, {
        type,
        charsClass: "fn-split-char",
        wordsClass: "fn-split-word",
      });
      splitInstances.push(instance);
      return instance;
    };

    const headline = root.querySelector(".hero-headline");
    const nav = root.querySelector(".field-nav");
    const subtext = root.querySelector(".hero-subtext");
    const ctas = root.querySelectorAll(".hero-cta");
    const quote = root.querySelector(".hero-quote-card");
    const chars = headline ? split(headline, "chars")?.chars : null;

    if (chars?.length) {
      gsap.set(chars, { yPercent: 105 });
    }

    const intro = gsap.timeline({
      defaults: { ease: "power3.out" },
      onComplete: () => root.classList.add("intro-complete"),
    });

    intro
      .from(nav, { opacity: 0, y: -18, duration: 0.22 })
      .to(chars?.length ? chars : headline, { yPercent: 0, opacity: 1, duration: 0.44, stagger: 0.018 }, 0.14)
      .from(subtext, { opacity: 0, y: 14, duration: 0.28 }, 0.42)
      .from(ctas, { opacity: 0, y: 22, duration: 0.32, stagger: 0.05 }, 0.54)
      .from(quote, { opacity: 0, x: 84, duration: 0.42 }, 0.48);

    if (!chars?.length && headline) {
      gsap.from(headline, { opacity: 0, y: 26, duration: 0.52, ease: "power3.out" });
    }

    root.querySelectorAll(".section-marker").forEach((marker) => {
      gsap.from(marker, {
        opacity: 0,
        rotate: -15,
        y: 10,
        duration: 0.58,
        ease: "power3.out",
        scrollTrigger: { trigger: marker, start: "top 84%", once: true },
      });
    });

    root.querySelectorAll(".section-heading").forEach((heading) => {
      const words = split(heading, "words")?.words;
      gsap.from(words?.length ? words : heading, {
        yPercent: words?.length ? 105 : 0,
        y: words?.length ? 0 : 22,
        opacity: words?.length ? 1 : 0,
        duration: 0.62,
        stagger: 0.045,
        ease: "power3.out",
        scrollTrigger: { trigger: heading, start: "top 82%", once: true },
      });
    });

    gsap.from(root.querySelectorAll(".practice-card"), {
      opacity: 0,
      y: 34,
      duration: 0.62,
      stagger: 0.12,
      ease: "power3.out",
      scrollTrigger: { trigger: "#practice", start: "top 68%", once: true },
    });

    gsap.from(root.querySelectorAll(".pricing-card"), {
      opacity: 0,
      scale: 0.96,
      y: 20,
      duration: 0.62,
      stagger: 0.12,
      ease: "power3.out",
      scrollTrigger: { trigger: "#pricing", start: "top 70%", once: true },
    });

    const price = root.querySelector<HTMLElement>("[data-count-price='24']");
    if (price) {
      ScrollTrigger.create({
        trigger: price,
        start: "top 84%",
        once: true,
        onEnter: () => {
          const value = { amount: 0 };
          gsap.to(value, {
            amount: 24,
            duration: 0.85,
            ease: "power2.out",
            onUpdate: () => {
              price.textContent = `$${Math.round(value.amount)}`;
            },
          });
        },
      });
    }

    root.querySelectorAll<HTMLElement>(".editorial-note").forEach((note) => {
      gsap.fromTo(
        note,
        { opacity: 0, y: 8 },
        {
          opacity: 1,
          y: 0,
          delay: 0.5,
          duration: 0.5,
          ease: "power2.out",
          scrollTrigger: { trigger: note.closest("section"), start: "top 70%", once: true },
        },
      );
    });

    if (quote) {
      gsap.to(quote, {
        yPercent: -28,
        ease: "none",
        scrollTrigger: {
          trigger: ".field-hero",
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
    }

    root.querySelectorAll<HTMLElement>("[data-tilt]").forEach((card) => {
      const onMove = (event: MouseEvent) => {
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        gsap.to(card, {
          rotateX: y * -20,
          rotateY: x * 20,
          duration: 0.22,
          ease: "power2.out",
          transformPerspective: 600,
          transformStyle: "preserve-3d",
        });
      };
      const onLeave = () => {
        gsap.to(card, {
          rotateX: 0,
          rotateY: 0,
          duration: 0.7,
          ease: "elastic.out(1, 0.55)",
        });
      };
      card.addEventListener("mousemove", onMove);
      card.addEventListener("mouseleave", onLeave);
      cleanupFns.push(() => {
        card.removeEventListener("mousemove", onMove);
        card.removeEventListener("mouseleave", onLeave);
      });
    });

    root.querySelectorAll<HTMLElement>("[data-magnetic]").forEach((button) => {
      const onMove = (event: MouseEvent) => {
        const rect = button.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dx = event.clientX - centerX;
        const dy = event.clientY - centerY;
        const distance = Math.hypot(dx, dy);

        if (distance < 80) {
          const force = (80 - distance) / 80;
          gsap.to(button, {
            x: dx * 0.32 * force,
            y: dy * 0.42 * force,
            duration: 0.2,
            ease: "power2.out",
          });
        } else {
          gsap.to(button, { x: 0, y: 0, duration: 0.55, ease: "elastic.out(1, 0.5)" });
        }
      };
      const onLeave = () => {
        gsap.to(button, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.45)" });
      };
      window.addEventListener("mousemove", onMove, { passive: true });
      button.addEventListener("mouseleave", onLeave);
      cleanupFns.push(() => {
        window.removeEventListener("mousemove", onMove);
        button.removeEventListener("mouseleave", onLeave);
      });
    });

    ScrollTrigger.refresh();

    return () => {
      intro.kill();
      cleanupFns.forEach((cleanup) => cleanup());
      splitInstances.forEach((instance) => instance.revert());
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
      root.classList.remove("intro-complete");
    };
  }, [ready, reduced, rootRef]);
}

function TypewriterDesc({ text, hovered, reduced }: { text: string; hovered: boolean; reduced: boolean }) {
  const [displayed, setDisplayed] = useState(text);

  useEffect(() => {
    if (reduced) { setDisplayed(text); return; }
    if (hovered) {
      setDisplayed("");
      let i = 0;
      let frame: number;
      let lastTime = performance.now();

      const step = (now: number) => {
        const rate = 800 / Math.max(text.length, 1);
        if (now - lastTime > rate) {
          i++;
          setDisplayed(text.slice(0, i));
          lastTime = now;
        }
        if (i < text.length) {
          frame = requestAnimationFrame(step);
        }
      };
      frame = requestAnimationFrame(step);
      return () => cancelAnimationFrame(frame);
    } else {
      setDisplayed(text);
    }
  }, [hovered, text, reduced]);

  return (
    <>
      {displayed}
      {hovered && !reduced && displayed.length < text.length && <span className="typewriter-cursor">|</span>}
    </>
  );
}

function CountUpDesc({ text, hovered, reduced }: { text: string; hovered: boolean; reduced: boolean }) {
  const [val, setVal] = useState(0);
  const match = text.match(/\d+/);
  const target = match ? parseInt(match[0], 10) : 0;

  useEffect(() => {
    if (reduced || !target) return;
    if (hovered) {
      setVal(0);
      let start = performance.now();
      let frame: number;
      const step = (now: number) => {
        const progress = Math.min((now - start) / 600, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        setVal(Math.round(target * ease));
        if (progress < 1) frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
      return () => cancelAnimationFrame(frame);
    } else {
      setVal(target);
    }
  }, [hovered, target, reduced]);

  if (!target) return <>{text}</>;
  return <>{text.replace(/\d+/, val.toString())}</>;
}

function FeatureIcon({ type, hovered, reduced }: { type: string; hovered: boolean; reduced: boolean }) {
  if (type === 'workspace') {
    return (
      <div className="w-8 h-8 relative">
        {/* Desk scene */}
        <div className="absolute bottom-1 left-1 w-4 h-1 bg-[var(--c-border-strong)] rounded-full"></div>
        <div className="absolute bottom-2 left-2 w-2 h-4 bg-[var(--c-border-strong)] rounded-t-sm"></div>
        <div className="absolute bottom-5 left-1 w-4 h-2 bg-[var(--c-border-strong)] rounded-full origin-bottom-right transform rotate-12"></div>
        <div className={`absolute bottom-2 left-0 w-6 h-6 rounded-full bg-[var(--c-accent)] mix-blend-screen blur-sm transition-opacity duration-300 ${hovered && !reduced ? 'opacity-40' : 'opacity-0'}`}></div>
        <div className="absolute bottom-1 right-1 w-2 h-2 bg-[var(--c-text-muted)] rounded-b-sm"></div>
        {hovered && !reduced && (
          <>
            <div className="absolute bottom-4 right-1 w-1 h-1 bg-[var(--c-text-muted)] rounded-full animate-steam" style={{ animationDelay: '0s' }}></div>
            <div className="absolute bottom-4 right-2 w-1 h-1 bg-[var(--c-text-muted)] rounded-full animate-steam" style={{ animationDelay: '0.2s' }}></div>
            <div className="absolute bottom-4 right-1.5 w-1 h-1 bg-[var(--c-text-muted)] rounded-full animate-steam" style={{ animationDelay: '0.4s' }}></div>
          </>
        )}
      </div>
    );
  }
  if (type === 'pace') {
    return (
      <div className="w-8 h-8 relative flex justify-center items-end pb-1 overflow-hidden">
        <div className="w-4 h-1 bg-[var(--c-border-strong)] rounded-full absolute bottom-1"></div>
        <div className={`absolute bottom-1.5 w-0.5 h-6 bg-[var(--c-accent)] origin-bottom transition-transform ${hovered && !reduced ? 'animate-metronome' : ''}`}>
          <div className="absolute -top-1 -left-0.5 w-1.5 h-1.5 bg-[var(--c-accent)] rounded-full"></div>
        </div>
      </div>
    );
  }
  return null;
}

function FeatureCard({ n, featureKey, reduced }: { n: string; featureKey: 'workspace'|'format'|'pace'|'cost'; reduced: boolean }) {
  const [flipped, setFlipped] = useState(false);
  const [hovered, setHovered] = useState(false);
  // @ts-ignore - dynamic keying on PAGE_TEXT
  const feature = PAGE_TEXT.features[featureKey];
  // @ts-ignore
  const manifesto = PAGE_TEXT.features.manifestos[featureKey];

  return (
    <div 
      className="feature-card-wrapper fn-hover-target" 
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => setFlipped(!flipped)}
    >
      <div 
        className={`feature-card-inner relative w-full h-full rounded-[8px] transition-transform ${flipped ? 'is-flipped' : ''}`}
        style={{ transitionDuration: reduced ? '0s' : '0.6s' }}
      >
        {/* Front Face (Relative to set height) */}
        <div className={`feature-card-front relative w-full h-full backface-hidden rounded-[8px] border bg-[var(--c-bg-card)] p-4 flex flex-col justify-between ${hovered && featureKey === 'cost' && !reduced && !feature.desc.match(/\d/) ? 'border-pulse-orange' : 'border-[var(--c-border)]'}`}>
          <div>
            <div className="flex justify-between items-start mb-2">
              <span className="block font-mono text-[10px] text-[var(--c-accent)]">{n}</span>
              <FeatureIcon type={featureKey} hovered={hovered} reduced={reduced} />
            </div>
            <p className="text-[14px] font-semibold text-[var(--c-text)]">{feature.label}</p>
          </div>
          <p className="mt-2 text-[12px] leading-[1.45] text-[var(--c-text-muted)]">
            {featureKey === 'format' ? (
              <TypewriterDesc text={feature.desc} hovered={hovered} reduced={reduced} />
            ) : featureKey === 'cost' ? (
              <CountUpDesc text={feature.desc} hovered={hovered} reduced={reduced} />
            ) : (
              feature.desc
            )}
          </p>
        </div>

        {/* Back Face (Absolute to overlay) */}
        <div className="feature-card-back absolute inset-0 backface-hidden rotate-y-180 rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg-hover)] p-4 flex items-center justify-center text-center">
          <p className="font-display italic text-[15px] leading-snug text-[var(--c-text)]">{manifesto}</p>
        </div>
      </div>
    </div>
  );
}

function useGlobalInteractions(reduced: boolean) {
  const [activeNav, setActiveNav] = useState<string>('');

  useEffect(() => {
    // Nav Dot scroll spy
    const sections = document.querySelectorAll('section[id], footer[id]');
    const observer = new IntersectionObserver((entries) => {
      let visibleSection = activeNav;
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          visibleSection = entry.target.id;
        }
      });
      if (visibleSection !== activeNav) {
        setActiveNav(visibleSection);
      }
    }, { rootMargin: '-40% 0px -40% 0px' });

    sections.forEach(s => observer.observe(s));
    
    // HR Draw-In
    const hrs = document.querySelectorAll('.fn-hr-draw');
    const hrObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !reduced) {
          (entry.target as HTMLElement).style.transform = 'scaleX(1)';
        }
      });
    }, { threshold: 0.1 });
    
    hrs.forEach(hr => {
      (hr as HTMLElement).style.transform = reduced ? 'scaleX(1)' : 'scaleX(0)';
      (hr as HTMLElement).style.transformOrigin = 'center';
      (hr as HTMLElement).style.transition = 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
      hrObserver.observe(hr);
    });

    // Stillness Reward
    let idleTimeout: NodeJS.Timeout;
    const resetIdle = () => {
      clearTimeout(idleTimeout);
      document.body.classList.remove('is-idle');
      const activeBright = document.querySelector('.stillness-bright');
      if (activeBright) {
        activeBright.classList.remove('stillness-bright');
        const cap = activeBright.querySelector('.stillness-caption');
        if (cap) cap.remove();
      }
      
      idleTimeout = setTimeout(() => {
        document.body.classList.add('is-idle');
        const quotes = document.querySelectorAll('[data-stillness="true"]');
        if (quotes.length > 0) {
          const rand = quotes[Math.floor(Math.random() * quotes.length)];
          rand.classList.add('stillness-bright');
          const caption = document.createElement('span');
          caption.className = 'stillness-caption';
          caption.textContent = ' Empty is a state, not a failure.';
          rand.appendChild(caption);
        }
      }, 20000);
    };

    window.addEventListener('mousemove', resetIdle, { passive: true });
    window.addEventListener('keydown', resetIdle, { passive: true });
    window.addEventListener('scroll', resetIdle, { passive: true });
    resetIdle();

    return () => {
      observer.disconnect();
      hrObserver.disconnect();
      window.removeEventListener('mousemove', resetIdle);
      window.removeEventListener('keydown', resetIdle);
      window.removeEventListener('scroll', resetIdle);
      clearTimeout(idleTimeout);
    };
  }, [activeNav, reduced]);

  return activeNav;
}

function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme");
      if (saved === "light" || saved === "dark") return saved;
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
    }
    return "light";
  });

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <button
      onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
      title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      className="p-2 text-[var(--c-text-muted)] hover:text-[var(--c-text)] transition-colors rounded-full"
    >
      {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </button>
  );
}

function IssueCounter() {
  const [issue, setIssue] = useState(PAGE_TEXT.issueNumber);
  useEffect(() => {
    let interval: NodeJS.Timeout;
    const handleVis = () => {
      if (document.visibilityState === 'visible') {
        interval = setInterval(() => {
          setIssue(prev => prev >= 20 ? 14 : prev + 1);
        }, 20000);
      } else {
        clearInterval(interval);
      }
    };
    handleVis();
    document.addEventListener('visibilitychange', handleVis);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVis);
    }
  }, []);
  
  return <span id="issue-counter">{String(issue).padStart(3, '0')}</span>;
}

function SectionMarker({ label }: { label: string }) {
  return (
    <p className="section-marker label-eyebrow mb-3 group cursor-default">
      <span className="fn-section-symbol relative inline-block w-[1em] h-[1em] mr-1 align-middle text-[var(--c-accent)]">
        <span className="absolute inset-0 transition-all duration-300 transform origin-center group-hover:rotate-90 group-hover:opacity-0">&sect;</span>
        <span className="absolute inset-0 transition-all duration-300 transform origin-center -rotate-90 opacity-0 group-hover:rotate-0 group-hover:opacity-100">&para;</span>
      </span> 
      {label}
    </p>
  );
}

function Welcome() {
  const rootRef = useRef<HTMLDivElement>(null);
  const scriptsReady = useCdnScripts();
  const reduced = usePrefersReducedMotion();
  const scrolled = useScrolledNav();

  useLenis(scriptsReady, reduced);
  useMotionSystem(scriptsReady, reduced, rootRef);
  
  const activeNav = useGlobalInteractions(reduced);
  const [dotStyle, setDotStyle] = useState({ left: 0, width: 0, opacity: 0 });

  useEffect(() => {
    if (!activeNav) {
      setDotStyle(prev => ({ ...prev, opacity: 0 }));
      return;
    }
    const nav = document.querySelector('nav.fn-nav') as HTMLElement;
    const link = document.querySelector(`a.landing-nav-link[href="#${activeNav}"]`) as HTMLElement;
    if (link && nav) {
      const linkRect = link.getBoundingClientRect();
      const navRect = nav.getBoundingClientRect();
      setDotStyle({
        left: linkRect.left - navRect.left + linkRect.width / 2 - 3,
        width: 6,
        opacity: 1
      });
    } else {
      setDotStyle(prev => ({ ...prev, opacity: 0 }));
    }
  }, [activeNav]);

  useEffect(() => {
    // 1. Quote Progress Ruler
    const fill = document.querySelector('.quote-progress-fill') as HTMLElement;
    const updateProgress = () => {
      if (!fill) return;
      const scrollTop = window.scrollY;
      const docHeight = document.body.scrollHeight - window.innerHeight;
      const progress = Math.min((scrollTop / docHeight) * 100, 100);
      fill.style.height = progress + '%';
    };
    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();

    // 2. Fall Words Logic
    const pile = document.getElementById('fall-word-pile');
    const words = document.querySelectorAll<HTMLElement>('[data-fall-word]');
    
    let triggered = false;
    let clones: { clone: HTMLElement; original: HTMLElement; index: number }[] = [];

    const fallScrollHandler = () => {
      if (triggered) return;
      const scrollPercent = window.scrollY / (document.body.scrollHeight - window.innerHeight);
      
      if (scrollPercent >= 0.7) {
        triggered = true;
        clones.forEach(({ clone, index }) => {
          setTimeout(() => {
            clone.style.transition = 'none';
            clone.style.top = '-50px';
            clone.style.opacity = '0';
            
            // Force reflow
            clone.offsetHeight;
            
            clone.style.transition = 'all 1.2s cubic-bezier(0.16, 1, 0.3, 1)';
            clone.style.top = clone.dataset.targetY || '0px'; 
            clone.style.opacity = '0.5';
          }, index * 80);
        });
      }
    };

    if (pile && words.length > 0 && !reduced) {
      words.forEach((word, index) => {
        const clone = document.createElement('span');
        clone.textContent = word.textContent;
        clone.className = 'fallen-word';
        
        const randomX = Math.random() * 90;
        const randomRotate = (Math.random() * 30) - 15;
        const randomY = Math.random() * 160;
        
        clone.style.left = randomX + '%';
        clone.style.top = randomY + 'px';
        clone.style.transform = `rotate(${randomRotate}deg)`;
        clone.style.opacity = '0';
        clone.dataset.targetY = randomY + 'px'; // store for animation target
        
        pile.appendChild(clone);
        clones.push({ clone, original: word, index });
      });
      
      window.addEventListener('scroll', fallScrollHandler, { passive: true });
    }

    return () => {
      window.removeEventListener('scroll', updateProgress);
      if (pile && !reduced) {
        window.removeEventListener('scroll', fallScrollHandler);
      }
    };
  }, [reduced]);

  /* ─── Proximity parallax handler for hero headline chars ─── */
  const heroRafRef = useRef(0);
  const handleHeroMouseMove = useCallback((e: React.MouseEvent) => {
    cancelAnimationFrame(heroRafRef.current);
    const cx = e.clientX;
    const cy = e.clientY;
    heroRafRef.current = requestAnimationFrame(() => {
      const chars = rootRef.current?.querySelectorAll<HTMLElement>(".fn-hero-char");
      if (!chars) return;
      const THRESHOLD = 150;
      const MAX_OFFSET = 2;
      chars.forEach((ch) => {
        const rect = ch.getBoundingClientRect();
        const chCx = rect.left + rect.width / 2;
        const chCy = rect.top + rect.height / 2;
        const dist = Math.hypot(cx - chCx, cy - chCy);
        if (dist < THRESHOLD) {
          const ratio = 1 - dist / THRESHOLD;
          const dx = (cx - chCx) / dist || 0;
          const dy = (cy - chCy) / dist || 0;
          ch.style.transform = `translate3d(${dx * MAX_OFFSET * ratio}px, ${dy * MAX_OFFSET * ratio}px, 0)`;
        } else {
          ch.style.transform = "translate3d(0,0,0)";
        }
      });
    });
  }, []);

  const handleHeroMouseLeave = useCallback(() => {
    cancelAnimationFrame(heroRafRef.current);
    rootRef.current?.querySelectorAll<HTMLElement>(".fn-hero-char").forEach((ch) => {
      ch.style.transform = "translate3d(0,0,0)";
    });
  }, []);

  return (
    <div ref={rootRef} className="field-notes-page min-h-screen bg-[var(--c-bg)] text-[var(--c-text)]">
      <CustomCursor enabled={!reduced} />
      {/* ENHANCED: Global Micro-Interactions | Edit text in content.ts */}
      <div className="stillness-overlay" aria-hidden="true" />

      <header className={`field-nav fixed left-0 top-0 z-50 w-full ${scrolled ? "is-scrolled" : ""}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link to="/welcome" className="flex items-baseline gap-2">
            <span className="font-display text-[22px] text-[var(--c-text)]">Field Notes</span>
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--c-text-muted)] sm:inline">
              Vol. 01
            </span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex relative fn-nav" aria-label="Landing page">
            {Object.entries(PAGE_TEXT.nav).map(([key, label]) => (
              <a key={key} href={`#${key}`} className="landing-nav-link relative text-[14px] text-[var(--c-text-muted)] py-1">
                {label}
              </a>
            ))}
            <div 
              className="fn-nav-dot absolute bottom-0 h-[6px] w-[6px] rounded-full bg-[var(--c-accent)] transition-all duration-300" 
              aria-hidden="true" 
              style={{ transform: `translateX(${dotStyle.left}px)`, opacity: dotStyle.opacity, width: `${dotStyle.width}px` }} 
            />
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link to="/auth" className="fn-nav-action">
              Sign in
            </Link>
            <a href="/auth?mode=signup" className="fn-nav-action is-primary relative overflow-hidden group">
              <span className="relative z-10">Open an account</span>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--c-accent)_0%,transparent_0%)] opacity-0 group-hover:opacity-100 group-hover:bg-[radial-gradient(circle_at_center,var(--c-accent)_100%,transparent_100%)] transition-all duration-500 transform scale-0 group-hover:scale-[2]" />
            </a>
          </div>
        </div>
      </header>

      <main>
        {/* ─── HERO ─────────────────────────────────────── */}
        <section
          className="dim-target field-hero border-b border-[var(--c-border)]"
          onMouseMove={reduced ? undefined : handleHeroMouseMove}
          onMouseLeave={reduced ? undefined : handleHeroMouseLeave}
        >
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-14 px-6 pb-20 pt-28 md:grid-cols-[minmax(0,1fr)_430px] md:gap-20 md:pb-28 md:pt-36">
            <div className="hero-copy">
              {/* ENHANCED: The Living Issue | Edit text in content.ts */}
              <p className="mb-6 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--c-text-muted)]">
                {PAGE_TEXT.issueLabel} <IssueCounter /> - Quality, Slowly
              </p>

              {/* ENHANCED: Hero Typewriter | Edit text in content.ts */}
              <HeroHeadline reduced={reduced} />

              {/* ENHANCED: The Stillness Reward | Edit text in content.ts */}
              <p className="hero-subtext mt-8 max-w-[460px] text-[16px] leading-[1.75] text-[var(--c-text-muted)]" data-stillness="true">
                {PAGE_TEXT.stillnessQuotes[0]}
                <br /><br />
                Bring your specs. Draft your cases. Run them when you're ready - not before.
              </p>

              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <a
                  href="/auth?mode=signup"
                  data-magnetic
                  className="hero-cta fn-button fn-hover-target bg-[var(--c-text)] text-[var(--c-bg)]"
                >
                  Start a workspace
                </a>
                <Link
                  to="/auth"
                  data-magnetic
                  className="hero-cta fn-button fn-hover-target border border-[var(--c-border-strong)] bg-transparent text-[var(--c-text)]"
                >
                  Open an account
                </Link>
              </div>

              <div className="mt-14 h-px w-full bg-[var(--c-border)] fn-hr-draw" />

              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--c-text-dim)]">
                <span>10k+ test cases generated</span>
                <span>Playwright native</span>
                <span>No seat fees</span>
              </div>
            </div>

            <aside className="hero-quote-card rounded-[8px] border border-[var(--c-border)] bg-[var(--c-bg-card)] p-7 shadow-[var(--shadow-md)] md:sticky md:top-28 quote-card relative border-l-0">
              {/* ENHANCED: Scroll Printed Footer & Quote Ruler | Edit text in content.ts */}
              <div className="quote-progress-border">
                <div className="quote-progress-fill"></div>
              </div>
              <p className="mb-4 font-mono text-[9px] uppercase tracking-[0.22em] text-[var(--c-text-dim)]">
                From the colophon
              </p>
              <div className="quote-content pl-5">
                <p className="font-display text-[17px] italic leading-[1.65] text-[var(--c-text)]">
                  {PAGE_TEXT.quote.body}
                </p>
                <p className="mt-3 text-[12px] text-[var(--c-text-muted)]">
                  {PAGE_TEXT.quote.attribution}
                </p>
              </div>

              <div className="my-7 h-px bg-[var(--c-border)] fn-hr-draw" />

              {/* ENHANCED: Feature Cards Grid | Edit text in content.ts */}
              <div className="grid grid-cols-2 gap-3">
                <FeatureCard n="01" featureKey="workspace" reduced={reduced} />
                <FeatureCard n="02" featureKey="format" reduced={reduced} />
                <FeatureCard n="03" featureKey="pace" reduced={reduced} />
                <FeatureCard n="04" featureKey="cost" reduced={reduced} />
              </div>
            </aside>
          </div>
        </section>

        {/* ENHANCED: Practice Gestures | Edit text in content.ts */}
        <EditorialSection id="practice" note="&rarr; see also: drafting notes">
          <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
            <div className="dim-target">
              {/* ENHANCED: Section Labels morphing | Edit text in content.ts */}
              <SectionMarker label={PAGE_TEXT.nav.practice} />
              <h2 className="section-heading max-w-[760px] font-display text-4xl leading-[1.04] md:text-6xl">
                Three things we do, deliberately.
              </h2>
            </div>

            <PracticeGestures reduced={reduced} />
          </div>
        </EditorialSection>
        {/* END EDITABLE */}

        <EditorialSection id="pricing" note="&para; two tiers. that's it." subtle>
          <div className="dim-target mx-auto grid max-w-7xl gap-10 px-6 py-24 md:grid-cols-3 md:py-32">
            <div>
              <SectionMarker label="Subscription" />
              <h2 className="section-heading font-display text-4xl leading-[1.04] md:text-5xl">
                A subscription, like a periodical.
              </h2>
              <p className="mt-5 max-w-[300px] text-[var(--c-text-muted)]">Two tiers. Cancel any month.</p>
            </div>

            <PlanCard
              name="Reader"
              price="$0"
              note="Free, forever"
              items={["One workspace", "Up to 50 test cases", "Manual runs only", "Community help"]}
            />
            <PlanCard
              name="Subscriber"
              price="$24"
              note="per workspace / month"
              items={["Unlimited test cases", "CI/CD connectors", "Scheduled runs", "Priority support"]}
              featured
              countPrice
            />
          </div>
        </EditorialSection>

        <EditorialSection id="colophon" note="cf. print tradition, 1455">
          <div className="dim-target mx-auto grid max-w-7xl gap-12 px-6 py-24 md:grid-cols-12 md:py-32">
            <div className="md:col-span-4">
              <SectionMarker label={PAGE_TEXT.nav.colophon} />
              <h2 className="section-heading font-display text-4xl leading-[1.04] md:text-5xl">
                About the publication.
              </h2>
            </div>

            <div className="space-y-5 text-base leading-relaxed text-[var(--c-text-muted)] md:col-span-7 md:col-start-6">
              <p>
                Field Notes is published by a small studio of QA engineers and one designer who
                used to lay out a print magazine. We started this after one too many tools tried
                to sell us a co-pilot.
              </p>
              <p data-stillness="true">
                {PAGE_TEXT.stillnessQuotes[1]} Charts only when they help. Numbers only when they
                exist. Empty states that say so <span className="fall-word" data-fall-word>plainly</span>.
              </p>
              <p className="font-display italic">Set in Instrument Serif &amp; Inter. Printed on the web.</p>
            </div>
          </div>
        </EditorialSection>

        {/* FALL WORD CONTAINER — sits above footer, catches fallen words */}
        <div id="fall-word-pile" aria-hidden="true"></div>
      </main>

      <footer id="contact" className="dim-target bg-[#1A1714] text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 md:grid-cols-4">
          <div className="md:col-span-2">
            <p className="font-display text-3xl">Field Notes</p>
            <p className="mt-2 text-sm text-[rgba(255,255,255,0.6)]">
              A test-case workspace, in plain language.
            </p>
          </div>
          <FooterCol title="Pages" links={[["Practice", "#practice"], ["Pricing", "#pricing"], ["Colophon", "#colophon"]]} />
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-[rgba(255,255,255,0.4)] mb-4">Office</p>
            <ul className="space-y-3 text-sm text-[rgba(255,255,255,0.6)]">
              <li><a href="mailto:hello@fieldnotes.qa" className="hover:text-white transition-colors">hello@fieldnotes.qa</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Brooklyn, NY</a></li>
              <li>
                <a href="#" className="flex items-center gap-2 group fn-rss-link w-max hover:text-white transition-colors">
                  <svg className="w-4 h-4 stroke-[rgba(255,255,255,0.6)] group-hover:stroke-[var(--c-accent)] transition-colors overflow-visible" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 11a9 9 0 0 1 9 9" className="fn-rss-draw opacity-0 group-hover:opacity-100 transition-opacity" style={{ strokeDasharray: 20, strokeDashoffset: 20 }} />
                    <path d="M4 4a16 16 0 0 1 16 16" className="fn-rss-draw opacity-0 group-hover:opacity-100 transition-opacity" style={{ strokeDasharray: 30, strokeDashoffset: 30 }} />
                    <circle cx="5" cy="19" r="1" className="fill-[rgba(255,255,255,0.6)] group-hover:fill-[var(--c-accent)] transition-colors stroke-none" />
                  </svg>
                  RSS
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-[rgba(255,255,255,0.1)] fn-hr-draw">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 text-xs text-[rgba(255,255,255,0.6)]">
            <span>&copy; {new Date().getFullYear()} Field Notes Press</span>
            <span className="font-mono">ISSN 2998-0142</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   HeroHeadline — "The Living Typewriter"
   ─────────────────────────────────────────────────────────
   Reads from PAGE_TEXT.heroHeadline so text is editable in
   one place. Splits into <span class="fn-hero-char"> for
   proximity parallax. Accent word gets ink-underline.
   Final period pulses like a living cursor.
   ═══════════════════════════════════════════════════════════ */
function HeroHeadline({ reduced }: { reduced: boolean }) {
  const text = PAGE_TEXT.heroHeadline;
  const accent = PAGE_TEXT.heroAccentWord;

  /*
   * Split strategy:
   * 1. Find the accent word boundary in the full string
   * 2. Split into segments: before-accent, accent, after-accent
   * 3. For each segment, split by \n to preserve hard breaks
   * 4. For each line, split by spaces to group words in `nowrap` spans
   * 5. The final "." gets a pulsing class
   */

  const accentIdx = text.indexOf(accent);
  const hasAccent = accentIdx !== -1;

  const before = hasAccent ? text.slice(0, accentIdx) : text;
  const after = hasAccent ? text.slice(accentIdx + accent.length) : "";

  /** Renders text handling \n, words, spaces, and the pulsing period */
  const renderText = (str: string, keyPrefix: string, isPeriodEnd: boolean) => {
    const lines = str.split("\n");
    return lines.map((line, lIdx) => {
      const isLastLine = lIdx === lines.length - 1;
      const tokens = line.split(/(\s+)/);
      let charIndex = 0;

      const lineContent = tokens.map((token, tIdx) => {
        if (!token) return null;
        // Space token
        if (/^\s+$/.test(token)) {
          return (
            <span key={`${keyPrefix}-l${lIdx}-s${tIdx}`} className="fn-hero-char fn-hero-space" style={{ display: "inline-block" }} aria-hidden="true">
              {"\u00A0".repeat(token.length)}
            </span>
          );
        }
        // Word token
        const wTrimmed = token.toLowerCase().replace(/[^a-z]/g, '');
        const isFallWord = PAGE_TEXT.fallWords.includes(wTrimmed);
        
        return (
          <span 
            key={`${keyPrefix}-l${lIdx}-w${tIdx}`} 
            style={{ whiteSpace: "nowrap" }}
            className={isFallWord ? "fall-word" : ""}
            data-fall-word={isFallWord ? "true" : undefined}
          >
            {token.split("").map((ch, i) => {
              const isLastCharInToken = i === token.length - 1;
              const isLastToken = tIdx === tokens.length - 1 || (tIdx === tokens.length - 2 && /^\s+$/.test(tokens[tokens.length - 1]));
              const isPulse = isPeriodEnd && isLastLine && isLastToken && isLastCharInToken && ch === ".";

              return (
                <span
                  key={`${keyPrefix}-c-${charIndex++}`}
                  className={`fn-hero-char${isPulse ? " fn-hero-pulse" : ""}`}
                  style={{
                    display: "inline-block",
                    willChange: reduced ? "auto" : "transform",
                    transition: reduced ? "none" : "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                  aria-hidden="true"
                >
                  {ch}
                </span>
              );
            })}
          </span>
        );
      });

      return (
        <span key={`${keyPrefix}-line-${lIdx}`}>
          {lineContent}
          {!isLastLine && <br />}
        </span>
      );
    });
  };

  /** Accent word chars inside the underline container */
  const accentChars = accent.split("").map((ch, i) => (
    <span
      key={`acc-${i}`}
      className="fn-hero-char"
      style={{
        display: "inline-block",
        willChange: reduced ? "auto" : "transform",
        transition: reduced ? "none" : "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
      aria-hidden="true"
    >
      {ch}
    </span>
  ));

  return (
    <h1
      className="hero-headline font-display text-[54px] leading-[0.94] text-[var(--c-text)] sm:text-[72px] lg:text-[104px]"
      aria-label={text.replace(/\n/g, " ")}
    >
      {/* Before accent */}
      {renderText(before, "pre", false)}

      {/* Accent word with ink-underline */}
      {hasAccent && (
        <span className="fn-hero-accent-wrap italic text-[var(--c-accent)]">
          {accentChars}
          <span className="fn-ink-underline" aria-hidden="true" />
        </span>
      )}

      {/* After accent */}
      {renderText(after, "post", true)}
    </h1>
  );
}

/* ═══════════════════════════════════════════════════════════
   Practice Gestures
   ─────────────────────────────────────────────────────────
   The Three Gestures interactive component.
   ═══════════════════════════════════════════════════════════ */
function PracticeGestures({ reduced }: { reduced: boolean }) {
  const [runState, setRunState] = useState<"idle" | "running" | "complete">("idle");
  const sectionRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for Roman Numeral draw-in
  useEffect(() => {
    if (reduced || !sectionRef.current) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    const cards = sectionRef.current.querySelectorAll(".practice-card");
    cards.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, [reduced]);

  const handleRunClick = () => {
    if (runState === "idle" || runState === "complete") {
      setRunState("running");
      if (reduced) {
        setRunState("complete");
      } else {
        setTimeout(() => setRunState("complete"), 1500);
      }
    }
  };

  const pt = PAGE_TEXT.practice;

  return (
    <div ref={sectionRef} className="mt-14 grid gap-8 md:grid-cols-3">
      {/* COLUMN i: Drafting */}
      <article className="practice-card col-drafting border-t border-[var(--c-border)] pt-7" style={{ transitionDelay: reduced ? "0s" : "0s" }}>
        <p className="font-display text-4xl italic text-[var(--c-accent)]">
          <span className="fn-numeral-reveal">i.</span>
        </p>
        <h3 className="mt-4 font-display text-3xl">{pt.drafting.title}</h3>
        <p className="mt-4 text-sm leading-relaxed text-[var(--c-text-muted)]">{renderWithFallWords(pt.drafting.description)}</p>

        <div className="fn-drafting-wrap mt-4">
          <div className="fn-drafting-inner">
            <textarea
              className="fn-drafting-textarea"
              placeholder={pt.drafting.placeholder}
              aria-label="Draft cases"
            ></textarea>
          </div>
        </div>
      </article>

      {/* COLUMN ii: Running */}
      <article
        className={`practice-card col-running border-t border-[var(--c-border)] pt-7 is-${runState}`}
        onClick={handleRunClick}
        style={{ transitionDelay: reduced ? "0s" : "0.2s" }}
      >
        <div className="fn-run-progress" />
        <p className="font-display text-4xl italic text-[var(--c-accent)]">
          <span className="fn-numeral-reveal">ii.</span>
        </p>
        <h3 className="mt-4 font-display text-3xl flex justify-between items-center">
          {pt.running.title}
          <span className="text-sm font-mono text-[var(--c-accent)] uppercase tracking-wider">
            {runState === "idle" ? pt.running.idle : runState === "running" ? pt.running.running : pt.running.complete}
          </span>
        </h3>
        <p className="mt-4 text-sm leading-relaxed text-[var(--c-text-muted)]">{renderWithFallWords(pt.running.description)}</p>

        {runState === "complete" && (
          <div className="mt-6 flex justify-end">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--c-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="fn-run-check">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
        )}
      </article>

      {/* COLUMN iii: Reading */}
      <article className="practice-card col-reading border-t border-[var(--c-border)] pt-7" style={{ transitionDelay: reduced ? "0s" : "0.4s" }}>
        <p className="font-display text-4xl italic text-[var(--c-accent)]">
          <span className="fn-numeral-reveal">iii.</span>
        </p>
        <h3 className="mt-4 font-display text-3xl">{pt.reading.title}</h3>
        <p className="mt-4 text-sm leading-relaxed text-[var(--c-text-muted)]">{renderWithFallWords(pt.reading.description)}</p>
      </article>
    </div>
  );
}

function EditorialSection({
  id,
  note,
  subtle,
  children,
}: {
  id: string;
  note: string;
  subtle?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={`editorial-section relative border-b border-[var(--c-border)] ${subtle ? "bg-[var(--c-bg-hover)]" : ""}`}>
      <span className="editorial-note" dangerouslySetInnerHTML={{ __html: note }} />
      {children}
    </section>
  );
}

function PlanCard({
  name,
  price,
  note,
  items,
  featured,
  countPrice,
}: {
  name: string;
  price: string;
  note: string;
  items: string[];
  featured?: boolean;
  countPrice?: boolean;
}) {
  return (
    <article
      data-tilt
      className={`pricing-card fn-hover-target flex flex-col rounded-[8px] border p-7 shadow-[var(--shadow-sm)] ${featured
          ? "border-[var(--c-text)] bg-[var(--c-text)] text-[var(--c-bg)]"
          : "border-[var(--c-border)] bg-[var(--c-bg-card)] text-[var(--c-text)]"
        }`}
    >
      <p className="label-eyebrow !text-inherit opacity-70">{name}</p>
      <p className="mt-5 font-display text-6xl" data-count-price={countPrice ? "24" : undefined}>
        {price}
      </p>
      <p className="mt-1 text-xs opacity-70">{note}</p>
      <ul className="mt-7 space-y-3 text-sm">
        {items.map((item) => (
          <li key={item} className="flex gap-3">
            <span className="mt-[7px] h-[4px] w-[4px] shrink-0 bg-[var(--c-accent)]" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <a
        href="/auth"
        className={`mt-8 rounded-[4px] py-3 text-center text-sm transition-colors ${featured
            ? "bg-[var(--c-accent)] text-[var(--c-bg)] hover:bg-[#A34413]"
            : "border border-[var(--c-text)] hover:bg-[var(--c-text)] hover:text-[var(--c-bg)]"
          }`}
      >
        Subscribe
      </a>
    </article>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <p className="label-eyebrow mb-3 text-[rgba(255,255,255,0.6)]">{title}</p>
      <ul className="space-y-2 text-sm">
        {links.map(([label, href]) => (
          <li key={label}>
            <a href={href} className="inline-block text-[rgba(255,255,255,0.6)] transition-colors hover:text-white">
              {label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
