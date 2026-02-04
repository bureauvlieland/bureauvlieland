/**
 * Entry Page Tracker
 * 
 * Tracks the first landing page a user visits in their session.
 * Used for SEA campaign attribution in conversion events.
 */

const STORAGE_KEY = 'bv_entry_page';

/**
 * Record the entry page if not already set in this session
 * Call this on app initialization or route changes
 */
export const recordEntryPage = () => {
  if (typeof window === 'undefined') return;
  
  // Only record if not already set in this session
  if (!sessionStorage.getItem(STORAGE_KEY)) {
    const entryData = {
      path: window.location.pathname,
      referrer: document.referrer || null,
      timestamp: new Date().toISOString(),
      // Capture UTM parameters if present
      utm_source: new URLSearchParams(window.location.search).get('utm_source'),
      utm_medium: new URLSearchParams(window.location.search).get('utm_medium'),
      utm_campaign: new URLSearchParams(window.location.search).get('utm_campaign'),
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entryData));
  }
};

/**
 * Get the stored entry page data
 */
export const getEntryPage = (): {
  path: string;
  referrer: string | null;
  timestamp: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
} | null => {
  if (typeof window === 'undefined') return null;
  
  const stored = sessionStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
};

/**
 * Get a simplified entry page path for analytics
 */
export const getEntryPagePath = (): string => {
  const data = getEntryPage();
  return data?.path || 'direct';
};

/**
 * Derive a likely event type based on the entry page path
 */
export const inferEventTypeFromPath = (path: string): string | null => {
  const pathLower = path.toLowerCase();
  
  if (pathLower.includes('bedrijfsuitje')) return 'bedrijfsuitje';
  if (pathLower.includes('teamuitje')) return 'teamuitje';
  if (pathLower.includes('heisessie')) return 'heisessie';
  if (pathLower.includes('incentive')) return 'incentive';
  if (pathLower.includes('zakelijk-evenement')) return 'zakelijk_evenement';
  if (pathLower.includes('trouwen')) return 'bruiloft';
  if (pathLower.includes('familieweekend')) return 'familieweekend';
  if (pathLower.includes('groepsweekend')) return 'groepsweekend';
  if (pathLower.includes('jubileum')) return 'jubileum';
  
  return null;
};
