#!/usr/bin/env bash
set -euo pipefail

python3 <<'PY'
from pathlib import Path

def replace_once(path: Path, old: str, new: str):
    text = path.read_text()
    if new in text:
        return
    if old not in text:
        raise SystemExit(f"Anchor not found in {path}: {old[:160]!r}")
    path.write_text(text.replace(old, new, 1))

def insert_before(path: Path, marker: str, block: str):
    text = path.read_text()
    if block.strip() in text:
        return
    if marker not in text:
        raise SystemExit(f"Marker not found in {path}: {marker[:160]!r}")
    path.write_text(text.replace(marker, block + marker, 1))

def insert_after(path: Path, marker: str, block: str):
    text = path.read_text()
    if block.strip() in text:
        return
    if marker not in text:
        raise SystemExit(f"Marker not found in {path}: {marker[:160]!r}")
    path.write_text(text.replace(marker, marker + block, 1))

repair_service = Path("src/services/repairService.ts")
admin_repair = Path("src/pages/AdminRepair.tsx")
server = Path("server.ts")

replace_once(
    repair_service,
    """export interface DiagnosticsReport {
  firebaseConnectionStatus: string;
  currentAdminUid: string;
  adminPermissionStatus: string;
  appCheckStatus: string;
  firestoreTestStatus: string;
  storageTestStatus: string;
  countPendingProofReviews: number;
  countEntriesNoReviews: number;
  countReviewsNoEntries: number;
  countUsersStarterMismatch: number;
  lastRepairRunTimestamp: string;
}
""",
    """export interface DiagnosticsReport {
  firebaseConnectionStatus: string;
  currentAdminUid: string;
  adminPermissionStatus: string;
  appCheckStatus: string;
  firestoreTestStatus: string;
  storageTestStatus: string;
  countPendingProofReviews: number;
  countEntriesNoReviews: number;
  countReviewsNoEntries: number;
  countUsersStarterMismatch: number;
  lastRepairRunTimestamp: string;
}

export interface UserResetReport {
  success: boolean;
  mode: 'soft' | 'hard';
  userId: string;
  username?: string;
  email?: string | null;
  archivedCounts: Record<string, number>;
  errors: string[];
}
"""
)

insert_before(
    repair_service,
    """/**
 * Repairs the mission state for a specific user using the secure backend utility.
 */
""",
    """export async function resetUserState(params: {
  targetUserId?: string;
  targetUsername?: string;
  targetEmail?: string;
  mode: 'soft' | 'hard';
  confirmReset: boolean;
  confirmationText?: string;
}): Promise<UserResetReport> {
  const endpoint = params.mode === 'hard'
    ? '/api/admin/hard-reset-user'
    : '/api/admin/soft-reset-user';

  try {
    const response = await authenticatedFetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || errData.error || `${params.mode} reset failed with HTTP ${response.status}`);
    }

    const raw = await response.json();
    const report = raw.report || raw;
    return {
      success: raw.success !== false,
      mode: params.mode,
      userId: report.userId || params.targetUserId || params.targetUsername || params.targetEmail || 'unknown',
      username: report.username,
      email: report.email || null,
      archivedCounts: report.archivedCounts || report.countsArchived || {},
      errors: report.errors || []
    };
  } catch (err: any) {
    console.error(`[resetUserState] ${params.mode} reset failed:`, err);
    return {
      success: false,
      mode: params.mode,
      userId: params.targetUserId || params.targetUsername || params.targetEmail || 'unknown',
      username: params.targetUsername,
      archivedCounts: {},
      errors: [err.message || String(err)]
    };
  }
}

"""
)

replace_once(
    admin_repair,
    """  Database,
  Search,
  Wrench
} from 'lucide-react';
""",
    """  Database,
  Search,
  Wrench,
  Trash2,
  UserX
} from 'lucide-react';
"""
)

