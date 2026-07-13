import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { 
  Users, 
  History, 
  BarChart3, 
  FileText, 
  Settings, 
  AlertTriangle, 
  Lock, 
  Sparkles, 
  MessageSquare,
  ShieldCheck,
  RotateCcw,
  Trophy,
  Vote,
  BookOpen,
  UserPlus
} from 'lucide-react';
import { cn, formatSafeDateOnly } from '../lib/utils';
import {
  createCrew,
  acceptCrewInvite,
  approveCrewJoinRequest,
  createDirectCrewInvite,
  declineCrewInvite,
  declineCrewJoinRequest,
  discoverCrews,
  disbandCrew,
  generateCrewInviteLink,
  getCrew,
  getCrewLore,
  getCurrentCrewMembership,
  getLatestDispatch,
  getCrewMembers,
  getIncomingCrewInvites,
  getOutgoingCrewJoinRequests,
  leaveCrew,
  promoteCrewMemberToCaptain,
  removeCrewMember,
  requestToJoinCrew,
  cancelCrewJoinRequest,
  revokeCrewInviteLink,
  searchCrewInviteUsers,
  subscribeToCrewLore,
  updateCrewSettings,
  addCrewLoreNote,
} from '../services/crewService';
import { getWeeklySummary } from '../services/summaryService';
import { Crew, CrewLore, CrewDispatch, CrewInvite, CrewJoinRequest, CrewMembershipState, CrewMode, CrewPrivacy, CrewRosterState } from '../types/crew';
import { Card } from '../components/UI';
import { CrewArtifactsGallery } from '../components/CrewArtifactsGallery';
import { CrewMemoriesFeed } from '../components/CrewMemoriesFeed';
import { ZineWorkspace } from '../components/ZineWorkspace';

