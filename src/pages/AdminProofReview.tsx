import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Zap, 
  Search, 
  Filter, 
  Check, 
  X, 
  AlertCircle, 
  Clock, 
  LayoutGrid, 
  Table as TableIcon,
  ChevronRight,
  MoreVertical,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Eye,
  Activity
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, query, onSnapshot, where, limit, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { AdminLayout, StatusLight, ModuleCard } from '../components/admin/AdminShared';
import { Card } from '../components/UI';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { subscribeToAdminPendingReviews } from '../services/submissionService';

export default function AdminProofReview() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending_review' | 'approved' | 'rejected' | 'needs_more_proof'>('pending_review');
  const [viewMode, setViewMode] = useState<'swipe' | 'queue'>('swipe');
  const [stats, setStats] = useState({
    pending: 0,
    velocity: '2.4 p/h',
    queueDepth: 'Normal'
  });

  const { isAdmin } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAdmin) return;

    // Proofs listener
    const unsub = subscribeToAdminPendingReviews(filter, (entries) => {
      setReviews(entries);
      setLoading(false);
    }, (error: any) => {
      console.error('[AdminProofReview] Reviews subscription denied:', error);
      setLoading(false);
    });

    // Simple stats listener
    const unsubStats = onSnapshot(query(
      collection(db, 'entries'),
      where('status', '==', 'pending_review')
    ), (snap) => {
      setStats(prev => ({ 
        ...prev, 
        pending: snap.size,
        queueDepth: snap.size > 50 ? 'Critical' : snap.size > 20 ? 'Congested' : 'Clear'
      }));
    }, (error) => {
      console.error('[AdminProofReview] Stats query denied:', error);
    });

    return () => {
      unsub();
      unsubStats();
    };
  }, [isAdmin, filter]);

  const handleAction = async (id: string, action: 'approve' | 'reject' | 'request_info') => {
    // Placeholder for actual review logic which is in submissionService
    alert(`Action: ${action} on ${id}`);
  };

  return (
    <AdminLayout 
      title="Proof Review Console" 
    >
      <div className="space-y-8">
        
        {/* Review Monitors (Stats) */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
           <MonitorCard title="Current Queue" value={stats.pending} icon={Shield} />
           <MonitorCard title="Review Velocity" value={stats.velocity} icon={Zap} />
           <MonitorCard title="System Depth" value={stats.queueDepth} status={stats.queueDepth === 'Clear' ? 'green' : 'yellow'} icon={Activity} />
        </section>

        {/* Control Toolbar */}
        <Card className="p-6 border-2 border-on-surface shadow-[6px_6px_0px_black] bg-white flex flex-col md:flex-row justify-between items-center gap-6">
           <div className="flex bg-on-surface/5 p-1 rounded-xl w-full md:w-auto">
              {(['pending_review', 'approved', 'rejected', 'needs_more_proof'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "flex-1 px-4 py-2 rounded-lg font-mono text-[10px] font-black uppercase tracking-widest transition-all",
                    filter === f ? "bg-white shadow-sm text-brand-orange" : "text-on-surface/40 hover:text-on-surface"
                  )}
                >
                  {f.replace('_', ' ')}
                </button>
              ))}
           </div>

           <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="flex bg-on-surface p-1 rounded-lg">
                 <button 
                  onClick={() => setViewMode('swipe')}
                  className={cn("p-2 rounded transition-all", viewMode === 'swipe' ? "bg-brand-orange text-white" : "text-white/40")}
                 >
                    <LayoutGrid className="w-4 h-4" />
                 </button>
                 <button 
                  onClick={() => setViewMode('queue')}
                  className={cn("p-2 rounded transition-all", viewMode === 'queue' ? "bg-brand-orange text-white" : "text-white/40")}
                 >
                    <TableIcon className="w-4 h-4" />
                 </button>
              </div>
              <div className="flex-1 md:flex-none relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-30" />
                 <input 
                   type="text" 
                   placeholder="SEARCH_BY_AGENT_ID..." 
                   className="pl-9 pr-4 py-2.5 bg-on-surface/5 border border-on-surface/10 rounded-xl font-mono text-[10px] uppercase w-full md:w-48 placeholder:opacity-30 outline-none focus:border-brand-orange transition-all"
                 />
              </div>
           </div>
        </Card>

        {/* Main View Area */}
        <div className="min-h-[400px]">
           {loading ? (
             <div className="h-64 flex flex-col items-center justify-center space-y-4">
                <RefreshCw className="w-10 h-10 animate-spin text-brand-orange opacity-20" />
                <p className="font-mono text-[10px] uppercase font-black tracking-widest opacity-30">Connecting to proof feed...</p>
             </div>
           ) : reviews.length === 0 ? (
             <div className="h-64 flex flex-col items-center justify-center space-y-4 bg-white border-2 border-dashed border-on-surface/10 rounded-3xl">
                <Shield className="w-12 h-12 text-on-surface/10" />
                <p className="font-mono text-[10px] uppercase font-black tracking-[0.2em] opacity-40">Console Clear: No matching records found.</p>
             </div>
           ) : viewMode === 'swipe' ? (
              <SwipeView 
                entry={reviews[0]} 
                onAction={(action: any) => handleAction(reviews[0].id, action)} 
              />
           ) : (
              <QueueView entries={reviews} />
           )}
        </div>

      </div>
    </AdminLayout>
  );
}

