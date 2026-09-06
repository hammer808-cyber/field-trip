import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { AvatarPreview } from '../components/AvatarPreview';
import { AVATAR_MANIFEST, DEFAULT_AVATAR, PERSONA_AVATAR_PRESETS } from '../constants/avatarAssets';
import { AvatarData, AvatarOption } from '../types/avatar';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Save, ChevronRight, Check, RefreshCcw } from 'lucide-react';
import { cn } from '../lib/utils';
import { FieldPageHero } from '../components/FieldPageHero';
import { FieldButton, PlayerPageBody, PlayerPageShell } from '../components/player';

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
    <PlayerPageShell department="identity" className="skin-profile">
      <FieldPageHero
        variant="editorial"
        department="identity"
        eyebrow="Personal field record"
        title="FIELD ID"
        subtitle="Build the look that shows up on your Profile."
        backLabel="Profile"
        backTo="/profile"
        backgroundIcon={<Save className="h-64 w-64" />}
        infoCardLabel="Status"
        infoCardValue={isSaving ? 'Saving' : 'Draft'}
        infoCardSubtext={profile?.fieldTypeName || 'Explorer look'}
        infoCardAccent="pink"
      />
      <PlayerPageBody>
      <div className="relative flex flex-col gap-6 overflow-hidden">
        <div className="flex justify-end">
          <FieldButton onClick={handleSave} disabled={isSaving}>
            <Save size={16} strokeWidth={3} />
            {isSaving ? 'Saving…' : 'Save look'}
          </FieldButton>
        </div>
        {/* Background Gradients */}
        <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
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
          <AvatarPreview avatar={currentAvatar} size="xl" className="border-4 border-on-surface bg-white shadow-[8px_8px_0px_black]" />
          
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-full text-center">
             <div className="inline-block bg-on-surface px-4 py-1 text-brand-lime">
               <span className="text-xs font-black uppercase italic tracking-wide">Preview</span>
             </div>
          </div>
        </motion.div>
      </div>

      {/* Editor Controls */}
      <div className="bg-white border-t-8 border-on-surface p-6 pb-safe">
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
                <h2 className="font-display text-4xl font-black uppercase italic leading-none">Saved</h2>
                <p className="font-sans text-sm font-bold">Your Field Identity is updated.</p>
              </div>
            </div>
          </motion.div>
        )}
          </AnimatePresence>
      </PlayerPageBody>
    </PlayerPageShell>
  );
}
