import { business, products, whatsappUrl } from './content.js';
import { trackVisit, analyticsDisabled, setAnalyticsDisabled } from './tracking.js';

const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
function renderProducts(filter = 'todos') {
  const grid = document.querySelector('#product-grid');
  grid.replaceChildren(...products.filter(p => filter === 'todos' || p.id === filter).map(product => {
    const card = document.createElement('article');
    card.className = 'product-card';
    // La estructura es estática; los datos se insertan con textContent.
    card.innerHTML = '<div class="product-image"><span class="product-tag"></span><img width="480" height="400" loading="lazy" /></div><div class="product-content"><p class="product-category"></p><h3></h3><p class="product-description"></p><div class="product-bottom"><div><small>PRECIO</small><strong></strong></div><a class="product-buy" target="_blank" rel="noopener noreferrer" aria-label="Consultar producto por WhatsApp">↗</a></div><a class="product-contact" target="_blank" rel="noopener noreferrer">Consultar por WhatsApp</a></div>';
    card.querySelector('.product-image').classList.add(product.color);
    card.querySelector('.product-tag').textContent = product.tag;
    const img = card.querySelector('img'); img.src = product.image; img.alt = `Presentación de ${product.name}`;
    card.querySelector('.product-category').textContent = product.category;
    card.querySelector('h3').textContent = product.name;
    card.querySelector('.product-description').textContent = product.description;
    card.querySelector('strong').textContent = Number.isFinite(product.price) ? money.format(product.price) : 'Consultar precio';
    card.querySelector('.product-bottom small').textContent = business.referencePrices ? 'PRECIO DE REFERENCIA · ARS' : 'PRECIO · ARS';
    card.querySelectorAll('a').forEach(a => { a.href = whatsappUrl(`¡Hola! Me interesa ${product.name.toLowerCase()}. ¿Me compartís modelos, precio y disponibilidad?`); });
    return card;
  }));
  document.querySelectorAll('[data-filter]').forEach(b => { const active = b.dataset.filter === filter; b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active)); });
}
renderProducts();
document.querySelector('.catalog-note').textContent = business.referencePrices ? 'Fotos y precios de referencia: earplugs.com.ar (12/09/2026). Confirmá precio y disponibilidad de EarplugsMdz por WhatsApp.' : 'Confirmá disponibilidad y modalidad de entrega con EarplugsMdz por WhatsApp.';
document.querySelectorAll('[data-whatsapp]').forEach(a => { a.href = whatsappUrl(); a.target = '_blank'; a.rel = 'noopener noreferrer'; });
document.querySelector('#phone-link').textContent = business.displayPhone;
document.querySelectorAll('[data-filter]').forEach(b => b.addEventListener('click', () => renderProducts(b.dataset.filter)));
document.querySelectorAll('[data-filter-link]').forEach(a => a.addEventListener('click', () => renderProducts(a.dataset.filterLink)));
document.querySelector('#year').textContent = new Date().getFullYear();
const menuButton = document.querySelector('#menu-toggle');
const menu = document.querySelector('#mobile-menu');
menuButton.addEventListener('click', () => { menu.hidden = !menu.hidden; menuButton.setAttribute('aria-expanded', String(!menu.hidden)); });
menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => { menu.hidden = true; menuButton.setAttribute('aria-expanded', 'false'); }));
document.addEventListener('keydown', e => { if (e.key === 'Escape') { menu.hidden = true; menuButton.setAttribute('aria-expanded', 'false'); } });
const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) document.querySelectorAll('.desktop-nav a').forEach(a => { const current = a.hash === `#${entry.target.id}`; a.classList.toggle('active', current); if (current) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); }); }), { rootMargin: '-20% 0px -50% 0px' });
['inicio', 'productos', 'contacto'].forEach(id => observer.observe(document.getElementById(id)));
const dialog = document.querySelector('#privacy-dialog');
document.querySelector('#privacy-open').addEventListener('click', () => dialog.showModal());
document.querySelector('#privacy-close').addEventListener('click', () => dialog.close());
const optout = document.querySelector('#analytics-optout'); optout.checked = analyticsDisabled();
optout.addEventListener('change', () => setAnalyticsDisabled(optout.checked));
trackVisit();
