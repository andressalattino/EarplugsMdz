const ID_KEY = 'epm_visitor_v1';
const OPT_KEY = 'epm_analytics_optout';
const MAX_AGE = 180 * 24 * 60 * 60 * 1000;
let disabledInMemory = false;
export function analyticsDisabled() {
  try { return disabledInMemory || localStorage.getItem(OPT_KEY) === '1' || navigator.doNotTrack === '1'; }
  catch { return disabledInMemory || navigator.doNotTrack === '1'; }
}
export function setAnalyticsDisabled(disabled) {
  disabledInMemory = disabled;
  try { localStorage.setItem(OPT_KEY, disabled ? '1' : '0'); if (disabled) localStorage.removeItem(ID_KEY); } catch { /* Storage bloqueado. */ }
}
export function visitorId() {
  try {
    const previous = JSON.parse(localStorage.getItem(ID_KEY) || 'null');
    if (previous && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(previous.id) && previous.expires > Date.now()) return previous.id;
    const id = crypto.randomUUID();
    localStorage.setItem(ID_KEY, JSON.stringify({ id, expires: Date.now() + MAX_AGE }));
    return id;
  } catch { return crypto.randomUUID(); }
}
export async function trackVisit() {
  if (!['/', '/index.html'].includes(location.pathname) || analyticsDisabled()) return;
  if (document.prerendering) { document.addEventListener('prerenderingchange', () => trackVisit(), { once: true }); return; }
  const body = JSON.stringify({ visitorId: visitorId(), eventId: crypto.randomUUID(), path: '/' });
  // El mismo eventId en el reintento evita duplicados por fallos de red.
  for (let attempt = 0; attempt < 2; attempt++) {
    if (analyticsDisabled()) return;
    try {
      const response = await fetch('/api/visit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true });
      if (response.ok || response.status < 500) return;
    } catch { /* Una falla de analítica nunca interrumpe el catálogo. */ }
    if (!attempt) await new Promise(resolve => setTimeout(resolve, 1500));
  }
}
