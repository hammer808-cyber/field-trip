import React from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { 
  Trophy, 
  ShieldAlert, 
  Newspaper, 
  Lock,
  Clock,
  ChevronRight,
  Eye,
  AlertCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Card, Sticker } from '../components/UI';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

type VotingStatus = 'locked' | 'active' | 'coming soon' | 'results ready';

interface SectionProps {
  id: string;
  title: string;
  description: string;
  status: VotingStatus;
  icon: React.ElementType;
  children?: React.ReactNode;
  isEmpty?: boolean;
}

const VotingHubSection: React.FC<SectionProps> = ({ 
  title, 
  description, 
  status, 
  icon: Icon, 
  children,
  isEmpty = false
}) => {
  const getStatusColor = (s: VotingStatus) => {
    switch (s) {
      case 'active': return 'text-on-surface bg-brand-lime border-on-surface';
      case 'results ready': return 'text-white bg-on-surface border-on-surface';
      case 'locked': return 'text-on-surface/40 bg-on-surface/5 border-on-surface/10';
      default: return 'text-on-surface bg-brand-orange/10 border-on-surface/20';
    }
  };

  return (
    <Card className="overflow-hidden border-8 border-on-surface bg-white shadow-[16px_16px_0px_black] hover:shadow-[24px_24px_0px_var(--color-brand-cyan)] transition-all group relative">
      {/* Decorative Shimmer Edge */}
      <div className="absolute top-0 left-0 w-2 h-full bg-brand-lime opacity-30" />
      
      <div className="p-10 space-y-8 relative z-10">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
          <div className="flex items-start gap-6">
            <div className="p-5 bg-on-surface text-brand-lime border-4 border-on-surface shadow-[8px_8px_0px_var(--color-brand-orange)] group-hover:rotate-6 transition-transform">
              <Icon className="w-10 h-10 stroke-[2.5]" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="bg-brand-orange text-white px-2 py-1 border-2 border-on-surface font-bold text-[10px] uppercase tracking-wider italic shadow-[3px_3px_0px_black]">PROTOCOL_SECURE</span>
                <div className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 text-[11px] font-bold uppercase tracking-widest border-2 shadow-[4px_4px_0px_black] italic",
                  getStatusColor(status)
                )}>
                  {status === 'active' && <span className="w-2 h-2 rounded-full bg-on-surface animate-pulse" />}
                  {status.replace(' ', '_')}
                </div>
              </div>
              <h2 className="font-display text-5xl uppercase tracking-tight leading-tight italic font-bold text-on-surface">{title}</h2>
            </div>
          </div>
          <div className="bg-on-surface/5 p-6 border-l-8 border-brand-lime max-w-sm group-hover:bg-brand-lime/10 transition-colors">
            <p className="font-display text-lg italic leading-relaxed uppercase font-bold tracking-normal opacity-75">
              "{description}"
            </p>
          </div>
        </div>

        <div className="pt-8 border-t-4 border-dashed border-on-surface/10">
          {isEmpty ? (
            <div className="py-12 text-center space-y-4 bg-paper-dark border-2 border-on-surface shadow-inner">
              {status === 'locked' ? (
                <Lock className="w-12 h-12 mx-auto text-on-surface opacity-10" />
              ) : status === 'coming soon' ? (
                <Clock className="w-12 h-12 mx-auto text-on-surface opacity-10" />
              ) : (
                <Eye className="w-12 h-12 mx-auto text-on-surface opacity-10" />
              )}
              <div className="space-y-1">
                <p className="font-display text-sm uppercase">Data_Silos_Empty</p>
                <p className="text-[10px] uppercase font-mono opacity-40">No records found for active cycle.</p>
              </div>
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    </Card>
  );
};

