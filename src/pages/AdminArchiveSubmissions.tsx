import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Database, 
  Calendar, 
  Clock, 
  FileText, 
  CheckSquare, 
  AlertTriangle, 
  Loader2, 
  Play, 
  History, 
  User, 
  Tag, 
  CheckSquare as CheckedIcon,
  Square,
  Sparkles,
  Activity,
  Sliders,
  ShieldAlert,
  ShieldCheck,
  Zap,
  Cpu
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';
import { 
  previewSubmissionArchive, 
  runSubmissionArchive, 
  getArchiveHistory, 
  ArchiveBatch, 
  ArchivePreviewResult 
} from '../services/archiveService';
import { doc, getDoc, setDoc, collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function AdminArchiveSubmissions() {
  const navigate = useNavigate();
  const { profile, loading: appLoading } = useApp();
  const { isAdmin } = useTheme();

  // Route auth gates
  const isAdminAuthorized = isAdmin || profile?.role === 'admin' || (profile as any)?.isAdmin || (profile as any)?.admin;

  // Date controls
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [startTime, setStartTime] = useState('00:00');
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [endTime, setEndTime] = useState('23:59');

  // Scope states
  const [statusFilters, setStatusFilters] = useState({
    pending_review: true,
    approved: true,
    needs_more_proof: true,
    rejected: true
  });

  const [includeSubmissions, setIncludeSubmissions] = useState(true);
  const [includeProofReviews, setIncludeProofReviews] = useState(true);
  const [reverseXp, setReverseXp] = useState(false);

  // General States
  const [previewLoading, setPreviewLoading] = useState(false);
  const [runLoading, setRunLoading] = useState(false);
  const [previewData, setPreviewData] = useState<ArchivePreviewResult | null>(null);
  const [historyBatches, setHistoryBatches] = useState<ArchiveBatch[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Modal / Confirm States
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [typedConfirm, setTypedConfirm] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'err' } | null>(null);

  // AI Governance Controls and Statistics Tab State
  const [activeTab, setActiveTab] = useState<'archive' | 'ai_governance'>('archive');
  const [aiConfig, setAiConfig] = useState({
    aiImageAnalysisEnabled: true,
    maxDailyAiScansPerUser: 5,
    maxAiScansPerProof: 1,
    maxAiRetriesPerProof: 1,
    maxGlobalAiScansPerDay: 500,
    aiCostGuardEnabled: true
  });
  const [aiConfigSaving, setAiConfigSaving] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const fetchAiConfigAndLogs = async () => {
    setLogsLoading(true);
    try {
      // 1. Fetch live global config
      const docRef = doc(db, 'appConfig', 'global');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        setAiConfig({
          aiImageAnalysisEnabled: data.aiImageAnalysisEnabled !== undefined ? data.aiImageAnalysisEnabled : true,
          maxDailyAiScansPerUser: data.maxDailyAiScansPerUser !== undefined ? data.maxDailyAiScansPerUser : 5,
          maxAiScansPerProof: data.maxAiScansPerProof !== undefined ? data.maxAiScansPerProof : 1,
          maxAiRetriesPerProof: data.maxAiRetriesPerProof !== undefined ? data.maxAiRetriesPerProof : 1,
          maxGlobalAiScansPerDay: data.maxGlobalAiScansPerDay !== undefined ? data.maxGlobalAiScansPerDay : 500,
          aiCostGuardEnabled: data.aiCostGuardEnabled !== undefined ? data.aiCostGuardEnabled : true
        });
      }

      // 2. Fetch AI usage logs
      const logsRef = collection(db, 'aiUsageLogs');
      const q = query(logsRef, orderBy('createdAt', 'desc'));
      const querySnap = await getDocs(q);
      const fetchedLogs: any[] = [];
      querySnap.forEach((d) => {
        const ldata = d.data();
        fetchedLogs.push({
          id: d.id,
          ...ldata,
          createdAt: ldata.createdAt?.toDate ? ldata.createdAt.toDate() : new Date(ldata.createdAt)
        });
      });
      setLogs(fetchedLogs);
    } catch (err) {
      console.error("Failed to load AI governance data:", err);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleSaveAiConfig = async (updatedFields: Partial<typeof aiConfig>) => {
    const newConfig = { ...aiConfig, ...updatedFields };
    setAiConfig(newConfig);
    setAiConfigSaving(true);
    try {
      const docRef = doc(db, 'appConfig', 'global');
      await setDoc(docRef, newConfig, { merge: true });
      setToast({ message: "AI Caps and Governance config saved successfully!", type: 'success' });
    } catch (err: any) {
      console.error("Failed to save AI config:", err);
      setToast({ message: `Config Sync Error: ${err.message}`, type: 'err' });
    } finally {
      setAiConfigSaving(false);
    }
  };

  const aiStats = React.useMemo(() => {
    const stats = {
      totalScans: logs.length,
      scansToday: 0,
      failedScans: 0,
      blockedScans: 0,
      totalCostUnits: 0,
      scansByUser: {} as Record<string, number>,
      scansByMission: {} as Record<string, number>,
      scansByStatus: {} as Record<string, number>
    };

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    logs.forEach(log => {
      const time = log.createdAt instanceof Date ? log.createdAt : new Date(log.createdAt);
      if (time >= startOfToday) {
        stats.scansToday += 1;
      }
      
      if (log.status === 'failed') {
        stats.failedScans += 1;
      } else if (log.status === 'blocked_by_cap' || log.status === 'skipped') {
        stats.blockedScans += 1;
      }
      
      stats.totalCostUnits += log.estimatedCostUnits || 0;

      // Group by user
      const userKey = log.userId || 'unknown';
      stats.scansByUser[userKey] = (stats.scansByUser[userKey] || 0) + 1;

      // Group by mission/deck
      const missionKey = log.missionId || log.deckId || 'unknown';
      stats.scansByMission[missionKey] = (stats.scansByMission[missionKey] || 0) + 1;

      // Group by status
      const statusKey = log.status || 'unknown';
      stats.scansByStatus[statusKey] = (stats.scansByStatus[statusKey] || 0) + 1;
    });

    return stats;
  }, [logs]);

  useEffect(() => {
    if (isAdminAuthorized && activeTab === 'ai_governance') {
      fetchAiConfigAndLogs();
    }
  }, [isAdminAuthorized, activeTab]);

  // Load history
  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const batches = await getArchiveHistory();
      setHistoryBatches(batches);
    } catch (err: any) {
      console.error('Failed to load history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminAuthorized) {
      fetchHistory();
    }
  }, [isAdminAuthorized]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  if (appLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white font-mono flex flex-col items-center justify-center p-8">
        <Loader2 className="w-12 h-12 text-brand-orange animate-spin mb-4" />
        <p className="text-xs uppercase tracking-widest opacity-60">Initializing Systems...</p>
      </div>
    );
  }

  // Security gate
  if (!isAdminAuthorized) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-8 text-center space-y-8 font-mono">
        <div className="w-20 h-20 bg-red-500/10 border-2 border-red-500 flex items-center justify-center animate-bounce">
          <AlertTriangle className="w-10 h-10 text-red-500" />
        </div>
        <div className="space-y-4">
          <h1 className="text-3xl font-display font-black uppercase tracking-tighter text-red-500">ACCESS_DENIED</h1>
          <p className="text-xs opacity-60 max-w-sm mx-auto leading-relaxed">
            You do not possess the required credentials to access the submission archival protocols.
          </p>
        </div>
        <button 
          onClick={() => navigate('/basecamp')}
          className="flex items-center gap-2 px-6 py-3 border-2 border-white text-xs uppercase hover:bg-white hover:text-black transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> RE-ENTER_SAFE_ZONE
        </button>
      </div>
    );
  }

  // Handlers
  const handleToggleStatus = (key: keyof typeof statusFilters) => {
    setStatusFilters(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const getUTCDateTimeStrings = () => {
    const startStr = `${startDate}T${startTime}:00`;
    const endStr = `${endDate}T${endTime}:59`;
    
    // Create Date objects using local timezone
    const startD = new Date(startStr);
    const endD = new Date(endStr);

    return {
      startAt: startD.toISOString(),
      endAt: endD.toISOString()
    };
  };

  const handlePreview = async () => {
    setPreviewLoading(true);
    setPreviewData(null);
    try {
      const { startAt, endAt } = getUTCDateTimeStrings();
      const selectedStatuses = Object.entries(statusFilters)
        .filter(([_, enabled]) => enabled)
        .map(([status]) => status);

      if (selectedStatuses.length === 0) {
        setToast({ message: 'Must select at least one status to archive.', type: 'err' });
        setPreviewLoading(false);
        return;
      }

      const res = await previewSubmissionArchive({
        startAt,
        endAt,
        statuses: selectedStatuses
      });
      setPreviewData(res);
      setToast({ message: `Scanned ${res.count} active submissions within date range!`, type: 'success' });
    } catch (err: any) {
      console.error(err);
      setToast({ message: err.message || 'Inspection scan handshaked with errors.', type: 'err' });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleRunArchive = async () => {
    if (typedConfirm !== 'ARCHIVE') return;
    setRunLoading(true);
    setShowConfirmModal(false);
    try {
      const { startAt, endAt } = getUTCDateTimeStrings();
      const selectedStatuses = Object.entries(statusFilters)
        .filter(([_, enabled]) => enabled)
        .map(([status]) => status);

      const res = await runSubmissionArchive({
        startAt,
        endAt,
        statuses: selectedStatuses,
        includeSubmissions,
        includeProofReviews,
        reverseXp,
        confirmationText: typedConfirm
      });

      setToast({ 
        message: `Successfully archived ${res.submissionsArchived} submissions & ${res.proofReviewsArchived} reviews!`, 
        type: 'success' 
      });

      setTypedConfirm('');
      setPreviewData(null);
      // reload history logic
      fetchHistory();
    } catch (err: any) {
      console.error(err);
      setToast({ message: err.message || 'Archival batch execution aborted due to errors.', type: 'err' });
    } finally {
      setRunLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070708] text-gray-100 font-mono p-4 sm:p-6 md:p-8 pb-24 selection:bg-brand-orange selection:text-black">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header / Nav Section */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-brand-orange/10 border-2 border-brand-orange text-brand-orange flex items-center justify-center rounded-xl shadow-[2px_2px_0px_rgba(235,94,40,0.2)]">
                <Database className="w-5 h-5" />
              </div>
              <h1 className="text-2xl font-display font-black uppercase tracking-tight text-white italic">Archive Submissions</h1>
            </div>
            <p className="text-[10px] uppercase tracking-widest text-gray-500">
              Admin protocol // Data curation node Alpha-9
            </p>
          </div>
          
          <button 
            onClick={() => navigate('/admin')}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-neutral-900 border border-white/10 hover:bg-neutral-800 text-xs font-bold uppercase tracking-wider rounded-lg transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-gray-400" /> Back to Dashboard
          </button>
        </header>

        {/* Tab Switcher */}
        <div className="flex border-b border-white/10 gap-2 mb-2">
          <button
            onClick={() => setActiveTab('archive')}
            className={cn(
              "px-5 py-3 text-xs tracking-widest font-bold uppercase transition-all border-b-2 -mb-[2px]",
              activeTab === 'archive' 
                ? "border-brand-orange text-white" 
                : "border-transparent text-gray-500 hover:text-gray-300"
            )}
          >
            Archive Submissions
          </button>
          <button
            onClick={() => setActiveTab('ai_governance')}
            className={cn(
              "px-5 py-3 text-xs tracking-widest font-bold uppercase transition-all border-b-2 -mb-[2px] flex items-center gap-2",
              activeTab === 'ai_governance' 
                ? "border-brand-orange text-white" 
                : "border-transparent text-gray-500 hover:text-gray-300"
            )}
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-400" /> AI Governance & Caps
          </button>
        </div>

        {activeTab === 'archive' && (
          <>
            {/* Warning Panel */}
            <div className="border border-brand-orange/30 bg-brand-orange/5 p-4 rounded-xl flex gap-4 text-xs leading-relaxed text-brand-orange/90 max-w-4xl">
          <AlertTriangle className="w-6 h-6 shrink-0 text-brand-orange animate-pulse" />
          <div className="space-y-1">
            <span className="font-bold uppercase tracking-wider block text-brand-orange text-sm">Archival System Notice</span>
            <p>
              This is an <strong>archive system</strong>, not a delete operation. Archived data is masked from seasonal leaderboards, feeds, user logbooks, decks, and app stats, but resides permanently inside the database. This action is safely reversible via database overrides should a roll-back verify correct.
            </p>
          </div>
        </div>

        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Input Form (40% width) */}
          <section className="lg:col-span-5 space-y-6">
            <div className="bg-[#0f1012] border border-white/10 p-6 rounded-2xl space-y-6 shadow-xl text-left">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#eb5e28] border-b border-white/5 pb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> 1. Date Range
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-gray-500">Start Date</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-neutral-900 border border-white/10 p-3 text-xs outline-none focus:border-brand-orange rounded-lg font-mono text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-gray-500">Start Time</label>
                  <div className="relative">
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full bg-neutral-900 border border-white/10 p-3 text-xs outline-none focus:border-brand-orange rounded-lg font-mono text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2 col-span-1 sm:col-span-1">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-gray-500">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-neutral-900 border border-white/10 p-3 text-xs outline-none focus:border-brand-orange rounded-lg font-mono text-white"
                  />
                </div>

                <div className="space-y-2 col-span-1 sm:col-span-1">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-gray-500">End Time</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-neutral-900 border border-white/10 p-3 text-xs outline-none focus:border-brand-orange rounded-lg font-mono text-white"
                  />
                </div>
              </div>

              {/* Status checkboxes */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 border-b border-white/5 pb-2">
                  2. Status Filter Curation
                </h3>
                <p className="text-[9px] text-gray-500 leading-normal uppercase">
                  Select which entry status buckets to target during evaluation:
                </p>
                
                <div className="grid grid-cols-2 gap-3 pt-1">
                  {Object.entries(statusFilters).map(([status, enabled]) => (
                    <button
                      key={status}
                      onClick={() => handleToggleStatus(status as any)}
                      type="button"
                      className={cn(
                        "flex items-center gap-3 p-3 border rounded-xl text-left transition-all uppercase text-[9px] font-bold tracking-wider",
                        enabled 
                          ? "bg-brand-orange/10 border-brand-orange text-brand-orange" 
                          : "bg-neutral-900/50 border-white/5 text-gray-400 hover:border-white/10 hover:bg-neutral-900"
                      )}
                    >
                      {enabled ? <CheckedIcon className="w-3.5 h-3.5 text-brand-orange shrink-0" /> : <Square className="w-3.5 h-3.5 text-gray-600 shrink-0" />}
                      <span>{status.replace('_', ' ')}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Scope controls */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 border-b border-white/5 pb-2">
                  3. Archive Operations Scope
                </h3>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-neutral-950 rounded-xl border border-white/5">
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-black uppercase text-white tracking-widest">Archive Submissions</span>
                      <p className="text-[8px] uppercase tracking-wider text-gray-500">Files inside &apos;entries&apos; matches</p>
                    </div>
                    <input 
                      type="checkbox"
                      checked={includeSubmissions}
                      onChange={(e) => setIncludeSubmissions(e.target.checked)}
                      className="accent-brand-orange w-4 h-4 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-neutral-950 rounded-xl border border-white/5">
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-black uppercase text-white tracking-widest">Archive Reviews</span>
                      <p className="text-[8px] uppercase tracking-wider text-gray-500">Related &apos;proofReviews&apos; items</p>
                    </div>
                    <input 
                      type="checkbox"
                      checked={includeProofReviews}
                      onChange={(e) => setIncludeProofReviews(e.target.checked)}
                      className="accent-brand-orange w-4 h-4 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-neutral-950 rounded-xl border border-brand-orange/30 bg-brand-orange/5">
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-black uppercase text-brand-orange tracking-widest">REVERSE POINTS &amp; XP</span>
                      <p className="text-[8px] uppercase tracking-wider text-brand-orange/60">Deduct awarded points from affected agents</p>
                    </div>
                    <input 
                      type="checkbox"
                      checked={reverseXp}
                      onChange={(e) => setReverseXp(e.target.checked)}
                      className="accent-brand-orange w-4 h-4 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Primary Action Row */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handlePreview}
                  disabled={previewLoading || runLoading}
                  className="w-full flex items-center justify-center gap-2 p-4 bg-white hover:bg-gray-100 text-black font-display font-black uppercase text-xs rounded-xl shadow-[4px_4px_0px_rgba(255,255,255,0.1)] active:translate-y-0.5 active:shadow-none disabled:opacity-45 disabled:pointer-events-none transition-all tracking-wider font-mono italic"
                >
                  {previewLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-black" />
                      Scanning Database...
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-black text-black" />
                      Preview Archive Impact
                    </>
                  )}
                </button>
              </div>

            </div>
          </section>

          {/* Right Column: Dynamic Preview Panel (70% width) */}
          <section className="lg:col-span-7 space-y-6 text-left">
            <div className="bg-[#0f1012] border border-white/10 p-6 rounded-2xl space-y-6 shadow-xl min-h-[500px] flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-white border-b border-white/5 pb-2 flex items-center justify-between">
                  <span>Impact Profile Inspector</span>
                  <span className="text-[8px] text-gray-400 font-mono tracking-widest uppercase bg-neutral-950 px-2 py-0.5 rounded-md">Live Output</span>
                </h3>
                
                {!previewData && !previewLoading && (
                  <div className="py-24 text-center space-y-4">
                    <div className="w-12 h-12 bg-neutral-950 border border-white/10 rounded-full flex items-center justify-center mx-auto text-gray-500">
                      <FileText className="w-5 h-5 text-gray-500" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Ready for biometric evaluation</p>
                      <p className="text-[10px] text-gray-500 uppercase max-w-sm mx-auto leading-relaxed">
                        Configure dates, select status targets, and press preview to evaluate database statistics.
                      </p>
                    </div>
                  </div>
                )}

                {previewLoading && (
                  <div className="py-24 text-center space-y-4">
                    <Loader2 className="w-10 h-10 text-brand-orange animate-spin mx-auto" />
                    <p className="text-[10px] uppercase text-gray-500 tracking-widest animate-pulse">Running range queries on production indices...</p>
                  </div>
                )}

                {previewData && !previewLoading && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6 pt-4"
                  >
                    
                    {/* Big Stats grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-3 bg-neutral-950 border border-white/5 rounded-xl text-center">
                        <span className="text-[8px] font-mono uppercase tracking-widest text-gray-500">Submissions matched</span>
                        <p className="text-2xl font-black font-display text-white italic tracking-tight">{previewData.count}</p>
                      </div>
                      <div className="p-3 bg-neutral-950 border border-white/5 rounded-xl text-center">
                        <span className="text-[8px] font-mono uppercase tracking-widest text-gray-500">Linked Reviews</span>
                        <p className="text-2xl font-black font-display text-brand-orange italic tracking-tight">{previewData.proofReviewCount}</p>
                      </div>
                      <div className="p-3 bg-neutral-950 border border-white/5 rounded-xl text-center">
                        <span className="text-[8px] font-mono uppercase tracking-widest text-gray-500">XP Impact</span>
                        <p className={cn("text-2xl font-black font-display italic tracking-tight", reverseXp ? "text-error" : "text-gray-400")}>
                          -{previewData.totalAwardedXp}
                        </p>
                      </div>
                      <div className="p-3 bg-neutral-950 border border-white/5 rounded-xl text-center">
                        <span className="text-[8px] font-mono uppercase tracking-widest text-gray-500">Already Archived</span>
                        <p className="text-2xl font-black font-display text-gray-500 italic tracking-tight">{previewData.alreadyArchivedCount}</p>
                      </div>
                    </div>

                    {/* Breakdown sub panels */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* Breakdown Status */}
                      <div className="p-4 bg-neutral-950 border border-white/5 rounded-xl space-y-3">
                        <span className="text-[8px] font-mono font-bold uppercase tracking-widest text-gray-500 block border-b border-white/5 pb-1 select-none">Status Breakdown</span>
                        <div className="space-y-1.5 text-xs">
                          {Object.keys(previewData.countByStatus).length === 0 ? (
                            <p className="text-[10px] uppercase text-gray-500 select-none py-1">Zero targeted statuses found.</p>
                          ) : (
                            Object.entries(previewData.countByStatus).map(([status, amt]) => (
                              <div key={status} className="flex justify-between items-center bg-neutral-900 px-2.5 py-1.5 rounded-lg border border-white/5">
                                <span className="uppercase text-[9px] font-black text-gray-300 font-bold">{status.replace('_', ' ')}</span>
                                <span className="font-bold text-white font-mono text-xs">{amt}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Breakthrough Deck */}
                      <div className="p-4 bg-neutral-950 border border-white/5 rounded-xl space-y-3">
                        <span className="text-[8px] font-mono font-bold uppercase tracking-widest text-gray-500 block border-b border-white/5 pb-1 select-none">Mission Decks list</span>
                        <div className="space-y-1.5 text-xs max-h-32 overflow-y-auto">
                          {Object.keys(previewData.countByDeck).length === 0 ? (
                            <p className="text-[10px] uppercase text-gray-500 select-none py-1">Zero targeted decks found.</p>
                          ) : (
                            Object.entries(previewData.countByDeck).map(([deck, amt]) => (
                              <div key={deck} className="flex justify-between items-center bg-neutral-900 px-2.5 py-1.5 rounded-lg border border-white/5">
                                <span className="uppercase text-[9px] font-black text-gray-300 font-bold tracking-wider">{deck}</span>
                                <span className="font-bold text-white font-mono text-xs">{amt}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                    </div>

                    {/* Highly Targeted Samples */}
                    <div className="p-4 bg-neutral-950 border border-white/5 rounded-xl space-y-2">
                      <span className="text-[8px] font-mono font-bold uppercase tracking-widest text-gray-500 block border-b border-white/5 pb-1 select-none">Sample Submission IDs matched</span>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {previewData.sampleSubmissionIds.length === 0 ? (
                          <span className="text-[10px] uppercase text-gray-500 py-1">No sample records available.</span>
                        ) : (
                          previewData.sampleSubmissionIds.map(id => (
                            <span key={id} className="text-[8px] font-mono bg-neutral-900 border border-white/5 px-2 py-1 text-gray-400 rounded-md select-all hover:border-white/25 hover:text-white transition-all">
                              {id}
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                  </motion.div>
                )}

              </div>

              {/* Action trigger footer */}
              {previewData && !previewLoading && (
                <div className="pt-6 border-t border-white/5 text-right">
                  <button 
                    onClick={() => {
                      setTypedConfirm('');
                      setShowConfirmModal(true);
                    }}
                    type="button"
                    className="w-full sm:w-auto px-6 py-3.5 bg-brand-orange hover:bg-brand-orange/90 text-black font-display font-black uppercase tracking-wider text-xs rounded-xl shadow-[4px_4px_0px_rgba(235,94,40,0.2)] active:translate-y-0.5 active:shadow-none transition-all italic"
                  >
                    Execute Curation Archive ({previewData.count})
                  </button>
                </div>
              )}

            </div>
          </section>

        </div>

        {/* Curation Batches History Log */}
        <section className="bg-[#0f1012] border border-white/10 p-6 rounded-2xl shadow-xl space-y-6 text-left">
          <h3 className="text-xs font-black uppercase tracking-widest text-white border-b border-white/5 pb-2 flex items-center gap-2">
            <History className="w-4 h-4 text-brand-orange" /> Archive History Log
          </h3>

          {historyLoading ? (
            <div className="py-12 text-center">
              <Loader2 className="w-8 h-8 text-brand-orange animate-spin mx-auto mb-2" />
              <p className="text-[9px] uppercase text-gray-500 tracking-wider">Decoding historical audit logs...</p>
            </div>
          ) : historyBatches.length === 0 ? (
            <div className="py-12 text-center text-gray-500 text-xs uppercase italic select-none">
              Zero historic archive batches detected on record.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-300 border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-[9px] font-black uppercase tracking-widest text-gray-500">
                    <th className="py-3 px-4">Batch ID</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Range (UTC / Local)</th>
                    <th className="py-3 px-4">Submissions</th>
                    <th className="py-3 px-4">Reviews</th>
                    <th className="py-3 px-4">XP Reversed</th>
                    <th className="py-3 px-4">Archived At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {historyBatches.map((batch) => (
                    <tr key={batch.id} className="hover:bg-white/5 transition-all">
                      <td className="py-3 px-4 font-mono select-all text-white font-bold">{batch.archiveBatchId}</td>
                      <td className="py-3 px-4">
                        <span className={cn(
                          "text-[8px] font-mono font-bold uppercase px-2 py-0.5 rounded-md",
                          batch.status === 'completed' ? "bg-brand-lime/15 text-brand-lime" : "",
                          batch.status === 'running' ? "bg-brand-orange/15 text-brand-orange animate-pulse" : "",
                          batch.status === 'failed' ? "bg-red-500/15 text-red-500" : ""
                        )}>
                          {batch.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[10px] text-gray-400 font-mono">
                        <div>{new Date(batch.startAt).toLocaleString()}</div>
                        <div className="text-[8px] opacity-40">to {new Date(batch.endAt).toLocaleString()}</div>
                      </td>
                      <td className="py-3 px-4 font-bold text-white">{batch.submissionsArchived} / {batch.submissionsMatched}</td>
                      <td className="py-3 px-4 text-brand-orange font-bold font-mono">{batch.proofReviewsArchived}</td>
                      <td className="py-3 px-4 font-mono font-bold text-gray-400">
                        {batch.reverseXp ? `-${batch.xpReversedTotal}` : "Off"}
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-[10px] font-mono">
                        {batch.createdAt ? new Date(batch.createdAt).toLocaleString() : 'Pending'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </section>
          </>
        )}

        {/* Tab 2: AI Governance & Caps control console */}
        {activeTab === 'ai_governance' && (
          <div className="space-y-8 text-left">
            
            {/* AI Control Header Warning / Notice */}
            <div className="border border-sky-500/30 bg-sky-500/5 p-4 rounded-xl flex gap-4 text-xs leading-relaxed text-sky-400 max-w-4xl">
              <Sparkles className="w-6 h-6 shrink-0 text-sky-450 animate-pulse" />
              <div className="space-y-1">
                <span className="font-bold uppercase tracking-wider block text-sky-300 text-sm">AI SYSTEM CONTROL VALVE</span>
                <p>
                  Welcome to the **Gemini Optical Proof Governance Terminal**. Here, admins can adjust strict consumption boundaries, activate safety cost guards, or leverage the emergency kill-switch to enforce immediate client-only and server-only fallback behaviors live.
                </p>
              </div>
            </div>

            {/* Config Panels */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Configuration Panel CARD */}
              <div className="bg-[#0f1012] border border-white/10 p-6 rounded-2xl space-y-6 shadow-xl text-left">
                <h3 className="text-xs font-black uppercase tracking-widest text-sky-400 border-b border-white/5 pb-2 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-sky-400" /> Threshold & Quota Gates
                </h3>

                <div className="space-y-4">
                  {/* Global Switch */}
                  <div className="flex items-center justify-between p-3.5 bg-neutral-950 border border-white/5 rounded-xl">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-white uppercase block">AI Proof Integration</span>
                      <span className="text-[9px] text-gray-500 uppercase tracking-wide">Toggle on to run optical verification scans</span>
                    </div>
                    <button
                      onClick={() => handleSaveAiConfig({ aiImageAnalysisEnabled: !aiConfig.aiImageAnalysisEnabled })}
                      className={cn(
                        "px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all border font-mono font-bold",
                        aiConfig.aiImageAnalysisEnabled
                          ? "bg-brand-lime/15 text-brand-lime border-brand-lime"
                          : "bg-red-500/15 text-red-500 border-red-500"
                      )}
                    >
                      {aiConfig.aiImageAnalysisEnabled ? 'ENABLED' : 'DISABLED / BYPASSED'}
                    </button>
                  </div>

                  {/* Cost Guard Switch */}
                  <div className="flex items-center justify-between p-3.5 bg-neutral-950 border border-white/5 rounded-xl">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-white uppercase block">AI Cost Guard Protection</span>
                      <span className="text-[9px] text-gray-500 uppercase tracking-wide">Auto-restrict repetitive or duplicate scanning calls</span>
                    </div>
                    <button
                      onClick={() => handleSaveAiConfig({ aiCostGuardEnabled: !aiConfig.aiCostGuardEnabled })}
                      className={cn(
                        "px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all border font-mono font-bold",
                        aiConfig.aiCostGuardEnabled
                          ? "bg-brand-lime/15 text-brand-lime border-brand-lime"
                          : "bg-red-500/15 text-red-500 border-red-500"
                      )}
                    >
                      {aiConfig.aiCostGuardEnabled ? 'GUARD ACTIVE' : 'GUARD OFF'}
                    </button>
                  </div>

                  {/* Daily user cap input */}
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-gray-500 block">Max Daily AI Scans Per User</label>
                    <div className="flex gap-3">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={aiConfig.maxDailyAiScansPerUser}
                        onChange={(e) => setAiConfig(prev => ({ ...prev, maxDailyAiScansPerUser: parseInt(e.target.value) || 0 }))}
                        className="w-24 bg-neutral-950 border border-white/10 p-3 text-xs outline-none focus:border-sky-400 rounded-lg font-mono text-center text-white"
                      />
                      <button
                        onClick={() => handleSaveAiConfig({ maxDailyAiScansPerUser: aiConfig.maxDailyAiScansPerUser })}
                        disabled={aiConfigSaving}
                        className="px-4 bg-sky-500/10 border border-sky-400/20 text-sky-400 font-display font-black uppercase tracking-wider text-[10px] rounded-lg hover:bg-sky-500/25 active:translate-y-0.5 transition-all"
                      >
                        Adjust Cap
                      </button>
                    </div>
                    <span className="text-[9px] text-gray-500 uppercase block">Default is 5 per user per day. Admins automatically bypass to 500 scans.</span>
                  </div>

                  {/* Max scans per proof input */}
                  <div className="space-y-1.5 pt-2">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-gray-500 block">Scan Limits Per Unique Proof</label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-[8px] uppercase text-gray-500">Initial scans</span>
                        <input
                          type="number"
                          min="1"
                          max="5"
                          value={aiConfig.maxAiScansPerProof}
                          onChange={(e) => setAiConfig(prev => ({ ...prev, maxAiScansPerProof: parseInt(e.target.value) || 1 }))}
                          className="w-full bg-neutral-950 border border-white/10 p-3 text-xs outline-none focus:border-sky-400 rounded-lg font-mono text-center text-white"
                          onBlur={(e) => handleSaveAiConfig({ maxAiScansPerProof: parseInt(e.target.value) || 1 })}
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[8px] uppercase text-gray-500">Allowed system retries</span>
                        <input
                          type="number"
                          min="0"
                          max="5"
                          value={aiConfig.maxAiRetriesPerProof}
                          onChange={(e) => setAiConfig(prev => ({ ...prev, maxAiRetriesPerProof: parseInt(e.target.value) || 1 }))}
                          className="w-full bg-neutral-950 border border-white/10 p-3 text-xs outline-none focus:border-sky-400 rounded-lg font-mono text-center text-white"
                          onBlur={(e) => handleSaveAiConfig({ maxAiRetriesPerProof: parseInt(e.target.value) || 1 })}
                        />
                      </div>
                    </div>
                    <span className="text-[9px] text-gray-500 uppercase block">Filters duplicate queries if the user repeatedly refreshes.</span>
                  </div>

                  {/* Max Global Cap input */}
                  <div className="space-y-2 pt-2">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-gray-500 block">Daily System-wide Global Scan Cap</label>
                    <div className="flex gap-3">
                      <input
                        type="number"
                        min="0"
                        max="10000"
                        value={aiConfig.maxGlobalAiScansPerDay}
                        onChange={(e) => setAiConfig(prev => ({ ...prev, maxGlobalAiScansPerDay: parseInt(e.target.value) || 500 }))}
                        className="w-28 bg-neutral-950 border border-white/10 p-3 text-xs outline-none focus:border-sky-400 rounded-lg font-mono text-center text-white"
                      />
                      <button
                        onClick={() => handleSaveAiConfig({ maxGlobalAiScansPerDay: aiConfig.maxGlobalAiScansPerDay })}
                        disabled={aiConfigSaving}
                        className="px-4 bg-sky-500/10 border border-sky-400/20 text-sky-400 font-display font-black uppercase tracking-wider text-[10px] rounded-lg hover:bg-sky-500/25 active:translate-y-0.5 transition-all"
                      >
                        Adjust System Cap
                      </button>
                    </div>
                    <span className="text-[9px] text-gray-500 uppercase block">Global fallback emergency bounds. Bypasses to local simulations or skipped status when hit.</span>
                  </div>

                </div>
              </div>

              {/* Real-time Analytical Metrics Cards */}
              <div className="space-y-6">
                
                {/* 4 Bento Cards */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Card 1: Daily Scans */}
                  <div className="bg-[#0f1012] border border-white/10 p-4 rounded-xl text-left space-y-1 shadow">
                    <span className="text-[8px] font-black uppercase tracking-widest text-gray-450 block">SCANS TODAY</span>
                    <div className="text-2xl font-display font-bold text-white tracking-tight flex items-center gap-1.5">
                      <Zap className="w-5 h-5 text-sky-400 shrink-0" /> {aiStats.scansToday} <span className="text-xs text-gray-505 font-mono font-normal">/ {aiConfig.maxGlobalAiScansPerDay}</span>
                    </div>
                    <span className="text-[8px] text-neutral-500 uppercase tracking-widest block font-bold font-mono">System usage capacity</span>
                  </div>

                  {/* Card 2: Cost Units */}
                  <div className="bg-[#0f1012] border border-[#ff6b35]/20 p-4 rounded-xl text-left space-y-1 shadow">
                    <span className="text-[8px] font-black uppercase tracking-widest text-gray-450 block">EST. COST UNITS</span>
                    <div className="text-2xl font-display font-bold text-brand-orange tracking-tight flex items-center gap-1.5">
                      <Activity className="w-5 h-5 text-brand-orange shrink-0" /> {aiStats.totalCostUnits}
                    </div>
                    <span className="text-[8px] text-neutral-505 uppercase tracking-widest block font-bold font-mono">1 credit per API scan</span>
                  </div>

                  {/* Card 3: Blocked Scans */}
                  <div className="bg-[#0f1012] border border-white/10 p-4 rounded-xl text-left space-y-1 shadow">
                    <span className="text-[8px] font-black uppercase tracking-widest text-gray-450 block">BLOCKED BY CAP</span>
                    <div className="text-2xl font-display font-bold text-gray-300 tracking-tight flex items-center gap-1.5">
                      <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0" /> {aiStats.blockedScans}
                    </div>
                    <span className="text-[8px] text-neutral-505 uppercase tracking-widest block font-bold font-mono">Bypassed to manual review</span>
                  </div>

                  {/* Card 4: Technical Failures */}
                  <div className="bg-[#0f1012] border border-white/10 p-4 rounded-xl text-left space-y-1 shadow">
                    <span className="text-[8px] font-black uppercase tracking-widest text-gray-450 block">FAILED SCANS</span>
                    <div className="text-2xl font-display font-bold text-red-400 tracking-tight flex items-center gap-1.5">
                      <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" /> {aiStats.failedScans}
                    </div>
                    <span className="text-[8px] text-neutral-505 uppercase tracking-widest block font-bold font-mono">Technical API exceptions</span>
                  </div>
                </div>

                {/* Scans breakdown lists */}
                <div className="bg-[#0f1012] border border-white/10 p-5 rounded-2xl space-y-4 text-left shadow-lg">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-white/5 pb-2 flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-sky-400" /> Active Consumption Ranks
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-6 text-xs font-mono">
                    
                    {/* Scans By User */}
                    <div className="space-y-2">
                       <span className="text-[9px] uppercase tracking-wider text-gray-500 block border-b border-white/5 pb-1 font-bold">BY ACTIVE AGENT ID</span>
                       <div className="space-y-1.5 max-h-36 overflow-y-auto">
                         {Object.keys(aiStats.scansByUser).length === 0 ? (
                           <p className="text-[8px] uppercase text-gray-600">No active scanners</p>
                         ) : (
                           Object.entries(aiStats.scansByUser)
                             .sort((a,b) => b[1] - a[1])
                             .slice(0, 5)
                             .map(([usr, num]) => (
                               <div key={usr} className="flex justify-between items-center text-[10px] bg-neutral-950 px-2.5 py-1.5 rounded border border-white/5">
                                 <span className="text-sky-300 truncate max-w-[90px]" title={usr}>{usr === '_global' ? 'Global Metrics' : usr}</span>
                                 <span className="font-bold text-white font-mono">{num}</span>
                               </div>
                             ))
                         )}
                       </div>
                    </div>

                    {/* Scans By Mission */}
                    <div className="space-y-2">
                       <span className="text-[9px] uppercase tracking-wider text-gray-500 block border-b border-white/5 pb-1 font-bold">BY EXPEDITION DECK ID</span>
                       <div className="space-y-1.5 max-h-36 overflow-y-auto">
                         {Object.keys(aiStats.scansByMission).length === 0 ? (
                           <p className="text-[8px] uppercase text-gray-600">No active challenges</p>
                         ) : (
                           Object.entries(aiStats.scansByMission)
                             .sort((a,b) => b[1] - a[1])
                             .slice(0, 5)
                             .map(([mis, num]) => (
                               <div key={mis} className="flex justify-between items-center text-[10px] bg-neutral-950 px-2.5 py-1.5 rounded border border-white/5">
                                 <span className="text-brand-orange truncate max-w-[90px]" title={mis}>{mis}</span>
                                 <span className="font-bold text-white font-mono">{num}</span>
                               </div>
                             ))
                         )}
                       </div>
                    </div>

                  </div>
                </div>

              </div>

            </div>

            {/* Logs Audit Roll */}
            <div className="bg-[#0f1012] border border-white/10 p-6 rounded-2xl shadow-xl space-y-6 text-left">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <h3 className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-sky-400" /> Operational telemetry logs
                </h3>
                <button
                  type="button"
                  onClick={fetchAiConfigAndLogs}
                  className="px-3 py-1 bg-sky-500/10 border border-sky-400/20 text-sky-300 text-[10px] uppercase tracking-wider rounded-md font-bold hover:bg-sky-500/20 active:translate-y-0.5 transition-all font-mono"
                >
                  Force refresh logbook
                </button>
              </div>

              {logsLoading ? (
                <div className="py-12 text-center">
                  <Loader2 className="w-8 h-8 text-sky-400 animate-spin mx-auto mb-2" />
                  <p className="text-[9px] uppercase text-gray-500 tracking-wider">Decoding telemetry archives...</p>
                </div>
              ) : logs.length === 0 ? (
                <div className="py-12 text-center text-gray-500 text-xs uppercase italic select-none">
                  Zero operational telemetry items on record.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-350 border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-[9px] font-black uppercase tracking-widest text-gray-500">
                        <th className="py-3 px-4">Telemetry ID</th>
                        <th className="py-3 px-4">User Agent</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Proof ID Target</th>
                        <th className="py-3 px-4">Model Used</th>
                        <th className="py-3 px-4">Img Size</th>
                        <th className="py-3 px-4">Created At</th>
                        <th className="py-3 px-4">Detail</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono text-[10px]">
                      {logs.slice(0, 100).map((log) => (
                        <tr key={log.id} className="hover:bg-white/5 transition-all text-gray-300">
                          <td className="py-2.5 px-4 font-bold select-all text-gray-450 text-[9px]">{log.id.slice(0, 10)}...</td>
                          <td className="py-2.5 px-4 truncate max-w-[100px] text-sky-300 font-bold" title={log.userId}>{log.userId}</td>
                          <td className="py-2.5 px-4">
                            <span className={cn(
                              "text-[8px] font-bold uppercase px-2 py-0.5 rounded-md leading-none font-sans block text-center w-full max-w-[100px]",
                              log.status === 'success' ? "bg-brand-lime/15 text-brand-lime" : "",
                              log.status === 'blocked_by_cap' ? "bg-amber-500/15 text-amber-500" : "",
                              log.status === 'skipped' ? "bg-[#38bdf8]/15 text-[#38bdf8]" : "",
                              log.status === 'failed' ? "bg-red-500/15 text-red-500" : ""
                            )}>
                              {log.status === 'blocked_by_cap' ? 'OVER_CAP' : log.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-gray-400 select-all truncate max-w-[110px]" title={log.proofId}>{log.proofId}</td>
                          <td className="py-2.5 px-4 text-zinc-400">{log.model}</td>
                          <td className="py-2.5 px-4 font-bold text-gray-500">
                            {log.imageSize ? `${(log.imageSize / 1024).toFixed(0)} KB` : 'N/A'}
                          </td>
                          <td className="py-2.5 px-4 text-gray-500 select-none">
                            {log.createdAt instanceof Date ? log.createdAt.toLocaleTimeString() : new Date(log.createdAt).toLocaleTimeString()}
                          </td>
                          <td className="py-2.5 px-4 text-gray-400 truncate max-w-[150px]" title={log.reason}>{log.reason || 'Operational scan'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

            </div>

          </div>
        )}

      </div>

      {/* Floating toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            className={cn(
              "fixed bottom-6 right-6 z-[500] px-6 py-4 border-2 shadow-[8px_8px_0px_black] font-display font-black uppercase italic text-xs tracking-wider",
              toast.type === 'success' ? "bg-brand-lime text-black border-on-surface" : "bg-red-500 text-white border-on-surface"
            )}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Security Execution confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && previewData && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-[#121316] border-4 border-on-surface w-full max-w-lg flex flex-col shadow-[16px_16px_0px_rgba(0,0,0,0.5)] text-gray-200 text-left font-mono"
            >
              
              <div className="p-6 text-center space-y-4 bg-brand-orange text-black border-b-4 border-on-surface select-none">
                <div className="mx-auto w-12 h-12 bg-black/10 flex items-center justify-center border-2 border-black rounded-xl">
                  <AlertTriangle className="w-8 h-8 text-black shrink-0 animate-bounce" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-display text-2xl font-black uppercase italic tracking-tight">Biometric Safe Archival</h3>
                  <p className="text-[9px] uppercase tracking-widest opacity-80 font-bold">Caution: Production manipulation parameters detected</p>
                </div>
              </div>

              <div className="p-6 space-y-6">
                
                <div className="p-4 bg-neutral-950 rounded-xl space-y-3.5 border border-white/5 leading-normal text-xs text-gray-300">
                  <p>
                    You are executing a range-based database archival of <strong>{previewData.count} submissions</strong> matching chosen fields. 
                  </p>
                  
                  <div className="space-y-1.5 font-bold font-mono text-[10px] uppercase text-gray-400 select-all border-l-2 border-brand-orange pl-3.5 py-1">
                    <div>Start range: {new Date(startDate + 'T' + startTime + ':00').toLocaleString()}</div>
                    <div>End range: {new Date(endDate + 'T' + endTime + ':59').toLocaleString()}</div>
                    <div>Status matched: {Object.entries(statusFilters).filter(([_, e]) => e).map(([k]) => k).join(', ')}</div>
                    <div>Reverse points: {reverseXp ? 'Yes (Points decremented)' : 'No'}</div>
                  </div>

                  <p className="text-brand-orange text-[10px] font-bold uppercase tracking-wider">
                    All app endpoints will successfully render these entries as masked immediately! Are you sure?
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] text-gray-500 uppercase">
                    To authorize execution, type the passphrase <span className="text-brand-orange font-bold select-all font-mono">ARCHIVE</span> below to unlock trigger protocols.
                  </p>
                  <input
                    type="text"
                    placeholder="Passphrase goes here..."
                    value={typedConfirm}
                    onChange={(e) => setTypedConfirm(e.target.value)}
                    className="w-full bg-neutral-950 border-2 border-white/10 p-4 text-xs font-mono uppercase tracking-widest outline-none focus:border-brand-orange transition-all font-bold text-white rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={handleRunArchive}
                    disabled={typedConfirm !== 'ARCHIVE' || runLoading}
                    className="py-4 bg-brand-orange text-black font-display font-black uppercase text-xs rounded-xl border border-on-surface shadow-[4px_4px_0px_black] hover:bg-brand-orange/90 disabled:opacity-30 disabled:pointer-events-none active:translate-y-0.5 active:shadow-none transition-all font-mono italic"
                  >
                    {runLoading ? 'Archiving data...' : 'Process Archive'}
                  </button>
                  <button
                    onClick={() => {
                      setShowConfirmModal(false);
                      setTypedConfirm('');
                    }}
                    className="py-4 bg-neutral-950 border border-white/10 text-white font-display font-black uppercase text-xs rounded-xl shadow-[4px_4px_0px_black] active:translate-y-0.5 active:shadow-none hover:bg-neutral-900 transition-all font-mono"
                  >
                    Cancel Action
                  </button>
                </div>

              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
