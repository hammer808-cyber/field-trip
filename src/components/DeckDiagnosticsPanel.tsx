import React from 'react';
import { ChevronDown, ChevronRight, FlaskConical, AlertTriangle } from 'lucide-react';
import { DeckPack } from '../types/deckPacks';
import { TripCard } from '../types/challenges';
import { Entry } from '../constants';
import { DrawnMissionCard } from '../types/game';
import { StarterCompletionState } from '../utils/starterHelper';
import { UserProfile } from '../services/userService';
import { simulateDeckDraw, DeckDrawSimulation } from '../services/deckDiagnosticsService';
import { cn } from '../lib/utils';

interface DeckDiagnosticsPanelProps {
  activePack: DeckPack | null;
  missions: TripCard[];
  entries: Entry[];
  drawnMissionCards: DrawnMissionCard[];
  profile: UserProfile | null;
  completedChallengeIds: Set<string>;
  submittedPendingChallengeIds: Set<string>;
  needsMoreProofChallengeIds: Set<string>;
  rejectedChallengeIds: Set<string>;
  onboardingCompletedCount: number;
  onboardingRequiredCount: number;
  isOnboardingComplete: boolean;
  starterState: StarterCompletionState;
  isHeatwaveDeckUnlocked: boolean;
  isSocalSummerUnlocked: boolean;
  isAdmin: boolean;
  locked: boolean;
  lockReason: string;
  exhausted: boolean;
  eligibleCards: TripCard[];
  activeTripId?: string | null;
}

function normalizeId(id: string | null | undefined) {
  return (id || '').toString().toLowerCase().trim();
}

function formatTimestamp(value: any): string {
  if (!value) return 'none';
  if (typeof value === 'string') return value;
  if (typeof value?.toDate === 'function') return value.toDate().toISOString();
  if (typeof value?.seconds === 'number') return new Date(value.seconds * 1000).toISOString();
  try {
    return new Date(value).toISOString();
  } catch {
    return String(value);
  }
}

function latestTimestamp(items: any[], keys: string[]) {
  const timestamps = items
    .map(item => keys.map(key => item?.[key]).find(Boolean))
    .filter(Boolean)
    .map(value => {
      if (typeof value?.toDate === 'function') return value.toDate().getTime();
      if (typeof value?.seconds === 'number') return value.seconds * 1000;
      const parsed = new Date(value).getTime();
      return Number.isFinite(parsed) ? parsed : 0;
    })
    .filter(Boolean);
  if (timestamps.length === 0) return 'none';
  return new Date(Math.max(...timestamps)).toISOString();
}

function IdList({ values }: { values: string[] }) {
  if (values.length === 0) return <span className="text-white/35">none</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {values.map(value => (
        <span key={value} className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/80">{value}</span>
      ))}
    </div>
  );
}

function Row({ label, value, warn = false }: { label: string; value: React.ReactNode; warn?: boolean }) {
  return (
    <div className={cn("grid grid-cols-[150px_1fr] gap-2 border-b border-white/10 py-1.5", warn && "bg-red-500/10")}>
      <div className="text-white/45">{label}</div>
      <div className="min-w-0 break-words text-white">{value}</div>
    </div>
  );
}

