#!/usr/bin/env bash
set -euo pipefail

python3 <<'PY'
from pathlib import Path

def replace_once(path: Path, old: str, new: str):
    text = path.read_text()
    if new in text:
        return
    if old not in text:
        raise SystemExit(f"Anchor not found in {path}: {old[:180]!r}")
    path.write_text(text.replace(old, new, 1))

def insert_before(path: Path, marker: str, block: str):
    text = path.read_text()
    if block.strip() in text:
        return
    if marker not in text:
        raise SystemExit(f"Marker not found in {path}: {marker[:180]!r}")
    path.write_text(text.replace(marker, block + marker, 1))

def insert_after(path: Path, marker: str, block: str):
    text = path.read_text()
    if block.strip() in text:
        return
    if marker not in text:
        raise SystemExit(f"Marker not found in {path}: {marker[:180]!r}")
    path.write_text(text.replace(marker, marker + block, 1))

repair_service = Path("src/services/repairService.ts")
admin_repair = Path("src/pages/AdminRepair.tsx")
server = Path("server.ts")

replace_once(
    repair_service,
    """export interface UserResetReport {
  success: boolean;
  mode: 'soft' | 'hard';
  userId: string;
  username?: string;
  email?: string | null;
  archivedCounts: Record<string, number>;
  errors: string[];
}
""",
    """export interface UserResetReport {
  success: boolean;
  mode: 'soft' | 'hard';
  userId: string;
  username?: string;
  email?: string | null;
  archivedCounts: Record<string, number>;
  errors: string[];
}

export interface AdminUserLookupResult {
  uid: string;
  username?: string;
  displayName?: string;
  email?: string | null;
  role?: string;
  accessStatus?: string;
}
"""
)

insert_after(
    repair_service,
    """export async function resetUserState(params: {
  targetUserId?: string;
  targetUsername?: string;
  targetEmail?: string;
  mode: 'soft' | 'hard';
  confirmReset: boolean;
  confirmationText?: string;
}): Promise<UserResetReport> {
""",
    ""
)

insert_before(
    repair_service,
    """export async function resetUserState(params: {
""",
    """export async function lookupAdminUsers(search: string): Promise<AdminUserLookupResult[]> {
  const q = search.trim();
  if (!q) return [];

  const response = await authenticatedFetch(`/api/admin/user-lookup?q=${encodeURIComponent(q)}`, {
    method: 'GET'
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || errData.error || `User lookup failed with HTTP ${response.status}`);
  }

  const raw = await response.json();
  return raw.users || [];
}

"""
)

replace_once(
    admin_repair,
    """  resetUserState,
  RepairReport,
  DiagnosticsReport,
  StrandedStarterRepairReport,
  UserResetReport
} from '../services/repairService';
""",
    """  resetUserState,
  lookupAdminUsers,
  RepairReport,
  DiagnosticsReport,
  StrandedStarterRepairReport,
  UserResetReport,
  AdminUserLookupResult
} from '../services/repairService';
"""
)

insert_after(
    admin_repair,
    """  const [resettingMode, setResettingMode] = useState<'soft' | 'hard' | null>(null);
  const [resetReport, setResetReport] = useState<UserResetReport | null>(null);
""",
    """
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userLookupLoading, setUserLookupLoading] = useState(false);
  const [userLookupResults, setUserLookupResults] = useState<AdminUserLookupResult[]>([]);
  const [userLookupError, setUserLookupError] = useState<string | null>(null);
"""
)

insert_after(
    admin_repair,
    """  const handleUserReset = async (mode: 'soft' | 'hard') => {
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
""",
    """

  const handleUserLookup = async () => {
    if (!userSearchTerm.trim()) return;
    setUserLookupLoading(true);
    setUserLookupError(null);
    try {
      const results = await lookupAdminUsers(userSearchTerm);
      setUserLookupResults(results);
      if (results.length === 0) {
        setUserLookupError('No matching users found.');
      }
    } catch (err: any) {
      setUserLookupResults([]);
      setUserLookupError(err.message || String(err));
    } finally {
      setUserLookupLoading(false);
    }
  };

  const selectLookupUser = (result: AdminUserLookupResult, destination: 'reset' | 'repair') => {
    if (destination === 'repair') {
      setRepairUid(result.uid);
      setActiveTab('individual');
      return;
    }

    setResetTarget(result.uid);
  };
"""
)

