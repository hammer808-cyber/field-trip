import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { AvatarPreview } from '../components/AvatarPreview';
import { DEFAULT_AVATAR } from '../constants/avatarAssets';
import { getPlayerPublicProfile, sendCrewRequest } from '../services/crewGraphService';
import type { PublicPlayerIdentity } from '../logic/crewGraph';

export default function PlayerPublicProfile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const [player, setPlayer] = useState<PublicPlayerIdentity | null>(null);
  const [relationship, setRelationship] = useState('none');
  const [canViewCrewActivity, setCanViewCrewActivity] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!username) return;
    getPlayerPublicProfile(username)
      .then(payload => {
        setPlayer(payload.player);
        setRelationship(payload.relationship);
        setCanViewCrewActivity(payload.canViewCrewActivity);
      })
      .catch((err: any) => setError(err.message || 'Player not found'));
  }, [username]);

  if (error) {
    return (
      <div className="skin-page min-h-screen p-8 space-y-4">
        <button type="button" onClick={() => navigate('/crew')} className="bureau-btn bg-white text-on-surface text-[10px]"><ArrowLeft className="w-4 h-4" /> Back to Crew</button>
        <p className="font-mono text-sm uppercase">{error}</p>
      </div>
    );
  }

  if (!player) {
    return <div className="skin-page min-h-screen flex items-center justify-center font-mono">LOADING_PLAYER...</div>;
  }

  return (
    <div className="skin-page min-h-screen p-6 pb-32 max-w-xl mx-auto space-y-8">
      <button type="button" onClick={() => navigate('/crew')} className="bureau-btn bg-white text-on-surface text-[10px]">
        <ArrowLeft className="w-4 h-4" /> Back to Crew
      </button>
      <div className="border-4 border-on-surface bg-white p-8 shadow-[8px_8px_0px_black] space-y-4 text-center">
        <div className="w-28 h-28 mx-auto border-4 border-on-surface overflow-hidden">
          <AvatarPreview avatar={player.avatar || DEFAULT_AVATAR} />
        </div>
        <h1 className="font-display text-4xl font-black uppercase italic">{player.displayName}</h1>
        <p className="font-mono text-[10px] uppercase tracking-widest opacity-55">
          {player.username ? `@${player.username}` : 'Field agent'}
          {player.fieldTypeName ? ` / ${player.fieldTypeName}` : ''}
          {player.levelTitle ? ` / ${player.levelTitle}` : ''}
        </p>
        <p className="font-serif italic text-sm opacity-70">
          {canViewCrewActivity
            ? 'You are Crew. You can see Crew-visible activity they choose to share.'
            : 'Unrelated players only see this public identity. Private logbook, proofs, and account data stay hidden.'}
        </p>
        {relationship === 'none' && (
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const result = await sendCrewRequest({ userId: player.userId, username: player.username || undefined });
                setRelationship(result.relationship);
              } finally {
                setBusy(false);
              }
            }}
            className="bureau-btn bg-brand-lime text-on-surface"
          >
            <UserPlus className="w-4 h-4" /> Add to Crew
          </button>
        )}
        {relationship === 'outgoing_request' && (
          <p className="font-mono text-[10px] font-black uppercase">Request Sent</p>
        )}
        {relationship === 'accepted' && (
          <p className="font-mono text-[10px] font-black uppercase">Accepted Crew</p>
        )}
      </div>
    </div>
  );
}
