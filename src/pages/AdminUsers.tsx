import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  User as UserIcon, 
  Search, 
  Settings,
  MoreVertical,
  Check,
  X,
  RotateCcw
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { getLeaderboardPage, UserProfile } from '../services/userService';
import { subscribeToAdmins, setAdminStatus } from '../services/skinService';
import { resetUserStarterProgress, auditAndRepairUserCounts, softResetUser } from '../services/adminOperationsService';
import { Card, FieldBadge } from '../components/UI';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { getDisplayLabel } from '../utils/labelUtils';

export default function AdminUsersPage() {
  const { user } = useApp();
  const { isAdmin } = useTheme();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [adminIds, setAdminIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [targetUser, setTargetUser] = useState<UserProfile | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const [softResetTargetId, setSoftResetTargetId] = useState<string | null>(null);
  const [softResetConfirmText, setSoftResetConfirmText] = useState('');

  useEffect(() => {
    if (!isAdmin) return;

    // Load initial users
    async function loadUsers() {
      try {
        const result = await getLeaderboardPage(50);
        setUsers(result.docs);
      } catch (err) {
        console.error("Failed to load users:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadUsers();

    // Subscribe to admin list
    const unsub = subscribeToAdmins(setAdminIds);
    return () => unsub();
  }, [isAdmin]);

  const toggleAdmin = async (userId: string, currentStatus: boolean) => {
    if (!user || isUpdating) return;
    
    // Safety: Don't allow self-demotion if you're the only admin
    if (userId === user.uid && (adminIds?.length || 0) === 1) {
      alert("Error: You are the last standing admin. Assign a successor before resigning.");
      return;
    }

    setIsUpdating(true);
    try {
      await setAdminStatus(userId, !currentStatus);
      setTargetUser(null);
    } catch (err: any) {
      console.error("Failed to toggle admin status:", err);
      alert(`Error: Update failed. ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleResetStarter = async (userId: string) => {
    if (!confirm("Are you sure you want to RESET this user's Starter Progress? This clears their 3 approved signals count.")) return;
    setIsUpdating(true);
    try {
      await resetUserStarterProgress(userId);
      alert("Starter progression reset successfully.");
      setTargetUser(null);
    } catch (err: any) {
      alert(`Reset failed: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAuditUser = async (userId: string) => {
    setIsUpdating(true);
    try {
      const report = await auditAndRepairUserCounts(userId);
      alert(`Audit Complete\nScanned: ${report.scanned}\nStarter count: ${report.starterCount}/3\nTotal Approved: ${report.totalApproved}`);
      setTargetUser(null);
    } catch (err: any) {
      alert(`Audit failed: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSoftReset = async () => {
    if (!softResetTargetId) return;
    if (softResetConfirmText.toUpperCase() !== 'RESET') {
      alert("Please type RESET to confirm.");
      return;
    }
    
    setIsUpdating(true);
    try {
      await softResetUser({ targetUserId: softResetTargetId, confirmReset: true });
      alert("Soft Reset Complete. User returned to Starter baseline.");
      setSoftResetTargetId(null);
      setSoftResetConfirmText('');
      setTargetUser(null);
    } catch (err: any) {
      alert(`Reset failed: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isAdmin) return <div className="p-20 text-center">{getDisplayLabel('ACCESS_DENIED')}. Level 5 clearance required.</div>;

  return (
    <div className="pb-40 px-6 pt-12 max-w-4xl mx-auto space-y-12">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <FieldBadge variant="sticker" color="orange">{getDisplayLabel('USER_MANAGEMENT')}</FieldBadge>
            <h1 className="font-display text-4xl uppercase tracking-tighter">Personnel Registry</h1>
          </div>
          <div className="text-right">
            <p className="micro-label opacity-40">{getDisplayLabel('ADMIN_FORCE_SIZE')}</p>
            <p className="text-2xl font-display text-brand-orange">{adminIds?.length || 0}</p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-20" />
          <input 
            type="text"
            placeholder={`${getDisplayLabel('FILTER_BY_NAME_OR_IDENTIFIER')}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-on-surface/5 border-2 border-on-surface/10 p-4 pl-12 text-xs font-mono focus:border-on-surface outline-none"
          />
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 bg-on-surface/5 border-b-2 border-on-surface/5 flex items-center justify-between text-[10px] uppercase font-bold tracking-widest opacity-40 px-8">
          <span>Field Agent</span>
          <span>Security Clearance</span>
        </div>
        
        <div className="divide-y divide-on-surface/5">
          {isLoading ? (
            <div className="p-12 text-center opacity-40 italic text-xs uppercase tracking-widest">
              Accessing encrypted registry...
            </div>
          ) : (filteredUsers?.length || 0) === 0 ? (
            <div className="p-12 text-center opacity-40 italic text-xs uppercase tracking-widest">
              No matching records found.
            </div>
          ) : (
            filteredUsers.map((u) => {
              const isUserAdmin = adminIds.includes(u.id) || u.email === 'hammer808@gmail.com';
              const isHardcoded = u.email === 'hammer808@gmail.com';

              return (
                <div key={u.id} className="p-6 px-8 flex items-center justify-between group hover:bg-on-surface/[0.02] transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-on-surface/5 border border-on-surface/10 flex items-center justify-center relative overflow-hidden">
                      {u.photoURL ? (
                        <img src={u.photoURL} alt="" className="w-full h-full object-cover grayscale" />
                      ) : (
                        <UserIcon className="w-5 h-5 opacity-20" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest">{u.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-[10px] font-mono opacity-40">{u.email}</p>
                        {u.fieldClassificationComplete ? (
                          <span className="text-[8px] px-1 bg-brand-green/10 text-brand-green border border-brand-green/20 font-mono uppercase">
                            {u.fieldTypeName || u.fieldType || 'ASSIGNED'}
                          </span>
                        ) : (
                          <span className="text-[8px] px-1 bg-on-surface/10 text-on-surface/40 border border-on-surface/10 font-mono uppercase">
                            {getDisplayLabel('ONBOARDING_PENDING')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right flex flex-col items-end gap-1">
                      {isUserAdmin ? (
                        <span className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-brand-orange">
                          <ShieldCheck className="w-3 h-3" />
                          {getDisplayLabel('LEVEL_ADMIN')}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest opacity-20">
                          <Shield className="w-3 h-3" />
                          {getDisplayLabel('LEVEL_AGENT')}
                        </span>
                      )}
                      <p className="text-[8px] font-mono opacity-30 uppercase tracking-tighter">
                        REP: {u.points} // SOLO: {u.soloTripsCount}
                      </p>
                    </div>

                    {!isHardcoded && (
                      <button 
                        onClick={() => setTargetUser(u)}
                        className="p-2 hover:bg-on-surface/5 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Settings className="w-4 h-4 opacity-40" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {targetUser && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-paper w-full max-w-sm flex flex-col shadow-2xl border-2 border-on-surface"
            >
              <div className="p-6 pt-12 text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-on-surface/5 flex items-center justify-center relative">
                  <ShieldAlert className="w-8 h-8 opacity-40" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-display text-xl uppercase tracking-tighter">Security Protocol</h3>
                  <p className="text-[10px] opacity-60 uppercase leading-relaxed px-4">
                    Modify clearance levels for <span className="font-bold text-on-surface">{targetUser.name}</span>?
                  </p>
                </div>
              </div>

              <div className="p-8 space-y-3">
                <button 
                  onClick={() => toggleAdmin(targetUser.id, adminIds.includes(targetUser.id))}
                  disabled={isUpdating}
                  className={cn(
                    "w-full bureau-btn text-[10px]",
                    adminIds.includes(targetUser.id) ? "bg-error text-white" : "bg-brand-orange text-white"
                  )}
                >
                  {isUpdating ? 'PROCESSING...' : adminIds.includes(targetUser.id) ? getDisplayLabel('REVOKE_CLEARANCE') : getDisplayLabel('GRANT_ADMIN_ACCESS')}
                </button>
                
                <button 
                  onClick={() => handleResetStarter(targetUser.id)}
                  disabled={isUpdating}
                  className="w-full bureau-btn border-on-surface text-[10px] bg-brand-orange/10 hover:bg-brand-orange/20"
                >
                  {isUpdating ? 'PROCESSING...' : 'RESET STARTER PROGRESS'}
                </button>

                <button 
                  onClick={() => handleAuditUser(targetUser.id)}
                  disabled={isUpdating}
                  className="w-full bureau-btn border-on-surface text-[10px] bg-brand-green/10 hover:bg-brand-green/20"
                >
                  {isUpdating ? 'PROCESSING...' : 'AUDIT & REPAIR COUNTS'}
                </button>

                <button 
                  onClick={() => setSoftResetTargetId(targetUser.id)}
                  disabled={isUpdating}
                  className="w-full bureau-btn border-rose-500/30 text-[10px] bg-rose-500/10 hover:bg-rose-500/20 text-rose-500"
                >
                  {isUpdating ? 'PROCESSING...' : 'SINGLE USER SOFT RESET'}
                </button>

                <button 
                  onClick={() => setTargetUser(null)}
                  className="w-full bureau-btn border-on-surface"
                >
                  {getDisplayLabel('ABORT_ACTION')}
                </button>
              </div>

              <div className="p-4 bg-on-surface/5 text-center">
                <p className="text-[8px] font-mono opacity-30 uppercase">Authorized by: {user?.email}</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Soft Reset Confirmation Modal */}
      <AnimatePresence>
        {softResetTargetId && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-paper w-full max-w-sm border-2 border-rose-600 shadow-2xl p-8 space-y-6"
            >
              <div className="text-center space-y-2">
                <RotateCcw className="w-12 h-12 text-rose-600 mx-auto" />
                <h3 className="font-display text-2xl uppercase tracking-tighter text-rose-600">Soft Reset Trigger</h3>
                <p className="text-[10px] opacity-60 uppercase leading-relaxed">
                  Clear all gameplay history for <span className="font-bold text-on-surface">{users.find(u => u.id === softResetTargetId)?.name}</span>?
                </p>
              </div>

              <div className="p-4 bg-rose-600/5 border border-rose-600/20 text-[9px] uppercase tracking-widest leading-loose text-rose-500/80 italic">
                Archives all entries, resets XP to 0, and returns user to baseline Starter Deck. Preservation of Identity confirmed.
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-[9px] uppercase font-bold opacity-40">Type RESET to authorize</p>
                  <input 
                    type="text" 
                    value={softResetConfirmText}
                    onChange={(e) => setSoftResetConfirmText(e.target.value)}
                    placeholder="RESET"
                    className="w-full bg-on-surface/5 border-2 border-on-surface/10 p-3 text-xs font-mono focus:border-rose-600 outline-none uppercase"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <button 
                    onClick={handleSoftReset}
                    disabled={isUpdating || softResetConfirmText.toUpperCase() !== 'RESET'}
                    className="w-full bureau-btn bg-rose-600 text-white border-rose-600 disabled:opacity-20"
                  >
                    {isUpdating ? 'RESETTING...' : 'EXECUTE SINGLE USER RESET'}
                  </button>
                  <button 
                    onClick={() => {
                      setSoftResetTargetId(null);
                      setSoftResetConfirmText('');
                    }}
                    disabled={isUpdating}
                    className="w-full bureau-btn border-on-surface"
                  >
                    ABORT
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