function StarterConflictRows({
  profile,
  starterState,
  approvedIds,
  submittedIds,
  onboardingCompletedCount,
  isOnboardingComplete
}: {
  profile: UserProfile | null;
  starterState: StarterCompletionState | undefined;
  approvedIds: string[];
  submittedIds: string[];
  onboardingCompletedCount: number;
  isOnboardingComplete: boolean;
}) {
  const starterIds = ['starter-1', 'starter-2', 'starter-3'];
  const approvedStarterIds = starterIds.filter(id => approvedIds.includes(id));
  const submittedStarterIds = starterIds.filter(id => submittedIds.includes(id));
  const profileOnboardingCompleted = !!profile?.onboardingCompleted;
  const starterComplete = !!starterState?.starterComplete;
  const canonicalStarterComplete = approvedStarterIds.length >= 3;
  const conflicts = [
    profileOnboardingCompleted !== canonicalStarterComplete && 'profile.onboardingCompleted conflicts with approved starter count',
    isOnboardingComplete !== canonicalStarterComplete && 'isOnboardingComplete conflicts with approved starter count',
    starterComplete !== canonicalStarterComplete && 'starterState.starterComplete conflicts with approved starter count',
    submittedStarterIds.length >= 3 && approvedStarterIds.length < 3 && 'submittedChallengeIds indicates all starters submitted before approvals are complete'
  ].filter(Boolean) as string[];

  return (
    <div className="mt-3 rounded border border-cyan-300/30 bg-cyan-300/5 p-3">
      <div className="mb-2 flex items-center gap-2 font-black uppercase tracking-wider text-cyan-200">
        Starter Signal Gates
        {conflicts.length > 0 && <AlertTriangle className="h-4 w-4 text-red-300" />}
      </div>
      <Row label="starter approved IDs" value={<IdList values={approvedStarterIds} />} />
      <Row label="starter submitted IDs" value={<IdList values={submittedStarterIds} />} />
      <Row label="approved >= 3" value={String(canonicalStarterComplete)} warn={!canonicalStarterComplete && (profileOnboardingCompleted || starterComplete)} />
      <Row label="profile onboardingCompleted" value={String(profileOnboardingCompleted)} warn={profileOnboardingCompleted !== canonicalStarterComplete} />
      <Row label="context isOnboardingComplete" value={String(isOnboardingComplete)} warn={isOnboardingComplete !== canonicalStarterComplete} />
      <Row label="starterState.starterComplete" value={String(starterComplete)} warn={starterComplete !== canonicalStarterComplete} />
      <Row label="onboarding count" value={`${onboardingCompletedCount} / 3`} />
      <Row label="starterState.status" value={starterState?.status || 'unknown'} />
      {conflicts.length > 0 && (
        <div className="mt-3 space-y-1 text-red-200">
          {conflicts.map(conflict => <div key={conflict}>CONFLICT: {conflict}</div>)}
        </div>
      )}
    </div>
  );
}

