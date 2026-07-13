import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Users, 
  Target, 
  Database, 
  Settings, 
  Terminal,
  Activity,
  AlertTriangle,
  Zap,
  BarChart3,
  Clock,
  LayoutGrid
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, query, onSnapshot, where, limit, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { AdminLayout, ModuleCard, StatusLight } from '../components/admin/AdminShared';
import { normalizeEntryStatus } from '../logic/entryLogic';

export default function AdminBoard() {
  const { profile, loading: appLoading } = useApp();
  const { isAdmin } = useTheme();
  const navigate = useNavigate();

  // Dashboard Stats
  const [counts, setCounts] = useState({
    pending: 0,
    activeUsers: 0,
    totalMissions: 0,
    storageWaiting: 0,
    systemErrors: 0
  });
  const [loading, setLoading] = useState(true);

  // Authorization Check
  const isAdminAuthorized = isAdmin || profile?.role === 'admin' || (profile as any)?.isAdmin;

  useEffect(() => {
    if (!isAdminAuthorized) return;

    // 1. Pending Reviews Count
    const unsubPending = onSnapshot(query(
      collection(db, 'entries'),
      where('status', 'in', ['pending_review', 'submitted_pending_review', 'needs_more_proof'])
    ), (snap) => {
      setCounts(prev => ({ ...prev, pending: snap.size }));
    }, (err) => {
      console.error('[AdminBoard] Pending reviews query denied:', err);
    });

    // 2. Active Users Count (Recent)
    const unsubUsers = onSnapshot(query(
      collection(db, 'users'),
      limit(500) // Rough count for now
    ), (snap) => {
      setCounts(prev => ({ ...prev, activeUsers: snap.size }));
    }, (err) => {
      console.error('[AdminBoard] Users query denied:', err);
    });

    // 3. System Health (Check for recent errors or stranded users)
    // For now, we use a mock indicator or check a specific diagnostics collection
    setCounts(prev => ({ ...prev, totalMissions: 42, systemErrors: 0 }));

    setLoading(false);

    return () => {
      unsubPending();
      unsubUsers();
    };
  }, [isAdminAuthorized]);

  if (appLoading || loading) {
    return (
      <div className="min-h-screen bg-[#F0EFED] flex flex-col items-center justify-center p-8">
        <div className="w-16 h-16 border-8 border-on-surface border-t-brand-orange animate-spin rounded-full mb-6" />
        <p className="font-mono text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Initializing_Control_Deck...</p>
      </div>
    );
  }

  if (!isAdminAuthorized) {
    return (
      <div className="min-h-screen bg-on-surface text-white flex flex-col items-center justify-center p-8 text-center space-y-8">
        <div className="w-24 h-24 bg-error border-4 border-white flex items-center justify-center animate-bounce shadow-[0_0_50px_rgba(255,49,49,0.5)]">
          <Shield className="w-12 h-12 text-white" />
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl font-display font-black uppercase italic tracking-tighter">BUREAU_ACCESS_DENIED</h1>
          <p className="font-mono text-xs opacity-60 max-w-md mx-auto leading-relaxed uppercase tracking-widest">
            Security clearance insufficient. Terminal logged.
          </p>
        </div>
        <button 
          onClick={() => navigate('/basecamp')}
          className="px-8 py-4 bg-brand-orange text-white border-2 border-white font-display font-black uppercase italic hover:bg-white hover:text-on-surface transition-all shadow-[8px_8px_0px_black]"
        >
          Return to Safe Zone
        </button>
      </div>
    );
  }

  return (
    <AdminLayout title="Operational_Center">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        
        {/* Module 1: Proof Review Console */}
        <ModuleCard
          title="Proof Review Console"
          description="Vet field evidence and resolve pending submissions."
          icon={Shield}
          status={counts.pending > 0 ? 'yellow' : 'green'}
          statusLabel={counts.pending > 0 ? `${counts.pending} PENDING` : 'ALL CLEAR'}
          primaryAction={{
            label: counts.pending > 0 ? "Resolve Queue" : "Enter Console",
            onClick: () => navigate('/admin/proofs'),
            icon: Zap
          }}
          lastActivity="Active Session"
        >
          <div className="flex gap-4">
             <div className="flex-1 p-3 bg-on-surface/5 border border-on-surface/5 rounded-lg flex flex-col items-center justify-center">
                <span className="font-mono text-[8px] font-black opacity-30 uppercase">PENDING</span>
                <span className="font-display text-2xl font-black italic">{counts.pending}</span>
             </div>
             <div className="flex-1 p-3 bg-brand-lime/10 border border-brand-lime/20 rounded-lg flex flex-col items-center justify-center">
                <span className="font-mono text-[8px] font-black opacity-30 uppercase">STABILITY</span>
                <span className="font-display text-2xl font-black italic">100%</span>
             </div>
          </div>
        </ModuleCard>

        {/* Module 2: User & Progress Control */}
        <ModuleCard
          title="User Control Panel"
          description="Manage field agents, modify clearance, and override progression."
          icon={Users}
          status="blue"
          statusLabel="SYSTEM_READY"
          primaryAction={{
            label: "Agent Directory",
            onClick: () => navigate('/admin/users')
          }}
          lastActivity="Verified: Today"
        >
          <div className="space-y-2">
             <div className="flex justify-between items-center px-1">
                <span className="font-mono text-[9px] font-bold opacity-40 uppercase">ACTIVE_AGENTS</span>
                <span className="font-mono text-[11px] font-black">{counts.activeUsers}</span>
             </div>
             <div className="h-1 bg-on-surface/5 rounded-full overflow-hidden">
                <div className="h-full bg-brand-cyan w-[75%]" />
             </div>
          </div>
        </ModuleCard>

        {/* Module 3: Deck Control Panel */}
        <ModuleCard
          title="Deck Control Room"
          description="Modify mission banks, deck packs, and seasonal unlock schedules."
          icon={Target}
          status="green"
          statusLabel="DECK_STABLE"
          primaryAction={{
            label: "Mission Bank",
            onClick: () => navigate('/admin/decks')
          }}
          lastActivity="Updated: Season_01"
        >
          <div className="grid grid-cols-2 gap-3">
             <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-lime" />
                <span className="font-mono text-[8px] font-black uppercase opacity-60">ACTIVE: 32</span>
             </div>
             <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-on-surface/20" />
                <span className="font-mono text-[8px] font-black uppercase opacity-60">DRAFT: 8</span>
             </div>
          </div>
        </ModuleCard>

        {/* Module 4: Archive Console */}
        <ModuleCard
          title="Data Archive Matrix"
          description="Manage cold storage, purge old logs, and clean evidence buffers."
          icon={Database}
          status="green"
          statusLabel="STORAGE_OPTIMAL"
          primaryAction={{
            label: "Archive Center",
            onClick: () => navigate('/admin/archive')
          }}
          lastActivity="Next Auto-Purge: 3d"
        >
          <div className="p-3 bg-brand-orange/5 border border-brand-orange/10 rounded-lg flex items-center justify-between">
             <div className="flex items-center gap-2">
                <Clock className="w-3 h-3 text-brand-orange" />
                <span className="font-mono text-[9px] font-black uppercase">Buffer_Retention</span>
             </div>
             <span className="font-mono text-[10px] font-black italic">14_DAYS</span>
          </div>
        </ModuleCard>

        {/* Module 5: System Repair Bay */}
        <ModuleCard
          title="System Repair Bay"
          description="Corrective actions, global resets, and manual recovery protocols."
          icon={Terminal}
          status={counts.systemErrors > 0 ? 'red' : 'blue'}
          statusLabel={counts.systemErrors > 0 ? 'FAILURE_DETECTED' : 'STANDBY'}
          primaryAction={{
            label: "Execute Protocols",
            onClick: () => navigate('/admin/repair'),
            icon: AlertTriangle
          }}
          lastActivity="Stable Boot"
        >
          <div className="flex flex-wrap gap-2">
             <span className="px-2 py-1 bg-on-surface text-white font-mono text-[7px] font-black uppercase rounded">CORE_RESET: READY</span>
             <span className="px-2 py-1 bg-on-surface/5 font-mono text-[7px] font-black uppercase rounded">BACKFILL: SYNCED</span>
          </div>
        </ModuleCard>

        {/* Module 6: Settings & Config */}
        <ModuleCard
          title="Operational config"
          description="Toggle system features, feature flags, and global constants."
          icon={Settings}
          status="blue"
          statusLabel="MOD_AUTHORIZED"
          primaryAction={{
            label: "Config Settings",
            onClick: () => navigate('/admin/settings')
          }}
          lastActivity="Last Patch: V1.2.4"
        >
          <div className="space-y-1.5 opacity-60">
             <div className="flex justify-between font-mono text-[8px] font-bold uppercase">
                <span>Rival_Moments</span>
                <span className="text-brand-lime">ENABLED</span>
             </div>
             <div className="flex justify-between font-mono text-[8px] font-bold uppercase">
                <span>Crew_Dispatch</span>
                <span className="text-brand-lime">ENABLED</span>
             </div>
          </div>
        </ModuleCard>

        {/* Module 7: Diagnostics Monitor */}
        <ModuleCard
          title="Diagnostics Monitor"
          description="Live point feed, seasonal leaderboard audit, and pulse check."
          icon={BarChart3}
          status="green"
          statusLabel="DATA_SYNC_LIVE"
          primaryAction={{
            label: "Run Diagnostics",
            onClick: () => navigate('/admin/diagnostics')
          }}
          lastActivity="Feed: 0ms Latency"
        >
          <div className="flex items-end gap-1 h-8 opacity-20">
             {[0.4, 0.7, 0.5, 0.9, 0.3, 0.8, 0.6].map((h, i) => (
               <div key={i} className="flex-1 bg-on-surface rounded-t-sm" style={{ height: `${h * 100}%` }} />
             ))}
          </div>
        </ModuleCard>

        {/* Module 8: Tribunal Settings */}
        <ModuleCard
          title="Tribunal Settings"
          description="Open Tribunal diagnostics, private signal review, and repair controls."
          icon={Shield}
          status="blue"
          statusLabel="ADMIN_ONLY"
          primaryAction={{
            label: "Open Tribunal Settings",
            onClick: () => navigate('/admin/moderation?view=tribunalDiagnostics')
          }}
          lastActivity="Public access unchanged"
        >
          <div className="flex items-center gap-2 p-3 bg-on-surface/5 border border-on-surface/10 rounded-lg">
            <AlertTriangle className="w-3 h-3 text-brand-orange" />
            <span className="font-mono text-[8px] font-black uppercase opacity-60">
              Preview before repair
            </span>
          </div>
        </ModuleCard>

        {/* Module 9: Skin Studio */}
        <ModuleCard
          title="Skin Studio"
          description="Manage application skin tokens, variants, assets, availability, and defaults."
          icon={LayoutGrid}
          status="blue"
          statusLabel="REGISTRY_READY"
          primaryAction={{
            label: "Open Skin Studio",
            onClick: () => navigate('/admin/skins')
          }}
          lastActivity="Typed architecture active"
        >
          <div className="flex items-center justify-between border border-on-surface/10 bg-on-surface/5 p-3 font-mono text-[8px] font-black uppercase">
            <span>Reference skin</span>
            <span className="text-brand-orange">Field Notebook</span>
          </div>
        </ModuleCard>

        {/* Extra Module: Help / Documentation */}
        <div className="bg-brand-orange border-4 border-on-surface p-8 shadow-[8px_8px_0px_black] text-white space-y-6 flex flex-col justify-between">
           <div className="space-y-4">
              <div className="w-12 h-12 bg-white flex items-center justify-center rounded-xl">
                 <Zap className="w-6 h-6 text-brand-orange fill-brand-orange" />
              </div>
              <div className="space-y-2">
                 <h3 className="font-display text-3xl font-black uppercase italic tracking-tighter leading-none">Bureau Protocol</h3>
                 <p className="font-mono text-[10px] leading-relaxed font-black uppercase tracking-tight opacity-80">
                   Operational Center Alpha-9 documentation is available for authorized curators. All actions are logged and traceable to service identities.
                 </p>
              </div>
           </div>
           
           <button className="w-full py-4 bg-white text-on-surface font-display font-black uppercase italic text-sm tracking-wider shadow-[4px_4px_0px_black] hover:bg-on-surface hover:text-white transition-all">
             Protocol Docs
           </button>
        </div>

      </div>

      {/* Control Deck Footer Monitor */}
      <footer className="mt-16 bg-white border-4 border-on-surface p-6 shadow-[12px_12px_0px_black] flex flex-col sm:flex-row items-center justify-between gap-6">
         <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
               <Activity className="w-5 h-5 text-brand-lime" />
               <div className="space-y-0.5">
                  <span className="block font-mono text-[8px] font-black opacity-30 uppercase tracking-[0.2em]">DATABASE_UPTIME</span>
                  <span className="block font-mono text-[10px] font-black uppercase italic">99.998%_ACCURACY</span>
               </div>
            </div>
            <div className="h-10 w-[2px] bg-on-surface/10 hidden sm:block" />
            <div className="flex items-center gap-3">
               <Database className="w-5 h-5 text-brand-orange" />
               <div className="space-y-0.5">
                  <span className="block font-mono text-[8px] font-black opacity-30 uppercase tracking-[0.2em]">STORAGE_PAYLOAD</span>
                  <span className="block font-mono text-[10px] font-black uppercase italic">4.2GB_DEPLOYED</span>
               </div>
            </div>
         </div>

         <div className="flex items-center gap-4 bg-on-surface/5 px-4 py-2 rounded-full border border-on-surface/10">
            <div className="flex -space-x-2">
               {[1, 2, 3].map(i => (
                 <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-on-surface/20 flex items-center justify-center font-mono text-[8px] font-black">OP</div>
               ))}
            </div>
            <span className="font-mono text-[9px] font-black uppercase opacity-60">3_OPS_IN_THE_LOOP</span>
         </div>
      </footer>
    </AdminLayout>
  );
}
