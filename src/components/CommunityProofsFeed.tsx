import React, { useEffect, useMemo, useState } from 'react';
import { CameraOff } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CommunityProofCard } from './CommunityProofCard';
import { subscribeToPublicProofs } from '../services/activityService';
import { normalizeEntryStatus } from '../logic/entryLogic';
import { getCommunityFeedApprovedTime, isCommunityFeedEligible } from '../logic/communityFeed';
import { isCrewProofEligible } from '../logic/proofDistribution';
import { cn } from '../lib/utils';

type FeedFilter = 'latest' | 'hyped' | 'week' | 'season' | 'crew';

export function CommunityProofsFeed() {
  const { activeSeason, profile } = useApp();
  const [publicProofs, setPublicProofs] = useState<any[]>([]);
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('latest');
  const crewId = (profile as any)?.activeCrewId || (profile as any)?.crewId || null;

  useEffect(() => {
    const unsub = subscribeToPublicProofs(30, (entries: any[]) => {
      setPublicProofs(entries);
    });
    return () => unsub();
  }, []);

  const communityFeedProofs = useMemo(() => {
    const seasonStart = activeSeason?.startDate ? new Date(activeSeason.startDate as any).getTime() : 0;
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    let items = publicProofs.filter(isCommunityFeedEligible);

    if (feedFilter === 'week') {
      items = items.filter(entry => getCommunityFeedApprovedTime(entry) >= weekAgo);
    } else if (feedFilter === 'season' && seasonStart > 0) {
      items = items.filter(entry => getCommunityFeedApprovedTime(entry) >= seasonStart);
    } else if (feedFilter === 'crew' && crewId) {
      items = items.filter(entry => isCrewProofEligible(entry, crewId));
    }

    return items.sort((a: any, b: any) => {
      if (feedFilter === 'hyped') {
        const aHype = Number(a.likeCount || a.hypeCount || 0);
        const bHype = Number(b.likeCount || b.hypeCount || 0);
        if (bHype !== aHype) return bHype - aHype;
      }
      return getCommunityFeedApprovedTime(b) - getCommunityFeedApprovedTime(a);
    });
  }, [activeSeason?.startDate, crewId, feedFilter, publicProofs]);

  return (
    <section className="space-y-10">
      <div className="text-center space-y-3">
        <h2 className="text-3xl sm:text-6xl font-display font-black uppercase italic tracking-tighter text-on-surface leading-tight">
          Community Proofs
        </h2>
        <p className="font-serif italic text-base sm:text-lg text-on-surface/55 px-4 leading-relaxed">
          Approved receipts from people who went outside and found something.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2 pt-3">
          {[
            ['latest', 'Latest'],
            ['hyped', 'Most Hyped'],
            ['week', 'This Week'],
            ['season', 'This Season'],
            ...(crewId ? [['crew', 'My Crew']] : []),
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFeedFilter(id as FeedFilter)}
              className={cn(
                "px-4 py-2 border-2 border-on-surface font-mono text-[10px] font-black uppercase tracking-widest shadow-[3px_3px_0px_black] transition-transform active:translate-y-0.5 active:shadow-none",
                feedFilter === id ? "bg-brand-lime text-on-surface" : "bg-white text-on-surface/60 hover:text-on-surface"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {communityFeedProofs.length === 0 ? (
        <div className="max-w-xl mx-auto py-16 text-center space-y-4 bg-white border-4 border-on-surface p-8 rounded-[1.5rem] shadow-[8px_8px_0px_black] relative">
          <div className="absolute top-2 right-2 text-on-surface/5 font-mono text-[9px] font-black uppercase tracking-widest">
            COMMUNITY_EMPTY
          </div>
          <div className="inline-flex items-center justify-center w-12 h-12 bg-brand-yellow/10 border-4 border-on-surface rounded-full shadow-[3px_3px_0px_black]">
            <CameraOff className="w-6 h-6 text-brand-orange animate-pulse" />
          </div>
          <div className="space-y-2">
            <p className="font-outfit text-base font-black uppercase tracking-widest text-on-surface italic">
              Silent Spectrum
            </p>
            <p className="text-xs font-sans text-on-surface/70 leading-relaxed">
              No receipts on the board yet. Somebody go outside and make this place interesting.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 pb-12">
          {communityFeedProofs.map((proof) => (
            <CommunityProofCard key={proof.id} proof={proof} normalizeEntryStatus={normalizeEntryStatus} />
          ))}
        </div>
      )}
    </section>
  );
}
