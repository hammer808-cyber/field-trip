import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Link, ShieldAlert, Users } from 'lucide-react';
import { getCrewInviteByToken, joinCrewByInviteToken } from '../services/crewService';
import { formatSafeDateOnly } from '../lib/utils';

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
    return <div className="min-h-screen flex items-center justify-center font-mono text-xs uppercase">Checking invite...</div>;
  }

  if (error || !state?.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md bg-white border-8 border-on-surface shadow-[12px_12px_0px_black] p-8 text-center space-y-5">
          <ShieldAlert className="w-16 h-16 mx-auto text-brand-orange" />
          <h1 className="font-display font-black italic uppercase text-4xl leading-none">Invite Unavailable</h1>
          <p className="font-serif italic text-sm opacity-70">{error || 'This Crew invite cannot be used.'}</p>
          <button className="bureau-btn bg-brand-lime text-on-surface" onClick={() => navigate('/crew')}>Go To Crew HQ</button>
        </div>
      </div>
    );
  }

  const crew = state.crew;
  const alreadyInThisCrew = state.viewer?.activeCrewId === crew.id;
  const inAnotherCrew = state.viewer?.activeCrewId && state.viewer.activeCrewId !== crew.id;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 pb-32">
      <div className="max-w-lg w-full bg-white border-8 border-on-surface shadow-[14px_14px_0px_black] p-7 space-y-6">
        <div className="text-center space-y-3">
          <div className="w-20 h-20 mx-auto bg-brand-cyan border-4 border-on-surface shadow-[6px_6px_0px_black] flex items-center justify-center">
            <Users className="w-10 h-10" />
          </div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-brand-orange font-black">Crew Invite Link</p>
          <h1 className="font-display font-black italic uppercase text-5xl leading-none">{crew.name}</h1>
          {crew.motto && <p className="font-serif italic text-sm opacity-70">"{crew.motto}"</p>}
        </div>

        <div className="grid grid-cols-2 gap-3 font-mono text-[10px] uppercase">
          <div className="border-2 border-on-surface/20 p-3"><span className="opacity-50">Mode</span><br/><b>{crew.mode}</b></div>
          <div className="border-2 border-on-surface/20 p-3"><span className="opacity-50">Privacy</span><br/><b>{crew.privacy}</b></div>
          <div className="border-2 border-on-surface/20 p-3"><span className="opacity-50">Members</span><br/><b>{crew.memberCount} / {crew.memberLimit}</b></div>
          <div className="border-2 border-on-surface/20 p-3"><span className="opacity-50">Expires</span><br/><b>{formatSafeDateOnly(state.invite?.expiresAt)}</b></div>
        </div>

        {message && <div className="border-2 border-brand-lime bg-brand-lime/20 p-3 font-mono text-xs font-black uppercase">{message}</div>}
        {alreadyInThisCrew && <div className="border-2 border-brand-cyan bg-brand-cyan/20 p-3 font-mono text-xs font-black uppercase">You are already in this Crew.</div>}
        {inAnotherCrew && <div className="border-2 border-brand-orange bg-brand-orange/10 p-3 font-mono text-xs font-black uppercase">You are already in another Crew. Leave it first to request this one.</div>}

        <button
          className="bureau-btn w-full bg-brand-lime text-on-surface disabled:opacity-50"
          disabled={busy || alreadyInThisCrew || inAnotherCrew}
          onClick={handleJoin}
        >
          <Link className="w-4 h-4 mr-2" />
          {crew.privacy === 'discoverable' && crew.autoApproveShareLinks ? 'Join Crew' : 'Request To Join'}
        </button>
      </div>
    </div>
  );
}