function MonitorCard({ title, value, status = 'neutral', icon: Icon }: any) {
  return (
    <Card className="p-6 border-2 border-on-surface shadow-[4px_4px_0px_black] bg-white flex items-center justify-between">
      <div className="space-y-1">
        <p className="text-[9px] font-mono font-black uppercase opacity-40">{title}</p>
        <p className="text-3xl font-display font-black uppercase italic text-on-surface leading-none">{value}</p>
      </div>
      <div className="flex flex-col items-end gap-2">
        <Icon className="w-6 h-6 text-on-surface/20" />
        <StatusLight state={status} pulse={status !== 'green' && status !== 'neutral'} />
      </div>
    </Card>
  );
}

function SwipeView({ entry, onAction }: any) {
  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in zoom-in-95 duration-300">
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Proof Visual */}
          <div className="relative group">
             <div className="absolute inset-0 bg-brand-orange opacity-0 group-hover:opacity-10 transition-all blur-xl duration-500 rounded-full" />
             <div className="relative border-4 border-on-surface p-4 bg-white shadow-[12px_12px_0px_black] rounded-[2.5rem]">
                <img 
                  src={entry.photoUrl || entry.proofImage} 
                  alt="Proof" 
                  className="w-full aspect-[4/5] object-cover rounded-[1.8rem] border-2 border-on-surface"
                />
                
                {/* Meta Overlay */}
                <div className="absolute bottom-10 left-10 right-10 flex justify-between items-end">
                   <div className="bg-on-surface text-white px-3 py-1 rounded font-mono text-[8px] font-black uppercase tracking-widest bg-opacity-80 backdrop-blur-sm">
                      IMG_SOURCE: {entry.id.slice(0,8)}
                   </div>
                </div>
             </div>
          </div>

          {/* Details & Controls */}
          <div className="space-y-8 pt-4">
             <div className="space-y-2">
                <div className="flex items-center gap-3">
                   <div className="w-2 h-2 bg-brand-orange" />
                   <h2 className="text-4xl font-display font-black uppercase italic tracking-tighter leading-tight">
                     {entry.displayName || 'Anonymous_Agent'}
                   </h2>
                </div>
                <p className="text-[10px] font-mono font-black uppercase tracking-widest text-on-surface/40">
                   Mission: <span className="text-on-surface">{entry.tripTitle || entry.missionTitle || 'Undefined'}</span>
                </p>
             </div>

             <div className="bg-white border-2 border-on-surface p-6 rounded-2xl shadow-[6px_6px_0px_black]">
                <h4 className="text-[9px] font-mono font-black uppercase opacity-40 mb-3">Field_Note_Transcription</h4>
                <p className="font-mono text-xs leading-relaxed italic border-l-4 border-brand-orange pl-4 bg-brand-orange/5 py-4">
                  "{entry.fieldNote || 'No verbal identification provided.'}"
                </p>
             </div>

             {/* Action Grid */}
             <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => onAction('approve')}
                  className="col-span-2 py-6 bg-brand-lime text-on-surface border-4 border-on-surface shadow-[8px_8px_0px_black] flex flex-col items-center justify-center gap-2 group hover:shadow-[4px_4px_0px_black] active:translate-y-1 transition-all"
                >
                   <Check className="w-8 h-8 group-hover:scale-125 transition-transform" />
                   <span className="font-display text-xl font-black uppercase italic tracking-tighter">APPROVE_PROTOCOL</span>
                </button>
                <button 
                  onClick={() => onAction('request_info')}
                  className="py-4 bg-[#FFDD00] text-on-surface border-4 border-on-surface shadow-[6px_6px_0px_black] flex items-center justify-center gap-2 font-display font-black uppercase italic text-sm hover:shadow-[2px_2px_0px_black] active:translate-y-1 transition-all"
                >
                   <Clock className="w-4 h-4" /> REQ_INFO
                </button>
                <button 
                  onClick={() => onAction('reject')}
                  className="py-4 bg-rose-500 text-white border-4 border-on-surface shadow-[6px_6px_0px_black] flex items-center justify-center gap-2 font-display font-black uppercase italic text-sm hover:shadow-[2px_2px_0px_black] active:translate-y-1 transition-all"
                >
                   <X className="w-4 h-4" /> REJECT
                </button>
             </div>
          </div>
       </div>

       {/* Meta Strip */}
       <footer className="pt-8 border-t-2 border-on-surface/10 flex flex-wrap gap-8 text-[9px] font-mono font-black uppercase opacity-40">
          <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-on-surface rounded-full" /> UID: {entry.userId}</div>
          <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-on-surface rounded-full" /> Submitted: {entry.createdAt ? format(entry.createdAt.toDate(), 'MM/dd HH:mm') : 'Unknown'}</div>
          <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-on-surface rounded-full" /> Confidence: {(entry.aiScore || 100)}%</div>
       </footer>
    </div>
  );
}

