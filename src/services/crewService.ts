import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  onSnapshot,
  arrayUnion,
  increment
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { authenticatedFetch } from '../lib/api';
import { Crew, CrewLore, CrewDispatch, CrewInvite, CrewJoinRequest, CrewMembershipState, CrewRosterState, CrewDiscoveryState } from '../types/crew';
import { Entry } from '../constants';
import type { CrewMode, CrewPrivacy } from '../logic/crewSystem';

const CREWS_COLLECTION = 'crews';
const LORE_COLLECTION = 'crewLore';
const DISPATCH_COLLECTION = 'crewDispatches';

async function readCrewResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || payload.error || fallbackMessage);
  }
  return payload as T;
}

export async function getCurrentCrewMembership(): Promise<CrewMembershipState> {
  const response = await authenticatedFetch('/api/crew/current');
  return readCrewResponse<CrewMembershipState>(response, `Crew membership lookup failed with HTTP ${response.status}`);
}

export async function createCrew(input: {
  name: string;
  motto?: string;
  icon?: string;
  mode?: CrewMode;
  privacy?: CrewPrivacy;
}): Promise<CrewMembershipState> {
  const response = await authenticatedFetch('/api/crew/create', {
    method: 'POST',
    body: JSON.stringify(input)
  });
  return readCrewResponse<CrewMembershipState>(response, `Crew creation failed with HTTP ${response.status}`);
}

export async function leaveCrew(reason = 'User left Crew.'): Promise<{ success: boolean; cooldownUntil: any }> {
  const response = await authenticatedFetch('/api/crew/leave', {
    method: 'POST',
    body: JSON.stringify({ reason })
  });
  return readCrewResponse<{ success: boolean; cooldownUntil: any }>(response, `Crew leave failed with HTTP ${response.status}`);
}

export async function getCrewMembers(crewId: string): Promise<CrewRosterState> {
  const response = await authenticatedFetch(`/api/crew/members?crewId=${encodeURIComponent(crewId)}`);
  return readCrewResponse<CrewRosterState>(response, `Crew roster failed with HTTP ${response.status}`);
}

export async function searchCrewInviteUsers(crewId: string, q: string): Promise<Array<{ userId: string; displayName: string; username?: string | null; avatar?: any }>> {
  const response = await authenticatedFetch(`/api/crew/search-users?crewId=${encodeURIComponent(crewId)}&q=${encodeURIComponent(q)}`);
  const payload = await readCrewResponse<{ users: Array<{ userId: string; displayName: string; username?: string | null; avatar?: any }> }>(response, `Crew user search failed with HTTP ${response.status}`);
  return payload.users;
}

export async function createDirectCrewInvite(crewId: string, inviteeUserId: string): Promise<CrewInvite> {
  const response = await authenticatedFetch('/api/crew/invites/direct', {
    method: 'POST',
    body: JSON.stringify({ crewId, inviteeUserId })
  });
  const payload = await readCrewResponse<{ invite: CrewInvite }>(response, `Crew direct invite failed with HTTP ${response.status}`);
  return payload.invite;
}

export async function generateCrewInviteLink(crewId: string): Promise<{ invite: CrewInvite; inviteUrl: string }> {
  const response = await authenticatedFetch('/api/crew/invites/link', {
    method: 'POST',
    body: JSON.stringify({ crewId })
  });
  return readCrewResponse<{ invite: CrewInvite; inviteUrl: string }>(response, `Crew invite link failed with HTTP ${response.status}`);
}

export async function revokeCrewInviteLink(inviteId: string): Promise<void> {
  const response = await authenticatedFetch(`/api/crew/invites/${encodeURIComponent(inviteId)}/revoke`, { method: 'POST' });
  await readCrewResponse<{ success: boolean }>(response, `Crew invite revoke failed with HTTP ${response.status}`);
}

export async function getIncomingCrewInvites(): Promise<CrewInvite[]> {
  const response = await authenticatedFetch('/api/crew/invites/incoming');
  const payload = await readCrewResponse<{ invites: CrewInvite[] }>(response, `Incoming Crew invites failed with HTTP ${response.status}`);
  return payload.invites;
}

export async function acceptCrewInvite(inviteId: string): Promise<{ success: boolean; crewId: string }> {
  const response = await authenticatedFetch(`/api/crew/invites/${encodeURIComponent(inviteId)}/accept`, { method: 'POST' });
  return readCrewResponse<{ success: boolean; crewId: string }>(response, `Crew invite accept failed with HTTP ${response.status}`);
}

