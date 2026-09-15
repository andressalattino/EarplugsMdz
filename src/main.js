import { business, whatsappUrl, productMessage } from './content.js';
import { trackVisit, analyticsDisabled, setAnalyticsDisabled } from './tracking.js';

let products = [];
const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const photoDialog = document.querySelector('#photo-dialog');
const photoDialogImage = photoDialog.querySelector('img');
const photoCaption = photoDialog.querySelector('figcaption');
document.querySelector('#photo-close').addEventListener('click', () => photoDialog.close());
photoDialog.addEventListener('click', event => { if (event.target === photoDialog) photoDialog.close(); });

function renderProducts() {
  const grid = document.querySelector('#product-grid');
  grid.replaceChildren(...products.map(product => {
    const card = document.createElement('article');
    card.id = product.id; card.className = 'product-card'; card.dataset.series = product.series;
    card.innerHTML = `<div class="product-visual">
      <span class="series-badge"></span><span class="visual-brand" aria-hidden="true">Cella</span>
      <button class="product-photo" type="button" hidden><img width="800" height="700" loading="lazy" /></button>
      <div class="photo-pending"><span class="pending-series" aria-hidden="true"></span><p>Tu próximo momento de calma.</p><span class="pending-label">Foto no disponible</span></div>
      <p class="visual-selection" aria-live="polite"></p>
    </div><div class="product-content">
      <div class="photo-thumbnails" aria-label="Galería de la serie" hidden></div><p class="gallery-note"></p>
      <p class="product-category">CELLA EARPLUGS</p><h3></h3><p class="product-description"></p>
      <div class="color-options"><p class="color-heading">Colores disponibles</p><ul class="color-list" aria-label="Colores disponibles"></ul></div>
      <div class="product-bottom"><div><small>PRECIO · ARS</small><strong></strong></div><span class="price-note">Todos los colores<br />al mismo precio</span></div>
      <a class="product-contact button" target="_blank" rel="noopener noreferrer">Consultar por WhatsApp <span aria-hidden="true">↗</span></a>
      <a class="alternate-contact" target="_blank" rel="noopener noreferrer">Consultar al segundo WhatsApp ↗</a>
    </div>`;
    card.querySelector('.series-badge').textContent = product.series;
    card.querySelector('.pending-series').textContent = product.series;
    card.querySelector('h3').textContent = product.name;
    card.querySelector('.product-description').textContent = product.description;
    card.querySelector('.gallery-note').textContent = product.galleryNote || '';
    card.querySelector('strong').textContent = money.format(product.price);
    const photoButton = card.querySelector('.product-photo');
    const photo = photoButton.querySelector('img');
    const pending = card.querySelector('.photo-pending');
    const thumbnails = card.querySelector('.photo-thumbnails');
    const colorList = card.querySelector('.color-list');
    let activeImage = null;
    function showImage(image, index) {
      activeImage = image || null;
      photoButton.hidden = !image; pending.hidden = Boolean(image);
      if (image) {
        photo.src = image.src;
        photo.alt = image.alt || product.name;
        photoButton.setAttribute('aria-label', `Ampliar foto: ${image.caption || photo.alt}`);
        card.querySelector('.visual-selection').textContent = image.caption || product.name;
      } else { photo.removeAttribute('src'); photo.alt = ''; }
      [...thumbnails.children].forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
    }
    photo.addEventListener('error', () => showImage(null, -1));
    photoButton.addEventListener('click', () => {
      if (!activeImage) return;
      photoDialogImage.src = activeImage.src; photoDialogImage.alt = photo.alt;
      photoCaption.textContent = activeImage.caption || photo.alt;
      photoDialog.showModal();
    });
    card.querySelector('.product-contact').href = whatsappUrl(productMessage(product));
    card.querySelector('.alternate-contact').href = whatsappUrl(productMessage(product), business.contacts[1]);
    const images = product.images || [];
    thumbnails.replaceChildren(...images.map((image, index) => {
      const button = document.createElement('button'); button.type = 'button';
      button.setAttribute('aria-label', `Ver foto ${index + 1}: ${image.caption || image.alt}`);
      const thumbnail = document.createElement('img'); thumbnail.src = image.src; thumbnail.alt = ''; thumbnail.loading = 'lazy';
      button.append(thumbnail); button.addEventListener('click', () => showImage(image, index));
      return button;
    }));
    thumbnails.hidden = images.length < 2;
    showImage(images[0], 0);
    product.variants.forEach(variant => {
      const item = document.createElement('li'); item.className = 'color-label';
      const dot = document.createElement('span'); dot.className = 'color-dot'; dot.style.backgroundColor = variant.swatch; dot.setAttribute('aria-hidden', 'true');
      item.append(dot, document.createTextNode(variant.name));
      colorList.append(item);
    });
    return card;
  }));
}
function filterProducts(series = '') {
  document.querySelectorAll('[data-series-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.seriesFilter === series)));
  const selected = products.filter(p => !series || p.series === series);
  document.querySelectorAll('.product-card').forEach(card => { card.hidden = Boolean(series) && card.dataset.series !== series; });
  document.querySelector('#catalog-status').textContent = selected.length ? `${selected.length} productos · ${selected.reduce((sum, p) => sum + p.variants.length, 0)} opciones de color` : 'Próximamente nuevos productos.';
}
function renderCatalogDetails() {
  const series = [...new Set(products.map(p => p.series))];
  const filters = document.querySelector('.filter-row');
  filters.replaceChildren(...['', ...series].map(value => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'filter-button'; button.dataset.seriesFilter = value; button.textContent = value || 'Todos'; button.addEventListener('click', () => filterProducts(value)); return button;
  }));
  filterProducts();
  const price = products.length ? Math.min(...products.map(p => p.price)) : null;
  const equalPrices = products.length && products.every(p => p.price === price);
  const pricing = price === null ? 'Consultanos por WhatsApp.' : `${equalPrices ? 'Todos los modelos a' : 'Modelos desde'} ${money.format(price)} ARS.`;
  document.querySelector('#catalog-pricing').textContent = pricing;
  document.querySelector('#catalog-banner').textContent = products.length ? `CELLA EARPLUGS · ${pricing.toUpperCase()}` : 'CELLA EARPLUGS · MENDOZA';
  document.querySelector('#catalog-summary').textContent = 'Conocé las series y los colores disponibles. Consultanos por WhatsApp para coordinar tu pedido.';
  document.querySelector('#catalog-faq').textContent = products.length ? products.map(p => `${p.name}: ${p.variants.map(v => v.name).join(', ')} (${money.format(p.price)} ARS).`).join(' ') + ' Consultá disponibilidad por WhatsApp.' : 'Escribinos por WhatsApp para conocer las novedades.';
  const featured = products.find(p => p.id === 'cella-serie-6') || products[0];
  const heroImage = document.querySelector('.cella-photo-hero img');
  heroImage.hidden = !featured?.images.length;
  if (featured?.images.length) { heroImage.src = featured.images[0].src; heroImage.alt = featured.images[0].alt; }
  document.querySelector('.hero-photo-label').textContent = featured ? `CELLA · ${featured.series}` : 'CELLA EARPLUGS';
  document.querySelector('.hero-series-links').replaceChildren(...products.slice(0, 2).map(product => {
    const link = document.createElement('a'); link.href = '#' + product.id; link.textContent = 'Ver ' + product.series + ' ↗'; link.addEventListener('click', () => filterProducts(product.series)); return link;
  }));
}
async function loadCatalog() {
  const error = document.querySelector('#catalog-error'); error.hidden = true;
  const retry = document.querySelector('#catalog-retry'); retry.disabled = true;
  document.querySelector('#catalog-status').textContent = 'Cargando productos…';
  try {
    const response = await fetch('/api/products', { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error('catalog');
    const data = await response.json(); products = data.products;
    renderProducts(); renderCatalogDetails();
  } catch {
    error.hidden = false; document.querySelector('#catalog-status').textContent = 'Catálogo temporalmente no disponible.';
  } finally { retry.disabled = false; }
}
document.querySelector('#catalog-retry').addEventListener('click', loadCatalog);
loadCatalog();

document.querySelectorAll('[data-whatsapp]').forEach(a => {
  const contact = business.contacts.find(contact => contact.id === a.dataset.whatsapp) || business.contacts[0];
  a.href = whatsappUrl(undefined, contact); a.target = '_blank'; a.rel = 'noopener noreferrer';
});

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
