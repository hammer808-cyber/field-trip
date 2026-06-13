export function getMissionImage(id: string, category?: string, suppliedImage?: string): string {
  // Determine attributes based on category/type to construct an awesome stylized illustration
  const cat = (category || id || '').toLowerCase();
  
  let emoji = '🧭';
  let badgeLabel = 'EXPLORE';
  let patternType = 'grid';
  let accentColor = '#B7FF00'; // neon green / lime
  let secondaryColor = '#00E5FF'; // cyan
  let stampText = 'FIELD UNIT';
  let badgeTitle = 'OP: ADVENTURE';

  if (cat.includes('photo') || cat.includes('evidence') || cat.includes('optics') || cat.includes('camera')) {
    emoji = '📸';
    badgeLabel = 'Ocular Proof';
    patternType = 'dots';
    accentColor = '#FF5A00'; // orange
    secondaryColor = '#000000';
    stampText = 'SECURE SHOT';
    badgeTitle = 'BUREAU OPTICS';
  } else if (cat.includes('recon') || cat.includes('observation') || cat.includes('spy') || cat.includes('find') || cat.includes('spot') || cat.includes('viewfinder')) {
    emoji = '👀';
    badgeLabel = 'Reconnaissance';
    patternType = 'grid';
    accentColor = '#00E5FF'; // cyan
    secondaryColor = '#FF5A00';
    stampText = 'SATELLITE SYNC';
    badgeTitle = 'RECON DATA';
  } else if (cat.includes('social') || cat.includes('crew') || cat.includes('community') || cat.includes('people') || cat.includes('team')) {
    emoji = '👥';
    badgeLabel = 'Crew Vibe';
    patternType = 'stripes';
    accentColor = '#FF5A00'; // orange
    secondaryColor = '#B7FF00';
    stampText = 'COOPERATIVE';
    badgeTitle = 'CREW SYNC';
  } else if (cat.includes('speed') || cat.includes('fast') || cat.includes('time') || cat.includes('quick') || cat.includes('swift')) {
    emoji = '⚡';
    badgeLabel = 'Rapid Find';
    patternType = 'stripes';
    accentColor = '#B7FF00'; // lime
    secondaryColor = '#FF5A00';
    stampText = 'TIME LIMIT';
    badgeTitle = 'SWIFT SIGNAL';
  } else if (cat.includes('create') || cat.includes('creative') || cat.includes('art') || cat.includes('photo-frame') || cat.includes('paint') || cat.includes('canvas')) {
    emoji = '🎨';
    badgeLabel = 'Creative Vibe';
    patternType = 'dots';
    accentColor = '#FF5A00'; // orange
    secondaryColor = '#00E5FF';
    stampText = 'INTERPRETIVE';
    badgeTitle = 'CREATIVE OP';
  } else if (cat.includes('nature') || cat.includes('wilderness') || cat.includes('green') || cat.includes('trail') || cat.includes('forest') || cat.includes('tree')) {
    emoji = '🌿';
    badgeLabel = 'Wild Record';
    patternType = 'grid';
    accentColor = '#B7FF00'; // lime
    secondaryColor = '#00E5FF';
    stampText = 'WILD OBS';
    badgeTitle = 'NATURE INTEL';
  } else if (cat.includes('urban') || cat.includes('city') || cat.includes('streets') || cat.includes('concrete') || cat.includes('mall')) {
    emoji = '🏙️';
    badgeLabel = 'Urban Explorer';
    patternType = 'grid';
    accentColor = '#00E5FF'; // cyan
    secondaryColor = '#FF5A00';
    stampText = 'SPRAWL CORE';
    badgeTitle = 'URBAN OP';
  } else if (cat.includes('food') || cat.includes('drink') || cat.includes('cafe') || cat.includes('rations')) {
    emoji = '🍔';
    badgeLabel = 'Rations Audit';
    patternType = 'dots';
    accentColor = '#FF5A00'; // orange
    secondaryColor = '#B7FF00';
    stampText = 'FUEL RECORD';
    badgeTitle = 'PROVISIONS';
  } else if (cat.includes('night') || cat.includes('dark') || cat.includes('lum') || cat.includes('moon')) {
    emoji = '🌙';
    badgeLabel = 'Midnight Op';
    patternType = 'stripes';
    accentColor = '#00E5FF'; // cyan
    secondaryColor = '#000000';
    stampText = 'NIGHT VISION';
    badgeTitle = 'DARK FEEDS';
  } else if (cat.includes('water') || cat.includes('coast') || cat.includes('blue') || cat.includes('river')) {
    emoji = '💧';
    badgeLabel = 'Hydration Sync';
    patternType = 'grid';
    accentColor = '#00E5FF'; // cyan
    secondaryColor = '#B7FF00';
    stampText = 'WET FEEDS';
    badgeTitle = 'HYDRO SURVEY';
  } else if (cat.includes('mystery') || cat.includes('unknown') || cat.includes('??') || cat.includes('secret')) {
    emoji = '❓';
    badgeLabel = 'Classified';
    patternType = 'stripes';
    accentColor = '#FF5A00'; // orange
    secondaryColor = '#000000';
    stampText = 'RED LOCKED';
    badgeTitle = 'CLASSIFIED';
  }

  // Escape special chars in ID for HTML ID safety
  const safeId = id.replace(/[^a-zA-Z0-9]/g, '');

  const svg = `<svg width="400" height="300" viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Patterns -->
    <pattern id="stripes-${safeId}" width="20" height="20" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="20" stroke="${accentColor}" stroke-width="4" opacity="0.18" />
    </pattern>
    <pattern id="dots-${safeId}" width="16" height="16" patternUnits="userSpaceOnUse">
      <circle cx="4" cy="4" r="2.5" fill="${accentColor}" opacity="0.30" />
    </pattern>
    <pattern id="grid-${safeId}" width="24" height="24" patternUnits="userSpaceOnUse">
      <path d="M 24 0 L 0 0 0 24" fill="none" stroke="${accentColor}" stroke-width="1.5" opacity="0.25" />
    </pattern>
    <filter id="grain-${safeId}" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
      <feColorMatrix type="saturate" values="0" />
      <feComponentTransfer>
        <feFuncA type="linear" slope="0.05" />
      </feComponentTransfer>
      <feComposite operator="in" in2="SourceGraphic" />
    </filter>
  </defs>

  <!-- Solid base card body in clean warm white -->
  <rect x="0" y="0" width="400" height="300" fill="#FFFDF4" />
  
  <!-- Content Background with the category pattern -->
  <rect x="12" y="12" width="376" height="276" fill="url(#${patternType}-${safeId})" />
  
  <!-- Outer Solid Black Frame -->
  <rect x="6" y="6" width="388" height="288" fill="none" stroke="#0B0B0B" stroke-width="6" />

  <!-- Grain Overlay -->
  <rect x="0" y="0" width="400" height="300" filter="url(#grain-${safeId})" pointer-events-none="true" />

  <!-- Slanted colored header block (looks like tape) -->
  <g transform="rotate(-3, 200, 35)">
    <rect x="100" y="20" width="200" height="24" fill="${accentColor}" stroke="#000" stroke-width="3" />
    <text x="200" y="36" font-family="monospace" font-weight="900" font-size="10" fill="#000" text-anchor="middle" letter-spacing="1">
      ${badgeTitle}
    </text>
  </g>

  <!-- Left & Right custom marker tabs -->
  <rect x="6" y="100" width="12" height="40" fill="${secondaryColor}" stroke="#0B0B0B" stroke-width="3" />
  <rect x="382" y="160" width="12" height="40" fill="${accentColor}" stroke="#0B0B0B" stroke-width="3" />

  <!-- Slanted stamp in corner (SECURE OP) -->
  <g transform="rotate(12, 340, 50)">
    <rect x="310" y="35" width="60" height="20" fill="none" stroke="#FF5A00" stroke-width="2" stroke-dasharray="4 2" />
    <text x="340" y="48" font-family="monospace" font-weight="900" font-size="7" fill="#FF5A00" text-anchor="middle" letter-spacing="0.5">
      SECURE_OP
    </text>
  </g>

  <!-- Center Target Rings & Starburst -->
  <circle cx="200" cy="150" r="55" fill="#FFFDF4" stroke="#000" stroke-width="3" />
  <circle cx="200" cy="150" r="62" fill="none" stroke="#000" stroke-width="1.5" stroke-dasharray="6 4" />
  <circle cx="200" cy="150" r="45" fill="none" stroke="${accentColor}" stroke-width="2" opacity="0.3" />

  <!-- Target crosshairs -->
  <line x1="200" y1="80" x2="200" y2="220" stroke="#000" stroke-width="1" stroke-dasharray="4 4" opacity="0.4" />
  <line x1="130" y1="150" x2="270" y2="150" stroke="#000" stroke-width="1" stroke-dasharray="4 4" opacity="0.4" />

  <!-- Center Icon Emoji -->
  <text x="200" y="168" font-size="48" text-anchor="middle">
    ${emoji}
  </text>

  <!-- Retro technical coordinates and label at the bottom -->
  <rect x="12" y="244" width="376" height="44" fill="#0B0B0B" />
  <text x="24" y="270" font-family="monospace" font-weight="900" font-size="11" fill="#B7FF00" letter-spacing="2">
    ${stampText}
  </text>
  <text x="376" y="270" font-family="monospace" font-weight="900" font-size="8" fill="#FFF" text-anchor="end" letter-spacing="1" opacity="0.8">
    ${badgeLabel.toUpperCase()} // SYS_V2.5
  </text>

  <!-- Stamp effect (circle overlaid with lines to look like ink stamp) -->
  <g transform="translate(45, 180) rotate(-15)" opacity="0.85">
    <circle cx="30" cy="30" r="24" fill="none" stroke="${accentColor}" stroke-width="3" />
    <text x="30" y="34" font-family="sans-serif" font-weight="900" font-size="7" fill="${accentColor}" text-anchor="middle">
      FIELD TRIP
    </text>
    <line x1="6" y1="15" x2="54" y2="15" stroke="${accentColor}" stroke-width="2" />
    <line x1="6" y1="45" x2="54" y2="45" stroke="${accentColor}" stroke-width="2" />
  </g>
</svg>`;

  const base64 = btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${base64}`;
}
