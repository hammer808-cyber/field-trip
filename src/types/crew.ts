import type { CrewMemberRole, CrewMemberStatus, CrewMode, CrewPrivacy, CrewStatus } from '../logic/crewSystem';
import type { ZineEdition } from './zine';
export type { CrewMemberRole, CrewMemberStatus, CrewMode, CrewPrivacy, CrewStatus, CrewZineStatus } from '../logic/crewSystem';

export interface Crew {
  id: string;
  name: string;
  slug?: string;
  motto?: string;
  icon?: string;
  badge?: string; // URL to badge image or SVG string
  members: string[]; // User IDs, compatibility roster
  memberCount?: number;
  memberLimit?: number;
  founderId?: string;
  captainId?: string;
  captainIds?: string[];
  creatorId?: string;
  mode?: CrewMode;
  privacy?: CrewPrivacy;
  allowMemberInvites?: boolean;
  allowCaptainRoleManagement?: boolean;
  autoApproveShareLinks?: boolean;
  status?: CrewStatus;
  activeSeasonId?: string;
  createdAt: any;
  updatedAt?: any;
  currentSeason: string;
}

export interface CrewMember {
  userId: string;
  crewId?: string;
  role: CrewMemberRole;
  status: CrewMemberStatus;
  joinedAt: any;
  crewEligibleFrom: any;
  displayNameSnapshot?: string;
  usernameSnapshot?: string | null;
  avatarSnapshot?: any;
  removedBy?: string;
  removedAt?: any;
  leftAt?: any;
  displayName?: string;
  seasonEligibility?: Record<string, any>;
}

export interface CrewInvite {
  id: string;
  crewId: string;
  inviterId: string;
  inviteeUserId?: string | null;
  type: 'direct' | 'share_link';
  token?: string;
  status: 'pending' | 'accepted' | 'declined' | 'revoked' | 'expired';
  expiresAt: any;
  createdAt: any;
  acceptedAt?: any;
  declinedAt?: any;
  revokedAt?: any;
  inviteeSnapshot?: any;
  crew?: Partial<Crew> | null;
}

export interface CrewJoinRequest {
  id: string;
  crewId: string;
  userId: string;
  status: 'pending' | 'approved' | 'declined' | 'cancelled';
  createdAt: any;
  resolvedAt?: any;
  resolvedBy?: string | null;
  applicantSnapshot?: any;
}

export interface CrewRosterState {
  crew: Crew | null;
  viewerMembership: CrewMember | null;
  permissions: {
    canInvite: boolean;
    canApproveRequests: boolean;
    canTransferCaptain?: boolean;
    canPromoteCaptains: boolean;
    canRemoveMembers: boolean;
  };
  members: CrewMember[];
  pendingInvites: CrewInvite[];
  pendingRequests: CrewJoinRequest[];
}

export interface CrewDiscoveryState {
  crews: Crew[];
  viewer: {
    activeCrewId: string | null;
    cooldownUntil?: any;
  };
}

export type CrewSeasonZine = ZineEdition;

export interface CrewMembershipState {
  crew: Crew | null;
  membership: CrewMember | null;
  zine: CrewSeasonZine | null;
  cooldownUntil?: any;
}

export interface CrewLore {
  crewId: string;
  insideJokes: string[];
  seasonStats: Record<string, CrewSeasonStats>; // seasonId -> stats
  highlights: {
    mostSuspiciousEntry?: string; // entryId
    biggestComeback?: string; // blurb
    mostFieldChecksSurvived?: number;
    mostChaoticTrip?: string; // blurb
    mostReliableExplorer?: string; // userId
    mostDramaticDetour?: string; // eventId
  };
  notes: string[]; // Lore blurbs
}

export interface CrewSeasonStats {
  totalCompletedChallenges: number;
  totalApprovedEntries: number;
  totalRejectedEntries: number;
  scoreHistory: { date: string; score: number }[];
  rankHistory: { date: string; rank: number }[];
  favoriteCategory?: string;
  mostActiveMember?: string; // userId
  leastPredictableMember?: string; // userId
  bestProofSubmission?: string; // entryId
  mostCursedProofSubmission?: string; // entryId
}

export interface CrewDispatch {
  id: string;
  crewId: string;
  seasonId: string;
  finalRank: number;
  finalScore: number;
  summary: {
    recapParagraph: string;
    awards: string[];
    bestEntry: string;
    worstEntry?: string;
    funnyQuote?: string;
  };
  createdAt: string;
  isUnlocked: boolean;
}
