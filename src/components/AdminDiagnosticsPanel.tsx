import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot, getDocs, doc, setDoc, updateDoc, deleteDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Card } from './UI';
import { Database, AlertTriangle, CheckCircle, Clock, ListFilter, RefreshCw, ChevronDown, ChevronUp, Check, Trash2, ArrowUpRight, Wrench } from 'lucide-react';
import { formatSafeDateOnly } from '../lib/utils';

export interface MismatchItem {
  proofReviewId?: string;
  proofReviewStatus?: string;
  entryId: string;
  matchingEntryFound: boolean;
  entryStatus?: string;
  reviewPhotoUrlExists: boolean;
  entryPhotoUrlExists: boolean;
  selectedImageUrl: string;
  recommendedAction: 'create_proof_review' | 'archive_orphan_review' | 'backfill_photos' | 'none';
  rawReview?: any;
  rawEntry?: any;
}

export function AdminDiagnosticsPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [repairingId, setRepairingId] = useState<string | null>(null);
  const [pendingReviewsCount, setPendingReviewsCount] = useState(0);
  const [pendingEntriesCount, setPendingEntriesCount] = useState(0);
  const [latestEntries, setLatestEntries] = useState<any[]>([]);
  const [latestReviews, setLatestReviews] = useState<any[]>([]);
  const [missingReviews, setMissingReviews] = useState<any[]>([]);
  const [mismatches, setMismatches] = useState<MismatchItem[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [triggerRefreshCount, setTriggerRefreshCount] = useState(0);

  const pendingStatuses = ['pending_review', 'pending', 'checking', 'awaiting_review', 'needs_review', 'manual_review_required'];

  // Helper function to show a custom toast notification in panel
  const showLocalToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // 1. Resolve / Lookup Order Helper
  const findLinkedEntryCandidate = (review: any, entriesList: any[]): any | null => {
    if (!review) return null;

    // Order 1: proofReview.entryId
    if (review.entryId) {
      const found = entriesList.find(e => e.id === review.entryId);
      if (found) return found;
    }

    // Order 2: proofReview.id matches entry id (with eventual 'rev_' prefix stripping)
    if (review.id) {
      const cleanReviewId = review.id.replace(/^rev_/, '');
      const found = entriesList.find(e => e.id === cleanReviewId || e.id === review.id);
      if (found) return found;
    }

    // Order 3: challengeId/missionId + userId + createdAt proximity fallback
    const rid = review.challengeId || review.missionId;
    const ruid = review.userId;
    if (rid && ruid) {
      const candidates = entriesList.filter(e => {
        const eid = e.tripId || e.missionId || e.challengeId;
        const euid = e.userId || e.uid;
        return eid === rid && euid === ruid;
      });

      if (candidates.length > 0) {
        if (candidates.length === 1) return candidates[0];

        // Proximity calculation
        const parseTime = (val: any) => {
          if (!val) return 0;
          if (val.seconds) return val.seconds * 1000;
          if (typeof val === 'string' || typeof val === 'number') return new Date(val).getTime();
          if (val instanceof Date) return val.getTime();
          return 0;
        };

        const reviewTime = parseTime(review.createdAt || review.submittedAt || review.uploadedAt);
        let closest = candidates[0];
        let minDiff = Math.abs(parseTime(closest.createdAt || closest.submittedAt) - reviewTime);

        for (const cand of candidates) {
          const cTime = parseTime(cand.createdAt || cand.submittedAt);
          const diff = Math.abs(cTime - reviewTime);
          if (diff < minDiff) {
            minDiff = diff;
            closest = cand;
          }
        }
        return closest;
      }
    }

    return null;
  };

  // Real-time listener for pending counts
  useEffect(() => {
    const qEntries = query(
      collection(db, 'entries'),
      where('status', 'in', pendingStatuses)
    );
    const unsubEntries = onSnapshot(qEntries, (snap) => {
      setPendingEntriesCount(snap.size);
    }, (err) => {
      console.error('[Diagnostics] entries count error:', err);
    });

    const qReviews = query(
      collection(db, 'proofReviews'),
      where('status', 'in', pendingStatuses)
    );
    const unsubReviews = onSnapshot(qReviews, (snap) => {
      setPendingReviewsCount(snap.size);
    }, (err) => {
      console.error('[Diagnostics] reviews count error:', err);
    });

    return () => {
      unsubEntries();
      unsubReviews();
    };
  }, []);

  // Fetch lists and analyze mismatches
  useEffect(() => {
    let active = true;
    setLoading(true);

    async function loadDiagnostics() {
      try {
        // Query latest 5 entries for standard diagnostics UI
        const qEnts = query(
          collection(db, 'entries'),
          orderBy('createdAt', 'desc'),
          limit(5)
        );
        const entriesSnap = await getDocs(qEnts);
        const entsList = entriesSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Query latest 5 proof reviews
        const qRevs = query(
          collection(db, 'proofReviews'),
          orderBy('createdAt', 'desc'),
          limit(5)
        );
        const reviewsSnap = await getDocs(qRevs);
        const revsList = reviewsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Scan entries missing proofReviews (fetch last 20 entries)
        const qScan = query(
          collection(db, 'entries'),
          orderBy('createdAt', 'desc'),
          limit(20)
        );
        const scanEntriesSnap = await getDocs(qScan);
        const scannedEntriesList = scanEntriesSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // For each, check if there is a corresponding review
        const missing = [];
        for (const entry of scannedEntriesList) {
          const foundInLatest = revsList.some((r: any) => r.entryId === entry.id || r.reviewId === entry.id);
          if (!foundInLatest) {
            const qReviewCheck = query(
              collection(db, 'proofReviews'),
              where('entryId', '==', entry.id)
            );
            const reviewCheckSnap = await getDocs(qReviewCheck);
            if (reviewCheckSnap.empty) {
              missing.push(entry);
            }
          }
        }

        // --- COMPREHENSIVE MISMATCH COMPILATION ENGINE ---
        // Fetch last 50 entries and last 50 proofReviews to detect sync issues
        const qAllEntries = query(collection(db, 'entries'), orderBy('createdAt', 'desc'), limit(50));
        const qAllReviews = query(collection(db, 'proofReviews'), orderBy('createdAt', 'desc'), limit(50));

        const [allEntriesSnap, allReviewsSnap] = await Promise.all([
          getDocs(qAllEntries),
          getDocs(qAllReviews)
        ]);

        const entriesMap = new Map<string, any>();
        allEntriesSnap.docs.forEach(d => entriesMap.set(d.id, { id: d.id, ...d.data() }));
        const fullReviewsList = allReviewsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

        const detectedMismatches: MismatchItem[] = [];

        // Condition A: Scrutinize reviews for orphans or photo URL mismatch
        for (const rev of fullReviewsList) {
          let linkedEntry = findLinkedEntryCandidate(rev, Array.from(entriesMap.values()));

          if (!linkedEntry && rev.entryId) {
            // Fallback: check if the targeted entry exists outside of the limit 50
            try {
              const directDoc = await getDoc(doc(db, 'entries', rev.entryId));
              if (directDoc.exists()) {
                linkedEntry = { id: directDoc.id, ...directDoc.data() };
                entriesMap.set(linkedEntry.id, linkedEntry);
              }
            } catch (err) {
              console.warn("[Diagnostics] Safe direct entry fetch skipped:", err);
            }
          }

          const hasEntry = !!linkedEntry;
          const reviewPhoto = rev.photoUrl || rev.imageUrl;
          const entryPhoto = linkedEntry?.photoUrl || linkedEntry?.imageUrl || linkedEntry?.proofImage;

          if (!hasEntry) {
            // Orphan review record exists without matching entry
            detectedMismatches.push({
              proofReviewId: rev.id,
              proofReviewStatus: rev.status,
              entryId: rev.entryId || '',
              matchingEntryFound: false,
              reviewPhotoUrlExists: !!reviewPhoto,
              entryPhotoUrlExists: false,
              selectedImageUrl: reviewPhoto || '',
              recommendedAction: 'archive_orphan_review',
              rawReview: rev
            });
          } else {
            // Check for photo missing on one sync side
            const isPhotoMismatch = (!reviewPhoto || !entryPhoto) && (!!reviewPhoto || !!entryPhoto);
            if (isPhotoMismatch) {
              detectedMismatches.push({
                proofReviewId: rev.id,
                proofReviewStatus: rev.status,
                entryId: linkedEntry.id,
                matchingEntryFound: true,
                entryStatus: linkedEntry.status,
                reviewPhotoUrlExists: !!reviewPhoto,
                entryPhotoUrlExists: !!entryPhoto,
                selectedImageUrl: reviewPhoto || entryPhoto || '',
                recommendedAction: 'backfill_photos',
                rawReview: rev,
                rawEntry: linkedEntry
              });
            }
          }
        }

        // Condition B: Scrutinize entries without related review records
        const loadedEntries = Array.from(entriesMap.values());
        for (const ent of loadedEntries) {
          const matchedReview = fullReviewsList.find(r => r.entryId === ent.id || r.id === ent.proofCheckId || r.id === `rev_${ent.id}`);
          if (matchedReview) continue;

          // Check DB to see if there is any other review linking back to this entry
          let dbReviewExists = false;
          try {
            const qCheck = query(collection(db, 'proofReviews'), where('entryId', '==', ent.id));
            const checkSnap = await getDocs(qCheck);
            dbReviewExists = !checkSnap.empty;
          } catch (err) {
            console.warn("[Diagnostics] safe reviews check code skipped:", err);
          }

          if (!dbReviewExists) {
            const entryPhoto = ent.photoUrl || ent.imageUrl || ent.proofImage;
            detectedMismatches.push({
              entryId: ent.id,
              matchingEntryFound: true,
              entryStatus: ent.status,
              reviewPhotoUrlExists: false,
              entryPhotoUrlExists: !!entryPhoto,
              selectedImageUrl: entryPhoto || '',
              recommendedAction: 'create_proof_review',
              rawEntry: ent
            });
          }
        }

        if (active) {
          setLatestEntries(entsList);
          setLatestReviews(revsList);
          setMissingReviews(missing);
          setMismatches(detectedMismatches);
          setLoading(false);
        }
      } catch (err) {
        console.error('[Diagnostics] loadLists error:', err);
        if (active) {
          setLoading(false);
        }
      }
    }

    loadDiagnostics();

    return () => {
      active = false;
    };
  }, [triggerRefreshCount]);

  const handleRefresh = () => {
    setTriggerRefreshCount(prev => prev + 1);
  };

  // --- REPAIR ACTIONS IMPLEMENTATIONS ---

  const executeRepair = async (item: MismatchItem) => {
    if (repairingId) return;
    setRepairingId(item.proofReviewId || item.entryId);

    try {
      if (item.recommendedAction === 'create_proof_review') {
        const entry = item.rawEntry;
        const reviewId = entry.proofCheckId || `rev_${entry.id}`;
        const finalUrl = entry.photoUrl || entry.imageUrl || entry.proofImage || '';

        await setDoc(doc(db, 'proofReviews', reviewId), {
          id: reviewId,
          entryId: entry.id,
          userId: entry.userId || entry.uid || '',
          missionId: entry.missionId || entry.tripId || entry.challengeId || '',
          challengeId: entry.challengeId || entry.missionId || entry.tripId || '',
          deckId: entry.deckId || 'starter-signals',
          status: entry.status || 'pending_review',
          fieldNote: entry.fieldNote || entry.note || '',
          imageUrl: finalUrl,
          photoUrl: finalUrl,
          storagePath: entry.storagePath || entry.photoStoragePath || '',
          submittedAt: entry.submittedAt || entry.createdAt || new Date().toISOString(),
          createdAt: entry.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          aiRecommendation: 'pending_review',
          aiAnalysisStatus: 'completed',
          needsManualReview: true,
          confidenceScore: 70,
          reviewNotes: 'Recreated during administrative diagnostic repair sweep.'
        });

        await updateDoc(doc(db, 'entries', entry.id), {
          proofCheckId: reviewId,
          updatedAt: serverTimestamp()
        });

        showLocalToast(`Recreated review document for entry ${entry.id.substring(0, 8)}`);
      } else if (item.recommendedAction === 'archive_orphan_review') {
        const review = item.rawReview;
        await deleteDoc(doc(db, 'proofReviews', review.id));
        showLocalToast(`Deleted orphaned proofReview document ${review.id.substring(0, 8)}`);
      } else if (item.recommendedAction === 'backfill_photos') {
        const entry = item.rawEntry;
        const review = item.rawReview;

        const finalPhotoUrl = entry.photoUrl || review.photoUrl || '';
        const finalImageUrl = entry.imageUrl || review.imageUrl || finalPhotoUrl;
        const finalStoragePath = entry.storagePath || review.storagePath || '';

        const entryUpdates: any = {};
        const reviewUpdates: any = {};

        if (!entry.photoUrl && finalPhotoUrl) entryUpdates.photoUrl = finalPhotoUrl;
        if (!entry.imageUrl && finalImageUrl) entryUpdates.imageUrl = finalImageUrl;
        if (!entry.storagePath && finalStoragePath) entryUpdates.storagePath = finalStoragePath;

        if (!review.photoUrl && finalPhotoUrl) reviewUpdates.photoUrl = finalPhotoUrl;
        if (!review.imageUrl && finalImageUrl) reviewUpdates.imageUrl = finalImageUrl;
        if (!review.storagePath && finalStoragePath) reviewUpdates.storagePath = finalStoragePath;

        if (Object.keys(entryUpdates).length > 0) {
          await updateDoc(doc(db, 'entries', entry.id), {
            ...entryUpdates,
            updatedAt: serverTimestamp()
          });
        }

        if (Object.keys(reviewUpdates).length > 0) {
          await updateDoc(doc(db, 'proofReviews', review.id), {
            ...reviewUpdates,
            updatedAt: serverTimestamp()
          });
        }

        showLocalToast(`Backfilled media values successfully for ${entry.id.substring(0, 8)}`);
      }
      handleRefresh();
    } catch (err: any) {
      console.error("[Diagnostics] Repair action failed:", err);
      showLocalToast(`Repair failed: ${err.message || err}`);
    } finally {
      setRepairingId(null);
    }
  };

  const handleRepairAll = async () => {
    if (mismatches.length === 0 || repairingId) return;
    setRepairingId('bulk_action');
    let repairedCount = 0;

    for (const item of mismatches) {
      try {
        if (item.recommendedAction === 'create_proof_review') {
          const entry = item.rawEntry;
          const reviewId = entry.proofCheckId || `rev_${entry.id}`;
          const finalUrl = entry.photoUrl || entry.imageUrl || entry.proofImage || '';

          await setDoc(doc(db, 'proofReviews', reviewId), {
            id: reviewId,
            entryId: entry.id,
            userId: entry.userId || entry.uid || '',
            missionId: entry.missionId || entry.tripId || entry.challengeId || '',
            challengeId: entry.challengeId || entry.missionId || entry.tripId || '',
            deckId: entry.deckId || 'starter-signals',
            status: entry.status || 'pending_review',
            fieldNote: entry.fieldNote || entry.note || '',
            imageUrl: finalUrl,
            photoUrl: finalUrl,
            storagePath: entry.storagePath || entry.photoStoragePath || '',
            submittedAt: entry.submittedAt || entry.createdAt || new Date().toISOString(),
            createdAt: entry.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            aiRecommendation: 'pending_review',
            aiAnalysisStatus: 'completed',
            needsManualReview: true,
            confidenceScore: 70,
            reviewNotes: 'Recreated during administrative diagnostic repair sweep.'
          });

          await updateDoc(doc(db, 'entries', entry.id), {
            proofCheckId: reviewId,
            updatedAt: serverTimestamp()
          });
          repairedCount++;
        } else if (item.recommendedAction === 'archive_orphan_review') {
          const review = item.rawReview;
          await deleteDoc(doc(db, 'proofReviews', review.id));
          repairedCount++;
        } else if (item.recommendedAction === 'backfill_photos') {
          const entry = item.rawEntry;
          const review = item.rawReview;

          const finalPhotoUrl = entry.photoUrl || review.photoUrl || '';
          const finalImageUrl = entry.imageUrl || review.imageUrl || finalPhotoUrl;
          const finalStoragePath = entry.storagePath || review.storagePath || '';

          const entryUpdates: any = {};
          const reviewUpdates: any = {};

          if (!entry.photoUrl && finalPhotoUrl) entryUpdates.photoUrl = finalPhotoUrl;
          if (!entry.imageUrl && finalImageUrl) entryUpdates.imageUrl = finalImageUrl;
          if (!entry.storagePath && finalStoragePath) entryUpdates.storagePath = finalStoragePath;

          if (!review.photoUrl && finalPhotoUrl) reviewUpdates.photoUrl = finalPhotoUrl;
          if (!review.imageUrl && finalImageUrl) reviewUpdates.imageUrl = finalImageUrl;
          if (!review.storagePath && finalStoragePath) reviewUpdates.storagePath = finalStoragePath;

          if (Object.keys(entryUpdates).length > 0) {
            await updateDoc(doc(db, 'entries', entry.id), {
              ...entryUpdates,
              updatedAt: serverTimestamp()
            });
          }

          if (Object.keys(reviewUpdates).length > 0) {
            await updateDoc(doc(db, 'proofReviews', review.id), {
              ...reviewUpdates,
              updatedAt: serverTimestamp()
            });
          }
          repairedCount++;
        }
      } catch (err) {
        console.error("Bulk repair item failed:", err);
      }
    }

    setRepairingId(null);
    showLocalToast(`Bulk repair complete. Repaired ${repairedCount} mismatch issues.`);
    handleRefresh();
  };

  return (
    <Card className="border-2 border-on-surface bg-[#FFFDF9] rounded-3xl overflow-hidden shadow-[4px_4px_0px_black] mb-6">
      {/* Header Bar */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between p-4 bg-on-surface text-white cursor-pointer select-none transition-colors hover:bg-on-surface/95"
      >
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-brand-orange animate-pulse" />
          <div>
            <h3 className="font-display text-sm tracking-wide uppercase italic font-black leading-none text-white">
              Beta Pipeline Diagnostics
            </h3>
            <p className="font-mono text-[9px] text-white/60 mt-1 uppercase">
              Real-time Firestore validation dashboard
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-2 py-0.5 bg-white/15 text-white text-[9px] font-mono rounded font-black uppercase">
            {pendingEntriesCount === pendingReviewsCount && mismatches.length === 0 ? 'SYNC MATCH' : 'MISMATCH WARNING'}
          </span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {isOpen && (
        <div className="p-4 space-y-6">
          {/* Toast Notification */}
          {toastMessage && (
            <div className="bg-brand-lime border-2 border-black text-black font-mono text-[10px] font-black p-2.5 rounded-xl flex items-center justify-between shadow-md">
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 uppercase stroke-[3.5]" />
                {toastMessage}
              </span>
            </div>
          )}

          {/* Real-time counters row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-on-surface/10 rounded-2xl p-3 bg-white shadow-sm flex flex-col justify-between">
              <div>
                <p className="font-mono text-[9px] text-on-surface/40 uppercase font-bold leading-none">Pending entries</p>
                <p className="font-display text-2xl font-black text-on-surface mt-1.5">{pendingEntriesCount}</p>
              </div>
              <div className="flex items-center gap-1.5 text-[9px] font-mono text-on-surface/60 mt-2 uppercase">
                <Clock className="w-3 h-3 text-brand-orange" />
                <span>active in database</span>
              </div>
            </div>

            <div className="border border-on-surface/10 rounded-2xl p-3 bg-white shadow-sm flex flex-col justify-between">
              <div>
                <p className="font-mono text-[9px] text-on-surface/40 uppercase font-bold leading-none">Pending proofReviews</p>
                <p className="font-display text-2xl font-black text-on-surface mt-1.5">{pendingReviewsCount}</p>
              </div>
              <div className="flex items-center gap-1.5 text-[9px] font-mono text-on-surface/60 mt-2 uppercase">
                <CheckCircle className="w-3 h-3 text-brand-lime" />
                <span>vetted / awaiting review</span>
              </div>
            </div>

            <div className="border border-on-surface/10 rounded-2xl p-3 bg-white shadow-sm flex flex-col justify-between">
              <div>
                <p className="font-mono text-[9px] text-on-surface/40 uppercase font-bold leading-none">Admin Query Filters</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {pendingStatuses.map((st) => (
                    <span key={st} className="px-1 py-0.5 bg-on-surface/5 text-on-surface border border-on-surface/10 text-[8px] font-mono rounded font-medium">
                      {st}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[9px] font-mono text-brand-orange font-bold mt-2 uppercase">
                <ListFilter className="w-3 h-3" />
                <span>OR query strategy</span>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex justify-between items-center bg-[#F5F1E9] p-3 border border-on-surface/15 rounded-2xl">
            <div className="flex items-center gap-1.5 font-mono text-[10px] text-on-surface/60 font-bold uppercase">
              <RefreshCw className={`w-3.5 h-3.5 text-on-surface/70 ${loading ? 'animate-spin' : ''}`} />
              <span>Diagnostic Sync Status: {loading ? 'Scanning DB...' : 'Ready'}</span>
            </div>
            <div className="flex items-center gap-2">
              {mismatches.length > 0 && (
                <button
                  onClick={handleRepairAll}
                  disabled={!!repairingId}
                  className="px-3 py-1 bg-brand-orange hover:bg-brand-orange/90 text-white font-mono font-black border border-black text-[10px] uppercase rounded-lg shadow-[1.5px_1.5px_0px_black] transition-all flex items-center gap-1"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  Repair All ({mismatches.length})
                </button>
              )}
              <button 
                onClick={handleRefresh}
                className="px-3 py-1 bg-on-surface text-white hover:bg-on-surface/90 border border-on-surface text-[10px] font-mono uppercase font-black rounded-lg transition-all shadow-[1px_1px_0px_black]"
              >
                Refresh Lists
              </button>
            </div>
          </div>

          {/* REQUIREMENT: Detailed Mismatch Interactive Analysis Table */}
          {mismatches.length > 0 && (
            <div className="border border-red-500/30 bg-red-500/5 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-brand-orange animate-bounce" />
                <div>
                  <h4 className="font-display text-xs uppercase font-black text-on-surface">
                    PIPELINE MISMATCHES DETECTED ({mismatches.length})
                  </h4>
                  <p className="font-mono text-[8px] text-on-surface/50 tracking-wider">
                    Orphan reviews, structural metadata gaps, or media references require manual corrections.
                  </p>
                </div>
              </div>

              {/* Mismatch warnings specified by the user */}
              <div className="space-y-1.5">
                {mismatches.some(m => !m.matchingEntryFound) && (
                  <div className="bg-orange-50 border-l-4 border-orange-500 p-2 text-[9px] font-mono text-orange-850">
                    <strong>Review record exists without matching entry.</strong> The system has orphaned feedback logs which won&apos;t load in standard feeds or logbooks.
                  </div>
                )}
                {mismatches.some(m => m.matchingEntryFound && m.recommendedAction === 'create_proof_review') && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-2 text-[9px] font-mono text-red-850">
                    <strong>Entry exists without review record.</strong> Custom logs are fully approved/vetted without complementary proofReview metadata documents.
                  </div>
                )}
              </div>

              <div className="overflow-x-auto border border-on-surface/10 rounded-xl bg-white max-h-80 select-all">
                <table className="w-full text-left font-mono text-[9px] border-collapse">
                  <thead>
                    <tr className="bg-on-surface/5 text-on-surface/70 uppercase text-[8px] border-b border-on-surface/10">
                      <th className="p-2 border-r border-on-surface/10">review id</th>
                      <th className="p-2 border-r border-on-surface/10">review status</th>
                      <th className="p-2 border-r border-on-surface/10">entry id / status</th>
                      <th className="p-2 border-r border-on-surface/10">match?</th>
                      <th className="p-2 border-r border-on-surface/10">review photo?</th>
                      <th className="p-2 border-r border-on-surface/10">entry photo?</th>
                      <th className="p-2 border-r border-on-surface/10">source url</th>
                      <th className="p-2 border-r border-on-surface/10">suggested repairs</th>
                      <th className="p-2">actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mismatches.map((item, index) => (
                      <tr key={index} className="border-b last:border-0 hover:bg-neutral-50/50">
                        <td className="p-2 border-r border-on-surface/10 text-[8px] font-bold text-neutral-500 whitespace-nowrap">
                          {item.proofReviewId ? item.proofReviewId.substring(0, 10) : 'none'}
                        </td>
                        <td className="p-2 border-r border-on-surface/10 font-bold whitespace-nowrap">
                          <span className="px-1 bg-neutral-100 text-[8.5px] rounded border uppercase">
                            {item.proofReviewStatus || 'none'}
                          </span>
                        </td>
                        <td className="p-2 border-r border-on-surface/10 whitespace-nowrap">
                          <div className="font-bold text-neutral-600">{item.entryId ? item.entryId.substring(0, 10) : 'none'}</div>
                          <div className="text-[7.5px] opacity-75 uppercase">STATUS: {item.entryStatus || 'none'}</div>
                        </td>
                        <td className="p-2 border-r border-on-surface/10 font-black">
                          {item.matchingEntryFound ? (
                            <span className="text-brand-lime">YES</span>
                          ) : (
                            <span className="text-red-500">NO</span>
                          )}
                        </td>
                        <td className="p-2 border-r border-on-surface/10">
                          {item.reviewPhotoUrlExists ? '✅ YES' : '❌ NO'}
                        </td>
                        <td className="p-2 border-r border-on-surface/10">
                          {item.entryPhotoUrlExists ? '✅ YES' : '❌ NO'}
                        </td>
                        <td className="p-2 border-r border-on-surface/10 max-w-[120px] truncate text-[7.5px]" title={item.selectedImageUrl}>
                          {item.selectedImageUrl || 'none'}
                        </td>
                        <td className="p-2 border-r border-on-surface/10 font-medium whitespace-nowrap">
                          {item.recommendedAction === 'archive_orphan_review' && (
                            <span className="text-orange-500">Archive/Clear Orphan</span>
                          )}
                          {item.recommendedAction === 'create_proof_review' && (
                            <span className="text-red-500">Rebuild Missing Review</span>
                          )}
                          {item.recommendedAction === 'backfill_photos' && (
                            <span className="text-blue-500">Backfill photo fields</span>
                          )}
                        </td>
                        <td className="p-2 whitespace-nowrap">
                          <button
                            onClick={() => executeRepair(item)}
                            disabled={!!repairingId}
                            className="bg-on-surface hover:bg-neutral-800 text-white font-black px-2 py-0.5 rounded text-[8px] border border-black uppercase flex items-center gap-0.5"
                          >
                            Repair
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Missing reviews warnings */}
          {missingReviews.length > 0 && (
            <div className="border-2 border-brand-orange bg-brand-orange/5 p-4 rounded-2xl space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-brand-orange animate-bounce" />
                <h4 className="font-display text-xs uppercase font-black text-on-surface">
                  Critical Mismatch: Entries Missing proofReviews ({missingReviews.length})
                </h4>
              </div>
              <p className="font-mono text-[9px] text-on-surface/60 uppercase">
                These submissions exist in Firestore but lack corresponding validation reviewer links. Admin review queue cannot render them correctly.
              </p>
              <div className="max-h-24 overflow-y-auto space-y-1.5 border border-brand-orange/20 rounded-xl p-2 bg-white">
                {missingReviews.map(e => (
                  <div key={e.id} className="flex justify-between items-center text-[9px] font-mono text-on-surface border-b pb-1 last:border-0">
                    <span className="font-bold">Entry: {e.id.substring(0, 8)}...</span>
                    <span>Status: <strong className="text-brand-orange">{e.status}</strong></span>
                    <span>User: {e.userId?.substring(0, 6)}...</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dual columns for latest lists */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div>
              <h4 className="font-display text-xs uppercase font-black text-on-surface mb-3 flex items-center gap-1.5 border-b pb-1.5 border-on-surface/15">
                <Database className="w-3.5 h-3.5 text-brand-orange" /> Latest 5 entries
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {latestEntries.map((e: any) => (
                  <div key={e.id} className="border border-on-surface/5 p-2 bg-white rounded-xl space-y-1 hover:border-on-surface/15 transition-all text-[9.5px]">
                    <div className="flex justify-between font-mono font-bold">
                      <span className="text-brand-orange">ID: {e.id ? `${e.id.substring(0, 10)}...` : 'N/A'}</span>
                      <span className="px-1 py-0.5 bg-on-surface/5 rounded uppercase">{e.status || 'unknown'}</span>
                    </div>
                    <div className="font-mono text-[8.5px] text-on-surface/60 space-y-0.5">
                      <p>USER: {e.userId ? `${e.userId.substring(0, 8)}...` : 'N/A'} {e.userName ? `(${e.userName})` : ''}</p>
                      <p>MISSION: {e.missionId || e.challengeId || 'N/A'}</p>
                      <p>CREATED: {e.createdAt?.toDate ? e.createdAt.toDate().toISOString() : (e.createdAt || 'N/A')}</p>
                    </div>
                  </div>
                ))}
                {latestEntries.length === 0 && <p className="font-mono text-[10px] text-on-surface/40 italic">No entries found.</p>}
              </div>
            </div>

            <div>
              <h4 className="font-display text-xs uppercase font-black text-on-surface mb-3 flex items-center gap-1.5 border-b pb-1.5 border-on-surface/15">
                <CheckCircle className="w-3.5 h-3.5 text-brand-lime" /> Latest 5 proofReviews
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {latestReviews.map((r: any) => (
                  <div key={r.id} className="border border-on-surface/10 p-2 bg-white rounded-xl space-y-1 hover:border-on-surface/15 transition-all text-[9.5px]">
                    <div className="flex justify-between font-mono font-bold">
                      <span className="text-brand-lime">ID: {r.id ? `${r.id.substring(0, 10)}...` : 'N/A'}</span>
                      <span className="px-1 py-0.5 bg-on-surface/5 rounded uppercase">{r.status || 'unknown'}</span>
                    </div>
                    <div className="font-mono text-[8.5px] text-on-surface/60 space-y-0.5">
                      <p>ENTRY ID: {r.entryId ? `${r.entryId.substring(0, 8)}...` : 'N/A'}</p>
                      <p>USER: {r.userId ? `${r.userId.substring(0, 8)}...` : 'N/A'}</p>
                      <p>AI RECO: <strong className="text-brand-orange">{r.aiRecommendation || 'none'}</strong> | STAT: <strong className="text-brand-lime">{r.aiAnalysisStatus || 'completed'}</strong></p>
                      <p>CREATED: {r.createdAt?.toDate ? r.createdAt.toDate().toISOString() : (r.createdAt || 'N/A')}</p>
                    </div>
                  </div>
                ))}
                {latestReviews.length === 0 && <p className="font-mono text-[10px] text-on-surface/40 italic">No proofReviews found.</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
