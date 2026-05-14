import { doc, setDoc, updateDoc, serverTimestamp, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AppConfig, Season } from '../types/game';
import { TripStatus } from '../types/challenges';

export async function initializeGameConfig() {
  const configRef = doc(db, 'appConfig', 'game');
  const defaultConfig: AppConfig = {
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
      fieldTypeEffectsEnabled: true
    }
  };
  await setDoc(configRef, defaultConfig, { merge: true });
}

export async function updateFeatureFlags(flags: Partial<AppConfig['featureFlags']>) {
  const configRef = doc(db, 'appConfig', 'game');
  await updateDoc(configRef, {
    [`featureFlags`]: flags
  });
}

export async function createSeason(season: Omit<Season, 'id' | 'createdAt'>) {
  const seasonRef = doc(collection(db, 'seasons'));
  await setDoc(seasonRef, {
    ...season,
    createdAt: serverTimestamp()
  });
  return seasonRef.id;
}

export async function setGlobalActiveSeason(seasonId: string) {
  const configRef = doc(db, 'appConfig', 'game');
  await updateDoc(configRef, {
    activeSeasonId: seasonId
  });
}

/**
 * Deploys the curated Summer 2026 challenge bank and schedules the 14-week manifest.
 * Safe to re-run: uses stable IDs and idempotent logic.
 */
export async function deploySummer2026Manifest() {
  const { SUMMER_CHALLENGE_BANK } = await import('../data/summerChallengeBank');
  const { validateChallengeBrandFit } = await import('./brandService');
  const { saveChallenge } = await import('./challengeService');
  const { Timestamp } = await import('firebase/firestore');
  
  console.log(`[Admin] Deploying Summer 2026 Bank and Manifest...`);
  
  // 1. Deploy templates to the bank
  const approvedBankIds: string[] = [];
  for (const template of SUMMER_CHALLENGE_BANK) {
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
  // For this manifest, we'll map specific templates to weeks or rotate them
  const seasonId = 'summer-2026';
  const seasonRef = doc(db, 'seasons', seasonId);
  
  const seasonData: Season = {
    id: seasonId,
    title: 'SUMMER_OF_FIELD_TRIP_2026',
    description: 'The definitive 14-week curated summer experience.',
    status: 'active',
    startDate: Timestamp.fromDate(new Date('2026-05-10')),
    endDate: Timestamp.fromDate(new Date('2026-08-16')),
    weeks: Array.from({ length: 14 }).map((_, i) => {
      const week = i + 1;
      // Assign templates to week (in a real app, this would be manual, here we automate for the mission)
      const fieldId = `summer26_w${week}_field`;
      const evidenceId = `summer26_w${week}_evidence`;
      const crewId = `summer26_w${week}_crew`;
      
      return {
        number: week,
        startDate: Timestamp.fromDate(new Date(new Date('2026-05-10').getTime() + i * 7 * 24 * 60 * 60 * 1000)),
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
  const fieldTemplates = SUMMER_CHALLENGE_BANK.filter(t => t.type === 'Field Challenge');
  const evidenceTemplates = SUMMER_CHALLENGE_BANK.filter(t => t.type === 'Evidence Challenge');
  const crewTemplates = SUMMER_CHALLENGE_BANK.filter(t => t.type === 'Crew Challenge');
  const finalTemplate = SUMMER_CHALLENGE_BANK.find(t => t.type === 'Final');

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
      image: "/images/challenges/generic-summer.jpg",
      proofNeeded: "Photo evidence or field note.",
      crewModeBehavior: "Flexible collaboration.",
      mode: "flexible" as any,
      requiredProof: ["photo"] as any,
      seasonAvailability: ["summer-2026"],
      accessibilityNote: "Standard pedestrian access.",
      safetyRules: ["Stay aware of surroundings."]
    };

    const weekMissions = [
      { ...defaultData, ...fieldT, id: `summer26_w${week}_field`, weekNumber: week, status: 'scheduled' as any },
      { ...defaultData, ...evidenceT, id: `summer26_w${week}_evidence`, weekNumber: week, status: 'scheduled' as any },
      { ...defaultData, ...crewT, id: `summer26_w${week}_crew`, weekNumber: week, status: 'scheduled' as any, mode: 'crew' }
    ];

    for (const m of weekMissions) {
      await saveChallenge(m as any);
    }
  }

  await setDoc(seasonRef, seasonData, { merge: true });
  await setGlobalActiveSeason(seasonId);
  
  return {
    weeks: 14,
    templates: SUMMER_CHALLENGE_BANK.length,
    seasonId
  };
}

export async function updateChallengeStatus(challengeId: string, status: TripStatus) {
  const challengeRef = doc(db, 'challenges', challengeId);
  await updateDoc(challengeRef, { 
    status,
    updatedAt: new Date().toISOString()
  });
}
