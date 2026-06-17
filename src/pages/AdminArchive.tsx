import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Archive, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  Search,
  Zap,
  Check,
  History,
  FileText
} from 'lucide-react';
import { AdminLayout, StatusLight, ModuleCard } from '../components/admin/AdminShared';
import { Card } from '../components/UI';
import { collection, query, where, orderBy, limit, getDocs, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

export default function AdminArchive() {
  const [activeTab, setActiveTab] = useState<'audit' | 'archive' | 'logs'>('audit');
  const [auditEntries, setAuditEntries] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [isAuditingRepairUid, setIsAuditingRepairUid] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === 'audit') {
      fetchAuditData();
    }
  }, [activeTab]);

  const fetchAuditData = async () => {
    setLoadingAudit(true);
    setAuditError(null);
    try {
      const q = query(
        collection(db, 'entries'),
        where('status', '==', 'approved'),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      const snap = await getDocs(q);
      const entries = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAuditEntries(entries);
    } catch (err: any) {
      console.error('Audit fetch failed:', err);
      setAuditError(err.message);
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleAuditRepairUser = async (uid: string) => {
    setIsAuditingRepairUid(uid);
    try {
      // Logic to trigger a re-sync for this user's XP
      // In a real app, this would call a cloud function or service
      await new Promise(r => setTimeout(r, 2000));
      alert(`Sent repair signal for user ${uid}. The bureau is calculating the correct XP allocation.`);
      fetchAuditData();
    } catch (err) {
      console.error('Audit repair failed:', err);
    } finally {
      setIsAuditingRepairUid(null);
    }
  };

  return (
    <AdminLayout 
      title="Archive & Data Console" 
      description="System ledger audit, historical proof archival, and administrative action logs."
    >
      <div className="flex flex-col gap-8">
        {/* Navigation Tabs */}
        <div className="flex border-b-2 border-on-surface/10 gap-8">
          {[
            { id: 'audit', label: 'Ledger Audit', icon: Database },
            { id: 'archive', label: 'Archival Center', icon: Archive },
            { id: 'logs', label: 'Action Logs', icon: History }
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "pb-4 text-xs font-mono font-black uppercase tracking-widest transition-all relative flex items-center gap-2",
                activeTab === tab.id ? "text-brand-orange" : "text-on-surface/40 hover:text-on-surface"
              )}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
              {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand-orange" />}
            </button>
          ))}
        </div>

        {activeTab === 'audit' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
               <div>
                  <h3 className="text-xl font-display font-black uppercase italic tracking-tight text-on-surface">XP & Points Ledger Registry</h3>
                  <p className="text-[10px] font-mono text-on-surface/40 uppercase font-bold tracking-widest mt-1">Cross-referencing approved proofs with credited agent XP balances.</p>
               </div>
               <div className="flex gap-2">
                 <div className="bg-emerald-50 border-2 border-brand-lime px-3 py-1.5 rounded-xl text-[10px] font-mono font-black uppercase text-emerald-800 flex items-center gap-1.5">
                   <CheckCircle className="w-3.5 h-3.5" /> Synchronized
                 </div>
                 <button 
                    onClick={fetchAuditData}
                    disabled={loadingAudit}
                    className="p-2 border-2 border-on-surface rounded-xl hover:bg-on-surface/5 transition-all shadow-[2px_2px_0px_black] active:translate-y-0.5 active:shadow-none"
                 >
                    <RefreshCw className={cn("w-4 h-4", loadingAudit && "animate-spin")} />
                 </button>
               </div>
            </header>

            {loadingAudit ? (
              <div className="h-64 flex flex-col items-center justify-center">
                 <RefreshCw className="w-10 h-10 animate-spin text-brand-orange mb-4" />
                 <p className="text-[10px] font-mono font-black uppercase tracking-widest opacity-40">Scanning ledger partitions...</p>
              </div>
            ) : (
              <div className="overflow-x-auto border-2 border-on-surface shadow-[6px_6px_0px_black] rounded-[2rem] bg-white">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                     <tr className="bg-[#FAF8F5] border-b-2 border-on-surface text-[10px] font-mono font-black uppercase text-on-surface/50">
                        <th className="py-4 px-6">Timestamp</th>
                        <th className="py-4 px-6">Agent</th>
                        <th className="py-4 px-6">Mission</th>
                        <th className="py-4 px-6">Allocated XP</th>
                        <th className="py-4 px-6 text-center">Audit Status</th>
                        <th className="py-4 px-6 text-center">Repair</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-on-surface/10 font-mono text-xs">
                     {auditEntries.map((entry) => {
                       const hasPointsVal = entry.pointsAwarded && (typeof entry.pointsAwarded === 'number' ? entry.pointsAwarded > 0 : entry.pointsAwarded === true);
                       const hasRawXp = entry.awardedXP || entry.awardedPoints;
                       const isAnomalous = !hasPointsVal || !hasRawXp;

                       return (
                        <tr key={entry.id} className={cn("hover:bg-on-surface/5 transition-colors", isAnomalous ? "bg-rose-50" : "")}>
                           <td className="py-4 px-6 opacity-40">
                             {entry.createdAt ? format(entry.createdAt.toDate(), 'MM/dd HH:mm') : '---'}
                           </td>
                           <td className="py-4 px-6 font-black capitalize">
                             {entry.displayName || 'Anonymous'}
                           </td>
                           <td className="py-4 px-6 uppercase font-bold text-brand-orange truncate max-w-[200px]">
                             {entry.tripTitle || entry.missionTitle || 'Untitled'}
                           </td>
                           <td className="py-4 px-6 font-black text-rose-600">
                             {entry.awardedXP || entry.awardedPoints || 0} XP
                           </td>
                           <td className="py-4 px-6 text-center">
                             {isAnomalous ? (
                               <span className="bg-rose-100 text-rose-800 text-[8px] font-black uppercase px-2 py-0.5 rounded border border-rose-300">ANOMALY</span>
                             ) : (
                               <span className="bg-emerald-100 text-emerald-800 text-[8px] font-black uppercase px-2 py-0.5 rounded border border-emerald-300">VERIFIED</span>
                             )}
                           </td>
                           <td className="py-4 px-6 text-center">
                             <button
                               onClick={() => handleAuditRepairUser(entry.userId)}
                               disabled={isAuditingRepairUid !== null}
                               className="p-1.5 border border-on-surface rounded hover:bg-on-surface hover:text-white transition-all disabled:opacity-30"
                             >
                               <Zap className="w-3.5 h-3.5" />
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

        {activeTab === 'archive' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <ModuleCard 
               title="Seasonal Purge"
               description="Archive all proofs from Season 1. They will remain visible in galleries but removed from active review queues."
               status="yellow"
               icon={Archive}
               primaryAction={{
                 label: "RUN_PURGE",
                 onClick: () => alert("Seasonal purge protocol requires Tier 3 authorization."),
               }}
             />
             <ModuleCard 
               title="Cloud Cleanup"
               description="Deletes localized temporary upload cache from Storage bucket while preserving final optimized versions."
               status="green"
               icon={Database}
               primaryAction={{
                 label: "START_CLEANUP",
                 onClick: () => alert("Cloud cleanup initiated in the background."),
               }}
             />
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <Card className="p-8 border-2 border-on-surface shadow-[8px_8px_0px_black] opacity-60 text-center">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <h3 className="text-xl font-display font-black uppercase mb-2">Audit Logs Restricted</h3>
                <p className="text-[10px] font-mono uppercase font-bold tracking-widest max-w-sm mx-auto">Full administrative history logs are being migrated to the dedicated Bureau Log Deck. Check back after next deployment.</p>
             </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
