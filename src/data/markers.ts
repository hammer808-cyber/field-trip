export interface MarkerSticker {
  id: string;
  label: string;
  emoji: string;
  description: string;
}

export const MARKER_STICKERS: MarkerSticker[] = [
  { id: 'default-scout', label: 'Classic Scout', emoji: '👣', description: 'The original field explorer.' },
  { id: 'lone-wolf', label: 'Lone Wolf', emoji: '🐺', description: 'For those who walk their own path.' },
  { id: 'camera-eye', label: 'Point & Shoot', emoji: '📸', description: 'Focusing on the perfect evidence.' },
  { id: 'high-seas', label: 'Coastal Drifter', emoji: '🌊', description: 'Riding the summer waves.' },
  { id: 'night-owl', label: 'Night Owl', emoji: '🦉', description: 'Thriving in the dim light.' },
  { id: 'fire-starter', label: 'Spark', emoji: '🔥', description: 'Igniting the field mission.' },
  { id: 'green-thumb', label: 'Wild Growth', emoji: '🌿', description: 'Connected to the field terrain.' },
  { id: 'star-gazer', label: 'Cosmic Voyager', emoji: '✨', description: 'Looking beyond the horizon.' },
];
