import React from 'react';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';

/**
 * StatusLight Component
 * Indicators: green, yellow, red, blue, neutral
 */
export const StatusLight = ({ 
  state = 'neutral', 
  pulse = false, 
  className 
}: { 
  state?: 'green' | 'yellow' | 'red' | 'blue' | 'neutral' | 'success' | 'warning', 
  pulse?: boolean,
  className?: string
}) => {
  const colors = {
    green: 'bg-brand-lime shadow-[0_0_8px_#B7FF00]',
    success: 'bg-brand-lime shadow-[0_0_8px_#B7FF00]',
    yellow: 'bg-brand-orange shadow-[0_0_8px_#FF5A00]',
    warning: 'bg-brand-orange shadow-[0_0_8px_#FF5A00]',
    red: 'bg-error shadow-[0_0_8px_#FF3131]',
    blue: 'bg-brand-cyan shadow-[0_0_8px_#2EE7F0]',
    neutral: 'bg-on-surface/20'
  };

  return (
    <div className={cn(
      "w-2 h-2 rounded-full",
      colors[state],
      pulse && "animate-pulse",
      className
    )} />
  );
};

/**
 * ModuleCard Component
 * Branded dashboard module
 */
export const ModuleCard = ({ 
  title, 
  description, 
  icon: Icon, 
  status = 'neutral', 
  statusLabel,
  children,
  primaryAction,
  secondaryAction,
  lastActivity,
  className
}: {
  title: string;
  description: string;
  icon: any;
  status?: 'green' | 'yellow' | 'red' | 'blue' | 'neutral';
  statusLabel?: string;
  children?: React.ReactNode;
  primaryAction?: { label: string; onClick: () => void; disabled?: boolean; loading?: boolean; icon?: any; variant?: string };
  secondaryAction?: { label: string; onClick: () => void; disabled?: boolean };
  lastActivity?: string;
  className?: string;
}) => {
  return (
    <div 
      className={cn(
        "group relative bg-white border-4 border-on-surface p-6 sm:p-8 flex flex-col shadow-[8px_8px_0px_black] hover:shadow-[4px_4px_0px_black] hover:translate-x-1 hover:translate-y-1 transition-all",
        className
      )}
    >
      {/* Module ID Tag Style Header */}
      <div className="absolute -top-4 left-6 flex items-center gap-2">
        <div className="bg-on-surface text-white px-3 py-1 font-mono text-[9px] font-black uppercase tracking-widest shadow-[4px_4px_0px_rgba(0,0,0,0.1)]">
          {title.replace(/\s+/g, '_').toUpperCase()}
        </div>
        {statusLabel && (
          <div className="bg-white border-2 border-on-surface px-2 py-0.5 flex items-center gap-1.5 shadow-[4px_4px_0px_rgba(0,0,0,0.1)]">
            <StatusLight state={status} pulse={status === 'yellow' || status === 'red'} />
            <span className="font-mono text-[8px] font-black uppercase tracking-tight text-on-surface/60">{statusLabel}</span>
          </div>
        )}
      </div>

      <div className="flex-1 space-y-6 pt-2">
        <div className="flex gap-4 items-start">
          <div className="w-14 h-14 bg-on-surface/5 border-2 border-on-surface flex items-center justify-center shrink-0 group-hover:bg-brand-orange group-hover:text-white transition-all">
            {Icon && <Icon className="w-7 h-7" />}
          </div>
          <div className="space-y-1">
            <h3 className="font-display text-2xl font-black uppercase italic tracking-tighter leading-none">{title}</h3>
            <p className="text-[11px] font-mono leading-tight opacity-50 uppercase tracking-tight max-w-[200px]">
              {description}
            </p>
          </div>
        </div>

        {/* Content Slot */}
        {children && (
          <div className="pt-2">
            {children}
          </div>
        )}

        {/* Actions Area */}
        <div className="space-y-3 mt-auto">
          {primaryAction && (
            <button
              onClick={primaryAction.onClick}
              disabled={primaryAction.disabled || primaryAction.loading}
              className="w-full py-4 bg-brand-orange text-white border-2 border-on-surface font-display font-black uppercase italic tracking-wider shadow-[4px_4px_0px_black] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 active:scale-[0.98] hover:bg-on-surface hover:text-brand-lime transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
            >
              {primaryAction.loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full" />
              ) : primaryAction.icon ? (
                <primaryAction.icon className="w-4 h-4" />
              ) : null}
              <span>{primaryAction.label}</span>
            </button>
          )}
          
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              disabled={secondaryAction.disabled}
              className="w-full py-3 bg-white border-2 border-on-surface text-on-surface font-mono font-black uppercase text-[10px] tracking-widest hover:bg-on-surface/5 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {secondaryAction.label}
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Internal Telemetry / Activity Style Footer */}
      {lastActivity && (
        <div className="mt-6 pt-4 border-t-2 border-dashed border-on-surface/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-on-surface/20" />
             <span className="font-mono text-[7px] font-black uppercase tracking-[0.2em] text-on-surface/30">SYNC_STATUS</span>
          </div>
          <span className="font-mono text-[7px] font-black uppercase text-on-surface/40">LAST: {lastActivity}</span>
        </div>
      )}
    </div>
  );
};

