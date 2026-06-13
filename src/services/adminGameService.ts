import { doc, setDoc, updateDoc, serverTimestamp, collection } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { logAdminAction } from './moderationService';
import { AppConfig, Season } from '../types/game';
import { TripStatus } from '../types/challenges';

export async function initializeGameConfig() {
  const configRef = doc(db, 'appConfig', 'game');
  const defaultConfig: AppConfig = {
    activeSeasonId: 'heatwave-receipts',
    onboardingEntriesRequired: 3,
    featureFlags: {
      fieldSignalsEnabled: true,
      badgeFragmentsEnabled: true,
      crewArtifactsEnabled: true,
      rivalMomentsEnabled: true,
      appObservationsEnabled: true,
      crewDispatchEnabled: true,
      proofFinderEnabled: true,
      skinsEnabled: true,
      fieldTypeEffectsEnabled: true,
      fieldGuideAssistEnabled: true
    }
  };
  await setDoc(configRef, defaultConfig, { merge: true });
}

export async function repairGlobalConfig() {
  const globalRef = doc(db, 'appConfig', 'global');
  const defaultGlobal: any = {
    maintenanceMode: false,
    proofChecksEnabled: true,
    uploadsEnabled: true,
    leaderboardLiveUpdatesEnabled: false,
    maxDailyProofChecksPerUser: 50,
    maxDailyUploadsPerUser: 100,
    betaMode: false,
  };
  await setDoc(globalRef, defaultGlobal, { merge: true });
  await initializeGameConfig();
  await deployHeatwave2026Manifest();
}

export async function updateFeatureFlags(flags: Partial<AppConfig['featureFlags']>) {
  const configRef = doc(db, 'appConfig', 'game');
  await updateDoc(configRef, {
    [`featureFlags`]: flags
  });

  if (auth.currentUser) {
    await logAdminAction(auth.currentUser.uid, 'game', 'config', 'update_feature_flags', { flags });
  }
}

export async function createSeason(season: Omit<Season, 'id' | 'createdAt'>) {
  const seasonRef = doc(collection(db, 'seasons'));
  await setDoc(seasonRef, {
    ...season,
    createdAt: serverTimestamp()
  });

  if (auth.currentUser) {
    await logAdminAction(auth.currentUser.uid, seasonRef.id, 'season', 'create', { seasonTitle: season.title });
  }

  return seasonRef.id;
}

export async function setGlobalActiveSeason(seasonId: string) {
  const configRef = doc(db, 'appConfig', 'game');
  await updateDoc(configRef, {
    activeSeasonId: seasonId
  });

  if (auth.currentUser) {
    await logAdminAction(auth.currentUser.uid, 'game', 'config', 'set_active_season', { seasonId });
  }
}

/**
 * Deploys the curated Summer 2026 challenge bank and schedules the 14-week manifest.
 * Safe to re-run: uses stable IDs and idempotent logic.
 */
