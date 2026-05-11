import { Challenge } from '../constants';

export interface SnitchEvent {
  id: string;
  senderId: string;
  targetId: string;
  targetName: string;
  type: 'delay' | 'penalty' | 'extra-task';
  status: 'active' | 'resolved';
  createdAt: string;
}

export function generateSnitchEffect(targetName: string): SnitchEvent {
  const types: SnitchEvent['type'][] = ['delay', 'penalty', 'extra-task'];
  const type = types[Math.floor(Math.random() * types.length)];
  
  return {
    id: `snitch-${Date.now()}`,
    senderId: 'user-1',
    targetId: 'target-id', // Mock target
    targetName: targetName,
    type,
    status: 'active',
    createdAt: new Date().toISOString()
  };
}

export function getSnitchDescription(type: SnitchEvent['type']): { title: string; desc: string; icon: string } {
  switch (type) {
    case 'delay':
      return { 
        title: 'Bureau Red Tape', 
        desc: 'Your next transmission will be throttled by 10 seconds of processing.',
        icon: 'Timer'
      };
    case 'penalty':
      return { 
        title: 'Petty Tax Applied', 
        desc: 'A -10 XP deduction for your next contribution.',
        icon: 'ShieldAlert'
      };
    case 'extra-task':
      return { 
        title: 'Subject to Petty Weather', 
        desc: 'Additional Field Note requirement: Describe the texture of the environment.',
        icon: 'Zap'
      };
    default:
      return { title: 'Unknown Anomaly', desc: 'Something is slightly off.', icon: 'AlertTriangle' };
  }
}

export function canSnitch(lastSnitchDate: string | null): boolean {
  if (!lastSnitchDate) return true;
  
  const lastDate = new Date(lastSnitchDate);
  const now = new Date();
  
  // Can only snitch once per 24h
  const diffHours = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60);
  return diffHours >= 24;
}
