import React, { useState } from 'react';
import { 
  ShieldAlert, 
  MoreVertical, 
  Flag, 
  UserMinus, 
  EyeOff,
  AlertTriangle,
  FileCheck
} from 'lucide-react';
import { ReportModal } from './ReportModal';
import { blockUser } from '../services/moderationService';
import { useApp } from '../context/AppContext';
import { ReportTargetType } from '../types/game';
import { cn } from '../lib/utils';
import { FieldCheckModal } from './FieldCheckModal';

interface ContentMenuProps {
  targetId: string;
  targetType: ReportTargetType;
  authorId?: string;
  authorName?: string;
  className?: string;
}

export function ContentMenu({ targetId, targetType, authorId, authorName, className }: ContentMenuProps) {
  const { user, isFieldCheckUnlocked, canFieldCheckNow } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showFieldCheck, setShowFieldCheck] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);

  const handleBlock = async () => {
    if (!user || !authorId || !window.confirm(`Block ${authorName}? You will no longer see their activity.`)) return;
    setIsBlocking(true);
    await blockUser(user.uid, authorId);
    setIsBlocking(false);
    setIsOpen(false);
  };

  if (!user || user.uid === authorId) return null;

  return (
    <div className={cn("relative", className)}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 hover:bg-black/5 rounded-full opacity-40 hover:opacity-100 transition-all"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute top-8 right-0 z-50 bg-paper border-2 border-on-surface shadow-[4px_4px_0px_#000] w-48 text-[10px] uppercase font-bold tracking-widest divide-y divide-on-surface/10">
            {isFieldCheckUnlocked && targetType === 'entry' && (
               <button 
                onClick={() => {
                  setShowFieldCheck(true);
                  setIsOpen(false);
                }}
                disabled={!canFieldCheckNow}
                className={cn(
                  "w-full p-4 flex items-center gap-3 hover:bg-brand-orange/5 text-brand-orange text-left",
                  !canFieldCheckNow && "opacity-20 grayscale"
                )}
              >
                <FileCheck className="w-3.5 h-3.5" />
                Initiate Field Check
              </button>
            )}

            <button 
              onClick={() => {
                setShowReport(true);
                setIsOpen(false);
              }}
              className="w-full p-4 flex items-center gap-3 hover:bg-error/5 text-error text-left"
            >
              <Flag className="w-3.5 h-3.5" />
              Report Content
            </button>
            
            {authorId && (
              <>
                <button 
                  onClick={handleBlock}
                  disabled={isBlocking}
                  className="w-full p-4 flex items-center gap-3 hover:bg-on-surface/5 text-left"
                >
                  <UserMinus className="w-3.5 h-3.5" />
                  {isBlocking ? 'Blocking...' : `Block ${authorName}`}
                </button>
              </>
            )}
          </div>
        </>
      )}

      <ReportModal 
        isOpen={showReport}
        onClose={() => setShowReport(false)}
        targetId={targetId}
        targetType={targetType}
        targetName={authorName}
      />

      {isFieldCheckUnlocked && (
        <FieldCheckModal 
          isOpen={showFieldCheck}
          onClose={() => setShowFieldCheck(false)}
          targetId={targetId}
          targetName={authorName}
        />
      )}
    </div>
  );
}
