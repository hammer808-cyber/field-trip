import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useApp } from "../context/AppContext";
import { useTheme } from "../context/ThemeContext";
import {
  Users,
  Trophy,
  Shield,
  BarChart3,
  Sparkles,
  ShieldAlert,
  MoreHorizontal,
  Flame,
  Waves,
  Sun,
  Lock,
  MessageSquare,
  ArrowRight,
  Zap,
} from "lucide-react";
import { cn } from "../lib/utils";
import { Card } from "../components/UI";
import { AvatarPreview } from "../components/AvatarPreview";
import { DEFAULT_AVATAR } from "../constants/avatarAssets";
import { FIELD_TYPES, Entry, DEV_APP_CONFIG } from "../constants";
import { getDisplayLabel } from "../utils/labelUtils";
import { getLeaderboardPage, UserProfile } from "../services/userService";
import { subscribeToRecentScoreEvents, subscribeToPublicProofs } from "../services/activityService";
import { createTribunalCase } from "../services/tribunalService";
import { getWeeklySummary } from "../services/summaryService";
import { ScoreEvent, WeeklySummary } from "../types/game";
import { getServerDate } from "../services/timeService";
import { getCurrentVotingCycle, getVotingPhase } from "../services/votingCycleService";
import { normalizeEntryStatus } from "../logic/entryLogic";
import { getApprovedSubmissionsForUser } from "../services/submission-utils";
import { ContentMenu } from "../components/ContentMenu";
import { SabotageHub } from "../components/SabotageHub";
import { CrewArtifactsGallery } from "../components/CrewArtifactsGallery";
import {
  getCrew,
  getCrewLore,
  getLatestDispatch,
} from "../services/crewService";
import { Crew as CrewType, CrewLore, CrewDispatch } from "../types/crew";
import {
  Hibiscus,
  ChromeStar,
  GlossOverlay,
} from "../components/BajaBratzAssets";
import { DiamondStar, Sparkle, SunFlare } from "../components/SkinAssets";
import { useNavigate, useSearchParams } from "react-router-dom";
import * as LucideIcons from "lucide-react";
import { BADGE_DEFINITIONS, UserBadgeProgress } from "../types/badges";
import { MARKER_STICKERS } from "../data/markers";
import { TabbedSection } from "../components/TabbedSection";
import { FieldPageHero } from "../components/FieldPageHero";
import { StickerBackground } from "../components/StickerBackground";
import { CommunityProofCard } from "../components/CommunityProofCard";
import { 
  StickerDecal, 
  StickerCorner, 
  StickerScatter 
} from "../components/StickerDecals";
import {
  getActiveWeeklyBonus,
  hasUserEarnedWeeklyBonusThisWeek,
} from "../services/weeklyBonusService";
import { getCatalystForWeek } from "../services/weeklyCatalystService";

const SEASON_TOKEN_GOAL = 1000;

// --- MECHANICAL / SPLIT-FLAP COMPONENTS ---

const BOARD_MATERIALS = {
  paper: "bg-[#F5F2EA] shadow-[inset_0_2px_10px_rgba(0,0,0,0.06)]",
  grid: "bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]",
  casing:
    "bg-[#D9C5A0] border-8 border-[#BFA880] shadow-[0_15px_40px_rgba(0,0,0,0.1)]",
  metal:
    "bg-[#D9E8F5] border-[#8FB3CC] shadow-[inset_0_1px_4px_rgba(0,0,0,0.05)]",
};

function SplitFlapDigit({
  digit,
  className,
}: {
  digit: string | number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative inline-flex flex-col items-center justify-center bg-[#FAF9F6] rounded-lg overflow-hidden border-2 border-[#D9C5A0]/80",
        "shadow-[inset_0_3px_6px_rgba(0,0,0,0.05),0_6px_15px_rgba(0,0,0,0.1),0_0_0_1px_rgba(255,255,255,0.8)]",
        "w-9 h-14 sm:w-16 sm:h-24 mx-0.5 select-none",
        className,
      )}
    >
      {/* Upper Half */}
      <div className="absolute inset-0 bg-[#FFFDF7] h-1/2 overflow-hidden border-b border-[#D9C5A0]/30">
        <div className="flex h-full items-center justify-center translate-y-1/2">
          <span className="text-[#243447] font-mono font-black text-2xl sm:text-5xl tracking-tighter opacity-95 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">
            {digit}
          </span>
        </div>
      </div>
      {/* Lower Half */}
      <div className="absolute inset-x-0 bottom-0 bg-[#FAF9F6] h-1/2 overflow-hidden">
        <div className="flex h-full items-center justify-center -translate-y-1/2">
          <span className="text-[#243447] font-mono font-black text-2xl sm:text-5xl tracking-tighter opacity-95 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">
            {digit}
          </span>
        </div>
      </div>
      {/* Middle Seam Shadow Depth */}
      <div className="absolute top-1/2 left-0 w-full h-[2px] bg-[#D9C5A0]/20 z-20" />
      <div className="absolute top-1/2 left-0 w-full h-[1px] bg-[#D9C5A0]/40 z-20" />
      {/* Curved Reflection Overlays */}
      <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-b from-black/5 to-transparent z-10" />
      <div className="absolute inset-x-0 bottom-0 h-2 bg-gradient-to-t from-black/5 to-transparent z-10" />
      {/* Physical texture gradient overlay */}
      <div className="absolute inset-0 z-10 bg-gradient-to-b from-white/30 via-transparent to-black/5 pointer-events-none" />
    </div>
  );
}

function SplitFlapTitle({ text }: { text: string }) {
  return (
    <div className="relative inline-flex flex-wrap justify-center sm:justify-start gap-1 p-3 sm:p-8 bg-[#FDF3D6] border-[6px] border-[#D9C5A0] rounded-3xl shadow-[inset_0_4px_16px_rgba(0,0,0,0.05),0_12px_24px_rgba(0,0,0,0.1)] mb-4 sm:mb-8 max-w-full overflow-hidden">
      {/* Heavy Corner Bolting Screws */}
      <div className="absolute top-2.5 left-2.5 w-3 h-3 bg-neutral-300 rounded-full border border-neutral-400 shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)] flex items-center justify-center pointer-events-none">
        <div className="w-[1px] h-2.5 bg-neutral-400 rotate-45" />
      </div>
      <div className="absolute top-2.5 right-2.5 w-3 h-3 bg-neutral-300 rounded-full border border-neutral-400 shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)] flex items-center justify-center pointer-events-none">
        <div className="w-[1px] h-2.5 bg-neutral-400 -rotate-45" />
      </div>
      <div className="absolute bottom-2.5 left-2.5 w-3 h-3 bg-neutral-300 rounded-full border border-neutral-400 shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)] flex items-center justify-center pointer-events-none">
        <div className="w-[1px] h-2.5 bg-neutral-400 -rotate-12" />
      </div>
      <div className="absolute bottom-2.5 right-2.5 w-3 h-3 bg-neutral-300 rounded-full border border-neutral-400 shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)] flex items-center justify-center pointer-events-none">
        <div className="w-[1px] h-2.5 bg-neutral-400 rotate-12" />
      </div>

      <div className="flex flex-wrap justify-center sm:justify-start gap-1">
        {text
          .split("")
          .map((char, i) =>
            char === " " ? (
              <div key={i} className="w-4 sm:w-10" />
            ) : (
              <SplitFlapDigit key={i} digit={char.toUpperCase()} />
            ),
          )}
      </div>
    </div>
  );
}

// --- COMPACT SPLIT-FLAP DIGITS FOR KEY METRICS ---
function MiniSplitFlap({
  text,
  colorClass = "text-brand-orange",
}: {
  text: string | number;
  colorClass?: string;
}) {
  const chars = String(text).split("");
  return (
    <div className="inline-flex flex-wrap gap-[2px] items-center p-2 bg-[#FAF9F6] border-[2px] border-[#D9C5A0]/30 rounded shadow-[inset_0_2px_5px_rgba(0,0,0,0.05)] max-w-full">
      {chars.map((char, index) => {
        if (char === " ") {
          return <div key={index} className="w-2 sm:w-2.5" />;
        }
        return (
          <div
            key={index}
            className="relative inline-flex flex-col items-center justify-center bg-[#FFFDF7] rounded overflow-hidden border border-[#D9C5A0]/20 shadow-[inset_0_1.5px_3px_rgba(0,0,0,0.05)] w-[22px] h-[34px] sm:w-[26px] sm:h-[38px] select-none"
          >
            {/* Top flap half */}
            <div className="absolute inset-0 bg-[#FFFDF7] h-1/2 overflow-hidden border-b border-[#D9C5A0]/10">
              <div className="flex h-full items-center justify-center translate-y-1/2">
                <span
                  className={cn(
                    "font-mono font-black text-sm sm:text-lg tracking-tighter opacity-90",
                    colorClass,
                  )}
                >
                  {char.toUpperCase()}
                </span>
              </div>
            </div>
            {/* Bottom flap half */}
            <div className="absolute inset-x-0 bottom-0 bg-[#FAF9F6] h-1/2 overflow-hidden">
              <div className="flex h-full items-center justify-center -translate-y-1/2">
                <span
                  className={cn(
                    "font-mono font-black text-sm sm:text-lg tracking-tighter opacity-90",
                    colorClass,
                  )}
                >
                  {char.toUpperCase()}
                </span>
              </div>
            </div>
            {/* Split seam line */}
            <div className="absolute top-1/2 left-0 w-full h-[1px] bg-[#D9C5A0]/20 z-20" />
            <div className="absolute inset-0 z-10 bg-gradient-to-b from-white/10 via-transparent to-black/5 pointer-events-none" />
          </div>
        );
      })}
    </div>
  );
}

