// Sharing an achievement (P1-11, audit §12).
//
// The legendary reveal (MajorReveal in RewardFeedback) is the one share
// path in the app: system share sheet where available, copy-link fallback
// where it isn't. Sharing never dismisses the celebration and never touches
// the once-per-device celebration keys — dismissReward still owns those —
// so a share can neither close the modal nor make it re-fire.

export interface AchievementShareData {
  title: string;
  text: string;
  url: string;
}

export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'unavailable';

export interface ShareApi {
  /** Defaults to true when omitted: the platform accepts the payload. */
  canShare?: (data: AchievementShareData) => boolean;
  /** The system share sheet. Absent where the platform has none. */
  share?: (data: AchievementShareData) => Promise<void>;
  /** Copy-to-clipboard fallback. Absent where clipboard is unavailable. */
  copy?: (text: string) => Promise<void>;
}

/** The navigator-backed API for the running browser. */
export function defaultShareApi(): ShareApi {
  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  return {
    canShare: (data) =>
      typeof (nav as any)?.canShare === 'function'
        ? (nav as any).canShare(data)
        : typeof (nav as any)?.share === 'function',
    share: async (data) => {
      await (nav as any).share(data);
    },
    copy: async (text) => {
      await nav?.clipboard?.writeText(text);
    },
  };
}

export function buildAchievementShareData(
  reward: { title: string; rewardText?: string; rarity?: string; type?: string },
  origin: string
): AchievementShareData {
  const name = reward.rewardText || reward.title;
  const kind = reward.rarity === 'legendary' ? 'legendary ' : '';
  const what = reward.type === 'sticker' ? 'sticker' : 'reward';
  return {
    title: 'Fieldtrip',
    text: `I just unlocked a ${kind}${what} — ${name} — on Fieldtrip!`,
    url: origin.replace(/\/$/, ''),
  };
}

export async function shareAchievement(
  data: AchievementShareData,
  api: ShareApi
): Promise<ShareOutcome> {
  const canShare = api.canShare ? api.canShare(data) : typeof api.share === 'function';
  if (api.share && canShare) {
    try {
      await api.share(data);
      return 'shared';
    } catch (error: any) {
      // The user dismissed the sheet on purpose — stay quiet, do not
      // fall through to the clipboard copy they did not ask for.
      if (error?.name === 'AbortError') return 'cancelled';
    }
  }
  if (api.copy) {
    try {
      await api.copy(`${data.text} ${data.url}`);
      return 'copied';
    } catch {
      return 'unavailable';
    }
  }
  return 'unavailable';
}