replace_once(
    admin_repair,
    """  repairStrandedStarterUsers,
  getRepairDiagnostics,
  RepairReport,
  DiagnosticsReport,
  StrandedStarterRepairReport
} from '../services/repairService';
""",
    """  repairStrandedStarterUsers,
  getRepairDiagnostics,
  resetUserState,
  RepairReport,
  DiagnosticsReport,
  StrandedStarterRepairReport,
  UserResetReport
} from '../services/repairService';
"""
)

replace_once(
    admin_repair,
    """  const [activeTab, setActiveTab] = useState<'individual' | 'bulk' | 'diagnostics'>('individual');
""",
    """  const [activeTab, setActiveTab] = useState<'individual' | 'resets' | 'bulk' | 'diagnostics'>('individual');
"""
)

insert_after(
    admin_repair,
    """  const [diagnostics, setDiagnostics] = useState<DiagnosticsReport | null>(null);
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(false);
""",
    """

  // User Reset State
  const [resetTarget, setResetTarget] = useState('');
  const [resetConfirm, setResetConfirm] = useState(false);
  const [hardResetPhrase, setHardResetPhrase] = useState('');
  const [resettingMode, setResettingMode] = useState<'soft' | 'hard' | null>(null);
  const [resetReport, setResetReport] = useState<UserResetReport | null>(null);
"""
)

insert_after(
    admin_repair,
    """  const handleRepairStranded = async () => {
    setRepairingStranded(true);
    try {
      const report = await repairStrandedStarterUsers(false);
      setStrandedReport(report);
    } catch (err) {
      console.error('Stranded repair failed:', err);
    } finally {
      setRepairingStranded(false);
    }
  };
""",
    """

  const getResetTargetPayload = () => {
    const value = resetTarget.trim();
    if (!value) return null;
    if (value.includes('@')) return { targetEmail: value };
    if (value.length > 20 && !value.includes(' ')) return { targetUserId: value };
    return { targetUsername: value };
  };

  const handleUserReset = async (mode: 'soft' | 'hard') => {
    const target = getResetTargetPayload();
    if (!target || !resetConfirm) return;
    setResettingMode(mode);
    setResetReport(null);
    try {
      const report = await resetUserState({
        ...target,
        mode,
        confirmReset: resetConfirm,
        confirmationText: mode === 'hard' ? hardResetPhrase : undefined
      });
      setResetReport(report);
    } catch (err: any) {
      setResetReport({
        success: false,
        mode,
        userId: resetTarget,
        username: resetTarget,
        archivedCounts: {},
        errors: [err.message || String(err)]
      });
    } finally {
      setResettingMode(null);
    }
  };
"""
)

insert_before(
    admin_repair,
    """          <button 
            onClick={() => setActiveTab('bulk')}
""",
    """          <button 
            onClick={() => setActiveTab('resets')}
            className={cn(
              "pb-4 text-xs font-mono font-black uppercase tracking-widest transition-all relative",
              activeTab === 'resets' ? "text-brand-orange" : "text-on-surface/40 hover:text-on-surface"
            )}
          >
            User Resets
            {activeTab === 'resets' && <motion.div layoutId="repair-tab" className="absolute bottom-0 left-0 right-0 h-1 bg-brand-orange" />}
          </button>
"""
)

