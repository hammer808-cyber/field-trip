import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle, Eye, Layers, Lock, Plus, Rocket, Send } from 'lucide-react';
import { AdminLayout, ModuleCard } from '../components/admin/AdminShared';
import { Card } from '../components/UI';
import { DECK_PACKS, getMissionsForPack } from '../data/deckPacks';
import { HEATWAVE_CHALLENGE_BANK } from '../data/heatwaveChallengeBank';
import { SOCAL_SUMMER_CHALLENGE_BANK } from '../data/socalSummerChallengeBank';
import { STARTER_MISSION_BANK } from '../data/starterMissionBank';
import { publishDeckCards, PublishDeckCardsReport } from '../services/repairService';
import { cn } from '../lib/utils';

const MISSION_BANK = [...STARTER_MISSION_BANK, ...HEATWAVE_CHALLENGE_BANK, ...SOCAL_SUMMER_CHALLENGE_BANK] as any[];

export default function AdminDecks() {
  const [selectedDeckId, setSelectedDeckId] = useState('heatwave-receipts');
  const [publishLoadingDeckId, setPublishLoadingDeckId] = useState<string | null>(null);
  const [publishReport, setPublishReport] = useState<PublishDeckCardsReport | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  const selectedDeck = useMemo(
    () => DECK_PACKS.find(deck => deck.packId === selectedDeckId) || DECK_PACKS[0],
    [selectedDeckId]
  );

  const selectedMissions = useMemo(
    () => getMissionsForPack(selectedDeck.packId, MISSION_BANK),
    [selectedDeck]
  );

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

function DeckMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border-2 border-on-surface/10 bg-[#FAF8F5] rounded-xl p-3 min-w-0">
      <p className="text-[8px] font-black text-on-surface/40">{label}</p>
      <p className="text-[10px] font-black truncate">{String(value)}</p>
    </div>
  );
}
