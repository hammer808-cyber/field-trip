import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { 
  ChallengeCard as ChallengeCardType, 
  ChallengeCategory, 
  ChallengeType, 
  ChallengeStatus,
  ProofType,
  ProofMode
} from '../types/challenges';
import { 
  getAllChallenges, 
  saveChallenge, 
  subscribeToChallenges 
} from '../services/challengeService';
import { 
  Plus, 
  Search, 
  Edit2, 
  Archive, 
  Check, 
  X, 
  Shield, 
  Layout, 
  Zap, 
  Users, 
  Eye, 
  Filter,
  ArrowLeft
} from 'lucide-react';
import { Card, Sticker } from '../components/UI';
import { ChallengeCard } from '../components/ChallengeCard';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

const CATEGORIES: ChallengeCategory[] = ['Social', 'Nature', 'Navigator', 'Stealth', 'Chaos', 'Onboarding', 'Bonus', 'Detour'];
const MODES: ChallengeType[] = ['solo', 'crew', 'flexible'];
const PROOF_TYPES: ProofType[] = ['photo', 'note', 'location', 'group-confirmation'];

const PROOF_MODES: ProofMode[] = ['strict_proof', 'flexible_proof', 'social_proof'];

export default function AdminChallengesPage() {
  const { isAdmin, isLoading: themeLoading } = useTheme();
  const [challenges, setChallenges] = useState<ChallengeCardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingChallenge, setEditingChallenge] = useState<Partial<ChallengeCardType> | null>(null);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAdmin) return;
    const unsub = subscribeToChallenges((data) => {
      setChallenges(data);
      setLoading(false);
    });
    return () => unsub();
  }, [isAdmin]);

  if (themeLoading || (loading && isAdmin)) return <div className="flex items-center justify-center min-h-screen font-mono">SYNCHRONIZING_DATABASE...</div>;
  
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-vh-screen p-6 text-center space-y-6">
        <Shield className="w-16 h-16 text-error opacity-20" />
        <h1 className="text-huge text-4xl">Access Restricted</h1>
        <p className="font-serif italic text-on-surface-variant max-w-sm">
          Challenge Registry Access requires Level 4 clearance. This event has been reported.
        </p>
        <button onClick={() => navigate('/')} className="underline font-mono text-xs">Return to Base</button>
      </div>
    );
  }

  const filteredChallenges = challenges.filter(c => 
    c.title.toLowerCase().includes(search.toLowerCase()) || 
    c.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async () => {
    if (!editingChallenge?.title) return alert("Title required.");
    await saveChallenge(editingChallenge);
    setEditingChallenge(null);
  };

  return (
    <div className="pb-40 px-6 pt-12 space-y-12 max-w-7xl mx-auto relative overflow-hidden">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
             <button onClick={() => navigate('/profile')} className="p-2 hover:bg-on-surface/5 rounded-full">
               <ArrowLeft className="w-4 h-4" />
             </button>
            <div className="bureau-tag bg-brand-orange text-white text-[10px]">OPS_REGISTRY_V2</div>
            <p className="micro-label">PROTOCOL: [CHALLENGE_MGMT_BETA]</p>
          </div>
          <h2 className="text-huge text-6xl text-on-surface leading-none uppercase tracking-tighter">Mission Control</h2>
          <p className="bureau-subhead max-w-xl">Centralized registry for Bureau operations. Author, edit, and archive the tasks that define the Field Trip.</p>
        </div>
        <button 
          onClick={() => setEditingChallenge({
            title: '',
            shortDescription: '',
            fullInstructions: '',
            category: 'Chaos',
            difficulty: 3,
            points: 100,
            estimatedTime: '30m',
            mode: 'solo',
            proofMode: 'flexible_proof',
            requiredProof: ['photo'],
            proofRequirements: {
              requiredSubjects: [],
              minConfidence: 60,
              requireLocation: false,
              requireTimestamp: true
            },
            status: 'available',
            tags: [],
            seasonAvailability: ['S1'],
            skinCompatibility: []
          })}
          className="bureau-btn text-xl flex items-center gap-2 group"
        >
          <Plus className="w-6 h-6 transition-transform group-hover:rotate-90" />
          AUTHOR_NEW_MISSION
        </button>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'TOTAL_MISSIONS', value: challenges.length },
          { label: 'ACTIVE_SOCIAL', value: challenges.filter(c => c.category === 'Social').length },
          { label: 'ACTIVE_CHAOS', value: challenges.filter(c => c.category === 'Chaos').length },
          { label: 'CREW_REQUIRED', value: challenges.filter(c => c.mode === 'crew').length },
        ].map(stat => (
          <div key={stat.label} className="notice-card p-4">
            <p className="micro-label opacity-40">{stat.label}</p>
            <p className="font-display text-4xl">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 opacity-40" />
          <input 
            type="text"
            placeholder="SEARCH_MISSION_REGISTRY..."
            className="w-full bg-paper border-4 border-on-surface p-4 pl-12 text-xl font-display uppercase tracking-tighter outline-none focus:bg-on-surface/5"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="p-4 border-4 border-on-surface hover:bg-on-surface hover:text-paper transition-all">
          <Filter className="w-7 h-7" />
        </button>
      </div>

      {/* Mission Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredChallenges.map(c => (
           <div key={c.id} className="relative group">
             <ChallengeCard challenge={c} onClick={() => setEditingChallenge(c)} />
             <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
               <button 
                onClick={() => setEditingChallenge(c)}
                className="p-2 bg-paper border-2 border-on-surface shadow-md hover:bg-brand-orange hover:text-white"
               >
                 <Edit2 className="w-4 h-4" />
               </button>
             </div>
           </div>
        ))}
      </div>

      {/* Editor Modal */}
      {editingChallenge && (
        <div className="fixed inset-0 z-[100] bg-on-surface/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-paper border-4 border-on-surface w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-[20px_20px_0px_rgba(0,0,0,0.3)]">
            <header className="sticky top-0 bg-on-surface text-paper p-6 flex justify-between items-center z-20">
               <div>
                 <p className="micro-label opacity-60">MISSION_AUTHORING_TOOL_V1</p>
                 <h2 className="font-display text-3xl uppercase tracking-tighter">
                   {editingChallenge.id ? 'Edit Mission' : 'Author Mission'}
                 </h2>
               </div>
               <button onClick={() => setEditingChallenge(null)} className="p-2 hover:bg-white hover:text-black border-2 border-transparent hover:border-white">
                 <X className="w-8 h-8" />
               </button>
            </header>

            <div className="p-8 space-y-12">
               {/* Preview Section */}
               <div className="space-y-4">
                  <p className="micro-label font-bold border-b border-on-surface/10 pb-2">HOLOGRAPHIC_PREVIEW</p>
                  <div className="max-w-sm">
                    <ChallengeCard challenge={editingChallenge as ChallengeCardType} />
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-8 border-t border-on-surface/10">
                  <div className="space-y-8">
                    <div className="space-y-6">
                      <div className="group">
                        <label className="block text-[10px] uppercase font-bold opacity-40 mb-1">MISSION_TITLE</label>
                        <input 
                          type="text" 
                          value={editingChallenge.title || ''} 
                          onChange={(e) => setEditingChallenge({ ...editingChallenge, title: e.target.value })}
                          className="w-full bg-transparent border-b-4 border-on-surface/10 p-2 text-2xl font-display uppercase tracking-tighter outline-none focus:border-brand-orange transition-colors"
                          placeholder="THE_NIGHT_WALK"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold opacity-40 mb-1">SHORT_DESCR (FOR_LISTING)</label>
                        <input 
                          type="text" 
                          value={editingChallenge.shortDescription || ''} 
                          onChange={(e) => setEditingChallenge({ ...editingChallenge, shortDescription: e.target.value })}
                          className="w-full bg-on-surface/5 border-b-2 border-on-surface p-2 text-sm font-mono outline-none"
                          placeholder="Document 3 anomalies..."
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold opacity-40 mb-1">FULL_OPERATIONAL_INSTRUCTIONS</label>
                        <textarea 
                          value={editingChallenge.fullInstructions || ''} 
                          onChange={(e) => setEditingChallenge({ ...editingChallenge, fullInstructions: e.target.value })}
                          className="w-full bg-on-surface/5 border-b-2 border-on-surface p-3 text-sm font-serif min-h-[120px] outline-none"
                          placeholder="Detail the exact steps for validation..."
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                       <div className="space-y-2">
                        <label className="block text-[10px] uppercase font-bold opacity-40 mb-1">CATEGORY</label>
                        <select 
                          value={editingChallenge.category}
                          onChange={(e) => setEditingChallenge({ ...editingChallenge, category: e.target.value as ChallengeCategory })}
                          className="w-full bg-paper border-2 border-on-surface p-2 font-mono text-xs"
                        >
                          {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat.toUpperCase()}</option>)}
                        </select>
                       </div>
                       <div className="space-y-2">
                        <label className="block text-[10px] uppercase font-bold opacity-40 mb-1">OP_MODE</label>
                        <select 
                          value={editingChallenge.mode}
                          onChange={(e) => setEditingChallenge({ ...editingChallenge, mode: e.target.value as ChallengeType })}
                          className="w-full bg-paper border-2 border-on-surface p-2 font-mono text-xs"
                        >
                          {MODES.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
                        </select>
                       </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] uppercase font-bold opacity-40 mb-1">STANDING_VALUE (XP)</label>
                        <input 
                          type="number" 
                          value={editingChallenge.points} 
                          onChange={(e) => setEditingChallenge({ ...editingChallenge, points: parseInt(e.target.value) })}
                          className="w-full bg-transparent border-b-2 border-on-surface/20 p-2 text-xl font-display outline-none focus:border-on-surface"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold opacity-40 mb-1">DIFFICULTY_INDEX</label>
                        <input 
                          type="number" min="1" max="5"
                          value={editingChallenge.difficulty} 
                          onChange={(e) => setEditingChallenge({ ...editingChallenge, difficulty: parseInt(e.target.value) })}
                          className="w-full bg-transparent border-b-2 border-on-surface/20 p-2 text-xl font-display outline-none focus:border-on-surface"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <p className="micro-label font-bold">PROOF_VERIFICATION_MODE</p>
                      <div className="grid grid-cols-3 gap-2">
                        {PROOF_MODES.map(m => (
                          <button
                            key={m}
                            onClick={() => setEditingChallenge({ ...editingChallenge, proofMode: m })}
                            className={cn(
                              "p-2 border-2 text-[10px] font-mono uppercase text-center",
                              editingChallenge.proofMode === m ? "bg-brand-orange text-white border-brand-orange" : "border-on-surface/10 opacity-60"
                            )}
                          >
                            {m.replace('_', ' ')}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <p className="micro-label font-bold">AI_VALIDATION_REQUIREMENTS (COMMA_SEP)</p>
                      <input 
                        type="text" 
                        value={editingChallenge.proofRequirements?.requiredSubjects?.join(', ') || ''} 
                        onChange={(e) => setEditingChallenge({ 
                          ...editingChallenge, 
                          proofRequirements: { 
                            ...editingChallenge.proofRequirements, 
                            requiredSubjects: e.target.value.split(',').map(s => s.trim()).filter(Boolean) 
                          } 
                        })}
                        className="w-full bg-on-surface/5 border-b-2 border-on-surface p-2 text-xs font-mono outline-none"
                        placeholder="cat, skateboard, red_hat..."
                      />
                    </div>

                    <div className="space-y-4">
                      <p className="micro-label font-bold">REQUIRED_EVIDENCE_TYPE</p>
                      <div className="flex flex-wrap gap-2">
                        {PROOF_TYPES.map(type => (
                          <button
                            key={type}
                            onClick={() => {
                              const current = editingChallenge.requiredProof || [];
                              const next = current.includes(type) 
                                ? current.filter(t => t !== type)
                                : [...current, type];
                              setEditingChallenge({ ...editingChallenge, requiredProof: next });
                            }}
                            className={cn(
                              "px-3 py-1 border-2 text-[10px] font-mono uppercase transition-all",
                              editingChallenge.requiredProof?.includes(type) ? "bg-on-surface text-paper border-on-surface" : "border-on-surface/20 opacity-60 hover:opacity-100"
                            )}
                          >
                            {type.replace('-', '_')}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <p className="micro-label font-bold">OP_STATUS</p>
                      <div className="grid grid-cols-2 gap-2">
                         {['locked', 'available', 'archived'].map(s => (
                           <button
                            key={s}
                            onClick={() => setEditingChallenge({ ...editingChallenge, status: s as any })}
                            className={cn(
                              "p-2 border-2 text-[10px] font-mono uppercase text-left",
                              editingChallenge.status === s ? "bg-brand-orange text-white border-brand-orange" : "border-on-surface/10 opacity-60"
                            )}
                           >
                            {s}
                           </button>
                         ))}
                      </div>
                    </div>
                  </div>
               </div>
            </div>

            <footer className="sticky bottom-0 bg-neutral-50 p-8 border-t-4 border-on-surface flex justify-end gap-4">
               <button 
                onClick={() => setEditingChallenge(null)}
                className="bureau-btn bg-white text-on-surface border-on-surface px-8"
               >
                 CANCEL_OPS
               </button>
               <button 
                onClick={handleSave}
                className="bureau-btn px-12 group"
               >
                 <Check className="w-5 h-5 inline-block mr-2" />
                 COMMIT_MISSION_CHANGES
               </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
