import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  useCallback,
  type MouseEvent,
} from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Terminal as TerminalIcon,
  Play,
  ArrowRight,
  Code2,
  Cpu,
  Menu,
  X,
} from "lucide-react";
import {
  CURATED_C_SNIPPETS,
  COMPILATION_STAGES,
  FEATURE_SPECS,
  getSnippetById,
  getStageById,
  calculateTiltTransform,
  type FeatureSpec,
} from "../utils/landingLogic";
import "../styles/landing.css";

gsap.registerPlugin(ScrollTrigger);

const CompilerCoreScene = lazy(() => import("./CompilerCoreScene"));

interface LandingPageProps {
  onStartCoding: (initialCode?: string) => void;
}

function TiltFeatureCard({
  feature,
  onSelectCode,
}: {
  feature: FeatureSpec;
  onSelectCode: (code: string) => void;
}) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [transformStyle, setTransformStyle] = useState<string>("");
  const [spotlightBg, setSpotlightBg] = useState<string>("");

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = cardRef.current.getBoundingClientRect();
    const { rotateX, rotateY, spotX, spotY } = calculateTiltTransform(
      e.clientX,
      e.clientY,
      rect,
      5
    );
    setTransformStyle(
      `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`
    );
    setSpotlightBg(
      `radial-gradient(420px circle at ${spotX}% ${spotY}%, rgba(56, 189, 248, 0.09), transparent 70%)`
    );
  };

  const handleMouseLeave = () => {
    setTransformStyle("");
    setSpotlightBg("");
  };

  return (
    <article
      ref={cardRef}
      className={`bento-feature-card ${
        feature.span === "wide" ? "span-wide" : ""
      } gsap-bento-card`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: transformStyle || undefined,
        backgroundImage: spotlightBg || undefined,
      }}
    >
      <div>
        <div className="bento-card-kicker">
          <span>{feature.index}.</span> <span>{feature.kicker}</span>
        </div>
        <h3 className="bento-card-title">{feature.title}</h3>
        <p className="bento-card-desc">{feature.description}</p>
      </div>

      <div className="bento-card-footer">
        <pre className="bento-card-code">
          <code>{feature.codeHighlight}</code>
        </pre>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <span className="bento-card-spec">{feature.specLine}</span>
          <button
            type="button"
            className="footer-link"
            style={{ color: "#38bdf8", fontWeight: 600 }}
            onClick={() => onSelectCode(feature.codeHighlight)}
          >
            Try in Compiler →
          </button>
        </div>
      </div>
    </article>
  );
}

