import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle, Eye, KeyRound, Layers, Lock, Plus, Rocket, Save, Send, Shuffle } from 'lucide-react';
import { AdminLayout, ModuleCard } from '../components/admin/AdminShared';
import { Card } from '../components/UI';
import { DECK_PACKS, getMissionsForPack } from '../data/deckPacks';
import { HEATWAVE_CHALLENGE_BANK } from '../data/heatwaveChallengeBank';
import { SOCAL_SUMMER_CHALLENGE_BANK } from '../data/socalSummerChallengeBank';
import { STARTER_MISSION_BANK } from '../data/starterMissionBank';
import { publishDeckCards, PublishDeckCardsReport } from '../services/repairService';
import { mergeDeckAccessConfigs, saveDeckAccessConfig, subscribeToDeckAccessConfigs } from '../services/deckAccessService';
import { getDeckAccess } from '../logic/deckAccess';
import { cn } from '../lib/utils';

const MISSION_BANK = [...STARTER_MISSION_BANK, ...HEATWAVE_CHALLENGE_BANK, ...SOCAL_SUMMER_CHALLENGE_BANK] as any[];

export default function AdminDecks() {
  const [selectedDeckId, setSelectedDeckId] = useState('heatwave-receipts');
  const [publishLoadingDeckId, setPublishLoadingDeckId] = useState<string | null>(null);
  const [publishReport, setPublishReport] = useState<PublishDeckCardsReport | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [accessSaving, setAccessSaving] = useState(false);
  const [accessMessage, setAccessMessage] = useState<string | null>(null);
  const [accessDraft, setAccessDraft] = useState<any>({});
  const [previewUser, setPreviewUser] = useState({ userId: '', crewId: '', redeemedInvite: false, completedDeckIds: '', credentialIds: '' });
  const [deckAccessConfigs, setDeckAccessConfigs] = useState<Record<string, any>>({});

  useEffect(() => subscribeToDeckAccessConfigs(setDeckAccessConfigs), []);

  const deckPacks = useMemo(() => mergeDeckAccessConfigs(DECK_PACKS, deckAccessConfigs), [deckAccessConfigs]);

  const selectedDeck = useMemo(
    () => deckPacks.find(deck => deck.packId === selectedDeckId) || deckPacks[0],
    [selectedDeckId, deckPacks]
  );

  const selectedMissions = useMemo(
    () => getMissionsForPack(selectedDeck.packId, MISSION_BANK),
    [selectedDeck]
  );

  useEffect(() => {
    setAccessDraft({
      visibility: selectedDeck.visibility || 'public',
      assignedUserIds: selectedDeck.assignedUserIds || [],
      allowedCrewIds: selectedDeck.allowedCrewIds || [],
      inviteCode: selectedDeck.inviteCode || null,
      accessStartsAt: selectedDeck.accessStartsAt || '',
      accessEndsAt: selectedDeck.accessEndsAt || '',
      showLockedTeaser: selectedDeck.showLockedTeaser === true,
      requiredCredentialIds: selectedDeck.requiredCredentialIds || [],
      requiredCompletedDeckIds: selectedDeck.requiredCompletedDeckIds || []
    });
    setAccessMessage(null);
  }, [selectedDeck]);

  const publishDeck = async (deckId: string) => {
    setPublishLoadingDeckId(deckId);
    setPublishReport(null);
    setPublishError(null);
    try {
      setPublishReport(await publishDeckCards(deckId));
    } catch (err: any) {
      setPublishError(err.message || String(err));
    } finally {
      setPublishLoadingDeckId(null);
    }
  };

  const listFromText = (value: string) => value.split(/[,\n]/).map(v => v.trim()).filter(Boolean);
  const textFromList = (value: string[] = []) => value.join('\n');
  const randomInvite = () => `FT-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  const saveAccess = async () => {
    setAccessSaving(true);
    setAccessMessage(null);
    try {
      await saveDeckAccessConfig(selectedDeck.packId, accessDraft);
      setAccessMessage('Access settings saved.');
    } catch (err: any) {
      setAccessMessage(err.message || String(err));
    } finally {
      setAccessSaving(false);
    }
  };

  const previewAccess = getDeckAccess(
    { ...selectedDeck, ...accessDraft },
    {
      userId: previewUser.userId,
      profile: {
        id: previewUser.userId,
        crewId: previewUser.crewId || null,
        deckInviteRedemptions: previewUser.redeemedInvite ? { [selectedDeck.packId]: { redeemedAt: new Date().toISOString() } } : {},
        completedDeckIds: listFromText(previewUser.completedDeckIds),
        credentialIds: listFromText(previewUser.credentialIds)
      },
      isAdmin: false,
      now: new Date()
    }
  );

  return (
    <AdminLayout
      title="Deck Control Panel"
      description="Manage mission decks, unlock logic, and seasonal content release cycles."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <ModuleCard
          title="Starter Signals"
          description="The 3 primary onboarding missions. All agents begin here."
          icon={Layers}
          status="green"
          statusLabel="LIVE"
          primaryAction={{
            label: "EDIT_DECK",
            onClick: () => setSelectedDeckId('starter-signals'),
            icon: Eye
          }}
        />

        <ModuleCard
          title="Heatwave: Summer '26"
          description="Seasonal deck requiring 3 Starter approvals to unlock."
          icon={Rocket}
          status={publishReport?.deckId === 'heatwave-receipts' ? 'green' : 'yellow'}
          statusLabel={publishReport?.deckId === 'heatwave-receipts' ? 'PUBLISHED' : 'REVIEW'}
          primaryAction={{
            label: "EDIT_DECK",
            onClick: () => setSelectedDeckId('heatwave-receipts'),
            icon: Eye
          }}
          secondaryAction={{
            label: publishLoadingDeckId === 'heatwave-receipts' ? 'Publishing...' : 'Publish Draft Cards',
            onClick: () => publishDeck('heatwave-receipts'),
            disabled: publishLoadingDeckId === 'heatwave-receipts'
          }}
        />

        <ModuleCard
          title="Secret Sectors"
          description="Hidden missions only discoverable via specific coordinates or QR triggers."
          icon={Lock}
          status="neutral"
          statusLabel="SOON"
          primaryAction={{
            label: "COMING_SOON",
            onClick: () => {},
            disabled: true
          }}
        />
      </div>

      <Card className="mt-10 p-5 sm:p-8 border-2 border-on-surface shadow-[8px_8px_0px_black] bg-white">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-black uppercase tracking-widest text-brand-orange mb-2">Deck Editor</p>
            <h2 className="font-display text-3xl sm:text-4xl font-black uppercase italic leading-none">
              {selectedDeck.title || selectedDeck.packName}
            </h2>
            <p className="font-mono text-[10px] uppercase text-on-surface/50 mt-3 max-w-3xl">
              {selectedDeck.description}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono uppercase">
            <DeckMetric label="Deck ID" value={selectedDeck.packId} />
            <DeckMetric label="Cards" value={selectedMissions.length} />
            <DeckMetric label="Status" value={selectedDeck.status || (selectedDeck.isActive ? 'active' : 'inactive')} />
            <DeckMetric label="Unlock" value={selectedDeck.requiredUnlock || selectedDeck.unlockRule || 'none'} />
          </div>
        </div>

        {publishError && (
          <div className="mt-6 p-4 border-2 border-rose-200 bg-rose-50 text-rose-700 rounded-xl font-mono text-xs font-black">
            {publishError}
          </div>
        )}

        {publishReport && (
          <div className="mt-6 p-4 border-2 border-emerald-200 bg-emerald-50 text-emerald-700 rounded-xl font-mono text-xs font-black uppercase flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
            <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Publish complete</span>
            <span>{publishReport.published} draft cards published / {publishReport.scanned} scanned</span>
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 xl:grid-cols-[1.4fr_0.8fr] gap-6">
          <div className="border-2 border-on-surface/10 bg-[#FAF8F5] rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] font-black uppercase tracking-widest text-brand-orange">Restricted Access</p>
                <h3 className="font-display text-2xl font-black uppercase italic">Visibility Controls</h3>
              </div>
              <button
                onClick={saveAccess}
                disabled={accessSaving}
                className="px-4 py-3 bg-on-surface text-white border-2 border-on-surface shadow-[4px_4px_0px_black] font-mono text-[10px] font-black uppercase disabled:opacity-50 flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> {accessSaving ? 'Saving' : 'Save Access'}
              </button>
            </div>

            {accessMessage && (
              <div className="p-3 bg-white border border-on-surface/20 rounded-lg font-mono text-[10px] font-black uppercase">
                {accessMessage}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DeckField label="Visibility">
                <select
                  value={accessDraft.visibility || 'public'}
                  onChange={event => setAccessDraft((draft: any) => ({ ...draft, visibility: event.target.value }))}
                  className="w-full border-2 border-on-surface bg-white p-3 font-mono text-xs"
                >
                  <option value="public">public</option>
                  <option value="assigned_users">assigned_users</option>
                  <option value="crew_only">crew_only</option>
                  <option value="invite_code">invite_code</option>
                  <option value="admin_only">admin_only</option>
                </select>
              </DeckField>

              <DeckField label="Show locked teaser">
                <label className="flex items-center gap-3 border-2 border-on-surface bg-white p-3 font-mono text-xs font-black uppercase">
                  <input
                    type="checkbox"
                    checked={accessDraft.showLockedTeaser === true}
                    onChange={event => setAccessDraft((draft: any) => ({ ...draft, showLockedTeaser: event.target.checked }))}
                  />
                  Show private locked card
                </label>
              </DeckField>

              <DeckField label="Assigned user IDs">
                <textarea
                  value={textFromList(accessDraft.assignedUserIds)}
                  onChange={event => setAccessDraft((draft: any) => ({ ...draft, assignedUserIds: listFromText(event.target.value) }))}
                  placeholder="one uid per line"
                  className="w-full min-h-24 border-2 border-on-surface bg-white p-3 font-mono text-xs"
                />
              </DeckField>

              <DeckField label="Allowed crew IDs">
                <textarea
                  value={textFromList(accessDraft.allowedCrewIds)}
                  onChange={event => setAccessDraft((draft: any) => ({ ...draft, allowedCrewIds: listFromText(event.target.value) }))}
                  placeholder="crew-a, crew-b"
                  className="w-full min-h-24 border-2 border-on-surface bg-white p-3 font-mono text-xs"
                />
              </DeckField>

              <DeckField label="Invite code">
                <div className="flex gap-2">
                  <input
                    value={accessDraft.inviteCode || ''}
                    onChange={event => setAccessDraft((draft: any) => ({ ...draft, inviteCode: event.target.value.trim() || null }))}
                    placeholder="FT-PRIVATE-2026"
                    className="min-w-0 flex-1 border-2 border-on-surface bg-white p-3 font-mono text-xs"
                  />
                  <button
                    onClick={() => setAccessDraft((draft: any) => ({ ...draft, inviteCode: randomInvite() }))}
                    className="px-3 bg-brand-lime border-2 border-on-surface shadow-[3px_3px_0px_black]"
                    title="Generate invite code"
                  >
                    <Shuffle className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setAccessDraft((draft: any) => ({ ...draft, inviteCode: null }))}
                    className="px-3 bg-white border-2 border-on-surface shadow-[3px_3px_0px_black]"
                    title="Reset invite code"
                  >
                    <KeyRound className="w-4 h-4" />
                  </button>
                </div>
              </DeckField>

              <DeckField label="Access window">
                <div className="grid grid-cols-2 gap-2">
                  <input type="datetime-local" value={accessDraft.accessStartsAt || ''} onChange={event => setAccessDraft((draft: any) => ({ ...draft, accessStartsAt: event.target.value || null }))} className="border-2 border-on-surface bg-white p-3 font-mono text-xs" />
                  <input type="datetime-local" value={accessDraft.accessEndsAt || ''} onChange={event => setAccessDraft((draft: any) => ({ ...draft, accessEndsAt: event.target.value || null }))} className="border-2 border-on-surface bg-white p-3 font-mono text-xs" />
                </div>
              </DeckField>

              <DeckField label="Required credential IDs">
                <input value={textFromList(accessDraft.requiredCredentialIds)} onChange={event => setAccessDraft((draft: any) => ({ ...draft, requiredCredentialIds: listFromText(event.target.value) }))} className="w-full border-2 border-on-surface bg-white p-3 font-mono text-xs" />
              </DeckField>

              <DeckField label="Required completed deck IDs">
                <input value={textFromList(accessDraft.requiredCompletedDeckIds)} onChange={event => setAccessDraft((draft: any) => ({ ...draft, requiredCompletedDeckIds: listFromText(event.target.value) }))} className="w-full border-2 border-on-surface bg-white p-3 font-mono text-xs" />
              </DeckField>
            </div>
          </div>

          <div className="border-2 border-on-surface/10 bg-white rounded-xl p-4 space-y-4">
            <div>
              <p className="font-mono text-[10px] font-black uppercase tracking-widest text-brand-orange">Preview Mode</p>
              <h3 className="font-display text-2xl font-black uppercase italic">Test User Access</h3>
            </div>
            <input placeholder="test user id" value={previewUser.userId} onChange={event => setPreviewUser(prev => ({ ...prev, userId: event.target.value }))} className="w-full border-2 border-on-surface bg-white p-3 font-mono text-xs" />
            <input placeholder="test crew id" value={previewUser.crewId} onChange={event => setPreviewUser(prev => ({ ...prev, crewId: event.target.value }))} className="w-full border-2 border-on-surface bg-white p-3 font-mono text-xs" />
            <input placeholder="completed deck ids" value={previewUser.completedDeckIds} onChange={event => setPreviewUser(prev => ({ ...prev, completedDeckIds: event.target.value }))} className="w-full border-2 border-on-surface bg-white p-3 font-mono text-xs" />
            <input placeholder="credential ids" value={previewUser.credentialIds} onChange={event => setPreviewUser(prev => ({ ...prev, credentialIds: event.target.value }))} className="w-full border-2 border-on-surface bg-white p-3 font-mono text-xs" />
            <label className="flex items-center gap-3 font-mono text-xs font-black uppercase">
              <input type="checkbox" checked={previewUser.redeemedInvite} onChange={event => setPreviewUser(prev => ({ ...prev, redeemedInvite: event.target.checked }))} />
              Invite redeemed
            </label>
            <div className={cn(
              "p-4 border-2 rounded-xl font-mono text-xs font-black uppercase",
              previewAccess.playable ? "border-emerald-400 bg-emerald-50 text-emerald-700" : previewAccess.visible ? "border-amber-300 bg-amber-50 text-amber-700" : "border-rose-300 bg-rose-50 text-rose-700"
            )}>
              <div>visible: {String(previewAccess.visible)}</div>
              <div>playable: {String(previewAccess.playable)}</div>
              <div>reason: {previewAccess.reason || 'allowed'}</div>
            </div>
          </div>
        </div>

        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left font-mono text-[10px] uppercase">
            <thead>
              <tr className="border-b-2 border-on-surface/10 text-on-surface/40">
                <th className="py-3 pr-4">Card</th>
                <th className="py-3 pr-4">Deck</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Type</th>
                <th className="py-3 pr-4">Draw</th>
              </tr>
            </thead>
            <tbody>
              {selectedMissions.map((mission: any) => {
                const status = String(mission.status || 'missing').toLowerCase();
                const canDraw = ['published', 'available', 'approved', 'active', 'auto_approved', 'approved_by_admin'].includes(status);
                return (
                  <tr key={mission.id} className="border-b border-on-surface/10">
                    <td className="py-3 pr-4 font-black text-on-surface">{mission.title || mission.id}</td>
                    <td className="py-3 pr-4 text-on-surface/50">{mission.deckId || selectedDeck.packId}</td>
                    <td className="py-3 pr-4">
                      <span className={cn(
                        "px-2 py-1 border rounded-lg font-black",
                        canDraw ? "bg-brand-lime/20 border-brand-lime text-on-surface" : "bg-rose-50 border-rose-200 text-rose-600"
                      )}>
                        {status}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-on-surface/50">{mission.type || mission.cardType || 'mission'}</td>
                    <td className="py-3 pr-4">
                      {canDraw ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-black"><CheckCircle className="w-3 h-3" /> eligible</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-600 font-black"><AlertTriangle className="w-3 h-3" /> blocked</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-12 flex flex-col sm:flex-row justify-center gap-4">
        <button disabled className="flex items-center justify-center gap-2 px-8 py-4 bg-white border-2 border-on-surface shadow-[6px_6px_0px_black] font-display font-black uppercase italic rounded-xl opacity-50 cursor-not-allowed">
          <Plus className="w-5 h-5" /> CREATE_NEW_DECK_MODULE
        </button>
        <button disabled className="flex items-center justify-center gap-2 px-8 py-4 bg-on-surface text-white border-2 border-on-surface shadow-[6px_6px_0px_black] font-display font-black uppercase italic rounded-xl opacity-50 cursor-not-allowed">
          <Send className="w-5 h-5" /> SECRET_SECTORS_COMING_SOON
        </button>
      </div>
    </AdminLayout>
  );
}

function DeckField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="font-mono text-[9px] font-black uppercase tracking-widest text-on-surface/50">{label}</span>
      {children}
    </label>
  );
}

function DeckMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border-2 border-on-surface/10 bg-[#FAF8F5] rounded-xl p-3 min-w-0">
      <p className="text-[8px] font-black text-on-surface/40">{label}</p>
      <p className="text-[10px] font-black truncate">{String(value)}</p>
    </div>
  );
}
