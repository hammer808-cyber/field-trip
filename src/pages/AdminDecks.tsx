import React from 'react';
import { Layers, Rocket, Lock, Unlock, Eye, Plus } from 'lucide-react';
import { AdminLayout, ModuleCard } from '../components/admin/AdminShared';
import { Card } from '../components/UI';

export default function AdminDecks() {
  return (
    <AdminLayout 
      title="Deck Control Panel" 
      description="Manage mission decks, unlock logic, and seasonal content release cycles."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <ModuleCard 
          title="Starter Signals"
          description="The 4 primary on-boarding missions. All agents begin here."
          icon={Layers}
          status="green"
          primaryAction={{
            label: "EDIT_DECK",
            onClick: () => {}
          }}
        />
        <ModuleCard 
          title="Heatwave: Summer '26"
          description="Seasonal deck requiring 3 Starter approvals to unlock."
          icon={Rocket}
          status="green"
          primaryAction={{
            label: "EDIT_DECK",
            onClick: () => {}
          }}
        />
        <ModuleCard 
          title="Secret Sectors"
          description="Hidden missions only discoverable via specific coordinates or QR triggers."
          icon={Lock}
          status="neutral"
          primaryAction={{
            label: "MANAGE_SECRETS",
            onClick: () => {}
          }}
        />
      </div>

      <div className="mt-12 flex justify-center">
        <button className="flex items-center gap-2 px-8 py-4 bg-white border-2 border-on-surface shadow-[6px_6px_0px_black] active:translate-y-1 active:shadow-none transition-all font-display font-black uppercase italic italic rounded-xl">
          <Plus className="w-5 h-5" /> CREATE_NEW_DECK_MODULE
        </button>
      </div>
    </AdminLayout>
  );
}
