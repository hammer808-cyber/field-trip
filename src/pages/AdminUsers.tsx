import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Users, Shield, Award, Search, Filter, Mail, Gift, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { AdminLayout, ModuleCard } from '../components/admin/AdminShared';
import { Card } from '../components/UI';
import {
  COLLECTION_META,
  COLLECTION_SHELF_ORDER,
  getStickerById,
  getStickersByCollection
} from '../data/stickers';
import { getUserUnlockedStickers } from '../services/stickerService';
import {
  backfillStickerNotifications,
  filterGrantPickerStickers,
  getGrantableStickers,
  getGrantHistory,
  grantSticker,
  isValidGrantReason,
  lookupPlayers,
  MAX_GRANT_REASON_LENGTH,
  type AdminLookupPlayer,
  type BackfillStickerNotificationsResponse,
  type GrantHistoryEntry
} from '../services/stickerAdminService';

/**
 * Stage 4 — admin sticker grants (AdminUsers, /admin/users).
 *
 * Flow, one page: find the player (via the existing
 * `GET /api/admin/user-lookup`) → player card with owned count → sticker
 * picker grouped by the same collection shelves the player sees in the
 * Dex, owned stickers disabled → required reason → confirm screen → result.
 * Grant history below reads `adminLogs` (grant_sticker rows), not the
 * ledger — the ledger is not client-readable.
 *
 * Grant-only: there is no revoke UI in this stage (console delete is the
 * escape hatch). Grants are silent for the player — the sticker appears in
 * their Dex on next load, marked unseen (celebrations are Stage 5).
 */

function displayPlayerName(player: AdminLookupPlayer): string {
  return player.displayName || player.username || player.email || player.uid;
}

function shortUid(uid: string): string {
  return uid.length > 12 ? `...${uid.slice(-8)}` : uid;
}

function formatHistoryTime(date: Date | null): string {
  return date ? date.toLocaleString() : 'Unknown time';
}

