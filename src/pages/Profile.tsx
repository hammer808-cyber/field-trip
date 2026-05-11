import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { motion } from 'motion/react';
import { PERSONAS } from '../constants';
import { Card, Sticker } from '../components/UI';
import { SkinSelector } from '../components/SkinSelector';
import { BadgeCollection } from '../components/BadgeCollection';
import { Download, Trash2, UserCircle, Settings, Shield, Palette, Zap, AlertTriangle, Sparkles, Sun, Waves, Heart } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { getSnitchDescription } from '../logic/snitchLogic';
import { updateProfile } from '../services/userService';
import { Hibiscus, ChromeStar, GlossOverlay } from '../components/BajaBratzAssets';
import { DiamondStar, Sparkle, SunFlare, GlossOverlay as DiamondGloss } from '../components/SkinAssets';

export default function ProfilePage() {
  const { persona, points, soloCount, entries, incomingSnitch, profile, user, signOut, badgeProgress } = useApp();
  const { skin: activeSkin, isAdmin, frankieMode, setFrankieMode } = useTheme();
  const navigate = useNavigate();

  const personaData = persona ? PERSONAS[persona] : null;
  const snitchData = incomingSnitch ? getSnitchDescription(incomingSnitch.type) : null;
  
  const skinSlug = activeSkin?.slug || 'default';
  const isBaja = skinSlug === 'baja-bratz';
  const isDiamond = skinSlug === 'slippery-diamond';
  const isHeat = skinSlug === 'heatwave';

  const handleSignOut = async () => {
    if (confirm("Disconnecting from Bureau? Active session will be terminated.")) {
      await signOut();
      navigate('/');
    }
  };

  return (
    <div className="pb-40 px-6 pt-12 space-y-16 max-w-4xl mx-auto relative overflow-hidden">
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

      <header className="flex items-end justify-between relative">
        <div className="space-y-4">
          <p className="micro-label">
            {isBaja ? 'Coastal ID: BABE-0921' : 
             isDiamond ? 'Diamond ID: LUXE-88' :
             isHeat ? 'Heat ID: HOT-99' :
             'BUREAU_ID // ASSET_TRKR.0921'}
          </p>
          <h1 className={cn(
            "text-huge leading-none",
            isBaja ? "text-baja-pink drop-shadow-[4px_4px_0px_#40e0d0]" : 
            isDiamond ? "liquid-chrome bg-clip-text text-transparent filter drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]" :
            isHeat ? "text-white font-display drop-shadow-[0_4px_#ff007f]" :
            "text-on-surface"
          )}>
            {isBaja ? 'Beach Bag' : isDiamond ? 'The Assets' : isHeat ? 'Beach Bag' : 'Personnel File'}
          </h1>
          {!isBaja && !isDiamond && !isHeat && <p className="bureau-subhead">Certified identification and service history for active assets.</p>}
        </div>
        <div className="text-right flex flex-col items-end gap-2">
          {isAdmin && (
            <div className="flex flex-wrap justify-end gap-2 max-w-[200px]">
              <Link to="/admin/proofs" title="Proofs" className="p-3 bg-brand-orange text-white rounded-none hover:rotate-12 transition-transform shadow-[4px_4px_0px_black]">
                <Shield className="w-6 h-6" />
              </Link>
              <Link to="/admin/challenges" title="Challenges" className="p-3 bg-brand-orange text-white rounded-none hover:rotate-12 transition-transform shadow-[4px_4px_0px_black]">
                <Zap className="w-6 h-6" />
              </Link>
              <Link to="/admin/skins" title="Skins" className="p-3 bg-brand-orange text-white rounded-none hover:rotate-12 transition-transform shadow-[4px_4px_0px_black]">
                <Palette className="w-6 h-6" />
              </Link>
              <Link to="/admin/moderation" title="Moderation" className="p-3 bg-error text-white rounded-none hover:rotate-12 transition-transform shadow-[4px_4px_0px_black]">
                <AlertTriangle className="w-6 h-6" />
              </Link>
              <Link to="/admin/users" title="Users" className="p-3 bg-on-surface text-paper rounded-none hover:rotate-12 transition-transform shadow-[4px_4px_0px_gray]">
                <UserCircle className="w-6 h-6" />
              </Link>
            </div>
          )}
          <Settings className={cn(
            "w-8 h-8 opacity-40 hover:opacity-100 transition-opacity", 
            isBaja ? "text-baja-pink" : 
            isDiamond ? "text-white" :
            isHeat ? "text-white" :
            "text-on-surface"
          )} />
          <p className="micro-label uppercase tracking-[0.2em] opacity-40">
            {isBaja ? 'VIP ACCESS' : isDiamond ? 'ENCRYPTED' : isHeat ? 'VIP' : 'LEVEL_03_CLEARANCE'}
          </p>
        </div>
      </header>

      <section className="space-y-8">
        <div className="flex items-center gap-4">
          <h3 className={cn(
            "font-serif text-3xl italic", 
            isBaja ? "text-baja-pink font-display uppercase font-normal tracking-wide" :
            isDiamond ? "text-white font-mono uppercase tracking-[0.3em]" :
            isHeat ? "text-white font-display uppercase font-normal" : 
            "font-display text-2xl uppercase tracking-tighter text-on-surface"
          )}>
            {isBaja ? 'The Beach Book' : isDiamond ? 'The Identity' : isHeat ? 'The Beach Book' : 'BUREAU IDENTITY'}
          </h3>
          {!isBaja && !isDiamond && !isHeat && <div className="h-px flex-grow bg-on-surface/10" />}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className={cn(
            "md:col-span-2 relative overflow-hidden group",
            isBaja ? "bg-white border-4 border-baja-pink rounded-[3rem] shadow-[15px_15px_0px_#40e0d0] p-8" : 
            isDiamond ? "bg-white/5 border border-white/10 rounded-sm backdrop-blur-xl p-8" :
            isHeat ? "bg-white border-white border-4 rounded-[3rem] shadow-[15px_15px_0px_rgba(255,140,0,0.5)] p-8" :
            "notice-card p-0"
          )}>
            {!isBaja && !isDiamond && !isHeat && <div className="file-tab">SERVICE_IDENTITY_CARD</div>}
            {(isBaja || isDiamond) && <GlossOverlay opacity={isDiamond ? 0.2 : 0.3} />}
            <div className={cn(
              "absolute top-4 right-4 group-hover:opacity-100 transition-opacity",
              isBaja ? "text-baja-aqua opacity-20" : 
              isDiamond ? "text-white opacity-10" :
              isHeat ? "text-heat-pink opacity-20" :
              "text-on-surface opacity-5"
            )}>
              {isBaja ? <Sparkles className="w-32 h-32" /> : isDiamond ? <Sparkle className="w-32 h-32" /> : isHeat ? <Waves className="w-32 h-32" /> : <Shield className="w-40 h-40" />}
            </div>
            
            <div className={cn("space-y-8 relative z-10", !isBaja && !isDiamond && !isHeat && "p-8")}>
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                   <div className="space-y-2">
                    <p className={cn("micro-label", isBaja ? "text-baja-aqua" : isDiamond ? "text-white/40" : isHeat ? "text-heat-aqua" : "text-brand-orange")}>
                      {isBaja ? 'Beach Role' : isDiamond ? 'System Tag' : isHeat ? 'Beach Role' : 'AUTHORIZED_AGENT_ALIAS'}
                    </p>
                    <h4 className={cn(
                      "leading-none",
                      isBaja ? "text-5xl text-baja-pink font-display uppercase font-normal" : 
                      isDiamond ? "text-6xl text-white font-black liquid-chrome bg-clip-text text-transparent uppercase font-sans" :
                      isHeat ? "text-5xl text-heat-pink font-display uppercase font-normal" :
                      "font-display text-huge uppercase tracking-tighter text-on-surface"
                    )}>{profile?.name || personaData?.name || "Unassigned"}</h4>
                  </div>
                  {!isBaja && !isDiamond && !isHeat && (
                    <div className="bureau-tag bg-brand-orange text-white rotate-6">CERTIFIED</div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-12">
                <div className="space-y-1">
                  <p className="micro-label opacity-40">CURRENT_STANDING</p>
                  <p className={cn(
                    "font-display text-4xl", 
                    isBaja ? "text-baja-aqua" : 
                    isDiamond ? "text-white" :
                    isHeat ? "text-heat-mango" :
                    "text-brand-orange"
                  )}>{points} <span className="text-xs opacity-50">STD</span></p>
                </div>
                <div className="space-y-1">
                  <p className="micro-label opacity-40">
                    {isBaja ? 'Beach Log' : isDiamond ? 'Sync Marks' : isHeat ? 'Splash Log' : 'VALIDATED_REPORTS'}
                  </p>
                  <p className={cn(
                    "font-display text-4xl", 
                    isBaja ? "text-baja-pink" : 
                    isDiamond ? "text-white" :
                    isHeat ? "text-heat-pink" :
                    "text-on-surface"
                  )}>{entries.length} <span className="text-xs opacity-50">ENT</span></p>
                </div>
                <div className="space-y-1">
                  <p className="micro-label opacity-40">ONBOARDING_STATUS</p>
                  <p className={cn(
                    "font-display text-4xl", 
                    isBaja ? "text-baja-coral" : 
                    isDiamond ? "text-white/50 font-mono" :
                    isHeat ? "text-heat-pink" :
                    "text-on-surface"
                  )}>{soloCount}/3 <span className="text-xs opacity-50">PHSE</span></p>
                </div>
              </div>

              <div className="pt-4 border-t border-dashed border-on-surface/10 flex justify-end">
                 <button 
                  onClick={() => navigate('/onboarding')}
                  className={cn(
                    "font-mono text-[6px] uppercase tracking-[0.3em] opacity-5 hover:opacity-60 transition-all active:scale-95",
                    isBaja ? "text-baja-pink" : 
                    isDiamond ? "text-white" :
                    isHeat ? "text-white" :
                    "text-on-surface"
                  )}
                >
                   {isBaja ? '[ Reset Vibe ]' : isDiamond ? '[ Purge Calibration ]' : isHeat ? '[ Refresh Sun ]' : '[ RE_CALIBRATE_IDENTITY ]'}
                </button>
              </div>
            </div>

            {snitchData && (
              <div className="absolute top-0 right-0 p-4 animate-pulse">
                <div className={cn(
                  "font-display text-[10px] px-3 py-1 rotate-12 flex items-center gap-1 shadow-lg border-2",
                  isBaja ? "bg-baja-aqua text-white border-white" : 
                  isDiamond ? "bg-white text-black border-white" :
                  isHeat ? "bg-heat-pink text-white border-white" :
                  "bg-brand-orange text-white border-on-surface shadow-[4px_4px_0_black]"
                )}>
                  <AlertTriangle className="w-3 h-3" />
                  VIOLATION: {snitchData.title}
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
                "font-display text-4xl uppercase leading-none mb-4 tracking-tighter",
                isDiamond && "font-sans font-black tracking-tighter"
              )}>
                {isBaja ? 'Rank: Bae' : isDiamond ? 'Rank: Prism' : isHeat ? 'Rank: Hot' : 'STATUS: ACTIVE'}
              </h4>
              <p className={cn("font-serif italic leading-relaxed text-lg", (isBaja || isDiamond || isHeat) ? "text-white" : "text-paper/80")}>
                {isBaja ? '"Golden hour is a state of mind, babe."' : 
                 isDiamond ? '"The harder the light, the brighter you shine."' :
                 isHeat ? '"Poolside is the only side, babe."' :
                 '"Asset verified. Field performance meets core Bureau requirements for civic adventure."'}
              </p>
            </div>
            <div className={cn("text-[10px] font-mono mt-8 uppercase tracking-widest", (isBaja || isDiamond || isHeat) ? "opacity-60" : "opacity-40")}>
              {isBaja ? 'VERIFIED BY BEACH COUNCIL' : isDiamond ? 'CERTIFIED REFLECTIVE' : isHeat ? 'CERTIFIED BAED' : 'BUREAU AUTHENTICATED // VOL.11'}
            </div>
          </div>
        </div>
      </section>

      {/* Field Fragments / Badges */}
      <section className="space-y-8">
        <BadgeCollection progress={badgeProgress} />
      </section>

      {/* The Protocol / Skin Selector */}
      <section className="space-y-8">
        <div className="flex items-center gap-4">
          <h3 className={cn("font-serif text-3xl italic", 
            isBaja ? "text-baja-pink font-display uppercase font-normal tracking-wide" :
            "font-display text-2xl uppercase tracking-tighter text-on-surface"
          )}>
            {isBaja ? 'Vibe Settings' : 'PROTOCOLS // VISUAL_ENGINE'}
          </h3>
          {!isBaja && <div className="h-px flex-grow bg-on-surface/10" />}
        </div>

        <SkinSelector />
      </section>

      {/* Preferences */}
      <section className="space-y-8">
        <div className="flex items-center gap-4">
          <h3 className="font-display text-2xl uppercase tracking-tighter text-on-surface">
            User Preferences
          </h3>
          <div className="h-px flex-grow bg-on-surface/10" />
        </div>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-bold uppercase tracking-tight text-sm">Reduce Playful Commentary</p>
              <p className="text-xs opacity-60">Disable behavioral observations and "fortune-cookie" insights.</p>
            </div>
            <button 
              onClick={async () => {
                if (!user || !profile) return;
                const current = profile.preferences?.reduceCommentary || false;
                await updateProfile(user.uid, {
                  preferences: { ...profile.preferences, reduceCommentary: !current }
                });
              }}
              className={cn(
                "w-12 h-6 rounded-full relative transition-colors duration-300",
                profile?.preferences?.reduceCommentary ? "bg-brand-orange" : "bg-on-surface/10"
              )}
            >
              <motion.div 
                animate={{ x: profile?.preferences?.reduceCommentary ? 24 : 4 }}
                className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-sm"
              />
            </button>
          </div>
        </Card>
      </section>

      {/* Archival Actions */}
      <section className="space-y-8">
        <div className="flex items-center gap-4">
          <h3 className={cn("font-serif text-3xl italic", 
            isBaja ? "text-baja-pink font-display uppercase font-normal tracking-wide" :
            "font-display text-2xl uppercase tracking-tighter text-on-surface"
          )}>
            {isBaja ? 'Safe Box' : 'ARCHIVAL_CONTROLS'}
          </h3>
          {!isBaja && <div className="h-px flex-grow bg-on-surface/10" />}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <button className="group relative text-left">
            {!isBaja && !isDiamond && !isHeat && <div className="absolute inset-0 bg-on-surface shadow-[8px_8px_0_gray] translate-x-1 translate-y-1" />}
            <div className={cn(
              "relative border-4 p-8 flex items-center gap-6 transition-all",
              isBaja ? "bg-white border-baja-pink rounded-full hover:bg-baja-sand shadow-[8px_8px_0_#40e0d0]" : 
              isDiamond ? "bg-white/5 border-white/20 rounded-none hover:bg-white/10" :
              "notice-card flex-row p-8"
            )}>
              <Download className={cn("w-10 h-10", isBaja ? "text-baja-pink" : "text-brand-orange")} />
              <div className="space-y-1">
                <span className={cn(
                  "font-display uppercase leading-tight",
                  isBaja ? "text-3xl text-baja-pink font-normal" : "text-3xl text-on-surface"
                )}>{isBaja ? 'Export Glam' : 'REQUEST_RECORD'}</span>
                <p className={cn("micro-label", isBaja ? "text-baja-pink/60" : "opacity-40")}>
                  {isBaja ? 'Get your beach log (JSON)' : 'OFFICIAL DOSSIER DOWNLOAD (JSON)'}
                </p>
              </div>
            </div>
          </button>

          <button onClick={handleSignOut} className="group relative text-left">
             {!isBaja && !isDiamond && !isHeat && <div className="absolute inset-0 bg-error/20 shadow-[8px_8px_0_#ff000022] translate-x-1 translate-y-1" />}
             <div className={cn(
              "relative border-4 p-8 flex items-center gap-6 transition-all",
              isBaja ? "bg-white border-baja-pink rounded-full hover:bg-baja-sand shadow-[8px_8px_0_#ff4d9422]" : 
              isDiamond ? "bg-white/5 border-white/20 rounded-none hover:bg-white/10" :
              "notice-card flex-row p-8 border-error/50 hover:border-error"
            )}>
              <Trash2 className={cn("w-10 h-10", isBaja ? "text-baja-coral" : "text-error")} />
              <div className="space-y-1">
                <span className={cn(
                  "font-display uppercase leading-tight",
                  isBaja ? "text-3xl text-baja-coral font-normal" : "text-3xl text-error"
                )}>{isBaja ? 'Sunk Entry' : 'DISCONNECT_SYS'}</span>
                <p className={cn("micro-label", isBaja ? "text-baja-coral/60" : "text-error opacity-60")}>
                  {isBaja ? 'Permanent vibe destruction' : 'RECLAMATION_SESSION_END'}
                </p>
              </div>
            </div>
          </button>
        </div>
      </section>

      <footer className="pt-24 pb-12 flex flex-col items-center justify-center space-y-6">
        <Sticker color="black" className="px-8 py-3 font-display text-4xl -rotate-6 uppercase select-none transition-transform hover:rotate-0">
          {isBaja ? 'VERIFIED LUXE OPS' : 'BUREAU AUTHENTICATED'}
        </Sticker>
        <p className={cn(
          "font-mono text-xs uppercase tracking-[0.4em] opacity-40",
          isBaja && "text-baja-pink opacity-40 font-bold"
        )}>
          {isBaja ? 'BEACH LOG v2.0 ' : 'BUREAU INTEL MANIFEST v11.2'}
        </p>
      </footer>
    </div>
  );
}
