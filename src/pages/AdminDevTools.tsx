import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { motion } from 'motion/react';
import { 
  Shield, 
  Map as MapIcon, 
  Settings, 
  RotateCcw, 
  CheckCircle2, 
  Camera, 
  FileText, 
  User, 
  Users, 
  Trophy, 
  Layout, 
  Terminal,
  ArrowRight,
  Eye,
  Trash2,
  Calendar,
  Sparkles,
  X,
  Check
} from 'lucide-react';
import { cn } from '../lib/utils';
import { initializeDefaultSeason } from '../services/seasonService';
import { logAdminAction, subscribeToAdminLogs } from '../services/moderationService';
import { resetMyMissionState } from '../services/adminResetService';
import { 
  resetUsersForGuidedLaunch, 
  resetStarterDeckForAllUsers, 
  StarterDeckResetReport
} from '../services/adminService';
import { archiveSeason, archiveDeck, auditAndRepairUserCounts, softResetUser } from '../services/adminOperationsService';

import { getActiveDeckPacks, getMissionsForPack } from '../data/deckPacks';
import { HEATWAVE_CHALLENGE_BANK } from '../data/heatwaveChallengeBank';
import { SOCAL_SUMMER_CHALLENGE_BANK } from '../data/socalSummerChallengeBank';