export async function declineCrewInvite(inviteId: string): Promise<void> {
  const response = await authenticatedFetch(`/api/crew/invites/${encodeURIComponent(inviteId)}/decline`, { method: 'POST' });
  await readCrewResponse<{ success: boolean }>(response, `Crew invite decline failed with HTTP ${response.status}`);
}

export async function getCrewInviteByToken(token: string): Promise<any> {
  const response = await authenticatedFetch(`/api/crew/invite-token/${encodeURIComponent(token)}`);
  return readCrewResponse<any>(response, `Crew invite token lookup failed with HTTP ${response.status}`);
}

export async function joinCrewByInviteToken(token: string): Promise<any> {
  const response = await authenticatedFetch(`/api/crew/invite-token/${encodeURIComponent(token)}/join`, { method: 'POST' });
  return readCrewResponse<any>(response, `Crew invite join failed with HTTP ${response.status}`);
}

export async function requestToJoinCrew(crewId: string): Promise<{ success: boolean; requestId: string }> {
  const response = await authenticatedFetch('/api/crew/join-requests', {
    method: 'POST',
    body: JSON.stringify({ crewId })
  });
  return readCrewResponse<{ success: boolean; requestId: string }>(response, `Crew join request failed with HTTP ${response.status}`);
}

export async function discoverCrews(): Promise<CrewDiscoveryState> {
  const response = await authenticatedFetch('/api/crew/discover');
  return readCrewResponse<CrewDiscoveryState>(response, `Crew discovery failed with HTTP ${response.status}`);
}

export async function getOutgoingCrewJoinRequests(): Promise<CrewJoinRequest[]> {
  const response = await authenticatedFetch('/api/crew/join-requests/outgoing');
  const payload = await readCrewResponse<{ requests: CrewJoinRequest[] }>(response, `Outgoing Crew requests failed with HTTP ${response.status}`);
  return payload.requests;
}

export async function approveCrewJoinRequest(requestId: string): Promise<void> {
  const response = await authenticatedFetch(`/api/crew/join-requests/${encodeURIComponent(requestId)}/approve`, { method: 'POST' });
  await readCrewResponse<{ success: boolean }>(response, `Crew join request approve failed with HTTP ${response.status}`);
}

export async function declineCrewJoinRequest(requestId: string): Promise<void> {
  const response = await authenticatedFetch(`/api/crew/join-requests/${encodeURIComponent(requestId)}/decline`, { method: 'POST' });
  await readCrewResponse<{ success: boolean }>(response, `Crew join request decline failed with HTTP ${response.status}`);
}

export async function cancelCrewJoinRequest(requestId: string): Promise<void> {
  const response = await authenticatedFetch(`/api/crew/join-requests/${encodeURIComponent(requestId)}/cancel`, { method: 'POST' });
  await readCrewResponse<{ success: boolean }>(response, `Crew join request cancel failed with HTTP ${response.status}`);
}

export async function promoteCrewMemberToCaptain(crewId: string, targetUserId: string): Promise<void> {
  const response = await authenticatedFetch(`/api/crew/members/${encodeURIComponent(targetUserId)}/transfer-captain`, {
    method: 'POST',
    body: JSON.stringify({ crewId })
  });
  await readCrewResponse<{ success: boolean }>(response, `Crew promote captain failed with HTTP ${response.status}`);
}

export const transferCrewCaptain = promoteCrewMemberToCaptain;

export async function removeCrewCaptainRole(crewId: string, targetUserId: string): Promise<void> {
  const response = await authenticatedFetch(`/api/crew/members/${encodeURIComponent(targetUserId)}/remove-captain`, {
    method: 'POST',
    body: JSON.stringify({ crewId })
  });
  await readCrewResponse<{ success: boolean }>(response, `Crew remove captain failed with HTTP ${response.status}`);
}

export async function removeCrewMember(crewId: string, targetUserId: string): Promise<void> {
  const response = await authenticatedFetch(`/api/crew/members/${encodeURIComponent(targetUserId)}/remove-member`, {
    method: 'POST',
    body: JSON.stringify({ crewId })
  });
  await readCrewResponse<{ success: boolean }>(response, `Crew remove member failed with HTTP ${response.status}`);
}

