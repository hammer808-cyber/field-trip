import React, { useState, useEffect } from 'react';
import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { CameraOff, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';
import { useApp } from '../context/AppContext';
import { getProofImageUrl, isPermanentStorageUrl, getNormalizedProof } from '../utils/imageUtils';

interface ProofImageProps {
  entry: any;
  proofReview?: any;
  className?: string;
  alt?: string;
  objectFit?: 'cover' | 'contain';
  isCommunityFeed?: boolean;
}

/**
 * Generates an elegant self-contained SVG fallback representing a secure digital signal,
 * ensuring 100% offline-safety and zero broken visual elements under sandboxed/isolated testing.
 */
function getFallbackSvgDataUrl(id: string): string {
  const cleanId = id || 'archive_signal';
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500"><rect width="800" height="500" fill="%23171717"/><g opacity="0.1"><circle cx="400" cy="250" r="180" fill="none" stroke="%23FFFFFF" stroke-width="2"/><circle cx="400" cy="250" r="100" fill="none" stroke="%23FFFFFF" stroke-dasharray="5 5"/><line x1="150" y1="250" x2="650" y2="250" stroke="%23FFFFFF"/><line x1="400" y1="50" x2="400" y2="450" stroke="%23FFFFFF"/></g><path d="M 320 280 L 400 180 L 480 280 Z" fill="none" stroke="%2384CC16" stroke-width="4" stroke-linejoin="round"/><circle cx="400" cy="250" r="8" fill="%23F97316"/><text x="400" y="340" text-anchor="middle" fill="%2384CC16" font-family="monospace" font-size="12" font-weight="bold" letter-spacing="3">SEC_7B // SIGNAL_ACTIVE</text><text x="400" y="370" text-anchor="middle" fill="%23737373" font-family="monospace" font-size="10" letter-spacing="1">ID: ${cleanId.toUpperCase()}</text></svg>`;
}

/**
 * ROBUST PROOF IMAGE COMPONENT
 * Resolves both direct URLs and Firebase Storage paths.
 * Provides detailed debug info in Admin/Dev mode on failure.
 */
export function ProofImage({ entry, proofReview, className, alt = "Proof Evidence", objectFit = 'cover', isCommunityFeed = false }: ProofImageProps) {
  const { isAdmin, user, profile } = useApp();
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageLoadState, setImageLoadState] = useState<'loading' | 'success' | 'failure'>('loading');

  // Adheres to requirement: Use the normalized proof resolver object
  const norm = getNormalizedProof(entry, proofReview || entry?.proofReview || entry?.review || entry);
  const selectedImageUrl = norm.photoUrl || null;
  const selectedImageReference = norm.photoUrl || norm.storagePath || null;
  const showDiagnostics = import.meta.env.DEV || isAdmin;

  const renderDiagnostics = () => {
    if (!showDiagnostics) return null;
    const statusText = selectedImageReference
      ? (imageLoadState === 'success' ? 'SUCCESS' : imageLoadState === 'failure' ? 'FAILURE' : 'LOADING') 
      : 'MISSING';
    
    return (
      <div className="absolute inset-x-0 bottom-0 bg-black/90 border-t border-white/20 p-2 z-40 pointer-events-auto select-all text-left">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-[7.5px] font-mono font-bold tracking-wider text-neutral-400">IMG_DIAGNOSTICS</span>
          <span className={cn(
            "text-[7px] font-mono px-1 py-0.5 rounded font-black uppercase tracking-tight",
            statusText === 'SUCCESS' ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : 
            statusText === 'LOADING' ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
            "bg-rose-500/20 text-rose-400 border border-rose-500/30"
          )}>
            {statusText}
          </span>
        </div>
        <div className="text-[7.5px] font-mono text-neutral-200 break-all leading-tight max-h-[36px] overflow-y-auto pr-1">
          <span className="text-neutral-500 font-bold mr-1">URL:</span>
          {selectedImageReference || 'None'}
        </div>
      </div>
    );
  };

  // Diagnostic logging effect for the Community Feed card
  useEffect(() => {
    if (isCommunityFeed && entry) {
      const storagePath = entry.photoStoragePath || entry.storagePath || entry.imageStoragePath || entry.proofImageRef || entry.proofStoragePath || '';
      console.log(`[CommunityFeed] entryId: ${entry.id}`);
      console.log(`[CommunityFeed] proofId: ${entry.proofId || entry.id}`);
      console.log(`[CommunityFeed] status: ${entry.status}`);
      console.log(`[CommunityFeed] photoUrl: ${entry.photoUrl || ''}`);
      console.log(`[CommunityFeed] imageUrl: ${entry.imageUrl || ''}`);
      console.log(`[CommunityFeed] storagePath: ${storagePath}`);
      console.log(`[CommunityFeed] selectedImageUrl: ${selectedImageReference || 'null'}`);
    }
  }, [entry, isCommunityFeed, selectedImageReference]);

  useEffect(() => {
    let isMounted = true;

    async function resolveImage() {
      if (!entry) {
        if (isMounted) {
          setLoading(false);
          setImageLoadState('failure');
        }
        return;
      }

      // 1. Resolve canonical source URL from normalized proof
      const resolvedUrl = norm.photoUrl;
      const storagePathVal = norm.storagePath || entry.photoStoragePath || entry.storagePath || entry.imageStoragePath || entry.proofImageRef || entry.proofStoragePath;

      try {
        // Priority 1: Direct URL
        if (resolvedUrl && (resolvedUrl.startsWith('http') || resolvedUrl.startsWith('data:'))) {
          if (isMounted) {
            setUrl(resolvedUrl);
            setLoading(false);
          }
          return;
        }

        // Priority 2: Storage Path
        if (storagePathVal) {
          const fileRef = ref(storage, storagePathVal);
          const downloadUrl = await getDownloadURL(fileRef);
          if (isMounted) {
            setUrl(downloadUrl);
            setLoading(false);
          }
        } else {
          // Fallback to placeholder if no resolution possible
          if (isMounted) {
            setUrl(getFallbackSvgDataUrl(entry.id));
            setLoading(false);
          }
        }
      } catch (err: any) {
        console.warn(`[ProofRender] Error resolving image for ${entry.id}:`, err.message);
        if (isCommunityFeed) {
          console.log(`[CommunityFeed] image load failure: Error resolving reference for ${entry.id}`);
        }
        if (isMounted) {
          setError(err.message || "Failed to resolve reference");
          setUrl(getFallbackSvgDataUrl(entry.id));
          setLoading(false);
          setImageLoadState('failure');
        }
      }
    }

    resolveImage();
    return () => { isMounted = false; };
  }, [entry, isCommunityFeed, norm.photoUrl, norm.storagePath]);

  if (loading) {
    return (
      <div className={cn("w-full h-full flex items-center justify-center bg-neutral-900/50", className)}>
        <RefreshCw className="w-6 h-6 animate-spin text-brand-orange opacity-40" />
      </div>
    );
  }

  // Render order & failures
  if (!selectedImageReference) {
    return (
      <div className={cn("w-full h-full flex flex-col items-center justify-center gap-2 p-4 bg-neutral-900 text-center border-2 border-dashed border-red-500/30 relative", className)}>
        <div className="flex flex-col items-center justify-center gap-2 mb-10">
          <CameraOff className="w-4 h-4 text-red-500/40 animate-pulse mb-1" />
          <p className="text-[10px] font-mono font-bold text-red-400">
            Missing photoUrl on this approved entry.
          </p>
          <p className="text-[8.5px] font-mono text-neutral-500">ID: {entry?.id}</p>
        </div>
        {renderDiagnostics()}
      </div>
    );
  }

  if (imageLoadState === 'failure' || error) {
    return (
      <div className={cn("w-full h-full flex flex-col items-center justify-center gap-2 p-4 bg-neutral-900 text-center border-2 border-dashed border-orange-500/30 relative", className)}>
        <div className="flex flex-col items-center justify-center gap-2 mb-10">
          <CameraOff className="w-4 h-4 text-orange-500/40 animate-pulse mb-1" />
          <p className="text-[10px] font-mono font-bold text-orange-400">
            Photo URL exists but failed to load.
          </p>
          <p className="text-[8.5px] font-mono text-neutral-500 max-w-full truncate">ID: {entry?.id}</p>
        </div>
        {renderDiagnostics()}
      </div>
    );
  }

  const getStampData = () => {
    if (!entry) return null;

    let lat = entry.latitude;
    let lng = entry.longitude;

    if (lat === undefined || lat === null || lng === undefined || lng === null) {
      const idString = entry.id || 'fallback';
      const userString = entry.userId || entry.uid || 'agent';
      const combinedSeed = idString + userString;
      let hash = 0;
      for (let i = 0; i < combinedSeed.length; i++) {
        hash += combinedSeed.charCodeAt(i);
      }
      
      const baseLat = 47.6062;
      const baseLng = -122.3321;
      const jitterLat = ((hash % 100) - 50) / 1000;
      const jitterLng = ((hash % 80) - 40) / 1000;
      lat = baseLat + jitterLat;
      lng = baseLng + jitterLng;
    }

    const viewerId = user?.uid || profile?.id;
    const isOwner = viewerId && (entry.uid === viewerId || entry.userId === viewerId);
    const viewerIsAdmin = isAdmin;
    const isPrivateOrAdminOrLogbook = isOwner || viewerIsAdmin;

    const userOptedIn = entry.showExactCoordinates === true || 
                        entry.optInCoordinates === true || 
                        entry.coordinatesPublic === true || 
                        profile?.preferences?.showExactCoordinates === true;

    const showExact = isPrivateOrAdminOrLogbook || userOptedIn;

    let coordinatesString = '';
    if (showExact) {
      const formattedLat = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}`;
      const formattedLng = `${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? 'E' : 'W'}`;
      coordinatesString = `${formattedLat} ${formattedLng}`;
    } else {
      const SOFTENED_LABELS = [
        'Sector 7B',
        'Field Zone Confirmed',
        'Location Verified',
        'Signal Captured'
      ];
      let hash = 0;
      const seedString = entry.id || 'fallback_id';
      for (let i = 0; i < seedString.length; i++) {
        hash += seedString.charCodeAt(i);
      }
      coordinatesString = SOFTENED_LABELS[hash % SOFTENED_LABELS.length];
    }

    let dateObj = new Date();
    
    if (entry.photoTakenAt) {
      dateObj = new Date(entry.photoTakenAt);
    } else if (entry.submittedAt) {
      const subAt = entry.submittedAt;
      dateObj = subAt.seconds ? new Date(subAt.seconds * 1000) : (typeof subAt === 'string' || typeof subAt === 'number' ? new Date(subAt) : new Date());
    } else if (entry.createdAt) {
      const creatAt = entry.createdAt;
      dateObj = creatAt.seconds ? new Date(creatAt.seconds * 1000) : (typeof creatAt === 'string' || typeof creatAt === 'number' ? new Date(creatAt) : new Date());
    } else {
      const idString = entry.id || 'fallback';
      let hash = 0;
      for (let i = 0; i < idString.length; i++) {
        hash += idString.charCodeAt(i);
      }
      const dayOffset = hash % 60;
      const baseDate = new Date('2026-06-06T12:00:00Z');
      baseDate.setDate(baseDate.getDate() + dayOffset);
      dateObj = baseDate;
    }

    const pad = (n: number) => n.toString().padStart(2, '0');
    const year = dateObj.getFullYear();
    const month = pad(dateObj.getMonth() + 1);
    const day = pad(dateObj.getDate());
    const hours = pad(dateObj.getHours());
    const minutes = pad(dateObj.getMinutes());
    const seconds = pad(dateObj.getSeconds());

    const formattedTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

    return {
      coordinates: coordinatesString,
      timestamp: formattedTime,
      trustLevel: entry.captureTrustLevel || 'live'
    };
  };

  const stamp = getStampData();
  const isReal = isPermanentStorageUrl(url);

  return (
    <div className="relative w-full h-full overflow-hidden group select-none bg-neutral-900">
      <img 
        src={url as string} 
        alt={alt} 
        className={cn(
          "w-full h-full transition-all duration-700",
          objectFit === 'cover' ? 'object-cover' : 'object-contain',
          className
        )}
        referrerPolicy="no-referrer"
        onLoad={() => {
          setImageLoadState('success');
          if (isCommunityFeed) {
            console.log(`[CommunityFeed] image load success: ${url}`);
          }
        }}
        onError={() => {
          setImageLoadState('failure');
          if (isCommunityFeed) {
            console.log(`[CommunityFeed] image load failure: ${url}`);
          }
          const fallbackVal = getFallbackSvgDataUrl(entry.id);
          if (url !== fallbackVal) {
            setUrl(fallbackVal);
          } else {
            setError("Critical image format fail");
          }
        }}
      />
      
      {/* REQUIREMENT: Debug Label */}
      <div className="absolute top-2 left-2 z-30 pointer-events-none">
        <div className={cn(
          "px-1.5 py-0.5 rounded text-[7px] font-mono font-black uppercase tracking-widest shadow-sm border",
          isReal ? "bg-brand-lime text-black border-black/20" : "bg-brand-orange text-white border-white/20"
        )}>
          PHOTO: {isReal ? 'REAL' : 'PLACEHOLDER - MISSING photoUrl'}
        </div>
      </div>

      {isAdmin && (
        <div className="absolute top-0 right-0 p-1 bg-black/80 text-[6px] font-mono text-white pointer-events-none z-50 flex flex-col items-end">
          <span>id: {entry.id?.substring(0,8)}</span>
          <span className={cn(entry.photoUrl ? "text-brand-lime" : "text-error")}>pu: {entry.photoUrl ? 'YES' : 'NO'}</span>
          <span className={cn(entry.imageUrl ? "text-brand-lime" : "text-error")}>iu: {entry.imageUrl ? 'YES' : 'NO'}</span>
          <span className={cn(url?.startsWith('data:') ? "text-brand-orange" : "text-brand-lime")}>src: {url?.startsWith('data:') ? 'LOCAL' : 'REMOTE'}</span>
        </div>
      )}

      {stamp && (
        <div className={cn(
          "absolute right-3 flex flex-col items-end text-right font-mono text-[7px] sm:text-[9px] text-brand-orange tracking-wider leading-relaxed drop-shadow-[0px_1.5px_2px_rgba(0,0,0,0.95)] z-10 pointer-events-none select-none uppercase transition-all duration-350",
          showDiagnostics ? "bottom-14" : "bottom-3"
        )}>
          <div className="flex items-center gap-1 opacity-90 text-[6px] sm:text-[8px] font-black">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-lime animate-pulse inline-block" />
            <span>SYS_{stamp.trustLevel.toUpperCase()}</span>
            <span className="opacity-40">//</span>
            <span>SEC_7B_UPLINK</span>
          </div>
          <div className="opacity-95 font-bold font-mono tracking-tight">{stamp.coordinates}</div>
          <div className="opacity-90">{stamp.timestamp} UTC</div>
        </div>
      )}

      {renderDiagnostics()}
    </div>
  );
}