insert_after(
    admin_repair,
    """              <p className="text-xs font-mono text-on-surface/60 leading-relaxed uppercase">
                Soft reset preserves account identity and onboarding. Hard reset returns the user to first-run state while keeping the login record.
              </p>

""",
    """              <div className="p-4 bg-white/70 border-2 border-on-surface/10 rounded-xl space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-mono font-black uppercase tracking-widest text-brand-orange">Find User</p>
                    <p className="text-[9px] font-mono uppercase opacity-40">Search by username, email, display name, or UID.</p>
                  </div>
                  <button
                    onClick={handleUserLookup}
                    disabled={userLookupLoading || !userSearchTerm.trim()}
                    className="px-4 py-2 bg-on-surface text-white rounded-lg text-[10px] font-mono font-black uppercase disabled:opacity-40"
                  >
                    {userLookupLoading ? 'Searching...' : 'Lookup'}
                  </button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface/30" />
                  <input
                    type="text"
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleUserLookup();
                    }}
                    placeholder="username, email, display name, or UID"
                    className="w-full bg-[#FAF8F5] border border-on-surface/20 p-3 pl-10 font-mono text-xs font-black focus:outline-none focus:ring-2 ring-brand-orange/20 rounded-lg"
                  />
                </div>
                {userLookupError && (
                  <p className="text-[10px] font-mono font-bold text-rose-600">{userLookupError}</p>
                )}
                {userLookupResults.length > 0 && (
                  <div className="space-y-2 max-h-56 overflow-auto">
                    {userLookupResults.map(result => (
                      <div key={result.uid} className="p-3 bg-[#FAF8F5] border border-on-surface/10 rounded-lg">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-display font-black uppercase italic truncate">{result.username || result.displayName || 'Unnamed agent'}</p>
                            <p className="text-[9px] font-mono opacity-50 truncate">{result.email || 'no email'}</p>
                            <p className="text-[9px] font-mono text-brand-orange truncate">UID: {result.uid}</p>
                          </div>
                          <div className="flex flex-col gap-2 shrink-0">
                            <button
                              onClick={() => selectLookupUser(result, 'reset')}
                              className="px-3 py-1.5 bg-brand-orange text-white rounded-md text-[9px] font-mono font-black uppercase"
                            >
                              Use for Reset
                            </button>
                            <button
                              onClick={() => selectLookupUser(result, 'repair')}
                              className="px-3 py-1.5 bg-on-surface text-white rounded-md text-[9px] font-mono font-black uppercase"
                            >
                              Use for Repair
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

"""
)

replace_once(
    admin_repair,
    """                    {resettingMode === 'soft' ? 'RESETTING...' : 'SOFT RESET'}
""",
    """                    {resettingMode === 'soft' ? 'RESETTING...' : 'SOFT RESET USER'}
"""
)

replace_once(
    admin_repair,
    """                    {resettingMode === 'hard' ? 'WIPING...' : 'HARD RESET'}
""",
    """                    {resettingMode === 'hard' ? 'WIPING...' : 'HARD RESET USER'}
"""
)

insert_before(
    server,
    """  app.post("/api/admin/hard-reset-user", authenticate, async (req: any, res) => {
""",
    """  app.get("/api/admin/user-lookup", authenticate, async (req: any, res) => {
    if (!dbAdmin) return res.status(500).json({ error: "DB_ADMIN_NOT_READY" });
    const isAdminUser = await checkIsAdmin(req.user);
    if (!isAdminUser) return res.status(403).json({ error: "ADMIN_ONLY" });

    try {
      assertAdminCredentialsReady();
      const rawQuery = String(req.query.q || '').trim();
      const normalizedQuery = rawQuery.toLowerCase();
      if (!normalizedQuery) return res.json({ users: [] });

      const results = new Map<string, any>();

      const maybeDoc = await dbAdmin.collection('users').doc(rawQuery).get();
      if (maybeDoc.exists) {
        const data = maybeDoc.data() || {};
        results.set(maybeDoc.id, {
          uid: maybeDoc.id,
          username: data.username || data.name || null,
          displayName: data.displayName || data.name || null,
          email: data.email || null,
          role: data.role || null,
          accessStatus: data.accessStatus || null
        });
      }

      const userSnap = await dbAdmin.collection('users').limit(500).get();
      userSnap.docs.forEach(doc => {
        const data = doc.data() || {};
        const searchable = [
          doc.id,
          data.username,
          data.name,
          data.displayName,
          data.email
        ].filter(Boolean).join(' ').toLowerCase();

        if (searchable.includes(normalizedQuery)) {
          results.set(doc.id, {
            uid: doc.id,
            username: data.username || data.name || null,
            displayName: data.displayName || data.name || null,
            email: data.email || null,
            role: data.role || null,
            accessStatus: data.accessStatus || null
          });
        }
      });

      res.json({ users: Array.from(results.values()).slice(0, 25) });
    } catch (error: any) {
      console.error("[USER_LOOKUP] Error:", error);
      res.status(500).json({ error: "USER_LOOKUP_FAILED", message: error.message });
    }
  });

"""
)

print("Admin user lookup patch applied.")
PY

npm run build
