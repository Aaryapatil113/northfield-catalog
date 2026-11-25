// Thin wrappers around gtag. No-ops when GA isn't configured, so the app works without it.
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export function trackEvent(name, params = {}) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function' || !GA_ID) return;
  window.gtag('event', name, params);
}

export function trackPageview(path) {
  trackEvent('page_view', {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
}
