import { business, products, whatsappUrl } from './content.js';
import { trackVisit, analyticsDisabled, setAnalyticsDisabled } from './tracking.js';

const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
function renderProducts() {
  const grid = document.querySelector('#product-grid');
  grid.replaceChildren(...products.map(product => {
    const card = document.createElement('article');
    card.className = 'product-card';
    // La estructura es estática; los datos se insertan con textContent.
    card.innerHTML = '<div class="product-image"><span class="product-tag"></span><img width="480" height="400" loading="lazy" /></div><div class="product-content"><p class="product-category"></p><h3></h3><p class="product-description"></p><div class="product-bottom"><div><small>PRECIO</small><strong></strong></div><a class="product-buy" target="_blank" rel="noopener noreferrer" aria-label="Consultar producto por WhatsApp">↗</a></div><a class="product-contact" target="_blank" rel="noopener noreferrer">Consultar por WhatsApp</a></div>';
    card.querySelector('.product-image').classList.add(product.color);
    card.querySelector('.product-tag').textContent = product.tag;
    const img = card.querySelector('img'); img.src = product.image; img.alt = product.imageAlt || `Presentación de ${product.name}`;
    if (product.imageNote) {
      const note = document.createElement('p'); note.className = 'product-image-note'; note.textContent = product.imageNote;
      card.querySelector('.product-image').append(note);
    }
    card.querySelector('.product-category').textContent = product.category;
    card.querySelector('h3').textContent = product.name;
    card.querySelector('.product-description').textContent = product.description;
    card.querySelector('strong').textContent = Number.isFinite(product.price) ? money.format(product.price) : 'Consultar precio';
    card.querySelector('.product-bottom small').textContent = 'PRECIO · ARS';
    const features = document.createElement('ul'); features.className = 'product-features';
    product.features.forEach(feature => { const item = document.createElement('li'); item.textContent = feature; features.append(item); });
    card.querySelector('.product-description').after(features);
    card.querySelectorAll('a').forEach(a => { a.href = whatsappUrl(`¡Hola! Me interesan los ${product.name}. ¿Me compartís precio y disponibilidad?`); });
    return card;
  }));
}
renderProducts();
document.querySelector('.catalog-note').textContent = 'Consultá precio, disponibilidad y modalidad de entrega con EarplugsMdz por WhatsApp.';
document.querySelectorAll('[data-whatsapp]').forEach(a => { a.href = whatsappUrl(); a.target = '_blank'; a.rel = 'noopener noreferrer'; });
document.querySelector('#phone-link').textContent = business.displayPhone;
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
