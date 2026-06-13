import React from 'react';
import { Card } from './UI';
import { Lock, Clock, Calendar, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface LockedViewfinderProps {
  reason: 'season_inactive' | 'onboarding_required' | 'app_offline';
  nextSteps: string;
  seasonDate?: string;
  onboardingRemaining?: number;
}

export function LockedViewfinder({ reason, nextSteps, seasonDate, onboardingRemaining }: LockedViewfinderProps) {
  return (
    <Card className="p-8 text-center space-y-6 bg-on-surface/5 border-dashed">
      <div className="mx-auto w-16 h-16 bg-paper flex items-center justify-center border-2 border-on-surface/20 rotate-3">
        <Lock className="w-8 h-8 opacity-40" />
      </div>
      
      <div className="space-y-2">
        <h3 className="font-display text-4xl uppercase tracking-tighter">Viewfinder Locked</h3>
        <p className="text-sm opacity-60 max-w-xs mx-auto">
          {reason === 'season_inactive' && "The lens is shuttered until the next seasonal mapping event."}
          {reason === 'onboarding_required' && `Incomplete clearance. You must finalize ${onboardingRemaining} more solo reports.`}
          {reason === 'app_offline' && "Bureau servers are currently undergoing maintenance."}
        </p>
      </div>

      <div className="p-4 bg-paper rounded-xl border border-on-surface/10 space-y-4">
        <p className="micro-label text-brand-orange">Protocol: Next Steps</p>
        <p className="text-xs font-mono">{nextSteps}</p>
        
        {reason === 'onboarding_required' && (
          <Link to="/deck" className="flex items-center justify-center gap-2 text-brand-orange font-bold uppercase text-[10px] hover:underline">
            Go to Mission Deck <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </div>

      {seasonDate && (
        <div className="flex items-center justify-center gap-2">
          <Calendar className="w-4 h-4 opacity-20" />
          <span className="font-mono text-[10px] opacity-40">RESUME_SIGNAL: {seasonDate}</span>
        </div>
      )}
    </Card>
  );
}
