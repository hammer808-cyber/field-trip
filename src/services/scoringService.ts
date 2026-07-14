import { auth } from '../lib/firebase';
import { ScoreEventType } from '../types/game';
import { authenticatedFetch } from '../lib/api';

export async function awardPoints(
  userId: string, 
  userName: string,
  points: number, 
  type: ScoreEventType,
  details: {
    entryId?: string;
    tripId?: string;
    description: string;
    crewId?: string;
    userAvatar?: any;
    sourceId?: string;
  }
) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('NOT_AUTHENTICATED');
    
    // Call Secure Server API instead of writing directly to Firestore
    const response = await authenticatedFetch('/api/game/award-points', {
      method: 'POST',
      body: JSON.stringify({
        points,
        type,
        details,
        targetUserId: userId,
        targetUserName: userName
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'FAILED_TO_AWARD_POINTS');
    }

    return await response.json();
  } catch (error) {
    console.error('Error awarding points via API:', error);
    throw error;
  }
}

export async function adjustPointsManually(
  userId: string,
  userName: string,
  points: number,
  reason: string
) {
  // Only admins can do this, the API will verify tokens
  return awardPoints(userId, userName, points, 'admin_adjustment', {
    description: `Manual adjustment: ${reason}`,
    sourceId: `admin_adjustment_${userId}_${Date.now()}`,
  });
}

export async function redeemComebackCard() {
  const response = await authenticatedFetch('/api/game/redeem-comeback-card', {
    method: 'POST',
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'COMEBACK_CARD_REDEMPTION_FAILED');
  }
  return response.json();
}
