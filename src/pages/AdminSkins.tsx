import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Skin } from '../types/skin';
import { 
  saveSkin, 
  updateSkinStatus, 
  updateSkinSettings,
  setDefaultSkin 
} from '../services/skinService';
import { 
  Plus, 
  Settings, 
  Eye, 
  EyeOff, 
  Globe, 
  Lock, 
  Archive, 
  Edit2, 
  Check, 
  X,
  Palette,
  Layout,
  Type,
  Shield,
  Image as ImageIcon,
  MessageSquare
} from 'lucide-react';
import { Card, FieldBadge } from '../components/UI';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { DEFAULT_COPY_OVERRIDES, DEFAULT_SKIN_ASSETS, DEFAULT_THEME_TOKENS } from '../constants/skins';
import { DEFAULT_APP_SKIN } from '../skins/registry';

const COMPONENT_VARIANT_OPTIONS: Record<string, string[]> = {
  navigation: ['field-dock', 'notebook-tabs', 'arcade-console', 'summer-float'],
  missionCard: ['field-ticket', 'evidence-file', 'arcade-card', 'summer-pass'],
  proofCard: ['field-photo', 'contact-sheet', 'score-screen', 'postcard'],
  modal: ['bureau-panel', 'evidence-folder', 'arcade-overlay', 'pool-card'],
  button: ['bureau', 'rubber-stamp', 'arcade-key', 'float-button'],
  progress: ['signal-bar', 'ruled-meter', 'pixel-meter', 'sun-meter'],
  profileFrame: ['field-id', 'case-file', 'player-card', 'travel-pass'],
  viewfinder: ['field-camera', 'evidence-camera', 'arcade-scanner', 'summer-camera'],
  loading: ['field-checkin', 'paper-sort', 'pixel-load', 'sun-spin'],
  statePanel: ['field-notice', 'case-note', 'arcade-alert', 'postcard-note'],
};

