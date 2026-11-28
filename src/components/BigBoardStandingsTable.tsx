import React from 'react';
import { Flame } from 'lucide-react';
import { cn } from '../lib/utils';
import { AvatarPreview } from './AvatarPreview';
import { DEFAULT_AVATAR } from '../constants/avatarAssets';
import type { AvatarData } from '../types/avatar';
import { getLevelProgress } from '../logic/playerLevel';
import { FieldStamp } from './FieldStamp';

export interface StandingsPlayer {
  id: string;
  name: string;
  weeklyXp: number;
  lifetimeXp: number;
  avatar?: AvatarData | null;
  /** Server-maintained consecutive approval days (the value behind the
   *  streak chip). The ranking payload may also carry it as
   *  `streakDays`; both are read. */
  approvalStreakDays?: number;
  streakDays?: number;
  /** Progression rewards; the level-4 Big Board border still shows as
   *  an orange ring on the avatar (the old card row's border). */
  progressionRewardIds?: string[];
}

interface BigBoardStandingsTableProps {
  players: StandingsPlayer[];
  currentUserId?: string | null;
}

/**
 * The match scoreboard as a ruled table — Field Manual chrome
 * (Nov 21, 2026). Replaces the stacked player cards in Big Board's
 * GLOBAL_RANKINGS section. Columns: RANK / SCOUT / LEVEL / STREAKS /
 * SCORE. The leader row is lime; rank 1 gets a 1ST stamp (decorative —
 * the rank number is the real information). The mock's BADGES column
 * is LEVEL instead: no per-player badge count exists in the ranking
 * payload, and level is the real per-player mark. Five columns scroll
 * horizontally on phones instead of crushing.
 */
export function BigBoardStandingsTable({ players, currentUserId }: BigBoardStandingsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-left">
        <thead>
          <tr className="border-b-[3px] border-[var(--skin-border)] font-mono text-xs font-black uppercase tracking-[0.2em] text-[var(--skin-text-muted)]">
            <th scope="col" className="px-3 py-2">Rank</th>
            <th scope="col" className="px-3 py-2">Scout</th>
            <th scope="col" className="px-3 py-2">Level</th>
            <th scope="col" className="px-3 py-2">Streaks</th>
            <th scope="col" className="px-3 py-2 text-right">Score</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player, idx) => {
            const rank = idx + 1;
            const isMe = player.id === currentUserId;
            const level = getLevelProgress(player.lifetimeXp || 0);
            const streak = Math.max(
              0,
              Math.floor(Number(player.approvalStreakDays ?? player.streakDays ?? 0) || 0),
            );
            const hasMilestoneBorder = (player.progressionRewardIds || []).includes(
              'level-4-big-board-border',
            );
            return (
              <tr
                key={player.id}
                className={cn(
                  'border-b-2 border-[var(--skin-border)]',
                  rank === 1
                    ? 'bg-[var(--skin-secondary)]'
                    : isMe
                      ? 'bg-[var(--skin-surface-muted)]'
                      : 'bg-[var(--skin-surface)]',
                )}
              >
                <td className="px-3 py-3 font-poppins text-xl font-black italic leading-none text-[var(--skin-text)]">
                  <span className="inline-flex items-center gap-2">
                    #{rank}
                    {rank === 1 && <FieldStamp label="1ST" />}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <span className="flex min-w-0 items-center gap-2">
                    <AvatarPreview
                      avatar={player.avatar || DEFAULT_AVATAR}
                      size="sm"
                      className={cn(
                        'h-8 w-8 shrink-0 rounded-lg border-2 border-[var(--skin-border)]',
                        hasMilestoneBorder && 'ring-2 ring-brand-orange/30 ring-offset-2',
                      )}
                    />
                    <span className="truncate font-poppins text-base font-black uppercase italic leading-none text-[var(--skin-text)]">
                      {player.name}
                      {isMe && (
                        <span className="ml-1 font-mono text-xs font-black uppercase text-[var(--skin-primary)]">
                          (YOU)
                        </span>
                      )}
                    </span>
                  </span>
                </td>
                <td className="px-3 py-3">
                  <span className="inline-flex border-2 border-[var(--skin-border)] bg-[var(--skin-surface)] px-2 py-0.5 font-mono text-xs font-black uppercase text-[var(--skin-text)]">
                    Level {level.level}
                  </span>
                </td>
                <td className="px-3 py-3 font-mono text-xs font-black uppercase text-[var(--skin-text)]">
                  {streak > 0 ? (
                    <span className="inline-flex items-center gap-1">
                      <Flame size={14} aria-hidden="true" className="text-[var(--skin-primary)]" />
                      {streak}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-3 py-3 text-right font-poppins text-xl font-black italic leading-none text-[var(--skin-text)]">
                  {player.weeklyXp} XP
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
