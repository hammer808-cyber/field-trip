import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Archive, CheckCircle2, Flame, Lock, ShieldAlert, Sparkles, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { Card } from '../components/UI';
import { TribunalCase, TribunalVote } from '../types/game';
import {
  castTribunalVote,
  getResolvedTribunalCases,
  getTribunalCases,
  getTribunalResults,
  getTribunalVotesForUser
} from '../services/tribunalService';
import { cn } from '../lib/utils';

type BoothVote = 'valid' | 'sus';

export default function SnitchCouncilPage() {
  const { user, activeSeason, currentWeekNumber, isTribunalUnlocked } = useApp();
  const [openCases, setOpenCases] = useState<TribunalCase[]>([]);
  const [closedCases, setClosedCases] = useState<TribunalCase[]>([]);
  const [resultsByCase, setResultsByCase] = useState<Record<string, any>>({});
  const [votesByCase, setVotesByCase] = useState<Record<string, BoothVote>>({});
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVoting, setIsVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const seasonId = activeSeason?.id || 'heatwave-receipts';
  const selectedCase = openCases.find(c => (c.caseId || c.id) === selectedCaseId) || openCases[0] || null;
  const selectedId = selectedCase ? selectedCase.caseId || selectedCase.id : null;
  const existingVote = selectedId ? votesByCase[selectedId] : null;

  const pageState = useMemo(() => {
    if (!isTribunalUnlocked) return 'locked';
    if (selectedCase) return existingVote ? 'vote_cast_waiting' : 'vote_booth';
    if (closedCases.length > 0) return 'resolution_archive';
    return 'lobby';
  }, [closedCases.length, existingVote, isTribunalUnlocked, selectedCase]);

  useEffect(() => {
    let cancelled = false;
    async function loadTribunal() {
      if (!user || !isTribunalUnlocked) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const [cases, resolved, results, votes] = await Promise.all([
          getTribunalCases(currentWeekNumber || 1, seasonId),
          getResolvedTribunalCases(currentWeekNumber || 1, seasonId),
          getTribunalResults(currentWeekNumber || 1, seasonId),
          getTribunalVotesForUser(user.uid)
        ]);
        if (cancelled) return;
        setOpenCases(cases);
        setClosedCases(resolved);
        setResultsByCase(results.reduce<Record<string, any>>((acc, result: any) => {
          const id = result.caseId || result.id;
          if (id) acc[id] = result;
          return acc;
        }, {}));
        setVotesByCase(
          votes.reduce<Record<string, BoothVote>>((acc, vote: TribunalVote) => {
            const legacyVote = (vote as any).vote;
            if (vote.caseId && (legacyVote === 'valid' || legacyVote === 'sus')) acc[vote.caseId] = legacyVote;
            if (vote.caseId && legacyVote === 'agree') acc[vote.caseId] = 'sus';
            if (vote.caseId && legacyVote === 'disagree') acc[vote.caseId] = 'valid';
            return acc;
          }, {})
        );
        setSelectedCaseId(cases[0]?.caseId || cases[0]?.id || null);
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Unable to load Firelight Tribunal.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    loadTribunal();
    return () => {
      cancelled = true;
    };
  }, [currentWeekNumber, isTribunalUnlocked, seasonId, user]);

  const submitVote = async (vote: BoothVote) => {
    if (!user || !selectedId || existingVote) return;
    setIsVoting(true);
    setError(null);
    try {
      await castTribunalVote(user.uid, selectedId, vote);
      setVotesByCase(prev => ({ ...prev, [selectedId]: vote }));
    } catch (err: any) {
      setError(err.message || 'Vote could not be recorded.');
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#19140f] text-[#fff8e8] pb-36">
      <div className="max-w-6xl mx-auto px-5 pt-10 space-y-8">
        <header className="flex items-start justify-between gap-4">
          <div className="space-y-4">
            <Link to="/voting" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-[#ffd08a] hover:text-white">
              <ArrowLeft className="w-4 h-4" />
              Back to Voting
            </Link>
            <div>
              <div className="flex items-center gap-3 text-[#ff9d4d]">
                <Flame className="w-6 h-6" />
                <p className="text-[10px] font-black uppercase tracking-[0.34em]">Private Signal Checks Become Public Only After Admin Review</p>
              </div>
              <h1 className="font-display text-5xl sm:text-7xl uppercase italic tracking-tight leading-none mt-3">
                Firelight Tribunal
              </h1>
              <p className="max-w-2xl mt-4 text-base sm:text-lg font-serif italic text-[#ffe2bd]/80">
                Vote the receipt, not the person. Community verdicts are recommendations; admins make the final call.
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 rounded-sm border border-[#ff9d4d]/40 bg-[#2a1c12] px-4 py-3 shadow-[6px_6px_0px_rgba(0,0,0,0.35)]">
            <Sparkles className="w-4 h-4 text-[#adff4f]" />
            <span className="text-[10px] font-black uppercase tracking-[0.22em]">Week {currentWeekNumber || 1}</span>
          </div>
        </header>

        {error && (
          <div className="border border-[#ff7676] bg-[#3b1515] text-[#ffd8d8] p-4 text-xs font-bold uppercase tracking-wider">
            {error}
          </div>
        )}

        {isLoading ? (
          <TribunalStateCard icon={<Flame className="w-10 h-10" />} title="Stoking The Fire" body="Loading reviewed case files." />
        ) : pageState === 'locked' ? (
          <TribunalStateCard
            icon={<Lock className="w-10 h-10" />}
            title="Tribunal Locked"
            body="The Firelight Tribunal opens after you have enough approved Fieldtrip progress. Sus signals stay private until then."
          />
        ) : pageState === 'lobby' ? (
          <TribunalStateCard
            icon={<ShieldAlert className="w-10 h-10" />}
            title="No Cases At The Fire"
            body="There are no admin-reviewed Signal Checks open for community review right now."
          />
        ) : (
          <main className="grid lg:grid-cols-[minmax(0,1.1fr)_360px] gap-6 items-start">
            <section className="space-y-6">
              {selectedCase && (
                <>
                  <Card className="overflow-hidden border-2 border-[#ff9d4d] bg-[#24170f] text-[#fff8e8] shadow-[12px_12px_0px_rgba(0,0,0,0.35)]">
                    <div className="aspect-[4/3] bg-black">
                      {selectedCase.proofImage ? (
                        <img src={selectedCase.proofImage} alt={selectedCase.title || 'Reviewed Fieldtrip proof'} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs uppercase tracking-[0.25em] text-[#ffe2bd]/50">No Image Snapshot</div>
                      )}
                    </div>
                    <div className="p-6 space-y-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#adff4f]">Case Briefing</p>
                          <h2 className="font-display text-4xl uppercase italic leading-none mt-2">{selectedCase.title || selectedCase.missionTitle || 'Fieldtrip Proof'}</h2>
                        </div>
                        <span className="shrink-0 text-[10px] font-black uppercase tracking-widest border border-[#ffe2bd]/30 px-3 py-2">
                          {selectedCase.status}
                        </span>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4 text-sm">
                        <div className="border border-[#ffe2bd]/15 bg-[#120d09] p-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#ff9d4d]">Mission</p>
                          <p className="mt-2 font-bold">{selectedCase.missionTitle || selectedCase.deckName || 'Fieldtrip mission'}</p>
                        </div>
                        <div className="border border-[#ffe2bd]/15 bg-[#120d09] p-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#ff9d4d]">Field Note</p>
                          <p className="mt-2 font-serif italic text-[#ffe2bd]/80">{selectedCase.fieldNote || selectedCase.description || 'No field note snapshot.'}</p>
                        </div>
                      </div>
                    </div>
                  </Card>

                  <Card className="border-2 border-[#ffe2bd] bg-[#fff8e8] text-[#19140f] p-6 shadow-[10px_10px_0px_rgba(0,0,0,0.45)]">
                    {existingVote ? (
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#bf5d00]">Vote Cast Waiting</p>
                        <h3 className="font-display text-4xl uppercase italic leading-none">Your verdict is recorded.</h3>
                        <p className="font-serif italic text-lg">
                          You voted: <strong>{existingVote === 'valid' ? 'Receipt Holds' : 'Signal Looks Off'}</strong>. Totals stay sealed until an admin closes the case.
                        </p>
                      </motion.div>
                    ) : (
                      <div className="space-y-5">
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#bf5d00]">Vote Booth</p>
                        <h3 className="font-display text-4xl uppercase italic leading-none">What does the receipt say?</h3>
                        <div className="grid sm:grid-cols-2 gap-3">
                          <button
                            disabled={isVoting}
                            onClick={() => submitVote('valid')}
                            className="border-2 border-[#19140f] bg-[#adff4f] p-5 text-left shadow-[5px_5px_0px_#19140f] disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-7 h-7 mb-3" />
                            <span className="block font-display text-2xl uppercase italic leading-none">Receipt Holds</span>
                            <span className="block mt-2 text-xs font-bold uppercase tracking-wider">Looks valid enough for community confidence.</span>
                          </button>
                          <button
                            disabled={isVoting}
                            onClick={() => submitVote('sus')}
                            className="border-2 border-[#19140f] bg-[#ff9d4d] p-5 text-left shadow-[5px_5px_0px_#19140f] disabled:opacity-50"
                          >
                            <XCircle className="w-7 h-7 mb-3" />
                            <span className="block font-display text-2xl uppercase italic leading-none">Signal Looks Off</span>
                            <span className="block mt-2 text-xs font-bold uppercase tracking-wider">Something about the proof needs admin attention.</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </Card>
                </>
              )}
            </section>

            <aside className="space-y-4">
              <Card className="p-5 border border-[#ff9d4d]/40 bg-[#21160f] text-[#fff8e8]">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#ff9d4d]">Open Case Files</p>
                <div className="mt-4 space-y-2">
                  {openCases.map(c => {
                    const id = c.caseId || c.id;
                    return (
                      <button
                        key={id}
                        onClick={() => setSelectedCaseId(id)}
                        className={cn(
                          'w-full text-left border px-3 py-3 text-sm font-bold transition-colors',
                          selectedId === id ? 'border-[#adff4f] bg-[#adff4f] text-[#19140f]' : 'border-[#ffe2bd]/15 hover:border-[#ff9d4d]'
                        )}
                      >
                        {c.title || c.missionTitle || id}
                      </button>
                    );
                  })}
                </div>
              </Card>

              <Card className="p-5 border border-[#ffe2bd]/15 bg-[#120d09] text-[#fff8e8]">
                <div className="flex items-center gap-2">
                  <Archive className="w-4 h-4 text-[#ffd08a]" />
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#ffd08a]">Resolution Archive</p>
                </div>
                <div className="mt-4 space-y-3">
                  {closedCases.length === 0 ? (
                    <p className="text-xs text-[#ffe2bd]/60">No finalized case snapshots this week.</p>
                  ) : closedCases.map(c => {
                    const id = c.caseId || c.id;
                    const result = resultsByCase[id];
                    return (
                    <div key={id} className="border border-[#ffe2bd]/10 p-3 text-xs">
                      <p className="font-black uppercase">{c.title || c.missionTitle || c.id}</p>
                      <p className="mt-1 text-[#ffe2bd]/65">
                        {result ? `Finalized Reveal · ${result.outcome || c.outcome || 'closed'} · ${Number(result.totalVotes || 0)} votes` : 'Closed · result snapshot pending'}
                      </p>
                    </div>
                    );
                  })}
                </div>
              </Card>
            </aside>
          </main>
        )}
      </div>
    </div>
  );
}

function TribunalStateCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <Card className="min-h-[420px] border-2 border-[#ff9d4d] bg-[#24170f] text-[#fff8e8] p-10 flex flex-col items-center justify-center text-center gap-6 shadow-[14px_14px_0px_rgba(0,0,0,0.35)]">
      <div className="p-5 border-2 border-[#ffe2bd] bg-[#3a2112] text-[#ff9d4d]">{icon}</div>
      <div>
        <h2 className="font-display text-5xl uppercase italic leading-none">{title}</h2>
        <p className="mt-4 max-w-xl font-serif italic text-lg text-[#ffe2bd]/75">{body}</p>
      </div>
    </Card>
  );
}
