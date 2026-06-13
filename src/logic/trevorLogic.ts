import { UserProfile } from '../services/userService';
import { TripCard } from '../types/challenges';

export interface TrevorGuideAction {
  label: string;
  route?: string;
  action?: () => void;
  type?: 'restartMission' | 'navigate' | 'highlight';
  target?: string;
}

export interface TrevorGuideState {
  message: string;
  primaryAction: TrevorGuideAction;
  secondaryAction?: TrevorGuideAction | null;
  tone?: 'normal' | 'warning' | 'celebration' | 'stuck';
  reason?: string;
}

interface TrevorParams {
  currentRoute: string;
  user: any;
  profile: UserProfile | null;
  activeMission: TripCard | null;
  starterApprovedCount: number;
  starterPendingCount: number;
  starterSubmittedUniqueCount: number;
  needsMoreProofCount: number;
  rejectedCount?: number;
  actionableStarterProof?: {
    id: string;
    missionId: string;
    status: string;
  } | null;
  legalComplete: boolean;
  personaComplete: boolean;
  canUseHeatwaveDeck: boolean;
  canUseSocalSummerDeck?: boolean;
  onboardingCompleted: boolean;
  hasActiveMission: boolean;
  isVotingOpen?: boolean;
}

export function getTrevorGuideState(params: TrevorParams): TrevorGuideState | null {
  const {
    currentRoute,
    profile,
    activeMission,
    starterApprovedCount,
    starterSubmittedUniqueCount,
    needsMoreProofCount,
    rejectedCount = 0,
    actionableStarterProof,
    legalComplete,
    personaComplete,
    canUseHeatwaveDeck,
    canUseSocalSummerDeck = false,
    hasActiveMission,
    isVotingOpen = false,
    user
  } = params;

  // DIAGNOSTIC LOGGING
  console.log(`[TrevorAction] userId: ${user?.uid}`);
  console.log(`[TrevorAction] legalComplete: ${legalComplete}`);
  console.log(`[TrevorAction] personaComplete: ${personaComplete}`);
  console.log(`[TrevorAction] starterSubmittedUniqueCount: ${starterSubmittedUniqueCount}`);
  console.log(`[TrevorAction] starterApprovedCount: ${starterApprovedCount}`);
  console.log(`[TrevorAction] actionableProofStatus: ${actionableStarterProof?.status || 'none'}`);

  const state = ((): TrevorGuideState | null => {
    // 1. EXCLUSIONS: Do not show on auth, etc.
    const isExcludedPage = ['/', '/login', '/signup', '/banned'].some(p => currentRoute === p);
    if (isExcludedPage) return null;

    // PRIORITY 1: Legal Gate
    if (!legalComplete) {
      return {
        message: "The bureaucratic wheels are stuck. Finish your registration and sign the legal framework to authorize your field credentials.",
        primaryAction: { label: 'Finish Setup', route: '/' },
        reason: 'legal_required',
        tone: 'warning'
      };
    }

    // PRIORITY 2: Persona Quiz
    if (!personaComplete) {
      return {
        message: "Credentials incomplete! Calibrate your behavioral profile and identify your explorer persona before the Bureau issues your full Field Kit.",
        primaryAction: { label: 'Choose Your Field Type', route: '/classification' },
        reason: 'persona_required',
        tone: 'warning'
      };
    }

    // PRIORITY 3: Starter Needs More Proof
    if (starterApprovedCount < 3 && actionableStarterProof && actionableStarterProof.status === 'needs_more_proof') {
      return {
        message: "Proof needs a little more evidence. Open the mission and add what is missing to satisfy the audit board.",
        primaryAction: { 
          label: 'Fix Proof', 
          route: `/capture/${actionableStarterProof.missionId}?mode=repair&entryId=${actionableStarterProof.id}` 
        },
        reason: 'starter_needs_more_proof',
        tone: 'warning'
      };
    }

    // PRIORITY 4: Starter Rejected
    if (starterApprovedCount < 3 && actionableStarterProof && actionableStarterProof.status === 'rejected') {
      return {
        message: "This one got bounced. The Bureau is strict during onboarding. Retry the mission with a clearer receipt to stabilized your record.",
        primaryAction: { 
          label: 'Retry Mission', 
          route: `/capture/${actionableStarterProof.missionId}?mode=retry&entryId=${actionableStarterProof.id}` 
        },
        reason: 'starter_rejected',
        tone: 'warning'
      };
    }

    // PRIORITY 5: Next Starter Mission Draw
    if (starterSubmittedUniqueCount < 3) {
      let label = "Start First Mission";
      let body = "Draw your first Starter mission. Three receipts unlock the rest of the field.";
      if (starterSubmittedUniqueCount === 1) {
        label = "Start Next Starter Mission";
        body = "One signal sent. Keep going. Two more Starter receipts get you through onboarding.";
      } else if (starterSubmittedUniqueCount === 2) {
        label = "Start Final Starter Mission";
        body = "One more Starter receipt. Finish the third Starter mission, then wait for approval.";
      }

      return {
        message: body,
        primaryAction: { label, route: '/deck?deck=starter-signals&action=draw' },
        reason: 'starter_draw_next'
      };
    }

    // PRIORITY 6: Starter Pending Review
    if (starterSubmittedUniqueCount === 3 && starterApprovedCount < 3) {
      return {
        message: "Starter proofs submitted. Your receipts are waiting for review. Heatwave unlocks after approval.",
        primaryAction: { label: 'View Review Status', route: '/logbook?filter=starter' },
        reason: 'starter_pending_review'
      };
    }

    // PRIORITY 7: Starter Complete / Enter Heatwave
    if (starterApprovedCount >= 3) {
      if (!hasActiveMission) {
        return {
          message: "Starter training complete! Field clearance granted. The Heatwave Receipts seasonal deck is now fully decrypted.",
          primaryAction: { label: 'Enter Heatwave', route: '/deck?deck=heatwave-receipts' },
          reason: 'starter_complete',
          tone: 'celebration'
        };
      }
    }

    // RULE G: If Voting is open, guide user to vote.
    if (isVotingOpen) {
      return {
        message: "Field reports are waiting for judgment. Your vote is the only law in these parts. Step into the Council.",
        primaryAction: { label: 'Vote Now', route: '/voting/ballot' },
        reason: 'voting_open'
      };
    }

    // DEFAULT
    return {
      message: 'Systems nominal, agent. All signals clear. What\'s our next move? New mission or checking standings?',
      primaryAction: { label: 'Start Mission', route: '/deck' },
      reason: 'default_mission'
    };
  })();

  if (state) {
    console.log(`[TrevorAction] selectedLabel: ${state.primaryAction.label}`);
    console.log(`[TrevorAction] selectedRoute: ${state.primaryAction.route}`);
    console.log(`[TrevorAction] reason: ${state.reason}`);
  }

  return state;
}