export default function AdminUsers() {
  const grantModuleRef = useRef<HTMLDivElement>(null);

  const [grantOpen, setGrantOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<AdminLookupPlayer[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<AdminLookupPlayer | null>(null);
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [ownedLoading, setOwnedLoading] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [granting, setGranting] = useState(false);
  const [grantResult, setGrantResult] = useState<{ awarded: boolean; stickerName: string } | null>(null);
  const [grantError, setGrantError] = useState<string | null>(null);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<BackfillStickerNotificationsResponse | null>(null);
  const [backfillError, setBackfillError] = useState<string | null>(null);
  const [history, setHistory] = useState<GrantHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const totalStickers = useMemo(() => getGrantableStickers().length, []);
  const selectedSticker = selectedStickerId ? getStickerById(selectedStickerId) : undefined;

  const openGrantFlow = () => {
    setGrantOpen(true);
    // Scroll after the module renders.
    window.setTimeout(() => {
      grantModuleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };

  const refreshHistory = async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      setHistory(await getGrantHistory(50));
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : String(error));
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    void refreshHistory();
  }, []);

  const runLookup = async () => {
    if (!query.trim()) {
      setSearchError('Enter a UID, email, username, or display name.');
      return;
    }
    setSearching(true);
    setSearchError(null);
    setResults([]);
    try {
      const players = await lookupPlayers(query);
      setResults(players);
      if (players.length === 0) setSearchError('No players matched that search.');
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : String(error));
    } finally {
      setSearching(false);
    }
  };

  const selectPlayer = async (player: AdminLookupPlayer) => {
    setSelectedPlayer(player);
    setSelectedStickerId(null);
    setReason('');
    setConfirming(false);
    setGrantResult(null);
    setGrantError(null);
    setOwnedLoading(true);
    try {
      const unlocked = await getUserUnlockedStickers(player.uid);
      setOwnedIds(new Set(unlocked.map((record) => record.stickerId)));
    } finally {
      setOwnedLoading(false);
    }
  };

  const resetGrantForm = () => {
    setSelectedStickerId(null);
    setReason('');
    setConfirming(false);
    setGrantResult(null);
    setGrantError(null);
  };

  const reviewGrant = () => {
    if (!selectedPlayer || !selectedSticker) return;
    if (!isValidGrantReason(reason)) {
      setGrantError(`A reason of 1–${MAX_GRANT_REASON_LENGTH} characters is required.`);
      return;
    }
    setGrantError(null);
    setConfirming(true);
  };

  const confirmGrant = async () => {
    if (!selectedPlayer || !selectedSticker || granting) return;
    setGranting(true);
    setGrantError(null);
    try {
      const response = await grantSticker({
        targetUid: selectedPlayer.uid,
        stickerId: selectedSticker.id,
        reason: reason.trim()
      });
      setGrantResult({ awarded: response.awarded, stickerName: response.sticker.name });
      setConfirming(false);
      if (response.awarded) {
        setOwnedIds((prev) => new Set(prev).add(selectedSticker.id));
        void refreshHistory();
      }
    } catch (error) {
      setGrantError(error instanceof Error ? error.message : String(error));
    } finally {
      setGranting(false);
    }
  };

  // Option B one-shot (Nov 20, 2026): evaluator awards made before the
  // server endpoint existed wrote the sticker but no notification. This
  // writes the missing ones for every player. Idempotent — safe to run
  // twice; the second run writes nothing.
  const runBackfill = async () => {
    if (backfilling) return;
    setBackfilling(true);
    setBackfillError(null);
    try {
      setBackfillResult(await backfillStickerNotifications());
    } catch (error) {
      setBackfillError(error instanceof Error ? error.message : String(error));
    } finally {
      setBackfilling(false);
    }
  };

  return (
    <AdminLayout
      title="User & Progress Control"
      description="Manage agent profiles, verify status, and manually adjust progress credentials."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <ModuleCard
          title="Agent Search"
          description="Find specific agents by UID, email, or display name to review their history."
          icon={Search}
          status="green"
          primaryAction={{
            label: "SEARCH_AGENTS",
            onClick: openGrantFlow
          }}
        />
        <ModuleCard
          title="Role Management"
          description="Elevate agents to Field Guide or Bureau Administrator roles."
          icon={Shield}
          status="yellow"
          primaryAction={{
            label: "MANAGE_ROLES",
            onClick: () => {}
          }}
        />
        <ModuleCard
          title="Manual XP Adjustment"
          description="Directly edit an agent's XP bank or token balance if correction is needed."
          icon={Award}
          status="neutral"
          primaryAction={{
            label: "ADJUST_LEDGER",
            onClick: () => {}
          }}
        />
      </div>

      <Card className="mt-8 p-6">
        <h3 className="font-display text-xl uppercase">Sticker notification backfill</h3>
        <p className="mt-2 text-sm opacity-80">
          One-shot for the Nov 20 server-side awards move: writes the missing &ldquo;sticker unlocked&rdquo;
          notifications for every player whose stickers were awarded before the server started writing
          them. Safe to run twice — the second run writes nothing.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void runBackfill()}
            disabled={backfilling}
            className="rounded bg-brand-lime px-4 py-2 text-sm font-black uppercase text-black disabled:opacity-50"
          >
            {backfilling ? 'Running…' : 'Run backfill'}
          </button>
          {backfillResult && (
            <p className="text-sm font-bold">
              {backfillResult.notificationsWritten} written · {backfillResult.alreadyHad} already had one ·{' '}
              {backfillResult.stickersChecked} stickers checked across {backfillResult.usersScanned} players.
            </p>
          )}
          {backfillError && (
            <p className="flex items-center gap-2 text-sm font-bold text-error">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {backfillError}
            </p>
          )}
        </div>
      </Card>

      {grantOpen && (
        <div ref={grantModuleRef} className="mt-12">
          <Card className="p-6 sm:p-8 border-2 border-on-surface shadow-[8px_8px_0px_black]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-on-surface/50">Sticker Grants</p>
                <h2 className="font-display text-3xl uppercase italic leading-none mt-2 flex items-center gap-2">
                  <Gift className="w-7 h-7" /> Grant a sticker
                </h2>
                <p className="mt-3 text-sm text-on-surface/70 max-w-2xl">
                  Award a canonical sticker to a player with a required reason. Grants bypass the
                  starter gate and are recorded in the ledger and the admin log. There is no undo
                  in this tool — a wrong grant is removed in the Firebase console.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setGrantOpen(false)}
                className="shrink-0 border-2 border-on-surface p-2 hover:bg-on-surface hover:text-white transition-colors"
                aria-label="Close sticker grants"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step 1 — find the player */}
            <div className="mt-8">
              <h3 className="text-[10px] font-black uppercase tracking-[0.25em]">1 · Find the player</h3>
              <div className="mt-3 flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => { if (event.key === 'Enter') void runLookup(); }}
                  placeholder="UID, email, username, or display name"
                  className="flex-1 border-2 border-on-surface px-4 py-3 text-sm bg-white"
                />
                <button
                  type="button"
                  onClick={() => void runLookup()}
                  disabled={searching}
                  className="border-2 border-on-surface bg-black text-white px-6 py-3 text-xs font-black uppercase tracking-widest disabled:opacity-50"
                >
                  {searching ? 'Searching…' : 'Search'}
                </button>
              </div>
              {searchError && (
                <p className="mt-2 text-sm text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> {searchError}
                </p>
              )}
              {results.length > 0 && (
                <ul className="mt-3 divide-y-2 divide-on-surface/10 border-2 border-on-surface/10">
                  {results.map((player) => (
                    <li key={player.uid}>
                      <button
                        type="button"
                        onClick={() => void selectPlayer(player)}
                        className={`w-full text-left px-4 py-3 hover:bg-on-surface/5 ${selectedPlayer?.uid === player.uid ? 'bg-on-surface/10' : ''}`}
                      >
                        <span className="block font-bold text-sm">{displayPlayerName(player)}</span>
                        <span className="block text-xs text-on-surface/60">
                          {player.email || 'No email'} · {shortUid(player.uid)} · {player.starterApprovedCount}/5 starters · {player.totalXP} XP
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Step 2 — player card + picker */}
            {selectedPlayer && (
              <div className="mt-8">
                <h3 className="text-[10px] font-black uppercase tracking-[0.25em]">2 · Pick the sticker</h3>
                <div className="mt-3 border-2 border-on-surface p-4 bg-on-surface/5">
                  <p className="font-bold">{displayPlayerName(selectedPlayer)}</p>
                  <p className="text-xs text-on-surface/60 mt-1">
                    {selectedPlayer.email || 'No email'} · UID {selectedPlayer.uid}
                  </p>
                  <p className="text-xs text-on-surface/60 mt-1">
                    {selectedPlayer.starterApprovedCount}/5 starters · {selectedPlayer.totalXP} XP ·{' '}
                    {ownedLoading ? 'Loading stickers…' : `Owns ${ownedIds.size} / ${totalStickers} stickers`}
                  </p>
                </div>

                <div className="mt-4 flex items-center gap-2 border-2 border-on-surface/20 px-3 py-2">
                  <Filter className="w-4 h-4 text-on-surface/50" />
                  <input
                    type="text"
                    value={pickerQuery}
                    onChange={(event) => setPickerQuery(event.target.value)}
                    placeholder="Filter stickers by name or id"
                    className="flex-1 text-sm bg-transparent outline-none"
                  />
                </div>

                {COLLECTION_SHELF_ORDER.map((collection) => {
                  const shelfStickers = filterGrantPickerStickers(
                    getStickersByCollection(collection),
                    pickerQuery
                  );
                  const ownedOnShelf = shelfStickers.filter((sticker) => ownedIds.has(sticker.id)).length;
                  return (
                    <div key={collection} className="mt-6">
                      <div className="flex items-baseline justify-between gap-2">
                        <h4 className="font-display text-xl uppercase italic">{COLLECTION_META[collection].label}</h4>
                        <span className="text-[10px] font-black uppercase tracking-widest text-on-surface/50">
                          {ownedOnShelf} / {shelfStickers.length} owned
                        </span>
                      </div>
                      <p className="text-xs text-on-surface/60">{COLLECTION_META[collection].tagline}</p>
                      {shelfStickers.length === 0 ? (
                        <p className="mt-2 text-xs italic text-on-surface/50">{COLLECTION_META[collection].emptyState}</p>
                      ) : (
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {shelfStickers.map((sticker) => {
                            const isOwned = ownedIds.has(sticker.id);
                            const isSelected = selectedStickerId === sticker.id;
                            return (
                              <button
                                key={sticker.id}
                                type="button"
                                disabled={isOwned}
                                onClick={() => { setSelectedStickerId(sticker.id); setConfirming(false); setGrantResult(null); setGrantError(null); }}
                                className={`text-left border-2 px-3 py-2 transition-colors ${
                                  isSelected
                                    ? 'border-black bg-black text-white'
                                    : isOwned
                                      ? 'border-on-surface/20 opacity-50 cursor-not-allowed'
                                      : 'border-on-surface/30 hover:border-black'
                                }`}
                              >
                                <span className="block text-sm font-bold">{sticker.name}</span>
                                <span className="block text-[10px] font-black uppercase tracking-widest mt-1 opacity-70">
                                  {sticker.rarity}
                                  {sticker.rarity === 'legendary' ? ' · Legendary — only 4 exist' : ''}
                                  {isOwned ? ' · Owned' : ''}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Step 3 — reason + confirm */}
            {selectedPlayer && selectedSticker && (
              <div className="mt-8">
                <h3 className="text-[10px] font-black uppercase tracking-[0.25em]">3 · Reason &amp; confirm</h3>
                <p className="mt-3 text-sm">
                  Granting <strong>{selectedSticker.name}</strong> ({COLLECTION_META[selectedSticker.collection].label}
                  , {selectedSticker.rarity}) to <strong>{displayPlayerName(selectedPlayer)}</strong>.
                </p>
                {selectedSticker.rarity === 'legendary' && (
                  <p className="mt-2 text-sm font-bold text-amber-700">
                    Legendary — only 4 exist. Double-check the player and the reason before confirming.
                  </p>
                )}
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  maxLength={MAX_GRANT_REASON_LENGTH}
                  rows={3}
                  placeholder="Why is this sticker being granted? (required — recorded in the audit trail)"
                  className="mt-3 w-full border-2 border-on-surface px-4 py-3 text-sm bg-white"
                />
                <p className="mt-1 text-right text-[10px] font-bold uppercase tracking-widest text-on-surface/50">
                  {reason.trim().length} / {MAX_GRANT_REASON_LENGTH}
                </p>
                {grantError && (
                  <p className="mt-2 text-sm text-red-700 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" /> {grantError}
                  </p>
                )}
                {!confirming ? (
                  <button
                    type="button"
                    onClick={reviewGrant}
                    disabled={!isValidGrantReason(reason)}
                    className="mt-3 border-2 border-on-surface bg-black text-white px-6 py-3 text-xs font-black uppercase tracking-widest disabled:opacity-50"
                  >
                    Review grant
                  </button>
                ) : (
                  <div className="mt-3 border-2 border-black p-4 bg-amber-50">
                    <p className="font-bold text-sm">Confirm this grant?</p>
                    <p className="mt-2 text-sm">
                      {selectedSticker.name} → {displayPlayerName(selectedPlayer)}
                    </p>
                    <p className="mt-1 text-sm italic text-on-surface/70">“{reason.trim()}”</p>
                    <div className="mt-4 flex gap-3">
                      <button
                        type="button"
                        onClick={() => void confirmGrant()}
                        disabled={granting}
                        className="border-2 border-on-surface bg-black text-white px-6 py-3 text-xs font-black uppercase tracking-widest disabled:opacity-50"
                      >
                        {granting ? 'Granting…' : 'Confirm grant'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirming(false)}
                        disabled={granting}
                        className="border-2 border-on-surface px-6 py-3 text-xs font-black uppercase tracking-widest disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                {grantResult && selectedPlayer && (
                  <div
                    className={`mt-4 border-2 p-4 flex items-start gap-3 ${
                      grantResult.awarded ? 'border-green-700 bg-green-50' : 'border-amber-600 bg-amber-50'
                    }`}
                  >
                    <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-sm">
                        {grantResult.awarded
                          ? `Granted — ${grantResult.stickerName} to ${displayPlayerName(selectedPlayer)}.`
                          : `${displayPlayerName(selectedPlayer)} already owns this sticker — nothing changed.`}
                      </p>
                      <button
                        type="button"
                        onClick={resetGrantForm}
                        className="mt-2 text-xs font-black uppercase tracking-widest underline"
                      >
                        Grant another
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Grant history */}
            <div className="mt-10">
              <h3 className="text-[10px] font-black uppercase tracking-[0.25em] flex items-center gap-2">
                <Mail className="w-4 h-4" /> Grant history
              </h3>
              {historyLoading ? (
                <p className="mt-3 text-sm text-on-surface/60">Loading history…</p>
              ) : historyError ? (
                <p className="mt-3 text-sm text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> {historyError}
                </p>
              ) : history.length === 0 ? (
                <p className="mt-3 text-sm italic text-on-surface/50">No sticker grants recorded yet.</p>
              ) : (
                <ul className="mt-3 divide-y-2 divide-on-surface/10 border-2 border-on-surface/10">
                  {history.map((entry) => {
                    const sticker = getStickerById(entry.stickerId);
                    return (
                      <li key={entry.id} className="px-4 py-3">
                        <p className="text-sm font-bold">
                          {sticker ? sticker.name : entry.stickerId} → {shortUid(entry.targetId)}
                        </p>
                        <p className="text-xs text-on-surface/60 mt-1">
                          {formatHistoryTime(entry.createdAt)} · by {shortUid(entry.adminId)}
                        </p>
                        {entry.reason && (
                          <p className="text-xs italic text-on-surface/70 mt-1">“{entry.reason}”</p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </Card>
        </div>
      )}

      <Card className="mt-12 p-12 border-2 border-dashed border-on-surface/20 text-center opacity-40">
        <Users className="w-12 h-12 mx-auto mb-4" />
        <h3 className="text-xl font-display font-black uppercase mb-2">Agent Roster Module Construction</h3>
        <p className="text-[10px] font-mono uppercase font-bold tracking-widest max-w-sm mx-auto">Live agent directory and granular profile editing interface is currently being routed from the Bureau database.</p>
      </Card>
    </AdminLayout>
  );
}
