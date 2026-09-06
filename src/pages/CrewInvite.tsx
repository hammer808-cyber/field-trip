import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Link, ShieldAlert, Users } from 'lucide-react';
import { getCrewInviteByToken, joinCrewByInviteToken } from '../services/crewService';
import { formatSafeDateOnly } from '../lib/utils';
import { FieldPageHero } from '../components/FieldPageHero';
import { EmptyStatePanel, ErrorStatePanel, FieldtripLoader } from '../components/FieldtripLoader';
import { FieldButton, PlayerPageBody, PlayerPageShell } from '../components/player';

export default function CrewInvitePage() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getCrewInviteByToken(token)
      .then(setState)
      .catch((err) => setError(err?.message || 'Invite link is invalid or expired.'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleJoin = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await joinCrewByInviteToken(token);
      if (result.joined) {
        navigate('/crew');
      } else {
        setMessage('Request sent. The Crew captain needs to approve it before you join.');
      }
    } catch (err: any) {
      setError(err?.message || 'Could not use this invite link.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <PlayerPageShell department="crew" className="skin-crew">
        <FieldtripLoader variant="community" fullScreen label="Checking invite" />
      </PlayerPageShell>
    );
  }

  if (error || !state?.valid) {
    return (
      <PlayerPageShell department="crew" className="skin-crew">
        <FieldPageHero
          variant="editorial"
          department="crew"
          eyebrow="Social clubhouse"
          title="CREW"
          subtitle="This invite cannot be used."
          backLabel="Crew"
          backTo="/crew"
          backgroundIcon={<Users className="h-64 w-64" />}
        />
        <PlayerPageBody>
          <ErrorStatePanel
            title="Invite unavailable"
            body={error || 'This Crew invite cannot be used.'}
            onRetry={() => navigate('/crew')}
            retryLabel="Go to Crew"
          />
        </PlayerPageBody>
      </PlayerPageShell>
    );
  }

  const crew = state.crew;
  const alreadyInThisCrew = state.viewer?.activeCrewId === crew.id;
  const inAnotherCrew = state.viewer?.activeCrewId && state.viewer.activeCrewId !== crew.id;

  return (
    <PlayerPageShell department="crew" className="skin-crew">
      <FieldPageHero
        variant="editorial"
        department="crew"
        eyebrow="Social clubhouse"
        title="JOIN CREW"
        subtitle={crew.motto ? `"${crew.motto}"` : 'Use this invite to join the clubhouse.'}
        backLabel="Crew"
        backTo="/crew"
        backgroundIcon={<Users className="h-64 w-64" />}
        infoCardLabel="Members"
        infoCardValue={`${crew.memberCount}/${crew.memberLimit}`}
        infoCardSubtext={crew.privacy}
        infoCardAccent="orange"
      />
      <PlayerPageBody>
        <div className="border-4 border-[var(--skin-border)] bg-[var(--skin-surface)] p-5 shadow-[6px_6px_0_var(--skin-border)] sm:p-8">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center border-4 border-on-surface bg-brand-orange text-white shadow-[4px_4px_0px_black]">
              <Users className="h-8 w-8" aria-hidden="true" />
            </div>
            <div>
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.22em] text-on-surface/45">Crew invite</p>
              <h2 className="font-display text-3xl font-black uppercase italic leading-none">{crew.name}</h2>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="border-2 border-on-surface/15 p-3">
              <p className="font-mono text-[10px] font-black uppercase tracking-widest text-on-surface/45">Mode</p>
              <p className="mt-1 font-sans text-sm font-bold">{crew.mode}</p>
            </div>
            <div className="border-2 border-on-surface/15 p-3">
              <p className="font-mono text-[10px] font-black uppercase tracking-widest text-on-surface/45">Privacy</p>
              <p className="mt-1 font-sans text-sm font-bold">{crew.privacy}</p>
            </div>
            <div className="border-2 border-on-surface/15 p-3">
              <p className="font-mono text-[10px] font-black uppercase tracking-widest text-on-surface/45">Members</p>
              <p className="mt-1 font-sans text-sm font-bold">{crew.memberCount} / {crew.memberLimit}</p>
            </div>
            <div className="border-2 border-on-surface/15 p-3">
              <p className="font-mono text-[10px] font-black uppercase tracking-widest text-on-surface/45">Expires</p>
              <p className="mt-1 font-sans text-sm font-bold">{formatSafeDateOnly(state.invite?.expiresAt)}</p>
            </div>
          </div>

          {message && (
            <EmptyStatePanel
              className="mt-5"
              title="Request sent"
              body={message}
              icon={<ShieldAlert className="h-8 w-8" />}
            />
          )}
          {alreadyInThisCrew && (
            <p className="mt-5 border-2 border-brand-cyan bg-brand-cyan/15 p-3 font-sans text-sm font-bold">You are already in this Crew.</p>
          )}
          {inAnotherCrew && (
            <p className="mt-5 border-2 border-brand-orange bg-brand-orange/10 p-3 font-sans text-sm font-bold">You are already in another Crew. Leave it first to request this one.</p>
          )}

          <FieldButton
            className="mt-6 w-full"
            size="lg"
            disabled={busy || alreadyInThisCrew || inAnotherCrew}
            onClick={handleJoin}
          >
            <Link className="h-4 w-4" aria-hidden="true" />
            {busy ? 'Working…' : crew.privacy === 'discoverable' && crew.autoApproveShareLinks ? 'Join Crew' : 'Request to join'}
          </FieldButton>
        </div>
      </PlayerPageBody>
    </PlayerPageShell>
  );
}
