import React, { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, orderBy, limit, where, getDoc, doc, getDocs } from 'firebase/firestore';
import { db, auth, storage, handleFirestoreError, OperationType } from '../lib/firebase';
import { ref, getDownloadURL } from 'firebase/storage';
import { ProofReview, ProofStatus } from '../types/proof';
import { Entry } from '../constants';
import { adminOverrideReview, evaluateProof } from '../services/proofService';
import { 
  subscribeToAdminPendingReviews, 
  approveSubmission, 
  rejectSubmission, 
  requestMoreProof,
  awardSubmissionPointsOnce
} from '../services/submissionService';
import { getPendingFieldChecks, updateFieldCheckStatus } from '../services/fieldCheckService';
import { repairUserMissionState, repairAllUserOrphans, repairStrandedStarterUsers, getRepairDiagnostics, RepairReport, StrandedStarterRepairReport, getLatestStarterResetLog, StarterResetLog } from '../services/repairService';
import { Card, FieldBadge } from '../components/UI';
import { AdminDiagnosticsPanel } from '../components/AdminDiagnosticsPanel';
import { ProofImage } from '../components/ProofImage';
import { 
  Shield, Check, X, RefreshCw, AlertCircle, Info, Database, CameraOff, 
  Flag, CheckCircle, MessageSquare, SkipForward, ArrowRight, ArrowLeft, ArrowUp, Zap, HelpCircle, Sparkles,
  Users, Gamepad2, ShieldAlert
} from 'lucide-react';
import { FieldCheck, FieldCheckStatus } from '../types/game';
import { cn, formatSafeDateOnly } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { normalizeEntryStatus } from '../logic/entryLogic';
import {
  calculateProofScore,
  ProofScoringBreakdown,
  ProofScoringSelections,
  ProofMatchRating,
  PhotoQualityRating,
  FieldNoteRating,
  AdventureRating
} from '../utils/proofScoring';

const PROOF_MATCH_OPTIONS: { value: ProofMatchRating; label: string }[] = [
  { value: 'weak', label: 'Weak' },
  { value: 'good', label: 'Good' },
  { value: 'perfect', label: 'Perfect' }
];

const PHOTO_QUALITY_OPTIONS: { value: PhotoQualityRating; label: string }[] = [
  { value: 'usable', label: 'Usable' },
  { value: 'clear', label: 'Clear' },
  { value: 'iconic', label: 'Iconic' }
];

const FIELD_NOTE_OPTIONS: { value: FieldNoteRating; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'basic', label: 'Basic' },
  { value: 'specific', label: 'Specific' },
  { value: 'legendary', label: 'Legendary' }
];

const ADVENTURE_OPTIONS: { value: AdventureRating; label: string }[] = [
  { value: 'simple', label: 'Simple' },
  { value: 'outside', label: 'Outside' },
  { value: 'adventure', label: 'Adventure' },
  { value: 'social', label: 'Social' }
];

function inferAdminFieldNoteRating(entry: any): FieldNoteRating {
  const note = (entry?.fieldNote || entry?.note || '').trim();
  return note.length > 0 ? 'basic' : 'none';
}

function getDefaultAdminScoring(entry: any): ProofScoringSelections {
  return {
    proofMatchRating: 'good',
    photoQualityRating: 'clear',
    fieldNoteRating: inferAdminFieldNoteRating(entry),
    adventureRating: 'simple',
    weeklyCatalystApplied: false
  };
}