/**
 * AdminLayout Component
 */
export const AdminLayout = ({ 
  children, 
  title = "Bureau_Control_Center",
  description,
  breadcrumbs = []
}: { 
  children: React.ReactNode;
  title?: string;
  description?: string;
  breadcrumbs?: { label: string; path?: string }[];
}) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F0EFED] p-6 sm:p-10 pb-32">
      {/* Layout Header */}
      <header className="mb-12 max-w-7xl mx-auto space-y-8">
        {/* Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-4">
             {/* Navigation / Breadcrumbs */}
             <div className="flex items-center gap-3 overflow-x-auto whitespace-nowrap pb-2 sm:pb-0 hide-scrollbar">
                <button 
                  onClick={() => navigate('/admin')}
                  className="p-2 border-2 border-on-surface bg-white shadow-[2px_2px_0px_black] hover:bg-brand-orange hover:text-white transition-all group"
                  title="Return to Center"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                
                <div className="flex items-center gap-2">
                   <span className="font-mono text-[9px] font-black uppercase opacity-20 tracking-widest">BUREAU</span>
                   <ChevronRight className="w-3 h-3 opacity-20" />
                   <span className="font-mono text-[9px] font-black uppercase tracking-widest text-on-surface">CONTROL_CENTER</span>
                   {breadcrumbs.map((crumb, idx) => (
                     <React.Fragment key={idx}>
                       <ChevronRight className="w-3 h-3 opacity-20" />
                       <span className={cn(
                         "font-mono text-[9px] font-black uppercase tracking-widest",
                         idx === breadcrumbs.length - 1 ? "text-brand-orange" : "text-on-surface/50"
                       )}>
                         {crumb.label.toUpperCase()}
                       </span>
                     </React.Fragment>
                   ))}
                </div>
             </div>

             <div className="flex flex-col sm:flex-row sm:items-baseline gap-4">
                <h1 className="text-4xl sm:text-6xl font-display font-black uppercase italic tracking-tighter text-on-surface leading-none">
                  {title}
                </h1>
                <div className="flex items-center gap-2 mb-1">
                   <StatusLight state="green" pulse className="w-3 h-3" />
                   <span className="font-mono text-[10px] font-black uppercase tracking-widest text-brand-lime">SYSTEM_LIVE</span>
                </div>
             </div>
             {description && (
               <p className="font-mono text-[10px] uppercase font-black tracking-widest opacity-40 max-w-2xl leading-relaxed">
                 {description}
               </p>
             )}
          </div>

          <div className="flex items-center gap-3">
             <button
               onClick={() => navigate('/basecamp')}
               className="px-6 py-3 bg-white border-2 border-on-surface font-display font-black uppercase italic text-xs tracking-wider shadow-[6px_6px_0px_black] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all hover:bg-on-surface hover:text-white"
             >
               Exit Console
             </button>
          </div>
        </div>

        {/* Global Warning Banner - Conditional? */}
        <div className="bg-[#FFDD00] border-4 border-on-surface p-4 flex items-center justify-between gap-4 shadow-[8px_8px_0px_black]">
           <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-on-surface flex items-center justify-center shrink-0">
                 <span className="text-white font-black text-2xl">!</span>
              </div>
              <div className="space-y-0.5">
                 <p className="font-display font-black uppercase italic tracking-tight text-lg leading-none">Live System Access Initiated</p>
                 <p className="font-mono text-[9px] font-black uppercase tracking-widest opacity-60">Caution: Direct database writes authorized for current session.</p>
              </div>
           </div>
           
           <div className="hidden sm:flex gap-4">
              <div className="flex flex-col items-end">
                 <span className="font-mono text-[8px] font-black opacity-30 uppercase">LATENCY</span>
                 <span className="font-mono text-[9px] font-black uppercase">42ms_STABLE</span>
              </div>
              <div className="flex flex-col items-end">
                 <span className="font-mono text-[8px] font-black opacity-30 uppercase">DEX_LOAD</span>
                 <span className="font-mono text-[9px] font-black uppercase tracking-tighter">88%_CAPACITY</span>
              </div>
           </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto">
        {children}
      </main>
    </div>
  );
};

