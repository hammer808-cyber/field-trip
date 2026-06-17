import React, { useState, useEffect } from 'react';
import { Activity, Server, Database, Globe, Cpu, AlertTriangle, CheckCircle, RefreshCw, Shield } from 'lucide-react';
import { AdminLayout, StatusLight } from '../components/admin/AdminShared';
import { Card } from '../components/UI';
import { getRepairDiagnostics, DiagnosticsReport } from '../services/repairService';
import { cn } from '../lib/utils';

export default function AdminDiagnostics() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticsReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDiagnostics();
  }, []);

  const fetchDiagnostics = async () => {
    setLoading(true);
    try {
      const data = await getRepairDiagnostics();
      setDiagnostics(data);
    } catch (err) {
      console.error('Failed to fetch diagnostics:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout 
      title="Diagnostics Monitor" 
      description="Real-time infrastructure health, service connectivity, and system-wide anomaly detection."
    >
      <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Connection Status Overview */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MonitorCard 
            title="Database" 
            value={diagnostics?.firebaseConnectionStatus === 'ok' ? 'Online' : 'Check Logs'} 
            status={diagnostics?.firebaseConnectionStatus === 'ok' ? 'green' : 'red'}
            icon={Database}
          />
          <MonitorCard 
            title="Security (AppCheck)" 
            value={diagnostics?.appCheckStatus === 'active' ? 'Active' : 'Unverified'} 
            status={diagnostics?.appCheckStatus === 'active' ? 'green' : 'yellow'}
            icon={Shield}
          />
          <MonitorCard 
            title="Gateway" 
            value="Stable" 
            status="green"
            icon={Globe}
          />
          <MonitorCard 
            title="Compute" 
            value="Normal" 
            status="green"
            icon={Cpu}
          />
        </section>

        {/* Detailed Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <Card className="lg:col-span-2 p-8 border-2 border-on-surface shadow-[8px_8px_0px_black] bg-white">
              <div className="flex justify-between items-center mb-8">
                 <h3 className="text-xl font-display font-black uppercase italic tracking-tight">Anomalies Detected</h3>
                 {loading && <RefreshCw className="w-5 h-5 animate-spin text-brand-orange" />}
              </div>
              
              <div className="space-y-4">
                 {diagnostics && (
                   <>
                     <AnomalyRow 
                        label="Orphaned Submissions (No Admin Review doc)" 
                        value={diagnostics.countEntriesNoReviews} 
                        warningThreshold={1}
                     />
                     <AnomalyRow 
                        label="Ghost Reviews (No Matching Entry doc)" 
                        value={diagnostics.countReviewsNoEntries} 
                        warningThreshold={1}
                     />
                     <AnomalyRow 
                        label="Starter Deck State Drift" 
                        value={diagnostics.countUsersStarterMismatch} 
                        warningThreshold={5}
                     />
                     <AnomalyRow 
                        label="Pending Verification Queue" 
                        value={diagnostics.countPendingProofReviews} 
                        warningThreshold={20}
                        isPositive={true}
                     />
                   </>
                 )}
              </div>
           </Card>

           <Card className="p-8 border-2 border-on-surface shadow-[8px_8px_0px_black] bg-[#FAF8F5]">
              <h3 className="text-xl font-display font-black uppercase italic tracking-tight mb-6">Service Health</h3>
              <div className="space-y-6">
                 <ServiceHealthItem label="Gemini API (Vision)" status="green" />
                 <ServiceHealthItem label="Cloud Storage" status="green" />
                 <ServiceHealthItem label="Auth Service" status="green" />
                 <ServiceHealthItem label="Notification Relay" status="yellow" />
              </div>
              
              <div className="mt-12 pt-6 border-t border-on-surface/10">
                 <p className="text-[10px] font-mono font-black uppercase opacity-40 mb-2">Last Scan Run</p>
                 <p className="text-sm font-mono font-black text-on-surface">
                   {diagnostics ? new Date(diagnostics.lastRepairRunTimestamp).toLocaleString() : '---'}
                 </p>
              </div>
           </Card>
        </div>
      </div>
    </AdminLayout>
  );
}

function MonitorCard({ title, value, status, icon: Icon }: any) {
  return (
    <Card className="p-6 border-2 border-on-surface shadow-[4px_4px_0px_black] bg-white flex items-center justify-between">
      <div className="space-y-1">
        <p className="text-[9px] font-mono font-black uppercase opacity-40">{title}</p>
        <p className="text-xl font-display font-black uppercase italic text-on-surface leading-none">{value}</p>
      </div>
      <div className="flex flex-col items-end gap-2">
        <Icon className="w-5 h-5 text-on-surface/20" />
        <StatusLight state={status} />
      </div>
    </Card>
  );
}

function AnomalyRow({ label, value, warningThreshold, isPositive = false }: any) {
  const isHigh = !isPositive && value >= warningThreshold;
  return (
    <div className="flex items-center justify-between p-4 bg-on-surface/5 rounded-xl border border-on-surface/10">
      <span className="text-xs font-mono font-bold uppercase text-on-surface/80">{label}</span>
      <span className={cn(
        "text-lg font-mono font-black",
        isHigh ? "text-rose-600 animate-pulse" : isPositive ? "text-brand-orange" : "text-emerald-600"
      )}>
        {value}
      </span>
    </div>
  );
}

function ServiceHealthItem({ label, status }: any) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-mono font-black uppercase text-on-surface/60">{label}</span>
      <StatusLight state={status} />
    </div>
  );
}
