import { Skin } from '../types/skin';

export const STARTER_SKINS: Skin[] = [
  {
    id: 'classic',
    name: 'Classic Fieldtrip',
    slug: 'classic',
    description: 'The original warm paper and sticker adventure style. Familiar, cozy, and ready for exploration.',
    rarity: 'common',
    unlockCondition: 'Unlocked by default',
    status: 'active',
    isDefault: true,
    visualCalmSupported: true,
    previewColors: ['#2D5A27', '#E29578', '#fdf8f5'],
    themeTokens: {
      primaryColor: "#2D5A27",
      secondaryColor: "#E29578",
      backgroundColor: "#fdf8f5",
      cardColor: "#ffffff",
      textColor: "#121212",
      accentColor: "#F4D35E",
      fontHeading: "Inter",
      fontBody: "Inter",
      borderRadius: "24px",
      shadowStyle: "8px 8px 0px rgba(0,0,0,1)"
    },
    assets: {
      logo: "/logo.svg",
      homeSticker: "/stickers/classic_home.svg",
      emptyStateImage: "/illustrations/classic_empty.svg",
      viewfinderFrame: "/frames/classic_viewfinder.svg",
      badgeFrame: "/frames/classic_badge.svg",
      leaderboardIcon: "/icons/classic_trophy.svg",
      fieldSignalIcon: "/icons/classic_signal.svg",
      backgroundTexture: "url('/textures/paper_grain.png')"
    },
    copyOverrides: {
      fieldNotesLabel: "Field Notes",
      viewfinderLabel: "Viewfinder",
      leaderboardLabel: "Big Board",
      crewLoreLabel: "Crew Lore"
    }
  },
  {
    id: 'arcade',
    name: 'Arcade Summer',
    slug: 'arcade',
    description: 'Playful scoreboard and weekly competition style. Bold colors, pixel accents, and high-energy vibes.',
    rarity: 'rare',
    unlockCondition: 'Participate in 3 Weekly Matchups',
    status: 'active',
    isDefault: false,
    visualCalmSupported: true,
    previewColors: ['#FF0055', '#00FF99', '#1A1A1A'],
    themeTokens: {
      primaryColor: "#FF0055",
      secondaryColor: "#00FF99",
      backgroundColor: "#1A1A1A",
      cardColor: "#2A2A2A",
      textColor: "#FFFFFF",
      accentColor: "#FFFF00",
      fontHeading: "Space Grotesk",
      fontBody: "Inter",
      borderRadius: "0px",
      shadowStyle: "4px 4px 0px #00FF99"
    },
    assets: {
      logo: "/logo_arcade.svg",
      homeSticker: "/stickers/arcade_home.svg",
      emptyStateImage: "/illustrations/arcade_empty.svg",
      viewfinderFrame: "/frames/arcade_viewfinder.svg",
      badgeFrame: "/frames/arcade_badge.svg",
      leaderboardIcon: "/icons/arcade_trophy.svg",
      fieldSignalIcon: "/icons/arcade_signal.svg",
      backgroundTexture: "linear-gradient(45deg, #1a1a1a 25%, #222 25%, #222 50%, #1a1a1a 50%, #1a1a1a 75%, #222 75%, #222 100%)"
    },
    copyOverrides: {
      fieldNotesLabel: "Data Log",
      viewfinderLabel: "Scanner",
      leaderboardLabel: "High Scores",
      crewLoreLabel: "Squad Files"
    }
  },
  {
    id: 'journal',
    name: 'Field Journal',
    slug: 'journal',
    description: 'Cozy notebook, stamp, and map style. Soft textures, hand-drawn accents, and a focus on the journey.',
    rarity: 'uncommon',
    unlockCondition: 'Complete 10 Core Challenges',
    status: 'active',
    isDefault: false,
    visualCalmSupported: true,
    previewColors: ['#5C4033', '#8B4513', '#F5F5DC'],
    themeTokens: {
      primaryColor: "#5C4033",
      secondaryColor: "#8B4513",
      backgroundColor: "#F5F5DC",
      cardColor: "#FFF8E7",
      textColor: "#3D2B1F",
      accentColor: "#A0522D",
      fontHeading: "Libre Baskerville",
      fontBody: "Inter",
      borderRadius: "12px",
      shadowStyle: "0px 4px 10px rgba(92, 64, 51, 0.1)"
    },
    assets: {
      logo: "/logo_journal.svg",
      homeSticker: "/stickers/journal_home.svg",
      emptyStateImage: "/illustrations/journal_empty.svg",
      viewfinderFrame: "/frames/journal_viewfinder.svg",
      badgeFrame: "/frames/journal_badge.svg",
      leaderboardIcon: "/icons/journal_trophy.svg",
      fieldSignalIcon: "/icons/journal_signal.svg",
      backgroundTexture: "url('/textures/parchment.png')"
    },
    copyOverrides: {
      fieldNotesLabel: "Observations",
      viewfinderLabel: "Sketchbook",
      leaderboardLabel: "Scout Rankings",
      crewLoreLabel: "Traveler Tales"
    }
  },
  {
    id: 'baja-bratz',
    name: 'Baja Bratz',
    slug: 'baja',
    description: 'Heatwave Receipts limited edition. High-saturation Y2K energy with tropical blue-green gradients and chrome accents.',
    rarity: 'rare',
    unlockCondition: 'Seasonal/Limited - Heatwave Receipts',
    status: 'active',
    isDefault: false,
    visualCalmSupported: false,
    previewColors: ['#00A6FB', '#00F5D4', '#E0FBFC'],
    themeTokens: {
      primaryColor: "#00A6FB",
      secondaryColor: "#00F5D4",
      backgroundColor: "#E0FBFC",
      cardColor: "#ffffff",
      textColor: "#003554",
      accentColor: "#FF0055",
      fontHeading: "Space Grotesk",
      fontBody: "Inter",
      borderRadius: "32px",
      shadowStyle: "12px 12px 0px #00F5D4"
    },
    assets: {
      logo: "/logo_baja.svg",
      homeSticker: "/stickers/baja_home.svg",
      emptyStateImage: "/illustrations/baja_empty.svg",
      viewfinderFrame: "/frames/baja_viewfinder.svg",
      badgeFrame: "/frames/baja_badge.svg",
      leaderboardIcon: "/icons/baja_trophy.svg",
      fieldSignalIcon: "/icons/baja_signal.svg",
      backgroundTexture: "radial-gradient(circle at 50% 50%, rgba(0, 245, 212, 0.1) 0%, rgba(224, 251, 252, 1) 100%)"
    },
    copyOverrides: {
      fieldNotesLabel: "Vacation Log",
      viewfinderLabel: "Snapshot",
      leaderboardLabel: "Beach Heat",
      crewLoreLabel: "Summer Stories"
    }
  }
];
