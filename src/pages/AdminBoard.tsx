import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  Users, 
  Target, 
  BarChart3, 
  Settings, 
  Database, 
  FileText, 
  Lock,
  ArrowLeft,
  LayoutGrid,
  ShieldAlert,
  Terminal
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { AdminReviewPanel } from '../components/AdminReviewPanel';
import { cn } from '../lib/utils';
import { executeGlobalUserReset, runOneTimePhotoBackfill } from '../services/adminService';

export default function AdminBoard() {
  const { profile, loading } = useApp();
  const { isAdmin } = useTheme();
  const navigate = useNavigate();

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [typedConfirmation, setTypedConfirmation] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [isBackfilling, setIsBackfilling] = useState(false);

  const handlePhotoBackfill = async () => {
    setIsBackfilling(true);
    setToast(null);
    try {
      const result = await runOneTimePhotoBackfill();
      if (result.success) {
        setToast({
          message: `Backfill Repair completed. Checked: ${result.totalApprovedChecked}, Backfilled: ${result.backfilledCount}, Missing annotated: ${result.markedMissingCount}.`,
          type: 'success'
        });
      } else {
        setToast({ message: result.error || 'Backfill operation failed.', type: 'error' });
      }
    } catch (err: any) {
      setToast({ message: err.message || 'Backfill execution error.', type: 'error' });
    } finally {
      setIsBackfilling(false);
    }
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleGlobalReset = async () => {
    if (typedConfirmation !== 'RESET-CORRECTIVE-ACTION') return;
    setIsResetting(true);
    setToast(null);
    try {
      const adminId = profile?.id || 'system-admin';
      const result = await executeGlobalUserReset(adminId);
      
      if (result.success) {
        setToast({ message: 'Global reset executed successfully!', type: 'success' });
        localStorage.clear();
        sessionStorage.clear();
        setShowResetModal(false);
        setTypedConfirmation('');
        
        setTimeout(() => {
          navigate('/admin');
          window.location.reload();
        }, 1500);
      } else {
        setToast({ message: result.error || 'Reset failed physically.', type: 'error' });
      }
    } catch (err: any) {
      setToast({ message: err.message || 'Reset failed spectacularly.', type: 'error' });
    } finally {
      setIsResetting(false);
    }
  };

  const isAdminAuthorized = isAdmin || profile?.role === 'admin' || (profile as any)?.isAdmin || (profile as any)?.admin;

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-8">
        <Database className="w-12 h-12 text-brand-orange animate-pulse mb-4" />
        <p className="font-mono text-sm uppercase tracking-widest opacity-40">Verifying Bureau Clearance...</p>
      </div>
    );
  }

  if (!isAdminAuthorized) {
    return (
      <div className="min-h-screen bg-on-surface text-white flex flex-col items-center justify-center p-8 text-center space-y-8">
        <div className="w-24 h-24 bg-error border-4 border-white flex items-center justify-center animate-bounce">
          <Lock className="w-12 h-12 text-white" />
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl font-display font-black uppercase italic tracking-tighter">BUREAU_ACCESS_LOCKED</h1>
          <p className="font-mono text-xs opacity-60 max-w-md mx-auto leading-relaxed">
            Your current biometric signature does not match required security clearances for Bureau Operations. Unauthorized entry attempt logged.
          </p>
        </div>
        <button 
          onClick={() => navigate('/basecamp')}
          className="flex items-center gap-2 px-8 py-4 border-2 border-white font-display font-black uppercase italic hover:bg-white hover:text-on-surface transition-all"
        >
          <ArrowLeft className="w-5 h-5" /> RE-ENTER_SAFE_ZONE
        </button>
      </div>
    );
  }

  const adminModules = [
    { id: 'proofs', label: 'Evidence Audit', icon: Shield, path: '/admin/proofs', desc: 'Detailed image analysis log' },
    { id: 'archive', label: 'Archive Submissions', icon: Database, path: '/admin/archive', desc: 'Archive old or test submissions by date range' },
    { id: 'users', label: 'User Directory', icon: Users, path: '/admin/users', desc: 'Roster and permission sets' },
    { id: 'challenges', label: 'Mission Deck', icon: Target, path: '/admin/challenges', desc: 'Expedition bank management' },
    { id: 'leaderboard', label: 'Big Board Ops', icon: BarChart3, path: '/admin/leaderboard', desc: 'Seasonal point controls' },
    { id: 'moderation', label: 'Council Desk', icon: Settings, path: '/admin/moderation', desc: 'Report and block review' },
    { id: 'ops', label: 'System Ops', icon: Terminal, path: '/admin/ops', desc: 'Resets, archives, and repair tools' }
  ];

  return (
    <div className="page-scroll bg-surface p-6">
      <header className="mb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-orange border-2 border-on-surface rounded-xl flex items-center justify-center shadow-[4px_4px_0px_black]">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-display font-black uppercase italic tracking-tighter text-on-surface">Bureau_Desk</h1>
          </div>
          <p className="text-[10px] font-mono font-black uppercase text-on-surface/30 tracking-[0.2em] ml-1">
            Station: Alpha-9 // User: {profile?.name || 'System Admin'}
          </p>
        </div>
        
        <div className="flex gap-2">
           <button 
              onClick={() => navigate('/basecamp')}
              className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-on-surface font-display font-black uppercase italic text-xs shadow-[4px_4px_0px_black] active:shadow-none active:translate-y-1 transition-all"
           >
              <ArrowLeft className="w-4 h-4" /> Basecamp
           </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left Column: Modules & Stats */}
        <div className="lg:col-span-1 space-y-10">
           {/* Primary Actions */}
           <section className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-on-surface/30 px-1">Operations_Hub</h3>
              <div className="space-y-3">
                 {adminModules.map((module) => (
                    <button
                      key={module.id}
                      onClick={() => navigate(module.path)}
                      className="w-full flex items-center gap-4 p-4 bg-white border-2 border-on-surface rounded-2xl shadow-[4px_4px_0px_black] hover:translate-x-1 hover:shadow-[6px_6px_0px_black] transition-all group text-left"
                    >
                       <div className="w-12 h-12 bg-on-surface/5 border-2 border-on-surface/10 rounded-xl flex items-center justify-center group-hover:bg-brand-orange group-hover:border-brand-orange transition-all">
                          <module.icon className="w-6 h-6 text-on-surface group-hover:text-white" />
                       </div>
                       <div>
                          <p className="font-display font-black uppercase italic text-lg leading-none mb-1 group-hover:text-brand-orange">{module.label}</p>
                          <p className="text-[9px] font-mono font-bold uppercase opacity-30 tracking-wider font-mono">{module.desc}</p>
                       </div>
                    </button>
                 ))}
              </div>
           </section>

           {/* Stats Panel */}
           <section className="p-6 bg-on-surface text-white rounded-3xl shadow-[12px_12px_0px_var(--color-brand-orange)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl" />
              <p className="text-[10px] font-mono font-black uppercase tracking-widest opacity-40 mb-6 flex items-center gap-2">
                <LayoutGrid className="w-3 h-3" /> System_Vital_Scan
              </p>
              
              <div className="space-y-6">
                <div>
                   <p className="text-[9px] font-mono font-bold uppercase opacity-60 mb-2">Network_Traffic</p>
                   <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-lime w-[65%]" />
                   </div>
                </div>
                <div>
                   <p className="text-[9px] font-mono font-bold uppercase opacity-60 mb-2">Storage_Payload (Beta)</p>
                   <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-orange w-[82%]" />
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4">
                   <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
                      <p className="text-[8px] font-mono font-bold uppercase opacity-40">Uptime</p>
                      <p className="text-xl font-display font-black italic">99.9%</p>
                   </div>
                   <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
                      <p className="text-[8px] font-mono font-bold uppercase opacity-40">Latent_Ms</p>
                      <p className="text-xl font-display font-black italic">42ms</p>
                   </div>
                </div>
              </div>
           </section>

           {/* Emergency Protocols / Danger Zone */}
           <section className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-error px-1">Emergency_Protocols</h3>
              <div className="p-6 bg-red-500/5 border-2 border-red-500/20 rounded-3xl space-y-4 text-left">
                 <p className="text-[10px] font-mono leading-relaxed opacity-60 uppercase text-on-surface">
                    Wipe progression, active trips, points, and gameplay records for all registered agents. Auth accounts remain safe.
                 </p>
                 <button
                    onClick={() => setShowResetModal(true)}
                    className="w-full py-4 bg-error text-white font-display font-black uppercase italic rounded-2xl shadow-[4px_4px_0px_black] active:translate-y-1 active:shadow-none hover:bg-error/90 active:scale-[0.98] transition-all text-sm border-2 border-on-surface"
                 >
                    Reset All Users to Start
                 </button>
              </div>
           </section>

           {/* Repair & Diagnostic Protocols */}
           <section className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-brand-lime px-1">Diagnostic_Protocols</h3>
              <div className="p-6 bg-emerald-500/5 border-2 border-emerald-500/20 rounded-3xl space-y-4 text-left">
                 <p className="text-[10px] font-mono leading-relaxed opacity-60 uppercase text-on-surface">
                    One-time photographic backfill scanner. Resolves approved submissions missing photos by copying from linked reviews.
                 </p>
                 <button
                    disabled={isBackfilling}
                    onClick={handlePhotoBackfill}
                    className="w-full py-4 bg-brand-lime text-black font-display font-black uppercase italic rounded-2xl shadow-[4px_4px_0px_black] active:translate-y-1 active:shadow-none hover:bg-brand-lime/90 active:scale-[0.98] transition-all text-sm border-2 border-on-surface disabled:opacity-50"
                 >
                    {isBackfilling ? "Scanning..." : "Execute Photo Backfill Repair"}
                 </button>
              </div>
           </section>
        </div>

        {/* Right Column: Review Panel */}
        <div className="lg:col-span-2 space-y-4">
           <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-black uppercase tracking-widest text-on-surface/30">Pending_Evidence_Queue</h3>
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-brand-orange animate-pulse" />
                 <span className="text-[10px] font-mono font-black uppercase text-brand-orange">Live_Feed_Active</span>
              </div>
           </div>
           
           <div className="bg-paper-dark border-4 border-on-surface rounded-[2.5rem] p-6 lg:p-10 shadow-[inner_0_4px_12px_rgba(0,0,0,0.1)] min-h-[600px] relative">
              <AdminReviewPanel />
           </div>
        </div>
      </div>

      {/* Floating Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            className={cn(
              "fixed bottom-6 right-6 z-[400] px-6 py-4 border-2 shadow-[8px_8px_0px_black] font-display font-black uppercase italic text-xs tracking-wider",
              toast.type === 'success' ? "bg-brand-lime text-black border-on-surface" : "bg-error text-white border-on-surface"
            )}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Reset Modal Warning Confirmation */}
      <AnimatePresence>
        {showResetModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-paper w-full max-w-lg flex flex-col border-4 border-on-surface shadow-[16px_16px_0px_black] text-on-surface text-left"
            >
              <div className="p-6 pt-10 text-center space-y-4 bg-error text-white border-b-4 border-on-surface">
                <div className="mx-auto w-16 h-16 bg-white/10 flex items-center justify-center border-2 border-white rounded-xl">
                  <ShieldAlert className="w-10 h-10 text-white" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-display text-4xl font-black uppercase italic tracking-tighter text-white">GLOBAL_CORE_RESET</h3>
                  <p className="text-[10px] font-mono uppercase tracking-widest opacity-80 text-white">
                    Caution: This action is permanent and final!
                  </p>
                </div>
              </div>

              <div className="p-8 space-y-6">
                <div className="p-4 bg-on-surface/5 border border-on-surface/10 rounded-xl space-y-3">
                  <p className="text-xs leading-relaxed italic text-on-surface">
                    This resets every user’s Fieldtrip progress, points, decks, onboarding, persona quiz, submissions, stickers, voting, and active missions back to 0. All historic entries, submissions, likes, and feedback will be moved to the archive collection, or completely removed if GLOBAL_RESET_MODE is set to 'delete'.
                  </p>
                  <p className="text-xs leading-relaxed text-on-surface/75">
                    Caution: This action cannot be undone. Authentic login credentials will be kept intact, meaning users can log in, but they will be forced to redo onboarding from the beginning.
                  </p>
                  <p className="text-xs font-bold text-error leading-relaxed uppercase tracking-wider">
                    Are you sure you want to run this global reset?
                  </p>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-mono font-black uppercase opacity-60">
                    To execute this reset, type the word <span className="text-error font-extrabold select-all">RESET-CORRECTIVE-ACTION</span> below to confirm you understand the scale and consequences of this command.
                  </p>
                  <input
                    type="text"
                    placeholder="Type confirmation text here..."
                    value={typedConfirmation}
                    onChange={(e) => setTypedConfirmation(e.target.value)}
                    className="w-full bg-on-surface/5 border-2 border-on-surface p-4 text-xs font-mono uppercase tracking-widest outline-none focus:bg-white transition-all font-semibold text-on-surface"
                    disabled={isResetting}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={handleGlobalReset}
                    disabled={typedConfirmation !== 'RESET-CORRECTIVE-ACTION' || isResetting}
                    className="py-4 bg-error text-white font-display font-black uppercase italic rounded-xl border-2 border-on-surface shadow-[4px_4px_0px_black] hover:bg-error/90 disabled:opacity-30 disabled:pointer-events-none active:translate-y-1 active:shadow-none transition-all text-sm"
                  >
                    {isResetting ? 'Resetting State...' : 'Reset All Users to Start'}
                  </button>
                  <button
                    onClick={() => {
                      setShowResetModal(false);
                      setTypedConfirmation('');
                    }}
                    disabled={isResetting}
                    className="py-4 bg-white border-2 border-on-surface text-on-surface font-display font-black uppercase italic rounded-xl shadow-[4px_4px_0px_black] active:translate-y-1 active:shadow-none hover:bg-on-surface/5 transition-all text-sm"
                  >
                    Maybe Later
                  </button>
                </div>
              </div>

              <div className="p-4 bg-on-surface/5 text-center border-t border-on-surface/10">
                <p className="text-[8px] font-mono opacity-40 uppercase tracking-widest">Logged Admin Authorization Signal Check</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
