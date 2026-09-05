import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  Settings, 
  History, 
  BarChart3, 
  ShieldCheck, 
  Zap, 
  Star, 
  Award,
  ChevronRight,
  LogOut,
  User,
  Compass,
  Book,
  Sparkles
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { cn } from '../lib/utils';
import { Card, FieldBadge, FieldCard, FieldCTA } from '../components/UI';
import { SkinSelector } from '../components/SkinSelector';
import { BadgeCollection } from '../components/BadgeCollection';
import { AvatarPreview } from '../components/AvatarPreview';
import { FeaturedStickerShowcase } from '../components/stickers/FeaturedStickerShowcase';
import { DEFAULT_AVATAR, AVATAR_MANIFEST } from '../constants/avatarAssets';
import { AvatarData } from '../types/avatar';
import { FIELD_TYPES } from '../constants';
import { getDisplayLabel } from '../utils/labelUtils';
import { isArchivedEntry, normalizeEntryStatus } from '../logic/entryLogic';
import { getApprovedSubmissionsForUser } from '../services/submission-utils';
import { LogbookFlipbook } from '../components/LogbookFlipbook';
import { applyProfileTabToSearchParams, type ProfileTab } from '../logic/profileTabs';
import {
  UNCLASSIFIED_LEVEL_TITLE,
  getExplorerTypeLevelTitle,
  getLevelProgress,
} from '../logic/playerLevel';
import { updateFeedPrivacy } from '../services/userService';
import { FieldPageHero } from '../components/FieldPageHero';
import { EmptyStatePanel } from '../components/FieldtripLoader';
import { FieldButton, FieldSection, FieldStatusChip, PlayerPageBody, PlayerPageShell } from '../components/player';