function ScoringOptionGroup<T extends string>({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[8px] font-mono font-black uppercase tracking-widest text-on-surface/45">{label}</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
        {options.map(option => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "px-2 py-1.5 rounded border text-[9px] font-mono font-black uppercase tracking-tight transition-all",
              value === option.value
                ? "bg-brand-orange text-white border-on-surface shadow-[2px_2px_0px_black]"
                : "bg-white text-on-surface/55 border-on-surface/15 hover:border-brand-orange/50"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ProofScoringControls({
  selections,
  breakdown,
  onChange
}: {
  selections: Required<ProofScoringSelections>;
  breakdown: ProofScoringBreakdown;
  onChange: (updates: ProofScoringSelections) => void;
}) {
  return (
    <div className="bg-[#FCF9F2] border-2 border-brand-orange/25 rounded-2xl p-4 space-y-4 font-mono text-left">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-brand-orange">Variable Proof Scoring</p>
          <p className="text-[8px] text-on-surface/45 uppercase tracking-wider">Final XP is awarded only on approval.</p>
        </div>
        <div className="bg-on-surface text-brand-lime border-2 border-on-surface px-3 py-2 rounded-xl shadow-[3px_3px_0px_black] text-right">
          <p className="text-[7px] uppercase text-white/50 tracking-widest">Final XP</p>
          <p className="text-2xl font-black leading-none">+{breakdown.finalXP}</p>
        </div>
      </div>

      <ScoringOptionGroup
        label="Proof Match"
        value={selections.proofMatchRating}
        options={PROOF_MATCH_OPTIONS}
        onChange={(proofMatchRating) => onChange({ proofMatchRating })}
      />
      <ScoringOptionGroup
        label="Photo Quality"
        value={selections.photoQualityRating}
        options={PHOTO_QUALITY_OPTIONS}
        onChange={(photoQualityRating) => onChange({ photoQualityRating })}
      />
      <ScoringOptionGroup
        label="Field Note"
        value={selections.fieldNoteRating}
        options={FIELD_NOTE_OPTIONS}
        onChange={(fieldNoteRating) => onChange({ fieldNoteRating })}
      />
      <ScoringOptionGroup
        label="Adventure / Social"
        value={selections.adventureRating}
        options={ADVENTURE_OPTIONS}
        onChange={(adventureRating) => onChange({ adventureRating })}
      />

      <div className="space-y-1">
        <p className="text-[8px] font-mono font-black uppercase tracking-widest text-on-surface/45">Weekly Catalyst</p>
        <div className="grid grid-cols-2 gap-1">
          {[false, true].map(flag => (
            <button
              key={String(flag)}
              type="button"
              onClick={() => onChange({ weeklyCatalystApplied: flag })}
              className={cn(
                "px-2 py-1.5 rounded border text-[9px] font-mono font-black uppercase tracking-tight transition-all",
                selections.weeklyCatalystApplied === flag
                  ? "bg-brand-orange text-white border-on-surface shadow-[2px_2px_0px_black]"
                  : "bg-white text-on-surface/55 border-on-surface/15 hover:border-brand-orange/50"
              )}
            >
              {flag ? 'Yes' : 'No'}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-on-surface/10 pt-3 space-y-1 text-[9px] text-on-surface/65">
        <div className="flex justify-between"><span>Base XP</span><span>+{breakdown.baseXP}</span></div>
        <div className="flex justify-between"><span>Proof Match</span><span>+{breakdown.proofMatchBonus}</span></div>
        <div className="flex justify-between"><span>Photo Quality</span><span>+{breakdown.photoQualityBonus}</span></div>
        <div className="flex justify-between"><span>Field Note</span><span>+{breakdown.fieldNoteBonus}</span></div>
        <div className="flex justify-between"><span>Adventure / Social</span><span>+{breakdown.adventureBonus}</span></div>
        <div className="flex justify-between"><span>Weekly Catalyst</span><span>+{breakdown.weeklyCatalystBonus}</span></div>
        <div className="flex justify-between text-amber-700"><span>Penalties</span><span>{breakdown.subtotalXP - breakdown.finalXP > 0 ? `-${breakdown.subtotalXP - breakdown.finalXP}` : '0'}</span></div>
        <div className="flex justify-between border-t border-on-surface/10 pt-2 text-[11px] font-black text-on-surface">
          <span>Final XP</span><span>+{breakdown.finalXP}</span>
        </div>
      </div>
    </div>
  );
}

export default function AdminProofReview() {
  const [reviews, setReviews] = useState<(ProofReview & { entry?: Entry })[]>([]);
  const [fieldChecks, setFieldChecks] = useState<(FieldCheck & { entry?: Entry })[]>([]);
  const [activeTab, setActiveTab ] = useState<'submissions' | 'checks' | 'repair' | 'audit' | 'evidence-audit' | 'health'>('submissions');
  const [subFilter, setSubFilter] = useState<'pending_review' | 'needs_more_proof' | 'rejected' | 'approved'>('pending_review');
  const [loading, setLoading] = useState(true);
  const [loadingChecks, setLoadingChecks] = useState(true);
  const [rerunningId, setRerunningId] = useState<string | null>(null);
  const [isRepairing, setIsRepairing] = useState(false);
  const [repairUid, setRepairUid] = useState('');
  const [repairReport, setRepairReport] = useState<RepairReport | null>(null);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(false);
  const [individualDryRun, setIndividualDryRun] = useState(false);
  const [bulkDryRun, setBulkDryRun] = useState(true);
  const [bulkReport, setBulkReport] = useState<any>(null);
  const [strandedStarterDryRun, setStrandedStarterDryRun] = useState(true);
  const [strandedStarterReport, setStrandedStarterReport] = useState<StrandedStarterRepairReport | null>(null);
  const [healthReport, setHealthReport] = useState<any>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [starterResetLog, setStarterResetLog] = useState<StarterResetLog | null>(null);
  const [loadingStarterLog, setLoadingStarterLog] = useState(false);

  // --- Evidence Audit State ---
  const [evidenceAuditEntries, setEvidenceAuditEntries] = useState<Entry[]>([]);
  const [loadingEvidenceAudit, setLoadingEvidenceAudit] = useState(false);
  const [evidenceAuditError, setEvidenceAuditError] = useState<string | null>(null);
  const [processingEvidenceAuditId, setProcessingEvidenceAuditId] = useState<string | null>(null);

  // --- Audit State ---
  const [auditEntries, setAuditEntries] = useState<Entry[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [isAuditingRepairUid, setIsAuditingRepairUid] = useState<string | null>(null);
  const [showBulkConfirmModal, setShowBulkConfirmModal] = useState(false);
  const [totalCounts, setTotalCounts] = useState({
    pending_review: 0,
    needs_more_proof: 0,
    rejected: 0,
    approved: 0
  });
  const [storageStats, setStorageStats] = useState({
    waitingPurge: 0,
    purged: 0,
    oldestUnpurged: null as string | null
  });
  const { profile, trips } = useApp();
  const { isAdmin } = useTheme();

  // --- Swipe View State ---
  const [viewMode, setViewMode] = useState<'swipe' | 'queue'>('swipe');
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());
  const [sessionReviewedCount, setSessionReviewedCount] = useState(0);
  const [activeReasonPanel, setActiveReasonPanel] = useState<'rejected' | 'needs_more_proof' | null>(null);
  const [reasonText, setReasonText] = useState('');
  const [cardError, setCardError] = useState<string | null>(null);
  const [isProcessingSwipe, setIsProcessingSwipe] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [dragDirection, setDragDirection] = useState<'left' | 'right' | 'up' | 'none'>('none');
  const [scoringByEntryId, setScoringByEntryId] = useState<Record<string, ProofScoringSelections>>({});

  const getScoringSource = (review: ProofReview & { entry?: Entry }) => {
    const entry: any = review.entry || {};
    const missionId = entry.missionId || entry.challengeId || entry.tripId || review.challengeId;
    const mission = trips.find(t => t.id === missionId || t.missionId === missionId || t.challengeId === missionId);
    return { ...(mission || {}), ...entry };
  };

  const getScoringSelections = (review: ProofReview & { entry?: Entry }): Required<ProofScoringSelections> => {
    const entryId = review.entryId || review.entry?.id || review.id;
    return {
      ...getDefaultAdminScoring(review.entry),
      ...(scoringByEntryId[entryId] || {})
    } as Required<ProofScoringSelections>;
  };

  const updateScoringSelections = (entryId: string, updates: ProofScoringSelections) => {
    setScoringByEntryId(prev => ({
      ...prev,
      [entryId]: {
        ...(prev[entryId] || {}),
        ...updates
      }
    }));
  };

  const getScorePreview = (review: ProofReview & { entry?: Entry }) => {
    const source = getScoringSource(review);
    return calculateProofScore({
      missionOrEntry: source,
      fieldNote: source.fieldNote || source.note || '',
      hintUsed: source.hintUsed === true,
      lateSubmission: false,
      retrySubmission: source.isRetry === true || source.retrySubmission === true || !!source.originalEntryId,
      retryMultiplier: typeof source.retryPointMultiplier === 'number' ? source.retryPointMultiplier : null,
      duplicateProof: ['duplicate', 'reused', 'matched', 'repeat'].includes(String(source.verification?.duplicateStatus || source.duplicateStatus || '').toLowerCase()),
      ...getScoringSelections(review)
    });
  };

  const renderScoringControls = (review: ProofReview & { entry?: Entry }) => {
    const entryId = review.entryId || review.entry?.id || review.id;
    return (
      <ProofScoringControls
        selections={getScoringSelections(review)}
        breakdown={getScorePreview(review)}
        onChange={(updates) => updateScoringSelections(entryId, updates)}
      />
    );
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    const timer = setTimeout(() => {
      setToast(null);
    }, 2800);
    return () => clearTimeout(timer);
  };

  useEffect(() => {
    if (!isAdmin) return;

    if (import.meta.env.DEV) {
      console.log("[ADMIN_PROOF_QUERY_START] for status:", subFilter);
    }

    // Subscribe to entries using our canonical query
    const unsubReviews = subscribeToAdminPendingReviews(subFilter, (pendingEntries) => {
      const mappedReviews = pendingEntries.map(entry => {
        return {
          id: `rev_${entry.id}`,
          entryId: entry.id,
          userId: entry.userId,
          challengeId: entry.tripId || entry.missionId || entry.challengeId || '',
          status: entry.status as any,
          confidenceScore: (entry as any).aiAnalysisResult?.confidence ? (entry as any).aiAnalysisResult.confidence * 100 : ((entry as any).confidenceScore || (entry as any).aiScore || 100),
          aiAnalysisResult: (entry as any).aiAnalysisResult,
          missingRequirements: (entry as any).aiAnalysisResult?.missingItems || (entry as any).missingRequirements || [],
          reviewNotes: (entry as any).aiAnalysisResult?.displayDetail || entry.adminNotes || (entry as any).adminNotes || 'Awaiting manual review.',
          reviewedAt: entry.createdAt instanceof Date ? entry.createdAt.toISOString() : (entry as any).createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          entry: {
            id: entry.id,
            uid: entry.userId,
            userId: entry.userId,
            missionId: entry.tripId || entry.missionId || entry.challengeId,
            challengeId: entry.tripId || entry.missionId || entry.challengeId,
            status: entry.status,
            photoUrl: entry.photoUrl || entry.proofImage,
            imageUrl: entry.imageUrl || entry.proofImage,
            storagePath: entry.storagePath || entry.photoStoragePath,
            proofImage: entry.proofImage,
            fieldNote: entry.fieldNote || (entry as any).note,
            note: entry.fieldNote || (entry as any).note,
            submittedAt: entry.createdAt,
            createdAt: entry.createdAt,
            userName: entry.userName || 'Agent'
          } as any
        };
      });

      setReviews(mappedReviews as any);
      setLoading(false);
    });

    // Stats Query - Filtered for efficiency, limited to prevent cost explosion
    // Align with all rejected status variants to prevent count mismatch
    const statsUnsubscribe = onSnapshot(query(
      collection(db, 'entries'), 
      where('status', 'in', ['rejected', 'awaiting_purge', 'denied', 'auto_rejected']), 
      limit(100)
    ), (snapshot) => {
      const rejected = snapshot.docs.map(d => d.data() as Entry);
      const waiting = rejected.filter(e => !e.imagePurged);
      const purged = rejected.filter(e => e.imagePurged);
      
      const oldest = waiting?.length > 0 
        ? [...waiting].sort((a, b) => {
            const aTime = a.rejectedAt?.seconds || (a.rejectedAt instanceof Date ? a.rejectedAt.getTime() / 1000 : 0);
            const bTime = b.rejectedAt?.seconds || (b.rejectedAt instanceof Date ? b.rejectedAt.getTime() / 1000 : 0);
            return aTime - bTime;
          })[0]?.rejectedAt 
        : null;

      setStorageStats({
        waitingPurge: waiting?.length || 0,
        purged: purged?.length || 0,
        oldestUnpurged: formatSafeDateOnly(oldest, 'N/A')
      });
    }, (error) => {
      console.warn("[AdminProofReview] Storage stats subscription skipped:", error.message);
    });

    const checksUnsubscribe = getPendingFieldChecks(async (checks) => {
      const entryIds = [...new Set(checks.map(c => c.submissionId))];
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
        console.error("Failed to fetch entries for checks:", err);
      }

      setFieldChecks(checks.map(c => ({
        ...c,
        entry: entryMap[c.submissionId]
      })));
      setLoadingChecks(false);
    });

    return () => {
      unsubReviews();
      statsUnsubscribe();
      checksUnsubscribe();
    };
  }, [isAdmin, subFilter]);

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
      const { getDoc, doc } = await import('firebase/firestore');
      const entrySnap = await getDoc(doc(db, 'entries', review.entryId));
      if (!entrySnap.exists()) throw new Error("ENTRY_NOT_FOUND");
      const entry = { id: entrySnap.id, ...entrySnap.data() } as Entry;

      if (!entry.proofImage) throw new Error("NO_IMAGE_IN_ENTRY");

      console.log(`[Admin] Initiating AI rerun for entry: ${review.entryId}`);
      
      const challenge = trips.find(t => t.id === review.challengeId);
      if (!challenge) throw new Error("CHALLENGE_NOT_FOUND");

      const base64Image = await fetchImageAsBase64(entry.proofImage);

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

      showToast("Fresh AI analysis completed.");
    } catch (error: any) {
      console.error("AI Rerun error:", error);
      showToast(`AI analysis rerun failed: ${error.message || error}`, 'error');
    } finally {
      setRerunningId(null);
    }
  };

  useEffect(() => {
    // Only update counts if we aren't in the middle of a specific filter query update
    // Query entries directly for the counts
    const q = query(collection(db, 'entries'));
    const unsub = onSnapshot(q, (snap) => {
      const counts = { pending_review: 0, needs_more_proof: 0, rejected: 0, approved: 0 };
      snap.docs.forEach(doc => {
        const rawStatus = doc.data().status;
        const status = normalizeEntryStatus(rawStatus) as keyof typeof counts;
        if (counts[status] !== undefined) counts[status]++;
      });
      setTotalCounts(counts);
    }, (error) => {
      console.warn("[AdminProofReview] Counts subscription failed:", error.message);
    });
    return () => unsub();
  }, [isAdmin]);

  const fetchDiagnostics = async () => {
    setLoadingDiagnostics(true);
    try {
      const data = await getRepairDiagnostics();
      setDiagnostics(data);
      if (data.firestoreTestStatus === 'failing') {
        showToast("Diagnostics: Data storage write test failed.", 'error');
      }
    } catch (err: any) {
      console.error("DIAGNOSTICS_FETCH_ERROR:", err);
      const isPerm = err.message?.includes('7') || err.message?.toLowerCase().includes('permission');
      if (isPerm) {
        setDiagnostics({
          error: "Permission Denied (7)",
          suggestion: "The server identity has insufficient permissions to read Firestore. Ensure the Service Account has Cloud Datastore User role.",
          details: err.message
        });
      } else {
        showToast("Failed to load systems diagnostics", 'error');
      }
    } finally {
      setLoadingDiagnostics(false);
    }
  };

  const fetchStarterLog = async () => {
    setLoadingStarterLog(true);
    try {
      const log = await getLatestStarterResetLog();
      setStarterResetLog(log);
    } catch (err) {
      console.error("Failed to fetch starter reset log:", err);
    } finally {
      setLoadingStarterLog(false);
    }
  };

  const fetchHealthReport = async () => {
    setLoadingHealth(true);
    try {
      const { authenticatedFetch } = await import('../lib/api');
      const response = await authenticatedFetch('/api/admin/canonical-audit');
      if (response.ok) {
        const data = await response.json();
        setHealthReport(data.report);
      }
    } catch (err) {
      console.error("Failed to fetch health report:", err);
    } finally {
      setLoadingHealth(false);
    }
  };

  const handleRunMigration = async () => {
    if (!confirm("Are you sure you want to migrate all legacy points to XP? This will also remove the legacy fields.")) return;
    setIsMigrating(true);
    try {
      const { authenticatedFetch } = await import('../lib/api');
      const response = await authenticatedFetch('/api/admin/run-migration', { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        showToast(`Successfully migrated ${data.migratedCount} users.`, 'success');
        await fetchHealthReport();
      }
    } catch (err) {
      console.error("Migration failed:", err);
      showToast("Migration failed.", 'error');
    } finally {
      setIsMigrating(false);
    }
  };

  const fetchEvidenceAudit = async () => {
    setLoadingEvidenceAudit(true);
    setEvidenceAuditError(null);
    try {
      const q = query(
        collection(db, 'entries'),
        where('status', '==', 'approved'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const list: Entry[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const pa = data.pointsAwarded;
        const isOrphan = pa === false || pa === null || pa === undefined;
        if (isOrphan) {
          list.push({ id: docSnap.id, ...data } as Entry);
        }
      });
      setEvidenceAuditEntries(list);
    } catch (err: any) {
      console.error("Evidence Audit scan failed:", err);
      setEvidenceAuditError(err.message || String(err));
      try {
        handleFirestoreError(err, OperationType.LIST, 'entries');
      } catch (e) {
        // Safe catch
      }
    } finally {
      setLoadingEvidenceAudit(false);
    }
  };

  const handleAwardPointsForOrphan = async (entryId: string) => {
    setProcessingEvidenceAuditId(entryId);
    try {
      showToast(`Awarding points for Submission ${entryId.substring(0, 8)}...`, 'info');
      const result = await awardSubmissionPointsOnce(entryId);
      if (result && result.success) {
        showToast("Points awarded successfully!", "success");
        setEvidenceAuditEntries(prev => prev.filter(e => e.id !== entryId));
      } else {
        showToast(result?.reason || "Could not award points.", "error");
      }
    } catch (err: any) {
      console.error("Failed to award points:", err);
      showToast(err.message || "Operation failed", "error");
    } finally {
      setProcessingEvidenceAuditId(null);
    }
  };

  useEffect(() => {
    if (activeTab === 'health' && isAdmin) {
      fetchHealthReport();
    }
  }, [activeTab, isAdmin]);

  useEffect(() => {
    if (activeTab === 'evidence-audit' && isAdmin) {
      fetchEvidenceAudit();
    }
  }, [activeTab, isAdmin]);

  useEffect(() => {
    if (activeTab === 'repair' && isAdmin) {
      fetchDiagnostics();
      fetchStarterLog();
    }
  }, [activeTab, isAdmin]);

  useEffect(() => {
    if (activeTab === 'audit' && isAdmin) {
      setLoadingAudit(true);
      setAuditError(null);
      
      const q = query(
        collection(db, 'entries'),
        where('status', '==', 'approved'),
        orderBy('createdAt', 'desc'),
        limit(20)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const entriesList: Entry[] = [];
        snapshot.forEach((doc) => {
          entriesList.push({ id: doc.id, ...doc.data() } as Entry);
        });
        setAuditEntries(entriesList);
        setLoadingAudit(false);
      }, (error) => {
        console.error("Points Audit fetch failed:", error);
        setAuditError(error.message);
        setLoadingAudit(false);
        try {
          handleFirestoreError(error, OperationType.LIST, 'entries');
        } catch (e) {
          // Logged but caught to avoid crashing component
        }
      });

      return () => unsubscribe();
    }
  }, [activeTab, isAdmin]);

  const handleAuditRepairUser = async (uid: string) => {
    if (!uid) return;
    setIsAuditingRepairUid(uid);
    try {
      showToast(`Triggering sync for User ${uid}`, 'info');
      const report = await repairUserMissionState(uid, false);
      if (report.errors.length > 0) {
        showToast(`Sync finished with errors: ${report.errors.join(', ')}`, "error");
      } else {
        showToast(`User state sync-repaired successfully!`, "success");
      }
    } catch (err: any) {
      console.error("Audit repair failed:", err);
      showToast(`Sync repair failed: ${err.message}`, "error");
    } finally {
      setIsAuditingRepairUid(null);
    }
  };

  const handleRepairUser = async () => {
    if (!repairUid) return showToast("Enter a UID", "error");
    setIsRepairing(true);
    setRepairReport(null);
    setBulkReport(null);
    try {
      const report = await repairUserMissionState(repairUid, individualDryRun);
      setRepairReport(report);
      if (report.errors.length > 0) {
        showToast(`Repair finished with errors`, "error");
      } else {
        showToast(individualDryRun ? "Dry run completed successfully" : "User state repaired successfully");
      }
      await fetchDiagnostics();
    } catch (err: any) {
      showToast(`Repair failed: ${err.message}`, "error");
    } finally {
      setIsRepairing(false);
    }
  };

  const handleRepairAll = async () => {
    setIsRepairing(true);
    setRepairReport(null);
    setBulkReport(null);
    setStrandedStarterReport(null);
    try {
      const result = await repairAllUserOrphans(bulkDryRun);
      setBulkReport(result);
      if (result.errors.length > 0) {
        showToast(`Bulk repair completed with errors`, "error");
      } else {
        showToast(bulkDryRun ? "Bulk dry run completed successfully" : `Bulk sync complete. Scanned ${result.totalUsersScanned} users.`);
      }
      await fetchDiagnostics();
    } catch (err: any) {
      showToast(`Global repair failed: ${err.message}`, "error");
    } finally {
      setIsRepairing(false);
    }
  };

  const handleRepairStrandedStarter = async () => {
    setIsRepairing(true);
    setRepairReport(null);
    setBulkReport(null);
    setStrandedStarterReport(null);
    try {
      const result = await repairStrandedStarterUsers(strandedStarterDryRun);
      setStrandedStarterReport(result);
      if (result.errors.length > 0) {
         showToast(`Stranded starter repair completed with errors`, "error");
      } else {
         showToast(strandedStarterDryRun ? "Stranded dry run completed successfully" : `Stranded starter repair complete.`);
      }
      await fetchDiagnostics();
    } catch (err: any) {
      showToast(`Stranded starter repair failed: ${err.message}`, "error");
    } finally {
      setIsRepairing(false);
    }
  };

  const handleAction = async (review: ProofReview & { entry?: Entry }, verdict: ProofStatus, notes?: string) => {
    const adminUid = auth.currentUser?.uid || 'unknown';
    const beforeStatus = review.status;
    const rawStatus = (review.entry as any)?.status || 'unknown';
    const normalized = normalizeEntryStatus(rawStatus);

    console.log("[ADMIN_ACTION_INITIATED]", {
      actionName: verdict,
      reviewId: review.id,
      entryId: review.entryId,
      currentRawStatus: rawStatus,
      currentNormalizedStatus: normalized,
      beforeStatus: beforeStatus,
      adminUid: adminUid
    });

    try {
      const notesWithAudit = notes || `Manual override by admin at ${new Date().toISOString()}`;
      if (verdict === 'approved') {
        await approveSubmission(review.entryId, notesWithAudit, getScoringSelections(review));
      } else if (verdict === 'rejected') {
        await rejectSubmission(review.entryId, notesWithAudit);
      } else if (verdict === 'needs_more_proof') {
        await requestMoreProof(review.entryId, notesWithAudit);
      } else {
        // Fallback or custom adjustments
        await adminOverrideReview(
          review.id,
          review.entryId,
          verdict,
          notesWithAudit
        );
      }
      
      if (import.meta.env.DEV) {
        console.log("[DEV_LOG] [AdminApprovalWorkflow] Action Approved / Resolved successfully:", {
          sourceCollection: "entries",
          activeFilters: {
            currentVerdict: verdict,
            reviewId: review.id,
            entryId: review.entryId,
          },
          resultingApprovedCount: totalCounts.approved + (verdict === 'approved' ? 1 : 0),
          pointsAwardedStatusBefore: (review.entry as any)?.pointsAwarded || false,
          pointsAwardedStatusExpectedAfter: verdict === 'approved',
          calculatedXpToAward: (review.entry as any)?.xpAwarded || (review.entry as any)?.estimatedPoints || 100,
          timestamp: new Date().toISOString()
        });
      }

      console.log("[ADMIN_ACTION_SUCCESS]", {
        reviewId: review.id,
        entryId: review.entryId,
        beforeStatus: beforeStatus,
        afterStatus: verdict,
        firestoreUpdateResult: "SUCCESS"
      });

      showToast(`Successfully updated status to ${verdict.toUpperCase()}`, 'success');
    } catch (error: any) {
      console.error("[ADMIN_ACTION_FAILED]", {
        reviewId: review.id,
        entryId: review.entryId,
        action: verdict,
        errorMessage: error.message || 'Unknown error',
        error: error
      });
      showToast(`Action failed: ${error.message || 'Unknown error'}`, 'error');
    }
  };

  const handleResolveCheck = async (checkId: string, status: FieldCheckStatus) => {
    setLoadingChecks(true);
    try {
      const adminNote = prompt(`Resolution note for ${status}:`) || '';
      await updateFieldCheckStatus(checkId, status, adminNote);
      showToast(`Field check marked as ${status.toUpperCase()}`, 'success');
    } catch (error: any) {
      console.error("Failed to resolve check:", error);
      showToast(`Failed to save field check resolution: ${error.message || 'Unknown error'}`, "error");
    } finally {
      setLoadingChecks(false);
    }
  };

  const handleDrag = (_event: any, info: any) => {
    const x = info.offset.x;
    const y = info.offset.y;
    const threshold = 35;
    if (Math.abs(x) > Math.abs(y)) {
      if (x > threshold) setDragDirection('right');
      else if (x < -threshold) setDragDirection('left');
      else setDragDirection('none');
    } else {
      if (y < -threshold) setDragDirection('up');
      else setDragDirection('none');
    }
  };

  // --- Filter active and swipe items ---
  const activeReviews = reviews.filter(r => {
    const normStatus = normalizeEntryStatus(r.status);
    const isMatch = normStatus === subFilter;
    const isHidden = hiddenIds.has(r.id);
    
    if (import.meta.env.DEV && subFilter === 'pending_review' && !isMatch) {
       // Only log for pending_review to keep console somewhat clean
       // console.log(`[Admin] Review ${r.id} hidden. Reason: ${isMatch ? 'HIDDEN_SET' : 'STATUS_MISMATCH (' + r.status + ')'}`);
    }

    return isMatch && !isHidden;
  });

  const activeSwipeQueue = activeReviews.filter(r => !skippedIds.has(r.id));

  useEffect(() => {
    if (import.meta.env.DEV && activeTab === 'submissions') {
      console.log("[ADMIN_VISIBILITY_TRACE]", {
        activeTab,
        activeFilter: subFilter,
        totalLoaded: reviews.length,
        visibleCount: activeReviews.length,
        visibleIds: activeReviews.map(r => r.id),
        hiddenStats: reviews.filter(r => r.status !== subFilter || hiddenIds.has(r.id)).map(r => ({
          id: r.id,
          status: r.status,
          reason: r.status !== subFilter ? 'FILTER_MISMATCH' : 'USER_HIDDEN'
        }))
      });
    }
  }, [activeReviews, subFilter, reviews, hiddenIds, activeTab]);

  // --- Swipe Action Triggers ---
  const handleSwipeApprove = async (review: ProofReview & { entry?: Entry }) => {
    if (isProcessingSwipe) return;
    setIsProcessingSwipe(true);
    setCardError(null);

    // Optimistically hide from view
    setHiddenIds(prev => new Set([...prev, review.id]));
    setSessionReviewedCount(prev => prev + 1);

    try {
      await handleAction(review, 'approved', `Approved via CONTROL BOOTH Swiper interface: ${review.entry?.userName || review.userId}`);
      showToast(`Approved signature of user: ${review.entry?.userName || 'Vetted Field Agent'}`);
    } catch (err: any) {
      // Revert optimism on write error
      setHiddenIds(prev => {
        const copy = new Set(prev);
        copy.delete(review.id);
        return copy;
      });
      setSessionReviewedCount(prev => Math.max(0, prev - 1));
      setCardError(err.message || "Failed to persist approval. Database rejected request.");
    } finally {
      setIsProcessingSwipe(false);
    }
  };

  const handleSwipeRejectOrMoreProofSubmit = async (
    review: ProofReview & { entry?: Entry }, 
    status: 'rejected' | 'needs_more_proof'
  ) => {
    if (!reasonText.trim()) {
      setCardError("Auditation failure notes are mandatory.");
      // If we're calling from a direct button click (not from the panel submit button),
      // we should open the panel instead of just showing an error.
      if (!activeReasonPanel) {
        setActiveReasonPanel(status);
      }
      throw new Error("REASON_REQUIRED");
    }

    setIsProcessingSwipe(true);
    setCardError(null);

    // Optimistically hide
    setHiddenIds(prev => new Set([...prev, review.id]));
    setSessionReviewedCount(prev => prev + 1);

    try {
      const finalNote = `[REASON_NOTE] ${reasonText.trim()} (Manual curation override)`;
      await handleAction(review, status, finalNote);
      showToast(
        status === 'rejected' 
          ? `Rejected submission from agent: ${review.entry?.userName || 'Vetted Agent'}`
          : `Sent More Proof protocol request to agent: ${review.entry?.userName || 'Vetted Agent'}`
      );
      // Clean states
      setActiveReasonPanel(null);
      setReasonText('');
    } catch (err: any) {
      // Revert optimism
      setHiddenIds(prev => {
        const copy = new Set(prev);
        copy.delete(review.id);
        return copy;
      });
      setSessionReviewedCount(prev => Math.max(0, prev - 1));
      setCardError(err.message || "Failed to persist curator verdict. Database error.");
    } finally {
      setIsProcessingSwipe(false);
    }
  };

  const handleSwipeSkip = (review: ProofReview & { entry?: Entry }) => {
    setSkippedIds(prev => new Set([...prev, review.id]));
    showToast(`Skipped evidence file`, 'info');
  };

  const handleResetSkips = () => {
    setSkippedIds(new Set());
    showToast("Skipped items returned to active queue", 'info');
  };

  const handleOpenReasonPanel = (type: 'rejected' | 'needs_more_proof') => {
    setActiveReasonPanel(type);
    setReasonText('');
    setCardError(null);
  };

  // Keyboard Navigation Bindings
  useEffect(() => {
    if (viewMode !== 'swipe' || activeTab !== 'submissions' || loading) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Bypass shortcut actions if inputs are focused
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (activeSwipeQueue.length === 0) return;
      const target = activeSwipeQueue[0];

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleSwipeApprove(target);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleOpenReasonPanel('rejected');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleOpenReasonPanel('needs_more_proof');
      } else if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        handleSwipeSkip(target);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, activeTab, loading, activeSwipeQueue, activeReasonPanel, isProcessingSwipe]);

  if (!isAdmin) {
    return <div className="p-8 text-center text-error font-mono">UNAUTHORIZED_ACCESS. ESCALATING...</div>;
  }

  const currentSwipeItem = activeSwipeQueue[0];

  return (
    <div className="page-scroll bg-surface px-4 py-8 sm:p-12 pb-32 relative overflow-x-hidden">
      
      {/* Dynamic Toast System */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -24, scale: 0.95 }}
            className={cn(
              "fixed top-6 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-2xl shadow-[4px_4px_0px_black] border-2 border-on-surface font-mono text-[10px] font-black uppercase text-center max-w-sm tracking-tight",
              toast.type === 'success' ? 'bg-brand-lime text-black border-black/80' : 
              toast.type === 'error' ? 'bg-error text-white border-black/85' : 'bg-[#EBF5FF] text-brand-blue border-brand-blue/30'
            )}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl uppercase tracking-tighter italic">Control_Booth</h1>
          <p className="micro-label opacity-40">Field Check & Entry Vetting Subsystem</p>
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

      {/* Navigation Tabs */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8 border-b-4 border-on-surface/10 pb-2 justify-between items-start sm:items-center">
        <div className="flex flex-wrap gap-2 sm:gap-4">
          <button
            onClick={() => setActiveTab('submissions')}
            className={cn(
              "px-6 py-3 font-display uppercase italic font-black transition-all text-sm sm:text-base",
              activeTab === 'submissions' ? "bg-on-surface text-white border-b-4 border-white shadow-[0_4px_0_var(--color-brand-orange)]" : "text-on-surface/40 hover:text-on-surface"
            )}
          >
            {totalCounts.pending_review > 0 && <span className="mr-2 bg-brand-orange text-white px-1.5 py-0.5 text-[10px] non-italic">{totalCounts.pending_review}</span>}
            Review_Queue
          </button>
          <button
            onClick={() => setActiveTab('evidence-audit')}
            className={cn(
              "px-6 py-3 font-display uppercase italic font-black transition-all text-sm sm:text-base",
              activeTab === 'evidence-audit' ? "bg-on-surface text-white border-b-4 border-white shadow-[0_4px_0_var(--color-brand-orange)]" : "text-on-surface/40 hover:text-on-surface"
            )}
          >
            {evidenceAuditEntries.length > 0 && <span className="mr-2 bg-brand-magenta text-white px-1.5 py-0.5 text-[10px] non-italic">{evidenceAuditEntries.length}</span>}
            Evidence_Audit
          </button>
          <button
            onClick={() => setActiveTab('checks')}
            className={cn(
              "px-6 py-3 font-display uppercase italic font-black transition-all text-sm sm:text-base",
              activeTab === 'checks' ? "bg-on-surface text-white border-b-4 border-white shadow-[0_4px_0_var(--color-brand-orange)]" : "text-on-surface/40 hover:text-on-surface"
            )}
          >
            {fieldChecks.length > 0 && <span className="mr-2 bg-brand-orange text-white px-1.5 py-0.5 text-[10px] non-italic">{fieldChecks.length}</span>}
            Field_Checks
          </button>
          <button
            onClick={() => setActiveTab('repair')}
            className={cn(
              "px-6 py-3 font-display uppercase italic font-black transition-all text-sm sm:text-base",
              activeTab === 'repair' ? "bg-on-surface text-white border-b-4 border-white shadow-[0_4px_0_var(--color-brand-magenta)]" : "text-on-surface/40 hover:text-on-surface"
            )}
          >
            System_Repair
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={cn(
              "px-6 py-3 font-display uppercase italic font-black transition-all text-sm sm:text-base",
              activeTab === 'audit' ? "bg-on-surface text-white border-b-4 border-white shadow-[0_4px_0_var(--color-brand-magenta)]" : "text-on-surface/40 hover:text-on-surface"
            )}
          >
            Points_Audit
          </button>
          <button
            onClick={() => setActiveTab('health')}
            className={cn(
              "px-6 py-3 font-display uppercase italic font-black transition-all text-sm sm:text-base",
              activeTab === 'health' ? "bg-on-surface text-white border-b-4 border-white shadow-[0_4px_0_var(--color-brand-lime)]" : "text-on-surface/40 hover:text-on-surface"
            )}
          >
            System_Health
          </button>
        </div>

        {activeTab === 'submissions' && !loading && (
          <div className="flex items-center bg-[#F2EEE8] border-2 border-on-surface p-1 rounded-2xl shadow-[2px_2px_0px_black] gap-1 shrink-0 mt-3 sm:mt-0">
            <button 
              onClick={() => setViewMode('swipe')}
              className={cn(
                "px-3 py-1 font-mono text-[10px] uppercase font-black rounded-lg transition-all",
                viewMode === 'swipe' ? "bg-on-surface text-white border border-on-surface shadow-[1px_1px_0px_black]" : "text-on-surface/50 hover:text-on-surface"
              )}
            >
              Swipe View
            </button>
            <button 
              onClick={() => setViewMode('queue')}
              className={cn(
                "px-3 py-1 font-mono text-[10px] uppercase font-black rounded-lg transition-all",
                viewMode === 'queue' ? "bg-on-surface text-white border border-on-surface shadow-[1px_1px_0px_black]" : "text-on-surface/50 hover:text-on-surface"
              )}
            >
              Queue View
            </button>
          </div>
        )}
      </div>

      {activeTab === 'submissions' && !loading && (
        <div className="flex flex-wrap gap-2 mb-6 items-center">
          {[
            { id: 'pending_review', label: 'Pending Review', color: 'orange' },
            { id: 'needs_more_proof', label: 'Needs More Proof', color: 'blue' },
            { id: 'rejected', label: 'Rejected / Awaiting Purge', color: 'red' },
            { id: 'approved', label: 'Approved / Archived', color: 'green' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setSubFilter(f.id as any)}
              className={cn(
                "px-4 py-2 rounded-xl border-2 font-mono text-[10px] uppercase font-black transition-all",
                subFilter === f.id 
                  ? "bg-on-surface text-white border-on-surface shadow-[4px_4px_0px_black]" 
                  : "bg-white text-on-surface/40 border-on-surface/10 hover:border-on-surface/30"
              )}
            >
              <div className="flex items-center gap-2">
                {f.label}
                <span className={cn(
                  "px-1.5 py-0.5 rounded-md text-[8px]",
                  subFilter === f.id ? "bg-white/20" : "bg-black/5"
                )}>
                  {totalCounts[f.id as keyof typeof totalCounts] || 0}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {activeTab === 'submissions' && !loading && (
        <AdminDiagnosticsPanel />
      )}

      {activeTab === 'submissions' ? (
        loading ? (
          <div className="flex justify-center p-12">
            <RefreshCw className="w-8 h-8 animate-spin opacity-20" />
          </div>
        ) : (activeReviews?.length || 0) === 0 ? (
          <Card className="p-12 text-center opacity-85 border-2 border-dashed border-on-surface/20 bg-[#F2EEE8]/30 max-w-lg mx-auto rounded-3xl shadow-sm my-8">
            <CheckCircle className="w-8 h-8 text-[#16A34A] mx-auto mb-3 opacity-60" />
            <h3 className="font-display text-lg uppercase italic font-black text-on-surface mb-1">
              {subFilter === 'pending_review' ? 'REVIEW QUEUE CLEAR' : `NO ${subFilter.toUpperCase()} RECORDS`}
            </h3>
            <p className="font-mono text-[10px] text-on-surface/50 max-w-sm mx-auto leading-relaxed">
              {subFilter === 'pending_review' ? (
                <>
                  All pending proofs have been vetted. 
                  {(totalCounts.rejected > 0 || totalCounts.needs_more_proof > 0) && (
                    <span className="block mt-2 font-bold text-brand-orange">
                      Note: {totalCounts.needs_more_proof} items in 'Needs More Proof' and {totalCounts.rejected} in 'Rejected' are not in the pending queue.
                    </span>
                  )}
                </>
              ) : `No proofs found in the current ${subFilter} selection.`}
            </p>
          </Card>
        ) : viewMode === 'swipe' ? (
          // --- STUNNING SWIPE REVIEW INTERFACE ---
          <div className="max-w-6/7 mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 items-start my-4">
            
            {/* Keyboard Shortcut Legends for desktop */}
            <div className="hidden md:block md:col-span-1 space-y-4 font-mono">
              <div className="bg-[#FCF9F2] border-2 border-on-surface rounded-2xl p-4 shadow-[4px_4px_0px_black]">
                <h4 className="text-xs font-bold uppercase text-brand-orange mb-3 flex items-center gap-1.5 leading-none">
                  <Zap className="w-3.5 h-3.5" /> Rapid Shortkeys
                </h4>
                <ul className="text-[10px] space-y-3 font-semibold text-on-surface/70">
                  <li className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-on-surface text-white rounded text-[8px]">→</span>
                    <span>Approve Submission</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-on-surface text-white rounded text-[8px]">←</span>
                    <span>Reject Submission</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-on-surface text-white rounded text-[8px]">↑</span>
                    <span>Request More Proof</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-on-surface text-white rounded text-[8px]">SPACE</span>
                    <span>Skip to next evidence</span>
                  </li>
                </ul>
              </div>

              {sessionReviewedCount > 0 && (
                <div className="bg-brand-lime/10 border-2 border-brand-lime/30 rounded-2xl p-4 text-[10px] space-y-1">
                  <p className="font-bold text-on-surface uppercase mb-1">Session Summary</p>
                  <p className="opacity-80">Processed files: <strong className="text-brand-orange">{sessionReviewedCount}</strong></p>
                  <p className="opacity-80">Skipped files: {skippedIds.size}</p>
                </div>
              )}

              {skippedIds.size > 0 && (
                <button
                  onClick={handleResetSkips}
                  className="w-full flex items-center justify-center gap-2 p-2.5 bg-on-surface/5 border border-on-surface rounded-xl text-[10px] uppercase font-bold hover:bg-on-surface hover:text-white transition-colors"
                >
                  <RefreshCw className="w-3 h-3" /> Return {skippedIds.size} skipped
                </button>
              )}
            </div>

            {/* Active Card Stack Wrapper */}
            <div className="col-span-1 md:col-span-2 flex flex-col items-center">
              
              {/* Progress Bar & Title */}
              <div className="w-full max-w-md flex justify-between items-center mb-4 px-2 font-mono text-[10px] font-black uppercase text-on-surface/60">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-brand-orange animate-ping" />
                  <span>ACTIVE DESK QUEUE</span>
                </div>
                <div>
                  {sessionReviewedCount} reviewed • {activeSwipeQueue.length} {subFilter} files
                </div>
              </div>

              <div className="relative w-full max-w-md min-h-[500px] h-auto aspect-[3/4.5] max-h-[85vh]">
                
                <AnimatePresence mode="popLayout">
                  {currentSwipeItem ? (
                    <motion.div
                      key={currentSwipeItem.id}
                      drag={!activeReasonPanel && !isProcessingSwipe}
                      dragDirectionLock
                      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                      dragElastic={0.8}
                      onDrag={handleDrag}
                      onDragEnd={async (e, info) => {
                        setDragDirection('none');
                        if (activeReasonPanel || isProcessingSwipe) return;
                        
                        const threshold = 120;
                        if (info.offset.x > threshold) {
                          handleSwipeApprove(currentSwipeItem);
                        } else if (info.offset.x < -threshold) {
                          handleOpenReasonPanel('rejected');
                        } else if (info.offset.y < -threshold) {
                          handleOpenReasonPanel('needs_more_proof');
                        }
                      }}
                      initial={{ scale: 0.95, opacity: 0, y: 15 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={
                        dragDirection === 'right' ? { x: 450, rotate: 15, opacity: 0 } :
                        dragDirection === 'left' ? { x: -450, rotate: -15, opacity: 0 } :
                        dragDirection === 'up' ? { y: -450, rotate: 0, opacity: 0 } :
                        { opacity: 0, scale: 0.9 }
                      }
                      transition={{ type: 'spring', damping: 18, stiffness: 125 }}
                      className="absolute inset-0 w-full h-full z-20 cursor-grab active:cursor-grabbing"
                    >
                      <Card className="h-full relative overflow-hidden flex flex-col justify-between border-4 border-on-surface bg-white shadow-[12px_12px_0px_black]">
                        
                        {/* Interactive Drag indicators / overlays */}
                        <AnimatePresence>
                          {dragDirection === 'right' && (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.7 }}
                              animate={{ opacity: 0.9, scale: 1 }}
                              exit={{ opacity: 0 }}
                              className="absolute inset-0 bg-brand-lime/10 border-8 border-brand-lime/50 z-40 rounded-[2rem] flex flex-col items-center justify-center select-none pointer-events-none"
                            >
                              <div className="p-4 border-4 border-brand-lime text-brand-lime font-display text-4xl rotate-[-12deg] tracking-widest font-black uppercase leading-none bg-white rounded-xl shadow-lg">
                                VERIFY PASS
                              </div>
                            </motion.div>
                          )}

                          {dragDirection === 'left' && (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.7 }}
                              animate={{ opacity: 0.9, scale: 1 }}
                              exit={{ opacity: 0 }}
                              className="absolute inset-0 bg-error/10 border-8 border-error/50 z-40 rounded-[2rem] flex flex-col items-center justify-center select-none pointer-events-none"
                            >
                              <div className="p-4 border-4 border-error text-error font-display text-3xl rotate-[12deg] tracking-widest font-black uppercase leading-none bg-white rounded-xl shadow-lg">
                                VERIFY FAILS
                              </div>
                            </motion.div>
                          )}

                          {dragDirection === 'up' && (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.7 }}
                              animate={{ opacity: 0.9, scale: 1 }}
                              exit={{ opacity: 0 }}
                              className="absolute inset-0 bg-brand-orange/10 border-8 border-brand-orange/50 z-40 rounded-[2rem] flex flex-col items-center justify-center select-none pointer-events-none"
                            >
                              <div className="p-4 border-4 border-brand-orange text-brand-orange font-display text-xl rotate-[-5deg] tracking-wider font-black uppercase leading-none bg-white rounded-xl shadow-lg text-center">
                                ERROR_GAP<br/>NEED DETAILS
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Card Error Alert Bar */}
                        {cardError && (
                          <div className="absolute top-2 left-2 right-2 bg-error/90 text-white border-2 border-black/80 font-mono text-[9px] font-bold p-2.5 z-40 flex items-center gap-1.5 shadow-md rounded-xl">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{cardError}</span>
                            <button onClick={() => setCardError(null)} className="ml-auto text-xs font-black select-none font-sans px-1">×</button>
                          </div>
                        )}

                        {/* Main Curation Card layout */}
                        <div className="flex-1 flex flex-col min-h-0 relative">
                                            {/* Image evidence container (approx 45% height) */}
                          <div className="h-[210px] bg-black border-2 border-on-surface overflow-hidden relative rounded-xl shrink-0">
                            <ProofImage 
                              entry={currentSwipeItem.entry} 
                            />

                            {/* Corner Overlays */}
                            <div className="absolute top-2 left-2 flex gap-1 z-30">
                              <FieldBadge variant="sticker" color="black" size="xs" className="text-[7px]">
                                {currentSwipeItem.entry?.uploadSource?.toUpperCase() || 'UNKNOWN'}
                              </FieldBadge>
                              {currentSwipeItem.entry?.metadataStatus === 'verified' && (
                                <FieldBadge variant="sticker" color="blue" size="xs" className="text-[7px]">GPS_VERIFIED</FieldBadge>
                              )}
                            </div>

                            <div className="absolute bottom-2 right-2 bg-black/80 text-white font-mono text-[7px] px-2 py-0.5 rounded uppercase font-bold border border-zinc-700 flex flex-col items-end gap-0.5">
                              <div>CONFIDENCE: {currentSwipeItem.confidenceScore || 0}%</div>
                              <div className="text-[5px] flex gap-1 opacity-60">
                                 <span>RID: {currentSwipeItem.id?.substring(0,8)}</span>
                                 <span>EID: {currentSwipeItem.entryId?.substring(0,8)}</span>
                                 <span>ST: {currentSwipeItem.status}</span>
                              </div>
                              <div className="text-[5px] flex gap-1 font-black">
                                 <span className={cn((currentSwipeItem as any).photoUrl || currentSwipeItem.entry?.photoUrl ? "text-brand-lime" : "text-error")}>
                                   PU: {(currentSwipeItem as any).photoUrl || currentSwipeItem.entry?.photoUrl ? 'OK' : 'MISSING'}
                                 </span>
                                 <span className={cn((currentSwipeItem as any).imageUrl || currentSwipeItem.entry?.imageUrl ? "text-brand-lime" : "text-error")}>
                                   IU: {(currentSwipeItem as any).imageUrl || currentSwipeItem.entry?.imageUrl ? 'OK' : 'MISSING'}
                                 </span>
                              </div>
                            </div>
                          </div>

                          {/* Text Data Layout (Scrollable if excessive notes) */}
                          <div className="flex-1 overflow-y-auto p-4 space-y-4 pt-3 min-h-0 select-text">
                            
                            {/* Mission Banner title and agent identities */}
                            <div className="border-b-2 border-dashed border-on-surface/15 pb-2">
                              <p className="micro-label opacity-40 uppercase tracking-widest text-[8px] mb-0.5">
                                Protocol: {currentSwipeItem.entry?.tripTitle || currentSwipeItem.challengeId}
                              </p>
                              <div className="flex justify-between items-start gap-2">
                                <h3 className="font-display text-lg uppercase italic font-black text-on-surface leading-tight truncate">
                                  {currentSwipeItem.entry?.userName || 'ID:' + currentSwipeItem.userId}
                                </h3>
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                  {(currentSwipeItem.entry as any)?.catalystTitle && (
                                    <FieldBadge variant="sticker" color={(currentSwipeItem.entry as any)?.catalystQualified ? "green" : "orange"} size="xs" className="text-[7px] border font-black">
                                      ✨ {(currentSwipeItem.entry as any).catalystTitle.toUpperCase()} {(currentSwipeItem.entry as any).catalystQualified ? `(${(currentSwipeItem.entry as any).catalystMultiplier}x)` : '(UNQUALIFIED)'}
                                    </FieldBadge>
                                  )}
                                  <FieldBadge variant="sticker" color="paper" size="xs" className="text-[7px] border shrink-0">
                                    EST_XP: {currentSwipeItem.entry?.estimatedPoints || "—"}
                                  </FieldBadge>
                                  {currentSwipeItem.entry?.findingType && (
                                    <FieldBadge variant="sticker" color="magenta" size="xs" className="text-[7px] border shrink-0 font-black">
                                      🔍 {currentSwipeItem.entry.findingType.toUpperCase()}
                                    </FieldBadge>
                                  )}
                                </div>
                              </div>
                              <p className="text-[8px] font-mono text-on-surface/40 leading-none mt-1">
                                Filed: {currentSwipeItem.entry?.createdAt?.toDate?.() ? currentSwipeItem.entry.createdAt.toDate().toLocaleString() : 'N/A'}
                              </p>
                            </div>

                            {/* Field Journal Entry notes */}
                            <div className="space-y-1">
                              <p className="text-[8px] font-mono text-on-surface/40 uppercase">Journal entry</p>
                              <div className="bg-on-surface/5 border border-on-surface/10 p-3 rounded-xl shadow-inner italic font-serif text-xs text-on-surface/90">
                                "{currentSwipeItem.entry?.fieldNote || 'No notes provided by agent.'}"
                              </div>
                            </div>

                            {currentSwipeItem.status === 'pending_review' && renderScoringControls(currentSwipeItem)}

                            {/* AI analysis report */}
                            <div className="space-y-1 bg-[#EEF2F6] border border-brand-blue/15 p-3 rounded-xl">
                              <div className="flex items-center justify-between">
                                <p className="text-[8px] font-mono text-brand-blue font-bold uppercase leading-none">Bureau AI recommendation</p>
                                <div className="flex gap-1.5">
                                  <button 
                                    onClick={() => handleRerunAI(currentSwipeItem).catch(err => console.error("Swiper AI rerun failed:", err))}
                                    disabled={rerunningId === currentSwipeItem.id}
                                    className="p-1 hover:bg-zinc-200 rounded transition-colors text-brand-orange flex items-center gap-1"
                                    title="Rerun analysis"
                                  >
                                    <RefreshCw className={cn("w-2.5 h-2.5", rerunningId === currentSwipeItem.id && "animate-spin")} />
                                  </button>
                                </div>
                              </div>
                              <p className="text-[10px] font-mono leading-relaxed text-zinc-700 mt-1">
                                {currentSwipeItem.reviewNotes || "No automatic review breakdown."}
                              </p>

                              {(currentSwipeItem as any).aiAnalysisResult && (
                                <div className="mt-2 pt-1 border-t border-dashed border-zinc-200">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-[7px] font-mono font-bold text-zinc-400 uppercase">Model: {(currentSwipeItem as any).aiAnalysisResult.modelUsed || 'unknown'}</span>
                                    <span className="text-[7px] font-mono font-bold text-zinc-400 uppercase">Match Score: {Math.round((currentSwipeItem as any).aiAnalysisResult.missionMatchScore || 0)}</span>
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {(currentSwipeItem as any).aiAnalysisResult.detectedItems?.slice(0, 5).map((item: string) => (
                                      <span key={item} className="text-[7px] px-1 bg-brand-green/10 text-brand-green font-mono border border-brand-green/20">+{item}</span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {(currentSwipeItem?.missingRequirements?.length || 0) > 0 && (
                                <div className="mt-2 pt-2 border-t border-dashed border-zinc-300 flex flex-wrap gap-1 items-center">
                                  <span className="text-[8px] font-bold text-error uppercase font-mono mr-1">Failed protocols:</span>
                                  {currentSwipeItem.missingRequirements?.map(req => (
                                    <span key={req} className="text-[8px] px-1 bg-error/10 text-error font-mono font-bold">-{req}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Inline custom reason pop panel (Overlay inside Card for density & ergonomic focus) */}
                        <AnimatePresence>
                          {activeReasonPanel && (
                            <motion.div 
                              initial={{ opacity: 0, y: 150 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 150 }}
                              className="absolute inset-x-0 bottom-0 top-[205px] bg-[#FAF8F5] border-t-4 border-on-surface z-30 p-4 flex flex-col justify-between"
                            >
                              <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                                <div className="flex justify-between items-center">
                                  <h4 className="text-[10px] font-mono font-black uppercase text-brand-orange flex items-center gap-1.5">
                                    <MessageSquare className="w-3.5 h-3.5" /> 
                                    {activeReasonPanel === 'rejected' ? "Violation Incident Report" : "Proof Resubmission Directive"}
                                  </h4>
                                  <button 
                                    onClick={() => setActiveReasonPanel(null)}
                                    className="p-1 hover:bg-on-surface/5 border border-on-surface/20 rounded font-mono text-[9px] uppercase font-bold"
                                  >
                                    Cancel
                                  </button>
                                </div>

                                <p className="text-[9px] text-on-surface/60 font-mono">
                                  Explain why this evidence fails checking protocol. Tap a preset tag or type below.
                                </p>

                                {/* Presets Quick Selection */}
                                <div className="flex flex-wrap gap-1.5 py-1">
                                  {activeReasonPanel === 'rejected' ? [
                                    "Blurry or illegible Photo proof",
                                    "Incorrect subject/target substance",
                                    "Verification location check failed",
                                    "Duplicate photo detected"
                                  ].map(preset => (
                                    <button
                                      key={preset}
                                      onClick={() => setReasonText(preset)}
                                      className="px-2 py-1 bg-white border-2 border-on-surface text-[8px] font-mono rounded-lg hover:bg-brand-orange hover:text-white hover:border-black active:scale-95 transition-all"
                                    >
                                      +{preset}
                                    </button>
                                  )) : [
                                    "Wider surrounding landscape shot needed",
                                    "Include physical handwritten agent-identifier note",
                                    "Perspective blurry – re-photograph closer",
                                    "GPS signal offset check failed – adjust position"
                                  ].map(preset => (
                                    <button
                                      key={preset}
                                      onClick={() => setReasonText(preset)}
                                      className="px-2 py-1 bg-white border-2 border-on-surface text-[8px] font-mono rounded-lg hover:bg-brand-orange hover:text-white hover:border-black active:scale-95 transition-all"
                                    >
                                      +{preset}
                                    </button>
                                  ))}
                                </div>

                                <textarea 
                                  className="w-full bg-white border-2 border-on-surface rounded-xl p-2.5 font-mono text-xs focus:ring-2 focus:ring-brand-orange outline-none"
                                  rows={3}
                                  placeholder={activeReasonPanel === 'rejected' ? "Custom violation notes..." : "Instructions for agent resubmission..."}
                                  value={reasonText}
                                  onChange={(e) => setReasonText(e.target.value)}
                                  autoFocus
                                />
                              </div>

                              <div className="pt-2 border-t-2 border-dashed border-on-surface/10 flex gap-2">
                                <button 
                                  onClick={() => setActiveReasonPanel(null)}
                                  className="flex-1 p-2 border-2 border-on-surface bg-white text-xs font-mono font-bold uppercase transition-transform active:translate-y-0.5 rounded-lg"
                                >
                                  Return
                                </button>
                                <button 
                                  onClick={() => handleSwipeRejectOrMoreProofSubmit(currentSwipeItem, activeReasonPanel)}
                                  disabled={isProcessingSwipe || !reasonText.trim()}
                                  className="flex-1 p-2 bg-on-surface text-white hover:bg-brand-orange transition-colors text-xs font-mono font-bold uppercase rounded-lg shadow-[2px_2px_0px_black] disabled:opacity-40"
                                >
                                  Authorize
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Tactical Action deck buttons (Accessibility counterparts) */}
                        <div className="p-4 bg-white border-t-4 border-on-surface shrink-0 z-10 rounded-b-[2rem]">
                          {currentSwipeItem.status === 'pending_review' ? (
                            <div className="grid grid-cols-4 gap-2">
                              <button 
                                onClick={() => handleSwipeRejectOrMoreProofSubmit(currentSwipeItem, 'rejected').catch(() => {
                                  // If clicked without panel open and reason is empty, trigger prompt/input rather than failing
                                  if (!activeReasonPanel) handleOpenReasonPanel('rejected');
                                })}
                                disabled={isProcessingSwipe}
                                className="flex flex-col items-center justify-center gap-1 p-2 border-2 border-on-surface bg-error/15 hover:bg-error hover:text-white transition-all rounded-xl cursor-pointer"
                              >
                                <X className="w-5 h-5" />
                                <span className="text-[8px] font-black uppercase font-mono">DENY</span>
                              </button>
                              
                              <button 
                                onClick={() => handleSwipeRejectOrMoreProofSubmit(currentSwipeItem, 'needs_more_proof').catch(() => {
                                  if (!activeReasonPanel) handleOpenReasonPanel('needs_more_proof');
                                })}
                                disabled={isProcessingSwipe}
                                className="flex flex-col items-center justify-center gap-1 p-2 border-2 border-on-surface bg-brand-orange/10 hover:bg-brand-orange hover:text-white transition-all rounded-xl cursor-pointer"
                              >
                                <ArrowUp className="w-5 h-5" />
                                <span className="text-[8px] font-black uppercase font-mono">MORE PROOF</span>
                              </button>

                              <button 
                                onClick={() => handleSwipeApprove(currentSwipeItem)}
                                disabled={isProcessingSwipe || !!activeReasonPanel}
                                className="flex flex-col items-center justify-center gap-1 p-2 border-2 border-on-surface bg-brand-lime text-black shadow-[3px_3px_0px_black] active:shadow-none hover:scale-105 active:translate-y-1 transition-all rounded-xl cursor-pointer"
                              >
                                <Check className="w-5 h-5" />
                                <span className="text-[8px] font-black uppercase font-mono">PASS_OK</span>
                              </button>

                              <button 
                                onClick={() => handleSwipeSkip(currentSwipeItem)}
                                disabled={isProcessingSwipe}
                                className="flex flex-col items-center justify-center gap-1 p-2 border-2 border-on-surface bg-[#F2EEE8] hover:bg-on-surface hover:text-white transition-all rounded-xl cursor-pointer"
                              >
                                <SkipForward className="w-5 h-5" />
                                <span className="text-[8px] font-black uppercase font-mono">SKIP</span>
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-2 py-2">
                               <p className="text-[10px] font-mono uppercase font-black text-on-surface/40">
                                 {currentSwipeItem.status === 'approved' ? 'Record Approved - Archival Mode' : 
                                  currentSwipeItem.status === 'rejected' ? 'Record Rejected - Awaiting Cleanup' :
                                  currentSwipeItem.status === 'needs_more_proof' ? 'Waiting for Agent Resubmission' : 'Review Finalized'}
                               </p>
                               <button 
                                 onClick={() => handleAction(currentSwipeItem, 'pending_review').catch(err => console.error("Swiper restoration failed:", err))}
                                 className="text-[10px] font-mono font-black uppercase text-brand-orange hover:underline border-2 border-brand-orange/20 px-4 py-2 rounded-xl"
                               >
                                 Restore to Pending Review
                               </button>
                            </div>
                          )}
                        </div>
                      </Card>
                    </motion.div>
                  ) : (
                    // --- ALL REVIEWS COMPLETED STATE ---
                    <motion.div 
                      key="empty-deck"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute inset-0 w-full h-full"
                    >
                      <Card className="h-full border-4 border-dashed border-on-surface/20 flex flex-col items-center justify-center p-8 text-center bg-white rounded-3xl">
                        <div className="w-16 h-16 rounded-full bg-brand-lime/10 flex items-center justify-center mb-4 border-2 border-dashed border-brand-lime">
                          <CheckCircle className="w-8 h-8 text-[#16A34A]" />
                        </div>
                        <h3 className="font-display text-xl uppercase italic font-black text-on-surface mb-2">
                          ALL CLEAR IN CONTROLS_BOOTH
                        </h3>
                        <p className="font-mono text-[10px] text-on-surface/50 max-w-xs leading-relaxed mb-6">
                          Excellent oversight. There are no pending evidence files to review protocol on your supervisor profile.
                        </p>

                        {(skippedIds.size > 0 || hiddenIds.size > 0) && (
                          <div className="space-y-2 w-full max-w-xs">
                            {skippedIds.size > 0 && (
                              <button 
                                onClick={handleResetSkips}
                                className="w-full py-2 border-2 border-on-surface bg-[#FCF9F2] text-[10px] font-mono font-black uppercase shadow-[2px_2px_0px_black] hover:bg-on-surface hover:text-white active:shadow-none active:translate-y-0.5 transition-all rounded-xl"
                              >
                                Recycle {skippedIds.size} skipped files
                              </button>
                            )}
                            {hiddenIds.size > 0 && (
                              <button 
                                onClick={() => {
                                  setHiddenIds(new Set());
                                  setSessionReviewedCount(0);
                                  showToast("Session records recycled", "info");
                                }}
                                className="w-full py-2 border border-on-surface text-[10px] font-mono font-medium uppercase text-on-surface/60 hover:text-on-surface rounded-xl"
                              >
                                Restore {hiddenIds.size} audited files to check
                              </button>
                            )}
                          </div>
                        )}
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Deck Stack Background Cards (Behind currentSwipeItem) */}
                {activeSwipeQueue.length > 1 && (
                  <div className="absolute inset-x-4 bottom-0 top-3 pointer-events-none select-none z-10">
                    {activeSwipeQueue.slice(1, 3).map((nextItem, idx) => {
                      const depth = idx + 1;
                      return (
                        <div
                          key={`stack-back-${nextItem.id}`}
                          style={{
                            transform: `scale(${1 - depth * 0.04}) translateY(${-depth * 10}px) rotate(${depth % 2 === 0 ? '-1.5deg' : '1.5deg'})`,
                            zIndex: 10 - depth,
                            opacity: 0.8 / depth,
                          }}
                          className="absolute inset-0 w-full h-full pointer-events-none opacity-60 rounded-3xl border-4 border-on-surface/20 bg-neutral-100 shadow-md flex items-end justify-center p-6"
                        >
                          <div className="w-full text-center font-mono text-[8px] text-on-surface/20 uppercase font-black tracking-widest mb-4">
                            stacked dispatch: #{nextItem.id.substring(0,6)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
              </div>
            </div>

            {/* General metrics and checklist on the right side */}
            <div className="hidden md:block md:col-span-1 space-y-4 font-mono">
              <div className="bg-[#FCF9F2] border-2 border-on-surface rounded-2xl p-4 shadow-[4px_4px_0px_black] text-[10px] space-y-2">
                <p className="font-bold text-on-surface uppercase mb-1">Curation Guideline</p>
                <div className="p-2 bg-on-surface/5 border rounded-lg max-h-[140px] overflow-y-auto leading-relaxed text-on-surface/75">
                  <p className="font-semibold text-brand-orange mb-1">Checklist Checklist:</p>
                  1. Match material authenticity<br/>
                  2. Verify lighting & GPS coordinates<br/>
                  3. Audit the handwritten callsign tag<br/>
                  4. Flag duplicates and blurry pictures<br/>
                </div>
              </div>

              {currentSwipeItem && currentSwipeItem.entry && (
                <div className="bg-brand-orange/5 border-2 border-brand-orange/20 rounded-2xl p-4 space-y-1">
                  <p className="text-[10px] font-bold text-brand-orange uppercase mb-1">Active File Specs</p>
                  <p className="text-[9px] text-on-surface/60">UID: <span className="font-bold">{currentSwipeItem.userId.substring(0,12)}...</span></p>
                  <p className="text-[9px] text-on-surface/60">ENTRY_ID: <span className="font-bold">{currentSwipeItem.entryId.substring(0,8)}...</span></p>
                  <p className="text-[9px] text-on-surface/60">STATION_SOURCE: <span className="font-bold uppercase text-brand-orange">{currentSwipeItem.entry?.uploadSource || 'Direct upload'}</span></p>
                  <p className="text-[9px] text-on-surface/60">GEOTAG_STATUS: <span className="font-bold uppercase">{currentSwipeItem.entry?.metadataStatus || 'unverified'}</span></p>
                </div>
              )}
            </div>

          </div>
        ) : (
          // --- EXISTING LIST/QUEUE VIEW RENDER (Filtered by subFilter) ---
          <div className="space-y-8">
            {activeReviews.map(r => (
              <ProofReviewCard 
                key={r.id} 
                review={r} 
                onApprove={() => handleAction(r, 'approved').catch(err => console.error("Archive approval failed:", err))}
                onReject={() => handleAction(r, 'rejected').catch(err => console.error("Archive rejection failed:", err))}
                onResubmit={() => handleAction(r, 'needs_more_proof').catch(err => console.error("Archive resubmission failed:", err))}
                onRestore={() => handleAction(r, 'pending_review').catch(err => console.error("Archive restoration failed:", err))}
                onRerunAI={() => handleRerunAI(r).catch(err => console.error("Archive AI rerun failed:", err))}
                isRerunning={rerunningId === r.id}
                scoringControls={r.status === 'pending_review' ? renderScoringControls(r) : null}
              />
            ))}
          </div>
        )
      ) : (
        // --- FIELD CHECKS ACTIVE VIEW ---
        loadingChecks ? (
          <div className="flex justify-center p-12">
            <RefreshCw className="w-8 h-8 animate-spin opacity-20" />
          </div>
        ) : fieldChecks.length === 0 ? (
          <Card className="p-12 text-center opacity-40 border-dashed">
            <p className="font-mono text-sm uppercase">No active field checks from agents.</p>
          </Card>
        ) : (
          <div className="space-y-6">
            {fieldChecks.map(check => (
              <FieldCheckAdminCard 
                key={check.id} 
                check={check}
                onResolve={(status) => handleResolveCheck(check.id, status)}
              />
            ))}
          </div>
        )
      )}
      {activeTab === 'repair' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <header className="space-y-2">
              <h2 className="text-3xl font-display font-black tracking-tighter uppercase italic">System Registry Repair</h2>
              <p className="text-xs font-mono font-bold text-on-surface/40 uppercase tracking-widest">Normalize User Mission Arrays & Orphaned Reviews</p>
           </header>

           {/* Starter Reset Repair Report */}
           <Card className="p-6 bg-rose-50 border-2 border-rose-500 shadow-[6px_6px_0px_black] rounded-[2rem] space-y-4">
              <div className="flex justify-between items-start border-b border-rose-200 pb-3">
                 <div className="space-y-1">
                    <h3 className="text-xl font-display font-black uppercase text-rose-600 flex items-center gap-2">
                       <Shield className="w-5 h-5 text-rose-500" />
                       Starter Reset Repair Report
                    </h3>
                    <p className="text-[10px] font-mono font-bold text-on-surface/50 uppercase tracking-widest">
                       Transparency Log // Global Soft Reset State
                    </p>
                 </div>
                 <button 
                    onClick={fetchStarterLog}
                    disabled={loadingStarterLog}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-rose-200 text-[8px] font-mono font-bold uppercase rounded-xl hover:bg-rose-100 transition-colors disabled:opacity-50"
                 >
                    <RefreshCw className={cn("w-3 h-3", loadingStarterLog && "animate-spin")} />
                    Refresh_Sync
                 </button>
              </div>

              {loadingStarterLog ? (
                 <div className="h-32 flex flex-col items-center justify-center">
                    <RefreshCw className="w-6 h-6 animate-spin text-rose-500 mb-2" />
                    <p className="text-[9px] font-mono font-black uppercase tracking-widest text-on-surface/40">Querying Reset Records...</p>
                 </div>
              ) : !starterResetLog ? (
                 <div className="p-4 text-center text-on-surface/50 text-[10px] font-mono uppercase">
                    No global starter reset transactions registered on-chain yet.
                 </div>
              ) : (
                 <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                       <div className="p-3 bg-white border border-rose-200 rounded-xl space-y-0.5 animate-in fade-in duration-300">
                          <span className="block text-[8px] font-mono font-black uppercase opacity-40">Agents Processed</span>
                          <strong className="text-xl font-display font-black text-rose-600">{starterResetLog.results.usersUpdated}</strong>
                       </div>
                       <div className="p-3 bg-white border border-rose-200 rounded-xl space-y-0.5 animate-in fade-in duration-300">
                          <span className="block text-[8px] font-mono font-black uppercase opacity-40">Submissions Archived</span>
                          <strong className="text-xl font-display font-black text-rose-600">{starterResetLog.results.submissionsArchived}</strong>
                       </div>
                       <div className="p-3 bg-white border border-rose-200 rounded-xl space-y-0.5 animate-in fade-in duration-300">
                          <span className="block text-[8px] font-mono font-black uppercase opacity-40">Reviews Updated</span>
                          <strong className="text-xl font-display font-black text-rose-600">{starterResetLog.results.proofReviewsUpdated}</strong>
                       </div>
                       <div className="p-3 bg-white border border-rose-200 rounded-xl space-y-0.5 animate-in fade-in duration-300">
                          <span className="block text-[8px] font-mono font-black uppercase opacity-40">Missions Aborted</span>
                          <strong className="text-xl font-display font-black text-rose-600">{starterResetLog.results.activeMissionsCleared}</strong>
                       </div>
                    </div>

                    <div className="p-4 bg-white border border-rose-200 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs animate-in fade-in duration-300">
                       <div className="space-y-1">
                          <span className="block text-[8px] font-mono font-black uppercase opacity-40">XP / Points Reconciliation (Option B)</span>
                          <strong className="text-sm font-display font-black text-rose-500">
                             {starterResetLog.results.xpReduced ? `REVERSED -${starterResetLog.results.totalSubtractions} XP` : "NO ACTIVE XP REVERSED"}
                          </strong>
                       </div>
                       <div className="text-right text-[10px] font-mono text-on-surface/60 space-y-0.5">
                          <div>
                             <span className="opacity-40 uppercase">Executed By: </span>
                             <span className="font-bold">{starterResetLog.adminUid.slice(0, 10)}...</span>
                          </div>
                          <div>
                             <span className="opacity-40 uppercase">Logged At: </span>
                             <span className="font-bold">
                                {starterResetLog.timestamp?.toDate ? formatSafeDateOnly(starterResetLog.timestamp.toDate()) : "starter-reset-2026-06-11"}
                             </span>
                          </div>
                       </div>
                    </div>
                 </div>
              )}
           </Card>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <section className="space-y-4">
                 <Card className="p-6 bg-white border-2 border-on-surface shadow-[6px_6px_0px_black] rounded-[2rem]">
                    <div className="space-y-6">
                       <div className="space-y-1">
                          <h3 className="text-lg font-display font-black uppercase">Individual User Repair</h3>
                          <p className="text-[10px] font-mono opacity-40 uppercase">Sync state for a single Agent UID</p>
                       </div>

                       <div className="space-y-3">
                          <input 
                             type="text" 
                             value={repairUid}
                             onChange={(e) => setRepairUid(e.target.value)}
                             placeholder="User UID (e.g. abc-123)"
                             className="w-full px-4 py-3 bg-on-surface/5 border-2 border-on-surface rounded-xl font-mono text-xs focus:ring-2 ring-brand-magenta outline-none"
                          />
                          <button 
                             onClick={handleRepairUser}
                             disabled={isRepairing}
                             className="w-full py-4 bg-on-surface text-white font-display font-black uppercase tracking-widest text-xs rounded-xl shadow-[4px_4px_0px_black] active:translate-y-1 active:shadow-none transition-all disabled:opacity-50"
                          >
                             {isRepairing ? 'REPAIRING_PROTOCOLS...' : 'Repair User State'}
                          </button>
                       </div>
                    </div>
                 </Card>

                 <Card className="p-6 bg-[#FFF2EA] border-2 border-brand-orange shadow-[6px_6px_0px_black] rounded-[2rem]">
                    <div className="space-y-6">
                       <div className="space-y-1">
                          <h3 className="text-lg font-display font-black uppercase text-brand-orange">Bulk System Sync</h3>
                          <p className="text-[10px] font-mono opacity-60 uppercase text-on-surface">Scan all users for state drift</p>
                       </div>

                       <p className="text-xs font-serif italic font-bold opacity-60 leading-relaxed">
                          This scans the entire user registry and regenerates mission arrays based on normalized entry statuses. Use this after major schema changes or status migrations.
                       </p>

                       <button 
                          onClick={handleRepairAll}
                          disabled={isRepairing}
                          className="w-full py-4 bg-brand-orange text-white font-display font-black uppercase tracking-widest text-xs rounded-xl shadow-[4px_4px_0px_black] active:translate-y-1 active:shadow-none transition-all disabled:opacity-50"
                       >
                          {isRepairing ? 'ESTABLISHING_TRUTH...' : 'Sync All Mission Protocols'}
                       </button>
                    </div>
                 </Card>

                 <Card className="p-6 bg-[#EBFDFF] border-2 border-brand-cyan shadow-[6px_6px_0px_black] rounded-[2rem]">
                    <div className="space-y-6">
                       <div className="space-y-1">
                          <h3 className="text-lg font-display font-black uppercase text-[#01579B]">Stranded Starter Repair</h3>
                          <p className="text-[10px] font-mono opacity-60 uppercase text-on-surface">Auto-restore blocked agents under 3/3 starter limit</p>
                       </div>

                       <p className="text-xs font-serif italic font-bold opacity-65 leading-relaxed text-on-surface">
                          This scans all agents, locating those with &lt; 3 approved starter missions whose decks have been marked exhausted. It flushes rejected starter missions out of submitted locks, sets them back to active/retryable status, resets activePlayableDeckId to 'starter-signals' and recalibrates deck state.
                       </p>

                       <div className="flex items-center gap-3 bg-white/50 p-2.5 rounded-xl border border-brand-cyan/25">
                          <input
                             type="checkbox"
                             id="strandedDryRunCheck"
                             checked={strandedStarterDryRun}
                             onChange={(e) => setStrandedStarterDryRun(e.target.checked)}
                             className="w-4 h-4 rounded text-[#00838F] border-[#00838F] focus:ring-0 cursor-pointer"
                          />
                          <label htmlFor="strandedDryRunCheck" className="text-[10px] font-mono uppercase font-bold tracking-wider cursor-pointer select-none text-on-surface/80">
                             Dry run (Do not modify data)
                          </label>
                       </div>

                       <button 
                          onClick={handleRepairStrandedStarter}
                          disabled={isRepairing}
                          className="w-full py-4 bg-brand-cyan hover:bg-brand-cyan/80 text-on-surface font-display font-black uppercase tracking-widest text-[#004D40] text-xs rounded-xl shadow-[4px_4px_0px_black] active:translate-y-1 active:shadow-none transition-all disabled:opacity-50"
                       >
                          {isRepairing ? 'RECONFIGURING_DECKS...' : 'Execute Stranded Repair'}
                       </button>
                    </div>
                 </Card>
              </section>

              <section className="space-y-4">
                 <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-brand-cyan" />
                    <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40">Repair Diagnostics</h3>
                 </div>

                 {repairReport || bulkReport || strandedStarterReport ? (
                    <div className="space-y-6">
                       {repairReport && (
                          <Card className="p-6 bg-white border-2 border-on-surface shadow-[6px_6px_0px_black] rounded-[2rem]">
                             <header className="pb-3 border-b border-on-surface/10 mb-4">
                                <h4 className="text-[10px] font-mono font-black uppercase text-brand-magenta">Individual Repair Telemetry</h4>
                             </header>
                             <div className="space-y-4">
                                <div className="flex justify-between items-center pb-2 border-b border-on-surface/5">
                                   <span className="text-[10px] font-mono font-black uppercase text-on-surface/40">Status</span>
                                   <span className="bg-brand-lime text-on-surface text-[8px] font-black px-2 py-0.5 rounded uppercase">SUCCESS</span>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                   {[
                                      { label: 'UID', value: repairReport.uid.substring(0, 8) + '...' },
                                      { label: 'Entries', value: repairReport.entriesCount },
                                      { label: 'Reviews', value: repairReport.reviewsCount },
                                      { label: 'Orphans Fixed', value: repairReport.orphansFixed },
                                      { label: 'Approved', value: repairReport.approvedCount },
                                      { label: 'Starter Apps', value: `${repairReport.starterApprovedCount}/3` }
                                   ].map((st, i) => (
                                      <div key={i} className="space-y-0.5">
                                         <p className="text-[8px] font-mono font-black opacity-30 uppercase">{st.label}</p>
                                         <p className="text-sm font-black italic">{st.value}</p>
                                      </div>
                                   ))}
                                </div>

                                <div className="pt-4 space-y-3">
                                   <div className="flex items-center justify-between p-3 bg-on-surface/5 rounded-xl border border-on-surface/5">
                                      <span className="text-[10px] font-black uppercase leading-none">Starter Deck Complete</span>
                                      <div className={cn("w-3 h-3 rounded-full border border-on-surface", repairReport.isStarterPackComplete ? "bg-brand-lime" : "bg-black/10")} />
                                   </div>
                                   <div className="flex items-center justify-between p-3 bg-on-surface/5 rounded-xl border border-on-surface/5">
                                      <span className="text-[10px] font-black uppercase leading-none">Heatwave Unlocked</span>
                                      <div className={cn("w-3 h-3 rounded-full border border-on-surface", repairReport.canUseHeatwaveDeck ? "bg-brand-orange" : "bg-black/10")} />
                                   </div>
                                </div>

                                {repairReport.errors.length > 0 && (
                                  <div className="p-3 bg-error/10 border border-error/20 rounded-xl">
                                     <p className="text-[9px] font-mono text-error font-black uppercase mb-1">Execution Errors</p>
                                     <ul className="list-disc pl-4 text-[9px] text-error opacity-80">
                                        {repairReport.errors.map((e: string, i: number) => <li key={i}>{e}</li>)}
                                     </ul>
                                  </div>
                                )}
                             </div>
                          </Card>
                       )}

                       {bulkReport && (
                          <Card className="p-6 bg-[#FFF2EA] border-2 border-brand-orange shadow-[6px_6px_0px_black] rounded-[2rem]">
                             <header className="pb-3 border-b border-brand-orange/20 mb-4">
                                <h4 className="text-[10px] font-mono font-black uppercase text-brand-orange">Bulk Repair System Telemetry</h4>
                             </header>
                             <div className="space-y-4">
                                <div className="flex justify-between items-center pb-2 border-b border-brand-orange/10">
                                   <span className="text-[10px] font-mono font-black uppercase text-on-surface/50">Execution Mode</span>
                                   <span className={cn(
                                      "text-[8px] font-black px-2 py-0.5 rounded uppercase border",
                                      bulkReport.dryRun 
                                         ? "bg-amber-100 text-amber-800 border-amber-300" 
                                         : "bg-emerald-100 text-emerald-800 border-emerald-300"
                                   )}>
                                      {bulkReport.dryRun ? 'DRY_RUN (SIMULATED)' : 'LIVE SYNC (COMMIT)'}
                                   </span>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                   {[
                                      { label: 'Scanned Agents', value: bulkReport.totalUsersScanned },
                                      { label: 'Scanned Proofs', value: bulkReport.totalSubmissionsScanned },
                                      { label: 'Missing Logs Rebuilt', value: bulkReport.proofReviewsCreated },
                                      { label: 'Statuses Normalized', value: bulkReport.entriesLinked },
                                      { label: 'Agents Sync Repaired', value: bulkReport.usersRepaired },
                                      { label: 'Skipped/Errors', value: bulkReport.skippedRecords }
                                   ].map((st, i) => (
                                      <div key={i} className="space-y-0.5">
                                         <p className="text-[8px] font-mono font-black opacity-40 uppercase text-on-surface">{st.label}</p>
                                         <p className="text-sm font-black italic text-brand-orange">{st.value}</p>
                                      </div>
                                   ))}
                                </div>

                                {bulkReport.warnings && bulkReport.warnings.length > 0 && (
                                   <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl overflow-hidden max-h-32 overflow-y-auto w-full">
                                      <p className="text-[9px] font-mono text-amber-700 font-black uppercase mb-1">System Warnings ({bulkReport.warnings.length})</p>
                                      <ul className="list-disc pl-4 text-[9px] text-amber-600 font-mono space-y-0.5">
                                         {bulkReport.warnings.slice(0, 15).map((w: string, i: number) => <li key={i}>{w}</li>)}
                                         {bulkReport.warnings.length > 15 && <li className="italic list-none pl-0">... and {bulkReport.warnings.length - 15} more</li>}
                                      </ul>
                                   </div>
                                )}

                                {bulkReport.errors && bulkReport.errors.length > 0 && (
                                   <div className="p-3 bg-red-50 border border-red-200 rounded-xl overflow-hidden max-h-32 overflow-y-auto w-full">
                                      <p className="text-[9px] font-mono text-charcoal font-black uppercase mb-1">Execution Failures ({bulkReport.errors.length})</p>
                                      <ul className="list-disc pl-4 text-[9px] text-red-600 font-mono space-y-0.5">
                                         {bulkReport.errors.map((e: string, i: number) => <li key={i}>{e}</li>)}
                                      </ul>
                                   </div>
                                )}
                             </div>
                          </Card>
                       )}

                       {strandedStarterReport && (
                          <Card className="p-6 bg-[#EBFDFF] border-2 border-brand-cyan shadow-[6px_6px_0px_black] rounded-[2rem]">
                             <header className="pb-3 border-b border-brand-cyan/20 mb-4">
                                <h4 className="text-[10px] font-mono font-black uppercase text-[#01579B]">Stranded Starter Repair Telemetry</h4>
                             </header>
                             <div className="space-y-4">
                                <div className="flex justify-between items-center pb-2 border-b border-brand-cyan/10">
                                   <span className="text-[10px] font-mono font-black uppercase text-on-surface/50">Execution Mode</span>
                                   <span className={cn(
                                      "text-[8px] font-black px-2 py-0.5 rounded uppercase border",
                                      strandedStarterReport.dryRun 
                                         ? "bg-amber-100 text-amber-800 border-amber-300" 
                                         : "bg-emerald-100 text-emerald-800 border-emerald-300"
                                   )}>
                                      {strandedStarterReport.dryRun ? 'DRY_RUN (SIMULATED)' : 'LIVE COMMIT (REPAIRED)'}
                                   </span>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                   {[
                                      { label: 'Scanned Agents', value: strandedStarterReport.totalUsersScanned },
                                      { label: 'Stranded Detected', value: strandedStarterReport.strandedDetected },
                                      { label: 'Agents Repaired', value: strandedStarterReport.usersRepaired },
                                      { label: 'Entries Updated', value: strandedStarterReport.entriesUpdated }
                                   ].map((st, i) => (
                                      <div key={i} className="space-y-0.5">
                                         <p className="text-[8px] font-mono font-black opacity-40 uppercase text-on-surface">{st.label}</p>
                                         <p className="text-sm font-black italic text-[#00838F]">{st.value}</p>
                                      </div>
                                   ))}
                                </div>

                                {strandedStarterReport.errors && strandedStarterReport.errors.length > 0 && (
                                   <div className="p-3 bg-red-50 border border-red-200 rounded-xl overflow-hidden max-h-32 overflow-y-auto w-full">
                                      <p className="text-[9px] font-mono text-charcoal font-black uppercase mb-1">Execution Failures ({strandedStarterReport.errors.length})</p>
                                      <ul className="list-disc pl-4 text-[9px] text-red-600 font-mono space-y-0.5">
                                         {strandedStarterReport.errors.map((e: string, i: number) => <li key={i}>{e}</li>)}
                                      </ul>
                                   </div>
                                )}
                             </div>
                          </Card>
                       )}
                    </div>
                 ) : (
                    <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-on-surface/10 rounded-[2rem] opacity-30">
                       <RefreshCw className="w-8 h-8 mb-4" />
                       <p className="text-[10px] font-mono font-black uppercase tracking-widest text-center px-8">Run repair to generate <br/> diagnostic telemetry</p>
                    </div>
                 )}
              </section>
           </div>
        </div>
      )}
      {activeTab === 'health' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <header className="space-y-2">
              <h2 className="text-3xl font-display font-black tracking-tighter uppercase italic">System Health & Canonical Audit</h2>
              <p className="text-xs font-mono font-bold text-on-surface/40 uppercase tracking-widest">Verify Data Integrity across Collections</p>
           </header>

           {loadingHealth ? (
             <div className="h-64 flex flex-col items-center justify-center">
                <RefreshCw className="w-8 h-8 animate-spin mb-4 text-on-surface" />
                <p className="text-[10px] font-mono font-black uppercase tracking-widest text-on-surface/40">Performing full system sweep...</p>
             </div>
           ) : !healthReport ? (
             <Card className="p-12 text-center opacity-40 border-dashed">
                <p className="font-mono text-sm uppercase">Audit report not loaded.</p>
             </Card>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <Card className="p-6 border-2 border-on-surface shadow-[4px_4px_0px_black] rounded-2xl bg-[#F0FDF4]">
                 <h3 className="text-lg font-display font-black uppercase mb-4 flex items-center gap-2">
                   <Users className="w-5 h-5" />
                   Users Health
                 </h3>
                 <div className="space-y-3 font-mono text-[11px]">
                   <div className="flex justify-between border-b border-black/10 pb-1">
                     <span className="opacity-50">TOTAL USERS:</span>
                     <span className="font-bold">{healthReport.users.total}</span>
                   </div>
                   <div className="flex justify-between border-b border-black/10 pb-1">
                     <span className="opacity-50">W/ LEGACY POINTS:</span>
                     <span className={cn("font-bold", healthReport.users.withLegacyPoints > 0 ? "text-rose-600" : "text-emerald-600")}>
                       {healthReport.users.withLegacyPoints}
                     </span>
                   </div>
                   <div className="flex justify-between border-b border-black/10 pb-1">
                     <span className="opacity-50">W/ XP CANONICAL:</span>
                     <span className="font-bold">{healthReport.users.withXp}</span>
                   </div>
                   {healthReport.users.withLegacyPoints > 0 && (
                     <button
                       onClick={handleRunMigration}
                       disabled={isMigrating}
                       className="w-full mt-4 py-2 bg-on-surface text-white rounded-xl font-bold uppercase text-[10px] shadow-[2px_2px_0px_black] active:shadow-none active:translate-y-0.5 disabled:opacity-50"
                     >
                       {isMigrating ? "Migrating..." : "Run Points -> XP Migration"}
                     </button>
                   )}
                 </div>
               </Card>

               <Card className="p-6 border-2 border-on-surface shadow-[4px_4px_0px_black] rounded-2xl bg-[#FEF2F2]">
                 <h3 className="text-lg font-display font-black uppercase mb-4 flex items-center gap-2">
                   <Gamepad2 className="w-5 h-5" />
                   Entries Health
                 </h3>
                 <div className="space-y-3 font-mono text-[11px]">
                   <div className="flex justify-between border-b border-black/10 pb-1">
                     <span className="opacity-50">TOTAL ENTRIES:</span>
                     <span className="font-bold">{healthReport.entries.total}</span>
                   </div>
                   <div className="flex justify-between border-b border-black/10 pb-1 text-rose-600">
                     <span className="opacity-50">UNPROCESSED APPROVALS:</span>
                     <span className="font-bold">{healthReport.unprocessedApprovals}</span>
                   </div>
                   <div className="flex justify-between border-b border-black/10 pb-1">
                     <span className="opacity-50">ORPHANED (NO REVIEW):</span>
                     <span className={cn("font-bold", healthReport.entries.orphaned > 0 ? "text-rose-600" : "text-emerald-600")}>
                       {healthReport.entries.orphaned}
                     </span>
                   </div>
                   <div className="flex justify-between border-b border-black/10 pb-1">
                     <span className="opacity-50">LEGACY POINTS AWARDED:</span>
                     <span className="font-bold">{healthReport.entries.withPointsAwarded}</span>
                   </div>
                   <div className="flex justify-between border-b border-black/10 pb-1">
                     <span className="opacity-50">CANONICAL XP AWARDED:</span>
                     <span className="font-bold">{healthReport.entries.withXpAwarded}</span>
                   </div>
                 </div>
               </Card>

               <Card className="p-6 border-2 border-on-surface shadow-[4px_4px_0px_black] rounded-2xl bg-[#FFF7ED]">
                 <h3 className="text-lg font-display font-black uppercase mb-4 flex items-center gap-2">
                   <ShieldAlert className="w-5 h-5" />
                   Review Pipeline
                 </h3>
                 <div className="space-y-3 font-mono text-[11px]">
                   <div className="flex justify-between border-b border-black/10 pb-1">
                     <span className="opacity-50">TOTAL REVIEWS:</span>
                     <span className="font-bold">{healthReport.proofReviews.total}</span>
                   </div>
                   <div className="flex justify-between border-b border-black/10 pb-1">
                     <span className="opacity-50">PENDING_REVIEW:</span>
                     <span className="font-bold text-amber-600">{healthReport.proofReviews.pending}</span>
                   </div>
                   <div className="flex justify-between border-b border-black/10 pb-1">
                     <span className="opacity-50">ORPHANED (NO ENTRY):</span>
                     <span className={cn("font-bold", healthReport.proofReviews.orphaned > 0 ? "text-rose-600" : "text-emerald-600")}>
                       {healthReport.proofReviews.orphaned}
                     </span>
                   </div>
                 </div>
               </Card>
             </div>
           )}
        </div>
      )}
      {activeTab === 'audit' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <header className="space-y-2">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-3xl font-display font-black tracking-tighter uppercase italic text-on-surface">Points & XP Audit Deck</h2>
                  <p className="text-xs font-mono font-bold text-on-surface/40 uppercase tracking-widest">Verify XP allocation integrity for the last 20 approved proofs</p>
                </div>
                <div className="flex gap-3">
                  <div className="bg-[#FAF8F5] border-2 border-brand-lime px-4 py-2 rounded-xl text-xs font-mono font-black uppercase text-on-surface flex items-center gap-2 shadow-[2px_2px_0px_black]">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    Healthy: {auditEntries.filter(e => {
                      const hasPointsVal = e.pointsAwarded && (typeof e.pointsAwarded === 'number' ? e.pointsAwarded > 0 : e.pointsAwarded === true);
                      const hasRawXp = e.awardedXP || (e as any).awardedXp || e.awardedPoints;
                      return hasPointsVal && hasRawXp;
                    }).length}
                  </div>
                  <div className="bg-rose-50 border-2 border-rose-500 px-4 py-2 rounded-xl text-xs font-mono font-black uppercase text-rose-600 flex items-center gap-2 shadow-[2px_2px_0px_black]">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    Missing Points: {auditEntries.filter(e => {
                      const hasNoPointsVal = !e.pointsAwarded || (typeof e.pointsAwarded === 'number' && e.pointsAwarded <= 0);
                      const hasNoRawXp = !e.awardedXP && !(e as any).awardedXp && !e.awardedPoints;
                      return hasNoPointsVal || hasNoRawXp;
                    }).length}
                  </div>
                </div>
              </div>
           </header>

           {loadingAudit ? (
             <div className="h-64 flex flex-col items-center justify-center">
                <RefreshCw className="w-8 h-8 animate-spin mb-4 text-on-surface" />
                <p className="text-[10px] font-mono font-black uppercase tracking-widest text-on-surface/40">Loading ledger data...</p>
             </div>
           ) : auditError ? (
             <div className="p-6 bg-rose-50 border-2 border-rose-500 text-rose-600 font-mono text-sm rounded-2xl flex items-center gap-3">
                <AlertCircle className="w-5 h-5" />
                <span>Ledger connection error: {auditError}</span>
             </div>
           ) : auditEntries.length === 0 ? (
             <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-on-surface/15 rounded-[2rem] opacity-40">
                <Database className="w-8 h-8 mb-4 text-on-surface" />
                <p className="text-[12px] font-mono font-black uppercase tracking-widest text-on-surface">No approved submissions found in database</p>
             </div>
           ) : (
             <div className="overflow-x-auto border-2 border-on-surface shadow-[6px_6px_0px_black] rounded-[2rem] bg-white text-on-surface">
                <table className="w-full text-left border-collapse min-w-[900px]">
                   <thead>
                      <tr className="bg-[#FAF8F5] border-b-2 border-on-surface text-[10px] font-mono font-black uppercase text-on-surface/50">
                         <th className="py-4 px-6">Entry / Proof</th>
                         <th className="py-4 px-6">Agent Information</th>
                         <th className="py-4 px-6">Mission Details</th>
                         <th className="py-4 px-6 font-mono">pointsAwarded field</th>
                         <th className="py-4 px-6 font-mono">XP Metrics</th>
                         <th className="py-4 px-6 text-center">Audit Status</th>
                         <th className="py-4 px-6 text-center">Action</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y border-on-surface/10">
                      {auditEntries.map((entry) => {
                         const hasPointsVal = entry.pointsAwarded && (typeof entry.pointsAwarded === 'number' ? entry.pointsAwarded > 0 : entry.pointsAwarded === true);
                         const hasRawXp = entry.awardedXP || (entry as any).awardedXp || entry.awardedPoints;
                         const isBrokenApproved = !hasPointsVal || !hasRawXp;

                         return (
                            <tr 
                               key={entry.id} 
                               className={cn(
                                  "text-xs transition-colors hover:bg-on-surface/5",
                                  isBrokenApproved ? "bg-red-50/70" : ""
                               )}
                            >
                               {/* Entry / Proof column */}
                               <td className="py-4 px-6 font-mono text-xs">
                                  <div className="flex items-center gap-3">
                                     <div className="w-12 h-12 bg-on-surface/5 border border-on-surface rounded-lg overflow-hidden shrink-0 relative">
                                        <ProofImage entry={entry} />
                                     </div>
                                     <div className="space-y-0.5">
                                        <p className="font-black text-on-surface">ID_{entry.id.substring(0, 8)}...</p>
                                        <p className="text-[9px] text-on-surface/40 uppercase">
                                           {entry.createdAt ? formatSafeDateOnly(entry.createdAt) : 'N/A'}
                                        </p>
                                     </div>
                                  </div>
                               </td>

                               {/* Agent Information column */}
                               <td className="py-4 px-6 font-mono text-xs">
                                  <div className="space-y-0.5">
                                     <p className="font-black text-on-surface italic">{entry.displayName || entry.userName || 'Anonymous Agent'}</p>
                                     <p className="text-[9px] text-on-surface/40">UID: {entry.userId || entry.uid}</p>
                                  </div>
                               </td>

                               {/* Mission Details column */}
                               <td className="py-4 px-6 font-mono text-xs">
                                  <div className="space-y-0.5 max-w-xs truncate">
                                     <p className="font-black text-on-surface uppercase truncate">{entry.tripTitle || entry.challengeTitle || 'Untitled Mission'}</p>
                                     <p className="text-[9px] text-brand-orange uppercase font-bold">ID: {entry.tripId || entry.missionId || entry.challengeId || 'N/A'}</p>
                                  </div>
                               </td>

                               {/* pointsAwarded field column */}
                               <td className="py-4 px-6 font-mono text-xs">
                                  <div className="flex items-center gap-1.5">
                                     <span className={cn(
                                        "font-black px-2 py-0.5 rounded text-[10px] uppercase border",
                                        (entry.pointsAwarded as any) === true ? "bg-[#FAF8F5] text-emerald-800 border-brand-lime" :
                                        typeof entry.pointsAwarded === 'number' && entry.pointsAwarded > 0 ? "bg-[#FAF8F5] text-amber-800 border-amber-300" :
                                        "bg-rose-100 text-rose-800 border-rose-300 animate-pulse"
                                     )}>
                                        {entry.pointsAwarded === undefined ? 'UNDEFINED' :
                                         entry.pointsAwarded === null ? 'NULL' :
                                         String(entry.pointsAwarded).toUpperCase()}
                                     </span>
                                     <span className="text-[9px] text-on-surface/40 text-on-surface">
                                        ({typeof entry.pointsAwarded})
                                     </span>
                                  </div>
                               </td>

                               {/* XP Metrics column */}
                               <td className="py-4 px-6 font-mono text-xs">
                                  <div className="space-y-1">
                                     <div className="flex items-center justify-between gap-1.5 max-w-[150px]">
                                        <span className="text-on-surface/40 text-[9px] text-on-surface">awardedXP:</span>
                                        <span className={cn(
                                           "font-black font-sans text-xs text-on-surface",
                                           (entry.awardedXP || 0) > 0 ? "text-brand-orange font-black text-on-surface" : "text-rose-600 font-extrabold"
                                        )}>
                                           {entry.awardedXP !== undefined ? `+${entry.awardedXP} XP` : 'MISSING'}
                                        </span>
                                     </div>
                                     <div className="flex items-center justify-between gap-1.5 max-w-[150px]">
                                        <span className="text-on-surface/40 text-[9px]">awardedXp:</span>
                                        <span className={cn(
                                           "font-black font-sans text-xs text-on-surface",
                                           ((entry as any).awardedXp || 0) > 0 ? "text-on-surface font-semibold text-on-surface" : "text-on-surface/30"
                                        )}>
                                           {(entry as any).awardedXp !== undefined ? `+${(entry as any).awardedXp} XP` : 'MISSING'}
                                        </span>
                                     </div>
                                     <div className="flex items-center justify-between gap-1.5 max-w-[150px]">
                                        <span className="text-on-surface/40 text-[9px]">awardedPoints:</span>
                                        <span className="text-xs text-on-surface/40 font-mono text-on-surface">
                                           {entry.awardedPoints !== undefined ? `+${entry.awardedPoints} XP` : 'MISSING'}
                                        </span>
                                     </div>
                                  </div>
                               </td>

                               {/* Audit Status column */}
                               <td className="py-4 px-6 text-center">
                                  {isBrokenApproved ? (
                                     <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-rose-300 shadow-[2px_2px_0px_#EF4444] animate-pulse">
                                        <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                                        ANOMALY: MISSING_POINTS
                                     </span>
                                  ) : (
                                     <span className="inline-flex items-center gap-1 bg-[#FAF8F5] text-emerald-800 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-brand-lime shadow-[2px_2px_0px_#10B981]">
                                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                                        VERIFIED_LEDGER
                                     </span>
                                  )}
                               </td>

                               {/* Action column */}
                               <td className="py-4 px-6 text-center">
                                  <button
                                     onClick={() => handleAuditRepairUser(entry.userId || entry.uid)}
                                     disabled={isAuditingRepairUid !== null}
                                     className={cn(
                                        "py-2 px-3 font-display uppercase italic font-black text-[10px] rounded-lg border-2 border-on-surface transition-all flex items-center justify-center gap-1 mx-auto shadow-[2px_2px_0_black] active:translate-y-0.5 active:shadow-none",
                                        isBrokenApproved 
                                           ? "bg-brand-magenta text-white shadow-[2px_2px_0_black]" 
                                           : "bg-white text-on-surface hover:bg-on-surface/5"
                                     )}
                                  >
                                     {isAuditingRepairUid === (entry.userId || entry.uid) ? (
                                        <>
                                           <RefreshCw className="w-3 h-3 animate-spin text-on-surface" />
                                           SYNCING...
                                        </>
                                     ) : (
                                        <>
                                           <Zap className="w-3 h-3" />
                                           {isBrokenApproved ? 'REPAIR_POINTS' : 'FORCE_SYNC'}
                                        </>
                                     )}
                                  </button>
                               </td>
                            </tr>
                         );
                      })}
                   </tbody>
                </table>
             </div>
           )}
        </div>
      )}
      {activeTab === 'evidence-audit' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 text-on-surface">
           <header className="space-y-2">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                 <div>
                    <h2 className="text-3xl font-display font-black tracking-tighter uppercase italic text-on-surface">Evidence Points Audit</h2>
                    <p className="text-xs font-mono font-bold opacity-40 uppercase tracking-widest text-on-surface">
                       Scan of approved submissions with missing points attribution ('pointsAwarded: false')
                    </p>
                 </div>
                 <button
                    onClick={fetchEvidenceAudit}
                    disabled={loadingEvidenceAudit}
                    className="flex items-center gap-1.5 px-4 py-2 bg-white border-2 border-on-surface rounded-xl text-xs font-mono font-black uppercase hover:bg-on-surface/5 transition-colors shadow-[4px_4px_0px_black] active:translate-y-0.5 active:shadow-none"
                 >
                    <RefreshCw className={cn("w-4 h-4", loadingEvidenceAudit && "animate-spin")} />
                    RE-SCAN SYSTEM
                 </button>
              </div>
           </header>

           {loadingEvidenceAudit ? (
              <div className="h-64 flex flex-col items-center justify-center">
                 <RefreshCw className="w-8 h-8 animate-spin mb-4 text-on-surface" />
                 <p className="text-[10px] font-mono font-black uppercase tracking-widest opacity-40">Scanning archives...</p>
              </div>
           ) : evidenceAuditError ? (
              <div className="p-6 bg-rose-50 border-2 border-rose-500 text-rose-600 font-mono text-sm rounded-2xl flex items-center gap-3">
                 <AlertCircle className="w-5 h-5 block animate-bounce" />
                 <span>Ledger scan error: {evidenceAuditError}</span>
              </div>
           ) : evidenceAuditEntries.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-on-surface/15 rounded-[2rem] opacity-60 bg-emerald-50/50 p-6">
                 <CheckCircle className="w-12 h-12 mb-4 text-emerald-600" />
                 <p className="text-sm font-display font-black uppercase text-emerald-800">No Orphaned Submissions Found!</p>
                 <p className="text-[10px] font-mono text-on-surface/50 uppercase tracking-widest mt-1">all approved proofs are correctly credited in the system</p>
              </div>
           ) : (
              <div className="space-y-4">
                 <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-700 shrink-0" />
                    <p className="text-xs font-mono text-amber-900 font-bold uppercase leading-relaxed">
                       ANOMALY DETECTED: {evidenceAuditEntries.length} APPROVED SUBMISSIONS WITHOUT ACCREDITED POINTS. USE THE BUTTONS BELOW TO RECONCILE INDIVIDUAL RECHARGES.
                    </p>
                 </div>

                 <div className="overflow-x-auto border-2 border-on-surface shadow-[6px_6px_0px_black] rounded-[2rem] bg-white text-on-surface">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                       <thead>
                          <tr className="bg-[#FAF8F5] border-b-2 border-on-surface text-[10px] font-mono font-black uppercase text-on-surface/50">
                             <th className="py-4 px-6 text-on-surface">Entry / Proof</th>
                             <th className="py-4 px-6 text-on-surface">Agent Information</th>
                             <th className="py-4 px-6 text-on-surface">Mission Details</th>
                             <th className="py-4 px-6 text-on-surface">Status Info</th>
                             <th className="py-4 px-6 text-center text-on-surface">Action</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y border-on-surface/10">
                          {evidenceAuditEntries.map((entry) => (
                             <tr key={entry.id} className="text-xs transition-colors hover:bg-on-surface/5 bg-amber-50/20">
                                <td className="py-4 px-6 font-mono text-xs">
                                   <div className="flex items-center gap-3">
                                      <div className="w-12 h-12 bg-on-surface/5 border border-on-surface rounded-lg overflow-hidden shrink-0 relative">
                                         <ProofImage entry={entry} />
                                      </div>
                                      <div className="space-y-0.5">
                                         <p className="font-black text-on-surface">ID_{entry.id.substring(0, 8)}...</p>
                                         <p className="text-[9px] text-on-surface/40 uppercase">
                                            {entry.createdAt ? formatSafeDateOnly(entry.createdAt) : 'N/A'}
                                         </p>
                                      </div>
                                   </div>
                                </td>

                                <td className="py-4 px-6 font-mono text-xs text-on-surface">
                                   <div className="space-y-0.5">
                                      <p className="font-black text-on-surface italic">{entry.displayName || entry.userName || 'Anonymous Agent'}</p>
                                      <p className="text-[9px] text-on-surface/40">UID: {entry.userId || entry.uid}</p>
                                   </div>
                                </td>

                                <td className="py-4 px-6 font-mono text-xs text-on-surface">
                                   <div className="space-y-0.5 max-w-xs truncate">
                                      <p className="font-black text-on-surface uppercase truncate">{entry.tripTitle || entry.challengeTitle || 'Untitled Mission'}</p>
                                      <p className="text-[9px] text-brand-orange uppercase font-bold">ID: {entry.tripId || entry.missionId || entry.challengeId || 'N/A'}</p>
                                   </div>
                                </td>

                                <td className="py-4 px-6 font-mono text-xs text-on-surface">
                                   <div className="space-y-1">
                                      <div className="flex items-center gap-1">
                                         <span className="text-[9px] opacity-40 uppercase">Points Status:</span>
                                         <span className="font-mono bg-rose-100 text-rose-800 text-[9px] font-black uppercase px-2 py-0.5 rounded border border-rose-200">
                                            {String(entry.pointsAwarded)}
                                         </span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                         <span className="text-[9px] opacity-40 uppercase">Assumed XP:</span>
                                         <span className="font-bold text-rose-600 font-sans">
                                            +{entry.awardedXP || (entry as any).xpAwarded || entry.estimatedPoints || 100} XP
                                         </span>
                                      </div>
                                   </div>
                                </td>

                                <td className="py-4 px-6 text-center">
                                   <button
                                      onClick={() => handleAwardPointsForOrphan(entry.id)}
                                      disabled={processingEvidenceAuditId !== null}
                                      className="py-2 px-4 shadow-[2px_2px_0px_black] active:shadow-none active:translate-y-0.5 border-2 border-on-surface bg-[#EC4899] hover:bg-[#D946EF] text-white font-display uppercase italic font-black text-xs disabled:opacity-40 transition-all rounded-xl hover:scale-[1.02]"
                                   >
                                      {processingEvidenceAuditId === entry.id ? (
                                         <span className="flex items-center justify-center gap-1.5 font-sans lowercase">
                                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" /> awarding...
                                         </span>
                                      ) : (
                                         <span className="flex items-center justify-center gap-1">
                                            <Zap className="w-3.5 h-3.5" /> RE-AWARD POINTS
                                         </span>
                                      )}
                                   </button>
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </div>
           )}
        </div>
      )}
    </div>
  );
}

// --- KEEPING EXISTING SUBCOMPONENTS UNTOUCHED/PRISTINE ---

function FieldCheckAdminCard({ check, onResolve }: { check: FieldCheck & { entry?: Entry }, onResolve: (status: FieldCheckStatus) => void }) {
  return (
    <Card className="p-6 border-2 border-on-surface hover:shadow-[8px_8px_0px_black] transition-all bg-white">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="md:w-1/4 h-48 bg-paper-dark border-4 border-on-surface overflow-hidden relative">
          <ProofImage entry={check.entry} />
          <div className="absolute top-2 left-2 bg-on-surface text-white px-1.5 py-0.5 text-[8px] font-black uppercase italic">
            ID_{check.submissionId.substring(0, 4)}
          </div>
        </div>

        <div className="md:w-3/4 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="micro-label opacity-40 uppercase mb-1">REPORTER: {check.reporterUid}</p>
              <p className="micro-label opacity-40 uppercase mb-1">SUBJECT: {check.reportedUserId} | MISSION: {check.missionId}</p>
              <h3 className="font-display text-2xl uppercase italic font-black text-brand-orange leading-none mb-1">
                {check.reason.toUpperCase()}
              </h3>
              <p className="text-[10px] font-mono text-on-surface/40">
                Awaiting Review (Received: {check.createdAt?.toDate().toLocaleString()})
              </p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => onResolve('reviewed')}
                className="p-2 border-2 border-on-surface bg-brand-lime text-black shadow-[4px_4px_0px_black] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all flex items-center gap-2 font-display text-xs uppercase font-black italic"
              >
                <CheckCircle className="w-4 h-4" /> MARK_REVIEWED
              </button>
              <button 
                onClick={() => onResolve('dismissed')}
                className="p-2 border-2 border-on-surface bg-white text-on-surface shadow-[4px_4px_0px_black] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all flex items-center gap-2 font-display text-xs uppercase font-black italic"
              >
                <X className="w-4 h-4" /> DISMISS
              </button>
              <button 
                onClick={() => onResolve('action_needed')}
                className="p-2 border-2 border-on-surface bg-brand-orange text-white shadow-[4px_4px_0px_black] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all flex items-center gap-2 font-display text-xs uppercase font-black italic"
              >
                <Flag className="w-4 h-4" /> ACTION_NEEDED
              </button>
            </div>
          </div>

          <div className="bg-paper-dark p-4 border-l-4 border-brand-orange italic shadow-inner">
            <p className="font-serif text-lg leading-relaxed text-on-surface/80">
              "{check.note}"
            </p>
          </div>

          <div className="flex gap-4">
            <div className="p-3 bg-on-surface/5 border border-on-surface/10 rounded flex-1">
              <p className="micro-label opacity-40 uppercase mb-2">Original Field Note</p>
              <p className="text-xs font-serif italic text-on-surface/60">
                "{check.entry?.fieldNote || 'No notes.'}"
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

interface ProofReviewCardProps {
  review: ProofReview & { entry?: Entry };
  onApprove: () => Promise<void> | void;
  onReject: () => Promise<void> | void;
  onResubmit: () => Promise<void> | void;
  onRestore: () => Promise<void> | void;
  onRerunAI: () => Promise<void> | void;
  isRerunning?: boolean;
  scoringControls?: React.ReactNode;
  key?: string | number;
}

function ProofReviewCard({ review, onApprove, onReject, onResubmit, onRestore, onRerunAI, isRerunning, scoringControls }: ProofReviewCardProps) {
  const [showAnalysis, setShowAnalysis] = useState(false);
  const isCached = review.id.startsWith('cached_');

  const entry: any = review.entry || {};
  
  // Backward and forward compatible variable extraction
  const proofTrustScore = review.verification?.proofTrustScore ?? (review as any).proofTrustScore ?? entry.proofTrustScore ?? 70;
  const aiRiskScore = review.verification?.aiRiskScore ?? (review as any).aiRiskScore ?? entry.aiRiskScore ?? 20;
  
  // Make risk level human readable capitalization (low -> Low, medium -> Medium, high -> High)
  const baseRiskLevel = review.verification?.riskLevel ?? (review as any).riskLevel ?? entry.riskLevel ?? 'low';
  const riskLevelFormatted = baseRiskLevel.charAt(0).toUpperCase() + baseRiskLevel.slice(1).toLowerCase();

  const riskReasons = review.verification?.riskReasons ?? (review as any).riskReasons ?? entry.riskReasons ?? [];
  const metadataSummaryText = review.metadataSummary ?? (review as any).metadataSummary ?? entry.metadataSummary ?? '';
  const duplicateWarningText = (review.verification?.duplicateStatus !== 'none') ? (review.verification?.duplicateStatus ?? (review as any).duplicateWarning ?? entry.duplicateWarning ?? null) : null;
  const duplicateReusedDescText = (review as any).duplicateReusedDesc ?? entry.duplicateReusedDesc ?? null;
  const receiptChallengeResultText = review.verification?.receiptChallengeResult ?? (review as any).receiptChallengeResult ?? entry.receiptChallengeResult ?? 'unverified';

  const challengeCode = review.proofChallengeCode ?? entry.proofChallengeCode ?? null;
  const challengeInstruction = review.proofChallengeInstruction ?? entry.proofChallengeInstruction ?? null;

  const getRubberStamp = () => {
    if (review.status === 'approved') {
      return (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-[5px] border-emerald-500/80 text-emerald-500/80 rounded-xl px-5 py-2 font-display text-4xl font-black uppercase tracking-widest rotate-[-15deg] pointer-events-none z-30 select-none mix-blend-multiply opacity-85 text-center leading-none bg-white/70 shadow-sm">
          APPROVED
        </div>
      );
    }
    if (review.status === 'rejected') {
      return (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-[5px] border-red-500/80 text-red-500/80 rounded-xl px-5 py-2 font-display text-4xl font-black uppercase tracking-widest rotate-[12deg] pointer-events-none z-30 select-none mix-blend-multiply opacity-85 text-center leading-none bg-white/70 shadow-sm">
          REJECTED
        </div>
      );
    }
    if (review.status === 'needs_more_proof' || (review.status as any) === 'needsMoreProof') {
      return (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-[5px] border-amber-500/80 text-amber-500/80 rounded-xl px-3 py-2 font-display text-2xl font-black uppercase tracking-widest rotate-[-6deg] pointer-events-none z-30 select-none mix-blend-multiply opacity-85 text-center leading-none bg-white/70 shadow-sm">
          MORE PROOF
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="overflow-hidden border-2 border-on-surface/10 bg-paper">
      <div className="flex flex-col md:flex-row h-full">
        {/* Visual Proof */}
        <div className="md:w-1/3 h-64 md:h-auto bg-black relative border-b md:border-b-0 md:border-r border-on-surface/10">
          {getRubberStamp()}
          <ProofImage entry={review.entry} />
          
          <div className="absolute top-2 left-2 flex gap-1 z-30">
            <FieldBadge variant="sticker" color="black" size="xs" className="text-[7px]">
              {(review.captureSource || review.entry?.uploadSource || 'camera').toUpperCase()}
            </FieldBadge>
            {(review.metadata?.hasExif || review.entry?.metadataStatus === 'verified') && (
              <FieldBadge variant="sticker" color="blue" size="xs" className="text-[7px]">EXIF_OK</FieldBadge>
            )}
          </div>
        </div>

        {/* Audit Details */}
        <div className="md:w-2/3 p-6 flex flex-col justify-between">
          <div className="space-y-6">
            <header className="flex justify-between items-start border-b border-on-surface/5 pb-3">
              <div className="space-y-1 text-left">
                <h3 className="font-display text-2xl font-black uppercase tracking-tight text-on-surface">
                  Proof Review
                </h3>
                <p className="font-mono text-[9px] uppercase opacity-45">
                  ID: {review.id} // TARGET MISSION: {review.challengeId}
                </p>
                <p className="font-sans text-xs font-semibold text-on-surface/60 mt-0.5">
                  Explorer Agent: {review.entry?.userName || 'Anonymous Field Scout'} (ID: {review.userId})
                </p>
              </div>
              <div className="flex flex-col gap-1 items-end">
                {isCached && (
                  <FieldBadge variant="sticker" color="blue" size="xs" className="text-[7px]">CACHED_MD5</FieldBadge>
                )}
                {review.entry?.findingType && (
                  <FieldBadge variant="sticker" color="magenta" size="xs" className="text-[8px] font-black">
                    🔍 {review.entry.findingType.toUpperCase()}
                  </FieldBadge>
                )}
              </div>
            </header>

            {/* Core Stats Section (Specs: Status, Trust Score, AI Risk) */}
            <div className="space-y-2 p-4 border-2 border-on-surface/10 bg-on-surface/[0.02] rounded-xl text-left font-mono">
              <div className="text-xs flex justify-between border-b border-on-surface/5 pb-2">
                <span className="opacity-65 uppercase font-bold text-[10px]">Status:</span>
                <span className={cn(
                  "font-black uppercase tracking-wider text-[10px]",
                  review.status === 'approved' ? "text-emerald-500" :
                  review.status === 'pending_review' ? "text-amber-500" : "text-red-500"
                )}>
                  {review.status === 'pending_review' ? 'Pending Review' : 
                   review.status === 'needs_more_proof' ? 'Needs More Proof' : 
                   review.status.replace('_', ' ')}
                </span>
              </div>
              <div className="text-xs flex justify-between border-b border-on-surface/5 pb-2">
                <span className="opacity-65 uppercase font-bold text-[10px]">Trust Score:</span>
                <span className={cn(
                  "font-black text-[11px]",
                  proofTrustScore > 75 ? "text-emerald-500" : proofTrustScore > 45 ? "text-amber-500" : "text-red-500"
                )}>
                  {proofTrustScore} / 100
                </span>
              </div>
              <div className="text-xs flex justify-between">
                <span className="opacity-65 uppercase font-bold text-[10px]">AI Risk:</span>
                <span className={cn(
                  "font-black text-[11px]",
                  baseRiskLevel === 'high' ? "text-red-500" : baseRiskLevel === 'medium' ? "text-amber-500" : "text-emerald-500"
                )}>
                  {riskLevelFormatted}
                </span>
              </div>
            </div>

            {/* Why flagged List */}
            {riskReasons.length > 0 && (
              <div className="space-y-1.5 text-left p-3 border border-red-500/20 bg-red-500/[0.01] rounded-lg">
                <h4 className="text-[10px] font-mono font-black uppercase tracking-wider text-red-500 flex items-center gap-1">
                  ⚠️ Why flagged:
                </h4>
                <ul className="list-none space-y-1 pl-1">
                  {riskReasons.map((reason: string, i: number) => (
                    <li key={i} className="text-xs font-mono text-on-surface/85 flex items-start gap-1 leading-snug">
                      <span className="text-red-500/70 font-bold select-none">-</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Expected Receipt Details Panel */}
            {challengeCode && (
              <div className="p-4 bg-brand-orange/[0.02] border-2 border-brand-orange/15 rounded-xl space-y-1.5 text-left font-mono">
                <h4 className="text-[10px] font-black uppercase text-brand-orange tracking-wider">
                  🎫 Expected receipt:
                </h4>
                <div className="text-xs space-y-1 text-on-surface/90">
                  <p><span className="opacity-65 font-bold">Code:</span> {challengeCode}</p>
                  {challengeInstruction && (
                    <p className="leading-relaxed">
                      <span className="opacity-65 font-bold">Instruction:</span> {challengeInstruction}
                    </p>
                  )}
                  <p className="pt-1.5 border-t border-dashed border-brand-orange/15 flex items-center gap-1.5 text-[10px]">
                    <span className="opacity-65 font-bold uppercase text-[9px]">Receipt Result:</span>
                    <span className={cn(
                      "font-bold uppercase text-[9px] px-1.5 py-0.5 rounded",
                      receiptChallengeResultText === 'matched_by_ai' || receiptChallengeResultText === 'matched_in_note'
                        ? "bg-emerald-500/10 text-emerald-500"
                        : "bg-red-500/10 text-red-500"
                    )}>
                      {receiptChallengeResultText === 'matched_by_ai' ? '✓ Auto-Confirmed by AI' : 
                       receiptChallengeResultText === 'matched_in_note' ? '✓ Verified in Field Note' : 
                       receiptChallengeResultText === 'missing' ? '✗ NOT DETECTED' : 'Awaiting Check'}
                    </span>
                  </p>
                </div>
              </div>
            )}

            {/* Duplicate Alarms (if any) */}
            {duplicateWarningText && (
              <div className="p-3 bg-red-500/5 border-2 border-red-500/20 rounded-lg text-left font-mono">
                <span className="text-[9px] font-black uppercase text-red-500 tracking-wider">🚨 DUPLICATE SYSTEM MATCH DETECTED</span>
                <p className="text-xs text-on-surface/85 mt-1 leading-relaxed">{duplicateReusedDescText || 'Exact match with historical record.'}</p>
              </div>
            )}

            {/* Extra Visual context blocks in split cols */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Field Note */}
              <div className="p-3 bg-on-surface/5 border border-on-surface/10 rounded-lg text-left">
                <p className="micro-label opacity-40 uppercase mb-2">Field Journal Entry Text</p>
                <p className="text-sm font-serif italic leading-relaxed text-on-surface/80">
                  "{review.fieldNote || review.entry?.fieldNote || 'No journal written in the wild.'}"
                </p>
              </div>

              {/* Bureau Notes summary */}
              <div className="p-3 bg-on-surface/5 border border-on-surface/10 rounded-lg text-left font-mono space-y-2">
                <div className="flex items-center justify-between">
                  <p className="micro-label opacity-40 uppercase">AI Bureau Summary</p>
                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={onRerunAI}
                      disabled={isRerunning}
                      className="p-1 hover:bg-on-surface/10 rounded transition-colors text-brand-orange disabled:opacity-20 cursor-pointer"
                      title="Rerun AI analysis algorithm"
                    >
                      <RefreshCw className={cn("w-2.5 h-2.5", isRerunning && "animate-spin")} />
                    </button>
                    <button 
                      onClick={() => setShowAnalysis(!showAnalysis)}
                      className="p-1 hover:bg-on-surface/10 rounded transition-colors cursor-pointer"
                    >
                      <Info className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
                
                <p className="text-xs leading-relaxed opacity-80 font-mono">
                  {review.reviewNotes}
                </p>

                {(review?.missingRequirements?.length || 0) > 0 && (
                  <div className="pt-2 border-t border-dashed border-on-surface/10">
                    <p className="text-[9px] font-bold text-red-500 uppercase">Missing Requirements</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {review.missingRequirements?.map(req => (
                        <span key={req} className="text-[9px] px-1 bg-red-500/10 text-red-500 font-mono">-{req}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Low Confidence warning */}
            {(review.confidenceScore || 0) < 50 && (
              <div className="flex items-start gap-2 p-3 bg-red-500/5 border border-red-500/20 text-left rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div className="font-mono">
                  <p className="text-[10px] font-black text-red-500 uppercase">Low confidence margin</p>
                  <p className="text-[9px] text-on-surface/70 leading-relaxed">The classification threshold is border-line. Expert human review required before archival.</p>
                </div>
              </div>
            )}

            {/* Technical Metadata Detail summaries */}
            {metadataSummaryText && (
              <div className="text-[9px] font-mono p-2.5 bg-on-surface/[0.03] border border-on-surface/5 rounded text-on-surface/60 text-left leading-relaxed">
                ⚙️ Metadata Hardware: {metadataSummaryText}
              </div>
            )}

            {review.status === 'pending_review' && scoringControls}
          </div>

          {/* Admin actions (Specs: Approve, Needs More Proof, Reject) */}
          <div className="mt-8 border-t border-on-surface/10 pt-5 space-y-2.5">
            <p className="micro-label opacity-40 uppercase tracking-widest text-left font-bold mb-1">
              Admin actions:
            </p>
            <div className="grid grid-cols-3 gap-3">
              {review.status === 'pending_review' ? (
                <>
                  <button 
                    onClick={onResubmit}
                    className="flex items-center justify-center gap-1.5 p-3.5 bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white transition-all text-xs font-mono uppercase tracking-wider border-2 border-amber-500/20 font-bold rounded-lg cursor-pointer max-sm:text-[10px]"
                  >
                    <RefreshCw className="w-3.5 h-3.5 shrink-0" /> Needs More Proof
                  </button>
                  <button 
                    onClick={onReject}
                    className="flex items-center justify-center gap-1.5 p-3.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all text-xs font-mono uppercase tracking-wider border-2 border-red-500/20 font-bold rounded-lg cursor-pointer max-sm:text-[10px]"
                  >
                    <X className="w-3.5 h-3.5 shrink-0" /> Reject
                  </button>
                  <button 
                    onClick={onApprove}
                    className="flex items-center justify-center gap-1.5 p-3.5 bg-brand-orange text-white hover:scale-[1.03] active:scale-95 hover:bg-emerald-600 transition-all text-xs font-mono uppercase tracking-wider font-extrabold rounded-lg shadow-[4px_4px_0px_black] border-2 border-on-surface/90 cursor-pointer max-sm:text-[10px]"
                  >
                    <Check className="w-3.5 h-3.5 shrink-0" /> Approve
                  </button>
                </>
              ) : (
                <div className="col-span-3 py-3 px-4 bg-on-surface/5 border border-dashed border-on-surface/20 rounded-lg text-center font-mono">
                  <p className="text-[10px] uppercase font-bold text-on-surface/50">
                    {review.status === 'approved' ? '✓ Record Approved - Archival Mode' : 
                     review.status === 'rejected' ? '✗ Record Rejected - Awaiting Cleanup' :
                     review.status === 'needs_more_proof' ? '⌛ Waiting for Agent Resubmission' : 'Review Finalized'}
                  </p>
                  {review.status !== 'approved' && (
                    <button 
                      onClick={onRestore} 
                      className="mt-2 text-[9px] font-mono uppercase text-brand-orange hover:underline block mx-auto py-1 font-bold cursor-pointer"
                    >
                      Restore to Pending Review (Admin Override)
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