insert_before(
    admin_repair,
    """        {/* Bulk Repair */}
""",
    """        {/* User Resets */}
        {activeTab === 'resets' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="p-8 border-2 border-on-surface shadow-[8px_8px_0px_black] space-y-6">
              <div className="flex items-center gap-3">
                <UserX className="w-6 h-6 text-brand-orange" />
                <h3 className="text-xl font-display font-black uppercase italic tracking-tight">Targeted User Reset</h3>
              </div>
              <p className="text-xs font-mono text-on-surface/60 leading-relaxed uppercase">
                Soft reset preserves account identity and onboarding. Hard reset returns the user to first-run state while keeping the login record.
              </p>

              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono font-black uppercase opacity-40">UID, Username, or Email</label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface/30" />
                    <input
                      type="text"
                      value={resetTarget}
                      onChange={(e) => setResetTarget(e.target.value)}
                      placeholder="TARGET AGENT..."
                      className="w-full bg-[#FAF8F5] border-2 border-on-surface p-4 pl-12 font-mono text-sm font-black focus:outline-none focus:ring-2 ring-brand-orange/20 rounded-xl"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-on-surface/5 rounded-xl border border-on-surface/10 cursor-pointer" onClick={() => setResetConfirm(!resetConfirm)}>
                  <div className={cn(
                    "w-6 h-6 border-2 border-on-surface rounded-md flex items-center justify-center transition-colors",
                    resetConfirm ? "bg-brand-orange" : "bg-white"
                  )}>
                    {resetConfirm && <CheckCircle className="w-4 h-4 text-white" />}
                  </div>
                  <div>
                    <p className="text-[10px] font-mono font-black uppercase">Confirm target reset</p>
                    <p className="text-[9px] opacity-40 uppercase">Required before either reset button is enabled.</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono font-black uppercase opacity-40">Hard reset phrase</label>
                  <input
                    type="text"
                    value={hardResetPhrase}
                    onChange={(e) => setHardResetPhrase(e.target.value)}
                    placeholder="Type HARD RESET for hard reset"
                    className="w-full bg-white border-2 border-rose-200 p-3 font-mono text-xs font-black focus:outline-none focus:ring-2 ring-rose-500/20 rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => handleUserReset('soft')}
                    disabled={!!resettingMode || !resetTarget.trim() || !resetConfirm}
                    className="py-4 bg-brand-orange text-white font-display font-black uppercase italic tracking-widest text-sm shadow-[4px_4px_0px_black] active:translate-y-1 active:shadow-none transition-all disabled:opacity-50 rounded-xl"
                  >
                    {resettingMode === 'soft' ? 'RESETTING...' : 'SOFT RESET'}
                  </button>
                  <button
                    onClick={() => handleUserReset('hard')}
                    disabled={!!resettingMode || !resetTarget.trim() || !resetConfirm || hardResetPhrase.trim() !== 'HARD RESET'}
                    className="py-4 bg-rose-600 text-white font-display font-black uppercase italic tracking-widest text-sm shadow-[4px_4px_0px_black] active:translate-y-1 active:shadow-none transition-all disabled:opacity-50 rounded-xl"
                  >
                    <Trash2 className="w-4 h-4 inline mr-2" />
                    {resettingMode === 'hard' ? 'WIPING...' : 'HARD RESET'}
                  </button>
                </div>
              </div>
            </Card>

            <Card className="p-8 border-2 border-on-surface shadow-[8px_8px_0px_black] bg-[#FAF8F5] relative overflow-hidden">
              <div className="absolute top-4 right-4 opacity-10">
                <Database className="w-24 h-24" />
              </div>
              <h3 className="text-xl font-display font-black uppercase italic tracking-tight mb-6">Reset Receipt</h3>
              {!resetReport ? (
                <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-on-surface/15 rounded-2xl opacity-40">
                  <p className="text-[10px] font-mono font-black uppercase tracking-widest">No reset run yet.</p>
                </div>
              ) : (
                <div className="space-y-4 font-mono text-[10px] uppercase font-bold">
                  <div className="flex justify-between border-b border-on-surface/10 pb-2">
                    <span className="opacity-40">Mode:</span>
                    <span className={resetReport.mode === 'hard' ? "text-rose-600" : "text-brand-orange"}>{resetReport.mode}</span>
                  </div>
                  <div className="flex justify-between border-b border-on-surface/10 pb-2">
                    <span className="opacity-40">Target:</span>
                    <span>{resetReport.username || resetReport.userId}</span>
                  </div>
                  <div className="flex justify-between border-b border-on-surface/10 pb-2">
                    <span className="opacity-40">Status:</span>
                    <span className={resetReport.success ? "text-emerald-500" : "text-rose-500"}>{resetReport.success ? 'SUCCESS' : 'FAILED'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(resetReport.archivedCounts || {}).map(([collectionName, count]) => (
                      <div key={collectionName} className="p-2 bg-white/70 border border-on-surface/10 rounded-lg flex justify-between">
                        <span className="opacity-40">{collectionName}</span>
                        <span>{String(count)}</span>
                      </div>
                    ))}
                  </div>
                  {resetReport.errors?.length > 0 && (
                    <div className="p-3 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg">
                      {resetReport.errors[0]}
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>
        )}

"""
)