// --- REUSABLE STICKER-STYLE STAT CARD ---
interface StickerStatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon: any;
  variant?: "lime" | "orange" | "cyan" | "purple" | "white";
  className?: string;
}

const STAT_CARD_THEMES = {
  orange: {
    accentColor: "#FF5D22",
    lightBg: "bg-[#FFF4E0]",
    darkText: "text-[#E64A19]",
    badgeClass: "bg-brand-orange text-white shadow-[3px_3px_0px_#000000] border-3 border-on-surface",
    tapeColor: "bg-[#FDE047]/80 border-[#EAB308]/30",
    dotColor: "bg-brand-orange",
    tagBg: "bg-brand-orange/10 border-brand-orange/30 text-[#E64A19]"
  },
  lime: {
    accentColor: "#96F300",
    lightBg: "bg-[#F3FFDF]",
    darkText: "text-[#558B2F]",
    badgeClass: "bg-brand-lime text-black shadow-[3px_3px_0px_#000000] border-3 border-on-surface",
    tapeColor: "bg-[#7DD3FC]/80 border-[#0369A1]/30",
    dotColor: "bg-brand-lime",
    tagBg: "bg-brand-lime/15 border-brand-lime/40 text-[#558B2F]"
  },
  cyan: {
    accentColor: "#00D2FF",
    lightBg: "bg-[#E6F9FF]",
    darkText: "text-[#00838F]",
    badgeClass: "bg-brand-cyan text-black shadow-[3px_3px_0px_#000000] border-3 border-on-surface",
    tapeColor: "bg-[#F472B6]/80 border-[#BE185D]/30",
    dotColor: "bg-brand-cyan",
    tagBg: "bg-brand-cyan/15 border-[#00ACC1]/30 text-[#00838F]"
  },
  purple: {
    accentColor: "#9333EA",
    lightBg: "bg-[#F3E5F5]",
    darkText: "text-[#7B1FA2]",
    badgeClass: "bg-[#9333EA] text-white shadow-[3px_3px_0px_#000000] border-3 border-on-surface",
    tapeColor: "bg-[#FDE047]/80 border-[#EAB308]/30",
    dotColor: "bg-brand-purple",
    tagBg: "bg-brand-purple/10 border-brand-purple/30 text-[#7B1FA2]"
  },
  white: {
    accentColor: "#1A1A1A",
    lightBg: "bg-[#F5F5F5]",
    darkText: "text-on-surface",
    badgeClass: "bg-white text-on-surface shadow-[3px_3px_0px_#000000] border-3 border-on-surface",
    tapeColor: "bg-neutral-300/80 border-neutral-400/30",
    dotColor: "bg-on-surface",
    tagBg: "bg-on-surface/10 border-on-surface/20 text-on-surface"
  }
};