export default function AdminDevTools() {
  const navigate = useNavigate();
  const { 
    user, 
    profile, 
    isAdmin, 
    updateProfile, 
    activeSeason,
    gameConfig,
    isHeatwaveDeckUnlocked,
    isSocalSummerUnlocked
  } = useApp();
  const [initLoading, setInitLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const [softResetModalOpen, setSoftResetModalOpen] = useState(false);
  const [softResetTarget, setSoftResetTarget] = useState('');
  const [softResetLoading, setSoftResetLoading] = useState(false);
  const [softResetReport, setSoftResetReport] = useState<any>(null);
  const [softResetConfirm, setSoftResetConfirm] = useState(false);

  const [starterResetModalOpen, setStarterResetModalOpen] = useState(false);
  const [starterResetConfirmInput, setStarterResetConfirmInput] = useState('');
  const [starterResetReport, setStarterResetReport] = useState<StarterDeckResetReport | null>(null);
  const [starterResetLoading, setStarterResetLoading] = useState(false);

  const [archiveId, setArchiveId] = useState('');
  const [archiveTarget, setArchiveTarget] = useState<'season' | 'deck'>('season');
  const [isArchiving, setIsArchiving] = useState(false);

  const [auditUid, setAuditUid] = useState('');
  const [isAuditing, setIsAuditing] = useState(false);

  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    const unsub = subscribeToAdminLogs(20, (newLogs) => {
      setLogs(newLogs);
      setLogsLoading(false);
    });
    return () => unsub();
  }, [isAdmin]);

  const handleStarterResetExecute = async () => {
    if (starterResetConfirmInput.trim() !== 'RESET STARTER') {
      alert("Confirmation input mismatch. Please type 'RESET STARTER' exactly.");
      return;
    }

    setStarterResetLoading(true);
    setStarterResetReport(null);

    try {
      const report = await resetStarterDeckForAllUsers(user!.uid);
      setStarterResetReport(report);

      if (report.success) {
        // Clear localStorage fields related to starter deck
        try {
          const keysToClear = [
            'starter', 'deck', 'drawn', 'completedChallengeIds', 
            'approvedCompletedChallengeIds', 'submittedChallengeIds', 
            'activeMission', 'missionProgress'
          ];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && keysToClear.some(suffix => key.toLowerCase().includes(suffix.toLowerCase()))) {
              localStorage.removeItem(key);
            }
          }
        } catch (e) {
          console.warn("Could not clear localStorage:", e);
        }
      }
    } catch (err: any) {
      console.error("Starter reset error:", err);
      setStarterResetReport({
        success: false,
        usersUpdated: 0,
        submissionsArchived: 0,
        activeMissionsCleared: 0,
        proofReviewsUpdated: 0,
        xpReduced: false,
        totalSubtractions: 0,
        error: err.message || String(err)
      });
    } finally {
      setStarterResetLoading(false);
    }
  };

  const handleCloseStarterResetModal = () => {
    const wasSuccess = starterResetReport?.success;
    setStarterResetModalOpen(false);
    setStarterResetConfirmInput('');
    setStarterResetReport(null);
    if (wasSuccess) {
      window.location.reload();
    }
  };

  // Auto-init helper for the mission
  useEffect(() => {
    const autoInit = async () => {
      if (isAdmin && !initLoading && !gameConfig?.activeSeasonId && !activeSeason) {
        console.log("BUREAU_OPS: No active season detected. Initiating auto-boot sequence...");
        setInitLoading(true);
        try {
          await initializeDefaultSeason();
          console.log("BUREAU_OPS: Season successfully engaged.");
          if (user) {
            await logAdminAction(user.uid, 'game', 'season', 'auto_boot_init');
          }
        } catch (err: any) {
          console.error("BUREAU_OPS: Auto-boot failed:", err.message);
        } finally {
          setInitLoading(false);
        }
      }
    };
    autoInit();
  }, [isAdmin, gameConfig?.activeSeasonId, activeSeason, user]);

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 font-mono">
        <div className="text-center space-y-4">
          <Shield className="w-12 h-12 text-error mx-auto opacity-50" />
          <h1 className="text-xl font-black uppercase text-error">Access_Denied</h1>
          <p className="text-[10px] text-white/40 uppercase tracking-widest leading-relaxed max-w-xs mx-auto">
            Your clearance level is insufficient for this terminal. Return to the field immediately.
          </p>
          <button 
            onClick={() => navigate('/deck')}
            className="px-6 py-2 border border-white/20 text-[10px] uppercase tracking-widest hover:bg-white/5 transition-colors"
          >
            Return to Deck
          </button>
        </div>
      </div>
    );
  }

  const handleGlobalGuidedReset = async () => {
    if (!user) return;
    if (confirm('GLOBAL RESET FOR GUIDED LAUNCH? All non-admin users will be reset to the guided first mission flow. Account identity and persona will be preserved. PROCEED?')) {
      setResetLoading(true);
      try {
        const result = await resetUsersForGuidedLaunch(user.uid);
        if (result.success) {
          alert('GLOBAL_RESET_UPLOAD_COMPLETE: All users redirected to Guided Flow.');
        } else {
          alert('RESET_FAILED: ' + result.error);
        }
      } catch (err: any) {
        alert('CRITICAL_SYSTEM_ERROR: ' + err.message);
      } finally {
        setResetLoading(false);
      }
    }
  };

  const handleResetState = async () => {
    if (!user) return;
    if (confirm('RESET ALL MISSION PARAMETERS? This will wipe your profile status, onboarding, and classification.')) {
      console.log('ADMIN_ACTION: Full State Reset for', user.email);
      
      await logAdminAction(user.uid, user.uid, 'user', 'reset_profile_state', { 
        targetEmail: user.email,
        reason: 'Manual DevTools Reset'
      });

      await updateProfile(user.uid, {
        onboardingCompleted: false,
        fieldClassificationComplete: false,
        fieldType: null,
        fieldTypeName: null,
        fieldTypeQuizCompleted: false,
        accessStatus: 'pending',
        activeTrip: null,
        firstMissionTourComplete: false
      });
      alert('Mission Parameters Reset. Uplink Terminated.');
      window.location.href = '/';
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!user) return;
    
    await logAdminAction(user.uid, user.uid, 'user', 'override_access_status', { 
      targetEmail: user.email,
      newStatus: status
    });

    await updateProfile(user.uid, { accessStatus: status as any });
    console.log('ADMIN_ACTION: Status set to', status);
  };

  const handleArchive = async (dryRun: boolean = false) => {
    if (!archiveId) return;
    if (!dryRun && !confirm(`Confirm ARCHIVE of ${archiveTarget}: ${archiveId}? This will hide it from the UI.`)) return;
    
    setIsArchiving(true);
    try {
      if (archiveTarget === 'season') await archiveSeason(archiveId, dryRun);
      else await archiveDeck(archiveId, dryRun);
      
      if (dryRun) {
        alert(`DRY RUN: ${archiveTarget} ${archiveId} exists and would be archived.`);
      } else {
        alert(`${archiveTarget} archived.`);
        setArchiveId('');
      }
    } catch (err: any) {
      alert(`Operation failed: ${err.message}`);
    } finally {
      setIsArchiving(false);
    }
  };

  const handleAuditRepair = async (dryRun: boolean = false) => {
    if (!auditUid) return;
    setIsAuditing(true);
    try {
      const result = await auditAndRepairUserCounts(auditUid, dryRun);
      const mode = dryRun ? "PREVIEW" : "REPAIR COMPLETE";
      alert(`${mode} for ${auditUid}\nScanned: ${result.scanned}\nStarter count: ${result.starterCount}/3\nTotal Approved: ${result.totalApproved}${dryRun ? '\n\n(No changes were made)' : ''}`);
      if (!dryRun) setAuditUid('');
    } catch (err: any) {
      alert(`Audit failed: ${err.message}`);
    } finally {
      setIsAuditing(false);
    }
  };

  const handleSoftResetExecute = async () => {
    if (!softResetTarget) return;
    if (!softResetConfirm) {
      alert("Please confirm the reset protocol.");
      return;
    }

    setSoftResetLoading(true);
    try {
      // Determine if target is UID or username (simple check)
      const isUid = softResetTarget.length > 20 && !softResetTarget.includes(' ');
      const params = isUid 
        ? { targetUserId: softResetTarget, confirmReset: true }
        : { targetUsername: softResetTarget, confirmReset: true };

      const result = await softResetUser(params);
      setSoftResetReport(result.report);
    } catch (err: any) {
      alert(`Soft Reset Failed: ${err.message}`);
    } finally {
      setSoftResetLoading(false);
    }
  };

  const handleRoute = (path: string) => {
    console.log('ADMIN_ACTION: Manual Jump to', path);
    navigate(path);
  };

  const handleResetMyMission = async () => {
    if (!user) return;
    if (confirm('AUTHORIZE LOCAL MISSION RESET? This will clear only your mission-related progress. Identity and classification will be preserved.')) {
      setResetLoading(true);
      try {
        await resetMyMissionState(user.uid);
        alert('MISSION_STATE_FLUSHED: Local state successfully cleared.');
        window.location.reload();
      } catch (err: any) {
        alert('RESET_FAILED: ' + err.message);
      } finally {
        setResetLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-mono p-6 pb-24 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Warning Banner */}
        <div className="border-2 border-brand-orange bg-brand-orange/5 p-4 flex items-center gap-4">
          <Terminal className="text-brand-orange w-8 h-8 shrink-0" />
          <div>
            <h2 className="text-sm font-black uppercase text-brand-orange leading-none">Internal_Admin_Tools</h2>
            <p className="text-[9px] uppercase tracking-wider opacity-60 mt-1">Caution: Modifications here affect live user profiles. Do not expose this terminal to general beta testers.</p>
          </div>
        </div>

        {/* Quick Jumps */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 flex items-center gap-2">
            <Eye size={12} /> Mission_Link_Shortcuts
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { label: 'Welcome/Login', path: '/', icon: Layout },
              { label: 'Deck', path: '/deck', icon: MapIcon },
              { label: 'Profile', path: '/profile', icon: User },
              { label: 'Quiz', path: '/onboarding', icon: RotateCcw },
              { label: 'Result', path: '/field-type', icon: CheckCircle2 },
              { label: 'Classification', path: '/classification', icon: RotateCcw },
              { label: 'Identity', path: '/field-id', icon: User },
              { label: 'Crew', path: '/crew', icon: Users },
              { label: 'Frontlines', path: '/frontlines', icon: Trophy },
              { label: 'Voting Hub', path: '/voting', icon: Users },
              { label: 'Admin Proof', path: '/admin/proofs', icon: Shield },
              { label: 'Capture (Starter)', path: '/capture?id=starter-1', icon: Camera, highlight: true },
            ].map(link => (
              <button
                key={link.path}
                onClick={() => handleRoute(link.path)}
                className={cn(
                  "flex items-center gap-3 p-4 border border-white/10 hover:bg-white/5 transition-all text-left group",
                  link.highlight && "border-brand-orange/50 bg-brand-orange/5"
                )}
              >
                <link.icon className={cn("w-4 h-4", link.highlight ? "text-brand-orange" : "text-white/40 group-hover:text-white")} />
                <span className="text-[9px] font-bold uppercase tracking-widest">{link.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* State Controls */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 flex items-center gap-2">
            <Calendar size={12} /> Seasonal_Protocol
          </h3>
          <div className="p-6 border border-brand-orange/20 bg-brand-orange/5 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-black uppercase text-brand-orange">Heatwave_Receipts_2026</p>
                <p className="text-[9px] opacity-60">Status: {activeSeason ? activeSeason.status : 'NOT_INITIALIZED'}</p>
                <p className="text-[9px] opacity-60">Config: {gameConfig?.activeSeasonId || 'MISSING'}</p>
              </div>
              <button 
                onClick={async () => {
                  setInitLoading(true);
                  try {
                    await initializeDefaultSeason();
                    if (user) {
                      await logAdminAction(user.uid, 'game', 'season', 'force_initialize_season');
                    }
                    alert('Season Protocol Engaged.');
                  } catch (err) {
                    alert('Handshake Failed: ' + (err as any).message);
                  } finally {
                    setInitLoading(false);
                  }
                }}
                disabled={initLoading}
                className="flex items-center gap-2 px-6 py-3 bg-brand-orange text-white text-[10px] font-black uppercase tracking-widest hover:bg-brand-orange/80 transition-all shadow-[4px_4px_0px_black] disabled:opacity-50"
              >
                <Sparkles size={14} className={cn(initLoading && "animate-spin")} />
                {activeSeason ? 'Force Re-Initialize' : 'Engage Season'}
              </button>
            </div>

            <div className="pt-4 border-t border-brand-orange/10 space-y-3">
              <p className="text-[10px] font-bold uppercase opacity-40">Archive tool</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <select 
                  className="bg-black border border-white/20 p-2 text-[10px] uppercase font-mono grow"
                  value={archiveTarget}
                  onChange={(e) => setArchiveTarget(e.target.value as any)}
                >
                  <option value="season">Season ID</option>
                  <option value="deck">Deck ID</option>
                </select>
                <input 
                  type="text" 
                  className="bg-black border border-white/20 p-2 text-[10px] font-mono grow"
                  placeholder="ID to archive"
                  value={archiveId}
                  onChange={(e) => setArchiveId(e.target.value)}
                />
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleArchive(true)}
                    disabled={isArchiving || !archiveId}
                    className="px-4 py-2 bg-on-surface/20 text-white text-[10px] font-black uppercase disabled:opacity-50"
                  >
                    PREVIEW
                  </button>
                  <button 
                    onClick={() => handleArchive(false)}
                    disabled={isArchiving || !archiveId}
                    className="px-4 py-2 bg-on-surface text-white text-[10px] font-black uppercase disabled:opacity-50"
                  >
                    {isArchiving ? 'ARCHIVING...' : 'ARCHIVE'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Deck Dossier Status */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 flex items-center gap-2">
            <Layout size={12} /> Deck_Dossier_Status
          </h3>
          <div className="border border-white/5 bg-white/[0.02] divide-y divide-white/5">
            {getActiveDeckPacks().map(pack => {
              const allMissions = [...HEATWAVE_CHALLENGE_BANK, ...SOCAL_SUMMER_CHALLENGE_BANK];
              const missionCount = getMissionsForPack(pack.packId, allMissions).length;
              const isLocked = pack.packId === 'heatwave-receipts' ? !isHeatwaveDeckUnlocked : 
                               pack.packId === 'socal-summer' ? !isSocalSummerUnlocked : false;
              
              return (
                <div key={pack.packId} className="p-4 flex items-center justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-black uppercase text-white tracking-tight">{pack.packName}</span>
                      <span className="text-[9px] font-mono opacity-30">[{pack.packId}]</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="text-[8px] font-mono px-1.5 py-0.5 bg-white/5 border border-white/10 opacity-60">Status: {pack.isActive ? 'ACTIVE' : 'INACTIVE'}</span>
                      <span className="text-[8px] font-mono px-1.5 py-0.5 bg-white/5 border border-white/10 opacity-60">Missions: {missionCount}</span>
                      <span className="text-[8px] font-mono px-1.5 py-0.5 bg-white/5 border border-white/10 opacity-60">Gate: {pack.unlockRule}</span>
                      <span className="text-[8px] font-mono px-1.5 py-0.5 bg-white/5 border border-white/10 opacity-60">Starter Gate: {pack.requiredStarterApprovals || 0} Req</span>
                    </div>
                  </div>
                  <div className={cn(
                    "px-3 py-1 text-[9px] font-black border uppercase tracking-widest shrink-0",
                    isLocked ? "border-brand-orange/40 text-brand-orange bg-brand-orange/5" : "border-brand-lime/40 text-brand-lime bg-brand-lime/5"
                  )}>
                    {isLocked ? 'LOCKED_FOR_PLAYERS' : 'UNLOCKED_READY'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Audit & Repair */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 flex items-center gap-2">
            <RotateCcw size={12} /> Audit_&_Repair
          </h3>
          <div className="p-6 border border-brand-green/20 bg-brand-green/5 space-y-8">
               <div className="space-y-2">
                 <p className="text-[10px] font-bold uppercase opacity-40 text-brand-green">Repair User Counts</p>
                 <div className="flex flex-col sm:flex-row gap-2">
                    <input 
                      type="text" 
                      className="bg-black border border-white/20 p-2 text-[10px] font-mono grow"
                      placeholder="User UID to audit"
                      value={auditUid}
                      onChange={(e) => setAuditUid(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleAuditRepair(true)}
                        disabled={isAuditing || !auditUid}
                        className="px-4 py-2 bg-brand-green/20 text-white text-[10px] font-black uppercase disabled:opacity-50"
                      >
                        PREVIEW
                      </button>
                      <button 
                        onClick={() => handleAuditRepair(false)}
                        disabled={isAuditing || !auditUid}
                        className="px-4 py-2 bg-brand-green text-white text-[10px] font-black uppercase disabled:opacity-50"
                      >
                        {isAuditing ? 'AUDITING...' : 'AUDIT_&_SYNC'}
                      </button>
                    </div>
                 </div>
                 <p className="text-[8px] opacity-30 italic">Force recalculates Starter & Total stats from actual entry history.</p>
               </div>

               <div className="space-y-2 pt-4 border-t border-brand-green/10">
                 <p className="text-[10px] font-bold uppercase opacity-40 text-rose-500">Single User Soft Reset</p>
                 <div className="flex flex-col sm:flex-row gap-2">
                    <input 
                      type="text" 
                      className="bg-black border border-white/20 p-2 text-[10px] font-mono grow"
                      placeholder="User UID or Username"
                      value={softResetTarget}
                      onChange={(e) => setSoftResetTarget(e.target.value)}
                    />
                    <button 
                      onClick={() => setSoftResetModalOpen(true)}
                      disabled={!softResetTarget}
                      className="px-6 py-2 bg-rose-600 text-white text-[10px] font-black uppercase disabled:opacity-30"
                    >
                      Initialize Reset
                    </button>
                 </div>
                 <p className="text-[8px] opacity-30 italic">Archives all gameplay records and resets user to Starter deck. Preserves identity.</p>
               </div>
          </div>
        </div>

        {/* State Controls */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 flex items-center gap-2">
            <Settings size={12} /> Profile_State_Overrides
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 border border-white/10 bg-white/[0.02] space-y-6">
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase opacity-40">Classification_Control</p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => updateProfile(user!.uid, { fieldClassificationComplete: true, onboardingCompleted: true })}
                    className="flex-1 bureau-btn text-[8px] py-3 bg-white/5 hover:bg-green-500/20 hover:border-green-500/40"
                  >
                    Set Complete
                  </button>
                  <button 
                    onClick={() => updateProfile(user!.uid, { fieldClassificationComplete: false, fieldType: null })}
                    className="flex-1 bureau-btn text-[8px] py-3 bg-white/5 hover:bg-red-500/20 hover:border-red-500/40"
                  >
                    Reset Type
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase opacity-40">Access_Status</p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleUpdateStatus('approved')}
                    className="flex-1 bureau-btn text-[8px] py-3 bg-white/5 hover:bg-green-500/20"
                  >
                    Approved
                  </button>
                  <button 
                    onClick={() => handleUpdateStatus('pending')}
                    className="flex-1 bureau-btn text-[8px] py-3 bg-white/5 opacity-40"
                  >
                    Pending
                  </button>
                  <button 
                    onClick={() => handleUpdateStatus('banned')}
                    className="flex-1 bureau-btn text-[8px] py-3 bg-white/5 hover:bg-red-500/20"
                  >
                    Ban
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase opacity-40">Guided Tour Control</p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => updateProfile(user!.uid, { firstMissionTourComplete: true })}
                    className="flex-1 bureau-btn text-[8px] py-3 bg-white/5"
                  >
                    Mark Comp.
                  </button>
                  <button 
                    onClick={() => updateProfile(user!.uid, { firstMissionTourComplete: false })}
                    className="flex-1 bureau-btn text-[8px] py-3 bg-white/5"
                  >
                    Reset Tour
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 border border-white/10 bg-white/[0.02] space-y-6">
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase opacity-40">Hazard_Controls</p>
                <div className="space-y-2">
                  <button 
                    onClick={handleGlobalGuidedReset}
                    disabled={resetLoading}
                    className="w-full bureau-btn text-[8px] py-4 bg-brand-orange/10 border-brand-orange/30 text-brand-orange hover:bg-brand-orange hover:text-white disabled:opacity-50"
                  >
                    <RotateCcw className={cn("w-3 h-3 inline mr-2", resetLoading && "animate-spin")} />
                    Reset Users for Guided Launch
                  </button>
                  <p className="text-[7px] opacity-30 italic">Target: All non-admin users. Preserves identity + persona. Resets all progress.</p>
                </div>

                <div className="space-y-2 pt-2">
                  <button 
                    onClick={() => setStarterResetModalOpen(true)}
                    className="w-full bureau-btn text-[8px] py-4 bg-rose-600/10 border-rose-600/30 text-rose-500 hover:bg-rose-600 hover:text-white"
                  >
                    <RotateCcw className="w-3 h-3 inline mr-2" />
                    Reset_Starter_Deck_For_All_Users
                  </button>
                  <p className="text-[7px] opacity-30 italic">Soft Reset: Archives old Starter entries, resets all users' Starter progression metrics to 0/3, clears drawn cards, active missions, and subtracts awarded XP automatically.</p>
                </div>

                  <div className="pt-2">
                    <button 
                      onClick={handleResetMyMission}
                      disabled={resetLoading}
                      className="w-full bureau-btn text-[8px] py-4 bg-brand-cyan/10 border-brand-cyan/30 text-brand-cyan hover:bg-brand-cyan hover:text-on-surface disabled:opacity-50"
                    >
                      <RotateCcw className={cn("w-3 h-3 inline mr-2", resetLoading && "animate-spin")} />
                      Reset My Mission State
                    </button>
                    <p className="text-[7px] opacity-30 italic mt-1">Target: Your own account only. Preserves persona, classification, and onboarding status. Clears all mission cards and XP.</p>
                  </div>

                  <div className="pt-2">
                    <button 
                      onClick={handleResetState}
                    className="w-full bureau-btn text-[8px] py-4 bg-red-600/10 border-red-600/30 text-red-500 hover:bg-red-600 hover:text-white"
                  >
                    <Trash2 className="w-3 h-3 inline mr-2" />
                    Wipe_Your_Own_Profile_Progress
                  </button>
                  <p className="text-[8px] opacity-30 italic mt-2">Wipes legal, onboarding, classification, and access status for your account only.</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase opacity-40">Trip_Buffer</p>
                <button 
                  onClick={() => updateProfile(user!.uid, { activeTrip: null })}
                  className="w-full bureau-btn text-[8px] py-3 bg-white/5"
                >
                  Clear Active Trip
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Audit Logs */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 flex items-center gap-2">
            <FileText size={12} /> System_Audit_Logs
          </h3>
          <div className="border border-white/5 bg-white/[0.02] divide-y divide-white/5 max-h-64 overflow-y-auto">
            {logsLoading ? (
              <div className="p-4 text-center opacity-30 text-[9px] uppercase animate-pulse">Syncing logs...</div>
            ) : logs.length === 0 ? (
              <div className="p-4 text-center opacity-30 text-[9px] uppercase">No logs recorded</div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="p-3 space-y-1">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold text-brand-orange uppercase">{log.action}</span>
                    <span className="text-[8px] opacity-40">{log.createdAt?.toDate ? log.createdAt.toDate().toLocaleString() : 'Just now'}</span>
                  </div>
                  <div className="text-[9px] opacity-60 font-mono truncate">
                    Target: {log.targetType}/{log.targetId}
                  </div>
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <div className="text-[8px] opacity-40 bg-white/5 p-1 rounded font-mono break-all">
                      {JSON.stringify(log.metadata)}
                    </div>
                  )}
                  <div className="text-[8px] opacity-30 uppercase tracking-tighter">
                    Admin: {log.adminId}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Current State Dump */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 flex items-center gap-2">
            <FileText size={12} /> Local_Buffer_Inspect
          </h3>
          <div className="p-4 bg-black border border-white/5 rounded-0 text-[9px] overflow-x-auto">
            <pre className="text-green-500/80 leading-tight">
              {JSON.stringify({
                uid: user?.uid,
                email: user?.email,
                role: profile?.role,
                status: profile?.accessStatus,
                classification: profile?.fieldClassificationComplete,
                tourComplete: profile?.firstMissionTourComplete,
                type: profile?.fieldType,
                onboarding: profile?.onboardingCompleted,
                activeTrip: profile?.activeTrip?.id
              }, null, 2)}
            </pre>
          </div>
        </div>

        {/* Single User Soft Reset Modal */}
        {softResetModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 font-mono">
            <div className="w-full max-w-xl border-2 border-rose-600 bg-black p-8 space-y-8 shadow-[0_0_50px_rgba(225,29,72,0.2)]">
              <div className="flex justify-between items-start border-b border-white/10 pb-6">
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-rose-500 uppercase tracking-tighter flex items-center gap-3">
                    <RotateCcw className="w-6 h-6" />
                    Protocol: User_Soft_Reset
                  </h3>
                  <p className="text-[10px] text-white/40 uppercase tracking-[0.2em]">Target: {softResetTarget}</p>
                </div>
                <button 
                  onClick={() => {
                    setSoftResetModalOpen(false);
                    setSoftResetReport(null);
                    setSoftResetConfirm(false);
                  }}
                  className="text-white/40 hover:text-white transition-colors"
                >
                  <X />
                </button>
              </div>

              {!softResetReport ? (
                <div className="space-y-6">
                  <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-sm">
                    <p className="text-xs leading-relaxed text-white/80">
                      You are about to perform a <span className="text-rose-500 font-bold uppercase">Soft Reset</span> on this agent's record. This action is definitive and will archived all current gameplay transmissions.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-[10px] uppercase">
                    <div className="space-y-3">
                      <p className="font-black text-white/40 tracking-widest border-b border-white/5 pb-2">Destructive Sequence</p>
                      <ul className="space-y-2 text-rose-400 font-bold">
                        <li className="flex items-center gap-2"><ArrowRight size={10} className="opacity-40" /> All XP/Points reset to 0</li>
                        <li className="flex items-center gap-2"><ArrowRight size={10} className="opacity-40" /> Archive all Entry records</li>
                        <li className="flex items-center gap-2"><ArrowRight size={10} className="opacity-40" /> Clear all Draw history</li>
                        <li className="flex items-center gap-2"><ArrowRight size={10} className="opacity-40" /> Terminate Active Missions</li>
                      </ul>
                    </div>
                    <div className="space-y-3">
                      <p className="font-black text-white/40 tracking-widest border-b border-white/5 pb-2">Preservation Protocol</p>
                      <ul className="space-y-2 text-brand-green font-bold">
                        <li className="flex items-center gap-2"><Check size={10} className="opacity-40" /> Identity / Username</li>
                        <li className="flex items-center gap-2"><Check size={10} className="opacity-40" /> Profile / Avatar</li>
                        <li className="flex items-center gap-2"><Check size={10} className="opacity-40" /> Legal Affirmations</li>
                        <li className="flex items-center gap-2"><Check size={10} className="opacity-40" /> Persona Classification</li>
                      </ul>
                    </div>
                  </div>

                  <div className="pt-4 space-y-4">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className={cn(
                        "w-5 h-5 border-2 flex items-center justify-center transition-all",
                        softResetConfirm ? "bg-rose-600 border-rose-600" : "bg-white/5 border-white/20 group-hover:border-rose-500/50"
                      )} onClick={() => setSoftResetConfirm(!softResetConfirm)}>
                        {softResetConfirm && <Check size={14} className="text-white" />}
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/60 group-hover:text-white transition-colors">
                        I authorize the archival of all transmission records for this agent.
                      </span>
                    </label>

                    <button
                      onClick={handleSoftResetExecute}
                      disabled={softResetLoading || !softResetConfirm}
                      className="w-full py-4 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-[0.2em] transition-all disabled:opacity-20 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    >
                      {softResetLoading ? (
                        <>
                          <RotateCcw className="w-4 h-4 animate-spin" />
                          Defragmenting Records...
                        </>
                      ) : (
                        'Execute Soft Reset Sequence'
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="p-4 bg-brand-green/10 border border-brand-green/20 text-brand-green">
                    <h4 className="text-sm font-black uppercase mb-1 flex items-center gap-2">
                       <CheckCircle2 size={16} /> 
                       Reset Successful
                    </h4>
                    <p className="text-[10px] opacity-80 uppercase tracking-widest leading-loose">
                      Agent <span className="font-bold underline text-white">{softResetReport.username}</span> has been returned to baseline.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase text-white/40 tracking-[0.2em]">Archival Summary</p>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(softResetReport.archivedCounts).map(([col, count]) => (
                        <div key={col} className="p-3 bg-white/5 border border-white/10 flex justify-between items-center text-[10px]">
                          <span className="opacity-40 uppercase tracking-tighter">{col}</span>
                          <span className="font-bold font-mono">{count as number}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSoftResetModalOpen(false);
                      setSoftResetReport(null);
                      setSoftResetConfirm(false);
                      window.location.reload();
                    }}
                    className="w-full py-4 bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase tracking-widest transition-colors"
                  >
                    Flush Cache & Continue
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="pt-12 border-t border-white/5 flex justify-between items-center opacity-20">
          <div className="flex items-center gap-2">
            <ArrowRight size={10} />
            <span className="text-[8px] uppercase tracking-widest">End_Of_Terminal</span>
          </div>
          <span className="text-[8px] uppercase tracking-widest">System_V.01_SECURED</span>
        </div>

        {/* Starter Reset Modal */}
        {starterResetModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 font-mono">
            <div className="w-full max-w-lg border border-red-600/30 bg-black p-6 space-y-6">
              <div className="flex justify-between items-start border-b border-white/10 pb-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-rose-500 uppercase tracking-widest flex items-center gap-2">
                    <Shield className="w-4 h-4 text-rose-500" />
                    CRITICAL: Starter deck reset
                  </h3>
                  <p className="text-[8px] opacity-40">SYSTEM LEVEL SOFT RESET SEQUENCE</p>
                </div>
                <button 
                  onClick={handleCloseStarterResetModal}
                  disabled={starterResetLoading}
                  className="text-white/40 hover:text-white text-xs disabled:opacity-30 font-bold"
                >
                  [Esc_Close]
                </button>
              </div>

              {!starterResetReport ? (
                <div className="space-y-4 text-xs">
                  <p className="leading-relaxed text-white/70 text-[10px]">
                    This will reset Starter Deck progress for all users. Existing Starter submissions will be archived and will no longer count toward Starter completion.
                  </p>
                  
                  <div className="p-3 bg-rose-950/20 border border-rose-900/40 text-rose-400 text-[9px] leading-relaxed">
                    <strong className="font-extrabold text-[10px] block mb-1">SOFT RESET SPECIFICS:</strong>
                    <ul className="list-disc pl-4 space-y-1">
                      <li>Starter-related submissions are archived and progress reset to 0/3.</li>
                      <li>Active Starter missions, drawn cards, and exhausted flags are cleared.</li>
                      <li>Awarded XP/points for Starter entries will be subtracted automatically (Option B).</li>
                      <li>On completion, a summary report will display execution stats.</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-white/50">
                      Type <span className="text-rose-500 font-extrabold uppercase bg-rose-500/10 px-1 border border-rose-500/20">RESET STARTER</span> to authorize:
                    </p>
                    <input
                      type="text"
                      value={starterResetConfirmInput}
                      onChange={(e) => setStarterResetConfirmInput(e.target.value)}
                      placeholder="RESET STARTER"
                      disabled={starterResetLoading}
                      className="w-full bg-white/5 border border-white/10 px-3 py-2 text-xs focus:border-rose-500 outline-none placeholder:opacity-20 text-white uppercase"
                    />
                  </div>

                  <button
                    onClick={handleStarterResetExecute}
                    disabled={starterResetLoading || starterResetConfirmInput !== 'RESET STARTER'}
                    className="w-full bureau-btn text-[10px] py-3 bg-rose-600/20 border-rose-500/40 text-rose-500 hover:bg-rose-600 hover:text-white disabled:opacity-30 flex items-center justify-center gap-2"
                  >
                    {starterResetLoading ? (
                      <>
                        <RotateCcw className="w-3 h-3 animate-spin" />
                        EXECUTING RESET MIGRATION...
                      </>
                    ) : (
                      'AUTHORIZE GLOBAL SOFT RESET'
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-4 text-xs">
                  {starterResetReport.success ? (
                    <div className="p-4 bg-emerald-950/20 border border-emerald-900/40 text-emerald-400 space-y-2">
                      <div className="flex items-center gap-2 font-black uppercase text-sm">
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                        Soft Reset Successful
                      </div>
                      <p className="text-[9px] opacity-80 leading-relaxed">
                        Starter Deck state has been successfully reset globally. Active progress recalculations are now running under version: <strong>starter-reset-2026-06-11</strong>.
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 bg-rose-950/20 border border-rose-900/40 text-rose-400 space-y-1">
                      <div className="font-black uppercase">Migration Failed</div>
                      <p className="text-[9px] leading-normal">{starterResetReport.error}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase opacity-40">MIGRATION REPORT</p>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="p-2 border border-white/5 bg-white/[0.01]">
                        <span className="block opacity-40">Users Reset</span>
                        <strong className="text-sm font-mono">{starterResetReport.usersUpdated}</strong>
                      </div>
                      <div className="p-2 border border-white/5 bg-white/[0.01]">
                        <span className="block opacity-40">Entries Archived</span>
                        <strong className="text-sm font-mono">{starterResetReport.submissionsArchived}</strong>
                      </div>
                      <div className="p-2 border border-white/5 bg-white/[0.01]">
                        <span className="block opacity-40">Reviews Updated</span>
                        <strong className="text-sm font-mono">{starterResetReport.proofReviewsUpdated}</strong>
                      </div>
                      <div className="p-2 border border-white/5 bg-white/[0.01]">
                        <span className="block opacity-40">Missions Aborted</span>
                        <strong className="text-sm font-mono">{starterResetReport.activeMissionsCleared}</strong>
                      </div>
                    </div>

                    <div className="mt-2 p-2.5 border border-white/10 bg-white/5 flex items-center justify-between text-[10px]">
                      <div>
                        <span className="block opacity-40 uppercase text-[8px]">XP Subtraction Mode (Option B)</span>
                        <strong>{starterResetReport.xpReduced ? 'Subtotals reversed' : 'No active XP detected'}</strong>
                      </div>
                      <strong className="text-xs text-rose-500 font-mono">-{starterResetReport.totalSubtractions} XP</strong>
                    </div>
                  </div>

                  <button
                    onClick={handleCloseStarterResetModal}
                    className="w-full bureau-btn text-[10px] py-3 bg-white/10 text-white hover:bg-white/20"
                  >
                    CONFIRM & FLUSH SYSTEM CACHES
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