function QueueView({ entries }: { entries: any[] }) {
  return (
    <div className="overflow-x-auto border-2 border-on-surface shadow-[8px_8px_0px_black] rounded-[2.5rem] bg-white">
       <table className="w-full text-left border-collapse">
          <thead>
             <tr className="bg-[#FAF8F5] border-b-2 border-on-surface text-[10px] font-mono font-black uppercase text-on-surface/50">
                <th className="py-4 px-6">Timestamp</th>
                <th className="py-4 px-6">Agent</th>
                <th className="py-4 px-6">Mission</th>
                <th className="py-4 px-6">AI_Score</th>
                <th className="py-4 px-6 text-center">Protocol</th>
             </tr>
          </thead>
          <tbody className="divide-y divide-on-surface/10 font-mono text-[10px] uppercase font-bold">
             {entries.map((e) => (
                <tr key={e.id} className="hover:bg-on-surface/5 cursor-pointer transition-all">
                   <td className="py-4 px-6 opacity-40 whitespace-nowrap">
                     {e.createdAt ? format(e.createdAt.toDate(), 'MM/dd HH:mm') : '---'}
                   </td>
                   <td className="py-4 px-6 font-black text-on-surface">
                     {e.displayName || 'Anon'}
                   </td>
                   <td className="py-4 px-6 truncate max-w-[200px]">
                     {e.tripTitle || e.missionTitle || 'Undefined'}
                   </td>
                   <td className="py-4 px-6 font-black text-brand-orange">
                     {e.aiScore || 'N/A'}%
                   </td>
                   <td className="py-4 px-6 text-center">
                     <button className="p-2 border border-on-surface rounded hover:bg-on-surface hover:text-white">
                        <Eye className="w-3 h-3" />
                     </button>
                   </td>
                </tr>
             ))}
          </tbody>
       </table>
    </div>
  );
}
