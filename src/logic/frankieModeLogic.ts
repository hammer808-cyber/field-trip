import { TripCard } from '../types/challenges';

/**
 * Frankie Mode Logic
 * Centralizes the resolution of plain language copy across the application.
 * Frankie Mode (Plain Language Mode) simplifies task directions and app language.
 */

export interface FrankiePreferences {
  frankieMode: boolean;
}

/**
 * Resolves the task title.
 */
export function getFrankieTitle(task: TripCard, pref: FrankiePreferences): string {
  if (pref.frankieMode) {
    return task.plainTitle || task.title;
  }
  return task.title;
}

/**
 * Resolves the primary task description/instructions.
 */
export function getFrankieDescription(task: TripCard, pref: FrankiePreferences): string {
  if (pref.frankieMode) {
    return task.plainDescription || (task as any).plainModePrompt || task.description || (task as any).theAsk;
  }
  return task.description || (task as any).theAsk;
}

/**
 * Resolves specific step-by-step directions.
 * Returns either a single string or an array of steps.
 */
export function getFrankieDirections(task: TripCard, pref: FrankiePreferences): string | string[] {
  if (pref.frankieMode) {
    if (task.plainDirections) return task.plainDirections;
    if ((task as any).plainModePrompt) return [(task as any).plainModePrompt];
    if ((task as any).directions) return (task as any).directions;
    return task.description;
  }
  return (task as any).directions || (task as any).fullInstructions || task.description;
}

/**
 * Ensures directions are always returned as an array.
 */
export function getFrankieDirectionsArray(task: TripCard, pref: FrankiePreferences): string[] {
  const directions = getFrankieDirections(task, pref);
  if (Array.isArray(directions)) return directions;
  if (typeof directions === 'string' && directions.includes('\n')) {
    return directions.split('\n').map(s => s.trim()).filter(Boolean);
  }
  return [directions as string];
}

/**
 * Resolves the field note prompt.
 */
export function getFrankieFieldNotePrompt(task: TripCard, pref: FrankiePreferences): string {
  const defaultPrompt = "Write one short note about what you noticed.";
  if (pref.frankieMode) {
    return task.plainFieldNotePrompt || task.fieldNotePrompt || defaultPrompt;
  }
  return task.fieldNotePrompt || "What did you notice during this mission?";
}

/**
 * Resolves point breakdown labels/explanations.
 */
export function getFrankiePointExplanation(task: TripCard, pref: FrankiePreferences): string {
  const defaultExplanation = "Points awarded for completing this task.";
  if (pref.frankieMode) {
    return task.plainPointExplanation || (task as any).pointExplanation || defaultExplanation;
  }
  return (task as any).pointExplanation || "Standard completion points.";
}

/**
 * Resolves difficulty label.
 */
export function getFrankieDifficultyLabel(task: TripCard, pref: FrankiePreferences): string {
  const diffMap: Record<string, string> = {
    easy: 'Simple',
    medium: 'Moderate',
    hard: 'Challenging'
  };

  if (pref.frankieMode) {
    return task.plainDifficultyLabel || (task as any).difficultyLabel || diffMap[task.difficulty] || task.difficulty || 'Simple';
  }
  return (task as any).difficultyLabel || task.difficulty;
}

/**
 * Resolves estimated time label.
 */
export function getFrankieEstimatedTimeLabel(task: TripCard, pref: FrankiePreferences): string {
  if (pref.frankieMode) {
    return task.plainEstimatedTimeLabel || (task as any).estimatedTimeLabel || `${task.estimatedTimeMinutes || 10} min`;
  }
  return (task as any).estimatedTimeLabel || `${task.estimatedTimeMinutes || 10}m Est.`;
}

/**
 * Resolves evidence requirement labels for checkboxes.
 */
export function getFrankieEvidenceLabel(task: TripCard, type: string, pref: FrankiePreferences): string {
  const defaultPlainLabels: Record<string, string> = {
    photo: 'Take a photo',
    field_note: 'Write a note',
    location: 'Check in',
    audio: 'Record audio'
  };

  const defaultNormalLabels: Record<string, string> = {
    photo: 'Capture Photo',
    field_note: 'Field Note',
    location: 'Location Signal',
    audio: 'Audio Sample'
  };

  if (pref.frankieMode) {
    return (task.plainEvidenceLabels && task.plainEvidenceLabels[type]) || 
           ((task as any).evidenceLabels && (task as any).evidenceLabels[type]) || 
           defaultPlainLabels[type] || type;
  }
  
  return defaultNormalLabels[type] || type;
}

/**
 * Resolves general app labels into plain language.
 */
export function getFrankieLabel(text: string, pref: FrankiePreferences): string {
  if (!pref.frankieMode) return text;

  const labelMap: Record<string, string> = {
    'FIELD_NOTES': 'My History',
    'VIEWFINDER': 'Take Photo',
    'LEADERBOARD': 'Standings',
    'CREW_LORE': 'Team Stories',
    'DO_THIS_NEXT': 'Recommended Task',
    'SUBMIT_EVIDENCE': 'Finish Mission'
  };

  return labelMap[text] || text;
}