export default function ProfilePage() {
  const { 
    user,
    entries, 
    signOut, 
    badgeProgress, 
    profile, 
    updateProfile, 
    isAdmin,
    xp,
    points,
    pendingPoints,
    soloTripsCount,
    fieldTokens,
    approvedEntriesCount,
    submittedPendingChallengeIds,
    needsMoreProofChallengeIds,
    fieldType,
    fieldClassificationComplete,
    onboardingCompleted,
    activeSeason,
    loadMoreEntries,
    hasMoreEntries,
  } = useApp();
  const { fc } = useTheme();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState<AvatarData>({ ...DEFAULT_AVATAR });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isLoadingMoreLogbook, setIsLoadingMoreLogbook] = useState(false);

  const loadMoreLogbookEntries = React.useCallback(async () => {
    if (isLoadingMoreLogbook || !hasMoreEntries) return;
    setIsLoadingMoreLogbook(true);
    try {
      await loadMoreEntries();
    } finally {
      setIsLoadingMoreLogbook(false);
    }
  }, [hasMoreEntries, isLoadingMoreLogbook, loadMoreEntries]);

  const selectProfileTab = React.useCallback((tab: ProfileTab) => {
    setActiveTab(tab);
    setSearchParams(applyProfileTabToSearchParams(searchParams, tab), { replace: true });
  }, [searchParams, setSearchParams]);

  // Gating Guard against accidental "Start Mission -> Profile" routing errors
  React.useEffect(() => {
    const lastActionTime = sessionStorage.getItem('last_mission_action');
    if (lastActionTime) {
      const timeDiff = Date.now() - parseInt(lastActionTime);
      // If we landed on profile within 3 seconds of a Start Mission action, it's likely a regression redirect
      if (timeDiff < 3000) {
        console.warn("[RouteGuard] Start Mission attempted to route to Profile. Redirecting to deck/capture flow.");
        sessionStorage.removeItem('last_mission_action');
        
        const targetId = profile?.activeMissionId || profile?.activeTrip?.id;
        if (targetId) {
          navigate(`/capture?id=${targetId}`, { replace: true });
        } else {
          navigate('/missions', { replace: true });
        }
      }
    }
  }, [navigate, profile?.activeMissionId, profile?.activeTrip?.id]);

  // Handle tab and filtering from Search Params
  React.useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'overview' || tab === 'vault' || tab === 'history' || tab === 'settings' || tab === 'logbook') {
      if (tab === 'logbook') {
        setActiveTab('history');
      } else {
        setActiveTab(tab as any);
      }
    }
  }, [searchParams]);

  const approvedSubmissions = React.useMemo(() => {
    return entries.filter(e => !isArchivedEntry(e) && normalizeEntryStatus(e.status) === 'approved');
  }, [entries]);

  const logbookEntries = React.useMemo(() => {
    const filter = searchParams.get('filter');
    let base = [...entries];

    if (filter === 'starter') {
      const STARTER_MISSION_IDS = ["starter-1", "starter-2", "starter-3", "starter-signals"];
      base = base.filter(e => {
        const mid = (e.missionId || e.challengeId || '').toLowerCase();
        return STARTER_MISSION_IDS.includes(mid) || mid.startsWith('starter-');
      });
    }

    // Sort by most recent
    return base.sort((a, b) => {
      const dateA = a.createdAt ? (typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : (a.createdAt as any).seconds * 1000) : 0;
      const dateB = b.createdAt ? (typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : (b.createdAt as any).seconds * 1000) : 0;
      return dateB - dateA;
    });
  }, [entries, searchParams]);

  // Development-only logs for verification
  React.useEffect(() => {
    if (import.meta.env.DEV) {
      const approvedCount = approvedSubmissions.length;

      const pointsAwardedStatus = approvedSubmissions.map(e => ({
        id: e.id,
        status: e.status,
        pointsAwarded: e.pointsAwarded !== undefined ? e.pointsAwarded : (e as any).finalPointsAwarded
      }));

      console.log("[DEV_LOG] [ProfilePage] Syncing Profile Canonical Data:", {
        sourceCollection: "entries (via transaction query)",
        userId: profile?.id || "N/A",
        activeFilters: { uid: profile?.id || "N/A" },
        resultingApprovedCount: approvedCount,
        approvedEntriesCountInContext: approvedEntriesCount,
        pointsAwardedMap: pointsAwardedStatus,
        timestamp: new Date().toISOString()
      });
    }
  }, [approvedSubmissions, profile, approvedEntriesCount]);

  const levelProgress = getLevelProgress(xp);
  const level = levelProgress.level;
  const hasClassifiedRank = onboardingCompleted && fieldClassificationComplete;
  const displayedLevelTitle = hasClassifiedRank
    ? getExplorerTypeLevelTitle(level, fieldType)
    : UNCLASSIFIED_LEVEL_TITLE;

  const fieldTypeData = fieldType ? FIELD_TYPES[fieldType] : null;

  const pendingCount = submittedPendingChallengeIds?.size || 0;
  const nmpCount = needsMoreProofChallengeIds?.size || 0;

  const handleSignOut = async () => {
    if (confirm("Sign out of Fieldtrip?")) {
      await signOut();
      navigate('/');
    }
  };

  return (
    <PlayerPageShell department={activeTab === 'history' ? 'logbook' : activeTab === 'settings' ? 'settings' : 'profile'} className="skin-profile skin-logbook">
      <FieldPageHero
        variant="editorial"
        department={activeTab === 'history' ? 'logbook' : activeTab === 'settings' ? 'settings' : 'profile'}
        eyebrow={activeTab === 'history' ? 'Mission history' : activeTab === 'settings' ? 'Backstage' : 'Field record'}
        title={activeTab === 'history' ? 'LOGBOOK' : activeTab === 'settings' ? 'SETTINGS' : 'PROFILE'}
        subtitle={
          activeTab === 'history'
            ? 'What have I done?'
            : activeTab === 'settings'
              ? 'Controls. No extra game mode energy.'
              : 'Who am I in Fieldtrip and how am I doing?'
        }
        backgroundIcon={activeTab === 'history' ? <History className="h-64 w-64" /> : activeTab === 'settings' ? <Settings className="h-64 w-64" /> : <User className="h-64 w-64" />}
        infoCardLabel={activeTab === 'settings' ? 'Account' : 'Level'}
        infoCardValue={activeTab === 'settings' ? (profile?.name || 'Explorer') : level}
        infoCardSubtext={activeTab === 'settings' ? 'Utility controls' : displayedLevelTitle}
        infoCardAccent={activeTab === 'history' ? 'lime' : activeTab === 'settings' ? 'blue' : 'pink'}
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'history', label: 'Logbook' },
          { id: 'vault', label: 'Vault' },
          { id: 'settings', label: 'Settings' },
        ]}
        activeTab={activeTab}
        onTabChange={(id) => selectProfileTab(id as ProfileTab)}
      />

      <PlayerPageBody>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview' && (
            <div className="mx-auto max-w-2xl space-y-10">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Pending', count: pendingCount, status: 'pending' as const },
                  { label: 'Needs more proof', count: nmpCount, status: 'needs_more_proof' as const },
                  { label: 'Approved', count: approvedEntriesCount, status: 'approved' as const }
                ].map((stat) => (
                  <FieldCard key={stat.label} variant="paper" className="flex flex-col items-center gap-2 p-4">
                    <p className="font-display text-3xl font-black italic leading-none">{stat.count}</p>
                    <FieldStatusChip status={stat.status} />
                  </FieldCard>
                ))}
              </div>

              <FieldSection eyebrow="Identity" title="Explorer Type">
                <FieldCard variant="paper" className="p-8 bg-gradient-to-br from-white to-[#F9F7F2] border-[4px] border-on-surface shadow-[10px_10px_0px_black] rounded-[2.5rem] relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-brand-magenta/5 border-l-2 border-b-2 border-brand-magenta/10 -rotate-12 pointer-events-none" />
                  
                  <div className="flex flex-col sm:flex-row items-center gap-8 relative z-10">
                    <div className="relative group">
                       <AvatarPreview 
                        avatar={profile?.avatar || DEFAULT_AVATAR} 
                        size="md" 
                        className="w-24 h-24 rounded-[1.5rem] rotate-[-3.5deg] group-hover:rotate-0 transition-transform border-[3.5px] border-on-surface bg-white shadow-[6px_6px_0px_black]" 
                      />
                      <div className="absolute -bottom-3 -right-3 w-10 h-10 bg-brand-lime border-[3px] border-on-surface rounded-full flex items-center justify-center shadow-[3px_3px_0px_black] rotate-12">
                         <ShieldCheck className="w-5 h-5 text-on-surface" />
                      </div>
                    </div>
                    
                    <div className="flex-1 space-y-3 text-center sm:text-left">
                      <div className="flex flex-col items-center sm:items-start gap-1">
                        <FieldBadge variant="sticker" color="purple" size="xs" className="px-2 py-0.5 italic">{fieldTypeData?.name ? 'Explorer Type' : 'Unclassified'}</FieldBadge>
                        <h4 className="text-3xl font-black uppercase italic tracking-tighter text-on-surface leading-none mt-1">{fieldTypeData?.name || 'Trailblazer'}</h4>
                      </div>
                      <p className="text-sm font-serif italic font-bold opacity-60 leading-relaxed max-w-sm">
                        {fc('Trevor is squinting at reality with great interest.', 'Searching for hidden sparks in the Heatwave noise.')}
                      </p>
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-4">
                        <button 
                          onClick={() => {
                            setEditName(profile?.name || '');
                            if (profile?.avatar) {
                              setEditAvatar({ ...profile.avatar });
                            } else {
                              setEditAvatar({ ...DEFAULT_AVATAR });
                            }
                            setIsEditModalOpen(true);
                          }}
                          className="flex min-h-11 items-center gap-2 border-2 border-on-surface bg-brand-orange px-4 py-2 font-display text-xs font-black uppercase italic text-white shadow-[4px_4px_0px_black] active:translate-y-0.5 active:shadow-none"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-brand-lime" />
                          Edit profile
                        </button>

                        <button 
                          onClick={() => navigate('/field-id')}
                          className="flex min-h-11 items-center gap-2 font-sans text-sm font-bold text-on-surface/60 hover:text-brand-orange"
                        >
                          Open Field Identity <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </FieldCard>
              </FieldSection>

              <FeaturedStickerShowcase
                userId={user?.uid}
                onManage={() => navigate('/dex/stickers')}
              />

              <FieldSection eyebrow="Progress" title="How I'm doing">
                <FieldCard variant="paper" className="p-8 bg-white border-[4px] border-on-surface shadow-[10px_10px_0px_black] rounded-[2.5rem]">
                  <div className="space-y-6">
                    <div className="flex justify-between items-end">
                      <div className="space-y-1">
                         <p className="text-4xl font-display font-black italic uppercase tracking-tighter text-on-surface leading-none">Level {level}</p>
                         <p className="text-[10px] font-mono font-black uppercase tracking-widest text-on-surface/30 px-1">{displayedLevelTitle}</p>
                      </div>
                      <p className="text-[10px] font-mono font-black text-on-surface bg-brand-cyan/20 px-2 py-1 rounded border border-on-surface/10">
                        {levelProgress.xp.toLocaleString()} / {levelProgress.nextLevel.minXp.toLocaleString()} XP
                      </p>
                    </div>

                    <div className="space-y-2">
                       <div
                         className="h-6 bg-on-surface/5 border-[3px] border-on-surface rounded-full overflow-hidden p-1 shadow-inner flex"
                         role="progressbar"
                         aria-label="Progress to next player level"
                         aria-valuemin={0}
                         aria-valuemax={100}
                         aria-valuenow={Math.round(levelProgress.progressPercent)}
                       >
                         <motion.div 
                           initial={{ width: 0 }}
                           animate={{ width: `${levelProgress.progressPercent}%` }}
                           className="h-full bg-brand-lime rounded-full shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]"
                         />
                       </div>
                       <div className="flex justify-between px-1">
                          <span className="text-[8px] font-mono font-black uppercase text-on-surface/20">Current_Echelon</span>
                          <span className="text-[8px] font-mono font-black uppercase text-on-surface/20">
                            {levelProgress.xpToNextLevel.toLocaleString()} XP to level {levelProgress.nextLevel.level}
                          </span>
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 pt-2">
                      <div className="p-4 bg-on-surface/5 border-[2px] border-on-surface/10 rounded-2xl relative overflow-hidden group">
                        <div className="absolute top-[-10px] right-[-10px] opacity-5 rotate-12 transition-transform group-hover:scale-110">
                           <Compass className="w-16 h-16 text-on-surface" />
                        </div>
                        <p className="text-[9px] font-mono font-black opacity-30 uppercase tracking-[0.2em] mb-2 leading-none">{getDisplayLabel('LOGS_VERIFIED')}</p>
                        <p className="text-3xl font-display font-black italic text-on-surface leading-none tracking-tight">{approvedEntriesCount}</p>
                      </div>
                      <div className="p-4 bg-on-surface/5 border-[2px] border-on-surface/10 rounded-2xl relative overflow-hidden group">
                        <div className="absolute top-[-10px] right-[-10px] opacity-5 rotate-12 transition-transform group-hover:scale-110">
                           <Star className="w-16 h-16 text-on-surface" />
                        </div>
                        <p className="text-[9px] font-mono font-black opacity-30 uppercase tracking-[0.2em] mb-2 leading-none">{getDisplayLabel('TOKENS')}</p>
                        <p className="text-3xl font-display font-black italic text-brand-orange leading-none tracking-tight">{fieldTokens}</p>
                      </div>
                    </div>
                  </div>
                </FieldCard>
              </FieldSection>

              {/* Quick Links */}
              <div className="grid grid-cols-2 gap-4 pb-8">
                 <button 
                   onClick={() => selectProfileTab('history')}
                   className="p-6 bg-white border-[3px] border-on-surface rounded-[2rem] shadow-[6px_6px_0px_black] flex flex-col items-center gap-3 active:translate-y-1 active:shadow-none transition-all group"
                 >
                   <div className="w-12 h-12 bg-brand-magenta/10 border-2 border-brand-magenta/20 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform">
                      <History className="w-6 h-6 text-brand-magenta" />
                   </div>
                   <span className="text-sm font-black uppercase tracking-wide text-on-surface">Open Logbook</span>
                 </button>
                 <button 
                   onClick={() => selectProfileTab('vault')}
                   className="p-6 bg-white border-[3px] border-on-surface rounded-[2rem] shadow-[6px_6px_0px_black] flex flex-col items-center gap-3 active:translate-y-1 active:shadow-none transition-all group"
                 >
                   <div className="w-12 h-12 bg-brand-orange/10 border-2 border-brand-orange/20 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform">
                      <BarChart3 className="w-6 h-6 text-brand-orange" />
                   </div>
                   <span className="text-sm font-black uppercase tracking-wide text-on-surface">Open Vault</span>
                 </button>
              </div>
            </div>
          )}
          
          {activeTab === 'vault' && (
            <div className="mx-auto max-w-2xl space-y-6">
              <p className="font-sans text-sm font-bold text-on-surface/70">Badges and achievements you've earned.</p>
              <BadgeCollection progress={badgeProgress || []} />
            </div>
          )}

          {activeTab === 'history' && (
            <div className="mx-auto max-w-2xl space-y-6">
              {logbookEntries.length === 0 ? (
                <EmptyStatePanel
                  title="No receipts yet"
                  body="Logbook is your mission and proof history."
                  hint="Draw a mission, take a photo, and submissions will land here as Pending, Approved, Needs more proof, or Rejected."
                  icon={<History className="h-8 w-8" />}
                  action={<FieldButton onClick={() => navigate('/missions')}>Draw a mission</FieldButton>}
                />
              ) : (
                <LogbookFlipbook
                  entries={logbookEntries}
                  displayName={profile?.displayName || profile?.username || 'Explorer'}
                  seasonName={activeSeason?.title || activeSeason?.id || 'Current Season'}
                  explorerTypeName={fieldTypeData?.name || profile?.fieldTypeName || 'Unclassified Explorer'}
                  proofStickerAssignments={profile?.proofStickerAssignments || {}}
                  hasMore={hasMoreEntries}
                  loadingMore={isLoadingMoreLogbook}
                  onRequestMore={loadMoreLogbookEntries}
                />
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="mx-auto max-w-2xl space-y-4">

                  <SkinSelector />

                  {(profile?.role === 'admin' || isAdmin) && (
                    <div className="ft-settings-group space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h2>Admin</h2>
                          <p>Proof review, moderation, and overrides.</p>
                        </div>
                        <Shield className="w-6 h-6 text-brand-orange" />
                      </div>
                      <FieldButton className="w-full" onClick={() => navigate('/admin')}>
                        Open admin board
                      </FieldButton>
                    </div>
                  )}

                 <div className="ft-settings-group space-y-4">
                    <div className="space-y-1">
                       <h2>Motion</h2>
                       <p>How loud reward celebrations feel.</p>
                    </div>
                    
                    <div className="space-y-4">
                       <p className="text-sm font-sans font-bold text-on-surface/70 leading-relaxed">
                         Full keeps the stamps and confetti. Reduced calms the motion. Minimal sends quiet notifications.
                       </p>
                       <div className="grid grid-cols-3 gap-2 font-mono">
                          {[
                             { id: 'full', label: '🌋 Full' },
                             { id: 'reduced', label: '🍃 Reduced' },
                             { id: 'minimal', label: '⚡ Minimal' }
                          ].map(opt => {
                             const active = (profile?.preferences?.rewardAnimationIntensity || 'full') === opt.id;
                             return (
                                <button
                                   key={opt.id}
                                   onClick={async () => {
                                      const currentPrefs = profile?.preferences || {};
                                      await updateProfile(profile?.id || '', {
                                         preferences: {
                                            ...currentPrefs,
                                            rewardAnimationIntensity: opt.id as any
                                         }
                                      });
                                   }}
                                   className={cn(
                                      "py-3 text-[9px] uppercase font-black tracking-wider transition-all rounded-xl border-2 text-center",
                                      active 
                                         ? "bg-on-surface text-white border-on-surface shadow-[2px_2px_0px_black]" 
                                         : "bg-white text-on-surface/50 hover:bg-paper-dark border-on-surface shadow-[1px_1px_0px_black]"
                                   )}
                                >
                                   {opt.label}
                                </button>
                             );
                          })}
                       </div>
                    </div>
                 </div>
                 
                  <div className="ft-settings-group space-y-4">
                     <div className="space-y-1">
                        <h2>Privacy</h2>
                        <p>Who can see receipts, hype, and location.</p>
                     </div>
                     
                     <div className="space-y-4 mt-2">
                        <p className="text-sm font-sans font-bold text-on-surface/70 leading-relaxed text-left">
                           Choose who can see your receipts. Exact GPS stays off unless you turn it on.
                        </p>
                        
                        <div className="space-y-3">
                           <fieldset className="space-y-2">
                              <legend className="font-display text-lg font-black uppercase">Who can see my receipts?</legend>
                              <p className="text-[10px] opacity-55">The feed defaults to your Crew. Public discovery is reserved for a deliberate future discovery surface.</p>
                              {[
                                 ['crew_only', 'Crew only'],
                                 ['followers_only', 'People I add'],
                                 ['public_discovery', 'Public discovery'],
                                 ['private', 'Private'],
                              ].map(([value, label]) => {
                                 const selected = (profile?.preferences?.feedVisibility || (profile?.preferences?.privateApprovedPhotos ? 'private' : 'crew_only')) === value;
                                 const available = value === 'crew_only' || value === 'private';
                                 return <button key={value} type="button" disabled={!available} onClick={async () => {
                                    await updateFeedPrivacy(value as 'crew_only' | 'followers_only' | 'public_discovery' | 'private');
                                 }} className={cn("w-full p-3 flex items-center justify-between font-mono text-[10px] uppercase font-black tracking-wider rounded-xl border-2 text-left disabled:opacity-40", selected ? "bg-brand-lime text-on-surface border-on-surface shadow-[2px_2px_0px_black]" : "bg-white text-on-surface/50 border-on-surface")}>
                                    <span>{label}</span><span>{selected ? 'Selected' : available ? '' : 'Coming later'}</span>
                                 </button>;
                              })}
                           </fieldset>
                           {[
                              ['allowHype', 'Allow Hype'],
                              ['allowSusReports', 'Allow private Sus reports'],
                           ].map(([key, label]) => {
                              const enabled = profile?.preferences?.[key as 'allowHype' | 'allowSusReports'] !== false;
                              return <button key={key} type="button" onClick={async () => {
                                 const currentPrefs = profile?.preferences || {};
                                 await updateProfile(profile?.id || '', { preferences: { ...currentPrefs, [key]: !enabled } });
                              }} className="w-full p-3 flex items-center justify-between font-mono text-[10px] uppercase font-black tracking-wider rounded-xl border-2 bg-white text-on-surface border-on-surface">
                                 <span>{label}</span><span>{enabled ? 'Allowed' : 'Off'}</span>
                              </button>;
                           })}

                           {/* Preference 2: Show exact coordinates (showExactCoordinates) */}
                           <button
                              onClick={async () => {
                                 const currentPrefs = profile?.preferences || {};
                                 await updateProfile(profile?.id || '', {
                                    preferences: {
                                       ...currentPrefs,
                                       showExactCoordinates: !currentPrefs.showExactCoordinates
                                    }
                                 });
                              }}
                              className={cn(
                                 "w-full p-4 flex items-center justify-between font-mono text-[10px] uppercase font-black tracking-wider transition-all rounded-xl border-2 text-left",
                                 profile?.preferences?.showExactCoordinates
                                    ? "bg-brand-lime text-on-surface border-on-surface shadow-[2px_2px_0px_black]"
                                    : "bg-white text-on-surface/50 hover:bg-paper-dark border-on-surface shadow-[1px_1px_0px_black]"
                              )}
                           >
                              <span>🛰️ Share Exact GPS Coordinates</span>
                              <span>{profile?.preferences?.showExactCoordinates ? "SHARING" : "SOFTENED"}</span>
                           </button>
                        </div>
                     </div>
                  </div>

                  <div className="ft-settings-group space-y-4">
                    <div className="space-y-1">
                       <h2>Account</h2>
                       <p>Sign out of this device.</p>
                    </div>
                    <div className="space-y-3">
                       <FieldButton variant="destructive" className="w-full" onClick={handleSignOut}>
                         <LogOut className="w-4 h-4" />
                         Sign out
                       </FieldButton>
                    </div>
                 </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
      </PlayerPageBody>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[160] bg-on-surface/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white border-4 border-on-surface rounded-[2rem] p-6 max-w-lg w-full shadow-[10px_10px_0px_black] relative space-y-6 max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              <div className="flex items-center justify-between border-b-4 border-dashed border-on-surface/10 pb-4">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-1 bg-brand-orange shadow-[1px_1px_0px_black]" />
                  <span className="text-[10px] font-mono font-black text-on-surface/50 uppercase tracking-[0.2em]">Edit profile</span>
                </div>
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="font-display font-black text-xs uppercase bg-stone-100 hover:bg-stone-200 border-2 border-on-surface px-2.5 py-1 rounded shadow-[2px_2px_0px_black] active:translate-y-0.5 active:shadow-none transition-all"
                >
                  X Close
                </button>
              </div>

              {/* Display Name Input */}
              <div className="space-y-2 text-left">
                <label className="text-xs font-sans font-bold text-on-surface/70 block">Display name</label>
                <input 
                  type="text" 
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-4 py-3 bg-[#FFFDF9] border-[3px] border-on-surface rounded-xl shadow-[4px_4px_0px_black] focus:shadow-none focus:translate-y-1 focus:outline-none font-display font-black uppercase text-sm tracking-tight transition-all"
                  maxLength={25}
                />
              </div>

              {/* Avatar Customized Option Selection */}
              <div className="space-y-4 text-left">
                <label className="text-[10px] font-mono font-black text-on-surface/50 uppercase tracking-widest block font-bold">AVATAR PREFERENCE</label>

                {/* Live Real-time Visualizer */}
                <div className="flex items-center gap-4 p-4 bg-on-surface/5 border-2 border-dashed border-on-surface/15 rounded-2xl">
                  <AvatarPreview 
                    avatar={editAvatar} 
                    size="md" 
                    className="w-20 h-20 border-[3px] border-on-surface bg-white shadow-[4px_4px_0px_black] rounded-[1.2rem] shrink-0" 
                    showBackground={true}
                  />
                  <div className="space-y-1 bg-transparent">
                    <p className="font-display font-black uppercase text-[10px] tracking-wide text-on-surface">AURA COMPOSITION</p>
                    <p className="font-mono text-[9px] text-on-surface/50 leading-relaxed uppercase">
                      Base: {AVATAR_MANIFEST.bases.find(b => b.id === editAvatar.baseId)?.name || 'None'}<br/>
                      Hair: {AVATAR_MANIFEST.hairs.find(h => h.id === editAvatar.hairId)?.name || 'None'}<br/>
                      Outfit: {AVATAR_MANIFEST.outfits.find(o => o.id === editAvatar.outfitId)?.name || 'None'}<br/>
                      Canvas: {AVATAR_MANIFEST.backgrounds.find(bg => bg.id === editAvatar.backgroundId)?.name || 'None'}
                    </p>
                  </div>
                </div>

                {/* Subsections of Avatar Selection */}
                <div className="space-y-5 max-h-[35vh] overflow-y-auto pr-1 no-scrollbar border-t-2 border-on-surface/5 pt-4">
                  {[
                    { key: 'backgroundId', label: 'Canvas Background', optionKey: 'backgrounds' },
                    { key: 'baseId', label: 'Agent Base structure', optionKey: 'bases' },
                    { key: 'hairId', label: 'Hair Style', optionKey: 'hairs' },
                    { key: 'outfitId', label: 'Scout Uniform', optionKey: 'outfits' },
                    { key: 'accessoryId', label: 'Lenses & Accoutrements', optionKey: 'accessories' },
                    { key: 'badgeId', label: 'Echelon Badge', optionKey: 'badges' }
                  ].map((category) => {
                    const options = AVATAR_MANIFEST[category.optionKey as keyof typeof AVATAR_MANIFEST] as any[];
                    return (
                      <div key={category.key} className="space-y-2">
                        <span className="text-[9px] font-mono font-black text-on-surface/40 uppercase tracking-widest block font-bold">{category.label}</span>
                        <div className="grid grid-cols-2 gap-2">
                          {options.map((opt) => {
                            const isSelected = (editAvatar as any)[category.key] === opt.id;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => {
                                  setEditAvatar(prev => ({
                                    ...prev,
                                    [category.key]: opt.id
                                  }));
                                }}
                                className={cn(
                                  "p-2 text-[9px] font-mono font-bold uppercase transition-all rounded-lg border-2 text-left relative truncate",
                                  isSelected
                                    ? "bg-brand-lime hover:bg-brand-lime text-on-surface border-on-surface shadow-[2px_2px_0px_black] translate-y-[1px] translate-x-[1px]"
                                    : "bg-white text-on-surface/60 hover:bg-stone-50 border-stone-200"
                                )}
                              >
                                {opt.name}
                                {isSelected && (
                                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] bg-on-surface text-white px-1 py-0.2 rounded font-black">●</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t-4 border-dashed border-on-surface/10">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-on-surface font-display font-black uppercase italic tracking-tight border-2 border-on-surface rounded-xl shadow-[4px_4px_0px_black] active:translate-y-0.5 active:shadow-none transition-all text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingProfile}
                  onClick={async () => {
                    if (!editName.trim()) {
                      alert("Please enter a name.");
                      return;
                    }
                    setIsSavingProfile(true);
                    try {
                      await updateProfile(profile?.id || '', {
                        name: editName.trim(),
                        avatar: editAvatar
                      });
                      setIsEditModalOpen(false);
                    } catch (error) {
                      console.error("[ProfilePage] Save error:", error);
                      alert("Failed to update profile. Please try again.");
                    } finally {
                      setIsSavingProfile(false);
                    }
                  }}
                  className="flex-1 py-3 bg-brand-orange hover:bg-on-surface text-white hover:text-brand-lime font-display font-black uppercase italic tracking-tight border-2 border-on-surface rounded-xl shadow-[4px_4px_0px_black] active:translate-y-0.5 active:shadow-none transition-all text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSavingProfile ? 'Saving...' : 'Save'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PlayerPageShell>
  );
}