function StickerStatCard({
  title,
  value,
  subtext,
  icon: Icon,
  variant = "lime",
  className,
}: StickerStatCardProps) {
  const theme = STAT_CARD_THEMES[variant] || STAT_CARD_THEMES.white;

  return (
    <div className={cn("relative overflow-visible pb-2.5 pr-2.5 w-full", className)}>
      {/* Visual background layers for tactile depth */}
      {/* Solid absolute silhouette shadow */}
      <div className="absolute inset-0 bg-black rounded-2xl translate-x-[8px] translate-y-[8px] -z-20" />
      {/* Shifted under-layered page sheet */}
      <div className="absolute inset-0 bg-[#EFECE1] border-[3px] border-on-surface rounded-2xl translate-x-[4px] translate-y-[4px] -z-10 rotate-[0.8deg]" />
      
      {/* Front Hero Card */}
      <div
        role="group"
        aria-label={`${title}: ${value}`}
        className={cn(
          "relative bg-[#FAF9F5] border-[3.5px] border-on-surface p-5 rounded-2xl flex flex-col justify-between h-[12.5rem] overflow-hidden group select-none",
          "bg-[radial-gradient(#E5DEC2_1.5px,transparent_1.5px)] [background-size:14px_14px]"
        )}
      >
        {/* Taped paper sticker look */}
        <div className={cn("absolute top-[-7px] left-[15%] w-14 h-5.5 backdrop-blur-[0.5px] -rotate-12 z-20 pointer-events-none opacity-90 shadow-sm border", theme.tapeColor)} />
        
        {/* Top Header Row with Title and Sticker Icon Badge */}
        <div className="flex justify-between items-start gap-3 relative z-10">
          <div className="flex flex-col gap-1 text-left">
            <span className="font-mono text-[9px] font-black uppercase tracking-wider text-on-surface/40 leading-none">
              FIELD_METRIC_OPR
            </span>
            <div className="mt-1 font-display font-black text-sm sm:text-base text-on-surface uppercase tracking-tight leading-tight">
              {title}
            </div>
            <div className="h-[3px] w-8 bg-on-surface mt-1.5 rounded-full" />
          </div>
          
          {/* Hero Sticker Badge */}
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center transform hover:rotate-[15deg] transition-all shrink-0",
            theme.badgeClass
          )}>
            <Icon className="w-5 h-5 shrink-0" />
          </div>
        </div>

        {/* Main Stat Value read-out */}
        <div className="relative z-10 text-left mt-2 flex items-end justify-between">
          <div className="flex flex-col">
            <div className="inline-block bg-white border-[3px] border-on-surface px-4 py-2 rounded-xl shadow-[4px_4px_0px_#000000] rotate-[-1.5deg] group-hover:rotate-[0.5deg] transition-transform">
              <span className={cn("font-display font-black text-2xl sm:text-3.5xl tracking-tight leading-none uppercase", theme.darkText)}>
                {value}
              </span>
            </div>
          </div>
          <div className="text-[8px] font-mono font-bold text-on-surface/30 uppercase tracking-widest leading-none mr-1 mb-1">
            STAT_FIELD_A
          </div>
        </div>

        {/* Bottom Supporting Descriptor Section */}
        {subtext && (
          <div className="relative z-10 border-t-2 border-dashed border-on-surface/10 pt-2 flex items-center gap-1.5">
            <div className={cn("w-1.5 h-1.5 rounded-full shrink-0 animate-pulse", theme.dotColor)} />
            <span className="text-[10px] font-mono font-black text-on-surface/60 uppercase tracking-wider truncate leading-none">
              {subtext}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// --- REUSABLE PROGRESS STICKER CARD ---
interface ProgressStickerCardProps {
  title: string;
  value: string;
  subtext: string;
  percent: number;
  className?: string;
}

function ProgressStickerCard({
  title,
  value,
  subtext,
  percent,
  className,
}: ProgressStickerCardProps) {
  const totalTicks = 18;
  const activeTicks = Math.round((percent / 100) * totalTicks);

  return (
    <div className={cn("relative overflow-visible pb-2.5 pr-2.5 w-full", className)}>
      {/* Background shadow card */}
      <div className="absolute inset-0 bg-black rounded-2xl translate-x-[8px] translate-y-[8px] -z-20" />
      {/* Stacked Paper Page 2 */}
      <div className="absolute inset-0 bg-[#E8E4D5] border-[3px] border-on-surface rounded-2xl translate-x-[4px] translate-y-[4px] -z-10 rotate-[-0.6deg]" />
      
      {/* Main card body */}
      <div
        role="group"
        aria-label={`${title}: ${value}, ${percent}%`}
        className={cn(
          "relative bg-[#FAF9F5] border-[3.5px] border-on-surface p-5 rounded-2xl flex flex-col justify-between h-[12.5rem] overflow-hidden group select-none",
          "bg-[radial-gradient(#E5DEC2_1.5px,transparent_1.5px)] [background-size:14px_14px]"
        )}
      >
        {/* Subtle decorative tape */}
        <div className="absolute top-[-7px] left-[35%] w-14 h-5.5 bg-[#7DD3FC]/80 border border-[#0369A1]/30 backdrop-blur-[0.5px] rotate-[3deg] z-20 pointer-events-none opacity-90 shadow-sm" />

        {/* Top Header Row with Title and Hero Icon Sticker */}
        <div className="flex justify-between items-start gap-3 relative z-10 w-full">
          <div className="flex flex-col gap-1 text-left">
            <span className="font-mono text-[9px] font-black uppercase tracking-wider text-on-surface/40 leading-none">
              OPERATIVE_MOMENTUM
            </span>
            <div className="mt-1 font-display font-black text-sm sm:text-base text-on-surface uppercase tracking-tight leading-tight">
              {title}
            </div>
            <div className="h-[3px] w-8 bg-on-surface mt-1.5 rounded-full" />
          </div>
          
          {/* Sparkly Stamp Badge */}
          <div className="w-12 h-12 rounded-full border-3 border-on-surface bg-brand-lime text-black flex items-center justify-center transform hover:rotate-[-15deg] transition-all shadow-[3px_3px_0px_#000000] rotate-[-5deg] shrink-0">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
        </div>

        {/* Stats and gauge section */}
        <div className="mt-2 flex-1 flex flex-col justify-end relative z-10 text-left w-full">
          {/* Value Sticker Display */}
          <div className="mb-2.5 flex items-baseline justify-between">
            <div className="bg-white border-[3px] border-on-surface px-3 py-1 rounded-xl shadow-[3.5px_3.5px_0px_#000000] transform rotate-[-0.5deg]">
              <span className="font-display font-black text-base sm:text-lg tracking-tight leading-none text-[#558B2F]">
                {value}
              </span>
            </div>
            <div className="font-mono text-sm font-black text-[#558B2F] tracking-tighter bg-brand-lime/15 border border-brand-lime/40 px-1.5 py-0.5 rounded">
              {percent}%
            </div>
          </div>

          <div className="space-y-1.5 w-full">
            <div className="flex justify-between text-[9px] font-mono font-bold text-on-surface/50 uppercase tracking-widest leading-none">
              <span className="truncate">{subtext}</span>
              <span className="text-on-surface/30">MOM_SCALE_DEC</span>
            </div>
            
            {/* Segmented fluorescent LED grid layout but retro-brutalist custom scale */}
            <div className="bg-white border-[3px] border-on-surface p-[4px] rounded-xl flex gap-[3px] items-center justify-between shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] w-full">
              {[...Array(totalTicks)].map((_, i) => {
                const isActive = i < activeTicks;
                return (
                  <div
                    key={i}
                    className={cn(
                      "h-4 w-full rounded-[2px] transition-all duration-300",
                      isActive
                        ? "bg-brand-lime border-r border-[#558B2F]/10 last:border-0"
                        : "bg-on-surface/5 opacity-25 border-r border-transparent last:border-0",
                    )}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- REUSABLE WEEKLY AWARDS / VOTING CARD ---
interface WeeklyAwardsSectionProps {
  currentWeekNumber: number;
}

function WeeklyAwardsSection({ currentWeekNumber }: WeeklyAwardsSectionProps) {
  const [simulationActive, setSimulationActive] = useState(false);
  const [votes, setVotes] = useState<Record<string, string>>({}); // category -> nomineeId
  const [ballotState, setBallotState] = useState<"idle" | "stamped" | "locked">(
    "idle",
  );
  const [isStampAnimating, setIsStampAnimating] = useState(false);

  const categories = [
    {
      id: "scout_of_week",
      title: "Scout of the Week",
      description: "Most detailed field notes and signal intensities.",
      icon: Trophy,
      nominees: [
        { id: "1", name: "Agent Bigfoot", emoji: "👣" },
        { id: "2", name: "Explorer Spark", emoji: "⚡" },
        { id: "3", name: "You", emoji: "🧑‍🚀" },
      ],
    },
    {
      id: "anomalous_recon",
      title: "Anomalous Recon",
      description: "Uncovering the weirdest micro-anomalies.",
      icon: Sparkles,
      nominees: [
        { id: "4", name: "Agent UFO", emoji: "🛸" },
        { id: "5", name: "Scout Moss", emoji: "🌲" },
        { id: "6", name: "Agent Pine", emoji: "🪵" },
      ],
    },
  ];

  const handleVote = (categoryId: string, nomineeId: string) => {
    if (ballotState !== "idle") return;
    setVotes((prev) => ({
      ...prev,
      [categoryId]: nomineeId,
    }));
  };

  const handleStampSubmit = () => {
    setIsStampAnimating(true);
    setBallotState("stamped");
    setTimeout(() => {
      setIsStampAnimating(false);
    }, 600);
  };

  const selectedCount = Object.keys(votes).length;
  const hasNomineesSelected = selectedCount === categories.length;

  let buttonText = "Stamp My Vote";
  let buttonStyle = "";
  let buttonIcon = null;
  let buttonDisabled = false;

  if (ballotState === "locked") {
    buttonText = "Ballot Locked";
    buttonStyle =
      "bg-on-surface/10 border-on-surface/20 text-on-surface/35 cursor-not-allowed shadow-none";
    buttonIcon = <Lock className="w-4 h-4 text-on-surface/30 shrink-0" />;
    buttonDisabled = true;
  } else if (ballotState === "stamped") {
    buttonText = "Ballot Stamped!";
    buttonStyle =
      "bg-brand-lime text-on-surface border-on-surface shadow-[4px_4px_0px_black] cursor-default";
    buttonIcon = (
      <Shield className="w-4 h-4 text-brand-orange animate-pulse shrink-0" />
    );
    buttonDisabled = true;
  } else if (!hasNomineesSelected) {
    buttonText = "Pick Nominees First";
    buttonStyle =
      "bg-[#EAE5D8] text-on-surface/45 border-4 border-on-surface shadow-[4px_4px_0px_rgba(0,0,0,0.15)] cursor-not-allowed opacity-90";
    buttonIcon = (
      <Lock className="w-4 h-4 text-brand-orange shrink-0 animate-pulse" />
    );
    buttonDisabled = true;
  } else {
    buttonText = "Stamp My Vote";
    buttonStyle =
      "bg-brand-orange text-white hover:bg-brand-lime hover:text-on-surface border-4 border-on-surface shadow-[6px_6px_0px_black] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0px_black]";
    buttonIcon = (
      <Trophy className="w-4 h-4 text-brand-lime shrink-0 group-hover:rotate-12" />
    );
    buttonDisabled = false;
  }

  const stampAnimationVariants = {
    idle: { scale: 1 },
    stamp: {
      scale: [1, 1.18, 0.85, 1.05, 1],
      rotate: [0, -4, 4, -1, 0],
      transition: { duration: 0.5, ease: "easeInOut" as const },
    },
  };

  const isInteractive = ballotState === "idle";

  return (
    <div className="relative bg-[#FCF9F2] border-4 border-on-surface p-6 sm:p-8 shadow-[8px_8px_0px_rgba(0,0,0,0.1),12px_12px_0px_black] hover:shadow-[10px_10px_0px_rgba(0,0,0,0.1),16px_16px_0px_black] hover:-translate-y-0.5 transition-all overflow-hidden rounded-none">
      {/* Clipboard Clip Header Decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-5 bg-on-surface/35 border-b-4 border-x-4 border-on-surface/60 rounded-b-lg flex items-center justify-center z-10">
        <div className="w-12 h-1 bg-on-surface/40 rounded-full" />
      </div>

      {/* Transparent Handmade Paper Texture */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/handmade-paper.png')] opacity-[0.1] pointer-events-none mix-blend-multiply" />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-4 border-on-surface/10 pb-4 mb-4 gap-4 pt-4">
        <div className="text-left space-y-1">
          <div className="inline-block bg-brand-orange text-white text-sm font-black uppercase px-3 py-1 tracking-[0.2em] border-2 border-on-surface rotate-[-1deg] shadow-[3px_3px_0px_black] italic">
            WEEKLY_PICKS
          </div>
          <h3 className="font-outfit text-3xl sm:text-4xl font-black uppercase tracking-tight text-on-surface italic mt-1.5 leading-tight">
            Week_0{currentWeekNumber} Community Votes
          </h3>
        </div>
        <button
          onClick={() => {
            const nextSim = !simulationActive;
            setSimulationActive(nextSim);
            if (!nextSim) {
              setBallotState("idle");
              setVotes({});
            }
          }}
          aria-label={
            simulationActive
              ? "Lock Ballot Demo View"
              : "Simulate voting ballot live preview"
          }
          className="text-[9px] font-mono font-black uppercase tracking-widest bg-white hover:bg-brand-lime hover:text-on-surface border-2 border-on-surface px-3 py-1.5 flex items-center gap-1 shrink-0 self-end sm:self-auto transition-all shadow-[2px_2px_0px_black] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
        >
          {simulationActive ? "🔒 " + getDisplayLabel('VOTE_ACCESS') : "🔓 " + getDisplayLabel('VIEW_DEMO_OPS')}
        </button>
      </div>

      {!simulationActive ? (
        <div className="py-8 text-center space-y-4 bg-on-surface/[0.02] border-4 border-dashed border-on-surface/20 p-6 rounded-none relative">
          <div className="absolute top-2 right-2 text-on-surface/5 font-mono text-[9px] font-black uppercase">
            {getDisplayLabel('BALLOT_BOX_CLOSED')}
          </div>
          <div className="inline-flex items-center justify-center w-12 h-12 bg-[#FCF9F2] border-4 border-on-surface rounded-full shadow-[3px_3px_0px_black]">
            <Lock
              className="w-6 h-6 text-brand-orange animate-pulse"
              aria-hidden="true"
            />
          </div>
          <div className="space-y-2">
            <p className="font-outfit text-base font-black uppercase tracking-widest text-on-surface italic">
              Ballot Box Closed
            </p>
            <p className="text-xs font-sans leading-relaxed text-on-surface/70 max-w-md mx-auto">
              The weekly voting hasn't started yet. Keep exploring to find more
              items and check back soon!
            </p>
          </div>
          <div className="inline-flex items-center gap-2 bg-brand-orange text-white px-3 py-1 text-[10px] font-mono font-black uppercase tracking-widest leading-none shadow-[3px_3px_0px_black] border-2 border-on-surface rotate-[1deg]">
            <span className="w-2 h-2 bg-white rounded-full animate-ping" />
            VOTE OPENS SOON
          </div>
        </div>
      ) : (
        <div className="relative space-y-4 text-left animate-in fade-in duration-200">
          <AnimatePresence>
            {ballotState === "stamped" && (
              <motion.div
                initial={{ scale: 2.5, rotate: -45, opacity: 0 }}
                animate={{ scale: 1, rotate: -12, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", damping: 12, stiffness: 150 }}
                className="absolute top-12 right-2 sm:right-6 z-20 pointer-events-none"
              >
                <div className="bg-brand-orange border-4 border-on-surface text-white font-black text-xs px-3 py-1.5 uppercase tracking-widest shadow-[4px_4px_0px_black] rotate-[-12deg] select-none">
                  DEMO VOTED
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stamped Warning Tape Alert banner */}
          <div className="relative inline-block bg-brand-orange/10 border-4 border-dashed border-brand-orange text-brand-orange p-4 text-xs sm:text-sm font-bold uppercase tracking-wide rounded-none mt-2 w-full rotate-[-0.5deg]">
            <div className="absolute -top-3 -left-2 bg-brand-orange text-white font-mono text-[10px] px-2 py-0.5 font-bold uppercase rotate-[-2deg] border border-on-surface shadow-[2px_2px_0px_black]">
              DEMO MODE
            </div>
            <p className="font-mono text-xs font-black tracking-wider leading-tight">
              ⚠️ UI DEMO MODE ACTIVE // Voting simulated. Votes not committed to
              main scoreboard.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {categories.map((category, idx) => {
              const Icon = category.icon;
              // Alternate subtle rotation angles for high dimensional physical card feel
              const rotationClass =
                idx % 2 === 0 ? "rotate-[-0.5deg]" : "rotate-[0.5deg]";
              return (
                <div
                  key={category.id}
                  className={cn(
                    "p-4 sm:p-5 border-4 border-on-surface bg-[#FAF7EE] shadow-[4px_4px_0px_black] space-y-4 relative transition-transform hover:-translate-y-0.5",
                    rotationClass,
                  )}
                >
                  <div className="flex items-start gap-2.5 pb-2 border-b border-on-surface/10">
                    <div className="p-1.5 bg-on-surface text-brand-orange border-2 border-on-surface shadow-[2px_2px_0px_black] rotate-[-3deg]">
                      <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
                    </div>
                    <div>
                      <h4 className="font-outfit text-lg font-black uppercase tracking-tight text-on-surface leading-tight">
                        {category.title}
                      </h4>
                      <p className="text-sm text-on-surface/60 leading-snug mt-1">
                        {category.description}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {category.nominees.map((nominee) => {
                      const isVoted = votes[category.id] === nominee.id;
                      return (
                        <button
                          key={nominee.id}
                          disabled={!isInteractive}
                          onClick={() => handleVote(category.id, nominee.id)}
                          aria-label={`Vote for nominee ${nominee.name} in category ${category.title}`}
                          className={cn(
                            "relative p-2 border-4 text-center flex flex-col items-center justify-between transition-all rounded-none min-h-[84px] focus:outline-none focus:ring-2 focus:ring-brand-orange",
                            isVoted
                              ? "bg-brand-lime border-on-surface shadow-[4px_4px_0px_black] text-on-surface -translate-y-1 scale-[1.03]"
                              : cn(
                                  "bg-white border-on-surface/20 text-on-surface/80",
                                  isInteractive
                                    ? "hover:border-brand-orange hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_black]"
                                    : "opacity-60 cursor-not-allowed",
                                ),
                          )}
                        >
                          <span className="text-2xl relative mb-1">
                            {nominee.emoji}
                            {isVoted && (
                              <span className="absolute -top-2 -right-3 text-xs text-brand-orange leading-none font-black animate-ping">
                                ★
                              </span>
                            )}
                            {isVoted && (
                              <span className="absolute -top-2 -right-3 text-xs text-brand-orange leading-none font-black">
                                ★
                              </span>
                            )}
                          </span>
                          <span className="text-xs font-sans font-black uppercase tracking-tight leading-tight w-full break-words text-wrap">
                            {nominee.name}
                          </span>
                          <div
                            className={cn(
                              "text-[10px] font-black uppercase tracking-wider px-1.5 py-1 mt-2 border-t w-full leading-none",
                              isVoted
                                ? "border-on-surface/20 bg-black/5 text-on-surface"
                                : "border-transparent text-on-surface/40",
                            )}
                          >
                            {isVoted ? "ENDORSED" : "SELECT"}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Voting Action Button Module */}
          <div className="flex flex-col items-stretch sm:items-end justify-end pt-4 border-t border-on-surface/10 mt-4 gap-4 bg-on-surface/[0.01] p-4 border-4 border-double border-on-surface/20">
            <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <p className="text-sm font-sans font-medium uppercase tracking-tight text-on-surface/70 text-left sm:max-w-xs leading-snug">
                {ballotState === "idle"
                  ? !hasNomineesSelected
                    ? "Pick one nominee in each category to stamp your ballot."
                    : "Ready to stamp! Force down your scout endorsement seal."
                  : ballotState === "stamped"
                    ? "Ballot stamped successfully! You can lock this ballot to finalize testing."
                    : "Ballot is locked and ready for submission window closure."}
              </p>

              <motion.button
                type="button"
                id="stamp-ballot-submit-btn"
                disabled={buttonDisabled}
                onClick={handleStampSubmit}
                variants={stampAnimationVariants}
                animate={isStampAnimating ? "stamp" : "idle"}
                className={cn(
                  "w-full sm:w-auto uppercase font-outfit text-sm font-black tracking-widest px-10 py-4 border-4 border-on-surface select-none transition-all duration-200 flex items-center justify-center gap-3 group",
                  buttonStyle,
                )}
              >
                {buttonIcon}
                <span>{buttonText}</span>
              </motion.button>
            </div>

            {/* Subtext info panel for demo context */}
            {ballotState === "stamped" && (
              <div className="w-full bg-brand-lime/10 border border-brand-lime/20 p-2.5 text-left border-dashed mt-1">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <span className="inline-block bg-brand-lime text-on-surface text-[10px] font-black uppercase px-1.5 py-0.5 tracking-wider border border-on-surface mb-1 select-none">
                      DEMO OK
                    </span>
                    <p className="text-xs font-mono leading-tight text-brand-lime-700">
                      Ballot stamped locally. Cloud voting is not live yet.
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0 mt-1 sm:mt-0">
                    <span className="text-[7px] font-mono text-on-surface/30 uppercase tracking-widest leading-none block mb-1">
                      Demo sandbox tools
                    </span>
                    <div className="flex gap-1.5 justify-end">
                      <button
                        type="button"
                        onClick={() => setBallotState("locked")}
                        className="text-[8px] font-mono font-black uppercase tracking-wider bg-on-surface text-white hover:bg-brand-orange hover:text-white transition-colors px-2 py-1 border border-on-surface"
                      >
                        🔒 Demo Lock
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setBallotState("idle");
                          setVotes({});
                        }}
                        className="text-[8px] font-mono font-bold uppercase tracking-wider bg-white hover:bg-on-surface/10 hover:text-on-surface text-on-surface/80 transition-colors px-2 py-1 border border-on-surface/20"
                      >
                        🔄 Demo Reset
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {ballotState === "locked" && (
              <div className="w-full bg-on-surface/5 border border-on-surface/10 p-2.5 text-left mt-1">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <span className="inline-block bg-on-surface text-white text-[8px] font-black uppercase px-1.5 py-0.5 tracking-wider border border-on-surface mb-1 select-none">
                      LOCKED
                    </span>
                    <p className="text-[10px] font-mono leading-tight text-on-surface/50">
                      Demo ballot locked in. Ballot selections locked until
                      reset.
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0 mt-1 sm:mt-0">
                    <span className="text-[7px] font-mono text-on-surface/30 uppercase tracking-widest leading-none block mb-1">
                      Demo sandbox tools
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setBallotState("idle");
                        setVotes({});
                      }}
                      className="text-[8px] font-mono font-bold uppercase tracking-wider bg-white hover:bg-on-surface/10 hover:text-on-surface text-on-surface/80 transition-colors px-2 py-1 border border-on-surface/25"
                    >
                      🔄 Demo Unlock & Reset
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// --- MAIN PAGE LAYOUT ---

export default function BigBoardPage() {
  const {
    user,
    profile,
    xp,
    points,
    completedCoreChallenges,
    isCrewUnlocked,
    isFieldCheckUnlocked,
    isTribunalUnlocked,
    currentWeekNumber,
    activeSeason,
    crewArtifacts,
    blockedIds,
    onboardingCompletedCount,
    memories,
    fieldTokens,
    soloTripsCount,
    badgeProgress,
    approvedCompletedChallengeIds,
    isAdmin,
    unlockDiscoverySticker,
    entries
  } = useApp();
  const { skin, frankieMode, fc } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<"standings" | "proofs" | "pulse">("standings");
  const [showBrokenProofs, setShowBrokenProofs] = useState(false);
  const [selectedBadgeId, setSelectedBadgeId] = useState<string | null>(null);
  const [badgeFilter, setBadgeFilter] = useState<
    "all" | "earned" | "in-progress" | "locked"
  >("all");
  const [catalyst, setCatalyst] = useState<any>(null);

  const [approvedSubmissions, setApprovedSubmissions] = useState<Entry[]>([]);

  useEffect(() => {
    const userId = profile?.id || user?.uid;
    if (userId) {
      getApprovedSubmissionsForUser(userId)
        .then(subs => {
          setApprovedSubmissions(subs);
        })
        .catch(err => {
          console.error("[BigBoard] Error fetching approved submissions:", err);
        });
    }
  }, [profile?.id, user?.uid]);

  useEffect(() => {
    let active = true;
    const fetchCatalyst = async () => {
      try {
        const seasonId = activeSeason?.id || 'dev-season-2026';
        const weekNum = currentWeekNumber || 1;
        const cat = await getCatalystForWeek(seasonId, weekNum);
        if (active) {
          setCatalyst(cat);
        }
      } catch (err) {
        console.warn("[BigBoard] fetchCatalyst error:", err);
      }
    };
    fetchCatalyst();
    return () => { active = false; };
  }, [activeSeason?.id, currentWeekNumber]);

  // Tab change triggers DISABLED for phased rollout
  useEffect(() => {
    // if (activeTab === 'standings') unlockDiscoverySticker('standings_open', 'bigboard');
    // if (activeTab === 'proofs') unlockDiscoverySticker('proofs_tab_open', 'bigboard');
    // if (activeTab === 'pulse') unlockDiscoverySticker('stats_open', 'bigboard');
  }, [activeTab, unlockDiscoverySticker]);
  const approvedEntriesCount = approvedCompletedChallengeIds.size;
  const [crewTab, setCrewTab] = useState<
    "home" | "lore" | "members" | "stats" | "dispatch"
  >("home");

  // Reset scroll on tab changes
  useEffect(() => {
    const resetScroll = () => {
      window.scrollTo({ top: 0, behavior: "instant" as any });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };
    resetScroll();
    requestAnimationFrame(resetScroll);
  }, [activeTab, crewTab]);

  const toggleTab = (tabId: "standings" | "proofs" | "pulse") => {
    setActiveTab(tabId);
  };

  const ranksData = DEV_APP_CONFIG.levelThresholds.map((t) => {
    const labels = ["New Explorer", "Star Scout", "Adventure Master", "Fieldtrip Legend"];
    const descriptions = [
      "A fresh face ready to find some stickers and explore the neighborhood.",
      "Experienced explorer with a growing pile of weird little discoveries.",
      "A true pro who knows every secret spot and has logged countless findings.",
      "The ultimate collector of stories and stickers. A true legend of the field.",
    ];
    const rewards = [
      "Unlocks base tools & entrance clearance",
      "Unlocks advanced photo filters & custom stickers",
      "Unlocks Sabotage Jammer & exclusive markers",
      "Unlocks Golden Crown frame & ultimate prestige",
    ];
    const icons = [
      LucideIcons.Shield,
      LucideIcons.BarChart3,
      LucideIcons.Trophy,
      LucideIcons.Crown,
    ];

    return {
      level: t.level,
      label: labels[t.level - 1],
      xpRequired: t.minXP,
      description: descriptions[t.level - 1],
      reward: rewards[t.level - 1],
      unlocked: (xp || 0) >= t.minXP,
      icon: icons[t.level - 1],
    };
  });

  const currentRank =
    ranksData.filter((r) => r.unlocked).slice(-1)[0] || ranksData[0];
  const nextRank =
    ranksData.find((r) => r.level === currentRank.level + 1) || null;

  const nextRankXpNeeded = nextRank ? nextRank.xpRequired : 1000;
  const currentRankXpLimit = currentRank.xpRequired;
  const progressToNextRankPercent = nextRank
    ? Math.min(
        100,
        Math.round(
          ((xp - currentRankXpLimit) /
            (nextRankXpNeeded - currentRankXpLimit)) *
            100,
        ),
      )
    : 100;

  const userBadgeList = BADGE_DEFINITIONS.map((badge) => {
    const prog = badgeProgress?.find((p) => p.badgeId === badge.id) || {
      fragmentCount: 0,
      isUnlocked: false,
    };
    return {
      ...badge,
      fragmentCount: prog.fragmentCount || 0,
      isUnlocked: !!prog.isUnlocked,
      status: prog.isUnlocked
        ? "earned"
        : (prog.fragmentCount || 0) > 0
          ? "in-progress"
          : "locked",
    };
  });

  const filteredBadges = userBadgeList.filter((b) => {
    if (badgeFilter === "all") return true;
    if (badgeFilter === "earned") return b.isUnlocked;
    if (badgeFilter === "in-progress") return b.status === "in-progress";
    if (badgeFilter === "locked") return b.status === "locked";
    return true;
  });

  const getBadgeHint = (id: string, description: string) => {
    const hints: Record<string, string> = {
      "night-owl": "Submit field notes between 8 PM and 4 AM local time.",
      "food-goblin":
        "Log grease-stained culinary fuel or taste test logs in the field.",
      "main-character":
        "Log photos with clear portrait/selfie presence or lens flares.",
      "soft-criminal": "Challenge boundaries by submitting Social Spark tags.",
      "grass-contact":
        "Proof of exit: log Discovery or outdoor flora/fauna elements.",
      "receipt-gremlin":
        "Snap direct proof of thermal receipts or financial transaction papers.",
      "crew-witness":
        "Complete and approve missions with active Crew affiliations.",
      "chaos-archivist":
        "Record highly suspicious anomalies and write descriptive reports.",
      "detour-magnet":
        "Navigate off-path coordinates or log detour exploration entries.",
      "comeback-creature":
        "Make a high-intensity rank jump from lower half to top 3 during a season cycle.",
      "lens-flare-expert":
        "Submit photo proof with premium composition and light saturation.",
      "first-mission":
        "Initiate first protocol by completing the onboarding field challenge.",
      "photo-veteran":
        "Expose and upload 5 separate high-resolution media proof attachments.",
      "field-master":
        "Deliver solid evidence for 5 distinct major Field Challenges.",
      "gourmet-goblin":
        "Achieve victory in a high-stakes local flavor and meal test challenge.",
      uncatchable:
        "Survive a full board check without needing any score repairs.",
      "auditor-honor":
        "Approve irregular logs or identify anomalous duplicates during voting sweeps.",
      "chaos-bringer":
        "Log challenges with active chaotic modifier cards turned on.",
      "survivor-spirit":
        "Maintain steady data streams and clear missions despite active rival sabotages.",
      "gallery-winner":
        "Acquire collective consensus on the best photographic log of the week.",
      "season-crown":
        "Bring Heatwave recon to finality by conquering the final Season-End event.",
    };
    return hints[id] || description;
  };

  // Progress calculation
  const progressPercent = Math.min(
    100,
    Math.round((fieldTokens / SEASON_TOKEN_GOAL) * 100),
  );
  const userMarker =
    MARKER_STICKERS.find(
      (s) =>
        s.id ===
        (profile?.preferences?.selectedMarkerStickerId || "default-scout"),
    ) || MARKER_STICKERS[0];

  // For beta, we just show the user's progress.
  // TODO: In future, fetch other crew members' progress and markers.
  const activeTrailMembers =
    profile?.preferences?.showOnBigBoard !== false
      ? [
          {
            id: user?.uid || "me",
            name: profile?.name || "Explorer",
            progress: progressPercent,
            marker: userMarker,
            isMe: true,
            showPoints: profile?.preferences?.showExactPoints,
            tokens: fieldTokens,
            missions: approvedEntriesCount,
            memories: memories?.length || 0,
          },
        ]
      : [];
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary | null>(
    null,
  );
  const [fullBoard, setFullBoard] = useState<UserProfile[]>([]);
  const [loadingBatch, setLoadingBatch] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [recentActivity, setRecentActivity] = useState<ScoreEvent[]>([]);
  const [publicProofs, setPublicProofs] = useState<Entry[]>([]);

  // Crew specific state
  const [crew, setCrew] = useState<CrewType | null>(null);
  const [lore, setLore] = useState<CrewLore | null>(null);
  const [dispatch, setDispatch] = useState<CrewDispatch | null>(null);
  const crewId = profile?.crewId;
  const [hasEarnedBonus, setHasEarnedBonus] = useState(false);

  useEffect(() => {
    if (!user || !currentWeekNumber) return;
    async function checkBonusState() {
      try {
        const activeBonus = getActiveWeeklyBonus(currentWeekNumber);
        if (activeBonus) {
          const earned = await hasUserEarnedWeeklyBonusThisWeek(
            user!.uid,
            currentWeekNumber,
            activeBonus.id,
          );
          setHasEarnedBonus(earned);
        }
      } catch (err) {
        console.warn("[BigBoard] checkBonusState failed:", err);
      }
    }
    checkBonusState();
  }, [user, currentWeekNumber, fullBoard]);

  const isBaja = skin.id === "baja-bratz";
  const isDiamond = skin.id === "slippery-diamond";
  const isHeat = skin.id === "heatwave";

  const [phase, setPhase] = useState(() => {
    const now = getServerDate();
    const cycle = getCurrentVotingCycle(now);
    return getVotingPhase(now, cycle);
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = getServerDate();
      const cycle = getCurrentVotingCycle(now);
      setPhase(getVotingPhase(now, cycle));
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user || !activeSeason?.id || !currentWeekNumber) return;
    async function loadSummary() {
      try {
        // Awards/records only release during the Sunday awards phase
        if (phase !== 'awards') {
          setWeeklySummary(null);
          return;
        }

        const summary = await getWeeklySummary(
          activeSeason!.id,
          currentWeekNumber,
        );

        if (summary?.isLocked) {
          setWeeklySummary(summary);
        } else {
          setWeeklySummary(null);
        }
      } catch (err) {
        console.warn("[BigBoard] loadSummary failed:", err);
      }
    }
    loadSummary();
  }, [user, activeSeason?.id, currentWeekNumber, phase]);

  useEffect(() => {
    if (!user) return;
    async function loadInit() {
      setLoadingBatch(true);
      try {
        const result = await getLeaderboardPage(15);
        if (result) {
          setFullBoard(result.docs);
          setLastVisible(result.lastVisible);
          setHasMore(result.docs.length === 15);
        }
      } catch (err) {
        console.error("[BigBoard] loadInit failed:", err);
      }
      setLoadingBatch(false);
    }
    loadInit();
  }, [user]);

  useEffect(() => {
    const unsub = subscribeToRecentScoreEvents(15, setRecentActivity);
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = subscribeToPublicProofs(30, (entries: any[]) => {
      setPublicProofs(entries as Entry[]);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!crewId || !isCrewUnlocked) return;
    async function loadCrewData() {
      try {
        const c = await getCrew(crewId!);
        if (c) {
          setCrew(c);
          const l = await getCrewLore(crewId!);
          setLore(l);
          const d = await getLatestDispatch(crewId!);
          setDispatch(d);
        }
      } catch (err) {
        console.warn("[BigBoard] loadCrewData failed:", err);
      }
    }
    loadCrewData();
  }, [crewId, isCrewUnlocked]);

  const loadMore = async () => {
    if (loadingBatch || !hasMore) return;
    setLoadingBatch(true);
    const result = await getLeaderboardPage(15, lastVisible);
    if (result) {
      setFullBoard((prev) => [...prev, ...result.docs]);
      setLastVisible(result.lastVisible);
      setHasMore(result.docs.length === 150 / 10);
    }
    setLoadingBatch(false);
  };

  const visibleActivity = recentActivity.filter(
    (event) => !blockedIds.includes(event.userId),
  );
  const fieldTypeData = profile?.fieldType
    ? FIELD_TYPES[profile.fieldType]
    : null;

  const playerRankings = useMemo(() => {
    const rawRanks = weeklySummary
      ? Object.entries(weeklySummary.playerStats)
          .map(([id, stats]: [string, any]) => ({
            id,
            name: stats.userName,
            xp: stats.xp !== undefined ? stats.xp : stats.points,
            fieldTypeName: stats.fieldTypeName,
            avatar: stats.userAvatar,
          }))
          .sort((a, b) => b.xp - a.xp)
      : fullBoard.map(u => ({ ...u, xp: u.xp !== undefined ? u.xp : (u as any).points }));

    const updated = rawRanks.map((u: any) => {
      if (user && u.id === user.uid && profile) {
        return {
          ...u,
          name: profile.name || u.name,
          xp: profile.xp !== undefined ? profile.xp : (profile.points !== undefined ? profile.points : u.xp),
          fieldTypeName: profile.fieldTypeName || u.fieldTypeName,
          avatar: profile.avatar || u.avatar,
        };
      }
      return u;
    });

    return [...updated].sort((a: any, b: any) => b.xp - a.xp);
  }, [weeklySummary, fullBoard, user, profile]);

  const lastUserScoreEvent = recentActivity.find(
    (event) => event.userId === user?.uid,
  );

  const crewRankings = weeklySummary
    ? Object.entries(weeklySummary.crewStats)
        .map(([id, stats]: [string, any]) => ({
          id,
          name: stats.crewName,
          score: stats.totalScore,
        }))
        .sort((a, b) => b.score - a.score)
    : [];

  const crewStanding = weeklySummary?.crewStats?.[crewId!] || null;
  const crewRank = weeklySummary
    ? Object.entries(weeklySummary.crewStats)
        .sort(([, a]: any, [, b]: any) => b.totalScore - a.totalScore)
        .findIndex(([id]) => id === crewId) + 1
    : 0;

  const crewTabs = [
    { id: "home", label: "Identity", icon: Users },
    { id: "lore", label: "Lore", icon: MessageSquare },
    { id: "stats", label: "Stats", icon: BarChart3 },
    { id: "dispatch", label: "Dispatch", icon: Sparkles },
  ];

  const userWeeklyRank =
    playerRankings.findIndex((u: any) => u.id === user?.uid) + 1;

  const mergedProofs = useMemo(() => {
    const userPending = (entries || []).filter(e => {
      const status = normalizeEntryStatus(e.status);
      return status === 'pending_review' || status === 'needs_more_proof';
    });
    
    // Apply temporary filter to publicProofs as requested
    const filteredPublic = publicProofs.filter(p => {
      const isApproved = normalizeEntryStatus(p.status) === 'approved';
      const hasPhoto = !!(p.photoUrl || p.imageUrl);
      
      if (isApproved) {
        if (!hasPhoto) {
          // If admin triggers showBrokenProofs, we can bypass the filtering
          if (isAdmin && showBrokenProofs) {
            return true;
          }
          return false;
        }
      }
      return true;
    });

    // Combine, deduplicate by ID, and sort
    const combined = [...userPending, ...filteredPublic];
    const seen = new Set();
    return combined.filter(p => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    }).sort((a, b) => {
      const ta = (a.approvedAt?.seconds || a.createdAt?.seconds || 0);
      const tb = (b.approvedAt?.seconds || b.createdAt?.seconds || 0);
      return tb - ta;
    });
  }, [entries, publicProofs, isAdmin, showBrokenProofs]);

  // Development-only logs for verification in BigBoard
  useEffect(() => {
    if (import.meta.env.DEV) {
      const approvedCount = approvedSubmissions.length;

      const pointsAwardedStatus = approvedSubmissions.map(e => ({
        id: e.id,
        status: e.status,
        pointsAwarded: e.pointsAwarded !== undefined ? e.pointsAwarded : (e as any).finalPointsAwarded
      }));

      console.log("[DEV_LOG] [BigBoard] Syncing HQ Canonical Data:", {
        sourceCollection: "entries (via transaction query)",
        userId: user?.uid || "N/A",
        activeFilters: { userId: user?.uid, status: "approved" },
        resultingApprovedCount: approvedCount,
        mergedProofsTotalCount: mergedProofs.length,
        pointsAwardedMap: pointsAwardedStatus,
        timestamp: new Date().toISOString()
      });
    }
  }, [mergedProofs, approvedSubmissions, user?.uid]);

  return (
    <div className="page-scroll pt-6 sm:pt-12 px-2 sm:px-8 space-y-4 sm:space-y-24 max-w-full mx-auto relative bg-paper ft-paper-texture">
      {/* Global Grain Overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-50 bg-[url('https://www.transparenttextures.com/patterns/felt.png')]" />
      
      {/* Visual Spiral Notebook Rings at the top */}
      <div className="w-full flex justify-center py-1 opacity-55 z-20 relative select-none pointer-events-none mb-3">
        <div className="h-4 w-60 border-y-2 border-on-surface bg-[#EAE5D8] flex justify-between px-4 rounded-full shadow-[inset_0_2px_4.5px_rgba(0,0,0,0.15)]">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-2.5 h-6 bg-slate-400 border-2 border-on-surface rounded-full -mt-1 shadow" />
          ))}
        </div>
      </div>

      <FieldPageHero
        eyebrow={getDisplayLabel('FIELD_HQ_BOARD')}
        title="BIG BOARD"
        subtitle="Sector 7-B // Public Status Board"
        backgroundIcon={<Trophy className="w-64 h-64" />}
        infoCardLabel="FIELD STATUS"
        infoCardValue={
          <div className="flex flex-col gap-2 font-sans text-left mt-1 w-full min-w-[200px]">
            <div className="space-y-0.5">
              <div className="text-xs font-mono font-black uppercase text-brand-orange leading-tight">
                {phase === 'submission' ? 'Adventure Window Open' :
                 phase === 'voting' ? 'Voting Open' :
                 phase === 'awards' ? 'Awards Phase' : 'Off-Season'}
              </div>
              <p className="text-[10px] text-on-surface/70 leading-normal font-medium max-w-[220px]">
                {phase === 'submission' ? 'Approved receipts are feeding the board. Voting opens Saturday.' :
                 phase === 'voting' ? 'The community ballot is live. Cast your endorsements!' :
                 phase === 'awards' ? 'Weekly summary finalized and honors distributed.' : 
                 'No active community ops currently scheduled.'}
              </p>
            </div>
            
            <div className="h-px bg-on-surface/10 border-t border-dashed my-1" />
            
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono select-none">
              <div>
                <div className="text-on-surface/40 uppercase font-black text-[8px] tracking-wide">Approved Proofs</div>
                <div className="text-xs font-black text-on-surface mt-0.5">
                  {approvedEntriesCount > 0 ? `${approvedEntriesCount} Logged` : '0 Logged'}
                </div>
              </div>
              <div>
                <div className="text-on-surface/40 uppercase font-black text-[8px] tracking-wide">Your Standing</div>
                <div className="text-xs font-black text-on-surface mt-0.5">
                  {userWeeklyRank ? `#${userWeeklyRank}` : 'Unranked'}
                </div>
              </div>
            </div>

            {catalyst && (
              <>
                <div className="h-px bg-on-surface/10 border-t border-dashed my-1" />
                <div className="flex items-center gap-1.5 bg-brand-orange/5 p-1 border border-brand-orange/10 rounded">
                  <span className="w-1.5 h-1.5 bg-brand-orange rounded-full animate-ping shrink-0" />
                  <span className="text-[8px] sm:text-[9px] font-mono font-black text-[#EA580C] uppercase tracking-tight leading-none truncate max-w-[210px]">
                    {catalyst.shortLabel || catalyst.title} · {catalyst.multiplier}x
                  </span>
                </div>
              </>
            )}
          </div>
        }
        infoCardSubtext=""
        infoCardAccent="lime"
        tabs={[
          { id: "standings", label: "Standings" },
          { id: "proofs", label: "Proofs" },
          { id: "pulse", label: "Field Pulse" },
        ]}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as any)}
      />

      {/* Main Content Area */}
      <main className="relative z-10 w-full min-h-[600px] mb-32">
        <AnimatePresence mode="wait">
          {activeTab === "standings" && (
            <motion.section
              key="standings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-6xl mx-auto space-y-12 p-4 sm:p-8"
            >
              <div className="relative w-full overflow-hidden">
                <div className="bg-white border-[3px] border-on-surface p-4 sm:p-12 rounded-[2rem] sm:rounded-[2.5rem] shadow-[12px_12px_0px_black] relative overflow-hidden ft-gloss-highlight">
                  <div className="absolute inset-0 bg-brand-yellow/[0.03] pointer-events-none" />
                  <div className="absolute inset-0 bg-[radial-gradient(rgba(0,0,0,0.012)_1.5px,transparent_0)] bg-[size:12px_12px] opacity-40 pointer-events-none" />
                  
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 sm:gap-8 mb-8 sm:mb-16 relative z-10">
                    <div className="text-left space-y-2 sm:space-y-3 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-magenta text-white border-2 border-on-surface shadow-[3px_3px_0px_black]">
                          <span className="text-[8px] sm:text-[10px] font-mono font-black uppercase tracking-[0.2em]">GLOBAL_RANKINGS</span>
                        </div>
                        {isAdmin && (
                          <button 
                             onClick={() => navigate('/admin')}
                             className="inline-flex items-center gap-2 px-3 py-1 bg-on-surface text-white border-2 border-on-surface shadow-[3px_3px_0px_var(--color-brand-orange)] hover:bg-brand-orange transition-all animate-in fade-in"
                          >
                             <LucideIcons.Shield className="w-3 h-3 sm:w-4 sm:h-4" />
                             <span className="text-[8px] sm:text-[10px] font-mono font-black uppercase tracking-widest italic">Bureau Desk</span>
                          </button>
                        )}
                      </div>
                      <h2 className="text-4xl sm:text-7xl lg:text-8xl font-display font-black uppercase italic tracking-tighter text-on-surface leading-none drop-shadow-[2px_2px_0px_white] sm:drop-shadow-[4px_4px_0px_white] break-words">
                        Top Operatives
                      </h2>
                    </div>
                  </div>

                  {playerRankings.length === 0 ? (
                    <div className="py-16 text-center space-y-4 bg-on-surface/[0.02] border-4 border-dashed border-on-surface/20 p-8 rounded-[1.5rem] relative">
                      <div className="absolute top-2 right-2 text-on-surface/5 font-mono text-[9px] font-black uppercase tracking-widest">
                        STANDINGS_EMPTY
                      </div>
                      <div className="inline-flex items-center justify-center w-12 h-12 bg-white border-4 border-on-surface rounded-full shadow-[3px_3px_0px_black]">
                        <LucideIcons.Trophy className="w-6 h-6 text-brand-orange animate-pulse" />
                      </div>
                      <div className="space-y-2">
                        <p className="font-outfit text-base font-black uppercase tracking-widest text-on-surface italic">
                          Board Waiting For Transmissions
                        </p>
                        <p className="text-xs font-sans max-w-md mx-auto text-on-surface/70 leading-relaxed">
                          No standings yet. Approved proofs will appear here once the field starts producing receipts.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 sm:space-y-4 relative z-10">
                      {playerRankings.map((player: any, idx: number) => {
                        const isMe = player.id === user?.uid;
                        const rank = idx + 1;
                        return (
                          <div 
                            key={player.id}
                            className={cn(
                              "flex items-center justify-between p-3 sm:p-5 border-[3px] border-on-surface transition-all group overflow-hidden relative cursor-default",
                              isMe 
                                ? "bg-brand-yellow shadow-[6px_6px_0px_black] -translate-x-1 -translate-y-1" 
                                : "bg-[#FCFBF8] shadow-[2px_2px_0px_rgba(0,0,0,0.05)]"
                            )}
                          >
                            <div className="flex items-center gap-3 sm:gap-6 min-w-0">
                              <span className={cn(
                                "text-xl sm:text-4xl font-display font-black italic w-8 sm:w-16 shrink-0",
                                rank <= 3 ? "text-brand-orange" : "text-on-surface/20"
                              )}>
                                #{rank}
                              </span>
                              <AvatarPreview 
                                avatar={player.avatar || DEFAULT_AVATAR}
                                size="sm"
                                className="w-10 h-10 sm:w-16 sm:h-16 border-2 sm:border-4 border-on-surface rounded-xl sm:rounded-2xl transition-transform shrink-0"
                              />
                              <div className="text-left min-w-0">
                                <h4 className="text-sm sm:text-2xl font-display font-black uppercase italic text-on-surface truncate">
                                  {player.name}
                                  {isMe && <span className="ml-1 text-[8px] sm:text-xs font-mono text-brand-orange uppercase">(YOU)</span>}
                                </h4>
                                <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5">
                                  <span className="text-[8px] sm:text-[10px] font-mono font-black uppercase text-on-surface/30 truncate">
                                    {player.fieldTypeName || 'EXPLORER'}
                                  </span>
                                  {rank === 1 && <LucideIcons.Crown className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-brand-orange" />}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-1 sm:gap-2 shrink-0 ml-2">
                              <div className="bg-on-surface text-white px-2 py-1 sm:px-5 sm:py-2 border-2 border-on-surface shadow-[2px_2px_0px_var(--color-brand-cyan)] sm:shadow-[4px_4px_0px_var(--color-brand-cyan)] font-display text-sm sm:text-2xl font-black italic">
                                {player.xp} XP
                              </div>
                              <div className="flex items-center gap-1 px-1 opacity-40">
                                 <LucideIcons.TrendingUp className="w-2 h-2 sm:w-3 sm:h-3" />
                                 <span className="text-[7px] sm:text-[9px] font-mono font-black uppercase">STABLE</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </motion.section>
          )}

          {activeTab === "proofs" && (
            <motion.section
              key="proofs"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-6xl mx-auto space-y-16 p-4 sm:p-8"
            >
              <div className="text-center space-y-2 sm:space-y-4">
                <h2 className="text-3xl sm:text-7xl font-display font-black uppercase italic tracking-tighter text-on-surface leading-tight">Community Feed</h2>
                <p className="font-serif italic text-base sm:text-xl text-on-surface/50 px-4 leading-relaxed">Approved receipts from people who went outside and found something.</p>
                
                {isAdmin && (
                  <div className="flex justify-center pt-2">
                    <button
                      onClick={() => setShowBrokenProofs(prev => !prev)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 font-mono text-xs font-black uppercase tracking-wider rounded-xl border-2 transition-all duration-300",
                        showBrokenProofs 
                          ? "bg-red-500 text-white border-on-surface shadow-[4px_4px_0px_black] active:translate-y-0.5 active:shadow-none" 
                          : "bg-neutral-100 text-on-surface/60 border-on-surface/25 hover:border-on-surface hover:text-on-surface shadow-[2px_2px_0px_rgba(0,0,0,0.1)]"
                      )}
                    >
                      <LucideIcons.AlertTriangle className="w-4 h-4 text-amber-500" />
                      <span>Show Broken Approved Proofs: {showBrokenProofs ? "ON (DEBUG)" : "OFF"}</span>
                    </button>
                  </div>
                )}
              </div>

              {mergedProofs.length === 0 ? (
                <div className="max-w-xl mx-auto py-16 text-center space-y-4 bg-white border-4 border-on-surface p-8 rounded-[1.5rem] shadow-[8px_8px_0px_black] relative">
                  <div className="absolute top-2 right-2 text-on-surface/5 font-mono text-[9px] font-black uppercase tracking-widest">
                    PROOFS_EMPTY
                  </div>
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-brand-yellow/10 border-4 border-on-surface rounded-full shadow-[3px_3px_0px_black]">
                    <LucideIcons.CameraOff className="w-6 h-6 text-brand-orange animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <p className="font-outfit text-base font-black uppercase tracking-widest text-on-surface italic">
                      Silent Spectrum
                    </p>
                    <p className="text-xs font-sans text-on-surface/70 leading-relaxed">
                      No approved proofs yet. The field is suspiciously quiet.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-4">
                  {mergedProofs.map((proof) => (
                    <CommunityProofCard key={proof.id} proof={proof} normalizeEntryStatus={normalizeEntryStatus} />
                  ))}
                </div>
              )}
            </motion.section>
          )}

          {activeTab === "pulse" && (
            <motion.section
              key="pulse"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-5xl mx-auto space-y-12 p-4 sm:p-8 text-on-surface"
            >
              {/* Paper Grid Visual Backwash */}
              <div className="bg-white/40 backdrop-blur-md border-[3px] border-on-surface rounded-[2rem] p-6 sm:p-10 shadow-[10px_10px_0px_black] bg-[radial-gradient(#e5e7eb_1.5px,transparent_1.5px)] [background-size:16px_16px] space-y-10">
                
                {/* Stats Card Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   <StickerStatCard 
                     title="Weekly Field XP"
                     value={xp || 0}
                     variant="orange"
                     icon={LucideIcons.Zap}
                     subtext="Aggregated signal yield"
                   />
                   <StickerStatCard 
                     title="Approved Proofs"
                     value={approvedEntriesCount || 0}
                     variant="lime"
                     icon={LucideIcons.CheckCircle}
                     subtext={`${fieldTokens || 0} sectors logged`}
                   />
                   <StickerStatCard 
                     title="Current Standing"
                     value={userWeeklyRank ? `#${userWeeklyRank}` : '--'}
                     variant="cyan"
                     icon={LucideIcons.TrendingUp}
                     subtext="Percentile coordinates"
                   />
                </div>

                {/* Second Level: Momentum and Voting State */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 text-left items-stretch">
                   
                   {/* Field Momentum (Column span: 2) */}
                   <div className="lg:col-span-2 flex flex-col justify-between">
                     <ProgressStickerCard
                       title="Field Momentum"
                       value={`${xp || 0} / ${nextRankXpNeeded} XP`}
                       subtext={`Goal: ${nextRank?.label || 'Max Level Reached'}`}
                       percent={progressToNextRankPercent}
                     />
                     
                     {/* Weekly Catalyst Display if available */}
                     {catalyst && (
                       <div className="bg-[#FAF9F5] border-[3.5px] border-on-surface p-6 rounded-2xl relative overflow-hidden group select-none bg-[radial-gradient(#E5DEC2_1.2px,transparent_1.2px)] [background-size:14px_14px] shadow-[6px_6px_0px_black]">
                         <div className="absolute top-[-7px] left-[10%] w-14 h-5.5 bg-brand-magenta/80 border border-brand-magenta/30 backdrop-blur-[0.5px] -rotate-12 z-20 pointer-events-none opacity-90 shadow-sm" />
                         <div className="hidden" />
                         
                         <div className="flex justify-between items-start">
                           <div className="space-y-1">
                             <span className="text-[9px] font-mono font-black uppercase text-brand-magenta tracking-widest leading-none bg-brand-magenta/15 border border-brand-magenta/30 px-2.5 py-0.5 rounded">ACTIVE_WEEKLY_CATALYST</span>
                             <h4 className="text-xl font-display font-black uppercase italic text-on-surface leading-tight">{catalyst.title}</h4>
                             <p className="text-xs font-serif italic text-on-surface/65 leading-relaxed pr-8">{catalyst.description}</p>
                           </div>
                           <div className="bg-brand-magenta text-white font-mono text-xs font-black uppercase px-3.5 py-2 border-3 border-on-surface shadow-[4px_4px_0px_#000000] shrink-0 rotate-[4deg] hover:rotate-0 transition-transform">
                             {catalyst.multiplier}X Boost
                           </div>
                         </div>
                       </div>
                     )}
                   </div>

                   {/* Voting State Tracker Card (Column span: 1) */}
                   <div className="space-y-6 flex flex-col justify-between">
                     <div className="bg-[#FAF9F5] border-[3.5px] border-on-surface p-6 shadow-[8px_8px_0px_black] rounded-2xl flex flex-col justify-between h-full relative overflow-hidden bg-[radial-gradient(#E5DEC2_1.2px,transparent_1.2px)] [background-size:14px_14px]">
                       <div className="absolute top-[-6px] right-[15%] w-14 h-5 bg-[#FDE047]/80 border border-[#EAB308]/30 backdrop-blur-[0.5px] rotate-12 z-20 pointer-events-none opacity-95 shadow-sm">
                         
                       </div>
                       
                       <div className="space-y-3">
                         <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-brand-cyan/15 border-2 border-brand-cyan text-on-surface text-[10px] font-mono font-black uppercase tracking-wider rounded-md rotate-[-1deg]">
                           <span className={cn("w-1.5 h-1.5 rounded-full block", phase === 'voting' ? "bg-brand-lime animate-ping" : "bg-on-surface/40")} />
                           {phase === 'submission' ? 'Adventure Phase' : phase === 'voting' ? 'Ballot Live' : 'Awards Active'}
                         </div>
                         
                         <h4 className="text-xl font-display font-black uppercase italic leading-none text-on-surface">Weekly Pulse</h4>
                         <p className="text-xs font-sans text-on-surface/70 leading-relaxed">
                           {phase === 'submission' ? 'Everyone is out collecting receipts. Voting opens Saturday at midnight UTC.' :
                            phase === 'voting' ? 'Ballot box is open! Go admire everyone else’s finds in the Feed.' :
                            'Weekly summary finalized. Honors distributed. Resetting for the next cycle.'}
                         </p>
                       </div>
                       
                       <div className="mt-6 pt-4 border-t-2 border-dashed border-on-surface/10 text-[9px] font-mono text-on-surface/50 uppercase font-black leading-none flex justify-between font-extrabold">
                         <span>Timeline Node</span>
                         <span className="text-brand-orange font-extrabold bg-brand-orange/10 border border-brand-orange/20 px-1.5 py-0.5 rounded leading-none">
                           {phase === 'submission' ? 'Saturday Close' : 'Sunday Launch'}
                         </span>
                       </div>
                     </div>
                   </div>

                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// Helpers for background assets
function HibiscusDecor() {
  return (
    <>
      <Hibiscus className="absolute top-10 right-[-40px] w-64 h-64 opacity-10 -z-10" />
      <Hibiscus className="absolute bottom-20 left-[-60px] w-80 h-80 opacity-5 -z-10 rotate-12" />
      <ChromeStar className="absolute top-40 left-10 w-12 h-12 opacity-30 -z-10" />
    </>
  );
}

function DiamondDecor() {
  return (
    <>
      <DiamondStar className="absolute top-20 left-[-20px] w-48 h-48 text-white opacity-5 -z-10" />
      <Sparkle className="absolute top-1/4 right-0 w-12 h-12 text-white opacity-10 animate-pulse -z-10" />
      <div className="absolute inset-0 liquid-chrome opacity-5 pointer-events-none -z-20" />
    </>
  );
}

function HeatDecor() {
  return (
    <>
      <SunFlare className="absolute top-40 right-[-100px] w-80 h-80" />
      <div className="absolute inset-x-0 bottom-1/4 h-1 bg-white/20 -skew-y-3 -z-10" />
    </>
  );
}