export function DeckDiagnosticsPanel(props: DeckDiagnosticsPanelProps) {
  const [open, setOpen] = React.useState(false);
  const [simulation, setSimulation] = React.useState<DeckDrawSimulation | null>(null);

  const deckId = props.activePack?.packId || 'unknown';
  const deckName = props.activePack?.packName || props.activePack?.title || 'Unknown deck';
  const submittedChallengeIds = (props.profile?.submittedChallengeIds || []).map(normalizeId);
  const approvedCompletedChallengeIds = Array.from(props.completedChallengeIds).map(normalizeId).sort();
  const submittedPendingChallengeIds = Array.from(props.submittedPendingChallengeIds).map(normalizeId).sort();
  const packMissionIds = props.activePack?.missionIds?.map(normalizeId) || [];
  const analysisMissionIds = new Set(packMissionIds);
  const remainingCards = packMissionIds.filter(id =>
    !props.completedChallengeIds.has(id) &&
    !props.submittedPendingChallengeIds.has(id) &&
    !props.needsMoreProofChallengeIds.has(id)
  );
  const previousMissionId = props.profile?.submittedChallengeIds?.[props.profile.submittedChallengeIds.length - 1] || props.activeTripId || null;
  const lastDrawTimestamp = latestTimestamp(
    props.drawnMissionCards.filter(card => !analysisMissionIds.size || analysisMissionIds.has(normalizeId(card.missionId || card.challengeId))),
    ['drawnAt', 'updatedAt']
  );
  const lastSubmissionTimestamp = latestTimestamp(
    props.entries.filter(entry => !analysisMissionIds.size || analysisMissionIds.has(normalizeId((entry as any).missionId || (entry as any).challengeId || entry.tripId))),
    ['submittedAt', 'createdAt', 'updatedAt']
  );

  const runSimulation = () => {
    setSimulation(simulateDeckDraw({
      missions: props.missions,
      completedMissionIds: props.completedChallengeIds,
      pendingMissionIds: props.submittedPendingChallengeIds,
      needsMoreProofMissionIds: props.needsMoreProofChallengeIds,
      rejectedMissionIds: props.rejectedChallengeIds,
      isOnboardingComplete: props.isOnboardingComplete,
      activePack: props.activePack,
      isHeatwaveDeckUnlocked: props.isHeatwaveDeckUnlocked,
      isSocalSummerUnlocked: props.isSocalSummerUnlocked,
      isAdmin: props.isAdmin,
      previousMissionId
    }));
  };

  return (
    <section className="mx-auto mb-8 max-w-5xl rounded-2xl border-2 border-cyan-300/50 bg-black/95 font-mono text-[11px] text-white shadow-[8px_8px_0px_rgba(0,0,0,0.6)]">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 font-black uppercase tracking-widest text-cyan-200">
          <FlaskConical className="h-4 w-4" />
          Deck Diagnostics
          <span className="text-white/45">{deckId}</span>
        </span>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>

      {open && (
        <div className="space-y-4 border-t border-white/10 p-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <div className="mb-2 font-black uppercase tracking-wider text-white/70">Deck State</div>
              <Row label="deckId" value={deckId} />
              <Row label="deckName" value={deckName} />
              <Row label="published/draft status" value={props.activePack?.status || (props.activePack?.isActive ? 'active' : 'draft')} />
              <Row label="hidden status" value={`${props.activePack?.visibility || 'unknown'} / hidden=${String(props.activePack?.visibility === 'hidden' || props.activePack?.isActive === false)}`} />
              <Row label="locked status" value={`${String(props.locked)}${props.lockReason ? ` (${props.lockReason})` : ''}`} warn={props.locked} />
              <Row label="exhausted status" value={String(props.exhausted)} warn={props.exhausted} />
              <Row label="total cards" value={String(packMissionIds.length)} />
              <Row label="remaining cards" value={String(remainingCards.length)} />
              <Row label="eligible cards count" value={String(props.eligibleCards.length)} warn={props.eligibleCards.length === 0 && packMissionIds.length > 0} />
              <Row label="last draw timestamp" value={lastDrawTimestamp} />
              <Row label="last submission timestamp" value={lastSubmissionTimestamp} />
            </div>

            <div>
              <div className="mb-2 font-black uppercase tracking-wider text-white/70">User State</div>
              <Row label="submittedChallengeIds" value={<IdList values={submittedChallengeIds} />} />
              <Row label="submittedPendingChallengeIds" value={<IdList values={submittedPendingChallengeIds} />} />
              <Row label="approvedCompletedChallengeIds" value={<IdList values={approvedCompletedChallengeIds} />} />
              <Row label="onboarding flags" value={`profile=${String(props.profile?.onboardingCompleted)} context=${String(props.isOnboardingComplete)} count=${props.onboardingCompletedCount}/${props.onboardingRequiredCount}`} />
              <Row label="starter completion flags" value={`starterState=${String(props.starterState.starterComplete)} approvedCount=${approvedCompletedChallengeIds.filter(id => ['starter-1', 'starter-2', 'starter-3'].includes(id)).length}`} />
              <Row label="activeTripId" value={props.activeTripId || 'none'} />
              <Row label="previous draw/submission id" value={previousMissionId || 'none'} />
            </div>
          </div>

          {deckId === 'starter-signals' && (
            <StarterConflictRows
              profile={props.profile}
              starterState={props.starterState}
              approvedIds={approvedCompletedChallengeIds}
              submittedIds={submittedChallengeIds}
              onboardingCompletedCount={props.onboardingCompletedCount}
              isOnboardingComplete={props.isOnboardingComplete}
            />
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={runSimulation}
              className="rounded-lg border-2 border-cyan-200 bg-cyan-300 px-4 py-2 font-black uppercase tracking-wider text-black shadow-[4px_4px_0px_rgba(255,255,255,0.25)] active:translate-x-0.5 active:translate-y-0.5"
            >
              Simulate Draw
            </button>
            <span className="text-white/45">Runs the draw filters without writing activeTrip, cards, or profile state.</span>
          </div>

          {simulation && (
            <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <div className="mb-2 font-black uppercase tracking-wider text-lime-200">Simulation Summary</div>
                  <Row label="failure reason" value={simulation.failureReason || 'none'} warn={!!simulation.failureReason} />
                  <Row label="selected card" value={simulation.selectedCard ? `${simulation.selectedCard.id}: ${simulation.selectedCard.title}` : 'none'} warn={!simulation.selectedCard} />
                  <Row label="final eligible cards" value={<IdList values={simulation.finalEligibleCards.map(card => card.id)} />} />
                  <Row label="filters applied" value={<IdList values={simulation.filtersApplied} />} />
                </div>
                <div>
                  <div className="mb-2 font-black uppercase tracking-wider text-lime-200">Cards Removed By Filter</div>
                  {Object.keys(simulation.removedByFilter).length === 0 ? (
                    <div className="text-white/45">none</div>
                  ) : Object.entries(simulation.removedByFilter).map(([reason, ids]) => (
                    <Row key={reason} label={reason} value={<IdList values={ids} />} />
                  ))}
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <div className="mb-2 font-black uppercase tracking-wider text-white/70">Raw Deck Cards</div>
                  <pre className="max-h-72 overflow-auto rounded bg-black/70 p-3 text-[10px] text-white/75">{JSON.stringify(simulation.rawDeckCards, null, 2)}</pre>
                </div>
                <div>
                  <div className="mb-2 font-black uppercase tracking-wider text-white/70">Per-card Filter Analysis</div>
                  <pre className="max-h-72 overflow-auto rounded bg-black/70 p-3 text-[10px] text-white/75">{JSON.stringify(simulation.canonicalPool.analysis || [], null, 2)}</pre>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
