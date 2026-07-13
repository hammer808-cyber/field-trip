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
// Removed: import { StatusSticker } from '../components/StickerDecals';
import { AvatarPreview } from '../components/AvatarPreview';
import { ProofImage } from '../components/ProofImage';
import { getNormalizedProof } from '../utils/imageUtils';
import { DEFAULT_AVATAR, AVATAR_MANIFEST } from '../constants/avatarAssets';
import { AvatarData } from '../types/avatar';
import { FIELD_TYPES, DEV_APP_CONFIG } from '../constants';
import { getDisplayLabel } from '../utils/labelUtils';
import { isArchivedEntry, normalizeEntryStatus } from '../logic/entryLogic';
import { getApprovedSubmissionsForUser } from '../services/submission-utils';
import { Entry } from '../types/game';

export default function ProfilePage() {
  const { 
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
    fieldType
  } = useApp();
  const { fc } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<'overview' | 'vault' | 'history' | 'settings'>('overview');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState<AvatarData>({ ...DEFAULT_AVATAR });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

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

  const thresholds = DEV_APP_CONFIG.levelThresholds;
  const currentLevelData = [...thresholds].reverse().find(t => xp >= t.minXP) || thresholds[0];
  const nextLevelData = thresholds.find(t => t.level === currentLevelData.level + 1);
  const level = currentLevelData.level;
  const nextLevelXP = nextLevelData ? (nextLevelData.minXP - currentLevelData.minXP) : 500;
  const xpInLevel = nextLevelData ? (xp - currentLevelData.minXP) : (xp - currentLevelData.minXP);
  const xpProgress = nextLevelData ? (xpInLevel / nextLevelXP) * 100 : 100;

  const fieldTypeData = fieldType ? FIELD_TYPES[fieldType] : null;

  const pendingCount = submittedPendingChallengeIds?.size || 0;
  const nmpCount = needsMoreProofChallengeIds?.size || 0;

  const handleSignOut = async () => {
    if (confirm("Sign out of Fieldtrip? Active session will be ended.")) {
      await signOut();
      navigate('/');
    }
  };

  return (
    <div className="skin-page skin-profile skin-logbook page-scroll px-4 sm:px-8 pt-6 sm:pt-12 max-w-2xl mx-auto relative bg-[#F9F7F2] ft-paper-texture min-h-screen">
      {/* Global Grain Overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-50 bg-[url('https://www.transparenttextures.com/patterns/felt.png')]" />
      
      {/* 1. Header: Your Field Profile */}
      <header className="mb-10 space-y-6 relative">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-1">
               <div className="h-4 w-1 bg-brand-cyan shadow-[1px_1px_0px_black]" />
               <span className="text-[10px] font-mono font-black text-on-surface/30 uppercase tracking-[0.3em]">{getDisplayLabel('FIELD_STATION')}</span>
            </div>
            <h1 className="text-5xl sm:text-6xl font-black tracking-tighter text-on-surface uppercase italic leading-[0.8] drop-shadow-[4px_4px_0px_white]">
              PROFILE <span className="text-brand-magenta">_</span>
            </h1>
            <p className="text-[10px] font-mono font-black text-on-surface/40 uppercase tracking-[0.2em] pt-2">
              {getDisplayLabel('AGENT_ID')} // {profile?.name || 'Explorer'}
            </p>
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
              className="mt-1.5 inline-flex items-center gap-1 text-[9px] font-mono font-bold text-brand-orange hover:text-on-surface border border-brand-orange/20 hover:border-on-surface px-2 py-0.5 rounded transition-all bg-brand-orange/[0.03] cursor-pointer"
            >
              <Sparkles className="w-2.5 h-2.5" /> Edit Profile Dossier
            </button>
          </div>
          <div className="relative group">
            <div className="bg-white border-[3.5px] border-on-surface p-1 shadow-[8px_8px_0px_black] group-hover:rotate-3 transition-transform">
              <AvatarPreview 
                avatar={profile?.avatar || DEFAULT_AVATAR} 
                size="lg" 
                className="w-16 h-16 border-none" 
                showBackground={false}
              />
            </div>
            <div className="absolute -top-2 -right-2 transform rotate-12">
               <FieldBadge size="xs" variant="sticker" color="lime" className="px-2 py-0.5">ACTIVE</FieldBadge>
            </div>
          </div>
        </div>

        {/* Level & Rank Summary */}
        <div className="grid grid-cols-2 gap-5 pt-4">
          <FieldCard variant="paper" className="p-5 flex items-center gap-4 rotate-[-1deg] hover:rotate-0 transition-transform">
            <div className="w-12 h-12 bg-on-surface text-brand-lime border-[3px] border-on-surface flex items-center justify-center font-display font-black italic text-2xl shadow-[4px_4px_0px_black]">
              {level}
            </div>
            <div className="space-y-0.5">
              <p className="text-[9px] font-mono font-black opacity-30 uppercase tracking-widest leading-none">{getDisplayLabel('BUREAU_LEVEL')}</p>
              <p className="font-display font-black uppercase italic text-sm text-on-surface">{fieldTypeData?.name || 'Trailblazer'}</p>
            </div>
          </FieldCard>
          
          <FieldCard variant="paper" className="p-5 flex items-center gap-4 rotate-[1.5deg] hover:rotate-0 transition-transform bg-[#FFFDF5]">
             <div className="w-12 h-12 bg-brand-orange text-white border-[3px] border-on-surface flex items-center justify-center font-display font-black italic text-xl shadow-[4px_4px_0px_black]">
               #{profile?.previousRank || '--'}
             </div>
             <div className="space-y-0.5">
               <p className="text-[9px] font-mono font-black opacity-30 uppercase tracking-widest leading-none">{getDisplayLabel('WEEKLY_RANK')}</p>
               <p className="font-display font-black uppercase italic text-sm text-on-surface">{xp} XP</p>
             </div>
          </FieldCard>
        </div>
      </header>
      
      {/* 2. Navigation Tabs - FieldTrip Style */}
      <div className="relative z-10 flex gap-0.5 mb-10 border-b-[8px] border-on-surface pt-2 select-none overflow-x-auto no-scrollbar scroll-smooth">
        {[
          { id: 'overview', label: 'Overview', icon: Shield },
          { id: 'history', label: 'Logbook', icon: History },
          { id: 'vault', label: 'Vault', icon: BarChart3 },
          { id: 'settings', label: 'Settings', icon: Settings }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "px-6 py-4 font-display uppercase tracking-tighter text-xl transition-all font-black shrink-0 flex items-center gap-2 italic",
              "border-t-[4px] border-x-[4px] border-on-surface rounded-t-[1.5rem] -mb-[8px] cursor-pointer",
              activeTab === tab.id 
                ? "bg-white text-on-surface z-30 shadow-[0_-8px_0px_white,6px_0px_0px_black]" 
                : "bg-stone-200/50 text-on-surface/40 hover:bg-white/50 hover:text-on-surface"
            )}
          >
            <tab.icon className={cn("w-4 h-4", activeTab === tab.id ? "text-brand-orange" : "text-on-surface/20")} />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview' && (
            <div className="space-y-10">
              {/* Quick Summary Section */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Pending', count: pendingCount, color: 'text-brand-orange', bg: 'bg-[#FFFAF5]' },
                  { label: 'Retries', count: nmpCount, color: 'text-brand-magenta', bg: 'bg-[#FFF5F8]' },
                  { label: 'Verified', count: approvedEntriesCount, color: 'text-brand-lime', bg: 'bg-[#F2FAF2]' }
                ].map((stat, i) => (
                  <FieldCard key={i} variant="paper" className={cn("p-4 flex flex-col items-center gap-1", stat.bg)}>
                    <p className={cn("text-4xl font-black font-display italic leading-none", stat.color)}>{stat.count}</p>
                    <p className="text-[8px] font-mono font-black uppercase opacity-40 tracking-widest">{stat.label}</p>
                  </FieldCard>
                ))}
              </div>

              {/* Identity Section */}
              <section className="space-y-4">
                <div className="flex items-center gap-3 px-1">
                  <User className="w-4 h-4 text-brand-magenta" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface/30">Field Identity</h3>
                </div>
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
                        <FieldBadge variant="sticker" color="purple" size="xs" className="px-2 py-0.5 italic">{getDisplayLabel('RANK_VERIFIED')}</FieldBadge>
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
                          className="px-4 py-2 bg-brand-orange text-white border-2 border-on-surface font-display font-black uppercase italic tracking-tight shadow-[4px_4px_0px_black] hover:bg-on-surface hover:text-white transition-all rounded-xl text-xs flex items-center gap-2 active:translate-y-0.5 active:shadow-none"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-brand-lime" />
                          Edit Profile
                        </button>

                        <button 
                          onClick={() => navigate('/field-id')}
                          className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-on-surface/40 hover:text-brand-orange flex items-center justify-center sm:justify-start gap-2 transition-all animate-fade-in"
                        >
                          Adjust Dossier <ChevronRight className="w-3 h-3 bg-on-surface text-brand-lime rounded p-0.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </FieldCard>
              </section>

              {/* Progress Summary */}
              <section className="space-y-4">
                <div className="flex items-center gap-3 px-1">
                  <Zap className="w-4 h-4 text-brand-lime" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface/30">Bureau Standing</h3>
                </div>
                <FieldCard variant="paper" className="p-8 bg-white border-[4px] border-on-surface shadow-[10px_10px_0px_black] rounded-[2.5rem]">
                  <div className="space-y-6">
                    <div className="flex justify-between items-end">
                      <div className="space-y-1">
                         <p className="text-4xl font-display font-black italic uppercase tracking-tighter text-on-surface leading-none">Level {level}</p>
                         <p className="text-[10px] font-mono font-black uppercase tracking-widest text-on-surface/30 px-1">{getDisplayLabel('PROTOCOL_STANDING')}</p>
                      </div>
                      <p className="text-[10px] font-mono font-black text-on-surface bg-brand-cyan/20 px-2 py-1 rounded border border-on-surface/10">{xp} / {nextLevelXP + (currentLevelData.minXP)} XP</p>
                    </div>

                    <div className="space-y-2">
                       <div className="h-6 bg-on-surface/5 border-[3px] border-on-surface rounded-full overflow-hidden p-1 shadow-inner flex">
                         <motion.div 
                           initial={{ width: 0 }}
                           animate={{ width: `${xpProgress}%` }}
                           className="h-full bg-brand-lime rounded-full shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]"
                         />
                       </div>
                       <div className="flex justify-between px-1">
                          <span className="text-[8px] font-mono font-black uppercase text-on-surface/20">Current_Echelon</span>
                          <span className="text-[8px] font-mono font-black uppercase text-on-surface/20">Next_Tier_Sync</span>
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
              </section>

              {/* Quick Links */}
              <div className="grid grid-cols-2 gap-4 pb-8">
                 <button 
                   onClick={() => setActiveTab('history')}
                   className="p-6 bg-white border-[3px] border-on-surface rounded-[2rem] shadow-[6px_6px_0px_black] flex flex-col items-center gap-3 active:translate-y-1 active:shadow-none transition-all group"
                 >
                   <div className="w-12 h-12 bg-brand-magenta/10 border-2 border-brand-magenta/20 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform">
                      <History className="w-6 h-6 text-brand-magenta" />
                   </div>
                   <span className="text-[10px] font-black uppercase tracking-[0.25em] text-on-surface">Open Logbook</span>
                 </button>
                 <button 
                   onClick={() => setActiveTab('vault')}
                   className="p-6 bg-white border-[3px] border-on-surface rounded-[2rem] shadow-[6px_6px_0px_black] flex flex-col items-center gap-3 active:translate-y-1 active:shadow-none transition-all group"
                 >
                   <div className="w-12 h-12 bg-brand-orange/10 border-2 border-brand-orange/20 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform">
                      <BarChart3 className="w-6 h-6 text-brand-orange" />
                   </div>
                   <span className="text-[10px] font-black uppercase tracking-[0.25em] text-on-surface">Open Vault</span>
                 </button>
              </div>
            </div>
          )}
          
          {activeTab === 'vault' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <header className="space-y-1 mb-8">
                <h2 className="text-3xl font-black tracking-tighter text-on-surface uppercase italic">The Vault</h2>
                <p className="text-xs font-mono font-bold text-on-surface/40 uppercase tracking-widest">Achieved Sector Badges</p>
              </header>
              <BadgeCollection progress={badgeProgress || []} />
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <header className="space-y-1 mb-8">
                <h2 className="text-3xl font-black tracking-tighter text-on-surface uppercase italic">Logbook</h2>
                <p className="text-xs font-mono font-bold text-on-surface/40 uppercase tracking-widest">Historical Transmission Feed</p>
              </header>
              <div className="grid grid-cols-2 gap-4">
                 {logbookEntries.length === 0 ? (
                   <div className="col-span-2 py-20 text-center border-2 border-dashed border-on-surface/10 rounded-3xl">
                      <History className="w-12 h-12 text-on-surface/5 mx-auto mb-4" />
                      <p className="font-display text-base uppercase font-black text-on-surface/20 tracking-widest italic">No transmissions found.</p>
                   </div>
                 ) : (
                   logbookEntries.map((entry, idx) => (
                     <div key={entry.id} className={cn(
                       "bg-white border-2 border-on-surface p-2 pb-6 rounded-xl flex flex-col aspect-[4/5] shadow-sm",
                       idx % 2 === 0 ? "rotate-[-0.5deg]" : "rotate-[0.5deg]"
                     )}>
                        <div className="bg-paper-dark aspect-square rounded-lg mb-2 overflow-hidden border border-on-surface/5 flex items-center justify-center relative">
                           {(() => {
                             const norm = getNormalizedProof(entry, null); const p = { ...entry, photoUrl: norm.photoUrl, imageUrl: norm.photoUrl, storagePath: norm.storagePath } as any;
                             const imageSrc = p.proofImage || p.imageUrl || p.proofImageUrl || p.photoUrl || (Array.isArray(p.imageUrls) ? p.imageUrls[0] : null);
                             return imageSrc ? (
                               <ProofImage entry={entry} className="w-full h-full object-cover grayscale-[0.2]" />
                             ) : (
                               <History className="w-8 h-8 text-on-surface/10" />
                             );
                           })()}
                        </div>
                        <div className="flex-1 flex flex-col justify-between px-1">
                           <div className="flex flex-col gap-0.5">
                              <h6 className="text-[9px] font-black uppercase leading-tight line-clamp-2">{entry.tripTitle || 'Untitled'}</h6>
                              {entry.findingType && (
                                 <span className="text-[6.5px] font-mono leading-none font-black uppercase bg-brand-magenta text-white px-1 py-0.5 rounded border border-on-surface/10 w-fit">
                                   {entry.findingType}
                                 </span>
                              )}
                           </div>
                           <div className="flex justify-between items-center pt-1 border-t border-on-surface/5">
                              {(() => {
                                const status = ((entry.status as any) === 'needs-more-proof' ? 'NEEDS_MORE_PROOF' : 
                                               (entry.status as any) === 'upload_failed' ? 'UPLOAD_FAILED' : 
                                               entry.status || 'PENDING').toUpperCase();
                                const badgeColor = status === 'APPROVED' ? 'lime' : status === 'REJECTED' ? 'charcoal' : status === 'NEEDS_MORE_PROOF' ? 'orange' : 'paper';
                                return (
                                  <FieldBadge 
                                     variant="stamp" 
                                     color={badgeColor as any}
                                     size="xs"
                                     rotation={-4}
                                     className="scale-75 origin-left font-black"
                                  >
                                     {status}
                                  </FieldBadge>
                                );
                              })()}
                              <div className="flex flex-col items-end">
                                 <span className="text-[10px] font-black uppercase italic leading-none">
                                   {entry.status === 'approved' 
                                     ? `+${entry.awardedXP || entry.pointsAwarded || (entry as any).awardedPoints || 0}`
                                     : `+${(entry as any).estimatedPoints || entry.awardedXP || 0}`}
                                 </span>
                                 <span className="text-[6px] font-mono opacity-25 uppercase tracking-tighter mt-1 leading-none">
                                   {entry.status === 'approved' ? 'Awarded' : 'Projected'}
                                 </span>
                              </div>
                           </div>
                        </div>
                     </div>
                   ))
                 )}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <header className="space-y-1 mb-8">
                <h2 className="text-3xl font-black tracking-tighter text-on-surface uppercase italic">Settings</h2>
                <p className="text-xs font-mono font-bold text-on-surface/40 uppercase tracking-widest">Protocol Configurations</p>
              </header>
              
              <div className="space-y-6">
                        {/* Removed: Trevor Guide Assistant Setting */}

                  <SkinSelector />

                  {(profile?.role === 'admin' || isAdmin) && (
                    <div className="field-card bg-[#FFF2EA] p-6 space-y-4 border-4 border-brand-orange shadow-[6px_6px_0px_black]">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="font-display text-lg font-black uppercase text-brand-orange">Admin Terminal</p>
                          <p className="text-[10px] opacity-60 uppercase font-mono text-on-surface">System OVERRIDE ENABLED</p>
                        </div>
                        <Shield className="w-6 h-6 text-brand-orange animate-pulse" />
                      </div>
                      <p className="text-[11px] font-serif italic opacity-70 leading-relaxed font-bold">
                        Bypass player gates to access proof reviews, user moderation, and deployment overrides.
                      </p>
                      <button 
                        onClick={() => navigate('/admin')}
                        className="w-full py-4 bg-brand-orange text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-[4px_4px_0px_black] active:shadow-none active:translate-y-1 transition-all"
                      >
                        Enter Admin Board
                      </button>
                    </div>
                  )}

                 <div className="field-card field-card--paper p-6 space-y-4 border-4 border-on-surface shadow-[6px_6px_0px_black] bg-[#FFFDF6]">
                    <div className="flex items-center justify-between">
                       <div className="space-y-1">
                          <p className="font-display text-lg font-black uppercase">Kinetic Ceremony</p>
                          <p className="text-[10px] opacity-40 uppercase font-mono">Intensity Calibration</p>
                       </div>
                    </div>
                    
                    <div className="space-y-4">
                       <p className="text-[11px] font-serif italic opacity-60 leading-relaxed font-bold">
                         Configure feedback ceremonies for XP and badge unlocks. Reduced suppresses massive stamp rotations & blurs, whilst minimal reroutes alerts directly as subtle log notifications.
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
                 
                  <div className="field-card field-card--paper p-6 space-y-4 border-4 border-on-surface shadow-[6px_6px_0px_black] bg-[#FFFDF6]">
                     <div className="flex items-center justify-between">
                        <div className="space-y-1">
                           <p className="font-display text-lg font-black uppercase">Privacy Guards</p>
                           <p className="text-[10px] opacity-40 uppercase font-mono">Ballots & Metadata Opt-In</p>
                        </div>
                     </div>
                     
                     <div className="space-y-4 mt-2">
                        <p className="text-[11px] font-serif italic opacity-60 leading-relaxed font-bold text-left">
                           Configure whether you want to participate in weekly ballots or allow exact GPS coordinate markings on public views.
                        </p>
                        
                        <div className="space-y-3">
                           {/* Preference 1: Opt out of public sharing (privateApprovedPhotos) */}
                           <button
                              onClick={async () => {
                                 const currentPrefs = profile?.preferences || {};
                                 await updateProfile(profile?.id || '', {
                                    preferences: {
                                       ...currentPrefs,
                                       privateApprovedPhotos: !currentPrefs.privateApprovedPhotos
                                    }
                                 });
                              }}
                              className={cn(
                                 "w-full p-4 flex items-center justify-between font-mono text-[10px] uppercase font-black tracking-wider transition-all rounded-xl border-2 text-left",
                                 profile?.preferences?.privateApprovedPhotos
                                    ? "bg-brand-orange text-white border-on-surface shadow-[2px_2px_0px_black]"
                                    : "bg-white text-on-surface/50 hover:bg-paper-dark border-on-surface shadow-[1px_1px_0px_black]"
                              )}
                           >
                              <span>🚫 Opt Out of Weekly Ballots</span>
                              <span>{profile?.preferences?.privateApprovedPhotos ? "ACTIVATED" : "INACTIVE"}</span>
                           </button>

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

                  <div className="field-card field-card--paper p-6 space-y-6 border-4 border-on-surface shadow-[6px_6px_0px_black] bg-[#FFFDF6]">
                    <div className="flex items-center justify-between">
                       <div className="space-y-1">
                          <p className="font-display text-lg font-black uppercase">Account Control</p>
                          <p className="text-[10px] opacity-40 uppercase font-mono">Session Management</p>
                       </div>
                       <ShieldCheck className="w-6 h-6 text-brand-lime" />
                    </div>
                    <div className="space-y-3">
                       <button 
                         onClick={handleSignOut}
                         className="w-full py-4 bg-white border-2 border-error text-error font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-error/5 shadow-[3px_3px_0px_var(--color-error)] active:shadow-none active:translate-y-0.5 transition-all flex items-center justify-center gap-2"
                       >
                         <LogOut className="w-4 h-4" />
                         Terminate Session
                       </button>
                    </div>
                 </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <footer className="pt-24 pb-12 flex flex-col items-center justify-center space-y-4">
        <FieldBadge 
          variant="stamp" 
          color="paper" 
          size="md" 
          rotation={-2} 
          className="px-6 py-2 opacity-40 border-dashed"
        >
          {fc('Bureau Protocol v12.4', 'Intel Manifest v3.0')}
        </FieldBadge>
        <p className="font-mono text-[8px] uppercase tracking-[0.4em] opacity-20">
          Fieldtrip Scouts Auxiliary
        </p>
      </footer>

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
                  <span className="text-[10px] font-mono font-black text-on-surface/50 uppercase tracking-[0.2em]">AGENT_DOSSIER // EDIT</span>
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
                <label className="text-[10px] font-mono font-black text-on-surface/50 uppercase tracking-widest block font-bold">AGENT NAME</label>
                <input 
                  type="text" 
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Enter Agent Name"
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
                      alert("Please provide an Agent name.");
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
                  {isSavingProfile ? 'Saving...' : 'Sync Intel'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
