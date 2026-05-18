import { useState } from 'react';
import { useDev } from '../context/DevContext';
import { FieldTypeId, FIELD_TYPES } from '../constants';
import { X, Settings, Calendar, Shield, Zap, User, Microscope, ClipboardCopy, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { runFullPersonaAudit, AuditSummary } from '../utils/personaQuizSimulator';

export function DevTools() {
  const { overrides, setOverrides, isDevMode } = useDev();
  const [isOpen, setIsOpen] = useState(false);
  const [auditResult, setAuditResult] = useState<AuditSummary | null>(null);

  if (!isDevMode) return null;

  const updateOverride = (key: string, value: any) => {
    setOverrides(prev => ({ ...prev, [key]: value }));
  };

  const handleRunAudit = () => {
    const result = runFullPersonaAudit();
    setAuditResult(result);
  };

  const handleCopyAudit = () => {
    if (!auditResult) return;
    
    const text = `
BUREAU PERSONA QUIZ AUDIT SUMMARY
Generated: ${auditResult.timestamp}

1. QUESTION INTEGRITY
Status: ${auditResult.integrity.passed ? 'PASS' : 'FAIL'}
Questions Checked: ${auditResult.integrity.questionCount}
Answers Checked: ${auditResult.integrity.answerCount}
Errors Found: ${auditResult.integrity.errors.length}
${auditResult.integrity.errors.map(e => ` - ${e}`).join('\n')}

2. REACHABILITY
${Object.entries(auditResult.reachability.reachable).map(([type, status]) => ` - ${type}: ${status ? 'REACHABLE' : 'UNREACHABLE'}`).join('\n')}

3. RANDOM SIMULATION Distribution (${auditResult.simulation.iterations} trials)
${auditResult.simulation.results.map(r => ` - ${r.type}: ${r.count} wins (${r.frequency})`).join('\n')}

4. WARNINGS
${auditResult.warnings.length > 0 ? auditResult.warnings.map(w => ` - ${w}`).join('\n') : 'No warnings detected.'}

5. FINAL VERDICT
Verdict: ${auditResult.verdict}
`;
    navigator.clipboard.writeText(text.trim());
  };

  return (
    <div className="fixed bottom-20 right-6 z-[9999] pointer-events-none">
      <div className="pointer-events-auto relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-12 h-12 rounded-full bg-brand-orange text-white shadow-xl flex items-center justify-center transition-all hover:scale-110",
            isOpen && "rotate-90 bg-on-surface"
          )}
        >
          {isOpen ? <X className="w-6 h-6" /> : <Settings className="w-6 h-6" />}
        </button>

        {isOpen && (
          <div className="absolute bottom-16 right-0 w-80 bg-paper border-2 border-on-surface p-6 shadow-2xl rounded-2xl space-y-6 max-h-[70vh] overflow-y-auto">
            <h3 className="font-display text-xl uppercase tracking-widest text-brand-orange border-b border-on-surface/10 pb-2">
              BUREAU_DEBUG_PANEL
            </h3>

            {/* Persona Simulator Section */}
            <div className="space-y-3 p-3 bg-brand-mustard/10 border-2 border-brand-mustard/20 rounded-lg">
              <label className="micro-label flex items-center gap-2 text-brand-mustard font-bold">
                <Microscope className="w-3 h-3" /> QUIZ_VALIDATION_SUITE
              </label>
              
              <button
                onClick={handleRunAudit}
                className="w-full py-2 bg-brand-mustard text-on-surface text-[10px] font-mono uppercase font-bold tracking-widest hover:bg-on-surface hover:text-white transition-colors"
              >
                RUN_FULL_QUIZ_AUDIT
              </button>

              {auditResult && (
                <div className="space-y-3 mt-4 pt-4 border-t border-brand-mustard/20">
                  <div className="flex items-center justify-between">
                    <span className="micro-label text-brand-mustard">AUDIT_SUMMARY</span>
                    <button 
                      onClick={handleCopyAudit}
                      className="p-1 hover:bg-brand-mustard/20 rounded transition-colors text-brand-mustard"
                      title="Copy Summary"
                    >
                      <ClipboardCopy className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span>VERDICT:</span>
                      <span className={cn(
                        "font-bold px-2 py-0.5 rounded",
                        auditResult.verdict === 'PASS' ? "bg-brand-green text-white" :
                        auditResult.verdict === 'WARNING' ? "bg-brand-mustard text-on-surface" : "bg-error text-white"
                      )}>
                        {auditResult.verdict}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[9px] font-mono opacity-60">INTEGRITY:</p>
                      <div className="flex items-center gap-1.5 text-[10px] font-mono px-2 py-1 bg-white/50">
                        {auditResult.integrity.passed ? <CheckCircle2 className="w-3 h-3 text-brand-green" /> : <XCircle className="w-3 h-3 text-error" />}
                        <span>{auditResult.integrity.questionCount} Questions / {auditResult.integrity.answerCount} Answers</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[9px] font-mono opacity-60">REACHABILITY:</p>
                      <div className="grid grid-cols-2 gap-1">
                        {Object.entries(auditResult.reachability.reachable).map(([type, reachable]) => (
                          <div key={type} className="flex items-center gap-1 text-[9px] font-mono">
                            <div className={cn("w-1.5 h-1.5 rounded-full", reachable ? "bg-brand-green" : "bg-error")} />
                            <span className="truncate opacity-80">{type}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[9px] font-mono opacity-60">DISTRIBUTION (RANDOM 5K):</p>
                      <div className="space-y-1 bg-white/50 p-2 rounded">
                        {auditResult.simulation.results.map(r => (
                          <div key={r.type} className="flex items-center justify-between text-[9px] font-mono">
                            <span className="opacity-80 truncate mr-2">{r.type}:</span>
                            <span className="font-bold shrink-0">{r.frequency}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {auditResult.warnings.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[9px] font-mono text-brand-orange flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5" /> WARNINGS ({auditResult.warnings.length})
                        </p>
                        <ul className="text-[8px] font-mono list-disc pl-3 text-brand-orange opacity-80">
                          {auditResult.warnings.map((w, i) => <li key={i}>{w}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Date Simulation */}
            <div className="space-y-2">
              <label className="micro-label flex items-center gap-2">
                <Calendar className="w-3 h-3" /> SIMULATED_DATE
              </label>
              <select 
                className="w-full bg-paper-dark border border-on-surface/20 p-2 text-xs font-mono"
                value={overrides.date || ''}
                onChange={(e) => updateOverride('date', e.target.value || null)}
              >
                <option value="">System Default (Live)</option>
                <option value="2026-05-10T00:00:00Z">Pre-Season (May 10)</option>
                <option value="2026-05-20T00:00:00Z">Staging (May 20)</option>
                <option value="2026-05-26T00:00:00Z">Live Season (May 26)</option>
              </select>
            </div>

            {/* Progression */}
            <div className="space-y-4">
               <div className="space-y-2">
                 <label className="micro-label flex items-center gap-2">
                   <Zap className="w-3 h-3" /> SOLO_MISSIONS_COUNT
                 </label>
                 <input 
                   type="range" min="0" max="10" step="1"
                   className="w-full"
                   value={overrides.soloCount || 0}
                   onChange={(e) => updateOverride('soloCount', parseInt(e.target.value))}
                 />
                 <div className="flex justify-between text-[10px] font-mono opacity-40">
                   <span>0</span>
                   <span className="text-brand-orange font-bold text-xs">{overrides.soloCount || 0}/10</span>
                   <span>10</span>
                 </div>
               </div>

               <div className="space-y-2">
                 <label className="micro-label flex items-center gap-2">
                   <Shield className="w-3 h-3" /> POINTS_STANDINGS
                 </label>
                 <input 
                   type="number" 
                   className="w-full bg-paper-dark border border-on-surface/20 p-2 text-xs font-mono"
                   value={overrides.points || 0}
                   onChange={(e) => updateOverride('points', parseInt(e.target.value))}
                 />
               </div>
            </div>

            {/* Field Type */}
            <div className="space-y-2">
              <label className="micro-label flex items-center gap-2">
                <User className="w-3 h-3" /> ACTIVE_FIELD_TYPE
              </label>
              <div className="grid grid-cols-2 gap-2">
                {Object.keys(FIELD_TYPES).map(id => (
                  <button 
                    key={id}
                    onClick={() => updateOverride('fieldType', overrides.fieldType === id ? null : id)}
                    className={cn(
                      "text-[10px] p-2 border border-on-surface/10 uppercase font-mono text-left",
                      overrides.fieldType === id ? "bg-brand-orange text-white border-brand-orange" : "hover:bg-on-surface/5"
                    )}
                  >
                    {id.replace('-', '_')}
                  </button>
                ))}
              </div>
            </div>

            {/* Flags */}
            <div className="space-y-2 pt-2 border-t border-on-surface/10">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={overrides.isAdmin || false}
                  onChange={(e) => updateOverride('isAdmin', e.target.checked)}
                />
                <span className="micro-label">FORCE_ADMIN_PRIVILEGES</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={overrides.forceUnlocked}
                  onChange={(e) => updateOverride('forceUnlocked', e.target.checked)}
                />
                <span className="micro-label">BYPASS_LOCAL_LOCKS</span>
              </label>
            </div>

            <div className="space-y-4">
              <button 
                onClick={() => setOverrides({ date: null, points: null, soloCount: null, fieldType: null, isAdmin: null, forceUnlocked: false })}
                className="w-full py-2 bg-error/10 text-error text-[10px] font-mono uppercase tracking-widest hover:bg-error hover:text-white transition-colors"
              >
                RESET_ALL_OVERRIDES
              </button>
              
              <button 
                onClick={() => window.location.href = '/admin/qa'}
                className="w-full py-2 bg-brand-orange text-white text-[10px] font-mono uppercase tracking-widest hover:bg-on-surface transition-colors"
              >
                LAUNCH_QA_AUDIT_LENSES
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
