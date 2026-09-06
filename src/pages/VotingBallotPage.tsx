import React from 'react';
import { VotingHub } from '../components/VotingHub';
import { GatedFeaturePanel } from '../components/GatedFeaturePanel';
import { FieldPageHero } from '../components/FieldPageHero';
import { PlayerPageBody, PlayerPageShell } from '../components/player';
import { useApp } from '../context/AppContext';
import { getStarterProgress } from '../services/canonicalProgress';
import { Vote } from 'lucide-react';

export default function VotingBallotPage() {
  const { canonicalProgress } = useApp();
  const starterProgress = getStarterProgress(canonicalProgress);
  const isVotingUnlocked = starterProgress.starterComplete === true;

  return (
    <PlayerPageShell department="voting" className="skin-voting">
      <FieldPageHero
        variant="editorial"
        department="voting"
        eyebrow="Weekly event"
        title="BALLOT"
        subtitle="Pick the receipts that define this week."
        backLabel="Voting"
        backTo="/voting"
        backgroundIcon={<Vote className="h-64 w-64" />}
        infoCardLabel="Status"
        infoCardValue={isVotingUnlocked ? 'Open' : 'Locked'}
        infoCardSubtext={isVotingUnlocked ? 'Cast your votes' : `${starterProgress.starterApprovedCount}/3 starter missions`}
        infoCardAccent={isVotingUnlocked ? 'orange' : 'pink'}
      />
      <PlayerPageBody>
        {isVotingUnlocked ? (
          <VotingHub />
        ) : (
          <GatedFeaturePanel featureName="Voting" primaryHref="/voting" primaryLabel="Back to Voting" />
        )}
      </PlayerPageBody>
    </PlayerPageShell>
  );
}
