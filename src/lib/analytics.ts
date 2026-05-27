/**
 * Analytics tracking utilities for GTM/GA4
 * 
 * All events follow GA4 enhanced e-commerce format for optimal integration.
 * Events are pushed to the dataLayer for GTM to process.
 */

// Note: dataLayer type is already declared by GTM, we just ensure it exists

/**
 * Safely push an event to the GTM dataLayer
 */
export const trackEvent = (eventName: string, eventData?: Record<string, unknown>) => {
  if (typeof window !== 'undefined') {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: eventName,
      ...eventData,
    });
  }
};

/**
 * Track when a building block is added to cart
 */
export const trackAddToCart = (item: {
  id: string;
  name: string;
  category: string;
  price?: number;
  provider?: string;
}) => {
  trackEvent('add_to_cart', {
    currency: 'EUR',
    value: item.price || 0,
    items: [{
      item_id: item.id,
      item_name: item.name,
      item_category: item.category,
      price: item.price || 0,
      quantity: 1,
      item_brand: item.provider || 'Bureau Vlieland',
    }],
  });
};

/**
 * Track when a building block is removed from cart
 */
export const trackRemoveFromCart = (item: {
  id: string;
  name: string;
  category: string;
}) => {
  trackEvent('remove_from_cart', {
    items: [{
      item_id: item.id,
      item_name: item.name,
      item_category: item.category,
    }],
  });
};

/**
 * Track when user starts the checkout/request process
 * 
 * Includes event_type for filtering in GA4 and entry_page for campaign attribution.
 */
export const trackBeginCheckout = (data: {
  itemsCount: number;
  value: number;
  numberOfPeople: number;
  numberOfDays: number;
  eventType?: string;
  entryPage?: string;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
}) => {
  trackEvent('begin_checkout', {
    currency: 'EUR',
    value: data.value,
    items_count: data.itemsCount,
    number_of_people: data.numberOfPeople,
    number_of_days: data.numberOfDays,
    event_type: data.eventType || 'niet_gespecificeerd',
    entry_page: data.entryPage || 'direct',
    utm_source: data.utmSource || null,
    utm_medium: data.utmMedium || null,
    utm_campaign: data.utmCampaign || null,
  });
};

/**
 * Track when a program request is submitted (primary conversion)
 * 
 * Includes event_type for filtering in GA4 and entry_page for campaign attribution.
 */
export const trackProgramRequestSubmitted = (data: {
  value: number;
  numberOfPeople: number;
  numberOfDays: number;
  eventType?: string;
  entryPage?: string;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  items: Array<{
    id: string;
    name: string;
    category: string;
    price?: number;
    provider?: string;
  }>;
}) => {
  trackEvent('program_request_submitted', {
    currency: 'EUR',
    value: data.value,
    number_of_people: data.numberOfPeople,
    number_of_days: data.numberOfDays,
    event_type: data.eventType || 'niet_gespecificeerd',
    entry_page: data.entryPage || 'direct',
    utm_source: data.utmSource || null,
    utm_medium: data.utmMedium || null,
    utm_campaign: data.utmCampaign || null,
    items: data.items.map((item, index) => ({
      item_id: item.id,
      item_name: item.name,
      item_category: item.category,
      price: item.price || 0,
      quantity: data.numberOfPeople,
      index,
      item_brand: item.provider || 'Bureau Vlieland',
    })),
  });
};

/**
 * Track when a quote request is submitted (primary conversion)
 * 
 * Includes event_type for filtering in GA4 and entry_page for campaign attribution.
 */
export const trackQuoteRequestSubmitted = (data: {
  numberOfPeople: number;
  numberOfDays: string;
  budgetPerPerson: string;
  eventType?: string;
  entryPage?: string;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
}) => {
  trackEvent('quote_request_submitted', {
    number_of_people: data.numberOfPeople,
    number_of_days: data.numberOfDays,
    budget_per_person: data.budgetPerPerson,
    event_type: data.eventType || 'niet_gespecificeerd',
    entry_page: data.entryPage || 'direct',
    utm_source: data.utmSource || null,
    utm_medium: data.utmMedium || null,
    utm_campaign: data.utmCampaign || null,
  });
};

/**
 * Track when a form submission fails (request/quote/maatwerk).
 * Captures route, auth state, supabase error context for debugging.
 */
export const trackSubmitFailed = (data: {
  formType: 'program_request' | 'quote_request' | 'maatwerk_intake' | 'accommodation_request';
  stage?: string;
  error: unknown;
  userType?: 'anon' | 'authenticated';
  extra?: Record<string, unknown>;
}) => {
  const err = data.error as any;
  const errorMessage =
    (err && (err.message || err.error_description || err.msg)) ||
    (typeof err === 'string' ? err : 'Unknown error');
  const errorCode = err?.code || err?.status || err?.statusCode || null;
  const errorDetails = err?.details || err?.hint || null;

  let userType = data.userType;
  if (!userType && typeof window !== 'undefined') {
    try {
      const hasSession = Object.keys(window.localStorage).some(
        (k) => k.startsWith('sb-') && k.endsWith('-auth-token'),
      );
      userType = hasSession ? 'authenticated' : 'anon';
    } catch {
      userType = 'anon';
    }
  }

  trackEvent('submit_failed', {
    form_type: data.formType,
    stage: data.stage || 'submit',
    error_message: String(errorMessage).slice(0, 500),
    error_code: errorCode ? String(errorCode) : null,
    error_details: errorDetails ? String(errorDetails).slice(0, 500) : null,
    user_type: userType || 'unknown',
    route: typeof window !== 'undefined' ? window.location.pathname : null,
    referrer: typeof document !== 'undefined' ? document.referrer || null : null,
    ...(data.extra || {}),
  });
};

/**
 * Track when a program is shared
 */
export const trackShareProgram = (method: 'whatsapp' | 'email' | 'link' | 'print') => {
  trackEvent('share_program', {
    method,
    content_type: 'program',
  });
};

/**
 * Track when a building block is viewed/clicked
 */
export const trackViewItem = (item: {
  id: string;
  name: string;
  category: string;
  price?: number;
  provider?: string;
}) => {
  trackEvent('view_item', {
    currency: 'EUR',
    value: item.price || 0,
    items: [{
      item_id: item.id,
      item_name: item.name,
      item_category: item.category,
      price: item.price || 0,
      item_brand: item.provider || 'Bureau Vlieland',
    }],
  });
};
