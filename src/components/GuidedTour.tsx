// Guided tour for the FIRST starter mission only (Zach's call, Nov 17-18,
// 2026: "first mission only — tour, then Trevor takes over").
//
// A spotlight overlay: the rest of the screen darkens and blurs, the real
// element to tap is lit through a cutout, and a Trevor bubble says what to
// do. The tour walks the guided-launch flow — deck, card, start, photo,
// submit — then hands over to Trevor's normal guidance (pill + strips) and
// leaves no chrome of its own behind.
//
// How it advances: the step is derived from live flow state (route,
// activeTrip, which capture hook is in the DOM), so a tap that moves the
// flow moves the tour. Two taps need the tour's own click listener, because
// the flow has no state for them: tapping the poster (the player has read
// the brief) and tapping Submit Proof (the tour is done — persist the flag).
// The backdrop swallows taps anywhere else, so the only way forward is the
// highlighted element or Skip the tour — which is always visible.

import React from 'react';
import { useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  GUIDED_TOUR_PHOTO_OPEN,
  GUIDED_TOUR_SKIP_LABEL,
  GUIDED_TOUR_STEP_COUNT,
  deriveGuidedTourStep,
  getGuidedTourStep,
  isGuidedTourEligible,
  resolveGuidedTourTarget,
  type CaptureTourTarget,
} from '../logic/guidedTour';

/** Breathing room around the lit element, in px. */
const CUTOUT_PADDING = 10;

function findCaptureTarget(): CaptureTourTarget {
  if (typeof document === 'undefined') return null;
  if (document.querySelector('[data-tour="submit-proof"]')) return 'submit-proof';
  if (document.querySelector('[data-tour="snap-photo"]')) return 'snap-photo';
  if (document.querySelector('[data-tour="open-camera"]')) return 'open-camera';
  return null;
}

function measureTarget(selector: string | null): DOMRect | null {
  if (!selector || typeof document === 'undefined') return null;
  const el = document.querySelector(selector);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  return rect;
}

function sameRect(a: DOMRect | null, b: DOMRect | null): boolean {
  if (!a || !b) return a === b;
  return (
    Math.round(a.left) === Math.round(b.left) &&
    Math.round(a.top) === Math.round(b.top) &&
    Math.round(a.width) === Math.round(b.width) &&
    Math.round(a.height) === Math.round(b.height)
  );
}