/**
 * AdminReceipt Component
 */
export const AdminReceipt = ({ 
  title, 
  data, 
  onClose,
  success = true
}: { 
  title: string; 
  data: Record<string, any>; 
  onClose: () => void;
  success?: boolean;
}) => {
  const now = new Date();
  
  return (
    <div
      className="bg-white border-4 border-on-surface shadow-[16px_16px_0px_black] max-w-md w-full overflow-hidden"
    >
      <div className={cn(
        "p-6 text-white border-b-4 border-on-surface flex items-center justify-between",
        success ? "bg-brand-lime text-on-surface" : "bg-error text-white"
      )}>
        <div className="space-y-1">
          <h4 className="font-display text-2xl font-black uppercase italic tracking-tight leading-none">{success ? 'ACTION COMPLETE' : 'SYSTEM FAILURE'}</h4>
          <p className="font-mono text-[9px] font-black uppercase tracking-widest opacity-60">{title}</p>
        </div>
        <StatusLight state={success ? 'green' : 'red'} className="w-4 h-4" />
      </div>

      <div className="p-8 space-y-6">
        <div className="space-y-4">
           <div className="flex justify-between items-end border-b border-on-surface/10 pb-2">
              <span className="font-mono text-[8px] font-black opacity-40 uppercase">TIMESTAMP</span>
              <span className="font-mono text-[10px] font-bold uppercase">{now.toLocaleTimeString()} {now.toLocaleDateString()}</span>
           </div>
           
           <div className="space-y-2">
              {Object.entries(data).map(([key, val]) => (
                <div key={key} className="flex justify-between items-center py-1">
                   <span className="font-mono text-[10px] font-black opacity-40 uppercase tracking-widest">{key.replace(/([A-Z])/g, '_$1').toUpperCase()}</span>
                   <span className={cn(
                     "font-mono text-[11px] font-black uppercase",
                     typeof val === 'number' && val > 0 ? "text-brand-orange" : "text-on-surface"
                   )}>
                     {typeof val === 'boolean' ? (val ? 'TRUE' : 'FALSE') : val}
                   </span>
                </div>
              ))}
           </div>
        </div>

        <div className="pt-4 space-y-3">
           <p className="text-[9px] font-mono font-black uppercase text-on-surface/40 leading-relaxed text-center italic">
             All records verified and finalized in local buffer. Check system logs for full decryption trace.
           </p>
           
           <button
             onClick={onClose}
             className="w-full py-4 bg-on-surface text-white font-display font-black uppercase italic text-sm tracking-wider shadow-[4px_4px_0px_rgba(0,0,0,0.2)] active:shadow-none hover:bg-brand-orange transition-all"
           >
             Acknowledge & Close
           </button>
        </div>
      </div>

      <div className="bg-on-surface/5 p-3 text-center border-t border-on-surface/10">
         <span className="font-mono text-[7px] font-black uppercase tracking-[0.3em] opacity-30">RECEIPT_SERIAL_ALPHA_9</span>
      </div>
    </div>
  );
};
