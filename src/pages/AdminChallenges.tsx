import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { 
  TripCard as ChallengeCardType, 
  TripType,
  TripMode,
  TripStatus,
  ProofType,
  ChallengeLane
} from '../types/challenges';
import { FieldTypeId } from '../constants/fieldTypes';
import { 
  getAllChallenges, 
  saveChallenge, 
  subscribeToChallenges 
} from '../services/challengeService';
import { useApp } from '../context/AppContext';
import { updateFeatureFlags, deployHeatwave2026Manifest, updateChallengeStatus } from '../services/adminGameService';
import { validateChallengeBrandFit } from '../services/brandService';
import { getDisplayLabel } from '../utils/labelUtils';
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
  ArrowLeft,
  Settings,
  CloudUpload
} from 'lucide-react';

import { Card } from '../components/UI';
import { MissionCard } from '../components/ChallengeCard';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

const LANES: ChallengeLane[] = ['core', 'weekly', 'persona_spiced', 'wildcard', 'finale', 'onboarding'];
const CATEGORIES: TripType[] = ['Field Challenge', 'Evidence Challenge', 'Crew Challenge', 'Social Spark', 'Explore the Map', 'Taste Test', 'Proof Goblin', 'Crew Chaos', 'Onboarding', 'Bonus', 'Final'];
const MODES: TripMode[] = ['solo', 'crew', 'flexible'];
const PROOF_TYPES: ProofType[] = ['photo', 'note', 'location', 'group-confirmation', 'audio', 'video'];
const STATUSES: TripStatus[] = ['draft', 'approved', 'scheduled', 'active', 'archived'];
const ARCHETYPES: FieldTypeId[] = ['captainClipboard', 'mallRat', 'mascota', 'elondra', 'theGobbler', 'bigfoot'];

const PROOF_MODES: ProofType[] = ['photo', 'note', 'location'];

