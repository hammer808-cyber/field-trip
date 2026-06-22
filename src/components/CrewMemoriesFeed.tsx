import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, 
  MessageSquare, 
  Sparkles, 
  Smile, 
  ImageIcon, 
  ArrowRight, 
  Users, 
  Trophy, 
  Clock, 
  Award,
  CheckCircle2, 
  HelpCircle,
  ThumbsUp
} from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { useApp } from '../context/AppContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Entry } from '../types/game';
import { toggleLikeEntry, checkIfLiked } from '../services/proofService';
import { 
  addReaction, 
  removeReaction, 
  subscribeToAllReactions, 
  EntryReaction 
} from '../services/reactionService';

import { ProofImage } from './ProofImage';

const AVAILABLE_EMOJIS = ['🔥', '😂', '🤯', '😎', '👏', '🙌', '🎉', '❤️'];

export function CrewMemoriesFeed() {
  const { profile } = useApp();
  const navigate = useNavigate();
  const currentUser = auth.currentUser;
  
  const [entries, setEntries] = useState<Entry[]>([]);
  const [reactions, setReactions] = useState<EntryReaction[]>([]);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [activePickerId, setActivePickerId] = useState<string | null>(null);

  const crewId = profile?.crewId;

  // 1. Subscribe to approved entries from this crew
  useEffect(() => {
    if (!crewId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    // Fetch all entries where crewId matches
    const q = query(
      collection(db, 'entries'),
      where('crewId', '==', crewId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allEntries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }) as Entry);

      // Filter only approved ones on client side to avoid index requirement issues
      const approvedStatuses = ['approved', 'approved_by_admin', 'auto_approved', 'completed'];
      const approved = allEntries.filter(e => 
        approvedStatuses.includes(e.status || '') && (e.imageUrl || e.photoUrl || e.proofImage)
      );

      // Sort by createdAt descending
      approved.sort((a, b) => {
        const timeA = a.createdAt?.seconds || a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.seconds || b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      });

      setEntries(approved);
      setLoading(false);
    }, (error) => {
      console.error("Error subscribing to crew entries:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [crewId]);

  // 2. Subscribe to reactions for the visible entries
  useEffect(() => {
    if (entries.length === 0) {
      setReactions([]);
      return;
    }

    const entryIds = entries.map(e => e.id);
    const unsubscribe = subscribeToAllReactions(entryIds, (receivedReactions) => {
      setReactions(receivedReactions);
    });

    return () => unsubscribe();
  }, [entries]);

  // 3. Keep track of which entries the user liked
  useEffect(() => {
    if (!currentUser || entries.length === 0) return;

    const checkLikes = async () => {
      const map: Record<string, boolean> = {};
      await Promise.all(
        entries.map(async (entry) => {
          const isLiked = await checkIfLiked(entry.id, currentUser.uid);
          map[entry.id] = isLiked;
        })
      );
      setLikedMap(map);
    };

    checkLikes();
  }, [entries, currentUser]);

  const handleLikeToggle = async (entryId: string) => {
    if (!currentUser) return;
    const currentIsLiked = !!likedMap[entryId];
    
    // Optimistic Update
    setLikedMap(prev => ({ ...prev, [entryId]: !currentIsLiked }));
    setEntries(prev => prev.map(e => {
      if (e.id === entryId) {
        const diff = currentIsLiked ? -1 : 1;
        return { ...e, likeCount: Math.max(0, (e.likeCount || 0) + diff) };
      }
      return e;
    }));

    try {
      await toggleLikeEntry(entryId, currentUser.uid, currentIsLiked);
    } catch (err) {
      console.error("Failed to toggle like:", err);
      // Rollback on fail
      setLikedMap(prev => ({ ...prev, [entryId]: currentIsLiked }));
      setEntries(prev => prev.map(e => {
        if (e.id === entryId) {
          const diff = currentIsLiked ? 1 : -1;
          return { ...e, likeCount: Math.max(0, (e.likeCount || 0) + diff) };
        }
        return e;
      }));
    }
  };

  const handleEmojiToggle = async (entryId: string, emoji: string) => {
    if (!currentUser) return;
    
    const userReacted = reactions.some(
      r => r.entryId === entryId && r.userId === currentUser.uid && r.emoji === emoji
    );

    setActivePickerId(null);

    try {
      if (userReacted) {
        await removeReaction(entryId, currentUser.uid, emoji);
      } else {
        await addReaction(entryId, currentUser.uid, emoji);
      }
    } catch (err) {
      console.error("Failed to toggle reaction:", err);
    }
  };

  // Group reactions by entryId and emoji code
  const getReactionsSummary = (entryId: string) => {
    const entryReactions = reactions.filter(r => r.entryId === entryId);
    const summary: Record<string, { count: number; users: string[]; hasReacted: boolean }> = {};

    entryReactions.forEach(r => {
      if (!summary[r.emoji]) {
        summary[r.emoji] = { count: 0, users: [], hasReacted: false };
      }
      summary[r.emoji].count += 1;
      summary[r.emoji].users.push(r.userId);
      if (currentUser && r.userId === currentUser.uid) {
        summary[r.emoji].hasReacted = true;
      }
    });

    return Object.entries(summary).map(([emoji, data]) => ({
      emoji,
      ...data
    }));
  };

  if (!crewId) {
    return (
      <div className="p-8 border-[3.5px] border-on-surface bg-[#FFFCEB] rounded-2xl shadow-[8px_8px_0px_black] text-center space-y-6 max-w-xl mx-auto rotate-[-0.5deg]">
        <Users className="w-16 h-16 mx-auto text-brand-orange animate-bounce" />
        <div className="space-y-2">
          <h3 className="font-display font-black text-2xl uppercase tracking-tight text-on-surface">No Scattered Crew Found</h3>
          <p className="font-serif italic text-sm text-on-surface/70 leading-relaxed">
            "Every summer memory needs an audience. Form or join a crew in Basecamp so your weird little discoveries have somewhere to land."
          </p>
        </div>
        <button 
          onClick={() => navigate('/basecamp')}
          className="px-6 py-3 bg-brand-orange text-white font-display font-black uppercase text-sm border-3 border-on-surface shadow-[4px_4px_0px_black] active:translate-y-1 active:shadow-none transition-all hover:bg-brand-orange-dark inline-flex items-center gap-2"
        >
          <span>Go to Basecamp</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <div className="w-10 h-10 border-4 border-brand-orange border-t-transparent rounded-full animate-spin" />
        <p className="font-mono text-xs uppercase tracking-widest text-on-surface/60">Scanning memory reels...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b-4 border-on-surface/10 pb-6">
        <div>
          <h2 className="text-3xl font-display font-black uppercase italic tracking-tighter text-on-surface">Crew Memories Feed</h2>
          <p className="text-xs font-mono text-on-surface/50 uppercase tracking-wider">Approved snapshots from your scouting crew</p>
        </div>
        <button
          onClick={() => navigate('/deck')}
          className="self-start sm:self-center px-4 py-2 bg-white hover:bg-[#FFFCEB] border-2 border-on-surface font-mono text-xs font-black uppercase tracking-wider shadow-[3px_3px_0px_black] active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-2"
        >
          <ImageIcon className="w-4 h-4" />
          <span>Contribute memory</span>
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="p-10 border-[3.5px] border-on-surface bg-[#FAFAFA] rounded-2xl shadow-[6px_6px_0px_black] text-center space-y-6 max-w-lg mx-auto">
          <div className="text-5xl select-none animate-pulse">🎞️</div>
          <div className="space-y-2">
            <h4 className="font-display font-black text-xl uppercase text-on-surface">Reel is Empty</h4>
            <p className="font-serif italic text-xs leading-relaxed text-on-surface/60 max-w-sm mx-auto">
              "No approved field photos have landed here yet. Gear up, head outside, draw a card, and submit matching proof to earn points and populate the feed!"
            </p>
          </div>
          <button 
            onClick={() => navigate('/deck')}
            className="w-full sm:w-auto px-6 py-4 bg-brand-lime text-black font-display font-black uppercase text-sm border-3 border-on-surface shadow-[4px_4px_0px_black] active:translate-y-1 active:shadow-none transition-all hover:bg-opacity-90 flex items-center justify-center gap-2 mx-auto"
          >
            <span>Draw a Mission Card</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="space-y-12">
          {entries.map((entry, idx) => {
            const displayImage = entry.imageUrl || entry.photoUrl || entry.proofImage;
            const pointsValue = entry.awardedXP || entry.pointsAwarded || entry.awardedPoints || entry.estimatedPoints || 100;
            const entryReactions = getReactionsSummary(entry.id);
            const isLiked = !!likedMap[entry.id];
            
            // Random slant angles for scrapbook/polaroid effect
            const slant = (idx % 2 === 0 ? 'rotate-[1deg]' : 'rotate-[-1deg]');

            return (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: Math.min(idx * 0.1, 0.5) }}
                key={entry.id}
                className={`bg-white border-[3.5px] border-on-surface p-4 sm:p-6 shadow-[8px_8px_0px_black] ${slant} hover:rotate-0 hover:scale-[1.01] hover:shadow-[10px_10px_0px_black] transition-all duration-300 relative group`}
              >
                {/* Decorative Scotch Tape on the Polaroid */}
                <div className="absolute -top-3 transform -translate-x-1/2 left-1/2 w-24 h-6 bg-brand-yellow/30 border-x-2 border-dashed border-on-surface/15 select-none pointer-events-none rotate-[2deg] backdrop-blur-[1px]" />

                {/* Header (Author Info) */}
                <div className="flex items-center justify-between mb-4 mt-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border-2 border-on-surface bg-[#EAF7F7] overflow-hidden flex items-center justify-center font-mono font-black text-brand-cyan-dark">
                      {entry.userAvatar?.accessoryId ? (
                        <span className="text-xl">⛺</span>
                      ) : (
                        <span>{entry.displayName?.substring(0, 2).toUpperCase() || "AG"}</span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-display font-black text-sm uppercase text-on-surface tracking-tight">
                        {entry.displayName || "Anonymous Agent"}
                      </h4>
                      <p className="text-[10px] font-mono text-on-surface/40 uppercase tracking-widest flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {entry.createdAt ? (
                          new Date(entry.createdAt.seconds * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                        ) : "Recent"}
                      </p>
                    </div>
                  </div>

                  {/* Points Earned Sticker */}
                  <div className="bg-brand-cyan border-2 border-on-surface px-2.5 py-1 text-center shadow-[2px_2px_0px_black] rotate-[4deg]">
                    <span className="font-display font-black text-xs uppercase tracking-wider text-on-surface flex items-center gap-1">
                      <Award className="w-3 h-3" />
                      +{pointsValue} XP
                    </span>
                  </div>
                </div>

                {/* Subtitle / Challenge Descriptor */}
                <div className="mb-4 bg-brand-yellow/10 border-2 border-on-surface/25 p-2 rounded">
                  <p className="text-[10px] font-mono font-black text-brand-orange uppercase tracking-wider mb-0.5">ADVENTURE SAVED:</p>
                  <p className="font-display font-black text-sm text-on-surface uppercase leading-tight">
                    {entry.tripTitle || entry.challengeTitle || "Field Mission Exploration"}
                  </p>
                </div>

                {/* Polaroid Main Image Area */}
                <div className="bg-black/5 aspect-square border-[3px] border-on-surface overflow-hidden relative group/img">
                  <ProofImage 
                    entry={entry} 
                    alt={entry.tripTitle || "Crew Memory Snapshot"}
                    className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500 ease-out"
                  />
                  
                  {/* Watermark Sticker */}
                  <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm border border-on-surface px-2 py-0.5 rounded font-mono text-[8px] uppercase tracking-widest pointer-events-none select-none text-on-surface/80">
                    🔒 APPROVED EVIDENCE
                  </div>
                </div>

                {/* Field Notes Section */}
                {entry.fieldNote && (
                  <div className="my-4 p-3 bg-[#FCFAF2] border-l-4 border-brand-orange font-serif text-xs leading-relaxed italic text-on-surface/85 relative">
                    <span className="absolute -top-3 right-2 text-2xl text-on-surface/10 select-none">“</span>
                    {entry.fieldNote}
                  </div>
                )}

                {/* Action Row containing reactions */}
                <div className="mt-4 pt-4 border-t-2 border-on-surface/10 flex flex-wrap gap-2 items-center justify-between">
                  
                  {/* Reaction Summary & Quick Buttons */}
                  <div className="flex flex-wrap gap-1.5 items-center">
                    
                    {/* Like / Heart Toggle Button */}
                    <button
                      onClick={() => handleLikeToggle(entry.id)}
                      className={`h-8 px-3 border-2 border-on-surface rounded-full flex items-center gap-1.5 font-mono text-xs font-black transition-all shadow-[2px_2px_0px_black] active:translate-y-0.5 active:shadow-none ${
                        isLiked 
                          ? 'bg-brand-magenta text-white shadow-none translate-y-0.5' 
                          : 'bg-white hover:bg-brand-magenta/5 text-on-surface'
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current animate-pulse' : ''}`} />
                      <span>{entry.likeCount || 0}</span>
                    </button>

                    {/* Render existing active Emoji Reactions */}
                    {entryReactions.map(rect => (
                      <button
                        key={rect.emoji}
                        onClick={() => handleEmojiToggle(entry.id, rect.emoji)}
                        className={`h-8 px-2.5 border-2 border-on-surface rounded-full flex items-center gap-1 text-xs font-black transition-all shadow-[2px_2px_0px_black] active:translate-y-0.5 active:shadow-none ${
                          rect.hasReacted 
                            ? 'bg-brand-cyan/20 text-on-surface border-brand-cyan-dark' 
                            : 'bg-[#FFFCEB] hover:bg-brand-yellow/10'
                        }`}
                        title={rect.users.length + " reaction(s)"}
                      >
                        <span className="text-sm select-none">{rect.emoji}</span>
                        <span className="font-mono text-[10px] font-black">{rect.count}</span>
                      </button>
                    ))}

                    {/* Emoji Reaction Picker Popover Control */}
                    <div className="relative">
                      <button
                        onClick={() => setActivePickerId(activePickerId === entry.id ? null : entry.id)}
                        className="w-8 h-8 rounded-full border-2 border-on-surface bg-white hover:bg-brand-yellow/15 flex items-center justify-center shadow-[2px_2px_0px_black] active:translate-y-0.5 active:shadow-none transition-all"
                        title="React with Emoji"
                      >
                        <Smile className="w-4 h-4 text-on-surface" />
                      </button>

                      {/* Floating Emoji Selector Box */}
                      <AnimatePresence>
                        {activePickerId === entry.id && (
                          <>
                            {/* Backdrop shadow overlay */}
                            <div 
                              className="fixed inset-0 z-40" 
                              onClick={() => setActivePickerId(null)}
                            />
                            
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9, y: 10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.9, y: 10 }}
                              className="absolute bottom-10 left-0 bg-white border-3 border-on-surface p-2 rounded-xl shadow-[4px_4px_0px_black] z-50 flex gap-1.5 items-center"
                            >
                              {AVAILABLE_EMOJIS.map(emoji => {
                                const hasReacted = reactions.some(
                                  r => r.entryId === entry.id && r.userId === currentUser?.uid && r.emoji === emoji
                                );
                                return (
                                  <button
                                    key={emoji}
                                    onClick={() => handleEmojiToggle(entry.id, emoji)}
                                    className={`w-8 h-8 rounded hover:bg-brand-yellow/20 flex items-center justify-center text-lg active:scale-125 transition-transform ${
                                      hasReacted ? 'bg-brand-cyan/25' : ''
                                    }`}
                                  >
                                    {emoji}
                                  </button>
                                );
                              })}
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Right side check status indication */}
                  <div className="flex items-center gap-1 bg-[#EEFCEE] border border-brand-green/30 px-2 py-1 rounded text-[9px] font-mono text-brand-green-dark uppercase tracking-wider font-semibold">
                    <CheckCircle2 className="w-3 h-3 text-brand-green" />
                    <span>Scout Verified</span>
                  </div>

                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
