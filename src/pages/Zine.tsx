import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { Card, Sticker } from '../components/UI';
import { MapPin, Heart, MessageCircle, Share2, AlertTriangle, RotateCcw } from 'lucide-react';
import { cn } from '../lib/utils';
import { useState, useEffect } from 'react';
import { Hibiscus, ChromeStar, GlossOverlay, BeachTag } from '../components/BajaBratzAssets';
import { DiamondStar, Sparkle, SunFlare, PalmTree, BeachTag as HeatBeachTag, GlossOverlay as DiamondGloss } from '../components/SkinAssets';
import { getGlobalEntriesPage } from '../services/entryService';
import { FIELD_TYPES, Entry } from '../constants';
import { AvatarPreview } from '../components/AvatarPreview';
import { DEFAULT_AVATAR } from '../constants/avatarAssets';
import { VotingHub } from '../components/VotingHub';

export default function ZinePage() {
  const { fieldType } = useApp();
  const { skin, frankieMode } = useTheme();
  const [likedEntries, setLikedEntries] = useState<Set<string>>(new Set());
  
  const fieldTypeData = FIELD_TYPES[fieldType || 'unclassified'];

  // Paginated feed state
  const [feedEntries, setFeedEntries] = useState<Entry[]>([]);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingFeed, setLoadingFeed] = useState(false);

  useEffect(() => {
    async function loadInit() {
      setLoadingFeed(true);
      const result = await getGlobalEntriesPage(9);
      if (result) {
        setFeedEntries(result.docs);
        setLastVisible(result.lastVisible);
        setHasMore(result.docs.length === 9);
      }
      setLoadingFeed(false);
    }
    loadInit();
  }, []);

  const loadMore = async () => {
    if (loadingFeed || !hasMore) return;
    setLoadingFeed(true);
    const result = await getGlobalEntriesPage(9, lastVisible);
    if (result) {
      setFeedEntries(prev => [...prev, ...result.docs]);
      setLastVisible(result.lastVisible);
      setHasMore(result.docs.length === 9);
    }
    setLoadingFeed(false);
  };

  const isBaja = skin === 'baja-bratz';
  const isDiamond = skin === 'slippery-diamond';
  const isHeat = skin === 'heatwave';

  const toggleLike = (id: string) => {
    const newLiked = new Set(likedEntries);
    if (newLiked.has(id)) newLiked.delete(id);
    else newLiked.add(id);
    setLikedEntries(newLiked);
  };

  return (
    <div className={cn(
      "min-h-screen pb-40 px-4 md:px-8 pt-12 space-y-16 max-w-6xl mx-auto relative overflow-hidden",
      isBaja ? "bg-baja-sand text-baja-pink" : 
      isDiamond ? "bg-black text-white" :
      isHeat ? "bg-heat-mango text-white" : ""
    )}>
      {isBaja && !frankieMode && (
        <>
          <Hibiscus className="absolute top-20 right-[-40px] w-80 h-80 opacity-10 -z-10" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-baja-pink rounded-full blur-[120px] opacity-10 -z-20" />
        </>
      )}

      {isDiamond && !frankieMode && (
        <>
          <div className="absolute inset-0 liquid-chrome opacity-5 pointer-events-none -z-20" />
          <DiamondStar className="absolute top-40 right-[-30px] w-48 h-48 text-white opacity-10 -z-10" />
          <Sparkle className="absolute bottom-40 left-10 w-8 h-8 text-white opacity-20 -z-10 animate-pulse" />
        </>
      )}

      {isHeat && !frankieMode && (
        <>
          <SunFlare className="absolute top-0 right-[-50px] w-64 h-64 shadow-2xl" />
          <PalmTree className="absolute bottom-20 left-10 w-48 h-48 opacity-20 text-white -z-10" />
          <div className="absolute inset-0 bg-gradient-to-b from-heat-yellow/20 to-transparent pointer-events-none -z-20" />
        </>
      )}

      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 relative z-10">
        <div className="space-y-4">
          <p className={cn("micro-label", isBaja ? "text-baja-aqua" : isDiamond ? "text-white/40" : isHeat ? "text-white" : "opacity-40")}>
            {isBaja ? 'DAILY GLAM ROLL' : isDiamond ? 'DATA STREAM ALPHA' : isHeat ? 'POOL PARTY FEED' : 'BUREAU_ARCHIVE // VOLUME_11.2'}
          </p>
          <h2 className={cn(
            "text-huge leading-none",
            isBaja ? "text-baja-pink font-display uppercase" : 
            isDiamond ? "text-white font-mono uppercase tracking-[0.2em] font-black italic" :
            isHeat ? "text-white font-display uppercase tracking-tighter italic shadow-sm" :
            "text-on-surface"
          )}>{isBaja ? 'The Feed' : isDiamond ? 'CENTRAL PRISM' : isHeat ? 'THE SPLASH' : 'Viewfinder'}</h2>
          {!isBaja && !isDiamond && !isHeat && <p className="bureau-subhead">Visual documentation of field anomalies and entries.</p>}
        </div>
        <div className="max-w-md">
          <p className={cn(
            "text-lg leading-relaxed",
            isBaja ? "font-serif italic text-baja-pink/60" : 
            isDiamond ? "font-mono text-xs text-white/40 uppercase tracking-widest" :
            isHeat ? "font-display text-white italic uppercase tracking-tight" :
            "font-serif italic text-on-surface opacity-60"
          )}>
            {isBaja ? "Check out the beach party. Everyone's looking choice, babe." : 
             isDiamond ? "COLLECTIVE SENSORY DATA LOGGED. SPECTRAL ANOMALIES RECORDED." :
             isHeat ? "THE HEAT IS RISING. DIVE INTO THE LATEST ENTRIES." :
             "A collective record of curiosities, deviations, and urban anomalies authenticated by field agents."}
          </p>
        </div>
      </header>

      {/* Community Voting Hub */}
      <VotingHub />

      <div className="columns-1 md:columns-2 lg:columns-3 gap-12 space-y-12 relative z-10">
        {feedEntries.length > 0 ? (
          <>
            {feedEntries.map((entry, idx) => (
              <div key={entry.id || idx} className="break-inside-avoid flex flex-col">
                {!isBaja && !isDiamond && !isHeat && <div className="file-tab">REPORT_{entry.id?.substring(0,6) || 'XXXXXX'}</div>}
                <div className={cn(
                  "flex flex-col gap-6 p-6 border-2 transition-all group",
                  isBaja ? "bg-white border-baja-pink/20 hover:border-baja-pink rounded-[2.5rem] p-6 shadow-lg rotate-1" : 
                  isDiamond ? "bg-white/5 border-white/10 hover:border-white rounded-none p-6" :
                  isHeat ? "bg-white border-white rounded-[2rem] hover:scale-105 shadow-[10px_10px_0px_white] p-6" :
                  "notice-card p-6"
                )}>
                  {(isBaja || isDiamond) && <GlossOverlay opacity={isDiamond ? 0.1 : 0.2} />}
                  {/* Proof Image */}
                  <div className={cn(
                    "relative aspect-[4/5] overflow-hidden",
                    isBaja ? "rounded-[2rem] border-white border-4" : 
                    isDiamond ? "rounded-none border-white/20 border" :
                    isHeat ? "rounded-[1.5rem] border-heat-pink border-4" :
                    "evidence-frame"
                  )}>
                    <img 
                      src={entry.proofImage} 
                      alt={entry.challengeTitle} 
                      loading="lazy"
                      className="w-full h-full object-cover transition-all duration-700" 
                    />
                    {!isBaja && !isDiamond && !isHeat && <div className="evidence-label uppercase">TRANSMISSION_CAPTURE</div>}
                  </div>
                  
                  {/* Entry Identity Column */}
                  <div className="flex items-center gap-4 border-t border-on-surface/5 pt-4">
                    <AvatarPreview 
                      avatar={entry.userAvatar || DEFAULT_AVATAR} 
                      size="sm" 
                      className={cn(
                        "rounded-full border",
                        isBaja ? "border-baja-pink" : 
                        isDiamond ? "border-white/20" :
                        isHeat ? "border-heat-pink" :
                        "border-on-surface/10"
                      )} 
                    />
                    <div className="space-y-1">
                      <p className={cn(
                        "font-display text-sm uppercase tracking-tighter",
                        isBaja ? "text-baja-pink" : isHeat ? "text-heat-pink" : "text-on-surface"
                      )}>
                        {entry.userName || 'ANON_AGENT'}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="micro-label opacity-40">FIED_REPORT</span>
                        <span className={cn(
                          "w-1 h-1 rounded-full",
                          isBaja ? "bg-baja-aqua" : "bg-brand-orange"
                        )} />
                        <span className="micro-label opacity-40">{entry.challengeTitle}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </>
        ) : (
          <div className={cn(
              "col-span-full py-40 text-center border-4 border-dashed rotate-1 space-y-6",
              isBaja ? "border-baja-pink/20" : isDiamond ? "border-white/10" : isHeat ? "border-white" : "bureau-panel border-dashed"
          )}>
            <h3 className={cn(
                "font-display text-huge uppercase tracking-tighter leading-tight",
                isBaja ? "text-baja-pink/20" : isDiamond ? "text-white/10 font-mono italic" : "text-on-surface opacity-20"
            )}>The Archive Is Bare</h3>
            <p className={cn(
                "text-lg max-w-sm mx-auto",
                isDiamond ? "font-mono text-xs text-white/20 uppercase" : "font-serif text-on-surface opacity-40 italic"
            )}>
              {fieldTypeData?.emptyState || "No transmissions have been verified for this cycle. Be the first to record history in the field."}
            </p>
          </div>
        )}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-8">
           <button 
            onClick={loadMore}
            disabled={loadingFeed}
            className="px-12 py-4 border-2 border-dashed border-on-surface/20 hover:border-brand-orange hover:text-brand-orange transition-all font-display text-sm tracking-widest uppercase opacity-40 hover:opacity-100 flex items-center gap-3"
           >
             <RotateCcw className={cn("w-4 h-4", loadingFeed && "animate-spin")} />
             {loadingFeed ? 'Calibrating Archive...' : 'Sync Next Sightings'}
           </button>
        </div>
      )}

      {/* Seasonal Footer */}
      <footer className={cn(
          "pt-24 pb-12 text-center border-t-2 border-dashed space-y-4 relative z-10",
          isBaja ? "border-baja-pink" : isDiamond ? "border-white/20" : isHeat ? "border-white" : "border-on-surface"
      )}>
        <Sticker color="black" className="text-sm py-2">
            {isDiamond ? 'PRISM_STABLE' : isHeat ? 'HEATWAVE_PEAK' : 'VIEWFINDER_CERTIFIED_FEED'}
        </Sticker>
        <p className={cn("micro-label block", (isBaja || isDiamond || isHeat) ? "text-inherit opacity-40" : "opacity-40")}>
            {isDiamond ? 'END OF TRANSMISSION' : 'END OF VIEWFINDER RECORD // VOLUME 11.2'}
        </p>
      </footer>
    </div>
  );
}
