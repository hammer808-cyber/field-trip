import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  Check, 
  X, 
  RefreshCw, 
  AlertCircle, 
  Info, 
  Camera, 
  CameraOff,
  Clock, 
  User, 
  FileText,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  AlertTriangle
} from 'lucide-react';
import { Entry } from '../constants';
import { useApp } from '../context/AppContext';
import { 
  subscribeToPendingSubmissions, 
  approveSubmission, 
  rejectSubmission, 
  requestMoreProof 
} from '../services/adminService';
import { ActionButton } from './UIUtilities';
import { cn } from '../lib/utils';
import { FieldBadge } from './UI';

export function AdminReviewPanel() {
  const [submissions, setSubmissions] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  
  const { user } = useApp();

  useEffect(() => {
    console.log('[AdminReviewPanel] Subscribing to pending submissions...');
    const unsubscribe = subscribeToPendingSubmissions((entries) => {
      setSubmissions(entries);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleApprove = async (entry: Entry) => {
    if (!user) return;
    setIsProcessing(true);
    try {
      // Pass the reviewNote entered by the admin for approval notes sync
      const success = await approveSubmission(entry, user.uid, reviewNote.trim() || undefined);
      if (success) {
        setSelectedEntry(null);
        setReviewNote('');
      } else {
        setError('Failed to approve submission.');
      }
    } catch (err: any) {
      setError(err.message || 'Error approving submission');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (entry: Entry) => {
    if (!user || !reviewNote.trim()) {
      alert('Please provide a reason for rejection.');
      return;
    }
    setIsProcessing(true);
    try {
      const success = await rejectSubmission(entry, user.uid, reviewNote);
      if (success) {
        setSelectedEntry(null);
        setReviewNote('');
      } else {
        setError('Failed to reject submission.');
      }
    } catch (err: any) {
      setError(err.message || 'Error rejecting submission');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRequestMore = async (entry: Entry) => {
    if (!user || !reviewNote.trim()) {
      alert('Please provide a note for the user.');
      return;
    }
    setIsProcessing(true);
    try {
      const success = await requestMoreProof(entry, user.uid, reviewNote);
      if (success) {
        setSelectedEntry(null);
        setReviewNote('');
      } else {
        setError('Failed to request more proof.');
      }
    } catch (err: any) {
      setError(err.message || 'Error requesting proof');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <RefreshCw className="w-10 h-10 animate-spin text-brand-orange" />
        <p className="font-mono text-sm uppercase animate-pulse">Checking the Bureau inbox...</p>
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="py-16 flex justify-center">
        <div className="relative bg-[#FFFEEC] border-[3px] border-on-surface p-8 max-w-sm text-center shadow-[6px_6px_0px_black] rotate-[-1.5deg] select-none">
          {/* Yellow sticky tape at top */}
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-28 h-6 bg-[#FEFC9C]/90 border-b border-dashed border-on-surface/20 rotate-[1deg] shadow-sm pointer-events-none mix-blend-multiply" />
          <div className="absolute top-2 right-2 text-xs opacity-50">📌</div>
          
          <div className="flex flex-col items-center justify-center space-y-3 pt-2">
            <Shield className="w-10 h-10 text-on-surface/60" />
            <h4 className="font-display text-xl font-black uppercase italic tracking-tight text-on-surface">Queue is Clear</h4>
            <p className="font-mono text-[10px] font-bold text-on-surface/50 uppercase leading-relaxed">
              No pending proof coordinates found in the Adjudication folder. All agent submissions have been verified.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-error/10 border-2 border-error rounded-xl flex items-center gap-3 text-error">
          <AlertTriangle className="w-5 h-5" />
          <p className="font-mono text-xs font-bold">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-error/10 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {submissions.map((entry) => (
          <div 
            key={entry.id}
            onClick={() => setSelectedEntry(entry)}
            className={cn(
              "field-card field-card--admin p-5 transition-all cursor-pointer overflow-hidden relative",
              selectedEntry?.id === entry.id ? "bg-brand-yellow/5 border-l-[8px] border-l-brand-orange" : "border-l-[8px] border-l-stone-400"
            )}
          >
            {/* Decal label stamp */}
            <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-5 select-none pointer-events-none font-display text-4xl font-extrabold uppercase -rotate-12 border-2 border-dashed border-on-surface px-2">
              PENDING
            </div>

            <div className="flex gap-4 relative z-10">
              <div className="w-20 h-20 bg-on-surface/5 border-2 border-on-surface rounded-none overflow-hidden shrink-0 shadow-[2px_2px_0px_black]">
                {entry.proofImage ? (
                  <img src={entry.proofImage} alt="Proof" className="w-full h-full object-cover grayscale" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Camera className="w-6 h-6 opacity-20" />
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <h4 className="font-display text-xl font-black uppercase truncate italic text-on-surface">{entry.tripTitle}</h4>
                  <FieldBadge variant="sticker" color="paper" size="xs" className="border border-on-surface">#ID_{entry.id.substring(0, 6).toUpperCase()}</FieldBadge>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <User className="w-3 h-3 opacity-40 text-on-surface" />
                  <p className="text-[10px] font-mono font-black uppercase text-on-surface/60">{entry.userName}</p>
                </div>
                <div className="flex items-center gap-4 mt-3">
                   <div className="flex items-center gap-1">
                     <Clock className="w-3 h-3 opacity-30 text-on-surface" />
                     <p className="text-[9px] font-mono text-on-surface/40 font-bold">
                       {entry.createdAt?.toDate?.() ? entry.createdAt.toDate().toLocaleString() : entry.createdAt}
                     </p>
                   </div>
                   <div className="flex items-center gap-1">
                     <FileText className="w-3 h-3 opacity-30 text-on-surface" />
                     <p className={cn(
                       "text-[9px] font-mono font-black uppercase bg-[#FEFC9C] px-2 py-0.5 border border-on-surface/20 rounded shadow-sm text-on-surface"
                     )}>
                       {entry.status}
                     </p>
                   </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 opacity-40 self-center" />
            </div>
          </div>
        ))}
      </div>

      {/* Review Modal / Drawer */}
      <AnimatePresence>
        {selectedEntry && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-on-surface/80 backdrop-blur-sm p-4 flex items-center justify-center"
            onClick={() => setSelectedEntry(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-xl bg-paper border-4 border-on-surface rounded-[2.5rem] shadow-[12px_12px_0px_black] overflow-hidden flex flex-col max-h-[90vh]"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b-2 border-on-surface flex justify-between items-center bg-white">
                <div>
                  <p className="text-[10px] font-mono font-black uppercase text-on-surface/40 tracking-widest">BUREAU_ADJUDICATION</p>
                  <h3 className="text-2xl font-display font-black uppercase italic leading-none">{selectedEntry.tripTitle}</h3>
                </div>
                <button onClick={() => setSelectedEntry(null)} className="p-2 hover:bg-on-surface/5 rounded-full">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Visual Evidence Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-mono font-black uppercase text-on-surface/40">Visual_Evidence</p>
                    {selectedEntry.proofImage && (
                      <a 
                        href={selectedEntry.proofImage} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-[10px] font-mono font-bold uppercase text-brand-orange flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" /> Full Res
                      </a>
                    )}
                  </div>

                  {/* Requirement 10: Admin Warning Banner for missing photo references */}
                  {(!selectedEntry.photoUrl || !selectedEntry.storagePath) && (
                    <div className="p-4 bg-red-600 border-2 border-red-900 rounded-xl flex flex-col gap-1 text-white shadow-lg animate-pulse mb-4">
                      <div className="flex items-center gap-2 font-black uppercase text-xs">
                        <AlertTriangle className="w-5 h-5 text-yellow-300" />
                        CRITICAL PIPELINE FAILURE
                      </div>
                      <p className="font-mono text-[10px] font-bold">
                        Missing photo URL. This proof was saved without permanent image storage. 
                        Evidence integrity is compromised.
                      </p>
                    </div>
                  )}

                  {/* Temporary URL Warning */}
                  {(() => {
                    const url = selectedEntry.photoUrl || selectedEntry.imageUrl || selectedEntry.proofImage;
                    const temporaryPrefixes = ['blob:', 'data:', 'file:', 'capacitor:', 'localhost'];
                    
                    if (url && temporaryPrefixes.some(prefix => typeof url === 'string' && url.startsWith(prefix))) {
                      return (
                        <div className="p-3 bg-brand-orange/10 border-2 border-brand-orange rounded-xl flex items-center gap-2 text-brand-orange mb-4">
                          <AlertCircle className="w-4 h-4" />
                          <p className="font-mono text-[9px] font-black uppercase text-left">
                            Invalid temporary image URL saved. Must upload to Firebase Storage first.<br/>
                            <span className="opacity-50 text-[8px]">SOURCE: {url.substring(0, 40)}...</span>
                          </p>
                        </div>
                      );
                    }

                    return null;
                  })()}

                  <div className="aspect-video bg-on-surface/5 border-4 border-on-surface rounded-3xl overflow-hidden relative group">
                    {selectedEntry.proofImage || (selectedEntry as any).photoUrl ? (
                      <img 
                        src={selectedEntry.proofImage || (selectedEntry as any).photoUrl} 
                        alt="Proof" 
                        className="w-full h-full object-cover group-hover:grayscale-0 transition-all duration-500" 
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-3 opacity-20">
                        <CameraOff className="w-10 h-10" />
                        <p className="font-mono text-xs">PIXEL_ARRAY_MISSING</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Field Notes Section */}
                <div className="space-y-4">
                  <p className="text-[10px] font-mono font-black uppercase text-on-surface/40">Field_Notes</p>
                  <div className="bg-white border-2 border-on-surface p-6 rounded-3xl shadow-[4px_4px_0px_black] relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-brand-orange" />
                    <p className="font-serif italic text-lg leading-relaxed text-on-surface">
                      "{selectedEntry.fieldNote || 'No notes provided.'}"
                    </p>
                  </div>
                </div>

                {/* Previous Admin Feedback if any */}
                {(selectedEntry.adminNotes || (selectedEntry as any).adminNote) && (
                  <div className="space-y-4">
                    <p className="text-[10px] font-mono font-black uppercase text-rose-500">Previous_Admin_Feedback</p>
                    <div className="bg-rose-50/50 border-2 border-rose-200 p-4 rounded-3xl relative overflow-hidden text-rose-700">
                      <p className="font-mono text-xs">
                        "{selectedEntry.adminNotes || (selectedEntry as any).adminNote}"
                      </p>
                    </div>
                  </div>
                )}

                {/* User Info Section */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-on-surface/5 border-2 border-on-surface/10 rounded-2xl">
                    <p className="text-[8px] font-mono font-black uppercase text-on-surface/40 mb-1">AGENT_IDENTIFIER</p>
                    <p className="font-display text-lg font-black text-on-surface uppercase">{selectedEntry.userName}</p>
                    <p className="text-[9px] font-mono text-on-surface/40 mt-0.5">UID: {selectedEntry.userId.substring(0, 12)}...</p>
                  </div>
                  <div className="p-4 bg-on-surface/5 border-2 border-on-surface/10 rounded-2xl">
                    <p className="text-[8px] font-mono font-black uppercase text-on-surface/40 mb-1">MISSION_LEVEL</p>
                    <p className="font-display text-lg font-black text-on-surface uppercase">{selectedEntry.selectedLevel}</p>
                    <p className="text-[9px] font-mono text-on-surface/40 mt-0.5">EST_XP: 150</p>
                  </div>
                </div>

                {/* Decision Section */}
                <div className="space-y-4 pt-4">
                  <p className="text-[10px] font-mono font-black uppercase text-on-surface/40">Bureau_Verdict</p>
                  <div className="space-y-3">
                    <div className="relative">
                      <textarea 
                        className="w-full bg-white border-2 border-on-surface rounded-2xl p-4 font-mono text-xs focus:ring-2 focus:ring-brand-orange outline-none placeholder:opacity-30"
                        placeholder="Type verdict notes or rejection reason here..."
                        rows={3}
                        value={reviewNote}
                        onChange={(e) => setReviewNote(e.target.value)}
                      />
                      <MessageSquare className="absolute top-4 right-4 w-4 h-4 opacity-10 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-white border-t-2 border-on-surface grid grid-cols-3 gap-3">
                <button 
                  onClick={() => handleRequestMore(selectedEntry)}
                  disabled={isProcessing}
                  className="flex flex-col items-center justify-center gap-1 p-3 border-2 border-on-surface bg-brand-yellow/10 rounded-2xl hover:bg-brand-yellow hover:translate-y-[-2px] transition-all disabled:opacity-50"
                >
                  <RefreshCw className={cn("w-5 h-5", isProcessing && "animate-spin")} />
                  <span className="text-[8px] font-black uppercase font-mono">Request More</span>
                </button>
                <button 
                  onClick={() => handleReject(selectedEntry)}
                  disabled={isProcessing}
                  className="flex flex-col items-center justify-center gap-1 p-3 border-2 border-on-surface bg-error/10 rounded-2xl hover:bg-error hover:text-white hover:translate-y-[-2px] transition-all disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                  <span className="text-[8px] font-black uppercase font-mono">Reject</span>
                </button>
                <button 
                  onClick={() => handleApprove(selectedEntry)}
                  disabled={isProcessing}
                  className="flex flex-col items-center justify-center gap-1 p-3 border-2 border-on-surface bg-brand-orange text-white rounded-2xl shadow-[4px_4px_0px_black] active:shadow-none active:translate-y-1 transition-all disabled:opacity-50"
                >
                  <Check className="w-5 h-5" />
                  <span className="text-[8px] font-black uppercase font-mono">Approve</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
