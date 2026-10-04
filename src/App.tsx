import { Component, Suspense, lazy, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Boot from "./components/Boot";
import FocusCard from "./components/FocusCard";
import Hud from "./components/Hud";
import Panel from "./components/Panel";
import Toast from "./components/Toast";
import RoomFallback from "./scenes/RoomFallback";
import type { Pick } from "./scenes/Room";
import type { FocusId } from "./scenes/focus";
import Exams from "./sections/Exams";
import Projects from "./sections/Projects";
import ThesisSection from "./sections/Thesis";
import Credits from "./sections/Credits";
import EasterEggs from "./sections/EasterEggs";
import { easterEggs } from "./data/easterEggs";
import { PORTAL_AT } from "./data/puzzle";
import { graduationConfig } from "./config";
import { useFoundEggs, useGuest, usePersistentFlag, usePrefersReducedMotion, useWebGLSupport } from "./hooks";
import type { SectionId } from "./types";

const Room = lazy(() => import("./scenes/Room"));
/** How long the scene spends being pulled in, and landing. Matches global.css. */
const WARP_IN = 900;
const WARP_OUT = 700;

/** The funnel drawn over everything while the two rooms change places. */
function Warp({ phase }: { phase: "in" | "out" }) {
  return (
    <div className={`warp warp--${phase}`} aria-hidden="true">
      <span className="warp__swirl" />
    </div>
  );
}

/** Only ever loaded by someone who found the way through. */
const Puzzle = lazy(() => import("./scenes/Puzzle"));


const SECTIONS: Record<SectionId, { title: string; eyebrow: string }> = {
  exams: { title: "Esami", eyebrow: "la libreria" },
  projects: { title: "Progetti", eyebrow: "la scrivania" },
  thesis: { title: "Tesi", eyebrow: "il piedistallo" },
  terminal: { title: "Easter eggs", eyebrow: "shell nascosta" },
  credits: { title: "Grazie", eyebrow: "la porta" },
};

/** If the 3D chunk fails to load or the scene throws, show the 2D room. */
class SceneBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export default function App() {
  const reduced = usePrefersReducedMotion();
  const webgl = useWebGLSupport();
  const guest = useGuest();
  const { found, discover } = useFoundEggs();
  const [booted, setBooted] = usePersistentFlag("bomboniera.booted");

  const [started, setStarted] = useState(false);
  const [active, setActive] = useState<SectionId | null>(null);
  /** Item picked inside a close-up: a book, a project row, a thesis step. */
  const [item, setItem] = useState<string | null>(null);
  /** The full section panel, opened on top of a close-up. */
  const [reading, setReading] = useState(false);
  const [toast, setToast] = useState<{ title: string; message: string } | null>(null);
  /** The door asks before it opens: the roll is the ending, not a detour. */
  const [ask, setAsk] = useState(false);
  const [viewKey, setViewKey] = useState(0);
  /** Taps landed on the can since the page loaded. Resets once it pays off. */
  const [charge, setCharge] = useState(0);
  /**
   * Deliberately not persisted: the way through has to be earned again every
   * visit, or the room opens itself and the secret stops being one.
   */
  const [portal, setPortal] = useState(false);
  /** Standing on the other side: the room is not rendered at all. */
  const [beyond, setBeyond] = useState(false);
  /** Which half of the jump is playing, if any. */
  const [warp, setWarp] = useState<"in" | "out" | null>(null);
  const jumpTimers = useRef<number[]>([]);

  /**
   * Sections with a 3D close-up fly the camera instead of opening a panel.
   * The terminal, and anything without WebGL, still uses the panel.
   */
  const focus: FocusId | null =
    webgl && active !== null && active !== "terminal" ? active : null;
  const panelOpen = active !== null && (reading || focus === null);

  const openSection = useCallback((id: SectionId) => {
    setActive(id);
    setItem(null);
    setReading(false);
  }, []);

  const exitFocus = useCallback(() => {
    setActive(null);
    setItem(null);
    setReading(false);
  }, []);

  /**
   * Changing rooms. The swap happens while the funnel is at its darkest, so
   * neither scene is ever seen popping in. Reduced motion skips straight
   * across — a spinning, blurring screen is exactly what it asks not to see.
   */
  const jump = useCallback(
    (to: boolean) => {
      // the scene is still tappable while it spins away: one jump per jump
      if (warp) return;
      if (reduced) {
        setBeyond(to);
        return;
      }
      setWarp("in");
      jumpTimers.current.push(
        window.setTimeout(() => {
          setBeyond(to);
          setWarp("out");
        }, WARP_IN),
        window.setTimeout(() => setWarp(null), WARP_IN + WARP_OUT),
      );
    },
    [reduced, warp],
  );

  useEffect(() => {
    const timers = jumpTimers.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  const onPick = useCallback(
    (pick: Pick) => {
      if (pick.kind === "portal") {
        jump(true);
        return;
      }
      if (pick.kind === "section") {
        if (pick.id === "credits") setAsk(true);
        else setActive(pick.id);
        return;
      }
      const egg = easterEggs.find((e) => e.id === pick.id);
      if (egg) {
        discover(egg.id);
        setToast({ title: egg.label, message: egg.reveal });
      }
      if (pick.id === "terminal") window.setTimeout(() => setActive("terminal"), 700);

      /* the can is the one object that counts how often it is hit: the room
         shakes it harder each time, and the tenth tap opens the way */
      if (pick.id === "monster" && !portal) {
        const hits = charge + 1;
        setCharge(hits === PORTAL_AT ? 0 : hits);
        if (hits === PORTAL_AT) {
          setPortal(true);
          setToast({
            title: "Qualcosa si è aperto",
            message: "Un anello di luce è comparso nella stanza. Toccalo.",
          });
        } else if (hits >= 4) {
          setToast({
            title: "La lattina trema",
            message: `Sta per succedere qualcosa. Ancora ${PORTAL_AT - hits}.`,
          });
        }
      }
    },
    [discover, charge, portal, setPortal, jump],
  );

  const start = () => {
    setBooted(true);
    setStarted(true);
  };

  /** Closing the panel steps back to the close-up if there is one. */
  const close = useCallback(() => {
    if (focus && reading) setReading(false);
    else exitFocus();
  }, [focus, reading, exitFocus]);

  // Escape leaves a close-up; while the panel is open it handles its own.
  useEffect(() => {
    if (!focus || panelOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (item) setItem(null);
      else exitFocus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focus, panelOpen, item, exitFocus]);

  const fallbackRoom = <RoomFallback onPick={onPick} />;

  if (beyond) {
    return (
      <>
        <div className={warp === "in" ? "is-warping" : undefined}>
          <Suspense fallback={<div className="stage-loading"><span className="spinner" />APERTURA</div>}>
            <Puzzle reduced={reduced} onExit={() => jump(false)} />
          </Suspense>
        </div>
        {warp && <Warp phase={warp} />}
      </>
    );
  }

  return (
    <>
      <a className="skip-link" href="#dock">
        Vai alla navigazione
      </a>

      <div className={warp === "in" ? "is-warping" : undefined}>
        {webgl ? (
          <SceneBoundary fallback={fallbackRoom}>
            <Suspense
              fallback={
                <div className="stage-loading">
                  <span className="spinner" />
                  CARICAMENTO STANZA
                </div>
              }
            >
                <Room
                key={viewKey}
                portal={portal}
                charge={charge}
                reduced={reduced}
                focus={focus}
                picked={item}
                onPick={onPick}
                onPickItem={setItem}
              />
            </Suspense>
          </SceneBoundary>
        ) : (
          fallbackRoom
        )}
      </div>

      {warp && <Warp phase={warp} />}

      <Hud
        active={active}
        focus={focus}
        foundCount={found.length}
        guestLabel={guest?.label}
        onOpen={openSection}
        onExitFocus={exitFocus}
        onOpenList={() => setReading(true)}
        onResetView={() => {
          exitFocus();
          setViewKey((k) => k + 1);
        }}
      />

      {focus && !panelOpen && (
        <FocusCard
          section={focus}
          id={item}
          onClose={() => setItem(null)}
          onMore={() => setReading(true)}
        />
      )}

      {graduationConfig.isPlaceholder && (
        <p className="ribbon">contenuti dimostrativi — da sostituire</p>
      )}

      {ask && (
        <dialog
          className="ask"
          ref={(el) => {
            if (el && !el.open) el.showModal();
          }}
          onClose={() => setAsk(false)}
        >
          <p className="ask__eyebrow">la porta</p>
          <h2>Vuoi vedere i ringraziamenti finali?</h2>
          <p className="ask__body">
            Ti porto fuori dalla stanza, davanti allo schermo con i nomi.
          </p>
          <div className="ask__row">
            <button
              className="ask__yes"
              onClick={() => {
                setAsk(false);
                openSection("credits");
              }}
            >
              Sì, andiamo
            </button>
            <button className="ghost-btn" onClick={() => setAsk(false)}>
              Non ora
            </button>
          </div>
        </dialog>
      )}

      {toast && <Toast title={toast.title} message={toast.message} onDismiss={() => setToast(null)} />}

      {active && panelOpen && (
        <Panel title={SECTIONS[active].title} eyebrow={SECTIONS[active].eyebrow} onClose={close}>
          {active === "exams" && <Exams />}
          {active === "projects" && <Projects />}
          {active === "thesis" && <ThesisSection />}
          {active === "credits" && <Credits />}
          {active === "terminal" && (
            <EasterEggs found={found} onOpenSection={openSection} onClose={close} />
          )}
        </Panel>
      )}

      {!started && <Boot seen={booted} guestMessage={guest?.message} onStart={start} />}

      <div className="rotate-hint">
        <span>
          Ruota il telefono in verticale
          <br />
          per esplorare la stanza.
        </span>
      </div>
    </>
  );
}