replace_once(
    server,
    """    const { targetUserId, targetUsername, confirmReset } = req.body;
""",
    """    const { targetUserId, targetUsername, targetEmail, confirmReset } = req.body;
"""
)

insert_after(
    server,
    """      } else if (targetUsername) {
        const usernameSnap = await dbAdmin.collection('users').where('username', '==', targetUsername).limit(1).get();
        if (usernameSnap.empty) return res.status(404).json({ error: "USER_NOT_FOUND_BY_USERNAME" });
        const userDoc = usernameSnap.docs[0];
        userId = userDoc.id;
        userRef = userDoc.ref;
        userData = userDoc.data();
      }
""",
    """ else if (targetEmail) {
        const emailSnap = await dbAdmin.collection('users').where('email', '==', targetEmail).limit(1).get();
        if (emailSnap.empty) return res.status(404).json({ error: "USER_NOT_FOUND_BY_EMAIL" });
        const userDoc = emailSnap.docs[0];
        userId = userDoc.id;
        userRef = userDoc.ref;
        userData = userDoc.data();
      }
"""
)

insert_before(
    server,
    """  app.get("/api/health", async (req, res) => {
""",
    """  app.post("/api/admin/hard-reset-user", authenticate, async (req: any, res) => {
    if (!dbAdmin) return res.status(500).json({ error: "DB_ADMIN_NOT_READY" });
    const isAdminUser = await checkIsAdmin(req.user);
    if (!isAdminUser) return res.status(403).json({ error: "ADMIN_ONLY" });

    const { targetUserId, targetUsername, targetEmail, confirmReset, confirmationText } = req.body;
    const adminUid = req.user.uid;

    if (!confirmReset || String(confirmationText || '').trim() !== 'HARD RESET') {
      return res.status(400).json({ error: "CONFIRMATION_REQUIRED", message: "Type HARD RESET to confirm the hard reset action." });
    }

    try {
      assertAdminCredentialsReady();

      let userId = targetUserId;
      let userRef: FirebaseFirestore.DocumentReference | null = null;
      let userData: any = null;

      if (userId) {
        userRef = dbAdmin.collection('users').doc(userId);
        const userSnap = await userRef.get();
        if (!userSnap.exists) return res.status(404).json({ error: "USER_NOT_FOUND" });
        userData = userSnap.data();
      } else if (targetUsername) {
        const usernameSnap = await dbAdmin.collection('users').where('username', '==', targetUsername).limit(1).get();
        if (usernameSnap.empty) return res.status(404).json({ error: "USER_NOT_FOUND_BY_USERNAME" });
        const userDoc = usernameSnap.docs[0];
        userId = userDoc.id;
        userRef = userDoc.ref;
        userData = userDoc.data();
      } else if (targetEmail) {
        const emailSnap = await dbAdmin.collection('users').where('email', '==', targetEmail).limit(1).get();
        if (emailSnap.empty) return res.status(404).json({ error: "USER_NOT_FOUND_BY_EMAIL" });
        const userDoc = emailSnap.docs[0];
        userId = userDoc.id;
        userRef = userDoc.ref;
        userData = userDoc.data();
      }

      if (!userRef || !userData || !userId) {
        return res.status(400).json({ error: "MISSING_TARGET_USER", message: "Provide targetUserId, targetUsername, or targetEmail." });
      }

      const archiveCollections = [
        'entries',
        'proofReviews',
        'proofs',
        'proofChecks',
        'scoreEvents',
        'badgeProgress',
        'weeklyBallots',
        'weeklySummaries',
        'activityEvents',
        'crewArtifacts'
      ];

      const report: any = {
        userId,
        username: userData.username || userData.name,
        email: userData.email || null,
        mode: 'hard',
        archivedCounts: {}
      };

      for (const colName of archiveCollections) {
        const colRef = dbAdmin.collection(colName);
        const [userIdSnap, uidSnap] = await Promise.all([
          colRef.where('userId', '==', userId).get(),
          colRef.where('uid', '==', userId).get()
        ]);

        const docMap = new Map<string, any>();
        userIdSnap.docs.forEach(doc => docMap.set(doc.ref.path, doc));
        uidSnap.docs.forEach(doc => docMap.set(doc.ref.path, doc));
        const docs = Array.from(docMap.values());
        report.archivedCounts[colName] = docs.length;

        for (let i = 0; i < docs.length; i += 500) {
          const batch = dbAdmin.batch();
          docs.slice(i, i + 500).forEach(doc => {
            batch.set(doc.ref, {
              archived: true,
              archivedAt: FieldValue.serverTimestamp(),
              archiveReason: "single_user_hard_reset",
              excludedFromProgress: true
            }, { merge: true });
          });
          await batch.commit();
        }
      }

      await userRef.update({
        xp: 0,
        points: 0,
        totalXP: 0,
        seasonXP: 0,
        weeklyXP: 0,
        approvedMissionCount: 0,
        approvedEntriesCount: 0,
        starterDeckComplete: false,
        onboardingComplete: false,
        onboardingCompleted: false,
        fieldClassificationComplete: false,
        firstMissionTourComplete: false,
        fieldType: null,
        personaType: null,
        personalityType: null,
        starterApprovedCount: 0,
        starterPendingCount: 0,
        completedMissionIds: [],
        completedChallengeIds: [],
        approvedCompletedChallengeIds: [],
        submittedChallengeIds: [],
        submittedPendingChallengeIds: [],
        rejectedChallengeIds: [],
        retryableChallengeIds: [],
        needsMoreProofChallengeIds: [],
        activeMissionId: null,
        activeTripId: null,
        activeTrip: null,
        activeMissionCard: null,
        drawnMissionCards: [],
        activeDeckId: "starter-signals",
        currentDeckId: "starter-signals",
        selectedDeckId: "starter-signals",
        hasUnlockedHeatwave: false,
        hasUnlockedSeasonal: false,
        lastDrawnMissionId: null,
        soloTripsCount: 0,
        crewTripsCount: 0,
        boldTripsCount: 0,
        completedCoreChallenges: 0,
        unlockedRewards: { stickers: [], badges: [], skins: ['classic'] },
        discoveryEvents: {},
        completedDiscoveryGroups: [],
        stickerUnlockHistory: [],
        hardResetAt: FieldValue.serverTimestamp(),
        hardResetBy: adminUid,
        updatedAt: FieldValue.serverTimestamp(),
        "starterState.starterApprovedCount": 0,
        "starterState.pendingStarterCount": 0,
        "starterState.starterComplete": false,
        "starterState.starterSignalsCompleted": [],
        "stats.totalApproved": 0,
        "stats.approvedMissionCount": 0,
        "stats.totalXP": 0,
        "stats.weeklyXP": 0,
        "stats.seasonXP": 0
      });

      await dbAdmin.collection('adminRepairLogs').add({
        action: "single_user_hard_reset",
        targetUserId: userId,
        targetUsername: userData.username || userData.name,
        targetEmail: userData.email || null,
        performedBy: adminUid,
        countsArchived: report.archivedCounts,
        timestamp: FieldValue.serverTimestamp()
      });

      await dbAdmin.collection('adminLogs').add({
        action: 'single_user_hard_reset',
        adminId: adminUid,
        targetId: userId,
        targetType: 'user',
        metadata: { username: userData.username || userData.name, email: userData.email || null, archivedCounts: report.archivedCounts },
        createdAt: FieldValue.serverTimestamp()
      });

      res.json({ success: true, report });
    } catch (error: any) {
      console.error("[HARD_RESET] Error:", error);
      res.status(500).json({ error: "HARD_RESET_FAILED", message: error.message });
    }
  });

"""
)

print("Admin reset controls v2 applied.")
PY

npm run build
