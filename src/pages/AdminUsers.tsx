import React from 'react';
import { Users, Shield, Award, Search, Filter, Mail } from 'lucide-react';
import { AdminLayout, ModuleCard } from '../components/admin/AdminShared';
import { Card } from '../components/UI';

export default function AdminUsers() {
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
            onClick: () => {}
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

      <Card className="mt-12 p-12 border-2 border-dashed border-on-surface/20 text-center opacity-40">
        <Users className="w-12 h-12 mx-auto mb-4" />
        <h3 className="text-xl font-display font-black uppercase mb-2">Agent Roster Module Construction</h3>
        <p className="text-[10px] font-mono uppercase font-bold tracking-widest max-w-sm mx-auto">Live agent directory and granular profile editing interface is currently being routed from the Bureau database.</p>
      </Card>
    </AdminLayout>
  );
}