export default function VotingHubPage() {
  const { currentWeekNumber, isVotingWindowOpen, isWeekLocked } = useApp();
  const { skin } = useTheme();

  const isVotingOpen = isVotingWindowOpen(currentWeekNumber);
  const isLocked = isWeekLocked(currentWeekNumber);

  const zineStatus: VotingStatus = isLocked ? 'results ready' : isVotingOpen ? 'active' : 'locked';
  const snitchStatus: VotingStatus = 'coming soon'; // Coming soon as per request
  const awardsStatus: VotingStatus = isLocked ? 'results ready' : 'coming soon';

  return (
    <div className="min-h-screen bg-white pb-40 px-6 pt-16 space-y-20 max-w-7xl mx-auto relative overflow-hidden">
      {/* Background decoration */}
      <div className="fixed top-0 right-0 p-12 opacity-[0.02] pointer-events-none select-none overflow-hidden h-full z-0">
        <h1 className="text-[25vw] font-display uppercase tracking-tight leading-none italic rotate-90 origin-top-right font-bold text-on-surface">
          THE_TRIBUNAL
        </h1>
      </div>

      <header className="space-y-10 relative z-10">
        <div className="flex items-center gap-10 relative z-10">
          <Link to="/deck" className="p-4 bg-white border-4 border-on-surface shadow-[6px_6px_0px_black] hover:bg-brand-lime transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none -rotate-3 hover:rotate-0">
            <ChevronRight className="w-8 h-8 rotate-180 stroke-[4]" />
          </Link>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-brand-orange animate-pulse shadow-[0_0_8px_var(--color-brand-orange)]" />
              <p className="font-display text-xs font-bold uppercase tracking-widest text-brand-orange italic">DEMOCRATIC_VOTE_ACTIVE</p>
            </div>
            <p className="font-display text-[11px] font-bold opacity-40 uppercase tracking-widest italic">Voting Cycle // 00{currentWeekNumber}</p>
          </div>
        </div>
        
        <div className="space-y-6">
          <h1 className="text-[6rem] md:text-[8rem] font-display uppercase tracking-tight leading-tight font-bold text-on-surface italic drop-shadow-[8px_8px_0_var(--color-brand-lime)]">
            Voting_Hub
          </h1>
          <div className="bg-on-surface text-brand-lime p-8 border-4 border-on-surface shadow-[12px_12px_0px_var(--color-brand-orange)] max-w-3xl rotate-1">
             <p className="font-display text-3xl italic uppercase font-bold leading-tight tracking-normal">
              "Consensus_is_truth."
            </p>
            <p className="font-display text-lg italic opacity-75 uppercase font-bold tracking-widest mt-6 leading-relaxed">
              Democratic consensus is the ultimate filter for objective truth. Document the vibe with prejudice.
            </p>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-16 relative z-10">
        {/* 1. Zine Ballot */}
        <VotingHubSection
          id="zine-ballot"
          title="Zine_Ballot"
          description="Cast your voice for the weekly field journal. HQ honors the most evocative evidence."
          status={zineStatus}
          icon={Newspaper}
          isEmpty={!isVotingOpen && !isLocked}
        >
          {isVotingOpen && (
            <div className="flex flex-col md:flex-row items-center justify-between gap-10 p-12 bg-brand-orange text-white border-8 border-on-surface shadow-[20px_20px_0px_black] relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-48 h-full bg-white/20 -skew-x-12 translate-x-12 group-hover:translate-x-0 transition-transform duration-1000" />
              <div className="space-y-4 relative z-10 text-left">
                <div className="inline-block bg-white text-on-surface p-2 px-6 border-2 border-on-surface font-bold text-[11px] tracking-widest uppercase italic shadow-[4px_4px_0px_black]">ELECTION_WINDOW_OPEN</div>
                <p className="font-display text-6xl uppercase tracking-tight leading-tight italic font-bold">Council_Chamber</p>
                <p className="font-display text-xl italic text-white/95 max-w-lg uppercase tracking-normal font-bold leading-relaxed">Review transmissions from fellow players and designate your picks for the Cycle {currentWeekNumber} digest.</p>
              </div>
              <Link 
                to="/voting/ballot" 
                className="relative z-10 whitespace-nowrap px-12 py-8 bg-white text-on-surface font-display uppercase tracking-widest text-lg shadow-[8px_8px_0px_black] hover:shadow-[12px_12px_0px_black] hover:-translate-y-1 transition-all active:translate-y-0 active:shadow-none font-bold italic border-4 border-on-surface"
              >
                ENTER BALLOT_AREA
              </Link>
            </div>
          )}
          {isLocked && (
            <div className="flex flex-col md:flex-row items-center justify-between gap-10 p-12 bg-on-surface text-brand-lime border-8 border-on-surface shadow-[20px_20px_0px_black] relative overflow-hidden group">
               <div className="absolute inset-0 bg-brand-lime/10 animate-pulse" />
              <div className="space-y-4 relative z-10 text-left">
                <div className="inline-block bg-brand-orange text-white p-2 px-6 border-2 border-on-surface font-bold text-[11px] tracking-widest uppercase italic shadow-[4px_4px_0px_black]">CONSENSUS_REACHED</div>
                <p className="font-display text-6xl uppercase tracking-tight leading-tight italic font-bold">Weekly_Digest_Compiled</p>
                <p className="font-display text-xl italic text-white/75 max-w-lg uppercase tracking-normal font-bold leading-relaxed">The consensus has been reached. View the honored players for this cycle.</p>
              </div>
              <Link 
                to="/voting/ballot" 
                className="relative z-10 whitespace-nowrap px-12 py-8 bg-brand-lime text-on-surface font-display uppercase tracking-widest text-lg shadow-[8px_8px_0px_var(--color-brand-magenta)] hover:-translate-y-1 transition-all active:translate-y-0 active:shadow-none font-bold italic border-4 border-on-surface"
              >
                VIEW HUB_RESULTS
              </Link>
            </div>
          )}
        </VotingHubSection>

        {/* 2. Snitch Council */}
        <VotingHubSection
          id="snitch-council"
          title="Snitch_Council"
          description="Arbitrate disputes flagged by field ops. Consensus determines the finality of evidence."
          status={snitchStatus}
          icon={ShieldAlert}
          isEmpty={false}
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-10 p-12 bg-white border-8 border-on-surface shadow-[20px_20px_0px_black] group hover:bg-on-surface/5 transition-colors">
            <div className="space-y-4 text-left">
              <div className="inline-block bg-on-surface/5 text-on-surface p-2 px-6 border-2 border-on-surface/10 font-bold text-[11px] tracking-widest uppercase italic">FIELD_ARBITRATION</div>
              <p className="font-display text-5xl uppercase tracking-tight leading-tight italic font-bold">Tribunal_Chamber</p>
              <p className="font-display text-xl italic text-on-surface/75 max-w-lg uppercase tracking-normal font-bold leading-relaxed">Monitor active disputes and prepare for upcoming arbitration cycles.</p>
            </div>
            <Link 
              to="/voting/council" 
              className="whitespace-nowrap px-12 py-8 bg-on-surface text-white font-display uppercase tracking-widest text-lg shadow-[8px_8px_0px_var(--color-brand-cyan)] hover:-translate-y-1 transition-all active:translate-y-0 active:shadow-none font-bold italic border-4 border-on-surface"
            >
              ACCESS CHAMBER
            </Link>
          </div>
        </VotingHubSection>

        {/* 3. Weekly Awards */}
        <VotingHubSection
          id="weekly-awards"
          title="Weekly_Awards"
          description="Ceremonial recognition for exceptional field performance across various categories."
          status={awardsStatus}
          icon={Trophy}
          isEmpty={false}
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-10 p-12 bg-white border-8 border-on-surface shadow-[20px_20px_0px_black] group hover:bg-brand-orange/5 transition-colors">
            <div className="space-y-4 text-left">
              <div className="inline-block bg-brand-orange text-white p-2 px-6 border-2 border-on-surface font-bold text-[11px] tracking-widest uppercase italic shadow-[4px_4px_0px_black]">RECORD_OF_EXCELLENCE</div>
              <p className="font-display text-5xl uppercase tracking-tight leading-tight italic font-bold">Honors_&_Accolades</p>
              <p className="font-display text-xl italic text-on-surface/75 max-w-lg uppercase tracking-normal font-bold leading-relaxed">Review the hall of records and current cycle laureate projections.</p>
            </div>
            <Link 
              to="/voting/awards" 
              className="whitespace-nowrap px-12 py-8 bg-brand-orange text-white font-display uppercase tracking-widest text-lg shadow-[8px_8px_0px_black] hover:-translate-y-1 transition-all active:translate-y-0 active:shadow-none font-bold italic border-4 border-on-surface"
            >
              VIEW LAUREATES
            </Link>
          </div>
        </VotingHubSection>
      </div>
    </div>

  );
}
