import { auth } from '../lib/firebase';
import { ScoreEventType } from '../types/game';

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
  }
) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('NOT_AUTHENTICATED');

    const idToken = await user.getIdToken();
    
    // Call Secure Server API instead of writing directly to Firestore
    const response = await fetch('/api/game/award-points', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({
        points,
        type,
        details
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
    description: `Manual adjustment: ${reason}`
  });
}
