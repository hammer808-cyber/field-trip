import React, { useState, useEffect } from 'react';
import { 
  Save, 
  Settings, 
  ShieldCheck, 
  Cpu, 
  Globe, 
  Zap,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  Info,
  CheckCircle2,
  Activity,
  AlertTriangle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { AdminLayout, ModuleCard, StatusLight, AdminReceipt } from '../components/admin/AdminShared';
import { GlobalConfig, updateGlobalConfig } from '../services/configService';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminSettings() {
  const { globalConfig, profile } = useApp();
  const { isAdmin } = useTheme();
  
  const [localConfig, setLocalConfig] = useState<GlobalConfig>(globalConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [receipt, setReceipt] = useState<{ title: string; data: Record<string, any> } | null>(null);
  const [showTokens, setShowTokens] = useState(false);

  useEffect(() => {
    setLocalConfig(globalConfig);
  }, [globalConfig]);

  const handleToggle = (key: keyof GlobalConfig) => {
    setLocalConfig(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleNumberChange = (key: keyof GlobalConfig, value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num)) return;
    setLocalConfig(prev => ({
      ...prev,
      [key]: num
    }));
  };

  const saveConfig = async () => {
    setIsSaving(true);
    try {
      await updateGlobalConfig(localConfig);
      setReceipt({
        title: "Configuration Saved",
        data: {
          maintenanceMode: localConfig.maintenanceMode,
          betaMode: localConfig.betaMode,
          aiImageAnalysis: localConfig.aiImageAnalysisEnabled,
          maxDailyUploads: localConfig.maxDailyUploadsPerUser,
          adminIdentity: profile?.name || 'System'
        }
      });
    } catch (err: any) {
      console.error("Failed to save config:", err);
      alert("Error saving configuration: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-on-surface text-white flex flex-col items-center justify-center p-8 text-center">
        <Lock className="w-16 h-16 mb-6 text-error" />
        <h1 className="text-4xl font-display font-black uppercase italic tracking-tighter">RESTRICTED_ACCESS</h1>
        <p className="font-mono text-xs opacity-50 mt-4 tracking-widest">Configuration module requires level-7 clearance.</p>
      </div>
    );
  }

  return (
    <AdminLayout 
      title="System_Configuration" 
      breadcrumbs={[{ label: 'Settings' }]}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Toggles & Forms */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Section 1: Global Kill Switches */}
          <div className="bg-white border-4 border-on-surface p-8 shadow-[8px_8px_0px_black] space-y-8">
            <div className="flex items-center gap-3 border-b-2 border-on-surface/10 pb-4">
               <Globe className="w-6 h-6 text-brand-orange" />
               <h3 className="font-display text-2xl font-black uppercase italic tracking-tight">Global_Kill_Switches</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <ConfigToggle 
                 label="Maintenance Mode" 
                 description="Take the entire app offline for non-admins." 
                 enabled={localConfig.maintenanceMode} 
                 onToggle={() => handleToggle('maintenanceMode')} 
               />
               <ConfigToggle 
                 label="Beta Mode" 
                 description="Restrict access to authorized beta users only." 
                 enabled={localConfig.betaMode} 
                 onToggle={() => handleToggle('betaMode')} 
               />
               <ConfigToggle 
                 label="Uploads Enabled" 
                 description="Enable/Disable image proof submissions." 
                 enabled={localConfig.uploadsEnabled} 
                 onToggle={() => handleToggle('uploadsEnabled')} 
               />
               <ConfigToggle 
                 label="Leaderboard Refresh" 
                 description="Enable live ranking updates for the Big Board." 
                 enabled={localConfig.leaderboardLiveUpdatesEnabled} 
                 onToggle={() => handleToggle('leaderboardLiveUpdatesEnabled')} 
               />
            </div>
          </div>

          {/* Section 2: AI & Computer Vision */}
          <div className="bg-white border-4 border-on-surface p-8 shadow-[8px_8px_0px_black] space-y-8">
            <div className="flex items-center gap-3 border-b-2 border-on-surface/10 pb-4">
               <Cpu className="w-6 h-6 text-brand-cyan" />
               <h3 className="font-display text-2xl font-black uppercase italic tracking-tight">AI_Vetting_Protocols</h3>
            </div>

            <div className="space-y-6">
               <ConfigToggle 
                 label="Gemini Image Analysis" 
                 description="Use AI to automatically verify submission content." 
                 enabled={localConfig.aiImageAnalysisEnabled} 
                 onToggle={() => handleToggle('aiImageAnalysisEnabled')} 
               />

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                  <ConfigInput 
                    label="Max Daily AI Scans" 
                    value={localConfig.maxDailyAiScansPerUser} 
                    onChange={(val) => handleNumberChange('maxDailyAiScansPerUser', val)} 
                    description="Per user limit to prevent cost overrun."
                  />
                  <ConfigInput 
                    label="Global Daily Cap" 
                    value={localConfig.maxGlobalAiScansPerDay} 
                    onChange={(val) => handleNumberChange('maxGlobalAiScansPerDay', val)} 
                    description="Shutdown AI globally if total limit hit."
                  />
               </div>
            </div>
          </div>

          {/* Section 3: Rate Limiting & Capacity */}
          <div className="bg-white border-4 border-on-surface p-8 shadow-[8px_8px_0px_black] space-y-8">
            <div className="flex items-center gap-3 border-b-2 border-on-surface/10 pb-4">
               <Activity className="w-6 h-6 text-brand-lime" />
               <h3 className="font-display text-2xl font-black uppercase italic tracking-tight">Capacity_Rate_Limits</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <ConfigInput 
                 label="Max Daily Uploads" 
                 value={localConfig.maxDailyUploadsPerUser} 
                 onChange={(val) => handleNumberChange('maxDailyUploadsPerUser', val)} 
                 description="Hard limit on photo entries per agent."
               />
               <ConfigInput 
                 label="Max Proof Checks" 
                 value={localConfig.maxDailyProofChecksPerUser} 
                 onChange={(val) => handleNumberChange('maxDailyProofChecksPerUser', val)} 
                 description="Limit on peer vetting actions per day."
               />
            </div>
          </div>
        </div>

        {/* Right Column: Actions & App Check Monitor */}
        <div className="lg:col-span-4 space-y-8 sticky top-8">
           
           {/* Save Panel */}
           <div className="bg-on-surface p-8 shadow-[12px_12px_0px_black] text-white space-y-6">
              <div className="space-y-2">
                 <h4 className="font-display text-2xl font-black uppercase italic tracking-tighter text-brand-lime">Apply_Changes</h4>
                 <p className="font-mono text-[10px] font-black uppercase opacity-60 leading-tight">
                   Modifying global config affects current active sessions of all users in real-time via reactive subscription.
                 </p>
              </div>
              
              <button
                onClick={saveConfig}
                disabled={isSaving}
                className="w-full py-5 bg-brand-lime text-on-surface border-4 border-white font-display font-black uppercase italic text-lg tracking-wider flex items-center justify-center gap-3 shadow-[4px_4px_0px_rgba(255,255,255,0.2)] hover:bg-white hover:border-brand-lime transition-all disabled:opacity-50"
              >
                {isSaving ? (
                  <RefreshCw className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <Save className="w-6 h-6" />
                    <span>Finalize Config</span>
                  </>
                )}
              </button>
           </div>

           {/* App Check Monitor */}
           <div className="bg-white border-4 border-on-surface p-6 shadow-[8px_8px_0px_black] space-y-6">
              <div className="flex items-center justify-between border-b-2 border-on-surface/10 pb-4">
                 <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-brand-orange" />
                    <h4 className="font-mono text-xs font-black uppercase tracking-widest">App_Check_Audit</h4>
                 </div>
                 <StatusLight state="green" pulse />
              </div>
              
              <div className="space-y-4">
                 <div className="p-4 bg-on-surface/5 border border-on-surface/10 space-y-3">
                    <div className="flex items-center gap-3">
                       <div className="w-2 h-2 rounded-full bg-brand-lime shadow-[0_0_8px_#B7FF00]" />
                       <span className="font-mono text-[9px] font-black uppercase tracking-tight">RECAPTCHA_V3_ACTIVE</span>
                    </div>
                    <div className="flex items-center gap-3 opacity-30">
                       <div className="w-2 h-2 rounded-full bg-on-surface" />
                       <span className="font-mono text-[9px] font-black uppercase tracking-tight text-on-surface">RECAPTCHA_ENTERPRISE_IDLE</span>
                    </div>
                 </div>

                 <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-mono font-black uppercase opacity-40 px-1">
                       <span>Verification_Rate</span>
                       <span>8%_Verified</span>
                    </div>
                    <div className="h-3 bg-on-surface/5 border border-on-surface/10 rounded-full overflow-hidden relative">
                       <div className="h-full bg-error w-[64%] absolute left-0" />
                       <div className="h-full bg-brand-orange w-[28%] absolute left-[64%]" />
                       <div className="h-full bg-brand-lime w-[8%] absolute left-[92%]" />
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-[7px] font-mono font-black uppercase tracking-tighter opacity-50 px-1">
                       <span className="text-error">64%_INVALID</span>
                       <span className="text-brand-orange">28%_OUTDATED</span>
                       <span className="text-brand-green text-right">8%_VETTED</span>
                    </div>
                 </div>

                 <div className="bg-[#FFDD00]/10 border border-[#FFDD00]/30 p-3 flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-[#FFDD00] shrink-0" />
                    <p className="font-mono text-[8.5px] font-black uppercase leading-tight text-on-surface/80">
                      Warning: DO NOT ENFORCE App Check. Verification rate (8%) is below threshold (90%). Enforcement will terminate most agent traffic.
                    </p>
                 </div>

                 <div className="pt-2">
                    <button 
                      onClick={() => setShowTokens(!showTokens)}
                      className="w-full py-2 bg-on-surface/5 border border-on-surface/10 font-mono text-[9px] font-black uppercase tracking-widest hover:bg-on-surface/10 transition-all flex items-center justify-center gap-2"
                    >
                      {showTokens ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {showTokens ? 'Hide Diagnostic Keys' : 'View Diagnostic Keys'}
                    </button>
                    
                    <AnimatePresence>
                      {showTokens && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 p-4 bg-on-surface text-white rounded-lg font-mono text-[9px] space-y-3 break-all">
                             <div className="border-b border-white/10 pb-2">
                                <span className="opacity-40 uppercase block mb-1">RECAPTCHA_SITE_KEY</span>
                                <span>6Lctv_o6AAAAAEDO6X...</span>
                             </div>
                             <div>
                                <span className="opacity-40 uppercase block mb-1">PROD_DOMAIN_WHITELIST</span>
                                <span>fieldtrip-webapp-production.run.app</span>
                                <span className="block opacity-60">localhost, 127.0.0.1</span>
                             </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                 </div>
              </div>
           </div>

           {/* Health Summary Card */}
           <div className="bg-on-surface/5 border-2 border-dashed border-on-surface/20 p-6 flex flex-col items-center gap-3 text-center">
              <div className="w-10 h-10 bg-on-surface/10 flex items-center justify-center rounded-full">
                 <ShieldCheck className="w-5 h-5 text-on-surface/30" />
              </div>
              <div className="space-y-1">
                 <h5 className="font-mono text-[10px] font-black uppercase tracking-widest">Configuration_Stable</h5>
                 <p className="font-mono text-[9px] opacity-40 uppercase tracking-tight text-center leading-relaxed">System is running with authorized overrides. All kill switches are synced.</p>
              </div>
           </div>

        </div>
      </div>

      {/* Global Receipt Modal */}
      <AnimatePresence>
        {receipt && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <AdminReceipt 
              title={receipt.title} 
              data={receipt.data} 
              onClose={() => setReceipt(null)} 
            />
          </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}

// Sub-components
const ConfigToggle = ({ label, description, enabled, onToggle }: { label: string; description: string; enabled: boolean; onToggle: () => void }) => (
  <button 
    onClick={onToggle}
    className={cn(
      "p-6 border-2 flex flex-col text-left transition-all relative overflow-hidden group",
      enabled ? "bg-brand-lime border-on-surface shadow-[4px_4px_0px_black]" : "bg-white border-on-surface/20 shadow-none grayscale opacity-60 hover:grayscale-0 hover:opacity-100"
    )}
  >
    <div className="flex items-center justify-between gap-4 mb-3">
       <span className="font-display text-xl font-black uppercase italic tracking-tighter leading-none">{label}</span>
       <div className={cn(
         "w-12 h-6 border-2 border-on-surface flex items-center px-0.5 transition-all",
         enabled ? "bg-on-surface" : "bg-white"
       )}>
          <div className={cn(
            "w-4 h-4 shadow-[2px_2px_0px_rgba(0,0,0,0.1)] transition-transform",
            enabled ? "translate-x-6 bg-brand-lime" : "translate-x-0 bg-on-surface/20"
          )} />
       </div>
    </div>
    <p className="font-mono text-[9px] font-black uppercase tracking-tight leading-tight opacity-60">{description}</p>
    
    {enabled && (
      <div className="absolute top-0 right-0 p-1">
        <CheckCircle2 className="w-4 h-4 text-on-surface opacity-20" />
      </div>
    )}
  </button>
);

const ConfigInput = ({ label, value, onChange, description }: { label: string; value: number; onChange: (val: string) => void; description: string }) => (
  <div className="space-y-2 group">
    <div className="flex justify-between items-baseline">
       <label className="font-mono text-[10px] font-black uppercase tracking-widest text-on-surface hover:text-brand-orange transition-colors cursor-pointer mb-1 block">
         {label.replace(/\s+/g, '_')}
       </label>
       <span className="font-mono text-[8px] font-black opacity-20 group-hover:opacity-100 transition-opacity uppercase">STABLE_PARAM</span>
    </div>
    <input 
      type="number" 
      value={value} 
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-[#FCF9F2] border-2 border-on-surface p-4 font-mono text-sm font-black uppercase focus:bg-white focus:shadow-[4px_4px_0_black] transition-all outline-none"
    />
    <p className="font-mono text-[8px] font-black uppercase tracking-widest opacity-40 pl-1">{description}</p>
  </div>
);
