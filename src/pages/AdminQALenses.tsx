import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { PRODUCT_PERSONAS, ProductPersonaLensId } from '../constants';
import { Card, FieldBadge } from '../components/UI';
import { 
  ShieldCheck, 
  Eye, 
  MessageSquare, 
  CheckCircle2, 
  AlertCircle,
  ArrowLeft,
  Search,
  Zap,
  Users,
  Heart,
  Dices
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

interface ChecklistItem {
  id: string;
  text: string;
  status: 'pending' | 'pass' | 'fail' | 'na';
  comment?: string;
}

interface PersonaAudit {
  personaId: ProductPersonaLensId;
  checks: ChecklistItem[];
}

const INITIAL_AUDITS: Record<ProductPersonaLensId, ChecklistItem[]> = {
  'frankie': [
    { id: 'f1', text: 'Is the next step obvious?', status: 'pending' },
    { id: 'f2', text: 'Is there one main action?', status: 'pending' },
    { id: 'f3', text: 'Are rules short and clear?', status: 'pending' },
    { id: 'f4', text: 'Are rejection reasons clear?', status: 'pending' },
  ],
  'danielle': [
    { id: 'd1', text: 'Is the copy polished?', status: 'pending' },
    { id: 'd2', text: 'Would this feel worth inviting friends into?', status: 'pending' },
    { id: 'd3', text: 'Are private small-group options clear?', status: 'pending' },
    { id: 'd4', text: 'Are notifications controlled?', status: 'pending' },
  ],
  'mahsa': [
    { id: 'm1', text: 'Can someone come back later without shame?', status: 'pending' },
    { id: 'm2', text: 'Are lower-energy options available?', status: 'pending' },
    { id: 'm3', text: 'Is anyone excluded by the design?', status: 'pending' },
    { id: 'm4', text: 'Are roles and recognition fair?', status: 'pending' },
  ],
  'zach': [
    { id: 'z1', text: 'Is there a loophole?', status: 'pending' },
    { id: 'z2', text: 'Is the scoring transparent?', status: 'pending' },
    { id: 'z3', text: 'Is there a reason to keep playing?', status: 'pending' },
    { id: 'z4', text: 'Are repeated/boring submissions limited?', status: 'pending' },
  ]
};

export default function AdminQALensesPage() {
  const { isAdmin, isLoading: themeLoading } = useTheme();
  const { productPersonaLens, setProductPersonaLens } = useApp();
  const navigate = useNavigate();
  const [activeAudits, setActiveAudits] = useState(INITIAL_AUDITS);
  const [selectedFlow, setSelectedFlow] = useState('Onboarding');

  if (themeLoading) return null;
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center p-8 space-y-6">
        <ShieldCheck className="w-16 h-16 text-error opacity-20" />
        <h1 className="text-huge text-4xl uppercase">Access Restricted</h1>
        <p className="font-serif italic text-on-surface-variant max-w-sm text-center">
          Internal QA Audit access requires Level 5 clearance. This attempt has been logged.
        </p>
        <button onClick={() => navigate('/')} className="underline font-mono text-xs">Return to Base</button>
      </div>
    );
  }

  const toggleCheck = (personaId: ProductPersonaLensId, checkId: string) => {
    setActiveAudits(prev => ({
      ...prev,
      [personaId]: prev[personaId].map(c => {
        if (c.id === checkId) {
          const statuses: ('pending' | 'pass' | 'fail' | 'na')[] = ['pending', 'pass', 'fail', 'na'];
          const currentIndex = statuses.indexOf(c.status);
          const nextStatus = statuses[(currentIndex + 1) % statuses.length];
          return { ...c, status: nextStatus };
        }
        return c;
      })
    }));
  };

  const personaIcons: Record<ProductPersonaLensId, any> = {
    'frankie': Search,
    'danielle': Users,
    'mahsa': Heart,
    'zach': Dices
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-on-surface/5 text-on-surface/40',
    pass: 'bg-success/10 text-success border-success/20',
    fail: 'bg-error/10 text-error border-error/20',
    na: 'bg-on-surface/10 text-on-surface/30'
  };

  return (
    <div className="min-h-screen bg-paper p-6 md:p-12 font-sans overflow-x-hidden">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header */}
        <div className="space-y-6">
          <div className="flex items-center gap-4">
             <button 
               onClick={() => navigate('/admin')}
               className="p-2 border-2 border-on-surface hover:bg-on-surface hover:text-paper transition-colors"
             >
               <ArrowLeft className="w-4 h-4" />
             </button>
            <FieldBadge variant="tab" color="orange" size="sm">INTERNAL_QA_SYSTEM_V1</FieldBadge>
            <p className="micro-label">PROTOCOL: [AUDIT_LENS_ALPHA]</p>
          </div>
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-huge text-6xl text-on-surface leading-none uppercase tracking-tighter">Product Audit</h1>
              <p className="bureau-subhead max-w-xl">
                Evaluating Field Trip through specialized product lenses. Use these checklists to ensure the integrity of the player experience across all major flows.
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="micro-label">FLOW_UNDER_REVIEW</label>
              <select 
                value={selectedFlow}
                onChange={(e) => setSelectedFlow(e.target.value)}
                className="w-full bg-paper border-2 border-on-surface p-2 font-mono text-xs"
              >
                <option value="Onboarding">ONBOARDING_FLOW</option>
                <option value="Field Classification">FIELD_CLASSIFICATION</option>
                <option value="Trip Deck">TRIP_DECK</option>
                <option value="Capture & Proof">CAPTURE_AND_PROOF</option>
                <option value="Voting Hub">VOTING_HUB</option>
                <option value="Leaderboard">LEADERBOARD_SOCIAL</option>
              </select>
            </div>
          </div>
        </div>

        {/* Persona Selectors */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(Object.keys(PRODUCT_PERSONAS) as ProductPersonaLensId[]).map(id => {
            const Icon = personaIcons[id];
            const persona = PRODUCT_PERSONAS[id];
            const isActive = productPersonaLens === id;
            
            return (
              <button
                key={id}
                onClick={() => setProductPersonaLens(id)}
                className={cn(
                  "p-4 text-left border-2 transition-all flex flex-col gap-2",
                  isActive ? "bg-on-surface text-paper border-on-surface shadow-[4px_4px_0px_gray]" : "bg-paper border-on-surface/10 hover:border-on-surface"
                )}
              >
                <div className="flex justify-between items-start">
                  <Icon className={cn("w-6 h-6", isActive ? "text-paper" : "text-brand-orange")} />
                  {isActive && <FieldBadge variant="sticker" color="orange" size="xs">ACTIVE_LENS</FieldBadge>}
                </div>
                <div className="mt-2">
                  <h3 className="font-display text-xl leading-none uppercase">{persona.name}</h3>
                  <p className="text-[10px] font-mono opacity-60 mt-1 line-clamp-2">{persona.description}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Audit Grids */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {(Object.keys(PRODUCT_PERSONAS) as ProductPersonaLensId[]).map(id => {
            const persona = PRODUCT_PERSONAS[id];
            const audits = activeAudits[id];
            const Icon = personaIcons[id];
            const isActive = productPersonaLens === id;

            return (
              <div 
                key={id}
                className={cn(
                  "border-2 p-6 flex flex-col gap-6 transition-all",
                  isActive ? "border-on-surface bg-paper shadow-[8px_8px_0px_black]" : "border-on-surface/10 opacity-60 grayscale"
                )}
              >
                <div className="flex items-center gap-4 border-b border-on-surface/10 pb-4">
                  <div className="p-3 bg-on-surface text-paper">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display text-2xl uppercase leading-none">{persona.name} Audit</h3>
                    <p className="text-[10px] font-mono opacity-50 uppercase mt-1">CORE_TEST: {id === 'frankie' ? 'Do I know what to do?' : id === 'danielle' ? 'Is this worth inviting people into?' : id === 'mahsa' ? 'Can I come back later fairly?' : 'Can I make this interesting?'}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {audits.map(check => (
                    <div 
                      key={check.id}
                      onClick={() => toggleCheck(id, check.id)}
                      className={cn(
                        "flex items-center justify-between p-3 border cursor-pointer transition-all hover:translate-x-1",
                        statusColors[check.status]
                      )}
                    >
                      <span className="text-xs font-mono font-bold uppercase tracking-tight">{check.text}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase">{check.status}</span>
                        {check.status === 'pass' && <CheckCircle2 className="w-4 h-4" />}
                        {check.status === 'fail' && <AlertCircle className="w-4 h-4" />}
                        {check.status === 'pending' && <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full opacity-20" />}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-auto pt-4 flex flex-col gap-2">
                   <span className="micro-label opacity-40">OBSERVATIONS</span>
                   <textarea 
                     placeholder="Log anomalies or lens-specific friction points..."
                     className="w-full bg-on-surface/5 border-2 border-on-surface/10 p-3 text-xs font-mono min-h-[80px] focus:border-brand-orange outline-none"
                   />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="p-8 border-t-4 border-on-surface/5 flex flex-col md:flex-row justify-between items-center gap-8 bg-on-surface/5">
           <div className="max-w-md">
             <h4 className="font-display text-2xl uppercase leading-none mb-2 text-on-surface/40">Audit Disclaimer</h4>
             <p className="text-xs font-mono opacity-40 uppercase leading-relaxed">
               This system is for internal QA and design integrity only. External sharing or disclosure of product persona framework is strictly prohibited. Use these lenses to protect the core tension of the Field Trip experience.
             </p>
           </div>
           <button className="bureau-btn bg-brand-orange text-white px-8 py-4">EXPORT_AUDIT_LOG</button>
        </div>
      </div>
    </div>
  );
}