export async function deployHeatwave2026Manifest() {
  const { HEATWAVE_CHALLENGE_BANK } = await import('../data/heatwaveChallengeBank');
  const { validateChallengeBrandFit } = await import('./brandService');
  const { saveChallenge } = await import('./challengeService');
  const { Timestamp } = await import('firebase/firestore');
  
  console.log(`[Admin] Deploying Heatwave Receipts Bank and Manifest...`);
  
  // 1. Deploy templates to the bank
  const approvedBankIds: string[] = [];
  for (const template of HEATWAVE_CHALLENGE_BANK) {
    const brandCheck = validateChallengeBrandFit(template);
    const finalChallenge: any = {
      ...template,
      brandFit: brandCheck.status,
      status: brandCheck.status === 'approved' ? 'approved' : 'draft',
      updatedAt: new Date().toISOString()
    };
    await saveChallenge(finalChallenge);
    if (finalChallenge.status === 'approved') {
      approvedBankIds.push(finalChallenge.id);
    }
  }

  // 2. Schedule 14 weeks using the bank
  const seasonId = 'heatwave-receipts';
  const seasonRef = doc(db, 'seasons', seasonId);
  
  const seasonData: Season = {
    id: seasonId,
    title: 'HEATWAVE_RECEIPTS',
    description: 'Heatwave Receipts: A Summer Fieldtrip Deck',
    status: 'active',
    startDate: Timestamp.fromDate(new Date('2026-06-06')),
    endDate: Timestamp.fromDate(new Date('2026-09-06')),
    weeks: Array.from({ length: 14 }).map((_, i) => {
      const week = i + 1;
      const fieldId = `ss26_w${week}_field`;
      const evidenceId = `ss26_w${week}_evidence`;
      const crewId = `ss26_w${week}_crew`;
      
      return {
        number: week,
        startDate: Timestamp.fromDate(new Date(new Date('2026-06-06').getTime() + i * 7 * 24 * 60 * 60 * 1000)),
        fieldChallengeId: fieldId,
        evidenceChallengeId: evidenceId,
        crewChallengeId: crewId,
        chaosCardIds: [`chaos-${week}`],
        sabotageCardIds: [`sabotage-${~~(i/3) + 1}`]
      };
    }),
    createdAt: Timestamp.now()
  };

  // 3. Mapping logic
  const fieldTemplates = HEATWAVE_CHALLENGE_BANK.filter(t => t.type === 'Field Challenge');
  const evidenceTemplates = HEATWAVE_CHALLENGE_BANK.filter(t => t.type === 'Evidence Challenge');
  const crewTemplates = HEATWAVE_CHALLENGE_BANK.filter(t => t.type === 'Crew Challenge');
  const finalTemplate = HEATWAVE_CHALLENGE_BANK.find(t => t.type === 'Final');

  for (let i = 0; i < 14; i++) {
    const week = i + 1;
    
    // Pick templates
    let fieldT = fieldTemplates[i % fieldTemplates.length];
    // Special case: Week 14 get the Final template in the field slot
    if (week === 14 && finalTemplate) {
      fieldT = finalTemplate;
    }

    const evidenceT = evidenceTemplates[i % evidenceTemplates.length];
    const crewT = crewTemplates[i % crewTemplates.length];

    const defaultData = {
      image: "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?q=80&w=800",
      proofNeeded: "Photo evidence or field note.",
      crewModeBehavior: "Flexible collaboration.",
      mode: "flexible" as any,
      requiredProof: ["photo"] as any,
      seasonAvailability: ["heatwave-receipts"],
      accessibilityNote: "Standard pedestrian access.",
      safetyRules: ["Stay aware of surroundings."]
    };

    const weekMissions = [
      { ...defaultData, ...fieldT, id: `ss26_w${week}_field`, weekNumber: week, status: 'scheduled' as any },
      { ...defaultData, ...evidenceT, id: `ss26_w${week}_evidence`, weekNumber: week, status: 'scheduled' as any },
      { ...defaultData, ...crewT, id: `ss26_w${week}_crew`, weekNumber: week, status: 'scheduled' as any, mode: 'crew' }
    ];

    for (const m of weekMissions) {
      await saveChallenge(m as any);
    }
  }

  await setDoc(seasonRef, seasonData, { merge: true });
  await setGlobalActiveSeason(seasonId);

  if (auth.currentUser) {
    await logAdminAction(auth.currentUser.uid, seasonId, 'season', 'bulk_deploy_manifest', { seasonTitle: seasonData.title });
  }
  
  return {
    weeks: 14,
    templates: HEATWAVE_CHALLENGE_BANK.length,
    seasonId
  };
}

export async function updateChallengeStatus(challengeId: string, status: TripStatus) {
  const challengeRef = doc(db, 'challenges', challengeId);
  await updateDoc(challengeRef, { 
    status,
    updatedAt: new Date().toISOString()
  });

  if (auth.currentUser) {
    await logAdminAction(auth.currentUser.uid, challengeId, 'challenge', 'update_status', { newStatus: status });
  }
}
