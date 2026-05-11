import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ProofReview, ProofStatus } from '../types/proof';
import { Entry } from '../constants';
import { adminOverrideReview } from '../services/proofService';
import { Card, Sticker } from '../components/UI';
import { Shield, Check, X, RefreshCw, AlertCircle, Info } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';

export default function AdminProofReview() {
  const [reviews, setReviews] = useState<(ProofReview & { entry?: Entry })[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useApp();
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
      
      // In a real app, we'd fetch entries in batch or use a join-like listener
      // For now, we'll just show the reviews. 
      // If entries are already in context, we could look them up.
      
      setReviews(reviewData as any);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAdmin]);

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
          <h1 className="font-display text-2xl uppercase tracking-tighter italic">Proof_Recon</h1>
          <p className="micro-label opacity-40">Operational Field Audit System</p>
        </div>
        <Shield className="w-8 h-8 text-brand-orange" />
      </header>

      {loading ? (
        <div className="flex justify-center p-12">
          <RefreshCw className="w-8 h-8 animate-spin opacity-20" />
        </div>
      ) : reviews.length === 0 ? (
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
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ProofReviewCardProps {
  review: ProofReview;
  onApprove: () => Promise<void> | void;
  onReject: () => Promise<void> | void;
  onResubmit: () => Promise<void> | void;
  key?: string | number;
}

function ProofReviewCard({ review, onApprove, onReject, onResubmit }: ProofReviewCardProps) {
  const [showAnalysis, setShowAnalysis] = useState(false);

  return (
    <Card className="overflow-hidden border-2 border-on-surface/10 bg-paper">
      <div className="flex flex-col md:flex-row h-full">
        {/* Audit Details */}
        <div className="md:w-full p-6 flex flex-col justify-between">
          <div className="space-y-6">
            <header className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="micro-label opacity-40 uppercase mb-1">Target Mission: {review.challengeId}</p>
                <h3 className="font-display text-xl uppercase tracking-tighter leading-none italic">
                  Entry ID: {review.entryId}
                </h3>
              </div>
              <div className="flex flex-col gap-2 items-end">
                <Sticker color={review.status === 'approved' ? "green" : review.status === 'rejected' ? "black" : "orange"} className="text-[8px]">
                  {review.status.toUpperCase()}
                </Sticker>
                <Sticker color={review.confidenceScore > 80 ? "blue" : "white"} className="text-[8px]">
                  CONFIDENCE: {review.confidenceScore}%
                </Sticker>
              </div>
            </header>

            <div className="p-4 bg-on-surface/5 border border-on-surface/10 space-y-3">
              <div className="flex items-center justify-between">
                <p className="micro-label opacity-40 uppercase">Review Notes</p>
                <button 
                  onClick={() => setShowAnalysis(!showAnalysis)}
                  className="p-1 hover:bg-on-surface/10 rounded transition-colors"
                >
                  <Info className="w-3 h-3" />
                </button>
              </div>
              
              <p className="text-sm font-serif italic leading-relaxed">
                {review.reviewNotes}
              </p>

              {review.missingRequirements.length > 0 && (
                <div className="pt-3 border-t border-dashed border-on-surface/20 space-y-2">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-error uppercase">Missing Evidence</p>
                    <div className="flex flex-wrap gap-1">
                      {review.missingRequirements.map(req => (
                        <span key={req} className="text-[10px] px-1 bg-red-500/10 text-red-700">-{req}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {review.confidenceScore < 50 && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-red-700 mb-1 uppercase">Low Confidence Warning</p>
                  <p className="text-[9px] font-mono text-red-600">Manual verification recommended for this entry.</p>
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
              <Check className="w-4 h-4" /> VALIDATE
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}
