export type MissionHintFlowState = 'idle' | 'confirming' | 'revealing' | 'revealed';
export type MissionHintFlowEvent = 'open' | 'cancel' | 'confirm' | 'success' | 'failure' | 'restore' | 'reset';

export function transitionMissionHintFlow(
  state: MissionHintFlowState,
  event: MissionHintFlowEvent,
): MissionHintFlowState {
  if (event === 'reset') return 'idle';
  if (event === 'restore' || event === 'success') return 'revealed';
  if (event === 'open' && state === 'idle') return 'confirming';
  if (event === 'confirm' && state === 'confirming') return 'revealing';
  if (event === 'cancel' && state === 'confirming') return 'idle';
  if (event === 'failure' && state === 'revealing') return 'confirming';
  return state;
}