export async function updateCrewSettings(crewId: string, input: {
  name: string;
  motto?: string;
  mode: CrewMode;
  privacy: CrewPrivacy;
  allowMemberInvites: boolean;
  autoApproveShareLinks: boolean;
}): Promise<Crew> {
  const response = await authenticatedFetch('/api/crew/settings', {
    method: 'PATCH',
    body: JSON.stringify({ crewId, ...input }),
  });
  const payload = await readCrewResponse<{ crew: Crew }>(response, `Crew settings failed with HTTP ${response.status}`);
  return payload.crew;
}

export async function disbandCrew(crewId: string, reason: string): Promise<void> {
  const response = await authenticatedFetch('/api/crew/disband', {
    method: 'POST',
    body: JSON.stringify({ crewId, reason }),
  });
  await readCrewResponse<{ success: boolean }>(response, `Crew disband failed with HTTP ${response.status}`);
}

export async function addCrewLoreNote(crewId: string, note: string): Promise<void> {
  const response = await authenticatedFetch('/api/crew/lore', {
    method: 'POST',
    body: JSON.stringify({ crewId, note }),
  });
  await readCrewResponse<{ success: boolean }>(response, `Crew lore update failed with HTTP ${response.status}`);
}

export async function getCrew(crewId: string): Promise<Crew | null> {
  const docRef = doc(db, CREWS_COLLECTION, crewId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? ({ id: docSnap.id, ...docSnap.data() } as Crew) : null;
}

export async function getCrewLore(crewId: string): Promise<CrewLore | null> {
  const docRef = doc(db, LORE_COLLECTION, crewId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? (docSnap.data() as CrewLore) : null;
}

export function subscribeToCrewLore(crewId: string, callback: (lore: CrewLore | null) => void) {
  return onSnapshot(doc(db, LORE_COLLECTION, crewId), (docSnap) => {
    callback(docSnap.exists() ? (docSnap.data() as CrewLore) : null);
  }, (error) => {
    console.warn("[CrewService] Crew Lore subscription skipped:", error.message);
    callback(null);
  });
}

export async function addInsideJoke(crewId: string, joke: string) {
  try {
    const docRef = doc(db, LORE_COLLECTION, crewId);
    await updateDoc(docRef, {
      insideJokes: arrayUnion(joke)
    });
  } catch (error) {
    console.error("[CrewService] addInsideJoke failed:", error);
  }
}

/**
 * Automatically update lore based on entry outcome
 */
export async function processLoreForEntry(crewId: string, entry: Entry, loreTags: string[] = []) {
  try {
    const loreRef = doc(db, LORE_COLLECTION, crewId);
    const loreSnap = await getDoc(loreRef);
    const lore = loreSnap.exists() ? (loreSnap.data() as CrewLore) : null;
    
    if (!lore) return;

    const seasonId = 'S1'; // Fixed for now
    const statsUpdate: Record<string, any> = {};

    const status = (entry.status as string);
    const isApproved = ['approved', 'auto_approved', 'approved_by_admin', 'retry-approved'].includes(status);
    
    if (isApproved) {
      statsUpdate[`seasonStats.${seasonId}.totalApprovedEntries`] = increment(1);
      statsUpdate[`seasonStats.${seasonId}.totalCompletedChallenges`] = increment(1);
      
      // Add suggested lore tags
      if (loreTags.length > 0) {
        statsUpdate['tags'] = arrayUnion(...loreTags);
      }
    } else if (entry.status === 'rejected') {
      statsUpdate[`seasonStats.${seasonId}.totalRejectedEntries`] = increment(1);
      // Potential for "Most Suspicious Entry"
      if (!lore.highlights.mostSuspiciousEntry) {
        statsUpdate['highlights.mostSuspiciousEntry'] = entry.id;
      }
    }

    if (Object.keys(statsUpdate).length > 0) {
      await updateDoc(loreRef, statsUpdate);
    }
  } catch (error) {
    console.warn("[CrewService] processLoreForEntry skipped/failed:", error);
  }
}

export async function getLatestDispatch(crewId: string): Promise<CrewDispatch | null> {
  const q = query(
    collection(db, DISPATCH_COLLECTION), 
    where('crewId', '==', crewId),
    where('isUnlocked', '==', true)
  );
  const snap = await getDocs(q);
  return snap.empty ? null : (snap.docs[0].data() as CrewDispatch);
}
