import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { AvatarPreview } from '../components/AvatarPreview';
import { AVATAR_MANIFEST, DEFAULT_AVATAR, PERSONA_AVATAR_PRESETS } from '../constants/avatarAssets';
import { AvatarData, AvatarOption } from '../types/avatar';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Save, ChevronRight, Check, RefreshCcw } from 'lucide-react';
import { cn } from '../lib/utils';

type Category = keyof typeof AVATAR_MANIFEST;

export default function FieldIdentity() {
  const { profile, updateAvatar } = useApp();
  const navigate = useNavigate();
  const [currentAvatar, setCurrentAvatar] = useState<AvatarData>(profile?.avatar || DEFAULT_AVATAR);
  const [activeCategory, setActiveCategory] = useState<Category>('bases');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const categories: { key: Category; label: string }[] = [
    { key: 'backgrounds', label: 'Background' },
    { key: 'bases', label: 'Base' },
    { key: 'outfits', label: 'Outfit' },
    { key: 'hairs', label: 'Hair' },
    { key: 'accessories', label: 'Accessory' },
    { key: 'badges', label: 'Badge' },
  ];

  const handleSelectOption = (categoryId: Category, optionId: string) => {
    setCurrentAvatar(prev => {
      const fieldMapping: Record<Category, keyof AvatarData> = {
        bases: 'baseId',
        hairs: 'hairId',
        outfits: 'outfitId',
        accessories: 'accessoryId',
        backgrounds: 'backgroundId',
        badges: 'badgeId'
      };
      return { ...prev, [fieldMapping[categoryId]]: optionId };
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateAvatar(currentAvatar);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        navigate('/profile');
      }, 1500);
    } catch (error) {
      console.error('Failed to update Field ID:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const currentOptions = AVATAR_MANIFEST[activeCategory];
  const fieldMapping: Record<Category, keyof AvatarData> = {
    bases: 'baseId',
    hairs: 'hairId',
    outfits: 'outfitId',
    accessories: 'accessoryId',
    backgrounds: 'backgroundId',
    badges: 'badgeId'
  };
  const selectedId = currentAvatar[fieldMapping[activeCategory]];

  const handleResetToPersona = () => {
    const persona = profile?.fieldType;
    if (persona && PERSONA_AVATAR_PRESETS[persona]) {
      if (confirm(`Reset Identity to ${profile.fieldTypeName} standard issue?`)) {
        setCurrentAvatar(PERSONA_AVATAR_PRESETS[persona]);
      }
    }
  };

  return (
    <div className="min-h-screen bg-white text-on-surface font-mono flex flex-col pt-safe">
      {/* Header */}
      <header className="p-6 border-b-8 border-on-surface flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <button onClick={() => navigate(-1)} className="p-3 hover:bg-on-surface/5 rounded-none border-2 border-on-surface shadow-[4px_4px_0px_black] transition-all font-mono uppercase text-[10px] tracking-widest flex items-center gap-2 font-black">
          <ChevronLeft size={16} strokeWidth={3} />
          <span>Exit</span>
        </button>
        <div className="text-center">
          <h1 className="text-xl font-black uppercase tracking-tighter italic leading-none">Field_ID_Editor</h1>
          <p className="text-[9px] opacity-40 uppercase font-black tracking-widest mt-1">Archival_Interface_V2.0</p>
        </div>
        <button 
          onClick={handleSave} 
          disabled={isSaving}
          className="bg-brand-orange text-white px-6 py-2 border-4 border-on-surface shadow-[6px_6px_0px_var(--color-brand-lime)] font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:scale-105 active:scale-95 disabled:opacity-50 transition-all"
        >
          {isSaving ? <span className="animate-pulse">Archiving...</span> : (
            <>
              <Save size={16} strokeWidth={3} />
              <span>Secure ID</span>
            </>
          )}
        </button>
      </header>

      {/* Main Preview Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-12 bg-white relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute inset-0 z-0 opacity-10">
          <div className="absolute top-1/4 -left-1/4 w-[600px] h-[600px] bg-brand-orange/20 blur-[150px] rounded-full" />
          <div className="absolute bottom-1/4 -right-1/4 w-[600px] h-[600px] bg-brand-lime/20 blur-[150px] rounded-full" />
        </div>

        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative z-10"
        >
          <div className="absolute -inset-12 border-4 border-on-surface/5 pointer-events-none -rotate-3" />
          <div className="absolute -inset-6 border-4 border-on-surface/10 pointer-events-none rotate-6" />
          <AvatarPreview avatar={currentAvatar} size="xl" className="shadow-[20px_20px_0px_black] border-8 border-on-surface bg-white" />
          
          {/* Label */}
          <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 w-full text-center">
             <div className="inline-block bg-on-surface text-brand-lime px-4 py-1 border-2 border-on-surface -rotate-2">
               <span className="text-[12px] uppercase tracking-[0.4em] font-black italic">Field_Asset_ID</span>
             </div>
          </div>
        </motion.div>
      </div>

      {/* Editor Controls */}
      <div className="bg-white border-t-8 border-on-surface p-6 pb-safe-offset-6">
        {/* Category Selector */}
        <div className="flex items-center justify-between border-b-4 border-on-surface/5 mb-8">
          <div className="flex gap-4 overflow-x-auto no-scrollbar py-2">
            {categories.map(cat => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={cn(
                  "px-4 py-2 text-xs uppercase tracking-widest font-black transition-all border-b-4",
                  activeCategory === cat.key ? "border-brand-orange text-brand-orange scale-105" : "border-transparent text-on-surface/40 hover:text-on-surface/60"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
          
          {profile?.fieldType && PERSONA_AVATAR_PRESETS[profile.fieldType] && (
            <button 
              onClick={handleResetToPersona}
              className="flex items-center gap-2 px-4 py-2 bg-on-surface/5 border-2 border-on-surface font-black uppercase text-[9px] tracking-widest hover:bg-brand-lime transition-colors"
              title="Reset to Persona Default"
            >
              <RefreshCcw size={12} strokeWidth={3} />
              Reset
            </button>
          )}
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-6 max-h-[40vh] overflow-y-auto pr-4 custom-scrollbar pb-8">
          {currentOptions.map((option: AvatarOption) => (
            <button
              key={option.id}
              onClick={() => handleSelectOption(activeCategory, option.id)}
              className={cn(
                "relative flex flex-col items-center gap-4 p-4 transition-all duration-300 group border-4",
                selectedId === option.id 
                  ? "bg-brand-orange border-on-surface shadow-[8px_8px_0px_var(--color-brand-lime)] -translate-y-1" 
                  : "bg-white border-on-surface/10 hover:border-on-surface hover:bg-on-surface/5"
              )}
            >
              {selectedId === option.id && (
                <div className="absolute -top-3 -right-3 bg-brand-lime text-on-surface border-4 border-on-surface p-1 z-20 shadow-[4px_4px_0px_black] rotate-12">
                  <Check size={14} strokeWidth={4} />
                </div>
              )}
              
              <div className="w-16 h-16 bg-paper-dark border-4 border-on-surface flex items-center justify-center overflow-hidden shadow-[4px_4px_0px_black]">
                {option.path ? (
                  <img src={option.path} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] opacity-20 uppercase font-black italic">Null</span>
                )}
              </div>
              <span className={cn(
                "text-[10px] uppercase font-black tracking-widest text-center line-clamp-1 transition-colors",
                selectedId === option.id ? "text-white" : "text-on-surface/40 group-hover:text-on-surface"
              )}>
                {option.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Success Overlay */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-lime pr-safe pl-safe"
          >
            <div className="text-center space-y-12">
              <div className="w-32 h-32 bg-brand-orange border-8 border-on-surface flex items-center justify-center mx-auto shadow-[20px_20px_0px_black] rotate-12">
                <Check size={64} className="text-white" strokeWidth={5} />
              </div>
              <div className="space-y-6">
                <h2 className="text-7xl font-black uppercase tracking-tighter italic leading-none drop-shadow-[6px_6px_0px_white]">ID_LOCKED</h2>
                <p className="text-xl text-on-surface bg-white inline-block px-6 py-2 border-4 border-on-surface shadow-[8px_8px_0px_black] font-black uppercase tracking-[0.2em] -rotate-3">Dossier archived and approved.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