export function GuidedTour() {
  const { user, profile, isAdmin, mustCompleteStarterMission, activeTrip, updateProfile } =
    useApp();
  const location = useLocation();

  // Local only: "the player tapped the poster" has no app state behind it.
  // It resets whenever the active mission goes away (a new draw starts the
  // brief step over; a submit ends the tour outright).
  const [briefAcked, setBriefAcked] = React.useState(false);
  // Local only: hides the tour the instant the player finishes or skips,
  // before the profile write round-trips.
  const [done, setDone] = React.useState(false);
  const [targetRect, setTargetRect] = React.useState<DOMRect | null>(null);
  const [captureTarget, setCaptureTarget] = React.useState<CaptureTourTarget>(null);

  const hasSeenTour = !!profile?.hasSeenFirstMissionTour;
  const eligible =
    !done &&
    isGuidedTourEligible({
      isAdmin,
      mustCompleteStarterMission,
      hasSeenFirstMissionTour: hasSeenTour,
    });

  const stepId = eligible
    ? deriveGuidedTourStep({
        route: location.pathname,
        hasActiveMission: !!activeTrip,
        briefAcked,
        captureTarget,
      })
    : null;

  // The measurement loop reads the live step through a ref, so it keeps
  // running (and keeps detecting capture hooks) even while the derived
  // step is null — e.g. the polaroid developing beat between snapping and
  // reviewing, where no tour target exists yet.
  const stepIdRef = React.useRef(stepId);
  stepIdRef.current = stepId;

  const completeTour = React.useCallback(() => {
    setDone(true);
    // Fire-and-forget: the local `done` flag hides the tour immediately,
    // and eligibility flips false once the write lands. A failed write
    // only means the tour could show again next visit — it never blocks
    // the player, and the console carries the error.
    if (user) {
      void updateProfile(user.uid, { hasSeenFirstMissionTour: true }).catch(
        (err: unknown) => {
          console.warn('[GuidedTour] Failed to persist tour completion:', err);
        },
      );
    }
  }, [user, updateProfile]);

  // A new draw (or a cleared mission) re-opens the brief step.
  React.useEffect(() => {
    if (!activeTrip) setBriefAcked(false);
  }, [activeTrip]);

  // Track the live target: a requestAnimationFrame loop re-measures every
  // frame while the tour is eligible, so the cutout follows the poster's
  // spring-in, the deck flip, and any scroll or resize — and so the
  // capture hook is noticed the moment it mounts. State only updates when
  // the rounded rect (or the capture hook) actually changes, so this does
  // not re-render every frame.
  React.useEffect(() => {
    if (!eligible) {
      setTargetRect(null);
      return;
    }
    let raf = 0;
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      const liveCaptureTarget =
        location.pathname === '/capture' ? findCaptureTarget() : null;
      if (location.pathname === '/capture') {
        setCaptureTarget((prev) => (prev === liveCaptureTarget ? prev : liveCaptureTarget));
      }
      const currentStep = stepIdRef.current;
      const selector = currentStep
        ? resolveGuidedTourTarget(currentStep, liveCaptureTarget)
        : null;
      const nextRect = measureTarget(selector);
      setTargetRect((prev) => (sameRect(prev, nextRect) ? prev : nextRect));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [eligible, location.pathname]);

  // Scroll the highlighted element into view when the step changes, so a
  // target below the fold (the shutter, the submit button) is actually
  // tappable and not just lit off-screen.
  const prevStepRef = React.useRef(stepId);
  React.useEffect(() => {
    if (prevStepRef.current === stepId) return;
    prevStepRef.current = stepId;
    if (!stepId) return;
    const selector = resolveGuidedTourTarget(stepId, findCaptureTarget());
    const el = selector ? document.querySelector(selector) : null;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < 0 || rect.bottom > window.innerHeight) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [stepId]);

  // The two taps the flow itself cannot observe: tapping the poster (brief
  // read) and tapping Submit Proof (tour done). The listener is passive —
  // it never prevents the tap itself, it only advances the tour.
  React.useEffect(() => {
    if (!eligible || !stepId) return;
    const onClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (!target || typeof (target as Element).closest !== 'function') return;
      if (stepId === 'card') {
        if (target.closest('[data-tour="mission-card"]')) setBriefAcked(true);
        return;
      }
      if (stepId === 'submit') {
        if (target.closest('[data-tour="submit-proof"]')) completeTour();
      }
      // The deck, start, and photo steps move the flow state, and the flow
      // state moves the tour — nothing local to do on those taps.
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [eligible, stepId, completeTour]);

  if (!eligible || !stepId || !targetRect) return null;

  const step = getGuidedTourStep(stepId);
  const copy =
    stepId === 'photo' && captureTarget === 'open-camera'
      ? GUIDED_TOUR_PHOTO_OPEN
      : { title: step.title, body: step.body };

  const vw = typeof window === 'undefined' ? 0 : window.innerWidth;
  const vh = typeof window === 'undefined' ? 0 : window.innerHeight;
  const pad = {
    left: Math.max(0, targetRect.left - CUTOUT_PADDING),
    top: Math.max(0, targetRect.top - CUTOUT_PADDING),
    right: Math.min(vw, targetRect.right + CUTOUT_PADDING),
    bottom: Math.min(vh, targetRect.bottom + CUTOUT_PADDING),
  };
  pad.right = Math.max(pad.left, pad.right);
  pad.bottom = Math.max(pad.top, pad.bottom);

  // Bubble: below the cutout when it fits, above it when it doesn't.
  const bubbleWidth = Math.min(340, vw - 24);
  const bubbleBelow = pad.bottom + 12 + 190 <= vh;
  const bubbleLeft = Math.max(
    12,
    Math.min(vw - bubbleWidth - 12, pad.left + (pad.right - pad.left) / 2 - bubbleWidth / 2),
  );

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[200]"
      role="dialog"
      aria-label={`Guided tour, step ${step.number} of ${GUIDED_TOUR_STEP_COUNT}: ${step.title}`}
      data-testid="guided-tour"
    >
      {/* Darkened backdrop, in four strips around the cutout. The strips
          swallow taps, so the only way forward is the lit element or Skip. */}
      <div
        className="pointer-events-auto absolute left-0 top-0 w-full bg-black/70 backdrop-blur-[2px]"
        style={{ height: pad.top }}
      />
      <div
        className="pointer-events-auto absolute bg-black/70 backdrop-blur-[2px]"
        style={{ left: 0, top: pad.top, width: pad.left, height: pad.bottom - pad.top }}
      />
      <div
        className="pointer-events-auto absolute bg-black/70 backdrop-blur-[2px]"
        style={{ left: pad.right, top: pad.top, width: vw - pad.right, height: pad.bottom - pad.top }}
      />
      <div
        className="pointer-events-auto absolute bottom-0 left-0 w-full bg-black/70 backdrop-blur-[2px]"
        style={{ top: pad.bottom }}
      />

      {/* Highlight ring around the lit element. */}
      <div
        className="pointer-events-none absolute rounded-xl border-[3px] border-brand-lime shadow-[0_0_0_4px_rgba(183,255,0,0.25),0_0_32px_rgba(183,255,0,0.45)]"
        style={{
          left: pad.left,
          top: pad.top,
          width: pad.right - pad.left,
          height: pad.bottom - pad.top,
        }}
      />

      {/* Trevor bubble. */}
      <div
        className="pointer-events-auto absolute rounded-2xl border-[3px] border-on-surface bg-[var(--skin-surface,#FFFDF4)] p-4 shadow-[6px_6px_0px_black]"
        style={{
          left: bubbleLeft,
          width: bubbleWidth,
          ...(bubbleBelow ? { top: pad.bottom + 12 } : { bottom: vh - pad.top + 12 }),
        }}
      >
        <p className="font-mono text-xs font-black uppercase tracking-[0.25em] text-brand-orange">
          Trevor says
        </p>
        <p className="mt-1 font-display text-xl font-black uppercase italic leading-tight text-on-surface">
          {copy.title}
        </p>
        <p className="mt-1 text-sm font-semibold leading-snug text-on-surface/80">{copy.body}</p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="font-mono text-xs font-black uppercase tracking-widest text-on-surface/60">
            Step {step.number} of {GUIDED_TOUR_STEP_COUNT}
          </span>
          <button
            type="button"
            onClick={completeTour}
            className="shrink-0 border-2 border-on-surface bg-white px-3 py-1.5 font-mono text-xs font-black uppercase tracking-widest text-on-surface shadow-[2px_2px_0px_black] transition-all active:translate-y-0.5 active:shadow-none"
          >
            {GUIDED_TOUR_SKIP_LABEL}
          </button>
        </div>
      </div>
    </div>
  );
}
