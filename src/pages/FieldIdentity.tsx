import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { AvatarPreview } from '../components/AvatarPreview';
import { AVATAR_MANIFEST, DEFAULT_AVATAR } from '../constants/avatarAssets';
import { AvatarData, AvatarOption } from '../types/avatar';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Save, ChevronRight, Check } from 'lucide-react';
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

  return (
    <div className="min-h-screen bg-black text-white font-mono flex flex-col pt-safe">
      {/* Header */}
      <header className="p-4 border-b border-white/10 flex items-center justify-between bg-black/80 backdrop-blur-md sticky top-0 z-50">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/10 rounded-full transition-colors font-mono uppercase text-[10px] tracking-widest flex items-center gap-2">
          <ChevronLeft size={16} />
          <span>Exit</span>
        </button>
        <div className="text-center">
          <h1 className="text-sm font-black uppercase tracking-widest">Field_ID_Editor</h1>
          <p className="text-[8px] opacity-40 uppercase">Archival_Interface_V1.0</p>
        </div>
        <button 
          onClick={handleSave} 
          disabled={isSaving}
          className="bg-white text-black px-4 py-1.5 rounded-sm font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-white/90 disabled:opacity-50"
        >
          {isSaving ? <span className="animate-pulse">Saving...</span> : (
            <>
              <Save size={14} />
              <span>Commit</span>
            </>
          )}
        </button>
      </header>

      {/* Main Preview Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-b from-neutral-900 to-black relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute inset-0 z-0 opacity-30">
          <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-brand-orange/20 blur-[100px] rounded-full" />
          <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-blue-600/20 blur-[100px] rounded-full" />
        </div>

        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative z-10"
        >
          <div className="absolute -inset-8 border border-white/5 pointer-events-none" />
          <div className="absolute -inset-4 border border-white/10 pointer-events-none" />
          <AvatarPreview avatar={currentAvatar} size="xl" className="shadow-[0_0_50px_rgba(255,255,255,0.05)]" />
          
          {/* Label */}
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-full text-center">
            <span className="text-[10px] uppercase tracking-[0.3em] font-black text-white/40">Field_Asset_ID</span>
          </div>
        </motion.div>
      </div>

      {/* Editor Controls */}
      <div className="bg-neutral-900 border-t border-white/10 p-4 pb-safe-offset-4">
        {/* Category Selector */}
        <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar py-2 border-b border-white/5">
          {categories.map(cat => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={cn(
                "px-3 py-1 text-[10px] uppercase tracking-widest font-bold whitespace-nowrap transition-all border-b-2",
                activeCategory === cat.key ? "border-brand-orange text-brand-orange" : "border-transparent text-white/40 hover:text-white/60"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
          {currentOptions.map((option: AvatarOption) => (
            <button
              key={option.id}
              onClick={() => handleSelectOption(activeCategory, option.id)}
              className={cn(
                "relative flex flex-col items-center gap-2 p-2 rounded-sm border transition-all duration-300 group",
                selectedId === option.id 
                  ? "bg-brand-orange/10 border-brand-orange shadow-[0_0_15px_rgba(226,149,120,0.2)]" 
                  : "bg-black/40 border-white/5 hover:border-white/20"
              )}
            >
              {selectedId === option.id && (
                <div className="absolute top-1 right-1 bg-brand-orange text-white rounded-full p-0.5 z-20 scale-75">
                  <Check size={8} strokeWidth={4} />
                </div>
              )}
              
              <div className="w-12 h-12 bg-neutral-800/50 rounded-full flex items-center justify-center overflow-hidden border border-white/5">
                {option.path ? (
                  <img src={option.path} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[8px] opacity-20 uppercase font-black">Null</span>
                )}
              </div>
              <span className={cn(
                "text-[8px] uppercase tracking-tighter text-center line-clamp-1 group-hover:text-white transition-colors",
                selectedId === option.id ? "text-brand-orange" : "text-white/40"
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
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl"
          >
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-brand-orange rounded-full flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(226,149,120,0.4)]">
                <Check size={40} className="text-white" strokeWidth={3} />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black uppercase tracking-tighter italic">Identity_Secured</h2>
                <p className="text-[10px] text-brand-orange uppercase tracking-[0.2em]">Field Database Updated Successfully</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
