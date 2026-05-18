import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, limit, where, getDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ProofReview, ProofStatus } from '../types/proof';
import { Entry } from '../constants';
import { adminOverrideReview, evaluateProof } from '../services/proofService';
import { Card, Sticker } from '../components/UI';
import { Shield, Check, X, RefreshCw, AlertCircle, Info, Database, CameraOff } from 'lucide-react';
import { cn, formatSafeDateOnly } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';

export default function AdminProofReview() {
  const [reviews, setReviews] = useState<(ProofReview & { entry?: Entry })[]>([]);
  const [loading, setLoading] = useState(true);
  const [rerunningId, setRerunningId] = useState<string | null>(null);
  const [storageStats, setStorageStats] = useState({
    waitingPurge: 0,
    purged: 0,
    oldestUnpurged: null as string | null
  });
  const { profile, trips } = useApp();
  const { isAdmin } = useTheme();

  useEffect(() => {
    if (!isAdmin) return;

    const q = query(
      collection(db, 'proofReviews'),
      orderBy('reviewedAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const reviewData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ProofReview));
      
      // Fetch corresponding entries to show images and notes
      const entryIds = [...new Set(reviewData.map(r => r.entryId))];
      const entryMap: Record<string, Entry> = {};
      
      try {
        await Promise.all(entryIds.map(async (eid) => {
          if (!eid) return;
          const snap = await getDoc(doc(db, 'entries', eid));
          if (snap.exists()) {
            entryMap[eid] = { id: snap.id, ...snap.data() } as Entry;
          }
        }));
      } catch (err) {
        console.error("Failed to batch fetch entries for review:", err);
      }

      setReviews(reviewData.map(r => ({
        ...r,
        entry: entryMap[r.entryId]
      })));
      setLoading(false);
    });

    // Stats Query - Filtered for efficiency
    const statsUnsubscribe = onSnapshot(query(collection(db, 'entries'), where('status', '==', 'rejected')), (snapshot) => {
      const rejected = snapshot.docs.map(d => d.data() as Entry);
      const waiting = rejected.filter(e => !e.imagePurged);
      const purged = rejected.filter(e => e.imagePurged);
      
      const oldest = waiting?.length > 0 
        ? [...waiting].sort((a, b) => (a.rejectedAt?.seconds || 0) - (b.rejectedAt?.seconds || 0))[0]?.rejectedAt 
        : null;

      setStorageStats({
        waitingPurge: waiting?.length || 0,
        purged: purged?.length || 0,
        oldestUnpurged: formatSafeDateOnly(oldest, 'N/A')
      });
    });

    return () => {
      unsubscribe();
      statsUnsubscribe();
    };
  }, [isAdmin]);

  const fetchImageAsBase64 = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error("Failed to fetch image for AI rerun:", error);
      throw new Error("IMAGE_FETCH_FAILED");
    }
  };

  const handleRerunAI = async (review: ProofReview) => {
    if (rerunningId) return;
    setRerunningId(review.id);

    try {
      // Direct getDoc for efficiency
      const { getDoc, doc } = await import('firebase/firestore');
      const entrySnap = await getDoc(doc(db, 'entries', review.entryId));
      if (!entrySnap.exists()) throw new Error("ENTRY_NOT_FOUND");
      const entry = { id: entrySnap.id, ...entrySnap.data() } as Entry;

      if (!entry.proofImage) throw new Error("NO_IMAGE_IN_ENTRY");

      // Log for admin
      console.log(`[Admin] Initiating AI rerun for entry: ${review.entryId}`);
      
      // Look for challenge definition to get theAsk and title
      const challenge = trips.find(t => t.id === review.challengeId);
      if (!challenge) throw new Error("CHALLENGE_NOT_FOUND");

      // Fetch the actual image from storage URL
      const base64Image = await fetchImageAsBase64(entry.proofImage);

      // Call evaluateProof with bypassCache to force a fresh AI analysis
      await evaluateProof(
        review.userId, 
        review.challengeId, 
        challenge.title, 
        challenge.theAsk, 
        { 
          fieldNote: entry.fieldNote || (entry as any).note || '', 
          id: entry.id,
          selectedLevel: entry.selectedLevel as any
        }, 
        base64Image, 
        { bypassCache: true }
      );

      alert(`BUREAU_UPLINK: Fresh AI analysis complete for entry ${review.entryId}.`);
    } catch (error: any) {
      console.error("AI Rerun error:", error);
      alert(`BUREAU_ERROR: Failed to rerun analysis. ${error.message}`);
    } finally {
      setRerunningId(null);
    }
  };

  const handleAction = async (review: ProofReview, verdict: ProofStatus) => {
    try {
      await adminOverrideReview(
        review.id,
        review.entryId,
        verdict,
        `Manual override by admin at ${new Date().toISOString()}`
      );
    } catch (error) {
      console.error("Action error:", error);
    }
  };

  if (!isAdmin) {
    return <div className="p-8 text-center text-error font-mono">UNAUTHORIZED_ACCESS. ESCALATING...</div>;
  }

  return (
    <div className="min-h-screen bg-surface p-6 pb-24">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl uppercase tracking-tighter italic">Control_Booth</h1>
          <p className="micro-label opacity-40">Field Check & Entry Audit System</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden md:flex gap-6 border-r border-on-surface/10 pr-6">
            <div className="text-right">
              <p className="micro-label opacity-40 uppercase">Awaiting Purge</p>
              <p className="font-mono text-sm font-bold text-error">{storageStats.waitingPurge}</p>
            </div>
            <div className="text-right">
              <p className="micro-label opacity-40 uppercase">Storage Cleaned</p>
              <p className="font-mono text-sm font-bold text-brand-green">{storageStats.purged}</p>
            </div>
            <div className="text-right">
              <p className="micro-label opacity-40 uppercase">Oldest Unpurged</p>
              <p className="font-mono text-[10px] text-on-surface/60">{storageStats.oldestUnpurged || 'N/A'}</p>
            </div>
          </div>
          <Shield className="w-8 h-8 text-brand-orange" />
        </div>
      </header>

      {/* Storage Warning for Admin */}
      <div className="mb-8 p-3 bg-brand-orange/5 border border-brand-orange/20 rounded flex items-center gap-3">
        <Database className="w-4 h-4 text-brand-orange" />
        <p className="text-[10px] font-mono text-on-surface/80">
          <span className="font-bold text-brand-orange uppercase">Storage Policy:</span> Rejected entries are kept for 14 days, then the image proof is removed to protect beta storage limits.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <RefreshCw className="w-8 h-8 animate-spin opacity-20" />
        </div>
      ) : (reviews?.length || 0) === 0 ? (
        <Card className="p-12 text-center opacity-40 border-dashed">
          <p className="font-mono text-sm uppercase">No pending evidence for audit.</p>
        </Card>
      ) : (
        <div className="space-y-8">
          {reviews.map(r => (
            <ProofReviewCard 
              key={r.id} 
              review={r} 
              onApprove={() => handleAction(r, 'approved')}
              onReject={() => handleAction(r, 'rejected')}
              onResubmit={() => handleAction(r, 'needsMoreProof')}
              onRerunAI={() => handleRerunAI(r)}
              isRerunning={rerunningId === r.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ProofReviewCardProps {
  review: ProofReview & { entry?: Entry };
  onApprove: () => Promise<void> | void;
  onReject: () => Promise<void> | void;
  onResubmit: () => Promise<void> | void;
  onRerunAI: () => Promise<void> | void;
  isRerunning?: boolean;
  key?: string | number;
}

function ProofReviewCard({ review, onApprove, onReject, onResubmit, onRerunAI, isRerunning }: ProofReviewCardProps) {
  const [showAnalysis, setShowAnalysis] = useState(false);
  const isCached = review.id.startsWith('cached_');

  return (
    <Card className="overflow-hidden border-2 border-on-surface/10 bg-paper">
      <div className="flex flex-col md:flex-row h-full">
        {/* Visual Proof */}
        <div className="md:w-1/3 h-64 md:h-auto bg-black relative border-b md:border-b-0 md:border-r border-on-surface/10">
          {review.entry?.proofImage ? (
            <img 
              src={review.entry.proofImage} 
              alt="Proof" 
              className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 opacity-20 bg-on-surface/5">
              <CameraOff className="w-8 h-8" />
              <p className="micro-label font-mono">IMAGE_MISSING_OR_PURGED</p>
            </div>
          )}
          
          <div className="absolute top-2 left-2 flex gap-1">
            <Sticker color="black" className="text-[7px]">
              {review.entry?.uploadSource?.toUpperCase() || 'UNKNOWN'}
            </Sticker>
            {review.entry?.metadataStatus === 'verified' && (
              <Sticker color="blue" className="text-[7px]">GPS_VERIFIED</Sticker>
            )}
          </div>
        </div>

        {/* Audit Details */}
        <div className="md:w-2/3 p-6 flex flex-col justify-between">
          <div className="space-y-6">
            <header className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="micro-label opacity-40 uppercase mb-1">Target Mission: {review.entry?.tripTitle || review.challengeId}</p>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-xl uppercase tracking-tighter leading-none italic">
                    Reporter: {review.entry?.userName || 'ID:' + review.userId}
                  </h3>
                  {isCached && (
                    <Sticker color="blue" className="text-[7px]">CACHED_RESULT</Sticker>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2 items-end">
                <Sticker color={review.status === 'approved' ? "green" : review.status === 'rejected' ? "black" : "orange"} className="text-[8px]">
                  {review.status.toUpperCase()}
                </Sticker>
                <Sticker color={(review.confidenceScore || 0) > 80 ? "blue" : "white"} className="text-[8px]">
                  CONFIDENCE: {review.confidenceScore || 0}%
                </Sticker>
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="p-3 bg-on-surface/5 border border-on-surface/10 rounded">
                  <p className="micro-label opacity-40 uppercase mb-2">Field Journal Entry</p>
                  <p className="text-sm font-serif italic leading-relaxed text-on-surface/80">
                    "{review.entry?.fieldNote || 'No notes provided.'}"
                  </p>
                </div>
              </div>

              <div className="p-4 bg-on-surface/5 border border-on-surface/10 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="micro-label opacity-40 uppercase">Bureau Analysis</p>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={onRerunAI}
                      disabled={isRerunning}
                      className="p-1 hover:bg-on-surface/10 rounded transition-colors text-brand-orange disabled:opacity-20"
                      title="Rerun AI Analysis (Bypass Cache)"
                    >
                      <RefreshCw className={cn("w-3 h-3", isRerunning && "animate-spin")} />
                    </button>
                    <button 
                      onClick={() => setShowAnalysis(!showAnalysis)}
                      className="p-1 hover:bg-on-surface/10 rounded transition-colors"
                    >
                      <Info className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                
                <p className="text-xs font-mono leading-relaxed opacity-80">
                  {review.reviewNotes}
                </p>

                {(review?.missingRequirements?.length || 0) > 0 && (
                  <div className="pt-3 border-t border-dashed border-on-surface/20 space-y-2">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-error uppercase font-mono">Failed Protocols</p>
                      <div className="flex flex-wrap gap-1">
                        {review.missingRequirements?.map(req => (
                          <span key={req} className="text-[10px] px-1 bg-error/10 text-error font-mono">-{req}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {(review.confidenceScore || 0) < 50 && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-red-700 mb-1 uppercase">Low Confidence Warning</p>
                  <p className="text-[9px] font-mono text-red-600">The AI is unsure. Manual override mandatory.</p>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 mt-8">
            <button 
              onClick={onResubmit}
              className="flex items-center justify-center gap-2 p-3 bg-on-surface/5 hover:bg-brand-orange hover:text-white transition-all text-[10px] font-mono uppercase tracking-widest border border-on-surface/10"
            >
              <RefreshCw className="w-4 h-4" /> REQUEST_MORE
            </button>
            <button 
              onClick={onReject}
              className="flex items-center justify-center gap-2 p-3 bg-on-surface/5 hover:bg-error hover:text-white transition-all text-[10px] font-mono uppercase tracking-widest border border-on-surface/10"
            >
              <X className="w-4 h-4" /> DENY
            </button>
            <button 
              onClick={onApprove}
              className="flex items-center justify-center gap-2 p-3 bg-brand-orange text-white hover:scale-105 active:scale-95 transition-all text-[10px] font-mono uppercase tracking-widest shadow-[4px_4px_0px_black]"
            >
              <Check className="w-4 h-4" /> FIELD_CHECK_PASS
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}
