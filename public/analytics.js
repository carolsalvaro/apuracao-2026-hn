// One configuration per document. Results polling and hash navigation never call GA.
(() => {
  if (window.__hnAnalyticsInitialized) return;
  window.__hnAnalyticsInitialized = true;
  const id = 'G-VZYMP84YWY';
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  // Measurement only: no advertising storage, signals or personalization.
  window.gtag('consent', 'default', {
    analytics_storage: 'denied', ad_storage: 'denied',
    ad_user_data: 'denied', ad_personalization: 'denied'
  });
  window.gtag('js', new Date());
  window.gtag('config', id, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    page_location: location.origin + location.pathname,
    page_referrer: '',
    site_environment: location.hostname.startsWith('deploy-preview-') ? 'preview' : 'production'
  });
  window.gtag('event', 'page_view', {page_title: document.title});
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
  document.head.appendChild(script);
})();
