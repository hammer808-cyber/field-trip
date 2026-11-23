import { RewardIntensity, type RewardQueueItem } from '../types/feedback';

/**
 * One combined submit confirmation (Nov 23, 2026, Zach's call): a single
 * submission used to queue four separate micro toasts — "Field
 * Intelligence" (the optimistic local entry), "Protocol Logged" /
 * "Evidence Logged" (the addEntry status branch), and "SUBMIT PROOF
 * SUCCESS" + "ADD FIELD_NOTE SUCCESS" (the Field Pulse registrations).
 * Five black "Trevor noticed" cards stacked for one submit. Now the submit
 * path queues exactly one of these instead; the pulse bookkeeping still
 * runs (silenced), and sticker awards still celebrate on their own.
 */
export interface SubmitConfirmationInput {
  /** Mission title, e.g. "The Park Oasis". Shown so the toast names the mission. */
  missionTitle: string;
  hasFieldNote: boolean;
  hasVoiceNote: boolean;
  status: 'approved' | 'pending_review' | string;
  /** Total points for this submission (base + layers + bonus). */
  totalPoints: number;
}

export function buildSubmitConfirmation(
  input: SubmitConfirmationInput,
): Omit<RewardQueueItem, 'id'> {
  const title = (input.missionTitle || 'Your receipt').trim() || 'Your receipt';
  const proofLine = input.hasFieldNote
    ? 'Photo and field note received.'
    : input.hasVoiceNote
      ? 'Photo and voice note received.'
      : 'Photo received.';

  if (input.status === 'approved') {
    return {
      type: 'action',
      intensity: RewardIntensity.MICRO_FEEDBACK,
      title: 'Evidence Logged',
      description:
        input.totalPoints > 0
          ? `"${title}" approved. +${input.totalPoints} XP in.`
          : `"${title}" approved. Field data captured and verified.`,
      iconName: 'ClipboardCheck',
    };
  }

  return {
    type: 'action',
    intensity: RewardIntensity.MICRO_FEEDBACK,
    title: 'Proof In',
    description: `"${title}" is in. ${proofLine} Trevor is reviewing the tiny evidence.`,
    iconName: 'ClipboardCheck',
  };
}
