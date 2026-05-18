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
  Sparkles
} from 'lucide-react';
import { cn } from '../lib/utils';
import { initializeDefaultSeason } from '../services/seasonService';
import { logAdminAction } from '../services/moderationService';

export default function AdminDevTools() {
  const navigate = useNavigate();
  const { 
    user, 
    profile, 
    isAdmin, 
    updateProfile, 
    activeSeason,
    gameConfig
  } = useApp();
  const [initLoading, setInitLoading] = useState(false);

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
        activeTrip: null
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

  const handleRoute = (path: string) => {
    console.log('ADMIN_ACTION: Manual Jump to', path);
    navigate(path);
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
          <div className="p-6 border border-brand-orange/20 bg-brand-orange/5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-black uppercase text-brand-orange">Summer_Season_2026</p>
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
            </div>

            <div className="p-6 border border-white/10 bg-white/[0.02] space-y-6">
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase opacity-40">Hazard_Controls</p>
                <button 
                  onClick={handleResetState}
                  className="w-full bureau-btn text-[8px] py-4 bg-red-600/10 border-red-600/30 text-red-500 hover:bg-red-600 hover:text-white"
                >
                  <Trash2 className="w-3 h-3 inline mr-2" />
                  Wipe_Profile_Progress
                </button>
                <p className="text-[8px] opacity-30 italic mt-2">Wipes legal, onboarding, classification, and access status.</p>
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
                type: profile?.fieldType,
                onboarding: profile?.onboardingCompleted,
                activeTrip: profile?.activeTrip?.id
              }, null, 2)}
            </pre>
          </div>
        </div>

        <div className="pt-12 border-t border-white/5 flex justify-between items-center opacity-20">
          <div className="flex items-center gap-2">
            <ArrowRight size={10} />
            <span className="text-[8px] uppercase tracking-widest">End_Of_Terminal</span>
          </div>
          <span className="text-[8px] uppercase tracking-widest">System_V.01_SECURED</span>
        </div>
      </div>
    </div>
  );
}