export default function AdminSkinsPage() {
  const { allSkins, settings, isAdmin, isLoading } = useTheme();
  const [editingSkin, setEditingSkin] = useState<Partial<Skin> | null>(null);
  const [isAddingSkin, setIsAddingSkin] = useState(false);
  const [activeTab, setActiveTab] = useState<'manifest' | 'visuals' | 'components' | 'assets' | 'copy'>('manifest');
  const navigate = useNavigate();

  if (isLoading) return <div className="flex items-center justify-center min-h-screen font-mono">ENCRYPTING ACCESS...</div>;
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center space-y-6">
        <Lock className="w-16 h-16 text-error opacity-20" />
        <h1 className="text-huge text-4xl">Access Denied</h1>
        <p className="font-serif italic text-on-surface-variant max-w-sm">
          This terminal is restricted to Central Bureau personnel. Unauthorized access attempts are recorded.
        </p>
        <button onClick={() => navigate('/')} className="underline font-mono text-xs">Return to Base</button>
      </div>
    );
  }

  const handleStatusChange = async (skinId: string, status: Skin['status']) => {
    try {
      await updateSkinStatus(skinId, status);
    } catch (err) {
      console.error("Failed to update skin status:", err);
    }
  };

  const handleSetDefault = async (skinId: string) => {
    const candidate = allSkins.find((skin) => skin.id === skinId);
    if (!candidate || candidate.status !== 'active') {
      console.error('Only an active skin can be the global default.');
      return;
    }
    if (window.confirm("Set this as the global default skin?")) {
      try {
        await setDefaultSkin(skinId);
      } catch (err) {
        console.error("Failed to set default skin:", err);
      }
    }
  };

  const handleSetForced = async (skinId: string | null) => {
    try {
      await updateSkinSettings({ forcedSkinId: skinId });
    } catch (err) {
      console.error("Failed to force skin:", err);
    }
  };

  return (
    <div className="pb-40 px-6 pt-12 space-y-16 max-w-6xl mx-auto relative overflow-hidden">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="bureau-tag bg-brand-orange text-white text-[10px]">CORE_ENGINE_ACCESS</div>
            <p className="micro-label">OPERATIONS_TERMINAL: [SYS_MGMT_01]</p>
          </div>
          <h2 className="text-huge text-on-surface leading-none uppercase tracking-tighter">System Operations</h2>
          <p className="bureau-subhead">Global configuration of Bureau visual DNA and mandate management.</p>
        </div>
        <button 
          onClick={() => {
            setEditingSkin({
              name: "",
              slug: "",
              status: "inactive",
              isDefault: false,
              visualCalmSupported: true,
              themeTokens: { ...DEFAULT_THEME_TOKENS },
              designTokens: { ...DEFAULT_APP_SKIN.designTokens },
              typography: { ...DEFAULT_APP_SKIN.typography },
              shape: { ...DEFAULT_APP_SKIN.shape },
              effects: { ...DEFAULT_APP_SKIN.effects },
              motion: { ...DEFAULT_APP_SKIN.motion },
              components: { ...DEFAULT_APP_SKIN.components },
              experience: { ...DEFAULT_APP_SKIN.experience },
              features: { ...DEFAULT_APP_SKIN.features },
              preview: { ...DEFAULT_APP_SKIN.preview },
              assets: { ...DEFAULT_SKIN_ASSETS },
              copyOverrides: { ...DEFAULT_COPY_OVERRIDES }
            });
            setIsAddingSkin(true);
          }}
          className="bureau-btn text-xl flex items-center gap-2 group"
        >
          <Plus className="w-6 h-6 transition-transform group-hover:rotate-90" />
          INITIALIZE_NEW_DNA
        </button>
      </header>

      {/* Global Settings */}
      <section className="space-y-8">
        <div className="flex items-center gap-4">
          <h3 className="font-display text-2xl uppercase tracking-tighter text-on-surface">SYSTEM_MANDATES</h3>
          <div className="h-px flex-grow bg-on-surface/10" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="notice-card p-6 flex flex-col justify-between">
            <div>
              <p className="micro-label opacity-40 mb-3">DEFAULT_DNA_STRAND</p>
              <select 
                value={settings?.defaultSkinId || DEFAULT_APP_SKIN.id}
                onChange={(e) => handleSetDefault(e.target.value)}
                className="w-full bg-transparent border-b-2 border-on-surface/20 py-2 font-display text-xl outline-none transition-colors focus:border-brand-orange"
              >
                {allSkins.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <p className="text-[8px] font-mono opacity-30 mt-4 leading-none">FALLBACK_ASSET_4122</p>
          </div>

          <div className="notice-card p-6 flex flex-col justify-between border-brand-orange/30">
            <div>
              <div className="flex items-center gap-1 mb-3">
                 <p className="micro-label text-brand-orange">GLOBAL_OVERRIDE (FORCE)</p>
                 <Shield className="w-3 h-3 text-brand-orange" />
              </div>
              <select 
                value={settings?.forcedSkinId || ''}
                onChange={(e) => handleSetForced(e.target.value || null)}
                className={cn(
                  "w-full bg-transparent border-b-2 border-brand-orange/20 py-2 font-display text-xl outline-none focus:border-brand-orange",
                  settings?.forcedSkinId && "text-brand-orange"
                )}
              >
                <option value="">None (Variable State)</option>
                {allSkins.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <p className="text-[8px] font-mono text-brand-orange/40 mt-4 leading-none">PROTOCOL_HIJK_MODE</p>
          </div>

          <div className="notice-card p-6 flex flex-col justify-between">
            <p className="micro-label opacity-40 mb-4">ASSET_DNA_SELECTION</p>
            <div className="flex items-center justify-between">
              <span className="font-display text-lg tracking-tighter">{settings?.userSkinSelectionEnabled ? "ACTIVE" : "LOCKED"}</span>
              <button 
                onClick={async () => {
                  try {
                    await updateSkinSettings({ userSkinSelectionEnabled: !settings?.userSkinSelectionEnabled });
                  } catch (err) {
                    console.error("Failed to toggle skin selection:", err);
                  }
                }}
                className={cn(
                  "w-12 h-6 rounded-none transition-all relative p-1 border-2",
                  settings?.userSkinSelectionEnabled ? "bg-on-surface border-on-surface" : "bg-on-surface/10 border-on-surface/20"
                )}
              >
                <div className={cn(
                  "w-4 h-4 bg-paper transition-all",
                  settings?.userSkinSelectionEnabled ? "translate-x-6" : "translate-x-0"
                )} />
              </button>
            </div>
          </div>

          <div className="notice-card p-6 flex flex-col justify-between">
            <p className="micro-label opacity-40 mb-4">VISUAL_CALM_PROTOCOL</p>
            <div className="flex items-center justify-between">
              <span className="font-display text-lg tracking-tighter">{settings?.visualCalmAvailable ? "ONLINE" : "OFFLINE"}</span>
              <button 
                onClick={async () => {
                  try {
                    await updateSkinSettings({ visualCalmAvailable: !settings?.visualCalmAvailable });
                  } catch (err) {
                    console.error("Failed to toggle visual calm:", err);
                  }
                }}
                className={cn(
                  "w-12 h-6 rounded-none transition-all relative p-1 border-2",
                  settings?.visualCalmAvailable ? "bg-on-surface border-on-surface" : "bg-on-surface/10 border-on-surface/20"
                )}
              >
                <div className={cn(
                  "w-4 h-4 bg-paper transition-all",
                  settings?.visualCalmAvailable ? "translate-x-6" : "translate-x-0"
                )} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Skin List */}
      <section className="space-y-8">
        <div className="flex items-center gap-4">
          <h3 className="font-display text-2xl uppercase tracking-tighter text-on-surface">DNA_REGISTRY</h3>
          <div className="h-px flex-grow bg-on-surface/10" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {allSkins.map(skin => (
            <div key={skin.id}>
              <div className={cn(
                "group p-0 border-4 transition-all flex flex-col gap-0 h-full shadow-md",
                skin.status === 'inactive' && "opacity-60",
                skin.status === 'archived' ? "bg-on-surface/5 border-dashed border-on-surface/20" : "bg-paper border-on-surface hover:shadow-[12px_12px_0px_gray]"
              )}>
                <div className="file-tab bg-on-surface text-paper">STRAND_{skin.slug.toUpperCase()}</div>
                <div className="p-6 space-y-6 flex flex-col h-full">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="micro-label opacity-40">IDENTIFIER: {skin.slug}</p>
                      <h4 className="font-display text-3xl leading-none uppercase tracking-tighter">{skin.name}</h4>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setEditingSkin(skin)} className="p-2 hover:bg-on-surface hover:text-paper border-2 border-on-surface transition-all">
                        <Edit2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {(['inactive', 'preview', 'active', 'archived'] as const).map(status => (
                      <button
                        key={status}
                        onClick={() => handleStatusChange(skin.id, status)}
                        className={cn(
                          "px-2 py-1 border-2 text-[8px] uppercase font-bold transition-all",
                          skin.status === status ? "bg-brand-orange text-white border-brand-orange" : "border-on-surface/10 text-on-surface/40 hover:border-on-surface"
                        )}
                      >
                        {status}
                      </button>
                    ))}
                  </div>

                  <button 
                    onClick={() => handleSetDefault(skin.id)}
                    disabled={skin.status !== 'active'}
                    title={skin.status !== 'active' ? 'Activate this skin before making it the default.' : undefined}
                    className={cn(
                      "w-full min-h-11 flex items-center justify-center gap-2 px-3 py-2 border-2 text-[10px] uppercase font-bold transition-all disabled:cursor-not-allowed disabled:opacity-35",
                      (settings?.defaultSkinId || DEFAULT_APP_SKIN.id) === skin.id ? "bg-on-surface text-paper border-on-surface" : "border-on-surface/20 text-on-surface/40 hover:border-on-surface"
                    )}
                  >
                    <Check className="w-3 h-3" />
                    {(settings?.defaultSkinId || DEFAULT_APP_SKIN.id) === skin.id ? "GLOBAL_DEFAULT" : "SET_AS_DEFAULT"}
                  </button>

                  <div className="h-px border-t border-dashed border-on-surface/10" />

                  <div className="flex flex-wrap gap-2">
                    <div className="w-6 h-6 border-2 border-on-surface shadow-sm" style={{ backgroundColor: skin.themeTokens.primaryColor }} />
                    <div className="w-6 h-6 border-2 border-on-surface shadow-sm" style={{ backgroundColor: skin.themeTokens.secondaryColor }} />
                    <div className="w-6 h-6 border-2 border-on-surface shadow-sm" style={{ backgroundColor: skin.themeTokens.accentColor }} />
                    <div className="w-6 h-6 border-2 border-on-surface shadow-sm" style={{ backgroundColor: skin.themeTokens.backgroundColor }} />
                  </div>

                  <div className="mt-auto pt-4 flex items-center justify-between">
                    <span className="micro-label opacity-40">SEASON: {skin.seasonId || 'NONE'}</span>
                    {(settings?.defaultSkinId || DEFAULT_APP_SKIN.id) === skin.id && <FieldBadge variant="sticker" color="orange" size="xs" className="py-1">DEFAULT_STRAND</FieldBadge>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Editor Modal */}
      {editingSkin && (
        <div className="fixed inset-0 z-[100] bg-on-surface/90 backdrop-blur-md p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto bg-paper min-h-screen p-0 space-y-0 shadow-2xl relative border-4 border-on-surface">
            <button 
              onClick={() => setEditingSkin(null)}
              className="absolute top-4 right-4 p-2 hover:bg-error hover:text-white transition-all border-2 border-on-surface bg-paper z-20"
            >
              <X className="w-8 h-8" />
            </button>

            <header className="bg-on-surface text-paper p-8 space-y-2">
              <div className="bureau-tag bg-brand-orange text-white text-[10px] w-fit">DNA_MAINTENANCE_MODE</div>
              <p className="micro-label opacity-60 text-[10px]">{isAddingSkin ? 'INITIALIZING_BUILD' : 'RECONFIGURING_DNA_STRAND'}</p>
              <h2 className="text-huge text-5xl tracking-tighter uppercase font-black">{isAddingSkin ? 'Initialize Seed' : 'Edit Manifest'}</h2>
            </header>

            <div className="flex bg-on-surface border-b-2 border-on-surface/20">
              {(['manifest', 'visuals', 'components', 'assets', 'copy'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-all border-r border-paper/10",
                    activeTab === tab ? "bg-paper text-on-surface" : "text-paper/60 hover:text-paper"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="p-8 space-y-12">
              {activeTab === 'manifest' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-8">
                    <div className="space-y-6">
                       <p className="micro-label font-bold text-on-surface">CORE_MANIFEST_INFO</p>
                       <div className="space-y-6">
                         <div className="group">
                           <label className="block text-[10px] uppercase font-bold opacity-40 mb-1 group-focus-within:text-brand-orange transition-colors">STRAND_NAME</label>
                           <input 
                             type="text" 
                             value={editingSkin.name || ''} 
                             onChange={(e) => setEditingSkin({ ...editingSkin, name: e.target.value })}
                             className="w-full bg-transparent border-b-4 border-on-surface/10 p-2 text-2xl font-display uppercase tracking-tighter outline-none focus:border-brand-orange transition-colors"
                             placeholder="BUREAU_ADVENTURE_V1"
                           />
                         </div>
                         <div>
                           <label className="block text-[10px] uppercase font-bold opacity-40 mb-1">DESCRIPTION</label>
                           <textarea
                             value={editingSkin.description || ''}
                             onChange={(e) => setEditingSkin({ ...editingSkin, description: e.target.value })}
                             className="w-full min-h-24 bg-transparent border-2 border-on-surface/20 p-3 text-sm outline-none focus:border-brand-orange"
                             placeholder="Describe the visual and interaction character of this skin."
                           />
                         </div>
                         <div>
                           <label className="block text-[10px] uppercase font-bold opacity-40 mb-1">STRAND_IDENTIFIER (SLUG)</label>
                           <input 
                             type="text" 
                             value={editingSkin.slug || ''} 
                             onChange={(e) => setEditingSkin({ ...editingSkin, slug: e.target.value })}
                             className="w-full bg-on-surface/5 border-b-2 border-on-surface p-2 text-sm font-mono outline-none"
                             placeholder="bureau-adventure"
                           />
                         </div>
                         <div className="flex gap-4">
                           <div className="flex-1">
                              <label className="block text-[10px] uppercase font-bold opacity-40 mb-1">OPERATIONAL_SEASON</label>
                              <input 
                                type="text" 
                                value={editingSkin.seasonId || ''} 
                                onChange={(e) => setEditingSkin({ ...editingSkin, seasonId: e.target.value })}
                                className="w-full bg-transparent border-b-2 border-on-surface/20 p-2 text-sm font-mono outline-none focus:border-on-surface"
                                placeholder="season_summer_24"
                              />
                           </div>
                           <div className="flex-1">
                              <label className="block text-[10px] uppercase font-bold opacity-40 mb-1">CURRENT_STATUS</label>
                              <select
                                value={editingSkin.status}
                                onChange={(e) => setEditingSkin({ ...editingSkin, status: e.target.value as any })}
                                className="w-full bg-transparent border-b-2 border-on-surface/20 p-2 text-sm font-mono outline-none focus:border-on-surface"
                              >
                                <option value="inactive">Inactive</option>
                                <option value="preview">Preview</option>
                                <option value="active">Active</option>
                                <option value="archived">Archived</option>
                              </select>
                           </div>
                         </div>
                       </div>
                    </div>

                    <div className="space-y-4">
                      <p className="micro-label font-bold text-on-surface">CALM_PHASE_PROTOCOLS</p>
                      <label className="flex items-center gap-4 cursor-pointer group p-4 border-2 border-dashed border-on-surface/20 hover:border-on-surface transition-all">
                        <div 
                          onClick={() => setEditingSkin({ ...editingSkin, visualCalmSupported: !editingSkin.visualCalmSupported })}
                          className={cn(
                            "w-12 h-6 rounded-none transition-all relative p-1 border-2",
                            editingSkin.visualCalmSupported ? "bg-on-surface border-on-surface" : "bg-paper border-on-surface/20"
                          )}
                        >
                          <div className={cn(
                            "w-4 h-4 bg-white shadow-md transition-all",
                            editingSkin.visualCalmSupported ? "translate-x-6" : "translate-x-0"
                          )} />
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs font-display uppercase tracking-tighter block">SUPPORT_VISUAL_CALM</span>
                          <p className="text-[8px] opacity-40 leading-none">Minimizes animations and stickers for visual stability.</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="notice-card p-8 space-y-4 border-brand-orange/20">
                    <h4 className="font-display text-xl uppercase tracking-tighter">Operational Guidance</h4>
                    <ul className="text-[10px] space-y-2 opacity-60 font-mono">
                      <li>• SLUG MUST BE UNIQUE AND URL-SAFE</li>
                      <li>• PREVIEW STATUS ALLOWS ADMINS TO BYPASS GLOBAL LOCKS</li>
                      <li>• ACTIVE STATUS MAKES STRAND ELIGIBLE FOR USER SELECTION</li>
                      <li>• ENCRYPTED TOKENS ARE INJECTED AT RUNTIME</li>
                    </ul>
                  </div>
                </div>
              )}

              {activeTab === 'visuals' && (
                <div className="space-y-8">
                  <p className="micro-label font-bold text-on-surface">SEMANTIC_DESIGN_TOKENS</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6 bg-on-surface/5 p-6 border-2 border-on-surface/10">
                    {Object.entries(editingSkin.designTokens || {}).map(([key, value]) => {
                      if (typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)) {
                        return (
                          <div key={key}>
                            <label className="block text-[8px] uppercase font-bold opacity-40 mb-1 leading-none">{key}</label>
                            <div className="flex items-center gap-2 border-b-2 border-on-surface/20 pb-1 focus-within:border-brand-orange transition-colors">
                              <input 
                                type="color" 
                                value={value as string} 
                                onChange={(e) => setEditingSkin({ 
                                  ...editingSkin, 
                                  designTokens: { ...editingSkin.designTokens!, [key]: e.target.value }
                                })}
                                className="w-8 h-8 rounded-none border-2 border-on-surface cursor-pointer p-0 bg-transparent"
                              />
                              <input 
                                type="text" 
                                value={value as string} 
                                onChange={(e) => setEditingSkin({ 
                                  ...editingSkin, 
                                  designTokens: { ...editingSkin.designTokens!, [key]: e.target.value }
                                })}
                                className="w-full bg-transparent text-xs font-mono outline-none focus:text-brand-orange transition-colors"
                              />
                            </div>
                          </div>
                        )
                      }
                      return (
                        <div key={key}>
                          <label className="block text-[8px] uppercase font-bold opacity-40 mb-1 leading-none">{key}</label>
                          <input 
                            type="text" 
                            value={value as string} 
                            onChange={(e) => setEditingSkin({ 
                              ...editingSkin, 
                              designTokens: { ...editingSkin.designTokens!, [key]: e.target.value }
                            })}
                            className="w-full bg-transparent border-b-2 border-on-surface/20 p-1 text-[10px] font-mono outline-none focus:border-on-surface transition-colors"
                          />
                        </div>
                      )
                    })}
                  </div>

                  {([
                    ['typography', editingSkin.typography],
                    ['shape', editingSkin.shape],
                    ['effects', editingSkin.effects],
                    ['motion', editingSkin.motion],
                  ] as const).map(([groupName, values]) => (
                    <div key={groupName} className="space-y-3">
                      <p className="micro-label font-bold text-on-surface">{groupName}_TOKENS</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-on-surface/5 p-5 border-2 border-on-surface/10">
                        {Object.entries(values || {}).map(([key, value]) => (
                          <label key={key} className="space-y-1">
                            <span className="block text-[8px] uppercase font-bold opacity-40">{key}</span>
                            {typeof value === 'boolean' ? (
                              <select
                                value={String(value)}
                                onChange={(event) => setEditingSkin({
                                  ...editingSkin,
                                  [groupName]: { ...(editingSkin as any)[groupName], [key]: event.target.value === 'true' },
                                })}
                                className="w-full border-2 border-on-surface/20 bg-white p-2 font-mono text-[10px]"
                              >
                                <option value="true">true</option>
                                <option value="false">false</option>
                              </select>
                            ) : (
                              <input
                                type={typeof value === 'number' ? 'number' : 'text'}
                                value={String(value ?? '')}
                                onChange={(event) => setEditingSkin({
                                  ...editingSkin,
                                  [groupName]: {
                                    ...(editingSkin as any)[groupName],
                                    [key]: typeof value === 'number' ? Number(event.target.value) : event.target.value,
                                  },
                                })}
                                className="w-full border-b-2 border-on-surface/20 bg-transparent p-2 font-mono text-[10px] outline-none focus:border-brand-orange"
                              />
                            )}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'components' && (
                <div className="space-y-8">
                  <div>
                    <p className="micro-label font-bold text-on-surface">COMPONENT_VARIANT_MAP</p>
                    <p className="mt-2 text-sm text-on-surface/60">Structural variants are applied as root data attributes. Pages do not need skin-ID checks.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-on-surface/5 p-6 border-2 border-on-surface/10">
                    {Object.entries(editingSkin.components || {}).map(([key, value]) => (
                      <label key={key} className="space-y-2">
                        <span className="block text-[9px] uppercase font-bold opacity-50">{key}</span>
                        <select
                          value={value as string}
                          onChange={(event) => setEditingSkin({
                            ...editingSkin,
                            components: { ...editingSkin.components!, [key]: event.target.value },
                          })}
                          className="w-full border-2 border-on-surface bg-white p-3 font-mono text-[10px]"
                        >
                          {(COMPONENT_VARIANT_OPTIONS[key] || [value as string]).map(option => <option key={option} value={option}>{option}</option>)}
                        </select>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'assets' && (
                <div className="space-y-8">
                  <p className="micro-label font-bold text-on-surface">ASSET_MAPPING_PROTOCOL</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-on-surface/5 p-6 border-2 border-on-surface/10">
                    {Object.entries(editingSkin.assets || {}).map(([key, value]) => (
                      <div key={key} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="block text-[8px] uppercase font-bold opacity-40 leading-none">{key}</label>
                          <ImageIcon className="w-3 h-3 opacity-20" />
                        </div>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            value={value as string} 
                            onChange={(e) => setEditingSkin({ 
                              ...editingSkin, 
                              assets: { ...editingSkin.assets!, [key]: e.target.value } 
                            })}
                            className="flex-grow bg-transparent border-b-2 border-on-surface/20 p-2 text-[10px] font-mono outline-none focus:border-brand-orange transition-colors"
                            placeholder="/path/to/asset.svg"
                          />
                          {value && (String(value).startsWith('/') || String(value).startsWith('http')) && (
                            <div className="w-10 h-10 border-2 border-on-surface bg-paper flex items-center justify-center overflow-hidden">
                              <img src={value as string} alt="" className="max-w-full max-h-full object-contain" />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'copy' && (
                <div className="space-y-8">
                  <p className="micro-label font-bold text-on-surface">SEMANTIC_OVERRIDE_INTERFACE</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-on-surface/5 p-6 border-2 border-on-surface/10">
                    {Object.entries(editingSkin.copyOverrides || {}).map(([key, value]) => (
                      <div key={key} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="block text-[8px] uppercase font-bold opacity-40 leading-none">{key}</label>
                          <MessageSquare className="w-3 h-3 opacity-20" />
                        </div>
                        <input 
                          type="text" 
                          value={value as string} 
                          onChange={(e) => setEditingSkin({ 
                            ...editingSkin, 
                            copyOverrides: { ...editingSkin.copyOverrides!, [key]: e.target.value } 
                          })}
                          className="w-full bg-transparent border-b-2 border-on-surface/20 p-2 text-[10px] font-mono outline-none focus:border-brand-orange transition-colors"
                          placeholder="Standard Label"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <footer className="pt-12 border-t-4 border-on-surface flex justify-end gap-4 p-8 bg-neutral-50 -mx-8 -mb-8">
                 <button 
                  onClick={() => setEditingSkin(null)}
                  className="bureau-btn bg-paper text-on-surface border-on-surface/20 hover:border-on-surface px-8"
                 >
                   ABORT_MGMT
                 </button>
                 <button 
                  onClick={async () => {
                    if (!editingSkin.name || !editingSkin.slug) return alert("CORE_DATA_MISSING: VALIDATION_FAILED.");
                    try {
                      await saveSkin(editingSkin);
                      setEditingSkin(null);
                      setIsAddingSkin(false);
                      setActiveTab('manifest');
                    } catch (err: any) {
                      console.error("Failed to save skin:", err);
                      alert(`BUREAU_ERROR: Save failed. ${err.message}`);
                    }
                  }}
                  className="bureau-btn shadow-[8px_8px_0px_#2D5A27] active:shadow-none translate-y-0 active:translate-y-1 transition-all"
                 >
                   COMMIT_DNA_SEQUENCE
                 </button>
              </footer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
