import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Award, Check, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { FIELD_TYPES } from '../constants';
import { cn } from '../lib/utils';
import { LEVEL_MILESTONE_REWARDS } from '../logic/playerLevel';
import {
  acknowledgeLevelUpEvent,
  subscribeToPendingLevelUpEvents,
  type PlayerLevelUpEvent,
} from '../services/playerProgressionService';

const rewardLookup = new Map(
  Object.values(LEVEL_MILESTONE_REWARDS).flat().map(reward => [reward.id, reward]),
);

export function PlayerLevelUpFeedback() {
  const { user, profile } = useApp();
  const navigate = useNavigate();
  const [events, setEvents] = React.useState<PlayerLevelUpEvent[]>([]);
  const [acknowledging, setAcknowledging] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!user) {
      setEvents([]);
      return;
    }
    return subscribeToPendingLevelUpEvents(user.uid, setEvents);
  }, [user]);

  const event = events[0];
  const reducedMotion = profile?.preferences?.motionEnabled === false
    || profile?.preferences?.rewardAnimationIntensity === 'reduced'
    || profile?.preferences?.rewardAnimationIntensity === 'minimal';
  const fieldType = profile?.fieldType ? FIELD_TYPES[profile.fieldType] : null;
  const characterImage = fieldType?.resultImagePath || fieldType?.fullImagePath || fieldType?.image || null;

  const acknowledge = async (viewRank: boolean) => {
    if (!event || acknowledging) return;
    setAcknowledging(true);
    setError(null);
    try {
      await acknowledgeLevelUpEvent(event.id);
      setEvents(current => current.filter(item => item.id !== event.id));
      if (viewRank) navigate('/profile?tab=overview');
    } catch (ackError: any) {
      setError(ackError?.message || 'Promotion acknowledgement failed.');
    } finally {
      setAcknowledging(false);
    }
  };

  return (
    <AnimatePresence>
      {event && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="level-up-title">
          <motion.div
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92, rotate: -1 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            transition={reducedMotion ? { duration: 0.01 } : { type: 'spring', stiffness: 240, damping: 22 }}
            className="skin-card w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto border-4 border-on-surface bg-paper p-5 sm:p-7 shadow-[14px_14px_0px_var(--color-brand-cyan)]"
          >
            <div className="space-y-5 text-center">
              <div className="flex items-center justify-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.25em] text-brand-orange">
                <Award className="h-4 w-4" aria-hidden="true" />
                Field Status Updated
              </div>

              {characterImage ? (
                <div className="mx-auto h-28 w-28 overflow-hidden border-4 border-on-surface bg-white shadow-[6px_6px_0px_black]">
                  <img src={characterImage} alt={`${fieldType?.name || 'Explorer'} promotion pose`} className="h-full w-full object-contain" />
                </div>
              ) : (
                <div className="mx-auto flex h-24 w-24 items-center justify-center border-4 border-on-surface bg-brand-lime shadow-[6px_6px_0px_black]">
                  <Award className="h-12 w-12" aria-hidden="true" />
                </div>
              )}

              <div className="space-y-2">
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] opacity-50">
                  Level {event.fromLevel} to Level {event.toLevel}
                </p>
                <h2 id="level-up-title" className="font-display text-3xl font-black uppercase italic leading-none tracking-tight text-on-surface">
                  You Have Been Promoted To
                </h2>
                <p className="font-display text-3xl font-black uppercase italic leading-none text-brand-magenta">
                  {event.newTitle || event.defaultTitle}
                </p>
              </div>

              {event.unlockedLevels.length > 1 && (
                <p className="border-2 border-dashed border-on-surface/30 bg-white/60 p-3 font-mono text-[10px] font-bold uppercase">
                  Multi-level jump confirmed: {event.unlockedLevels.map(level => `L${level}`).join(' / ')}
                </p>
              )}

              <div className="border-3 border-on-surface bg-white p-4 text-left shadow-[5px_5px_0px_black]">
                <p className="mb-3 font-mono text-[10px] font-black uppercase tracking-widest">Benefits Include</p>
                <ul className="space-y-2 text-sm font-bold">
                  {event.unlockedRewards.map(rewardId => {
                    const reward = rewardLookup.get(rewardId);
                    return (
                      <li key={rewardId} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" aria-hidden="true" />
                        <span>{reward?.label || rewardId}{reward?.assetStatus === 'coming_soon' ? ' (coming soon)' : ''}</span>
                      </li>
                    );
                  })}
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" aria-hidden="true" />
                    <span>Absolutely no legal authority</span>
                  </li>
                </ul>
              </div>

              {error && <p className="border-2 border-error bg-error/10 p-3 text-sm font-bold text-error" role="alert">{error}</p>}

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={acknowledging}
                  onClick={() => acknowledge(false)}
                  className={cn('min-h-11 border-3 border-on-surface bg-brand-lime px-4 py-3 font-display text-sm font-black uppercase italic shadow-[4px_4px_0px_black]', acknowledging && 'opacity-50')}
                >
                  Accept Dubious Promotion
                </button>
                <button
                  type="button"
                  disabled={acknowledging}
                  onClick={() => acknowledge(true)}
                  className={cn('flex min-h-11 items-center justify-center gap-2 border-3 border-on-surface bg-on-surface px-4 py-3 font-display text-sm font-black uppercase italic text-white shadow-[4px_4px_0px_var(--color-brand-magenta)]', acknowledging && 'opacity-50')}
                >
                  View New Rank <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
