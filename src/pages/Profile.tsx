import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { motion } from 'motion/react';
import { FIELD_TYPES } from '../constants';
import { Card, Sticker } from '../components/UI';
import { SkinSelector } from '../components/SkinSelector';
import { BadgeCollection } from '../components/BadgeCollection';
import { AvatarPreview } from '../components/AvatarPreview';
import { DEFAULT_AVATAR } from '../constants/avatarAssets';
import { Download, Trash2, UserCircle, Settings, Shield, Palette, Zap, AlertTriangle, Sparkles, Sun, Waves, Heart, Fingerprint, ClipboardCheck, MessageSquare, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { getFieldCheckLabel } from '../logic/fieldCheckLogic';
import { updateProfile } from '../services/userService';
import { Hibiscus, ChromeStar, GlossOverlay } from '../components/BajaBratzAssets';
import { DiamondStar, Sparkle, SunFlare, GlossOverlay as DiamondGloss } from '../components/SkinAssets';

import { FieldTypeCard } from '../components/FieldTypeCard';
import { getRewardMetadata, REWARD_REGISTRY } from '../data/rewardRegistry';

import { MARKER_STICKERS } from '../data/markers';

export default function ProfilePage() {
  const { fieldType, points, soloTripsCount, entries, incomingFieldCheck, profile, user, signOut, badgeProgress, fieldTokens } = useApp();
  const { skin: activeSkin, isAdmin, frankieMode, setFrankieMode, fc } = useTheme();
  const navigate = useNavigate();

  const handleUpdatePreference = async (key: string, value: any) => {
    if (!user || !profile) return;
    await updateProfile(user.uid, {
      preferences: { ...profile.preferences, [key]: value }
    });
  };

  const selectedMarker = MARKER_STICKERS.find(s => s.id === (profile?.preferences?.selectedMarkerStickerId || 'default-scout')) || MARKER_STICKERS[0];

  const fieldTypeData = fieldType ? FIELD_TYPES[fieldType] : null;
  const fieldCheckData = incomingFieldCheck ? getFieldCheckLabel(incomingFieldCheck.reason) : null;
  
  const skinSlug = activeSkin?.slug || 'default';
  const isBaja = skinSlug === 'baja-bratz';
  const isDiamond = skinSlug === 'slippery-diamond';
  const isHeat = skinSlug === 'heatwave';

  const handleSignOut = async () => {
    if (confirm("Sign out of Fieldtrip? Active session will be ended.")) {
      await signOut();
      navigate('/');
    }
  };

  return (
    <div className="pb-40 px-6 pt-12 space-y-24 max-w-5xl mx-auto relative overflow-hidden">
      {isBaja && !frankieMode && (
        <>
          <Hibiscus className="absolute top-0 left-[-20px] w-64 h-64 opacity-10 -z-10" />
          <Hibiscus className="absolute bottom-40 right-[-40px] w-80 h-80 opacity-10 -z-10 rotate-45" />
          <ChromeStar className="absolute top-20 right-10 w-12 h-12 opacity-30 -z-10" />
        </>
      )}

      {isDiamond && !frankieMode && (
        <>
          <DiamondStar className="absolute top-0 left-[-20px] w-48 h-48 text-white opacity-5 -z-10" />
          <Sparkle className="absolute bottom-20 right-[-20px] w-12 h-12 text-white opacity-10 -z-10 rotate-12" />
          <div className="absolute inset-0 liquid-chrome opacity-5 pointer-events-none -z-20" />
        </>
      )}

      {isHeat && !frankieMode && (
        <>
          <SunFlare className="absolute top-[-50px] right-[-50px] w-64 h-64" />
        </>
      )}

      <header className="flex flex-col md:flex-row md:items-end justify-between gap-12 relative border-b-8 border-on-surface pb-12">
        <div className="space-y-6">
          <p className="micro-label inline-block bg-brand-lime px-3 py-1 border-2 border-on-surface shadow-[4px_4px_0px_black]">
            {isBaja ? 'Coastal ID: BABE-0921' : 
             isDiamond ? 'Diamond ID: LUXE-88' :
             isHeat ? 'Heat ID: HOT-99' :
             fc('BUREAU_ID // ASSET_TRKR.0921', 'PROFILE ID')}
          </p>
          <h1 className={cn(
            "text-huge leading-tight italic font-bold",
            isBaja ? "text-baja-pink drop-shadow-[4px_4px_0px_#40e0d0]" : 
            isDiamond ? "liquid-chrome bg-clip-text text-transparent filter drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]" :
            isHeat ? "text-white font-display drop-shadow-[0_4px_#ff007f]" :
            "text-on-surface"
          )}>
            {isBaja ? 'Field File' : isDiamond ? 'The Assets' : isHeat ? 'Profile' : fc('Profile', 'Profile')}
          </h1>
          {!isBaja && !isDiamond && !isHeat && <p className="bureau-subhead text-xl opacity-100 italic">{fc('Official identity and service history for explorers.', 'Your official field record and settings.')}</p>}
        </div>
        <div className="text-right flex flex-col items-end gap-6">
          {isAdmin && (
            <div className="flex flex-wrap justify-end gap-3 max-w-[240px]">
              <Link to="/admin/proofs" title="Proofs" className="p-4 bg-brand-orange text-white rounded-none hover:rotate-12 transition-transform shadow-[6px_6px_0px_black] border-2 border-on-surface">
                <Shield className="w-6 h-6 stroke-[2.5]" />
              </Link>
              <Link to="/admin/challenges" title="Challenges" className="p-4 bg-brand-orange text-white rounded-none hover:rotate-12 transition-transform shadow-[6px_6px_0px_black] border-2 border-on-surface">
                <Zap className="w-6 h-6 stroke-[2.5]" />
              </Link>
              <Link to="/admin/skins" title="Skins" className="p-4 bg-brand-lime text-on-surface rounded-none hover:rotate-12 transition-transform shadow-[6px_6px_0px_black] border-2 border-on-surface">
                <Palette className="w-6 h-6 stroke-[2.5]" />
              </Link>
              <Link to="/admin/moderation" title="Moderation" className="p-4 bg-error text-white rounded-none hover:rotate-12 transition-transform shadow-[6px_6px_0px_black] border-2 border-on-surface">
                <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
              </Link>
            </div>
          )}
          <div className="flex items-center gap-4">
            <p className="micro-label uppercase tracking-widest opacity-60 font-bold">
              {isBaja ? 'VIP ACCESS' : isDiamond ? 'ENCRYPTED' : isHeat ? 'VIP' : 'LEVEL_03_ACCESS'}
            </p>
            <Settings className={cn(
              "w-10 h-10 opacity-100 hover:rotate-90 transition-all cursor-pointer", 
              isBaja ? "text-baja-pink" : 
              isDiamond ? "text-white" :
              isHeat ? "text-white" :
              "text-on-surface"
            )} />
          </div>
        </div>
      </header>

      <section className="space-y-8">
        <div className="flex items-center gap-6">
          <h3 className={cn(
            "font-display text-4xl italic uppercase tracking-tight font-bold", 
            isBaja ? "text-baja-pink font-display uppercase font-normal tracking-wide" :
            isDiamond ? "text-white font-mono uppercase tracking-[0.3em]" :
            isHeat ? "text-white font-display uppercase font-normal" : 
            "text-on-surface"
          )}>
            {isBaja ? 'The Beach Book' : isDiamond ? 'The Identity' : isHeat ? 'The Beach Book' : fc('BUREAU IDENTITY', 'IDENTITY')}
          </h3>
          {!isBaja && !isDiamond && !isHeat && <div className="h-2 flex-grow bg-on-surface/10" />}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className={cn(
            "md:col-span-2 relative overflow-hidden group",
            isBaja ? "bg-white border-4 border-baja-pink rounded-[3rem] shadow-[15px_15px_0px_#40e0d0] p-8" : 
            isDiamond ? "bg-white/5 border border-white/10 rounded-sm backdrop-blur-xl p-8" :
            isHeat ? "bg-white border-white border-4 rounded-[3rem] shadow-[15px_15px_0px_rgba(255,140,0,0.5)] p-8" :
            "notice-card p-0"
          )}>
            {!isBaja && !isDiamond && !isHeat && <div className="file-tab">{fc('ASSET_ID', 'ID')}</div>}
            {(isBaja || isDiamond) && <GlossOverlay opacity={isDiamond ? 0.2 : 0.3} />}
            <div className={cn(
              "absolute top-4 right-4 group-hover:opacity-100 transition-opacity flex flex-col items-center gap-3",
              isBaja ? "text-baja-aqua" : 
              isDiamond ? "text-white opacity-40 focus-within:opacity-100" :
              isHeat ? "text-heat-pink" :
              "text-on-surface"
            )}>
              <div className="relative group">
                <AvatarPreview 
                  avatar={profile?.avatar || DEFAULT_AVATAR} 
                  size="lg" 
                  className={cn(
                    "rounded-full border-2",
                    isBaja ? "border-baja-pink shadow-[0_0_15px_rgba(255,105,180,0.3)]" :
                    isDiamond ? "border-white/40" :
                    isHeat ? "border-heat-pink" :
                    "border-brand-orange"
                  )} 
                />
                <button
                  onClick={() => navigate('/field-id')}
                  className={cn(
                    "absolute -bottom-2 -right-2 p-2 rounded-full shadow-lg transition-transform hover:scale-110 active:scale-95 group/btn",
                    isBaja ? "bg-baja-pink text-white" :
                    isDiamond ? "bg-white text-black" :
                    isHeat ? "bg-heat-pink text-white" :
                    "bg-brand-orange text-white"
                  )}
                >
                  <Fingerprint size={16} className="group-hover/btn:rotate-12 transition-transform" />
                  <div className="absolute top-1/2 left-full translate-x-2 -translate-y-1/2 bg-black text-white text-[8px] py-1 px-2 opacity-0 group-hover/btn:opacity-100 whitespace-nowrap pointer-events-none rounded-sm uppercase tracking-widest border border-white/10">
                    Edit_Identity
                  </div>
                </button>
              </div>
            </div>
            
            <div className={cn("space-y-8 relative z-10", !isBaja && !isDiamond && !isHeat && "p-8")}>
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-2">
                      <p className={cn("micro-label", isBaja ? "text-baja-aqua" : isDiamond ? "text-white/40" : isHeat ? "text-heat-aqua" : "text-brand-orange")}>
                        {isBaja ? 'Beach Role' : isDiamond ? 'System Tag' : isHeat ? 'Beach Role' : fc('FIELD_TYPE_ASSIGNMENT', 'FIELD TYPE')}
                      </p>
                      <h4 className={cn(
                        "leading-tight",
                        isBaja ? "text-5xl text-baja-pink font-display uppercase font-normal" : 
                        isDiamond ? "text-6xl text-white font-black liquid-chrome bg-clip-text text-transparent uppercase font-sans" :
                        isHeat ? "text-5xl text-heat-pink font-display uppercase font-normal" :
                        "font-display text-huge uppercase tracking-tight text-on-surface"
                      )}>{fieldTypeData?.name || "Unassigned"}</h4>
                      {fieldTypeData && (
                        <p className={cn(
                          "text-[10px] font-mono font-bold uppercase tracking-widest",
                          isBaja ? "text-baja-pink/60" : "opacity-60"
                        )}>
                          [{fieldTypeData.badgeLabel}]
                        </p>
                      )}
                    </div>
                  {!isBaja && !isDiamond && !isHeat && (
                    <div className="bureau-tag bg-brand-orange text-white rotate-6">CERTIFIED</div>
                  )}
                </div>
              </div>

                <div className="flex items-center gap-4 sm:gap-12 pt-4 flex-wrap">
                  <div className="space-y-2">
                    <p className="micro-label opacity-60 font-bold tracking-wider text-[8px] sm:text-[10px]">STANDING</p>
                    <p className={cn(
                      "font-display text-4xl sm:text-6xl italic font-bold", 
                      isBaja ? "text-baja-aqua" : 
                      isDiamond ? "text-white" :
                      isHeat ? "text-heat-mango" :
                      "text-brand-orange"
                    )}>{points} <span className="text-sm sm:text-xl opacity-20 italic">PTS</span></p>
                  </div>
                  <div className="space-y-2">
                    <p className="micro-label opacity-60 font-bold tracking-wider text-[8px] sm:text-[10px]">
                      {isBaja ? 'Beach Proof' : isDiamond ? 'Sync Marks' : isHeat ? 'PROOF' : fc('PROOF', 'PHOTOS')}
                    </p>
                    <p className={cn(
                      "font-display text-4xl sm:text-6xl italic font-bold", 
                      isBaja ? "text-baja-pink" : 
                      isDiamond ? "text-white" :
                      isHeat ? "text-heat-pink" :
                      "text-on-surface"
                    )}>{entries.length} <span className="text-sm sm:text-xl opacity-20 italic">CAP</span></p>
                  </div>
                  <div className="space-y-2">
                    <p className="micro-label opacity-60 font-bold tracking-wider text-[8px] sm:text-[10px]">DRIFTS</p>
                    <p className={cn(
                      "font-display text-4xl sm:text-6xl italic font-bold", 
                      isBaja ? "text-baja-coral" : 
                      isDiamond ? "text-white/50 font-mono" :
                      isHeat ? "text-heat-pink" :
                      "text-on-surface"
                    )}>{soloTripsCount}/3 <span className="text-sm sm:text-xl opacity-20 italic">SOLO</span></p>
                  </div>
                  <div className="space-y-2">
                    <p className="micro-label opacity-60 font-bold tracking-wider text-[8px] sm:text-[10px]">TOKENS</p>
                    <p className={cn(
                      "font-display text-4xl sm:text-6xl italic font-bold", 
                      isBaja ? "text-baja-magenta" : 
                      isDiamond ? "text-brand-lime" :
                      isHeat ? "text-heat-aqua" :
                      "text-brand-lime"
                    )}>{fieldTokens} <span className="text-sm sm:text-xl opacity-20 italic">F.T.</span></p>
                  </div>
                </div>

              <div className="pt-4 border-t border-dashed border-on-surface/10 flex justify-end">
                  <button 
                  onClick={() => navigate('/classification')}
                  className={cn(
                    "font-mono text-[6px] uppercase tracking-[0.3em] opacity-5 hover:opacity-60 transition-all active:scale-95",
                    isBaja ? "text-baja-pink" : 
                    isDiamond ? "text-white" :
                    isHeat ? "text-white" :
                    "text-on-surface"
                  )}
                >
                   {isBaja ? '[ Reset Vibe ]' : isDiamond ? '[ Purge Calibration ]' : isHeat ? '[ Refresh Sun ]' : '[ RE-AUDIT VIBE ]'}
                </button>
              </div>
            </div>

            {fieldCheckData && (
              <div className="absolute top-0 right-0 p-4 animate-pulse">
                <div className={cn(
                  "font-display text-[10px] px-3 py-1 rotate-12 flex items-center gap-1 shadow-lg border-2",
                  isBaja ? "bg-baja-aqua text-white border-white" : 
                  isDiamond ? "bg-white text-black border-white" :
                  isHeat ? "bg-heat-pink text-white border-white" :
                  "bg-brand-orange text-white border-on-surface shadow-[4px_4px_0_black]"
                )}>
                  <AlertTriangle className="w-3 h-3" />
                  VIOLATION: {fieldCheckData}
                </div>
              </div>
            )}
          </div>

          <div className={cn(
            "p-8 flex flex-col justify-between border-4 shadow-2xl rotate-2",
            isBaja ? "bg-baja-pink text-white border-baja-aqua rounded-[2.5rem]" : 
            isDiamond ? "bg-white text-black border-white rounded-md" :
            isHeat ? "bg-heat-pink text-white border-white rounded-[3rem] shadow-[15px_15px_0px_white] rotate-3" :
            "bg-on-surface text-paper border-black shadow-[12px_12px_0px_gray]"
          )}>
            <div>
              {isBaja ? <Sun className="w-10 h-10 text-white mb-6 animate-spin-slow" /> : 
               isDiamond ? <Sparkles className="w-10 h-10 text-black mb-6" /> :
               isHeat ? <Waves className="w-10 h-10 text-white mb-6" /> :
               <Shield className="w-10 h-10 text-brand-orange mb-6" />}
              <h4 className={cn(
                "font-display text-4xl uppercase leading-tight mb-4 tracking-tight",
                isDiamond && "font-sans font-bold tracking-tight"
              )}>
                {isBaja ? 'Rank: Bae' : isDiamond ? 'Rank: Prism' : isHeat ? 'Rank: Hot' : fc('STATUS: ACTIVE', 'ACTIVE PLAYER')}
              </h4>
              <p className={cn("font-serif italic leading-relaxed text-lg", (isBaja || isDiamond || isHeat) ? "text-white" : "text-paper/80")}>
                {isBaja ? '"Golden hour is a state of mind, babe."' : 
                 isDiamond ? '"The harder the light, the brighter you shine."' :
                 isHeat ? '"Poolside is the only side, babe."' :
                 fc('"Explorer verified. Field performance meets core requirements for adventure."', '"Your account is verified. You are ready for field deployment."')}
              </p>
            </div>
            <div className={cn("text-[10px] font-mono mt-8 uppercase tracking-widest", (isBaja || isDiamond || isHeat) ? "opacity-60" : "opacity-40")}>
              {isBaja ? 'VERIFIED BY BEACH COUNCIL' : isDiamond ? 'CERTIFIED REFLECTIVE' : isHeat ? 'CERTIFIED BAED' : 'BUREAU AUTHENTICATED // VOL.11'}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-8">
        <div className="flex items-center gap-4">
          <h3 className="font-display text-2xl uppercase tracking-tighter text-on-surface">Field Classification</h3>
          <div className="h-px flex-grow bg-on-surface/10" />
        </div>
        
        {fieldType ? (
          <FieldTypeCard type={fieldType} />
        ) : (
          <Card className="p-12 text-center space-y-6">
            <div className="w-16 h-16 bg-brand-orange/10 rounded-full flex items-center justify-center mx-auto border-2 border-dashed border-brand-orange animate-pulse">
              <ClipboardCheck className="text-brand-orange" />
            </div>
            <div className="space-y-2">
              <h4 className="text-xl font-black uppercase italic italic">Unclassified_Asset</h4>
              <p className="text-xs opacity-60 max-w-xs mx-auto">The Bureau has not yet determined your behavioral profile. Identification is mandatory for field deployment.</p>
            </div>
            <button 
              onClick={() => navigate('/classification')}
              className="bg-brand-orange text-white px-8 py-3 font-black uppercase tracking-widest text-xs hover:scale-105 transition-transform"
            >
              START AUDIT
            </button>
          </Card>
        )}
      </section>

      {/* Your Collection Preview */}
      <section className="space-y-12">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-6 grow">
            <h3 className="font-display text-4xl italic uppercase tracking-tighter text-on-surface font-black">Your Collection</h3>
            <div className="h-2 flex-grow bg-on-surface/10" />
          </div>
          <Link 
            to="/collection" 
            className="shrink-0 group flex items-center gap-2 px-6 py-2 bg-on-surface text-white hover:bg-brand-orange transition-colors"
          >
            <span className="text-[10px] font-black uppercase tracking-widest italic font-display">View Full Vault</span>
            <Sparkles className="w-4 h-4 group-hover:scale-125 transition-transform text-brand-lime" />
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Stickers */}
          <div className="space-y-6">
            <div className="flex justify-between items-end border-b-2 border-on-surface/10 pb-2">
              <p className="micro-label font-bold text-brand-orange uppercase tracking-widest">
                Stickers ({profile?.unlockedRewards?.stickers?.length || 0} / {Object.values(REWARD_REGISTRY).filter(r => r.type === 'sticker').length})
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {Object.values(REWARD_REGISTRY).filter(r => r.type === 'sticker').map(meta => {
                const isUnlocked = profile?.unlockedRewards?.stickers?.includes(meta.id);
                return (
                  <div 
                    key={meta.id} 
                    className={cn(
                      "px-4 py-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 italic relative transition-all",
                      isUnlocked 
                        ? "bg-on-surface text-white shadow-[4px_4px_0px_var(--color-brand-magenta)]" 
                        : "bg-paper border-2 border-dashed border-on-surface/20 text-on-surface/40 select-none cursor-not-allowed"
                    )}
                    title={isUnlocked ? meta.description : `Locked: ${meta.unlockCondition || 'Complete special field milestones.'}`}
                  >
                    {isUnlocked ? (
                      meta.assetPath ? (
                        <img 
                          src={meta.assetPath} 
                          alt="" 
                          className="w-4 h-4 object-contain brightness-0 invert" 
                          onError={(e) => (e.currentTarget.style.display = 'none')} 
                        />
                      ) : (
                        <span className="text-sm shrink-0 leading-none">{meta.fallbackEmoji || '📝'}</span>
                      )
                    ) : (
                      <span className="text-sm shrink-0 leading-none filter grayscale opacity-40">🔒</span>
                    )}
                    {meta.label}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Badges */}
          <div className="space-y-6">
            <div className="flex justify-between items-end border-b-2 border-on-surface/10 pb-2">
              <p className="micro-label font-bold text-brand-lime uppercase tracking-widest">
                Mission Badges ({profile?.unlockedRewards?.badges?.length || 0} / {Object.values(REWARD_REGISTRY).filter(r => r.type === 'badge').length})
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {Object.values(REWARD_REGISTRY).filter(r => r.type === 'badge').map(meta => {
                const isUnlocked = profile?.unlockedRewards?.badges?.includes(meta.id);
                return (
                  <div 
                    key={meta.id} 
                    className={cn(
                      "px-4 py-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 italic border-2 border-on-surface transition-all",
                      isUnlocked 
                        ? "bg-brand-lime text-on-surface shadow-[4px_4px_0px_black]" 
                        : "bg-paper border-dashed border-on-surface/20 text-on-surface/40 select-none cursor-not-allowed shadow-none"
                    )}
                    title={isUnlocked ? meta.description : `Locked: ${meta.unlockCondition || 'Fulfill sector intelligence objectives.'}`}
                  >
                    {isUnlocked ? (
                      meta.assetPath ? (
                        <img 
                          src={meta.assetPath} 
                          alt="" 
                          className="w-4 h-4 object-contain" 
                          onError={(e) => (e.currentTarget.style.display = 'none')} 
                        />
                      ) : (
                        meta.fallbackEmoji ? (
                          <span className="text-sm shrink-0 leading-none">{meta.fallbackEmoji}</span>
                        ) : (
                          <ShieldCheck className="w-3.5 h-3.5" />
                        )
                      )
                    ) : (
                      <span className="text-xs shrink-0 leading-none filter grayscale opacity-40">🔒</span>
                    )}
                    {meta.label}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-12">
        <div className="flex items-center gap-6">
          <h3 className="font-display text-4xl italic uppercase tracking-tighter text-on-surface font-black">Field Log // Records</h3>
          <div className="h-2 flex-grow bg-on-surface/10" />
        </div>
        
        {entries.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {entries.slice(0, 8).map(entry => (
              <div key={entry.id} className="group relative">
                <div className="bg-white border-4 border-on-surface p-2 shadow-[8px_8px_0px_black] transition-transform hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[12px_12px_0px_var(--color-brand-orange)]">
                   <div className="aspect-square bg-paper-dark border-2 border-on-surface overflow-hidden relative">
                      <img src={entry.proofImage || undefined} alt="" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                      <div className="absolute top-0 right-0 bg-brand-orange text-white px-2 py-0.5 text-[7px] font-black uppercase italic tracking-tighter z-10 border-l-2 border-b-2 border-on-surface shadow-[2px_2px_0px_black]">
                        {(entry as any).syncStatus === 'sync_failed' ? 'SYN_PENDING' : 'ARCHIVED'}
                      </div>
                      <div className="absolute bottom-0 left-0 w-full bg-on-surface/80 p-1 px-2 text-[8px] font-mono text-brand-lime uppercase italic">
                        {new Date(entry.createdAt).toLocaleDateString()}
                      </div>
                   </div>
                   <div className="mt-3">
                      <p className="font-display text-xs font-black uppercase tracking-tighter line-clamp-1 italic">{entry.tripTitle}</p>
                      <p className="text-[10px] font-bold text-brand-orange">+{entry.pointsAwarded} XP</p>
                   </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 bg-on-surface/5 border-4 border-dashed border-on-surface/10 text-center space-y-4">
             <div className="w-12 h-12 bg-on-surface/5 rounded-full flex items-center justify-center mx-auto">
                <Shield className="opacity-20" />
             </div>
             <p className="font-display text-lg italic opacity-40 uppercase font-black tracking-widest leading-none">Intelligence record empty. Complete a mission to log field data.</p>
          </div>
        )}
      </section>

      {/* Field Fragments / Badges */}
      <section className="space-y-12">
        <div className="flex items-center gap-6">
          <h3 className="font-display text-4xl italic uppercase tracking-tighter text-on-surface font-black">Field Badges</h3>
          <div className="h-2 flex-grow bg-on-surface/10" />
        </div>
        <BadgeCollection progress={badgeProgress} />
      </section>

      {/* The Protocol / Skin Selector */}
      <section className="space-y-12">
        <div className="flex items-center gap-6">
          <h3 className={cn("font-display text-4xl italic uppercase tracking-tighter text-on-surface font-black", 
            isBaja ? "text-baja-pink font-display uppercase font-normal tracking-wide" :
            ""
          )}>
            {isBaja ? 'Vibe Settings' : 'PROTOCOLS // VISUAL_ENGINE'}
          </h3>
          {!isBaja && <div className="h-2 flex-grow bg-on-surface/10" />}
        </div>

        <SkinSelector />
      </section>

      {/* Preferences */}
      <section className="space-y-12">
        <div className="flex items-center gap-6">
          <h3 className="font-display text-4xl italic uppercase tracking-tighter text-on-surface font-black">
            Asset Preferences
          </h3>
          <div className="h-2 flex-grow bg-on-surface/10" />
        </div>

        <div className="bg-white border-4 border-on-surface p-10 shadow-[16px_16px_0px_black] space-y-10">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <p className="font-display text-2xl italic font-black uppercase tracking-tight">Frankie Mode</p>
              <p className="font-display text-lg italic opacity-40">Plain-language directions across the app. No hints, no answers, just clearer wording.</p>
            </div>
            <button 
              onClick={async () => {
                if (!user || !profile) return;
                const next = !frankieMode;
                await Promise.all([
                  updateProfile(user.uid, {
                    preferences: { ...profile.preferences, frankieMode: next }
                  }),
                  setFrankieMode(next)
                ]);
              }}
              className={cn(
                "w-20 h-10 border-4 border-on-surface relative transition-colors duration-300",
                frankieMode ? "bg-brand-orange" : "bg-on-surface/5"
              )}
            >
              <motion.div 
                animate={{ x: frankieMode ? 44 : 4 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="absolute top-1 left-0 w-8 h-[calc(100%-8px)] bg-on-surface"
              />
            </button>
          </div>

          <div className="flex items-center justify-between border-t-4 border-on-surface/5 pt-10">
            <div className="space-y-2">
              <p className="font-display text-2xl italic font-black uppercase tracking-tight">Quiet Crew Mode</p>
              <p className="font-display text-lg italic opacity-40">Silence non-essential pings and social notifications from the field.</p>
            </div>
            <button 
              onClick={async () => {
                if (!user || !profile) return;
                await updateProfile(user.uid, { quietCrewMode: !profile.quietCrewMode });
              }}
              className={cn(
                "w-20 h-10 border-4 border-on-surface relative transition-colors duration-300",
                profile?.quietCrewMode ? "bg-brand-lime" : "bg-on-surface/5"
              )}
            >
              <motion.div 
                animate={{ x: profile?.quietCrewMode ? 44 : 4 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="absolute top-1 left-0 w-8 h-[calc(100%-8px)] bg-on-surface"
              />
            </button>
          </div>

          <div className="flex items-center justify-between border-t-4 border-on-surface/5 pt-10">
            <div className="space-y-2">
              <p className="font-display text-2xl italic font-black uppercase tracking-tight text-error">Receipts Mode (Hard)</p>
              <p className="font-display text-lg italic text-error opacity-60">Enforce detailed field notes and rigorous evidence verification standards.</p>
            </div>
            <button 
              onClick={async () => {
                if (!user || !profile) return;
                await updateProfile(user.uid, { receiptsMode: !profile.receiptsMode });
              }}
              className={cn(
                "w-20 h-10 border-4 border-on-surface relative transition-colors duration-300",
                profile?.receiptsMode ? "bg-error" : "bg-on-surface/5"
              )}
            >
              <motion.div 
                animate={{ x: profile?.receiptsMode ? 44 : 4 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="absolute top-1 left-0 w-8 h-[calc(100%-8px)] bg-on-surface"
              />
            </button>
          </div>
          
          <div className="flex items-center justify-between border-t-4 border-on-surface/5 pt-10">
            <div className="space-y-2">
              <p className="font-display text-2xl italic font-black uppercase tracking-tight">Private Photo Vault</p>
              <p className="font-display text-lg italic opacity-40">Your approved field proof is only visible to you and Fieldtrip reviewers.</p>
            </div>
            <button 
              onClick={async () => {
                if (!user || !profile) return;
                const current = profile.preferences?.privateApprovedPhotos || false;
                await updateProfile(user.uid, {
                  preferences: { ...profile.preferences, privateApprovedPhotos: !current }
                });
              }}
              className={cn(
                "w-20 h-10 border-4 border-on-surface relative transition-colors duration-300",
                profile?.preferences?.privateApprovedPhotos ? "bg-brand-orange" : "bg-on-surface/5"
              )}
            >
              <motion.div 
                animate={{ x: profile?.preferences?.privateApprovedPhotos ? 44 : 4 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="absolute top-1 left-0 w-8 h-[calc(100%-8px)] bg-on-surface"
              />
            </button>
          </div>

          <div className="flex items-center justify-between border-t-4 border-on-surface/5 pt-10">
            <div className="space-y-2">
              <p className="font-display text-2xl italic font-black uppercase tracking-tight">Math Wizard</p>
              <p className="font-display text-lg italic opacity-40">See a detailed score breakdown for every mission completion.</p>
            </div>
            <button 
              onClick={async () => {
                if (!user || !profile) return;
                const current = profile.preferences?.mathWizard !== false; // Default to true if undefined
                await updateProfile(user.uid, {
                  preferences: { ...profile.preferences, mathWizard: !current }
                });
              }}
              className={cn(
                "w-20 h-10 border-4 border-on-surface relative transition-colors duration-300",
                (profile?.preferences?.mathWizard !== false) ? "bg-brand-orange" : "bg-on-surface/5"
              )}
            >
              <motion.div 
                animate={{ x: (profile?.preferences?.mathWizard !== false) ? 44 : 4 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="absolute top-1 left-0 w-8 h-[calc(100%-8px)] bg-on-surface"
              />
            </button>
          </div>

          <div className="flex items-center justify-between border-t-4 border-on-surface/5 pt-10">
            <div className="space-y-2">
              <p className="font-display text-2xl italic font-black uppercase tracking-tight">Show on Big Board</p>
              <p className="font-display text-lg italic opacity-40">Visibility status on the seasonal progress trail.</p>
            </div>
            <button 
              onClick={() => handleUpdatePreference('showOnBigBoard', !(profile?.preferences?.showOnBigBoard !== false))}
              className={cn(
                "w-20 h-10 border-4 border-on-surface relative transition-colors duration-300",
                (profile?.preferences?.showOnBigBoard !== false) ? "bg-brand-lime" : "bg-on-surface/5"
              )}
            >
              <motion.div 
                animate={{ x: (profile?.preferences?.showOnBigBoard !== false) ? 44 : 4 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="absolute top-1 left-0 w-8 h-[calc(100%-8px)] bg-on-surface"
              />
            </button>
          </div>

          <div className="flex items-center justify-between border-t-4 border-on-surface/5 pt-10">
            <div className="space-y-2">
              <p className="font-display text-2xl italic font-black uppercase tracking-tight">Show Exact Field Tokens</p>
              <p className="font-display text-lg italic opacity-40">Display your precise token count on the public board.</p>
            </div>
            <button 
              onClick={() => handleUpdatePreference('showExactPoints', !!profile?.preferences?.showExactPoints)}
              className={cn(
                "w-20 h-10 border-4 border-on-surface relative transition-colors duration-300",
                profile?.preferences?.showExactPoints ? "bg-brand-cyan" : "bg-on-surface/5"
              )}
            >
              <motion.div 
                animate={{ x: profile?.preferences?.showExactPoints ? 44 : 4 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="absolute top-1 left-0 w-8 h-[calc(100%-8px)] bg-on-surface"
              />
            </button>
          </div>

          <div className="space-y-6 border-t-4 border-on-surface/5 pt-10">
            <div className="space-y-2">
              <p className="font-display text-2xl italic font-black uppercase tracking-tight">Trail Marker Sticker</p>
              <p className="font-display text-lg italic opacity-40">Choose your representative on The Big Board.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {MARKER_STICKERS.map(marker => (
                <button
                  key={marker.id}
                  onClick={() => handleUpdatePreference('selectedMarkerStickerId', marker.id)}
                  className={cn(
                    "p-4 border-4 transition-all text-left space-y-2 relative overflow-hidden",
                    selectedMarker.id === marker.id 
                      ? "border-on-surface bg-brand-orange text-white shadow-[4px_4px_0px_black] scale-105" 
                      : "border-on-surface/10 bg-on-surface/5 text-on-surface italic grayscale hover:grayscale-0 hover:border-on-surface/40"
                  )}
                >
                  <span className="text-3xl block">{marker.emoji}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest block">{marker.label}</span>
                  <p className="text-[8px] opacity-60 leading-tight line-clamp-2">{marker.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Archival Actions */}
      <section className="space-y-12">
        <div className="flex items-center gap-6">
          <h3 className={cn("font-display text-4xl italic uppercase tracking-tighter text-on-surface font-black", 
            isBaja ? "text-baja-pink font-display uppercase font-normal tracking-wide" :
            ""
          )}>
            {isBaja ? 'Safe Box' : 'ARCHIVAL_CONTROLS'}
          </h3>
          {!isBaja && <div className="h-2 flex-grow bg-on-surface/10" />}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <button className="group relative text-left">
            <div className="absolute inset-0 bg-on-surface shadow-[12px_12px_0_black] translate-x-3 translate-y-3" />
            <div className={cn(
              "relative border-8 p-10 flex items-center gap-8 transition-transform group-hover:-translate-y-1 group-active:translate-y-1",
              isBaja ? "bg-white border-baja-pink rounded-full hover:bg-baja-sand" : 
              isDiamond ? "bg-white/5 border-white/20 rounded-none hover:bg-white/10" :
              "bg-white border-on-surface"
            )}>
              <Download className={cn("w-14 h-14", isBaja ? "text-baja-pink" : "text-brand-orange")} />
              <div className="space-y-2">
                <span className={cn(
                  "font-display uppercase leading-tight font-black italic",
                  isBaja ? "text-4xl text-baja-pink font-normal" : "text-4xl text-on-surface"
                )}>{isBaja ? 'Export Glam' : 'DOWNLOAD_DOSSIER'}</span>
                <p className={cn("micro-label font-black", isBaja ? "text-baja-pink/60" : "opacity-40")}>
                  {isBaja ? 'Get your beach log (JSON)' : 'OFFICIAL ASSET MANIFEST EXPORT (JSON)'}
                </p>
              </div>
            </div>
          </button>

          <button onClick={handleSignOut} className="group relative text-left">
             <div className="absolute inset-0 bg-error/20 shadow-[12px_12px_0_#ff000022] translate-x-3 translate-y-3" />
             <div className={cn(
              "relative border-8 p-10 flex items-center gap-8 transition-transform group-hover:-translate-y-1 group-active:translate-y-1",
              isBaja ? "bg-white border-baja-pink rounded-full hover:bg-baja-sand" : 
              isDiamond ? "bg-white/5 border-white/20 rounded-none hover:bg-white/10" :
              "bg-white border-error/40 hover:border-error"
            )}>
              <Trash2 className={cn("w-14 h-14", isBaja ? "text-baja-coral" : "text-error")} />
              <div className="space-y-2">
                <span className={cn(
                  "font-display uppercase leading-tight font-black italic",
                  isBaja ? "text-4xl text-baja-coral font-normal" : "text-4xl text-error"
                )}>{isBaja ? 'Sunk Entry' : 'RECLAMATION_LOGOUT'}</span>
                <p className={cn("micro-label font-black", isBaja ? "text-baja-coral/60" : "text-error opacity-60")}>
                  {isBaja ? 'Permanent vibe destruction' : 'TERMINATE ACTIVE BUREAU SESSION'}
                </p>
              </div>
            </div>
          </button>
        </div>
      </section>

      {/* Support & Feedback */}
      <section className="space-y-8 pt-12 border-t-2 border-on-surface/5">
        <div className="flex items-center gap-4">
          <h3 className="font-display text-2xl uppercase tracking-tighter text-on-surface">
            BETA_SUPPORT
          </h3>
          <div className="h-px flex-grow bg-on-surface/10" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a 
            href="mailto:hammer808@gmail.com?subject=Field%20Trip%20Beta%20Feedback"
            className="flex items-center gap-4 p-6 bg-on-surface/5 border-2 border-on-surface/10 hover:border-brand-orange hover:bg-brand-orange/5 transition-all group"
          >
            <div className="p-3 bg-brand-orange/10 text-brand-orange group-hover:bg-brand-orange group-hover:text-white transition-colors">
              <MessageSquare size={24} />
            </div>
            <div>
              <p className="font-bold uppercase tracking-tight text-sm">Report Issue / Feedback</p>
              <p className="text-[10px] opacity-40 uppercase tracking-widest font-mono">Uplink direct to HQ</p>
            </div>
          </a>

          <div className="flex items-center gap-4 p-6 bg-on-surface/5 border-2 border-on-surface/10 opacity-40 grayscale pointer-events-none">
            <div className="p-3 bg-on-surface/10 text-on-surface">
              <Shield size={24} />
            </div>
            <div>
              <p className="font-bold uppercase tracking-tight text-sm">Knowledge Base</p>
              <p className="text-[10px] opacity-40 uppercase tracking-widest font-mono">Field guides coming soon</p>
            </div>
          </div>
        </div>
      </section>

      {/* Admin Quick Links */}
      {isAdmin && (
        <section className="space-y-8 pt-12 border-t-4 border-dashed border-brand-orange/20">
          <div className="flex items-center gap-4">
            <h3 className="font-display text-2xl uppercase tracking-tighter text-brand-orange">
              Admin_HQ
            </h3>
            <div className="h-px flex-grow bg-brand-orange/10" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Registry', path: '/admin/challenges' },
              { label: 'Review', path: '/admin/proofs' },
              { label: 'Skins', path: '/admin/skins' },
              { label: 'DevTools', path: '/admin/dev-tools' },
            ].map(link => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className="p-4 bg-brand-orange/5 border-2 border-brand-orange/20 hover:border-brand-orange hover:bg-brand-orange/10 text-[10px] font-black uppercase tracking-widest text-brand-orange transition-all"
              >
                {link.label}
              </button>
            ))}
          </div>
        </section>
      )}

      <footer className="pt-24 pb-12 flex flex-col items-center justify-center space-y-6">
        <Sticker color="black" className="px-8 py-3 font-display text-4xl -rotate-6 uppercase select-none transition-transform hover:rotate-0">
          {isBaja ? 'VERIFIED LUXE OPS' : 'FIELD_TRIP_AUTHENTICATED'}
        </Sticker>
        <p className={cn(
          "font-mono text-xs uppercase tracking-[0.4em] opacity-40",
          isBaja && "text-baja-pink opacity-40 font-bold"
        )}>
          {isBaja ? 'FIELD FILE v2.0 ' : 'FIELD_TRIP_INTEL_MANIFEST v11.2'}
        </p>
      </footer>
    </div>
  );
}