export function LandingPage({ onStartCoding }: LandingPageProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [heroScrollProgress, setHeroScrollProgress] = useState(0);
  const [activeStageId, setActiveStageId] = useState<string>(
    COMPILATION_STAGES[0].id
  );
  const [activeSnippetId, setActiveSnippetId] = useState<string>(
    CURATED_C_SNIPPETS[0].id
  );
  const [inspectorTab, setInspectorTab] = useState<"TERMINAL" | "ASSEMBLY">(
    "TERMINAL"
  );
  const [traceLinesVisible, setTraceLinesVisible] = useState<number>(
    CURATED_C_SNIPPETS[0].simulatedOutput.length
  );
  const [isSimulatingTrace, setIsSimulatingTrace] = useState(false);

  const activeStage = getStageById(activeStageId);
  const activeSnippet = getSnippetById(activeSnippetId);
  const activeStageIndex = COMPILATION_STAGES.findIndex(
    (s) => s.id === activeStageId
  );

  // Switch snippet and show full trace immediately
  const handleSelectSnippet = useCallback((id: string) => {
    const snip = getSnippetById(id);
    setActiveSnippetId(id);
    setIsSimulatingTrace(false);
    setTraceLinesVisible(snip.simulatedOutput.length);
  }, []);

  // Step-by-step deterministic trace replay in the landing page sandbox
  const handleReplayTrace = useCallback(() => {
    const total = activeSnippet.simulatedOutput.length;
    setIsSimulatingTrace(true);
    setTraceLinesVisible(1);

    let step = 1;
    const interval = window.setInterval(() => {
      step += 1;
      if (step >= total) {
        setTraceLinesVisible(total);
        setIsSimulatingTrace(false);
        window.clearInterval(interval);
      } else {
        setTraceLinesVisible(step);
      }
    }, 160);
  }, [activeSnippet]);

  // Smooth scroll helper for internal section navigation
  const scrollToSection = useCallback((sectionId: string) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  // Choreographed GSAP ScrollTrigger sequences (respecting prefers-reduced-motion)
  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced || !rootRef.current) return;

    const ctx = gsap.context(() => {
      // 1. Hero entrance & scroll progress link to 3D core
      gsap.fromTo(
        ".gsap-hero-item",
        { opacity: 0.9, y: 14 },
        {
          opacity: 1,
          y: 0,
          duration: 0.45,
          stagger: 0.06,
          ease: "power2.out",
        }
      );

      ScrollTrigger.create({
        trigger: "#hero-section",
        start: "top top",
        end: "bottom top",
        scrub: true,
        onUpdate: (self) => {
          setHeroScrollProgress(Number(self.progress.toFixed(3)));
        },
      });

      // 2. Floating Editor Showcase panels
      gsap.fromTo(
        ".gsap-showcase-card",
        { opacity: 0.88, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.45,
          stagger: 0.08,
          ease: "power2.out",
          scrollTrigger: {
            trigger: "#architecture",
            start: "top 88%",
          },
        }
      );

      // 3. Bento Feature cards stagger
      gsap.fromTo(
        ".gsap-bento-card",
        { opacity: 0.88, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.45,
          stagger: 0.08,
          ease: "power2.out",
          scrollTrigger: {
            trigger: "#capabilities",
            start: "top 88%",
          },
        }
      );
    }, rootRef);

    return () => {
      ctx.revert();
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="landing-root"
      data-testid="prayogcode-landing"
    >
      <div className="landing-grid-backdrop" aria-hidden="true" />
      <div className="landing-ambient-glow" aria-hidden="true" />

      {/* ====================================================================
          TOP BAR CONTRACT (Zone 1: Wordmark | Zone 2: 4 Nav Links | Zone 3: 1 CTA)
          ==================================================================== */}
      <header className="landing-topbar">
        <div className="landing-topbar-inner">
          {/* Zone 1: Single text element wordmark */}
          <a
            href="#hero-section"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection("hero-section");
            }}
            className="topbar-brand-wordmark"
          >
            PrayogCode
          </a>

          {/* Zone 2: 4 single-line navigation links */}
          <nav className="topbar-nav" aria-label="Primary Navigation">
            <a
              href="#architecture"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection("architecture");
              }}
              className="topbar-nav-link"
            >
              Architecture
            </a>
            <a
              href="#pipeline"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection("pipeline");
              }}
              className="topbar-nav-link"
            >
              Pipeline
            </a>
            <a
              href="#capabilities"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection("capabilities");
              }}
              className="topbar-nav-link"
            >
              Capabilities
            </a>
            <a
              href="#workspace"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection("workspace");
              }}
              className="topbar-nav-link"
            >
              Workspace
            </a>
          </nav>

          {/* Zone 3: 1 primary CTA + Mobile Drawer Toggle */}
          <div className="topbar-actions">
            <button
              type="button"
              className="btn-primary-cta"
              onClick={() => onStartCoding()}
            >
              <span>Start Coding</span>
              <ArrowRight size={15} />
            </button>

            <button
              type="button"
              className="mobile-menu-toggle"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-expanded={mobileMenuOpen}
              aria-label={
                mobileMenuOpen ? "Close Navigation Menu" : "Open Navigation Menu"
              }
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <nav className="mobile-nav-drawer" aria-label="Mobile Navigation">
            <a
              href="#architecture"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection("architecture");
              }}
              className="mobile-nav-link"
            >
              Architecture
            </a>
            <a
              href="#pipeline"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection("pipeline");
              }}
              className="mobile-nav-link"
            >
              Pipeline
            </a>
            <a
              href="#capabilities"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection("capabilities");
              }}
              className="mobile-nav-link"
            >
              Capabilities
            </a>
            <a
              href="#workspace"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection("workspace");
              }}
              className="mobile-nav-link"
            >
              Workspace
            </a>
          </nav>
        )}
      </header>

      <main className="landing-main">
        {/* ====================================================================
            1. HERO SECTION
            ==================================================================== */}
        <section id="hero-section" className="hero-section">
          <div className="hero-split-grid">
            {/* Left Column: Copy, CTAs & Live Code/Terminal Preview */}
            <div className="hero-copy-column">
              <div className="hero-unboxed-meta gsap-hero-item">
                <span className="accent-text">C17 Systems Laboratory</span>
                <span aria-hidden="true">·</span>
                <span>GCC 13.2.1</span>
                <span aria-hidden="true">·</span>
                <span>Hardened Alpine 3.20 Sandbox</span>
                <span aria-hidden="true">·</span>
                <span>Interactive PTY</span>
              </div>

              <h1 className="hero-headline gsap-hero-item">
                Your Code.{" "}
                <span className="hero-headline-gradient">Your Playground.</span>
              </h1>

              <p className="hero-supporting-text gsap-hero-item">
                Write standard C in a zero-setup Monaco environment, compile
                with native GCC inside an air-gapped Docker container, and
                interact with live <code>scanf</code> and <code>printf</code>{" "}
                streams over a real pseudo-terminal.
              </p>

              <div className="hero-cta-row gsap-hero-item">
                <button
                  type="button"
                  className="btn-primary-cta btn-hero-lg"
                  onClick={() => onStartCoding()}
                >
                  <span>Start Coding</span>
                  <ArrowRight size={17} />
                </button>

                <button
                  type="button"
                  className="btn-secondary-cta btn-hero-lg"
                  onClick={() => scrollToSection("capabilities")}
                >
                  <span>Explore Features</span>
                </button>
              </div>

              {/* Hero Attractive Code Editor & Terminal Preview */}
              <div className="hero-preview-shell gsap-hero-item">
                <div className="hero-preview-bar">
                  <div>
                    <span style={{ color: "#38bdf8", fontWeight: 600 }}>C</span>{" "}
                    <span>src/main.c</span>
                    <span style={{ margin: "0 8px", opacity: 0.4 }}>·</span>
                    <span>Unbuffered _IONBF Hook</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onStartCoding(CURATED_C_SNIPPETS[0].code)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#38bdf8",
                      fontFamily: "var(--font-mono)",
                      fontSize: "11px",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    Open in Compiler →
                  </button>
                </div>

                <div className="hero-preview-body">
                  <pre className="hero-preview-code">
                    <code>{`#include <stdio.h>

int main(void) {
    int a, b;
    printf("Enter two numbers: ");
    scanf("%d %d", &a, &b);
    printf("Sum = %d\\n", a + b);
    return 0;
}`}</code>
                  </pre>

                  <div className="hero-preview-terminal">
                    <div>
                      <div style={{ color: "#64748b", marginBottom: "4px" }}>
                        $ gcc -O2 -Wall main.c -o main.out
                      </div>
                      <div style={{ color: "#e2e8f0" }}>
                        Enter two numbers:{" "}
                        <span style={{ color: "#38bdf8" }}>42 58</span>
                      </div>
                      <div style={{ color: "#4ade80", fontWeight: 600 }}>
                        Sum = 100
                      </div>
                    </div>
                    <div
                      style={{
                        color: "#64748b",
                        fontSize: "11px",
                        borderTop: "1px solid rgba(148,163,184,0.1)",
                        paddingTop: "6px",
                      }}
                    >
                      Exit Code: 0 · 128MB Cgroup · PTY Ready
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive 3D Centerpiece */}
            <div className="hero-visual-column gsap-hero-item">
              <Suspense
                fallback={
                  <div className="core-scene-wrapper">
                    <div className="core-fallback-diagram">
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "12px",
                          color: "#38bdf8",
                        }}
                      >
                        Initializing 3D Sandbox Core...
                      </span>
                    </div>
                  </div>
                }
              >
                <CompilerCoreScene
                  scrollProgress={heroScrollProgress}
                  activeStageIndex={activeStageIndex}
                />
              </Suspense>
            </div>
          </div>

          {/* Full-width Quantitative Telemetry Strip adjacent to Hero claims */}
          <div
            className="hero-metrics-strip gsap-hero-item"
            aria-label="Sandbox Architecture Specifications"
          >
            <div className="metric-item">
              <span className="metric-value tabular-nums">128 MB</span>
              <span className="metric-label">
                Isolated Cgroup RAM ceiling per container run
              </span>
            </div>
            <div className="metric-item">
              <span className="metric-value tabular-nums">64 PIDs</span>
              <span className="metric-label">
                Strict kernel process cap preventing fork bombs
              </span>
            </div>
            <div className="metric-item">
              <span className="metric-value tabular-nums">0 ms</span>
              <span className="metric-label">
                Stdout buffer lag via pre-injected _IONBF constructor
              </span>
            </div>
            <div className="metric-item">
              <span className="metric-value tabular-nums">GCC 13.2</span>
              <span className="metric-label">
                Direct binary compilation (-O2 -Wall -Wextra -lm)
              </span>
            </div>
          </div>
        </section>

        {/* ====================================================================
            2. EDITOR SHOWCASE (FLOATING ARCHITECTURAL CODE PANELS)
            ==================================================================== */}
        <section id="architecture" className="landing-section">
          <div className="section-header-block">
            <div className="section-kicker-line">
              <span>01</span>
              <span aria-hidden="true">·</span>
              <span>Zero-Friction Systems Architecture</span>
            </div>
            <h2 className="section-heading">
              Engineered for real interactive C execution, not static batch
              forms.
            </h2>
            <p className="section-lead">
              Most online compilers force you to type all standard input into a
              text box before your program even starts. PrayogCode wires Monaco
              directly to a live Linux pseudo-terminal inside an isolated Docker
              container.
            </p>
          </div>

          <div className="showcase-panels-grid">
            <article className="floating-code-card gsap-showcase-card">
              <div>
                <div className="floating-card-meta">
                  Layer 01 · Unbuffered Stdio Hook
                </div>
                <h3 className="floating-card-title">
                  Automatic Prompt Flushing
                </h3>
                <p className="floating-card-desc">
                  Every compilation automatically includes{" "}
                  <code>/etc/prayog/init.h</code>, disabling block buffering on{" "}
                  <code>stdout</code> and <code>stderr</code> before{" "}
                  <code>main()</code> executes so interactive{" "}
                  <code>printf</code> prompts appear immediately before{" "}
                  <code>scanf</code>.
                </p>
              </div>
              <pre className="floating-card-snippet">
                <code>{`__attribute__((constructor))
void __init_unbuffered(void) {
  setvbuf(stdout, NULL, _IONBF, 0);
  setvbuf(stderr, NULL, _IONBF, 0);
}`}</code>
              </pre>
            </article>

            <article className="floating-code-card gsap-showcase-card">
              <div>
                <div className="floating-card-meta">
                  Layer 02 · Hardened Container Runtime
                </div>
                <h3 className="floating-card-title">
                  Air-Gapped Kernel Isolation
                </h3>
                <p className="floating-card-desc">
                  Untrusted binaries execute as unprivileged user{" "}
                  <code>prayog (uid 1000)</code> with all Linux capabilities
                  dropped, network interfaces disabled, and a read-only root
                  filesystem backed by a 64 MB in-memory tmpfs.
                </p>
              </div>
              <pre className="floating-card-snippet">
                <code>{`docker run --rm -i -t \\
  --network none --read-only \\
  --cpus 1 --memory 128m \\
  --pids-limit 64 --cap-drop ALL`}</code>
              </pre>
            </article>

            <article className="floating-code-card gsap-showcase-card">
              <div>
                <div className="floating-card-meta">
                  Layer 03 · Bidirectional PTY Stream
                </div>
                <h3 className="floating-card-title">
                  Full ANSI Terminal Emulation
                </h3>
                <p className="floating-card-desc">
                  Powered by <code>node-pty</code> and <code>xterm.js</code>{" "}
                  with <code>FitAddon</code> and automatic <code>CRLF</code>{" "}
                  normalization. Supports live keystrokes, ANSI colors, and a
                  1 MB output flood circuit breaker.
                </p>
              </div>
              <pre className="floating-card-snippet">
                <code>{`ws.send(JSON.stringify({
  type: "input",
  data: "42 58\\r"
})); // Resets 60s watchdog`}</code>
              </pre>
            </article>
          </div>
        </section>

        {/* ====================================================================
            3. COMPILATION JOURNEY (SOURCE CODE -> COMPILER -> SANDBOX -> PTY)
            ==================================================================== */}
        <section id="pipeline" className="landing-section">
          <div className="section-header-block">
            <div className="section-kicker-line">
              <span>02</span>
              <span aria-hidden="true">·</span>
              <span>End-to-End Compilation Journey</span>
            </div>
            <h2 className="section-heading">
              From C17 source buffer to isolated Linux process in milliseconds.
            </h2>
            <p className="section-lead">
              Inspect every stage of the PrayogCode execution lifecycle. Select
              any stage below to examine the exact CLI invocation, kernel
              boundary, and runtime artifact.
            </p>
          </div>

          <div className="pipeline-layout">
            <div
              className="pipeline-steps-list"
              role="tablist"
              aria-label="Compilation Pipeline Stages"
            >
              {COMPILATION_STAGES.map((stage) => {
                const isSelected = stage.id === activeStage.id;
                return (
                  <button
                    key={stage.id}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    className={`pipeline-step-button ${
                      isSelected ? "active" : ""
                    }`}
                    onClick={() => setActiveStageId(stage.id)}
                  >
                    <div className="pipeline-step-top">
                      <span className="pipeline-step-index">
                        Stage {stage.index}
                      </span>
                      <span className="pipeline-step-sub">{stage.subtitle}</span>
                    </div>
                    <div className="pipeline-step-title">{stage.title}</div>
                    <p className="pipeline-step-desc">{stage.description}</p>
                  </button>
                );
              })}
            </div>

            <div
              className="pipeline-inspector-card"
              role="tabpanel"
              aria-label={`Stage ${activeStage.index} Inspector`}
            >
              <div className="inspector-header">
                <span className="inspector-stage-label">
                  Stage {activeStage.index} · {activeStage.title}
                </span>
                <span className="inspector-boundary-meta">
                  {activeStage.securityBoundary}
                </span>
              </div>

              <div className="inspector-body">
                <div>
                  <div className="inspector-artifact-title">
                    Execution Command / Protocol Frame
                  </div>
                  <div className="inspector-cmd-box">
                    <code>{activeStage.command}</code>
                  </div>
                </div>

                <div className="inspector-artifact-box">
                  <div className="inspector-artifact-title">
                    {activeStage.artifactTitle}
                  </div>
                  <pre className="inspector-artifact-pre">
                    <code>{activeStage.artifactLines.join("\n")}</code>
                  </pre>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingTop: "4px",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "12px",
                      color: "#94a3b8",
                    }}
                  >
                    Verified on Alpine Linux 3.20 · GCC 13.2
                  </span>
                  <button
                    type="button"
                    className="btn-secondary-cta"
                    style={{ height: "34px", padding: "0 14px", fontSize: "12px" }}
                    onClick={() => onStartCoding()}
                  >
                    <span>Launch Live Sandbox</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================================
            4. FEATURE SHOWCASE (BENTO GRID WITH DEPTH, TILT & HOVER FEEDBACK)
            ==================================================================== */}
        <section id="capabilities" className="landing-section">
          <div className="section-header-block">
            <div className="section-kicker-line">
              <span>03</span>
              <span aria-hidden="true">·</span>
              <span>Production-Grade Capabilities</span>
            </div>
            <h2 className="section-heading">
              Purpose-built for systems programming, algorithms, and laboratory
              precision.
            </h2>
            <p className="section-lead">
              Every detail of the workspace is tuned for low-latency feedback,
              predictable resource bounds, and distraction-free focus.
            </p>
          </div>

          <div className="bento-features-grid">
            {FEATURE_SPECS.map((feature) => (
              <TiltFeatureCard
                key={feature.id}
                feature={feature}
                onSelectCode={() => onStartCoding(CURATED_C_SNIPPETS[0].code)}
              />
            ))}
          </div>
        </section>

        {/* ====================================================================
            5. DEVELOPER WORKSPACE DEMONSTRATION (INTERACTIVE ALGORITHM TRACE)
            ==================================================================== */}
        <section id="workspace" className="landing-section">
          <div className="section-header-block">
            <div className="section-kicker-line">
              <span>04</span>
              <span aria-hidden="true">·</span>
              <span>Interactive Algorithm Workbench</span>
            </div>
            <h2 className="section-heading">
              Explore curated C17 programs, assembly output, and execution
              traces.
            </h2>
            <p className="section-lead">
              Switch between pre-configured systems and algorithm benchmarks
              below to inspect their GCC <code>-O2</code> x86_64 assembly and
              expected terminal trace, or open any snippet directly inside the
              full compiler workspace.
            </p>
          </div>

          <div className="workspace-demo-shell">
            <div className="workspace-demo-toolbar">
              <div
                className="snippet-tabs-group"
                role="tablist"
                aria-label="Curated C Snippets"
              >
                {CURATED_C_SNIPPETS.map((snip) => (
                  <button
                    key={snip.id}
                    type="button"
                    role="tab"
                    aria-selected={snip.id === activeSnippet.id}
                    className={`snippet-tab-btn ${
                      snip.id === activeSnippet.id ? "active" : ""
                    }`}
                    onClick={() => handleSelectSnippet(snip.id)}
                  >
                    {snip.title}
                  </button>
                ))}
              </div>

              <div className="workspace-demo-actions">
                <button
                  type="button"
                  className="btn-trace-run"
                  onClick={handleReplayTrace}
                  disabled={isSimulatingTrace}
                >
                  <Play size={13} />
                  <span>
                    {isSimulatingTrace ? "Tracing..." : "Replay Trace"}
                  </span>
                </button>

                <button
                  type="button"
                  className="btn-open-in-compiler"
                  onClick={() => onStartCoding(activeSnippet.code)}
                >
                  <Code2 size={14} />
                  <span>Open in Live Compiler</span>
                </button>
              </div>
            </div>

            <div className="workspace-demo-subbar">
              <div>
                <span style={{ color: "#f8fafc", fontWeight: 600 }}>
                  {activeSnippet.category}
                </span>
                <span style={{ margin: "0 8px" }}>·</span>
                <span>{activeSnippet.complexity}</span>
                <span style={{ margin: "0 8px" }}>·</span>
                <span style={{ color: "#38bdf8" }}>
                  {activeSnippet.compilerFlags}
                </span>
              </div>
              <div className="tabular-nums">
                Compile: {activeSnippet.metrics.compileTimeMs}ms · Exec:{" "}
                {activeSnippet.metrics.execTimeMs}ms · RSS:{" "}
                {activeSnippet.metrics.memoryKb} KB
              </div>
            </div>

            <div className="workspace-demo-grid">
              {/* Left Pane: Source Code with Line Numbers */}
              <div className="demo-source-pane">
                <div className="demo-code-table">
                  {activeSnippet.code.split("\n").map((line, i) => (
                    <div key={i} className="demo-code-line">
                      <span className="demo-line-num tabular-nums">
                        {i + 1}
                      </span>
                      <pre style={{ margin: 0 }}>
                        <code>{line || " "}</code>
                      </pre>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Pane: Terminal Trace & Assembly Switcher */}
              <div className="demo-output-pane">
                <div className="demo-output-header">
                  <div className="demo-mode-tabs">
                    <button
                      type="button"
                      className={`demo-mode-tab ${
                        inspectorTab === "TERMINAL" ? "active" : ""
                      }`}
                      onClick={() => setInspectorTab("TERMINAL")}
                    >
                      <TerminalIcon
                        size={12}
                        style={{ marginRight: "5px", verticalAlign: "middle" }}
                      />
                      <span>Recorded PTY Trace</span>
                    </button>
                    <button
                      type="button"
                      className={`demo-mode-tab ${
                        inspectorTab === "ASSEMBLY" ? "active" : ""
                      }`}
                      onClick={() => setInspectorTab("ASSEMBLY")}
                    >
                      <Cpu
                        size={12}
                        style={{ marginRight: "5px", verticalAlign: "middle" }}
                      />
                      <span>x86_64 Assembly (-O2)</span>
                    </button>
                  </div>

                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "11px",
                      color: "#64748b",
                    }}
                  >
                    Preview Mode
                  </span>
                </div>

                <div className="demo-output-body">
                  {inspectorTab === "TERMINAL" ? (
                    <pre style={{ margin: 0 }}>
                      <code>
                        {activeSnippet.simulatedOutput
                          .slice(0, traceLinesVisible)
                          .join("\n")}
                      </code>
                    </pre>
                  ) : (
                    <pre style={{ margin: 0, color: "#93c5fd" }}>
                      <code>{activeSnippet.assemblyPreview.join("\n")}</code>
                    </pre>
                  )}
                </div>

                <div className="demo-output-footer">
                  <span>{activeSnippet.description}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================================
            6. FINAL CTA SECTION
            ==================================================================== */}
        <section className="landing-section" style={{ paddingTop: "32px" }}>
          <div className="final-cta-card">
            <div className="section-kicker-line" style={{ marginBottom: 0 }}>
              <span>Ready to Compile</span>
              <span aria-hidden="true">·</span>
              <span>No Sign-Up Required</span>
            </div>

            <h2 className="final-cta-title">
              Step into the PrayogCode C Laboratory.
            </h2>

            <p className="final-cta-sub">
              Launch the full split-pane Monaco editor and interactive xterm.js
              terminal connected to the PrayogCode WebSocket compilation engine.
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "14px" }}>
              <button
                type="button"
                className="btn-primary-cta btn-hero-lg"
                onClick={() => onStartCoding()}
              >
                <span>Start Coding Now</span>
                <ArrowRight size={17} />
              </button>

              <button
                type="button"
                className="btn-secondary-cta btn-hero-lg"
                onClick={() => onStartCoding(activeSnippet.code)}
              >
                <span>Load Selected Snippet ({activeSnippet.title})</span>
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* ====================================================================
          QUIET FOOTER
          ==================================================================== */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div>
            <strong style={{ color: "#f8fafc" }}>PrayogCode</strong> · C
            Programming Laboratory · Built with React 19, Monaco, xterm.js &
            Hardened Docker Sandbox
          </div>

          <div className="footer-links">
            <button
              type="button"
              className="footer-link"
              onClick={() => scrollToSection("architecture")}
            >
              Architecture
            </button>
            <button
              type="button"
              className="footer-link"
              onClick={() => scrollToSection("pipeline")}
            >
              Pipeline
            </button>
            <button
              type="button"
              className="footer-link"
              onClick={() => scrollToSection("capabilities")}
            >
              Capabilities
            </button>
            <button
              type="button"
              className="footer-link"
              onClick={() => onStartCoding()}
            >
              Open Compiler
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
