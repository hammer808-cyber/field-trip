import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safely converts various date inputs to a JavaScript Date object.
 * Handles: Date objects, Firestore Timestamps, ISO strings, numbers, and null/undefined.
 */
export function safeToDate(dateInput: any): Date | null {
  if (!dateInput) return null;

  try {
    // Already a Date object
    if (dateInput instanceof Date) {
      return isNaN(dateInput.getTime()) ? null : dateInput;
    }

    // Firestore Timestamp check
    if (typeof dateInput === 'object' && dateInput !== null && 'toDate' in dateInput && typeof dateInput.toDate === 'function') {
      const date = dateInput.toDate();
      return isNaN(date.getTime()) ? null : date;
    }

    // Seconds/Nanoseconds object (sometimes Firestore returns this before it's a real Timestamp class)
    if (typeof dateInput === 'object' && dateInput !== null && typeof dateInput.seconds === 'number') {
      const date = new Date(dateInput.seconds * 1000 + (dateInput.nanoseconds || 0) / 1000000);
      return isNaN(date.getTime()) ? null : date;
    }

    // ISO String or Number (ms)
    const date = new Date(dateInput);
    if (!isNaN(date.getTime())) {
      return date;
    }
  } catch (err) {
    console.warn("Failed to parse date:", dateInput, err);
  }

  return null;
}

/**
 * Formats a date safely with fallbacks for invalid dates.
 */
export function formatSafeDate(
  dateInput: any, 
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' },
  fallback = "Time pending"
): string {
  const date = safeToDate(dateInput);
  if (!date) return fallback;

  try {
    return date.toLocaleString(undefined, options);
  } catch (err) {
    console.warn("Failed to format date:", date, err);
    return fallback;
  }
}

export function formatSafeDateOnly(dateInput: any, fallback = "Date unavailable"): string {
  return formatSafeDate(dateInput, { dateStyle: 'medium' }, fallback);
}

export function formatSafeTimeOnly(dateInput: any, fallback = "Time unknown"): string {
  return formatSafeDate(dateInput, { timeStyle: 'short' }, fallback);
}