export default function AdminChallengesPage() {
  const { isAdmin, isLoading: themeLoading } = useTheme();
  const { gameConfig, isFeatureEnabled } = useApp();
  const [challenges, setChallenges] = useState<ChallengeCardType[]>([]);
  const [isDeploying, setIsDeploying] = useState(false);

  const handleDeployManifest = async () => {
    if (!window.confirm("This will synchronize the 14-week Heatwave Receipts manifest to Firestore. Existing challenges with matching IDs will be merged. Continue?")) return;
    
    setIsDeploying(true);
    try {
      const result = await deployHeatwave2026Manifest();
      alert(`Success: Deployed ${result.weeks} weeks and ${result.templates} templates to the registry. Active season set to ${result.seasonId}.`);
    } catch (err: any) {
      alert(`Error: Deployment failed. ${err.message}`);
    } finally {
      setIsDeploying(false);
    }
  };
  const [loading, setLoading] = useState(true);
  const [editingChallenge, setEditingChallenge] = useState<Partial<ChallengeCardType> | null>(null);
  const [search, setSearch] = useState('');
  const [toggling, setToggling] = useState(false);
  const navigate = useNavigate();

  const fieldEffectEnabled = isFeatureEnabled('fieldTypeEffectsEnabled');

  const toggleFieldEffects = async () => {
    setToggling(true);
    try {
      await updateFeatureFlags({ fieldTypeEffectsEnabled: !fieldEffectEnabled });
    } catch (err: any) {
      console.error("Failed to toggle field effects:", err);
      alert(`Error: Failed to update flag. ${err.message}`);
    } finally {
      setToggling(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    const unsub = subscribeToChallenges((data) => {
      setChallenges(data);
      setLoading(false);
    });
    return () => unsub();
  }, [isAdmin]);

  if (themeLoading || (loading && isAdmin)) return <div className="flex items-center justify-center min-h-screen font-mono">{getDisplayLabel('SYNCHRONIZING_DATABASE')}...</div>;
  
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-vh-screen p-6 text-center space-y-6">
        <Shield className="w-16 h-16 text-error opacity-20" />
        <h1 className="text-huge text-4xl">Access Restricted</h1>
        <p className="font-serif italic text-on-surface-variant max-w-sm">
          Trip Registry Access requires Level 4 clearance. This event has been reported.
        </p>
        <button onClick={() => navigate('/')} className="underline font-mono text-xs">Return to Base</button>
      </div>
    );
  }

  const filteredChallenges = challenges.filter(c => 
    c.title.toLowerCase().includes(search.toLowerCase()) || 
    c.type.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async () => {
    if (!editingChallenge?.title) return alert("Title required.");
    
    // Sync legacy fields
    const updated = {
      ...editingChallenge,
      theAsk: editingChallenge.description || editingChallenge.theAsk || '',
      basePoints: editingChallenge.baseXP || editingChallenge.basePoints || 100,
      requiredProof: editingChallenge.proofType || editingChallenge.requiredProof || ['photo'],
      isRepeatableTemplate: editingChallenge.repeatable !== undefined ? editingChallenge.repeatable : editingChallenge.isRepeatableTemplate
    };
    
    try {
      await saveChallenge(updated);
      setEditingChallenge(null);
    } catch (err: any) {
      console.error("Failed to save challenge:", err);
      alert(`BUREAU_ERROR: Save failed. ${err.message}`);
    }
  };

  return (
    <div className="pb-40 px-6 pt-12 space-y-12 max-w-7xl mx-auto relative overflow-hidden">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
             <button onClick={() => navigate('/profile')} className="p-2 hover:bg-on-surface/5 rounded-full">
               <ArrowLeft className="w-4 h-4" />
             </button>
            <div className="bureau-tag bg-brand-orange text-white text-[10px]">{getDisplayLabel('OPS_REGISTRY_V2')}</div>
            <p className="micro-label">Protocol: {getDisplayLabel('TRIP_MGMT_BETA')}</p>
          </div>
          <h2 className="text-huge text-6xl text-on-surface leading-none uppercase tracking-tighter">Control Booth</h2>
          <p className="bureau-subhead max-w-xl">Centralized registry for Bureau operations. Author, edit, and archive the trips that define the Field Trip.</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={handleDeployManifest}
            disabled={isDeploying}
            className="bureau-btn text-xl flex items-center gap-2 group bg-mustard border-on-surface text-on-surface"
          >
            <CloudUpload className={cn("w-6 h-6 transition-transform", isDeploying && "animate-bounce")} />
            {isDeploying ? 'Deploying...' : getDisplayLabel('DEPLOY_HEATWAVE_RECEIPTS')}
          </button>
          <button 
            onClick={() => setEditingChallenge({
              title: '',
              shortDescription: '',
              fullInstructions: '',
              type: 'Chaos' as any,
              basePoints: 100,
              levels: {
                Standard: { points: 100, description: '' },
                Advanced: { points: 150, description: '' },
                Certified: { points: 200, description: '' }
              },
              mode: 'solo',
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
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            })}
            className="bureau-btn text-xl flex items-center gap-2 group"
          >
            <Plus className="w-6 h-6 transition-transform group-hover:rotate-90" />
            {getDisplayLabel('AUTHOR_NEW_MISSION')}
          </button>
        </div>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {[
          { label: 'TOTAL_MISSIONS', value: (challenges?.length || 0) },
          { label: 'ACTIVE_SOCIAL', value: (challenges?.filter(c => c.category === 'Social Spark').length || 0) },
          { label: 'ACTIVE_EXPLORE', value: (challenges?.filter(c => c.type === 'Explore the Map').length || 0) },
          { label: 'CREW_REQUIRED', value: (challenges?.filter(c => c.mode === 'crew').length || 0) },
        ].map(stat => (
          <div key={stat.label} className="notice-card p-4">
            <p className="micro-label opacity-40">{getDisplayLabel(stat.label)}</p>
            <p className="font-display text-4xl">{stat.value}</p>
          </div>
        ))}
        
        {/* System Settings Toggle */}
        <div className="notice-card p-4 bg-brand-orange/10 border-brand-orange/20 flex flex-col justify-between">
          <div>
            <p className="micro-label text-brand-orange flex items-center gap-1 font-bold">
              <Settings className="w-3 h-3" />
              {getDisplayLabel('SYSTEM_CONFIG')}
            </p>
            <p className="text-sm font-mono mt-1 opacity-60">Field Type Effects</p>
          </div>
          <button 
            disabled={toggling}
            onClick={toggleFieldEffects}
            className={cn(
              "text-xs font-bold px-3 py-1 mt-2 border-2 uppercase tracking-tight transition-all",
              fieldEffectEnabled ? "bg-green-500 text-white border-green-600" : "bg-neutral-200 text-neutral-500 border-neutral-300"
            )}
          >
            {toggling ? '...' : fieldEffectEnabled ? 'ACTIVE (ON)' : 'MUTED (OFF)'}
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 opacity-40" />
          <input 
            type="text"
            placeholder={`${getDisplayLabel('SEARCH_MISSION_REGISTRY')}...`}
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
             <MissionCard challenge={c} onStart={() => setEditingChallenge(c)} />
             
             {/* Brand Fit Badge */}
             <div className={cn(
               "absolute top-4 left-4 z-10 px-2 py-1 text-[10px] font-bold uppercase tracking-widest border-2",
               c.brandFit === 'approved' ? "bg-green-500 text-white border-green-600" :
               c.brandFit === 'rejected' ? "bg-red-500 text-white border-red-600" :
               "bg-mustard text-on-surface border-on-surface"
             )}>
               {c.brandFit}
             </div>

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
                      <MissionCard challenge={editingChallenge as ChallengeCardType} />
                    </div>
                    {editingChallenge.brandFit && (
                      <div className={cn(
                        "p-4 border-2 flex items-start gap-3",
                        editingChallenge.brandFit === 'approved' ? "bg-green-50 border-green-200" : 
                        editingChallenge.brandFit === 'rejected' ? "bg-red-50 border-red-200" : "bg-mustard/10 border-mustard"
                      )}>
                        <Shield className={cn("w-5 h-5", editingChallenge.brandFit === 'approved' ? "text-green-600" : "text-red-600")} />
                        <div>
                          <p className="text-xs font-bold uppercase">Brand Fit: {editingChallenge.brandFit}</p>
                          <p className="text-xs opacity-60">Verified via Field Trip Brand Filter Protocol.</p>
                        </div>
                      </div>
                    )}
                    <button 
                      onClick={() => {
                        const check = validateChallengeBrandFit(editingChallenge);
                        setEditingChallenge({ ...editingChallenge, brandFit: check.status });
                      }}
                      className="w-full py-2 bg-on-surface text-paper text-[10px] font-bold uppercase tracking-widest hover:bg-brand-orange transition-all"
                    >
                      RUN_BRAND_VALIDATION
                    </button>
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
                        <label className="block text-[10px] uppercase font-bold opacity-40 mb-1">OPERATIONAL_INSTRUCTIONS (DESCRIPTION)</label>
                        <textarea 
                          value={editingChallenge.description || editingChallenge.theAsk || ''} 
                          onChange={(e) => setEditingChallenge({ ...editingChallenge, description: e.target.value })}
                          className="w-full bg-on-surface/5 border-b-2 border-on-surface p-3 text-sm font-serif min-h-[120px] outline-none"
                          placeholder="Detail the exact steps for validation..."
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] uppercase font-bold opacity-40 mb-1">FIELD_NOTE_PROMPT</label>
                          <input 
                            type="text" 
                            value={editingChallenge.fieldNotePrompt || ''} 
                            onChange={(e) => setEditingChallenge({ ...editingChallenge, fieldNotePrompt: e.target.value })}
                            className="w-full bg-on-surface/5 border-b-2 border-on-surface p-2 text-xs font-mono outline-none"
                            placeholder="What did you notice...?"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-bold opacity-40 mb-1">BUREAU_HINT_TEXT</label>
                          <input 
                            type="text" 
                            value={editingChallenge.hintText || ''} 
                            onChange={(e) => setEditingChallenge({ ...editingChallenge, hintText: e.target.value })}
                            className="w-full bg-on-surface/5 border-b-2 border-on-surface p-2 text-xs font-mono outline-none"
                            placeholder="Look under the..."
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                       <div className="space-y-2">
                        <label className="block text-[10px] uppercase font-bold opacity-40 mb-1">MISSION_CATEGORY</label>
                        <select 
                          value={editingChallenge.category || editingChallenge.type}
                          onChange={(e) => setEditingChallenge({ ...editingChallenge, category: e.target.value as TripType })}
                          className="w-full bg-paper border-2 border-on-surface p-2 font-mono text-xs"
                        >
                          {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat.toUpperCase()}</option>)}
                        </select>
                       </div>
                       <div className="space-y-2">
                        <label className="block text-[10px] uppercase font-bold opacity-40 mb-1">MISSION_LANE</label>
                        <select 
                          value={editingChallenge.lane}
                          onChange={(e) => setEditingChallenge({ ...editingChallenge, lane: e.target.value as any })}
                          className="w-full bg-paper border-2 border-on-surface p-2 font-mono text-xs"
                        >
                          <option value="">SELECT_LANE</option>
                          {LANES.map(lane => <option key={lane} value={lane}>{lane.toUpperCase()}</option>)}
                        </select>
                       </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] uppercase font-bold opacity-40 mb-1">BASE_XP</label>
                        <input 
                          type="number" 
                          value={editingChallenge.baseXP || editingChallenge.basePoints || 100} 
                          onChange={(e) => setEditingChallenge({ ...editingChallenge, baseXP: parseInt(e.target.value) })}
                          className="w-full bg-transparent border-b-2 border-on-surface/20 p-2 text-xl font-display outline-none focus:border-on-surface"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold opacity-40 mb-1">EST_TIME_MINS</label>
                        <input 
                          type="number" 
                          value={editingChallenge.estimatedTimeMinutes || 10} 
                          onChange={(e) => setEditingChallenge({ ...editingChallenge, estimatedTimeMinutes: parseInt(e.target.value) })}
                          className="w-full bg-transparent border-b-2 border-on-surface/20 p-2 text-xl font-display outline-none focus:border-on-surface"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold opacity-40 mb-1">DIFFICULTY_INDEX</label>
                        <select 
                          value={editingChallenge.difficulty} 
                          onChange={(e) => setEditingChallenge({ ...editingChallenge, difficulty: e.target.value as any })}
                          className="w-full bg-paper border-2 border-on-surface p-2 font-mono text-xs"
                        >
                          <option value="easy">EASY</option>
                          <option value="medium">MEDIUM</option>
                          <option value="hard">HARD</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-4 p-4 bg-brand-magenta/5 border-2 border-brand-magenta/10">
                      <p className="micro-label font-bold text-brand-magenta uppercase">DISTANCE_BONUS_CONFIG</p>
                      <label className="flex items-center gap-2 text-[10px] font-bold uppercase cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={editingChallenge.distanceBonus?.eligible || false} 
                          onChange={(e) => setEditingChallenge({ 
                            ...editingChallenge, 
                            distanceBonus: { 
                              ...(editingChallenge.distanceBonus || { label: '', description: '', bonusXp: 0 }),
                              eligible: e.target.checked 
                            } 
                          })}
                        />
                        DISTANCE_BONUS_ELIGIBLE
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] uppercase font-bold opacity-40 mb-1">BONUS_LABEL</label>
                          <input 
                            type="text" 
                            disabled={!editingChallenge.distanceBonus?.eligible}
                            value={editingChallenge.distanceBonus?.label || ''} 
                            onChange={(e) => setEditingChallenge({ 
                              ...editingChallenge, 
                              distanceBonus: { ...editingChallenge.distanceBonus!, label: e.target.value } 
                            })}
                            className="w-full bg-transparent border-b-2 border-brand-magenta/20 p-1 text-xs font-mono outline-none focus:border-brand-magenta"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-bold opacity-40 mb-1">BONUS_XP</label>
                          <input 
                            type="number" 
                            disabled={!editingChallenge.distanceBonus?.eligible}
                            value={editingChallenge.distanceBonus?.bonusXp || 0} 
                            onChange={(e) => setEditingChallenge({ 
                              ...editingChallenge, 
                              distanceBonus: { ...editingChallenge.distanceBonus!, bonusXp: parseInt(e.target.value) } 
                            })}
                            className="w-full bg-transparent border-b-2 border-brand-magenta/20 p-1 text-xs font-mono outline-none focus:border-brand-magenta"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold opacity-40 mb-1">BONUS_DESCRIPTION</label>
                        <input 
                          type="text" 
                          disabled={!editingChallenge.distanceBonus?.eligible}
                          value={editingChallenge.distanceBonus?.description || ''} 
                          onChange={(e) => setEditingChallenge({ 
                            ...editingChallenge, 
                            distanceBonus: { ...editingChallenge.distanceBonus!, description: e.target.value } 
                          })}
                          className="w-full bg-transparent border-b-2 border-brand-magenta/20 p-1 text-xs font-mono outline-none focus:border-brand-magenta"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <label className="flex items-center gap-2 text-[10px] font-bold uppercase cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={editingChallenge.active} 
                          onChange={(e) => setEditingChallenge({ ...editingChallenge, active: e.target.checked })}
                        />
                        ACTIVE_MISSION
                      </label>
                      <label className="flex items-center gap-2 text-[10px] font-bold uppercase cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={editingChallenge.repeatable} 
                          onChange={(e) => setEditingChallenge({ ...editingChallenge, repeatable: e.target.checked })}
                        />
                        REPEATABLE
                      </label>
                      <label className="flex items-center gap-2 text-[10px] font-bold uppercase cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={editingChallenge.zineEligible} 
                          onChange={(e) => setEditingChallenge({ ...editingChallenge, zineEligible: e.target.checked })}
                        />
                        ZINE_ELIGIBLE
                      </label>
                      <label className="flex items-center gap-2 text-[10px] font-bold uppercase cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={editingChallenge.snitchEligible} 
                          onChange={(e) => setEditingChallenge({ ...editingChallenge, snitchEligible: e.target.checked })}
                        />
                        SNITCH_ELIGIBLE
                      </label>
                    </div>

                    <div className="space-y-4">
                      <p className="micro-label font-bold uppercase opacity-60">ARCHETYPE_AFFINITY</p>
                      <div className="flex flex-wrap gap-2">
                        {ARCHETYPES.map(type => (
                          <button
                            key={type}
                            onClick={() => {
                              const current = editingChallenge.personaAffinity || [];
                              const next = current.includes(type) 
                                ? current.filter(t => t !== type)
                                : [...current, type];
                              setEditingChallenge({ ...editingChallenge, personaAffinity: next });
                            }}
                            className={cn(
                              "px-3 py-1 border-2 text-[10px] font-mono uppercase transition-all",
                              editingChallenge.personaAffinity?.includes(type) ? "bg-mustard text-on-surface border-on-surface" : "border-on-surface/20 opacity-60 hover:opacity-100"
                            )}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] uppercase font-bold opacity-40 mb-1">BOOST_TAGS (COMMA_SEP)</label>
                        <input 
                          type="text" 
                          value={editingChallenge.boostTags?.join(', ') || ''} 
                          onChange={(e) => setEditingChallenge({ ...editingChallenge, boostTags: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                          className="w-full bg-on-surface/5 border-b-2 border-on-surface p-2 text-xs font-mono outline-none"
                          placeholder="urban, speed, nature..."
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold opacity-40 mb-1">SLOWDOWN_TAGS (COMMA_SEP)</label>
                        <input 
                          type="text" 
                          value={editingChallenge.slowDownTags?.join(', ') || ''} 
                          onChange={(e) => setEditingChallenge({ ...editingChallenge, slowDownTags: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                          className="w-full bg-on-surface/5 border-b-2 border-on-surface p-2 text-xs font-mono outline-none"
                          placeholder="crowds, water, darkness..."
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="block text-[10px] uppercase font-bold opacity-40 mb-1">UNLOCK_CONDITION</label>
                      <input 
                        type="text" 
                        value={editingChallenge.unlockCondition || ''} 
                        onChange={(e) => setEditingChallenge({ ...editingChallenge, unlockCondition: e.target.value })}
                        className="w-full bg-on-surface/5 border-b-2 border-on-surface p-2 text-xs font-mono outline-none"
                        placeholder="Reach level 5, Complete first excursion..."
                      />
                    </div>

                    <div className="space-y-4">
                      <p className="micro-label font-bold">REQUIRED_PROOF_TYPES</p>
                      <div className="flex flex-wrap gap-2">
                        {PROOF_TYPES.map(type => (
                          <button
                            key={type}
                            onClick={() => {
                              const current = editingChallenge.proofType || editingChallenge.requiredProof || [];
                              const next = current.includes(type) 
                                ? current.filter(t => t !== type)
                                : [...current, type];
                              setEditingChallenge({ ...editingChallenge, proofType: next });
                            }}
                            className={cn(
                              "px-3 py-1 border-2 text-[10px] font-mono uppercase transition-all",
                              (editingChallenge.proofType || editingChallenge.requiredProof)?.includes(type) ? "bg-on-surface text-paper border-on-surface" : "border-on-surface/20 opacity-60 hover:opacity-100"
                            )}
                          >
                            {type.replace('-', '_')}
                          </button>
                        ))}
                      </div>
                    </div>

                     <div className="space-y-4">
                      <p className="micro-label font-bold">OP_STATUS (LIFECYCLE)</p>
                      <div className="grid grid-cols-2 gap-2">
                         {STATUSES.map(s => (
                           <button
                            key={s}
                            onClick={() => setEditingChallenge({ ...editingChallenge, status: s as any })}
                            className={cn(
                              "p-2 border-2 text-[10px] font-mono uppercase text-left transition-all",
                              editingChallenge.status === s ? "bg-brand-orange text-white border-brand-orange" : "border-on-surface/10 opacity-60 hover:opacity-100"
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
