import React, { useState, useEffect } from 'react';
import { Card, FieldCard, FieldBadge, FieldLabel, FieldTape, FieldStamp } from './UI';
import { Heart, MessageCircle, Fingerprint, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { ProofImage } from './ProofImage';
import { AvatarPreview } from './AvatarPreview';
import { toggleLikeEntry, checkIfLiked } from '../services/proofService';
import { cn } from '../lib/utils';
import { DEFAULT_AVATAR } from '../constants/avatarAssets';
import { toast } from 'react-hot-toast';

interface CommunityProofCardProps {
  proof: any;
  normalizeEntryStatus: (status: string) => string;
}

export function CommunityProofCard({ proof, normalizeEntryStatus }: CommunityProofCardProps) {
  const { user } = useApp();
  const [liked, setLiked] = useState(false);
  const [localLikeCount, setLocalLikeCount] = useState(proof.likeCount || 0);
  const [isLiking, setIsLiking] = useState(false);

  useEffect(() => {
    if (user?.uid && proof.id) {
       checkIfLiked(proof.id, user.uid).then(setLiked).catch(err => {
         console.warn("[CommunityProofCard] checkIfLiked error caught:", err);
       });
    }
  }, [proof.id, user?.uid]);

  // Sync with prop updates (real-time from Firestore)
  useEffect(() => {
    setLocalLikeCount(proof.likeCount || 0);
  }, [proof.likeCount]);

  const handleLike = async () => {
    if (!user) {
      toast.error("Sign in to like proofs");
      return;
    }
    if (isLiking) return;

    const newLikedState = !liked;
    
    // Optimistic Update
    setLiked(newLikedState);
    setLocalLikeCount((prev: number) => newLikedState ? prev + 1 : Math.max(0, prev - 1));
    setIsLiking(true);

    try {
      await toggleLikeEntry(proof.id, user.uid, liked); // pass 'liked' (the old state)
      console.log(`[Like_Protocol] ${newLikedState ? 'Added' : 'Removed'} like for ${proof.id}`);
    } catch (err) {
      // Revert on error
      setLiked(!newLikedState);
      setLocalLikeCount((prev: number) => !newLikedState ? prev + 1 : Math.max(0, prev - 1));
      toast.error("Failed to update like");
    } finally {
      setIsLiking(false);
    }
  };

  const formattedDate = new Date(proof.approvedAt?.seconds * 1000 || proof.createdAt?.seconds * 1000 || Date.now()).toLocaleDateString();

  return (
    <FieldCard variant="photo" className="w-full flex flex-col h-full group relative overflow-visible">
      {/* Decorative Washi Tape holding photo top corner */}
      <FieldTape className="absolute -top-3 left-1/3 z-20 w-16 h-6" rotation={-5} />

      {/* Status Sticker Badge */}
      <div className="absolute top-2 left-2 z-20 pointer-events-none">
        {normalizeEntryStatus(proof.status) === 'approved' ? (
          <div className="bg-brand-lime text-on-surface text-[8px] font-black px-2 py-1 border-2 border-on-surface shadow-[2px_2px_0px_black] -rotate-12 uppercase italic">
            Approved Proof
          </div>
        ) : normalizeEntryStatus(proof.status) === 'needs_more_proof' ? (
          <div className="bg-brand-orange text-white text-[8px] font-black px-2 py-1 border-2 border-on-surface shadow-[2px_2px_0px_black] -rotate-3 uppercase italic">
            Needs More Proof
          </div>
        ) : (
          <div className="bg-on-surface text-white text-[8px] font-black px-2 py-1 border-2 border-on-surface shadow-[2px_2px_0px_black] rotate-2 uppercase italic">
            Pending Review
          </div>
        )}
        
        {/* DEBUG LABELS REQUESTED BY USER */}
        <div className="mt-2 bg-black/80 text-[6px] font-mono text-white p-1 rounded-sm border border-white/20">
          <div>eid: {proof.id}</div>
          <div>status: {proof.status}</div>
          <div>photoUrl: {proof.photoUrl ? 'EXISTS' : 'MISSING'}</div>
        </div>
      </div>

      {/* Proof Image Slot in polaroid mount */}
      <div className="photo-image-slot relative overflow-hidden aspect-square border-[2.5px] border-on-surface bg-[#ECE9E0] flex items-center justify-center m-1 shadow-[inset_0_2px_4px_rgba(0,0,0,0.15)]">
        <ProofImage 
          entry={proof} 
          isCommunityFeed={true}
          className="grayscale-[0.2] group-hover:grayscale-0 transition-all duration-700 w-full h-full object-cover" 
        />
        
        {/* Physical Timestamp stamp */}
        <div className="absolute bottom-2 right-2 flex gap-1 z-10">
          <span className="bg-[#FFFDF6] text-on-surface font-mono text-[7px] font-black tracking-widest px-1.5 py-0.5 border border-on-surface/40 rotate-[1.5deg]">
            {formattedDate}
          </span>
        </div>
      </div>

      {/* Polaroid bottom metadata card area */}
      <div className="p-2 pt-4 space-y-3 flex-1 flex flex-col justify-between">
        <div className="space-y-3 text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AvatarPreview avatar={proof.userAvatar || DEFAULT_AVATAR} size="xs" className="w-5 h-5 rounded-full border-2 border-on-surface shadow-[1px_1px_0px_black]" />
              <span className="text-[9px] font-mono font-black uppercase tracking-widest text-on-surface">{proof.userName || 'Anonymous Agent'}</span>
            </div>
            <div className="bg-brand-magenta text-white text-[8px] font-black px-2 py-0.5 rounded border border-on-surface shadow-[1px_1.5px_0px_black]">
              {proof.pointsAwarded || (proof as any).awardedPoints || (proof as any).estimatedPoints || 50} XP
            </div>
          </div>

          <div className="space-y-1">
            <h4 className="text-lg font-display font-black uppercase italic leading-tight text-on-surface line-clamp-1">
              {proof.tripTitle || proof.challengeTitle || 'Retired Mission'}
            </h4>
            <div className="flex items-center gap-2">
              <span className="text-[7px] font-mono font-black uppercase text-on-surface/40 bg-on-surface/5 px-1.5 py-0.5 rounded-sm">
                ID: {proof.userId?.slice(0, 8)}
              </span>
              <span className="text-[7px] font-mono font-black uppercase text-brand-orange">
                {(proof as any).fieldType || 'EXPLORER'}
              </span>
              {proof.findingType && (
                <span className="text-[7px] font-mono font-black uppercase text-white bg-brand-magenta px-1.5 py-0.5 rounded-sm border border-on-surface shadow-[1px_1px_0px_black]">
                  {proof.findingType}
                </span>
              )}
            </div>
          </div>

          <p className="text-xs text-on-surface/70 line-clamp-2 font-serif italic relative pl-3 border-l-2 border-brand-orange/30 min-h-[2.5rem]">
            "{proof.fieldNote || 'No field note provided.'}"
          </p>
        </div>

        {/* Action / footer details with barcode element */}
        <div className="flex items-center justify-between pt-3 border-t border-on-surface/10">
          <div className="flex items-center gap-1.5">
            <span className="text-[7.5px] font-mono font-black uppercase text-on-surface/40 bg-on-surface/5 px-2 py-0.5 rounded-sm">
              SECTOR_7B
            </span>
            {normalizeEntryStatus(proof.status) === 'approved' && (
              <span className="text-[7.5px] font-mono font-black uppercase text-brand-lime bg-brand-lime/10 px-2 py-0.5 rounded-sm">
                VERIFIED
              </span>
            )}
          </div>
          <span className="text-[8.5px] font-mono font-black uppercase text-brand-orange">
            {proof.stickerRewardId ? `Sticker Secured` : `Field Record`}
          </span>
        </div>
      </div>

      {/* Decorative ink fingerprint */}
      <div className="absolute bottom-1 right-2 w-7 h-7 opacity-[0.04] pointer-events-none select-none">
        <Fingerprint className="w-full h-full rotate-45 text-on-surface" />
      </div>
    </FieldCard>
  );
}
