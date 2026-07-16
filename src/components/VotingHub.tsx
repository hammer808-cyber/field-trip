import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Card } from './UI';
import { FieldtripLoader } from './FieldtripLoader';
import { ProofImage } from './ProofImage';
import { VoteCategory, Entry } from '../types/game';
import { getVoteStandings } from '../services/voteService';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Award, Check, Clock, FileCheck2, Lock, MapPin, Sparkles, Stamp, Ticket, Trophy } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { getServerDate } from '../services/timeService';
import { getCurrentVotingCycle, getVotingPhase } from '../services/votingCycleService';
import { getWeeklyBallotEmptyCopy, isWeeklyCandidateEligible, type WeeklyBallotEmptyReason } from '../logic/weeklyVoting';
import {
  castCanonicalWeeklyVote,
  loadWeeklyBallot,
  type WeeklyBallotReadModel,
} from '../services/weeklyVotingService';

const CATEGORIES: { id: VoteCategory; label: string; description: string; awardLabel: string; awardCopy: string }[] = [
  { id: 'best_field_note', label: 'Best Field Note', description: 'Profound or evocative field commentary.', awardLabel: 'Best Supporting Evidence', awardCopy: 'For a field note, photo, or tiny detail doing the most.' },
  { id: 'best_photo_proof', label: 'Best Photo Proof', description: 'Exceptional visual composition and clarity.', awardLabel: 'Main Character Moment', awardCopy: 'For the proof that understood the assignment.' },
  { id: 'most_legendary_errand', label: 'Most Legendary Errand', description: 'Completing an errand of mythical proportions.', awardLabel: 'Off The Beaten Path', awardCopy: 'For finding something nobody else would have noticed.' },
  { id: 'goblin_energy_award', label: 'Goblin Energy Award', description: 'Exceptional speed, chaotic creativity, or frantic vibes.', awardLabel: 'Chaos With Intent', awardCopy: 'For the beautifully unplanned receipt.' },
  { id: 'cleanest_completion', label: 'Cleanest Completion', description: 'Peerless professionalism and absolute alignment with the rules.', awardLabel: 'Receipt Verified', awardCopy: 'For the cleanest proof, sharpest details, and least suspicious paperwork.' },
  { id: 'underdog_award', label: 'Underdog Award', description: 'Remarkable resilience or courage under pressure.', awardLabel: 'Crew Favorite', awardCopy: 'For the one that made the group chat stop scrolling.' },
];

const STAMP_COPY = ['CERTIFIED', 'FIELD APPROVED', 'GLORIOUS', 'RECEIPT VERIFIED', 'CHAOS ACCEPTED', 'BIG ENERGY'];
const REACTION_COPY = ['Hot Receipt', 'Saw That', 'Respect', 'Unhinged', 'Saving This'];
const SUPERLATIVES = [
  'Most likely to become crew lore',
  'Most suspiciously well-composed',
  'Best use of an otherwise normal Tuesday',
  'Would absolutely print this in the zine',
];

function getCategoryMeta(categoryId: VoteCategory) {
  return CATEGORIES.find(category => category.id === categoryId) || CATEGORIES[0];
}

function getEntryImage(entry: Entry) {
  return (entry as any).proofImage || (entry as any).imageUrl || (entry as any).photoUrl || '';
}

function getEntryDisplayName(entry: Entry) {
  return (entry as any).userName || (entry as any).displayName || (entry as any).username || 'Field Agent';
}

function getEntryMissionTitle(entry: Entry) {
  return (entry as any).tripTitle || (entry as any).missionTitle || (entry as any).challengeTitle || 'Field Receipt';
}

function getStampFor(categoryId: VoteCategory) {
  const idx = Math.max(0, CATEGORIES.findIndex(category => category.id === categoryId));
  return STAMP_COPY[idx % STAMP_COPY.length];
}