export default function CrewPage() {
  const { skin } = useTheme();
  const { user, profile, crewArtifacts, activeSeason, currentWeekNumber, isCrewUnlocked, canonicalProgress } = useApp();
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as any) || 'home';
  const [activeTab, setActiveTab ] = useState<'home' | 'proofs' | 'voting' | 'memories' | 'zine' | 'lore' | 'members' | 'stats' | 'dispatch' | 'settings'>(initialTab);
  const [crew, setCrew] = useState<Crew | null>(null);
  const [membershipState, setMembershipState] = useState<CrewMembershipState | null>(null);
  const [lore, setLore] = useState<CrewLore | null>(null);
  const [dispatch, setDispatch] = useState<CrewDispatch | null>(null);
  const [weeklySummary, setWeeklySummary] = useState<any>(null);
  const [rosterState, setRosterState] = useState<CrewRosterState | null>(null);
  const [incomingInvites, setIncomingInvites] = useState<CrewInvite[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<CrewJoinRequest[]>([]);
  const [discoverableCrews, setDiscoverableCrews] = useState<Crew[]>([]);
  const [noCrewView, setNoCrewView] = useState<'create' | 'join'>('create');
  const [inviteQuery, setInviteQuery] = useState('');
  const [inviteResults, setInviteResults] = useState<Array<{ userId: string; displayName: string; username?: string | null }>>([]);
  const [inviteLink, setInviteLink] = useState<{ inviteId: string; url: string; expiresAt: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [crewForm, setCrewForm] = useState({
    name: '',
    motto: '',
    mode: 'friendly' as CrewMode,
    privacy: 'invite_only' as CrewPrivacy,
  });
  const [crewActionError, setCrewActionError] = useState<string | null>(null);
  const [crewActionBusy, setCrewActionBusy] = useState(false);
  const [loreDraft, setLoreDraft] = useState('');
  const navigate = useNavigate();

  const crewId = membershipState?.membership?.crewId || profile?.activeCrewId || profile?.crewId || null;

  useEffect(() => {
    async function init() {
      try {
        const state = await getCurrentCrewMembership().catch(() => null);
        setMembershipState(state);
        const resolvedCrewId = state?.membership?.crewId || profile?.activeCrewId || profile?.crewId || null;
        if (!resolvedCrewId) {
          setCrew(null);
          setLore(null);
          setDispatch(null);
          setLoading(false);
          return;
        }
        const c = state?.crew || await getCrew(resolvedCrewId);
        if (c) {
          setCrew(c);
          const l = await getCrewLore(resolvedCrewId);
          setLore(l);
          const d = await getLatestDispatch(resolvedCrewId);
          setDispatch(d);
          
          if (activeSeason?.id) {
             const summary = await getWeeklySummary(activeSeason.id, currentWeekNumber);
             setWeeklySummary(summary);
          }
        }
      } catch (err) {
        console.warn("[Crew] init error:", err);
      } finally {
        setLoading(false);
      }
    }
    init();

    if (!crewId) return;
    const unsub = subscribeToCrewLore(crewId, (data) => setLore(data));
    return () => unsub();
  }, [crewId, profile?.activeCrewId, profile?.crewId, activeSeason?.id, currentWeekNumber]);

  const refreshCrewManagement = async () => {
    const current = await getCurrentCrewMembership().catch(() => null);
    if (current) {
      setMembershipState(current);
      setCrew(current.crew);
    }
    const resolvedCrewId = current?.membership?.crewId || membershipState?.membership?.crewId || crew?.id || profile?.activeCrewId || profile?.crewId || null;
    if (resolvedCrewId) {
      const roster = await getCrewMembers(resolvedCrewId);
      setRosterState(roster);
      if (roster.crew) setCrew(roster.crew);
      setDiscoverableCrews([]);
      setOutgoingRequests([]);
    } else {
      setRosterState(null);
      const [discovery, requests] = await Promise.all([
        discoverCrews().catch(() => ({ crews: [], viewer: { activeCrewId: null } })),
        getOutgoingCrewJoinRequests().catch(() => []),
      ]);
      setDiscoverableCrews(discovery.crews || []);
      setOutgoingRequests(requests);
    }
    const invites = await getIncomingCrewInvites().catch(() => []);
    setIncomingInvites(invites);
  };

  useEffect(() => {
    refreshCrewManagement().catch(err => console.warn('[Crew] management refresh failed:', err));
  }, [crewId, profile?.activeCrewId, profile?.crewId]);

  useEffect(() => {
    const resolvedCrewId = crew?.id || crewId;
    if (!resolvedCrewId || inviteQuery.trim().length < 2) {
      setInviteResults([]);
      return;
    }
    const handle = window.setTimeout(() => {
      searchCrewInviteUsers(resolvedCrewId, inviteQuery).then(setInviteResults).catch(err => {
        console.warn('[Crew] invite search failed:', err);
        setInviteResults([]);
      });
    }, 250);
    return () => window.clearTimeout(handle);
  }, [crew?.id, crewId, inviteQuery]);

  const handleCreateCrew = async (event: React.FormEvent) => {
    event.preventDefault();
    setCrewActionError(null);
    setCrewActionBusy(true);
    try {
      const state = await createCrew(crewForm);
      setMembershipState(state);
      setCrew(state.crew);
      setActiveTab('home');
    } catch (err: any) {
      setCrewActionError(err?.message || 'Crew creation failed.');
    } finally {
      setCrewActionBusy(false);
    }
  };

  const handleLeaveCrew = async () => {
    if (!window.confirm('Leave this Crew? Your personal receipts stay yours, but you will have a 7-day Crew cooldown.')) return;
    setCrewActionError(null);
    setCrewActionBusy(true);
    try {
      const result = await leaveCrew('user_requested');
      setMembershipState({ crew: null, membership: null, zine: null, cooldownUntil: result.cooldownUntil });
      setCrew(null);
      setLore(null);
      setDispatch(null);
      setActiveTab('home');
    } catch (err: any) {
      setCrewActionError(err?.message || 'Could not leave Crew.');
    } finally {
      setCrewActionBusy(false);
    }
  };

  const runCrewAction = async (label: string, action: () => Promise<any>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setCrewActionError(null);
    setCrewActionBusy(true);
    try {
      await action();
      await refreshCrewManagement();
    } catch (err: any) {
      setCrewActionError(err?.message || `${label} failed.`);
    } finally {
      setCrewActionBusy(false);
    }
  };

  const crewStanding = weeklySummary?.crewStats?.[crewId!] || null;
  const crewRank = weeklySummary ? (Object.entries(weeklySummary.crewStats)
    .sort(([, a]: any, [, b]: any) => b.totalScore - a.totalScore)
    .findIndex(([id]) => id === crewId) + 1) : 0;

  if (!isCrewUnlocked) {
    return (
      <div className="min-h-screen bg-paper-light flex items-center justify-center p-6 pb-32">
        <div className="max-w-md w-full bg-white border-[8px] border-on-surface shadow-[14px_14px_0px_rgba(0,0,0,1)] rounded-3xl p-6 text-center space-y-5">
          <div className="w-16 h-16 mx-auto bg-brand-magenta text-white border-4 border-on-surface rounded-2xl flex items-center justify-center shadow-[6px_6px_0px_black]">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="font-display font-black uppercase text-3xl italic leading-none">Crew Is Locked</h1>
          <p className="font-serif italic text-on-surface/70">
            Finish account setup and field classification to unlock Crew operations.
          </p>
          <div className="w-full bg-white border-2 border-on-surface h-5 rounded-full overflow-hidden">
            <div className="h-full bg-brand-lime" style={{ width: `${canonicalProgress.starter.percent}%` }} />
          </div>
          <p className="font-mono text-[10px] uppercase font-black tracking-widest">
            {canonicalProgress.starter.label} approved
          </p>
          <button onClick={() => navigate('/missions?pack=starter-signals')} className="bureau-btn bg-brand-lime text-on-surface text-xs">
            Go To Starter Signals
          </button>
        </div>
      </div>
    );
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen font-mono">LOADING_CREW_IDENTITY...</div>;

  if (!crew) {
    const cooldownUntil = membershipState?.cooldownUntil || profile?.crewCooldownUntil || null;
    const cooldownText = cooldownUntil?.seconds
      ? new Date(cooldownUntil.seconds * 1000).toLocaleString()
      : cooldownUntil?.toDate
        ? cooldownUntil.toDate().toLocaleString()
        : null;
    return (
      <div className="min-h-screen p-6 pb-32 flex items-center justify-center">
        <form onSubmit={handleCreateCrew} className="w-full max-w-xl bg-white border-[6px] border-on-surface shadow-[14px_14px_0px_black] p-6 sm:p-8 space-y-6">
          <div className="space-y-2 text-center">
            <Users className="w-14 h-14 mx-auto text-brand-orange" />
            <h1 className="font-display text-4xl italic font-black uppercase leading-none">Create Your Crew</h1>
            <p className="font-serif italic text-sm opacity-70">
              Crews can start before Starter Signals. Starter receipts stay personal; seasonal receipts join the Crew archive after approval.
            </p>
          </div>

          <div className="grid grid-cols-2 border-4 border-on-surface bg-white p-1" role="tablist" aria-label="Crew start options">
            <button type="button" role="tab" aria-selected={noCrewView === 'create'} onClick={() => setNoCrewView('create')} className={cn('p-3 font-mono text-[10px] font-black uppercase', noCrewView === 'create' ? 'bg-brand-lime' : 'text-on-surface/45')}>
              Create Crew
            </button>
            <button type="button" role="tab" aria-selected={noCrewView === 'join'} onClick={() => setNoCrewView('join')} className={cn('p-3 font-mono text-[10px] font-black uppercase', noCrewView === 'join' ? 'bg-brand-cyan' : 'text-on-surface/45')}>
              Find Crew
            </button>
          </div>

          {incomingInvites.length > 0 && (
            <div className="border-4 border-brand-cyan bg-brand-cyan/10 p-4 space-y-3 text-left">
              <h2 className="font-display font-black italic text-2xl uppercase">Crew Invitations</h2>
              {incomingInvites.map(invite => (
                <div key={invite.id} className="bg-white border-2 border-on-surface p-3 space-y-2">
                  <p className="font-display font-black uppercase text-xl">{invite.crew?.name || 'Crew Invite'}</p>
                  <p className="font-mono text-[10px] uppercase opacity-60">
                    {invite.crew?.mode || 'friendly'} / {invite.crew?.memberCount || 0} members / expires {formatSafeDateOnly(invite.expiresAt)}
                  </p>
                  <div className="flex gap-2">
                    <button type="button" className="bureau-btn bg-brand-lime text-on-surface text-[10px]" onClick={() => runCrewAction('accept invite', () => acceptCrewInvite(invite.id))}>Accept</button>
                    <button type="button" className="bureau-btn bg-white text-on-surface text-[10px]" onClick={() => runCrewAction('decline invite', () => declineCrewInvite(invite.id))}>Decline</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {outgoingRequests.some(request => request.status === 'pending') && (
            <div className="border-4 border-brand-orange bg-brand-orange/10 p-4 space-y-3 text-left">
              <h2 className="font-display font-black italic text-2xl uppercase">Join Request Pending</h2>
              {outgoingRequests.filter(request => request.status === 'pending').map(request => (
                <div key={request.id} className="bg-white border-2 border-on-surface p-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-display font-black uppercase">{(request as any).crew?.name || request.crewId}</p>
                    <p className="font-mono text-[9px] uppercase opacity-50">Waiting for the Crew captain</p>
                  </div>
                  <button type="button" className="bureau-btn bg-white text-on-surface text-[9px]" onClick={() => runCrewAction('cancel request', () => cancelCrewJoinRequest(request.id))}>Cancel</button>
                </div>
              ))}
            </div>
          )}

          {cooldownText && (
            <div className="border-2 border-brand-orange bg-brand-orange/10 p-3 font-mono text-xs font-black uppercase">
              Crew switch cooldown active until {cooldownText}
            </div>
          )}

          {crewActionError && (
            <div className="border-2 border-red-500 bg-red-50 p-3 font-mono text-xs font-black text-red-700 uppercase">
              {crewActionError}
            </div>
          )}

          <label className="block space-y-2">
            <span className="micro-label">Crew Name</span>
            <input
              value={crewForm.name}
              onChange={(e) => setCrewForm(prev => ({ ...prev, name: e.target.value }))}
              className="w-full border-4 border-on-surface p-4 font-display font-black uppercase outline-none"
              placeholder="THE PARKING LOT LEGENDS"
              required
              minLength={3}
              maxLength={64}
            />
          </label>

          <label className="block space-y-2">
            <span className="micro-label">Motto</span>
            <input
              value={crewForm.motto}
              onChange={(e) => setCrewForm(prev => ({ ...prev, motto: e.target.value }))}
              className="w-full border-4 border-on-surface p-4 font-serif italic outline-none"
              placeholder="We saw it, we submitted it."
              maxLength={140}
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block space-y-2">
              <span className="micro-label">Mode</span>
              <select
                value={crewForm.mode}
                onChange={(e) => setCrewForm(prev => ({ ...prev, mode: e.target.value as CrewMode }))}
                className="w-full border-4 border-on-surface p-4 font-mono font-black uppercase bg-white"
              >
                <option value="friendly">Friendly</option>
                <option value="competitive">Competitive</option>
              </select>
            </label>
            <label className="block space-y-2">
              <span className="micro-label">Privacy</span>
              <select
                value={crewForm.privacy}
                onChange={(e) => setCrewForm(prev => ({ ...prev, privacy: e.target.value as CrewPrivacy }))}
                className="w-full border-4 border-on-surface p-4 font-mono font-black uppercase bg-white"
              >
                <option value="invite_only">Invite Only</option>
                <option value="link_request">Link Request</option>
                <option value="discoverable">Discoverable</option>
              </select>
            </label>
          </div>

          <button
            type="submit"
            disabled={crewActionBusy || !!cooldownText}
            className="bureau-btn w-full bg-brand-lime text-on-surface disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {crewActionBusy ? 'CREATING_CREW...' : 'INITIALIZE CREW'}
          </button>
        </form>
      </div>
    );
  }

  const tabs = [
    { id: 'home', label: 'Identity', icon: Users },
    { id: 'members', label: 'Members', icon: ShieldCheck },
    { id: 'memories', label: 'Memories', icon: History },
    { id: 'lore', label: 'Lore', icon: MessageSquare },
    { id: 'stats', label: 'Stats', icon: BarChart3 },
    { id: 'dispatch', label: 'Dispatch', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="pb-40 px-6 pt-12 space-y-16 max-w-5xl mx-auto relative overflow-hidden">
      {/* Header */}
      <header className="space-y-12 border-b-8 border-on-surface pb-12">
        <div className="flex flex-col md:flex-row items-start md:items-end gap-8 relative">
          <div className="w-40 h-40 bg-white border-8 border-on-surface shadow-[16px_16px_0px_black] overflow-hidden flex items-center justify-center -rotate-2 group transition-transform hover:rotate-0">
             {crew.badge ? <img src={crew.badge} alt="Badge" className="w-full h-full object-cover" /> : <Users className="w-20 h-20 text-on-surface" />}
          </div>
          <div className="space-y-4 flex-1">
             <div className="flex items-center gap-3">
               <div className="bureau-tag bg-brand-lime text-on-surface border-2 border-on-surface shadow-[4px_4px_0px_black] px-3 py-1 text-[10px] font-black uppercase">
                 {crew.currentSeason}_UNIT
               </div>
               {crewRank > 0 && <div className="bureau-tag bg-brand-orange text-white border-2 border-on-surface shadow-[4px_4px_0px_black] px-3 py-1 text-[10px] font-black uppercase">RANK_#{crewRank}</div>}
             </div>
             <h1 className="font-display text-huge uppercase tracking-tighter leading-none italic font-black text-on-surface">{crew.name}</h1>
             <p className="font-display text-2xl italic opacity-100 text-on-surface/40 uppercase font-black tracking-widest leading-none">
               ESTABLISHED // {formatSafeDateOnly(crew.createdAt)}
             </p>
          </div>
          <div className="absolute top-0 right-0 hidden md:block opacity-[0.03] rotate-12 scale-150 pointer-events-none">
             <Users className="w-64 h-64 text-on-surface" />
          </div>
        </div>

        {/* Tab Rail */}
        <div className="flex gap-4 border-b-4 border-on-surface/5 pb-0 flex-nowrap overflow-x-auto no-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "px-8 py-4 flex items-center gap-3 font-display uppercase tracking-[0.2em] text-xs transition-all border-b-8 font-black shrink-0",
                activeTab === tab.id 
                  ? "border-brand-orange text-on-surface scale-105" 
                  : "border-transparent text-on-surface/30 hover:text-on-surface hover:border-on-surface/10"
              )}
            >
              <tab.icon className={cn("w-5 h-5", activeTab === tab.id ? "text-brand-orange" : "text-current")} />
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Tab Content */}
      <div className="min-h-[40vh]">
        {activeTab === 'members' && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-500">
            <section className="bg-white border-8 border-on-surface p-6 sm:p-8 shadow-[12px_12px_0px_black] space-y-8">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                  <h3 className="font-display text-4xl italic uppercase tracking-tighter font-black leading-none">Crew Members</h3>
                  <p className="font-mono text-[10px] uppercase tracking-widest opacity-50">
                    {rosterState?.crew?.memberCount || crew.memberCount || crew.members?.length || 0} / {rosterState?.crew?.memberLimit || crew.memberLimit || 8} Members
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => refreshCrewManagement()}
                  className="bureau-btn bg-white text-on-surface text-xs"
                >
                  Refresh Roster
                </button>
              </div>

              {crewActionError && (
                <div className="border-2 border-red-500 bg-red-50 p-3 font-mono text-xs font-black text-red-700 uppercase">
                  {crewActionError}
                </div>
              )}

              {incomingInvites.length > 0 && (
                <div className="border-4 border-brand-cyan bg-brand-cyan/10 p-4 space-y-4">
                  <h4 className="font-display font-black italic text-2xl uppercase">Your Invitations</h4>
                  {incomingInvites.map(invite => (
                    <div key={invite.id} className="bg-white border-2 border-on-surface p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <p className="font-display font-black uppercase text-xl">{invite.crew?.name || 'Crew Invite'}</p>
                        <p className="font-mono text-[10px] uppercase opacity-60">
                          {invite.crew?.mode || 'friendly'} / expires {formatSafeDateOnly(invite.expiresAt)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button className="bureau-btn bg-brand-lime text-on-surface text-[10px]" onClick={() => runCrewAction('accept invite', () => acceptCrewInvite(invite.id))}>Accept</button>
                        <button className="bureau-btn bg-white text-on-surface text-[10px]" onClick={() => runCrewAction('decline invite', () => declineCrewInvite(invite.id))}>Decline</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {rosterState?.permissions?.canInvite && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="border-4 border-on-surface/20 p-5 space-y-4">
                    <h4 className="font-display font-black italic text-2xl uppercase">Invite People</h4>
                    <input
                      value={inviteQuery}
                      onChange={e => setInviteQuery(e.target.value)}
                      placeholder="Search username or display name..."
                      className="w-full border-4 border-on-surface p-3 font-mono text-xs font-black uppercase"
                    />
                    <div className="space-y-2">
                      {inviteResults.length === 0 ? (
                        <p className="font-mono text-[10px] opacity-50 uppercase">No eligible users found yet.</p>
                      ) : inviteResults.map(result => (
                        <div key={result.userId} className="flex items-center justify-between gap-3 bg-paper-light border-2 border-on-surface p-3">
                          <div>
                            <p className="font-display font-black uppercase">{result.displayName}</p>
                            <p className="font-mono text-[10px] opacity-50">@{result.username || result.userId.slice(0, 8)}</p>
                          </div>
                          <button
                            className="bureau-btn bg-brand-lime text-on-surface text-[10px]"
                            onClick={() => runCrewAction('send invite', () => createDirectCrewInvite(crew.id, result.userId))}
                          >
                            Send Invite
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-4 border-on-surface/20 p-5 space-y-4">
                    <h4 className="font-display font-black italic text-2xl uppercase">Manage Invite Link</h4>
                    {inviteLink ? (
                      <div className="space-y-3">
                        <div className="bg-black text-white p-3 font-mono text-[10px] break-all">{inviteLink.url}</div>
                        <p className="font-mono text-[10px] uppercase opacity-60">Expires {formatSafeDateOnly(inviteLink.expiresAt)}</p>
                        <div className="aspect-square max-w-[160px] border-4 border-on-surface bg-white grid grid-cols-5 gap-1 p-3" aria-label="Invite QR-style code">
                          {Array.from({ length: 25 }).map((_, idx) => (
                            <div key={idx} className={(idx + inviteLink.url.length) % 3 === 0 ? 'bg-on-surface' : 'bg-transparent'} />
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button className="bureau-btn bg-brand-cyan text-on-surface text-[10px]" onClick={() => navigator.clipboard?.writeText(inviteLink.url)}>Copy Link</button>
                          <button className="bureau-btn bg-white text-on-surface text-[10px]" onClick={() => runCrewAction('revoke invite link', async () => { await revokeCrewInviteLink(inviteLink.inviteId); setInviteLink(null); }, 'Revoke this Crew invite link?')}>Revoke Link</button>
                        </div>
                      </div>
                    ) : (
                      <button
                        className="bureau-btn bg-brand-orange text-white text-[10px]"
                        onClick={() => runCrewAction('generate invite link', async () => {
                          const generated = await generateCrewInviteLink(crew.id);
                          const absoluteUrl = new URL(generated.inviteUrl, window.location.origin).toString();
                          setInviteLink({ inviteId: generated.invite.id, url: absoluteUrl, expiresAt: generated.invite.expiresAt });
                        })}
                      >
                        Generate Invite Link
                      </button>
                    )}
                    <p className="font-serif italic text-xs opacity-60">
                      Invite links expire after 7 days. Link-request Crews route people into a request queue instead of instant membership.
                    </p>
                  </div>
                </div>
              )}

              {rosterState?.permissions?.canApproveRequests && (
                <div className="border-4 border-brand-orange/60 bg-brand-orange/5 p-5 space-y-4">
                  <h4 className="font-display font-black italic text-2xl uppercase">Pending Join Requests</h4>
                  {!rosterState.pendingRequests?.length ? (
                    <p className="font-mono text-[10px] uppercase opacity-50">No pending requests.</p>
                  ) : rosterState.pendingRequests.map(request => (
                    <div key={request.id} className="bg-white border-2 border-on-surface p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <p className="font-display font-black uppercase">{request.applicantSnapshot?.displayNameSnapshot || request.userId}</p>
                        <p className="font-mono text-[10px] opacity-50">@{request.applicantSnapshot?.usernameSnapshot || request.userId.slice(0, 8)} / {formatSafeDateOnly(request.createdAt)}</p>
                      </div>
                      <div className="flex gap-2">
                        <button className="bureau-btn bg-brand-lime text-on-surface text-[10px]" onClick={() => runCrewAction('approve request', () => approveCrewJoinRequest(request.id))}>Approve</button>
                        <button className="bureau-btn bg-white text-on-surface text-[10px]" onClick={() => runCrewAction('decline request', () => declineCrewJoinRequest(request.id))}>Decline</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {(['founder', 'captain', 'member'] as const).map(role => {
                const members = (rosterState?.members || []).filter(member => member.status === 'active' && member.role === role);
                const label = role === 'founder' ? 'Founder' : role === 'captain' ? 'Captains' : 'Members';
                return (
                  <div key={role} className="space-y-3">
                    <h4 className="font-display font-black italic text-2xl uppercase">{label}</h4>
                    {members.length === 0 ? (
                      <p className="font-mono text-[10px] uppercase opacity-50">none</p>
                    ) : members.map(member => {
                      const isSelf = member.userId === user?.uid;
                      const viewerRole = rosterState?.viewerMembership?.role;
                      const canPromote = viewerRole === 'founder' && member.role === 'member';
                      const canDemote = viewerRole === 'founder' && member.role === 'captain';
                      const canRemove = !isSelf && member.role !== 'founder' && (viewerRole === 'founder' || (viewerRole === 'captain' && member.role === 'member'));
                      return (
                        <div key={member.userId} className="bg-white border-4 border-on-surface p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-[5px_5px_0px_black]">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-brand-lime border-2 border-on-surface flex items-center justify-center font-display font-black">
                              {(member.displayNameSnapshot || member.displayName || member.userId).slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-display font-black uppercase text-xl leading-none">{member.displayNameSnapshot || member.displayName || member.userId}</p>
                              <p className="font-mono text-[10px] uppercase opacity-50">
                                @{member.usernameSnapshot || member.userId.slice(0, 8)} / {member.role} / joined {formatSafeDateOnly(member.joinedAt)}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {canPromote && <button className="bureau-btn bg-brand-cyan text-on-surface text-[10px]" onClick={() => runCrewAction('promote captain', () => promoteCrewMemberToCaptain(crew.id, member.userId), 'Promote this member to Captain?')}>Promote to Captain</button>}
                            {canDemote && <button className="bureau-btn bg-white text-on-surface text-[10px]" onClick={() => runCrewAction('remove captain role', () => removeCrewCaptainRole(crew.id, member.userId), 'Remove Captain role?')}>Remove Captain</button>}
                            {canRemove && <button className="bureau-btn bg-red-500 text-white text-[10px]" onClick={() => runCrewAction('remove member', () => removeCrewMember(crew.id, member.userId), 'Remove this user from the Crew? Their personal archive and prior Crew archive snapshots remain unchanged.')}>Remove from Crew</button>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </section>
          </div>
        )}

        {activeTab === 'memories' && (
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-500">
            <CrewMemoriesFeed />
          </div>
        )}

        {activeTab === 'home' && (
          <div className="space-y-20 animate-in fade-in slide-in-from-bottom-6 duration-500">
            <section className="space-y-8">
               <div className="flex items-center gap-6">
                 <h3 className="font-display text-4xl italic uppercase tracking-tighter text-on-surface font-black">Current_Deployment</h3>
                 <div className="h-2 flex-grow bg-on-surface/10" />
               </div>
               <div className="bg-white border-4 border-on-surface p-12 shadow-[12px_12px_0px_var(--color-brand-cyan)] relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-full bg-brand-cyan opacity-5 -skew-x-12 translate-x-12" />
                  <div className="flex flex-col items-center text-center space-y-8 relative z-10">
                    <div className="w-24 h-24 bg-on-surface text-brand-cyan border-4 border-on-surface flex items-center justify-center shadow-[8px_8px_0px_var(--color-brand-orange)] -rotate-6 transition-transform group-hover:rotate-0">
                      <RotateCcw className="w-12 h-12 animate-spin-slow" />
                    </div>
                    <div className="space-y-4">
                      <p className="font-display text-5xl uppercase tracking-tighter italic font-black text-on-surface">Season 1: The First Exit</p>
                      <p className="font-display text-2xl italic opacity-60 text-on-surface max-w-xl mx-auto leading-tight">
                        "Crews are currently operating in the Mayflower quadrant. Field streams verified."
                      </p>
                    </div>
                  </div>
               </div>
            </section>

            <section className="space-y-8">
              <div className="flex items-center gap-6">
                <h3 className="font-display text-4xl italic uppercase tracking-tighter text-on-surface font-black">Operational_Members</h3>
                <div className="h-2 flex-grow bg-on-surface/10" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {crew.members.map((m, i) => (
                  <div key={i} className="bg-white border-4 border-on-surface p-6 flex items-center gap-6 shadow-[8px_8px_0px_black] hover:-translate-y-1 transition-all group">
                    <div className="w-16 h-16 bg-brand-lime border-4 border-on-surface flex items-center justify-center font-display font-black text-xl italic -rotate-3 group-hover:rotate-0 transition-transform">
                      {m.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 space-y-1">
                       <p className="font-display text-2xl uppercase tracking-tighter italic font-black text-on-surface">Player_{m.slice(0, 8)}</p>
                       <p className="text-[10px] font-mono font-black opacity-40 uppercase tracking-widest text-brand-orange">ROLE: FIELD_SCOUT</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'lore' && (
          <div className="space-y-20 animate-in fade-in slide-in-from-bottom-6 duration-500">
            <section className="space-y-10">
               <div className="flex items-center gap-6">
                 <h3 className="font-display text-4xl italic uppercase tracking-tighter text-on-surface font-black">Seasonal_Highlights</h3>
                 <div className="h-2 flex-grow bg-on-surface/10" />
                 <Sparkles className="w-8 h-8 text-brand-orange" />
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {[
                    { label: 'Most Suspicious Entry', value: lore?.highlights?.mostSuspiciousEntry ? `ENTRY_${lore.highlights.mostSuspiciousEntry.slice(-4).toUpperCase()}` : 'No suspicious activity yet. Boring, but respectable.', color: 'var(--color-brand-lime)' },
                    { label: 'Biggest Comeback', value: lore?.highlights?.biggestComeback || 'Steady state maintained. No major swings recorded.', color: 'var(--color-brand-orange)' },
                    { label: 'Most Chaotic Trip', value: lore?.highlights?.mostChaoticTrip || 'This crew has not caused enough trouble to be studied.', color: 'var(--color-brand-cyan)' },
                    { label: 'Field Checks Survived', value: lore?.highlights?.mostFieldChecksSurvived || '0 (Clean Record)', color: 'var(--color-on-surface)' },
                  ].map(h => (
                    <div key={h.label} className="bg-white border-4 border-on-surface p-10 shadow-[12px_12px_0px_black] relative group overflow-hidden">
                       <div className="absolute top-0 left-0 w-full h-2" style={{ backgroundColor: h.color }} />
                       <p className="micro-label font-black opacity-40 mb-4">{h.label.toUpperCase()}</p>
                       <p className="font-display text-3xl italic font-black uppercase text-on-surface leading-tight leading-none group-hover:text-brand-orange transition-colors">{h.value}</p>
                    </div>
                  ))}
               </div>
            </section>

            <section className="space-y-8">
               <div className="flex items-center gap-6">
                 <h3 className="font-display text-4xl italic uppercase tracking-tighter text-on-surface font-black">Internal_Communication</h3>
                 <div className="h-2 flex-grow bg-on-surface/10" />
               </div>

               <div className="space-y-6">
                  {lore?.insideJokes?.length ? lore.insideJokes.map((joke, i) => (
                     <div key={i} className="bg-white border-4 border-on-surface p-8 shadow-[8px_8px_0px_var(--color-brand-lime)] relative group overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-100 transition-opacity">
                          <MessageSquare className="w-12 h-12 text-on-surface" />
                        </div>
                        <p className="font-display text-3xl italic font-black text-on-surface leading-tight uppercase tracking-tight">"{joke}"</p>
                     </div>
                  )) : (
                    <p className="font-display text-2xl italic opacity-40 text-center py-12 uppercase tracking-widest leading-none">Intelligence pending. Document a collective moment below.</p>
                  )}
               </div>
               <div className="pt-8 flex gap-6">
                  <div className="flex-grow relative">
                    <input 
                      type="text" 
                      placeholder="DOCUMENT A COLLECTIVE MOMENT..."
                      className="w-full bg-white border-4 border-on-surface p-6 text-xl font-display font-black italic uppercase outline-none focus:bg-brand-lime/10 transition-colors placeholder:opacity-20"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          // handleAddJoke(e.currentTarget.value)
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                  </div>
                  <button className="bureau-btn bg-on-surface text-white hover:bg-brand-orange transition-colors px-10 shadow-[8px_8px_0px_var(--color-brand-lime)]">ADD_LORE</button>
               </div>
            </section>

            <section className="space-y-4 pt-12 border-t-4 border-on-surface placeholder:opacity-20">
               <div className="flex items-center gap-6 mb-8">
                 <h3 className="font-display text-4xl italic uppercase tracking-tighter text-on-surface font-black">Field_Artifacts</h3>
                 <div className="h-2 flex-grow bg-on-surface/10" />
               </div>
               <CrewArtifactsGallery artifacts={crewArtifacts} />
            </section>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="space-y-16 animate-in fade-in slide-in-from-bottom-6 duration-500">
             <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'APPROVED', val: lore?.seasonStats?.S1?.totalApprovedEntries || 0, icon: ShieldCheck, color: 'var(--color-brand-lime)' },
                  { label: 'QUESTIONED', val: lore?.seasonStats?.S1?.totalRejectedEntries || 0, icon: AlertTriangle, color: 'var(--color-error)' },
                  { label: 'WEEKLY_SCORE', val: crewStanding?.totalScore || 0, icon: Trophy, color: 'var(--color-brand-orange)' },
                  { label: 'WEEKLY_RANK', val: crewRank > 0 ? `#${crewRank}` : '---', icon: BarChart3, color: 'var(--color-brand-cyan)' },
                ].map(stat => (
                  <div key={stat.label} className="bg-white border-4 border-on-surface p-8 flex flex-col items-center justify-center space-y-4 shadow-[8px_8px_0px_black] relative group">
                    <div className="absolute top-0 left-0 w-full h-2" style={{ backgroundColor: stat.color }} />
                    <stat.icon className="w-10 h-10 opacity-20 group-hover:opacity-100 transition-opacity" style={{ color: stat.color }} />
                    <p className="font-display text-5xl italic font-black leading-none text-on-surface">{stat.val}</p>
                    <p className="micro-label font-black opacity-40 uppercase tracking-widest">{stat.label}</p>
                  </div>
                ))}
             </div>
             
             {/* Score Journey Placeholder */}
             <div className="bg-white border-8 border-on-surface p-12 shadow-[16px_16px_0px_black] relative overflow-hidden h-80 flex items-center justify-center">
                <div className="absolute inset-0 opacity-5 flex flex-col justify-around pointer-events-none">
                  {[...Array(10)].map((_, i) => <div key={i} className="h-0.5 w-full bg-on-surface" />)}
                  <div className="absolute inset-0 flex justify-around">
                     {[...Array(10)].map((_, i) => <div key={i} className="w-0.5 h-full bg-on-surface" />)}
                  </div>
                </div>
                <div className="text-center space-y-6 relative z-10">
                   <div className="w-20 h-20 bg-on-surface text-brand-lime border-4 border-on-surface flex items-center justify-center mx-auto shadow-[8px_8px_0px_black] rotate-12">
                     <BarChart3 className="w-10 h-10" />
                   </div>
                   <div className="space-y-4">
                     <p className="font-display text-3xl uppercase tracking-tighter italic font-black text-on-surface">Statistical_Visualization_Locked</p>
                     <p className="font-display text-lg italic opacity-40 uppercase font-black tracking-widest">Collective analytics require more seasonal data points.</p>
                   </div>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'dispatch' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-500">
            {!dispatch ? (
              <div className="flex flex-col items-center justify-center p-20 text-center space-y-8 bg-paper border-8 border-dashed border-on-surface/20 shadow-[16px_16px_0px_var(--color-on-surface)] opacity-40">
                <Lock className="w-24 h-24 text-on-surface" />
                <div className="space-y-4">
                   <h2 className="font-display text-5xl uppercase tracking-tighter italic font-black">Dispatch_Locked</h2>
                   <p className="font-display text-xl italic opacity-60 uppercase font-black tracking-widest leading-none">Intelligence sealed until season wrap-up methods manifest.</p>
                </div>
              </div>
            ) : (
              <div className="bg-white border-8 border-on-surface p-16 space-y-16 shadow-[24px_24px_0px_black] relative overflow-hidden">
                 <div className="absolute top-12 right-12 opacity-40 scale-125 z-20">
                   {/* Badge Sticker */}
                   <div className="w-40 h-40 bg-brand-orange text-white border-8 border-on-surface flex items-center justify-center rotate-12 font-black text-center text-xs uppercase tracking-widest shadow-[12px_12px_0px_black]">
                     CERTIFIED<br/>SEASON_1<br/>VETERAN
                   </div>
                 </div>

                 <div className="absolute -left-20 -top-20 w-64 h-64 bg-brand-lime opacity-10 rounded-full blur-3xl pointer-events-none" />

                 <header className="space-y-6 border-b-8 border-on-surface pb-12 relative z-10">
                    <div className="w-fit bg-on-surface text-brand-lime px-4 py-1 border-2 border-on-surface font-black text-[11px] uppercase tracking-[0.4em] italic mb-4">
                      OFFICIAL_FIELD_DISPATCH // SEASON_01
                    </div>
                    <h2 className="font-display text-huge uppercase tracking-tighter leading-none italic font-black text-on-surface">{crew.name}</h2>
                    <div className="flex justify-between items-end">
                      <div className="space-y-2">
                        <p className="font-display text-3xl font-black uppercase text-on-surface leading-none">FINAL_RANK: #{dispatch.finalRank}</p>
                        <p className="font-display text-xl font-black uppercase text-brand-orange leading-none">SCORE: {dispatch.finalScore}XP</p>
                      </div>
                      <div className="w-40 h-0.5 bg-on-surface/20" />
                    </div>
                 </header>

                 <div className="space-y-12 relative z-10">
                    <p className="font-display text-4xl italic font-black text-on-surface leading-tight uppercase tracking-tight">"{dispatch.summary.recapParagraph}"</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                       <div className="space-y-8">
                          <h4 className="font-display text-3xl italic font-black uppercase bg-on-surface text-white px-4 py-1 w-fit -rotate-2">Crew_Awards</h4>
                          <ul className="space-y-6">
                             {dispatch.summary.awards.map(a => (
                               <li key={a} className="flex items-center gap-4 group">
                                 <div className="w-10 h-10 border-4 border-on-surface bg-brand-lime flex items-center justify-center font-black group-hover:rotate-12 transition-transform">★</div>
                                 <span className="font-display text-2xl uppercase tracking-tighter font-black text-on-surface">{a}</span>
                               </li>
                             ))}
                          </ul>
                       </div>
                       <div className="space-y-8">
                          <h4 className="font-display text-3xl italic font-black uppercase bg-on-surface text-white px-4 py-1 w-fit rotate-2">Best_Evidence</h4>
                          <div className="aspect-square bg-white border-8 border-on-surface shadow-[16px_16px_0px_var(--color-brand-orange)] flex items-center justify-center overflow-hidden rotate-2 group hover:rotate-0 transition-transform">
                             {/* Preview of best entry placeholder */}
                             <div className="text-center space-y-2 opacity-20">
                               <MessageSquare className="w-16 h-16 mx-auto" />
                               <p className="font-display text-xs font-black uppercase tracking-[0.2em]">IMAGE_DECRYPTING...</p>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>

                 <footer className="pt-12 border-t-8 border-on-surface/10 flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
                    <p className="font-display text-xs font-black uppercase tracking-[0.3em] text-on-surface/40 text-center md:text-left">
                      Protocol_End_of_Seasonal_Record.<br/>Base_Operations_Remain_Active.
                    </p>
                    <button className="bureau-btn-huge bg-on-surface text-white hover:bg-brand-orange transition-colors px-12 py-4">EXPORT_IDENTITY_ASSET</button>
                 </footer>
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-500 max-w-3xl">
            <section className="bg-white border-8 border-on-surface p-8 shadow-[12px_12px_0px_black] space-y-6">
              <div className="flex items-center gap-4">
                <Settings className="w-8 h-8 text-brand-orange" />
                <div>
                  <h3 className="font-display text-4xl italic uppercase tracking-tighter font-black leading-none">Crew Settings</h3>
                  <p className="font-mono text-[10px] uppercase tracking-widest opacity-50">
                    Active membership is personal. Seasonal archive entries stay with the Crew.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
                <div className="border-2 border-on-surface/20 p-4">
                  <p className="opacity-50 uppercase">Crew ID</p>
                  <p className="font-black break-all">{crew.id}</p>
                </div>
                <div className="border-2 border-on-surface/20 p-4">
                  <p className="opacity-50 uppercase">Your Role</p>
                  <p className="font-black uppercase">{membershipState?.membership?.role || profile?.crewRole || 'member'}</p>
                </div>
                <div className="border-2 border-on-surface/20 p-4">
                  <p className="opacity-50 uppercase">Privacy</p>
                  <p className="font-black uppercase">{crew.privacy || 'invite_only'}</p>
                </div>
                <div className="border-2 border-on-surface/20 p-4">
                  <p className="opacity-50 uppercase">Mode</p>
                  <p className="font-black uppercase">{crew.mode || 'friendly'}</p>
                </div>
              </div>

              {crewActionError && (
                <div className="border-2 border-red-500 bg-red-50 p-3 font-mono text-xs font-black text-red-700 uppercase">
                  {crewActionError}
                </div>
              )}

              <div className="border-4 border-red-500/50 bg-red-50 p-5 space-y-3">
                <h4 className="font-display font-black italic text-2xl uppercase">Leave Crew</h4>
                <p className="font-serif italic text-sm opacity-70">
                  Leaving removes your active membership and starts a 7-day cooldown before you can join or create another Crew. Your already approved personal receipts are not changed.
                </p>
                <button
                  type="button"
                  onClick={handleLeaveCrew}
                  disabled={crewActionBusy}
                  className="bureau-btn bg-red-500 text-white disabled:opacity-50"
                >
                  {crewActionBusy ? 'UPDATING...' : 'LEAVE CREW'}
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