export const VotingHub = ({ noCard = false }: { noCard?: boolean }) => {
  const {
    user, currentWeekNumber, isWeekLocked, castVote, userVotes, activeSeason
  } = useApp();

  const [selectedCategory, setSelectedCategory] = useState<VoteCategory>(CATEGORIES[0].id);
  const [eligibleEntries, setEligibleEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [winners, setWinners] = useState<Record<string, { entryId: string; count: number; userName?: string; tripTitle?: string; fieldNote?: string; proofImage?: string }>>({});
  const [isSummaryLocked, setIsSummaryLocked] = useState(false);
  const [draftVotes, setDraftVotes] = useState<Partial<Record<VoteCategory, string>>>({});
  const [localReactions, setLocalReactions] = useState<Record<string, string>>({});
  const [isFilingVotes, setIsFilingVotes] = useState(false);
  const [filedCelebration, setFiledCelebration] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ballotReadModel, setBallotReadModel] = useState<WeeklyBallotReadModel | null>(null);
  const [canonicalDraftProofIds, setCanonicalDraftProofIds] = useState<string[]>([]);

  const mapCandidateToEntry = (candidate: any): Entry => {
    const tripId = candidate.tripId || candidate.missionId || candidate.challengeId || '';
    const proofImage = candidate.proofImage || candidate.photoUrl || candidate.imageUrl || candidate.thumbnailUrl || '';
    return {
      id: candidate.entryId,
      entryId: candidate.entryId,
      uid: candidate.userId,
      userId: candidate.userId,
      userName: candidate.userName || candidate.displayName || 'Agent',
      displayName: candidate.displayName || candidate.userName || 'Agent',
      username: candidate.userName || candidate.displayName || 'Agent',
      missionId: tripId,
      challengeId: tripId,
      tripId,
      deckId: candidate.deckId || 'd1',
      tripTitle: candidate.tripTitle || candidate.missionTitle || 'Field Trip Mission',
      proofImage,
      imageUrl: proofImage,
      storagePath: candidate.storagePath || null,
      fieldNote: candidate.fieldNote || candidate.note || '',
      weekNumber: candidate.weekNumber,
      seasonId: candidate.seasonId,
      categories: Array.isArray(candidate.categories) ? candidate.categories : CATEGORIES.map(cat => cat.id),
      status: 'approved',
      xpValue: 150,
      xpAwarded: true,
      createdAt: candidate.createdAt || candidate.approvedAt || new Date().toISOString(),
      updatedAt: candidate.updatedAt || candidate.createdAt || new Date().toISOString()
    } as Entry;
  };

  const [phase, setPhase] = useState(() => {
    const now = getServerDate();
    const cycle = getCurrentVotingCycle(now);
    return getVotingPhase(now, cycle);
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = getServerDate();
      const cycle = getCurrentVotingCycle(now);
      setPhase(getVotingPhase(now, cycle));
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const isVotingOpen = phase === 'voting';
  const isLocked = phase === 'awards' || isWeekLocked(currentWeekNumber) || isSummaryLocked;

  useEffect(() => {
    if (currentWeekNumber <= 0) return;

    const fetchEntries = async () => {
      setLoading(true);
      setError(null);
      try {
        let winnerMap: any = {};
        if (activeSeason) {
          const summarySnap = await getDoc(doc(db, 'weeklySummaries', `${activeSeason.id}_${currentWeekNumber}`));
          if (summarySnap.exists()) {
            const summaryData = summarySnap.data();
            setIsSummaryLocked(!!summaryData?.isLocked);
            if (summaryData?.voteWinners) winnerMap = summaryData.voteWinners;
          } else {
            setIsSummaryLocked(false);
          }
        }

        const seasonId = activeSeason?.id || 'heatwave-receipts';
        const ballotModel = await loadWeeklyBallot({
          seasonId,
          weekNumber: currentWeekNumber,
          now: getServerDate(),
          userId: user?.uid,
        });
        const fetchedCandidates = ballotModel.nominees.map(mapCandidateToEntry);

        setBallotReadModel(ballotModel);
        setCanonicalDraftProofIds(ballotModel.existingSelectedProofIds);
        setEligibleEntries(fetchedCandidates);

        if (isLocked) {
          const userIsAdmin = user?.email?.includes('admin');
          if (Object.keys(winnerMap).length === 0 && userIsAdmin) {
            for (const cat of CATEGORIES) {
              const standings = await getVoteStandings(currentWeekNumber, cat.id);
              if (standings.length > 0) {
                const entrySnap = await getDoc(doc(db, 'entries', standings[0].entryId));
                if (entrySnap.exists()) {
                  const entryData = entrySnap.data();
                  winnerMap[cat.id] = {
                    entryId: standings[0].entryId,
                    count: standings[0].count,
                    userName: entryData.userName || 'Anonymous Agent',
                    tripTitle: entryData.tripTitle || '',
                    proofImage: entryData.proofImage || entryData.imageUrl || entryData.photoUrl || '',
                    fieldNote: entryData.fieldNote || ''
                  };
                }
              }
            }
          }
          setWinners(winnerMap);
        }
      } catch (err) {
        console.error('Failed to fetch voting data:', err);
        setError('The ballot table jammed. Try refreshing in a minute.');
        setBallotReadModel(null);
      } finally {
        setLoading(false);
      }
    };

    fetchEntries();
  }, [currentWeekNumber, isLocked, activeSeason, user]);

  const getVoteForCategory = (catId: VoteCategory) => userVotes?.find(v => v.category === catId);

  const selectedCategoryMeta = getCategoryMeta(selectedCategory);
  const filedVoteCount = CATEGORIES.filter(category => getVoteForCategory(category.id)).length;
  const draftVoteCount = CATEGORIES.filter(category => !getVoteForCategory(category.id) && draftVotes[category.id]).length;
  const filedOrDraftCount = filedVoteCount + draftVoteCount;
  const allCategoriesReady = filedOrDraftCount === CATEGORIES.length;
  const hasDraftVotes = Object.keys(draftVotes).length > 0;

  const categoryEntries = useMemo(() => eligibleEntries.filter(entry => {
    const categories = Array.isArray((entry as any).categories) ? (entry as any).categories : CATEGORIES.map(cat => cat.id);
    return isWeeklyCandidateEligible({ ...entry, categories, isEligible: true }, selectedCategory);
  }), [eligibleEntries, selectedCategory]);

  const isCanonicalBallot = ballotReadModel?.source === 'canonical';
  const canonicalMaxVotes = ballotReadModel?.maxVotesPerVoter || 3;
  const canonicalVotableEntries = eligibleEntries.filter(entry => entry.userId !== user?.uid);
  const canonicalExistingProofIds = ballotReadModel?.existingSelectedProofIds || [];
  const canonicalHasChanges = [...canonicalDraftProofIds].sort().join('|') !== [...canonicalExistingProofIds].sort().join('|');
  const displayedVoteCount = isCanonicalBallot ? canonicalDraftProofIds.length : filedOrDraftCount;
  const displayedVoteLimit = isCanonicalBallot ? canonicalMaxVotes : CATEGORIES.length;
  const displayedRemainingCount = Math.max(0, displayedVoteLimit - displayedVoteCount);

  const toggleCanonicalProof = (entryId: string) => {
    if (!isVotingOpen || !isCanonicalBallot) return;
    setCanonicalDraftProofIds(previous => {
      if (previous.includes(entryId)) return previous.filter(id => id !== entryId);
      if (previous.length >= canonicalMaxVotes) return previous;
      return [...previous, entryId];
    });
    setFiledCelebration(false);
  };

  const fileCanonicalBallot = async () => {
    if (!user || !ballotReadModel || !isCanonicalBallot || !isVotingOpen || canonicalDraftProofIds.length === 0 || !canonicalHasChanges) return;
    setIsFilingVotes(true);
    setError(null);
    try {
      await castCanonicalWeeklyVote({
        cycleId: ballotReadModel.lookup.cycleId,
        ballotId: ballotReadModel.lookup.canonicalBallotId,
        selectedProofIds: canonicalDraftProofIds,
      });
      setBallotReadModel(current => current ? {
        ...current,
        existingSelectedProofIds: [...canonicalDraftProofIds],
      } : current);
      setFiledCelebration(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'WEEKLY_VOTE_FAILED';
      console.error('Canonical ballot filing failed:', err);
      setError(message === 'SELF_VOTE_PROHIBITED'
        ? 'You cannot vote for your own receipt.'
        : message === 'VOTING_WINDOW_CLOSED' || message === 'BALLOT_NOT_OPEN'
          ? 'The voting window is closed.'
          : message === 'PROOF_NOT_IN_BALLOT'
            ? 'One selection is no longer eligible. Refresh the ballot and try again.'
            : 'Your ballot did not file. Please try again.');
    } finally {
      setIsFilingVotes(false);
    }
  };

  const votableCandidates = categoryEntries.filter(entry => entry.userId !== user?.uid);
  const selectDraftVote = (categoryId: VoteCategory, entryId: string) => {
    if (!isVotingOpen || getVoteForCategory(categoryId)) return;
    setDraftVotes(prev => ({ ...prev, [categoryId]: entryId }));
    setFiledCelebration(false);
  };

  const fileDraftVotes = async () => {
    if (!isVotingOpen || !user || !hasDraftVotes) return;
    setIsFilingVotes(true);
    setError(null);
    try {
      for (const category of CATEGORIES) {
        const entryId = draftVotes[category.id];
        if (!entryId || getVoteForCategory(category.id)) continue;
        await castVote(entryId, currentWeekNumber, category.id);
      }
      setDraftVotes({});
      setFiledCelebration(true);
    } catch (err: any) {
      console.error('Vote filing failed:', err);
      setError(err?.message === 'SELF_VOTE_PROHIBITED'
        ? 'You cannot vote for your own receipt.'
        : err?.message === 'VOTE_ALREADY_CAST'
          ? 'One of those categories was already filed.'
          : 'Votes did not file. Please try again.'
      );
    } finally {
      setIsFilingVotes(false);
    }
  };

  if (currentWeekNumber <= 0) {
    const preseasonState = (
      <div className="border-4 border-on-surface bg-[#fff7e8] p-8 text-center shadow-[8px_8px_0px_black]">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-4 border-on-surface bg-white shadow-[5px_5px_0px_black]">
          <Clock className="h-10 w-10 text-brand-orange" />
        </div>
        <h3 className="mt-5 font-display text-4xl font-black italic uppercase tracking-tighter">Weekly voting is upcoming</h3>
        <p className="mx-auto mt-2 max-w-md font-serif italic text-on-surface/65">
          The active season has not started, or its configured dates are unavailable. No Week 1 ballot is assumed.
        </p>
      </div>
    );
    return noCard ? preseasonState : <Card className="bg-white p-4">{preseasonState}</Card>;
  }

  const content = (
    <>
      <header className={cn(
        "relative overflow-hidden bg-[#fff7e8] border-b-4 border-on-surface p-5 sm:p-8 text-on-surface",
        noCard && "rounded-t-xl"
      )}>
        <div className="absolute inset-0 opacity-45 bg-[radial-gradient(rgba(0,0,0,0.05)_1px,transparent_1px)] [background-size:14px_14px]" />
        <div className="absolute -right-10 top-6 h-28 w-52 rotate-6 bg-brand-cyan border-4 border-on-surface shadow-[8px_8px_0px_black]" />
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 bg-on-surface text-brand-lime px-3 py-1 border-2 border-on-surface shadow-[3px_3px_0px_var(--color-brand-orange)]">
              <Ticket className="h-4 w-4" />
              <span className="font-mono text-[9px] font-black uppercase tracking-[0.22em]">Week {currentWeekNumber} Dispatches</span>
            </div>
            <div>
              <h2 className="font-display text-5xl sm:text-8xl uppercase tracking-tighter leading-[0.8] font-black italic">Field Awards</h2>
              <p className="mt-3 font-serif text-lg sm:text-2xl italic text-on-surface/70">Hand out glory. Mildly judge your peers.</p>
            </div>
            <p className="font-mono text-[10px] sm:text-xs font-black uppercase tracking-widest text-brand-orange">
              {phase === 'voting' ? 'Voting closes Saturday at 11:59 PM Pacific' : phase === 'awards' ? 'Ballot box sealed. Results are being processed.' : 'The receipts are in. Ballot building is underway.'}
            </p>
          </div>

          <div className="relative bg-white border-4 border-on-surface p-4 shadow-[8px_8px_0px_black] rotate-[-1deg] min-w-[250px]">
            <p className="font-mono text-[9px] font-black uppercase tracking-widest text-on-surface/40">Ballot Progress</p>
            <p className="font-display text-4xl font-black italic uppercase leading-none mt-1">{displayedVoteCount} / {displayedVoteLimit}</p>
            <p className="font-serif italic text-sm text-on-surface/60 mt-1">
              {displayedRemainingCount === 0 ? 'Your ballot is ready.' : `${displayedRemainingCount} more legend${displayedRemainingCount === 1 ? '' : 's'} to recognize.`}
            </p>
            <div
              className={cn("mt-4 grid gap-1.5", isCanonicalBallot ? "grid-cols-3" : "grid-cols-6")}
              aria-label={`${displayedVoteCount} of ${displayedVoteLimit} ballot selections`}
            >
              {isCanonicalBallot
                ? Array.from({ length: displayedVoteLimit }, (_, index) => (
                  <div
                    key={`canonical-slot-${index}`}
                    className={cn(
                      "h-10 border-2 border-on-surface shadow-[2px_2px_0px_black] flex items-center justify-center",
                      index < displayedVoteCount ? "bg-brand-lime" : "bg-paper"
                    )}
                    aria-hidden="true"
                  >
                    {index < displayedVoteCount ? <Check className="h-4 w-4" /> : <Ticket className="h-4 w-4 opacity-30" />}
                  </div>
                ))
                : CATEGORIES.map(category => {
                const filed = !!getVoteForCategory(category.id);
                const drafted = !!draftVotes[category.id];
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setSelectedCategory(category.id)}
                    className={cn(
                      "h-10 border-2 border-on-surface shadow-[2px_2px_0px_black] font-mono text-[8px] font-black",
                      filed ? "bg-brand-lime" : drafted ? "bg-brand-yellow" : "bg-paper"
                    )}
                    aria-label={`${getCategoryMeta(category.id).awardLabel}: ${filed ? 'filed' : drafted ? 'selected' : 'not selected'}`}
                  >
                    {filed || drafted ? <Check className="mx-auto h-4 w-4" /> : category.id.slice(0, 2).toUpperCase()}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      <main className="bg-white p-4 sm:p-8 space-y-8 text-left">
        {error && (
          <div className="border-4 border-brand-orange bg-brand-orange/10 p-4 font-mono text-xs font-black uppercase tracking-widest text-on-surface shadow-[4px_4px_0px_black]">
            {error}
          </div>
        )}

        {isCanonicalBallot ? (
          <CanonicalWeeklyBallot
            model={ballotReadModel}
            entries={canonicalVotableEntries}
            selectedProofIds={canonicalDraftProofIds}
            isLoading={loading}
            isVotingOpen={isVotingOpen}
            isLocked={isLocked}
            isFilingVotes={isFilingVotes}
            hasChanges={canonicalHasChanges}
            filedCelebration={filedCelebration}
            reactions={localReactions}
            onReact={(entryId, reaction) => setLocalReactions(previous => ({ ...previous, [entryId]: reaction }))}
            onToggle={toggleCanonicalProof}
            onFile={fileCanonicalBallot}
          />
        ) : (
        <section className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          <aside className="space-y-3">
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.25em] text-on-surface/40">Award Booths</p>
            {CATEGORIES.map((category, idx) => {
              const filed = !!getVoteForCategory(category.id);
              const drafted = !!draftVotes[category.id];
              const isActive = selectedCategory === category.id;
              return (
                <button
                  id={`cat-btn-${category.id}`}
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategory(category.id)}
                  className={cn(
                    "w-full min-h-[64px] border-4 border-on-surface p-3 text-left shadow-[4px_4px_0px_black] transition-transform active:translate-y-0.5",
                    isActive ? "bg-on-surface text-white" : "bg-[#fffaf0] hover:-rotate-1",
                    filed && "ring-4 ring-brand-lime",
                    drafted && !filed && "ring-4 ring-brand-yellow"
                  )}
                  aria-pressed={isActive}
                >
                  <div className="flex gap-3 items-start">
                    <div className={cn("h-9 w-9 shrink-0 border-2 border-on-surface bg-white text-on-surface flex items-center justify-center font-display font-black italic", isActive && "bg-brand-lime")}>
                      {filed ? <FileCheck2 className="h-5 w-5" /> : drafted ? <Stamp className="h-5 w-5" /> : idx + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="font-display text-lg font-black italic uppercase leading-none truncate">{category.awardLabel}</p>
                      <p className={cn("mt-1 text-[10px] leading-snug", isActive ? "text-white/70" : "text-on-surface/55")}>{category.label}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </aside>

          <section className="min-w-0 space-y-6">
            <div className="relative border-4 border-on-surface bg-paper p-5 shadow-[8px_8px_0px_black] overflow-hidden">
              <div className="absolute right-6 top-4 h-8 w-24 rotate-3 bg-brand-magenta/30 border border-brand-magenta/30" />
              <div className="relative z-10">
                <p className="font-mono text-[9px] font-black uppercase tracking-[0.25em] text-brand-orange">Now Judging</p>
                <h3 className="mt-2 font-display text-4xl sm:text-6xl font-black italic uppercase tracking-tighter leading-none">{selectedCategoryMeta.awardLabel}</h3>
                <p className="mt-2 font-serif italic text-on-surface/65">{selectedCategoryMeta.awardCopy}</p>
              </div>
            </div>

            {loading ? (
              <FieldtripLoader
                variant="voting"
                label="Opening Field Awards"
                estimatedStep="BALLOT BOX"
                compact
                showProgress
              />
            ) : isLocked ? (
              <ResultsState winners={winners} selectedCategory={selectedCategory} entries={eligibleEntries} />
            ) : ballotReadModel?.reason && ballotReadModel.reason !== 'ready' ? (
              <EmptyState reason={ballotReadModel.reason} />
            ) : !isVotingOpen ? (
              <ClosedState phase={phase} filedVoteCount={filedVoteCount} />
            ) : votableCandidates.length === 0 ? (
              <EmptyState reason={eligibleEntries.length > 0 ? 'no_approved_nominees' : ballotReadModel?.reason} />
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-[1fr_310px] gap-6 items-start">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {votableCandidates.map((candidate, idx) => {
                    const entryId = String((candidate as any).entryId || candidate.id);
                    const isDraftSelected = draftVotes[selectedCategory] === entryId;
                    const isFiledSelected = getVoteForCategory(selectedCategory)?.entryId === entryId;
                    const filedCategory = !!getVoteForCategory(selectedCategory);
                    return (
                      <VoteReceiptCard
                        key={entryId}
                        entry={candidate}
                        category={selectedCategory}
                        index={idx}
                        selected={isDraftSelected || isFiledSelected}
                        filed={isFiledSelected}
                        disabled={filedCategory}
                        reaction={localReactions[entryId]}
                        onReact={(reaction) => setLocalReactions(prev => ({ ...prev, [entryId]: reaction }))}
                        onSelect={() => selectDraftVote(selectedCategory, entryId)}
                      />
                    );
                  })}
                </div>

                <BallotReviewPanel
                  entries={eligibleEntries}
                  draftVotes={draftVotes}
                  userVotes={userVotes || []}
                  isReady={allCategoriesReady}
                  hasDraftVotes={hasDraftVotes}
                  isFilingVotes={isFilingVotes}
                  filedCelebration={filedCelebration}
                  onFile={fileDraftVotes}
                />
              </div>
            )}
          </section>
        </section>
        )}

        <footer className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {SUPERLATIVES.map((copy, idx) => (
            <div key={copy} className={cn("border-2 border-on-surface bg-white p-3 shadow-[3px_3px_0px_black] rotate-[-1deg]", idx === 1 && "rotate-[1deg]", idx === 2 && "sm:col-span-1 rotate-0")}>
              <p className="font-mono text-[8px] font-black uppercase tracking-widest text-brand-orange">Field Superlative</p>
              <p className="font-serif italic text-sm font-bold text-on-surface/75 mt-1">{copy}</p>
            </div>
          ))}
        </footer>
      </main>
    </>
  );

  if (noCard) return content;
  return (
    <Card className="bg-white border-8 border-on-surface overflow-hidden shadow-[24px_24px_0px_black] relative text-left">
      {content}
    </Card>
  );
};

function CanonicalWeeklyBallot({
  model,
  entries,
  selectedProofIds,
  isLoading,
  isVotingOpen,
  isLocked,
  isFilingVotes,
  hasChanges,
  filedCelebration,
  reactions,
  onReact,
  onToggle,
  onFile,
}: {
  model: WeeklyBallotReadModel;
  entries: Entry[];
  selectedProofIds: string[];
  isLoading: boolean;
  isVotingOpen: boolean;
  isLocked: boolean;
  isFilingVotes: boolean;
  hasChanges: boolean;
  filedCelebration: boolean;
  reactions: Record<string, string>;
  onReact: (entryId: string, reaction: string) => void;
  onToggle: (entryId: string) => void;
  onFile: () => void;
}) {
  const filedProofIds = new Set(model.existingSelectedProofIds);
  const selectionIsFull = selectedProofIds.length >= model.maxVotesPerVoter;
  const hasExistingBallot = model.existingSelectedProofIds.length > 0;

  if (isLoading) {
    return (
      <FieldtripLoader
        variant="voting"
        label="Opening Weekly Ballot"
        estimatedStep="BALLOT BOX"
        compact
        showProgress
      />
    );
  }

  if (model.reason !== 'ready') {
    return <EmptyState reason={model.reason} />;
  }

  if (isLocked || !isVotingOpen) {
    return <ClosedState phase={isLocked ? 'awards' : 'submission'} filedVoteCount={model.existingSelectedProofIds.length} />;
  }

  if (entries.length === 0) {
    return <EmptyState reason="no_approved_nominees" />;
  }

  return (
    <section className="space-y-6">
      <div className="relative overflow-hidden border-4 border-on-surface bg-paper p-5 shadow-[8px_8px_0px_black]">
        <div className="absolute right-6 top-4 h-8 w-24 rotate-3 border border-brand-magenta/30 bg-brand-magenta/30" />
        <div className="relative z-10 max-w-3xl">
          <p className="font-mono text-[9px] font-black uppercase tracking-[0.25em] text-brand-orange">Community Weekly Ballot</p>
          <h3 className="mt-2 font-display text-4xl font-black italic uppercase leading-none tracking-tighter sm:text-6xl">Choose up to {model.maxVotesPerVoter}</h3>
          <p className="mt-2 font-serif italic text-on-surface/65">
            Pick different approved receipts. You can update this ballot until Saturday at 11:59 PM Pacific. Self-votes are removed before display and rejected by the server.
          </p>
          <p className="mt-3 font-mono text-[9px] font-black uppercase tracking-widest text-on-surface/40">
            Cycle {model.lookup.cycleId} // {model.nominees.length} frozen nominee{model.nominees.length === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_310px] xl:items-start">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {entries.map((candidate, index) => {
            const entryId = String((candidate as any).entryId || candidate.id);
            const selected = selectedProofIds.includes(entryId);
            return (
              <VoteReceiptCard
                key={entryId}
                entry={candidate}
                category="best_photo_proof"
                index={index}
                selected={selected}
                filed={selected && filedProofIds.has(entryId) && !hasChanges}
                disabled={selectionIsFull && !selected}
                reaction={reactions[entryId]}
                onReact={reaction => onReact(entryId, reaction)}
                onSelect={() => onToggle(entryId)}
              />
            );
          })}
        </div>

        <aside className="sticky top-4 space-y-4">
          <div className="border-4 border-on-surface bg-[#fff7e8] p-4 shadow-[8px_8px_0px_black]">
            <p className="font-mono text-[9px] font-black uppercase tracking-[0.25em] text-brand-orange">Ballot Review</p>
            <h4 className="mt-2 font-display text-4xl font-black italic uppercase leading-none">Your picks</h4>
            <div className="mt-4 space-y-2">
              {Array.from({ length: model.maxVotesPerVoter }, (_, index) => {
                const entryId = selectedProofIds[index];
                const entry = entries.find(candidate => String((candidate as any).entryId || candidate.id) === entryId);
                return (
                  <div key={`ballot-slot-${index}`} className="flex min-h-14 items-center gap-3 border-2 border-on-surface bg-white p-2 shadow-[2px_2px_0px_black]">
                    <div className={cn("flex h-9 w-9 items-center justify-center border-2 border-on-surface", entry ? "bg-brand-lime" : "bg-paper")}>
                      {entry ? <Check className="h-5 w-5" /> : <Ticket className="h-5 w-5 opacity-40" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-mono text-[8px] font-black uppercase tracking-widest text-on-surface/40">Pick {index + 1}</p>
                      <p className="truncate font-display text-sm font-black italic uppercase">{entry ? getEntryDisplayName(entry) : 'Open slot'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={onFile}
              disabled={selectedProofIds.length === 0 || !hasChanges || isFilingVotes}
              className={cn(
                "mt-5 min-h-12 w-full border-4 border-on-surface px-4 py-3 font-display text-xl font-black italic uppercase shadow-[5px_5px_0px_black]",
                selectedProofIds.length > 0 && hasChanges ? "bg-brand-lime text-on-surface" : "bg-white text-on-surface/35"
              )}
            >
              {isFilingVotes ? 'Filing...' : hasExistingBallot ? 'Update My Ballot' : 'Submit My Ballot'}
            </button>
          </div>

          {filedCelebration && (
            <motion.div
              initial={{ y: -8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="border-4 border-on-surface bg-on-surface p-4 text-white shadow-[6px_6px_0px_var(--color-brand-lime)]"
            >
              <p className="font-display text-3xl font-black italic uppercase leading-none">Ballot filed.</p>
              <p className="mt-2 font-serif italic text-white/70">Your picks are on record. You may update them until voting closes.</p>
            </motion.div>
          )}
        </aside>
      </div>
    </section>
  );
}

function VoteReceiptCard({
  entry,
  category,
  index,
  selected,
  filed,
  disabled,
  reaction,
  onReact,
  onSelect
}: {
  entry: Entry;
  category: VoteCategory;
  index: number;
  selected: boolean;
  filed: boolean;
  disabled: boolean;
  reaction?: string;
  onReact: (reaction: string) => void;
  onSelect: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const hasImage = !!(
    getEntryImage(entry) ||
    (entry as any).storagePath ||
    (entry as any).photoStoragePath ||
    (entry as any).imageStoragePath ||
    (entry as any).proofStoragePath
  );
  const missionTitle = getEntryMissionTitle(entry);
  const displayName = getEntryDisplayName(entry);
  const note = String((entry as any).fieldNote || '').trim();

  return (
    <article className={cn(
      "relative bg-[#fffdf7] border-4 border-on-surface shadow-[8px_8px_0px_black] overflow-hidden transition-transform",
      selected ? "ring-4 ring-brand-lime rotate-0" : index % 2 === 0 ? "rotate-[-0.5deg]" : "rotate-[0.5deg]"
    )}>
      <div className="absolute left-5 top-3 h-7 w-20 rotate-[-4deg] bg-brand-cyan/30 border border-brand-cyan/40 z-20" />
      <div className="relative aspect-[4/5] bg-on-surface overflow-hidden border-b-4 border-on-surface">
        {hasImage ? (
          <ProofImage
            entry={entry}
            alt={`Proof submitted by ${displayName} for ${missionTitle}`}
            className="h-full w-full"
            objectFit="cover"
            showMetadataStamp={false}
            showDiagnosticsOverlay={false}
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-on-surface text-white/50 font-mono text-xs uppercase">Missing image</div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 text-white">
          <p className="font-display text-3xl font-black italic uppercase leading-none">{displayName}</p>
          <p className="mt-1 flex items-center gap-1.5 font-mono text-[10px] font-black uppercase tracking-widest text-white/75">
            <MapPin className="h-3 w-3 text-brand-orange" />
            <span className="truncate">{missionTitle}</span>
          </p>
        </div>
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={reduceMotion ? { opacity: 1 } : { scale: 1.4, rotate: -18, opacity: 0 }}
              animate={reduceMotion ? { opacity: 1 } : { scale: 1, rotate: -10, opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              aria-hidden="true"
            >
              <div className="rounded-full border-[7px] border-brand-lime bg-white/80 px-7 py-5 text-center shadow-[6px_6px_0px_black]">
                <p className="font-display text-3xl font-black italic uppercase tracking-tighter text-on-surface">{getStampFor(category)}</p>
                <p className="font-mono text-[8px] font-black uppercase tracking-widest text-brand-orange">{filed ? 'Filed' : 'Draft Pick'}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          <span className="bg-brand-yellow border-2 border-on-surface px-2 py-1 font-mono text-[8px] font-black uppercase shadow-[2px_2px_0px_black]">Receipt #{index + 1}</span>
          <span className="bg-white border-2 border-on-surface px-2 py-1 font-mono text-[8px] font-black uppercase shadow-[2px_2px_0px_black]">Approved Proof</span>
          {reaction && <span className="bg-brand-cyan border-2 border-on-surface px-2 py-1 font-mono text-[8px] font-black uppercase shadow-[2px_2px_0px_black]">{reaction}</span>}
        </div>

        {note && (
          <p className="font-serif italic text-sm font-bold leading-relaxed text-on-surface/75 line-clamp-4">"{note}"</p>
        )}

        <div className="flex flex-wrap gap-2">
          {REACTION_COPY.map(item => (
            <button
              key={item}
              type="button"
              onClick={() => onReact(item)}
              className={cn(
                "min-h-11 border-2 border-on-surface px-3 py-2 font-mono text-[8px] font-black uppercase shadow-[2px_2px_0px_black]",
                reaction === item ? "bg-brand-lime" : "bg-white"
              )}
              aria-label={`Mark this receipt as ${item}`}
            >
              {item}
            </button>
          ))}
        </div>

        <button
          id={`btn-stamp-${entry.id}`}
          type="button"
          onClick={onSelect}
          disabled={disabled && !selected}
          className={cn(
            "w-full min-h-12 border-4 border-on-surface px-4 py-3 font-display text-xl font-black italic uppercase tracking-wide shadow-[5px_5px_0px_black] transition-transform active:translate-y-1 active:shadow-none",
            selected ? "bg-brand-lime text-on-surface" : "bg-brand-orange text-white hover:bg-brand-lime hover:text-on-surface",
            disabled && !selected && "opacity-45 grayscale"
          )}
          aria-pressed={selected}
        >
          {filed ? 'Vote Filed' : selected ? 'Stamped Pick' : 'Stamp This'}
        </button>
      </div>
    </article>
  );
}

function BallotReviewPanel({
  entries,
  draftVotes,
  userVotes,
  isReady,
  hasDraftVotes,
  isFilingVotes,
  filedCelebration,
  onFile
}: {
  entries: Entry[];
  draftVotes: Partial<Record<VoteCategory, string>>;
  userVotes: any[];
  isReady: boolean;
  hasDraftVotes: boolean;
  isFilingVotes: boolean;
  filedCelebration: boolean;
  onFile: () => void;
}) {
  const getSelectedEntry = (categoryId: VoteCategory) => {
    const entryId = draftVotes[categoryId] || userVotes.find(vote => vote.category === categoryId)?.entryId;
    return entries.find(entry => entry.id === entryId || (entry as any).entryId === entryId);
  };

  return (
    <aside className="sticky top-4 space-y-4">
      <div className="border-4 border-on-surface bg-[#fff7e8] p-4 shadow-[8px_8px_0px_black]">
        <p className="font-mono text-[9px] font-black uppercase tracking-[0.25em] text-brand-orange">Ballot Review</p>
        <h4 className="mt-2 font-display text-4xl font-black italic uppercase leading-none">Check the stamps before filing.</h4>
        <div className="mt-4 space-y-2">
          {CATEGORIES.map(category => {
            const selectedEntry = getSelectedEntry(category.id);
            return (
              <div key={category.id} className="flex items-center gap-3 border-2 border-on-surface bg-white p-2 shadow-[2px_2px_0px_black]">
                <div className={cn("h-9 w-9 border-2 border-on-surface flex items-center justify-center", selectedEntry ? "bg-brand-lime" : "bg-paper")}>
                  {selectedEntry ? <Check className="h-5 w-5" /> : <Ticket className="h-5 w-5 opacity-40" />}
                </div>
                <div className="min-w-0">
                  <p className="font-mono text-[8px] font-black uppercase tracking-widest text-on-surface/40">{getCategoryMeta(category.id).awardLabel}</p>
                  <p className="truncate font-display text-sm font-black italic uppercase">{selectedEntry ? getEntryDisplayName(selectedEntry) : 'No pick yet'}</p>
                </div>
              </div>
            );
          })}
        </div>
        <button
          type="button"
          onClick={onFile}
          disabled={!isReady || !hasDraftVotes || isFilingVotes}
          className={cn(
            "mt-5 w-full min-h-12 border-4 border-on-surface px-4 py-3 font-display text-xl font-black italic uppercase shadow-[5px_5px_0px_black]",
            isReady && hasDraftVotes ? "bg-brand-lime text-on-surface" : "bg-white text-on-surface/35"
          )}
        >
          {isFilingVotes ? 'Filing...' : hasDraftVotes ? 'File My Votes' : 'Votes Filed'}
        </button>
      </div>

      {filedCelebration && (
        <motion.div
          initial={{ y: -8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="border-4 border-on-surface bg-on-surface text-white p-4 shadow-[6px_6px_0px_var(--color-brand-lime)]"
        >
          <p className="font-display text-3xl font-black italic uppercase leading-none">Votes filed.</p>
          <p className="mt-2 font-serif italic text-white/70">Your weekly opinions are now officially on record. Results unlock after voting closes.</p>
        </motion.div>
      )}
    </aside>
  );
}

function ClosedState({ phase, filedVoteCount }: { phase: string; filedVoteCount: number }) {
  return (
    <div className="border-4 border-on-surface bg-[#fff7e8] p-8 text-center shadow-[8px_8px_0px_black]">
      <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-4 border-on-surface bg-white shadow-[5px_5px_0px_black]">
        {phase === 'awards' ? <Trophy className="h-12 w-12 text-brand-orange" /> : <Lock className="h-12 w-12 text-brand-orange" />}
      </div>
      <h3 className="mt-5 font-display text-4xl font-black italic uppercase tracking-tighter">{phase === 'awards' ? 'Sealed Ballot Box' : 'Ballot Not Open Yet'}</h3>
      <p className="mx-auto mt-2 max-w-md font-serif italic text-on-surface/65">
        {phase === 'awards'
          ? 'The ballots are being counted by extremely serious people.'
          : 'Approved receipts are still collecting on the table. Come back when voting opens.'}
      </p>
      <p className="mt-4 font-mono text-[10px] font-black uppercase tracking-widest text-brand-orange">
        Completed votes on record: {filedVoteCount}
      </p>
    </div>
  );
}

function EmptyState({ reason }: { reason?: WeeklyBallotEmptyReason }) {
  const copy = getWeeklyBallotEmptyCopy(reason);
  return (
    <div className="border-4 border-dashed border-on-surface/20 bg-on-surface/[0.03] p-10 text-center">
      <Award className="mx-auto h-12 w-12 text-on-surface/25" />
      <p className="mt-4 font-display text-2xl font-black italic uppercase text-on-surface/45">{copy.title}</p>
      <p className="mt-2 font-serif italic text-on-surface/55">{copy.body}</p>
    </div>
  );
}

function ResultsState({
  winners,
  selectedCategory,
  entries
}: {
  winners: Record<string, { entryId: string; count: number; userName?: string; tripTitle?: string; fieldNote?: string; proofImage?: string }>;
  selectedCategory: VoteCategory;
  entries: Entry[];
}) {
  const winner = winners[selectedCategory];
  const winnerEntry = winner ? entries.find(entry => entry.id === winner.entryId || (entry as any).entryId === winner.entryId) : null;
  if (!winner) return <ClosedState phase="awards" filedVoteCount={0} />;

  const image = winner.proofImage || (winnerEntry ? getEntryImage(winnerEntry) : '');
  return (
    <div className="border-4 border-on-surface bg-brand-cyan/10 p-5 shadow-[8px_8px_0px_black]">
      <p className="font-mono text-[9px] font-black uppercase tracking-[0.25em] text-brand-orange">Stamp Reveal</p>
      <h3 className="mt-2 font-display text-4xl sm:text-6xl font-black italic uppercase tracking-tighter leading-none">{getCategoryMeta(selectedCategory).awardLabel}</h3>
      <div className="mt-5 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_240px] gap-5 items-stretch">
        <div className="border-4 border-on-surface bg-white p-3 shadow-[5px_5px_0px_black]">
          {image ? <img src={image} alt="" className="h-full max-h-[420px] w-full object-cover" /> : <div className="h-64 bg-on-surface/10" />}
        </div>
        <div className="border-4 border-on-surface bg-white p-5 shadow-[5px_5px_0px_black] flex flex-col justify-center">
          <Sparkles className="h-8 w-8 text-brand-orange" />
          <p className="mt-4 font-display text-3xl font-black italic uppercase leading-none">
            {winner.userName || (winnerEntry ? getEntryDisplayName(winnerEntry) : 'Winning Agent')}
          </p>
          <p className="mt-2 font-mono text-[10px] font-black uppercase tracking-widest text-on-surface/45">{winner.tripTitle || (winnerEntry ? getEntryMissionTitle(winnerEntry) : 'Field Receipt')}</p>
          <p className="mt-5 font-display text-5xl font-black italic text-brand-orange">{winner.count} votes</p>
        </div>
      </div>
    </div>
  );
}
