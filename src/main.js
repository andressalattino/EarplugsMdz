import { business, products, whatsappUrl, productMessage } from './content.js';
import { trackVisit, analyticsDisabled, setAnalyticsDisabled } from './tracking.js';

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
    card.id = product.id; card.className = 'product-card'; card.dataset.series = product.id;
    card.innerHTML = `<div class="product-visual">
      <span class="series-badge"></span><span class="visual-brand" aria-hidden="true">cella</span>
      <button class="product-photo" type="button" hidden><img width="800" height="700" loading="lazy" /></button>
      <div class="photo-pending"><span class="pending-series" aria-hidden="true"></span><p>Tu próximo momento de calma.</p><span class="pending-label">Foto del producto próximamente</span></div>
      <p class="visual-selection" aria-live="polite"></p>
    </div><div class="product-content">
      <div class="photo-thumbnails" aria-label="Fotos del color seleccionado" hidden></div>
      <p class="product-category">CELLA EARPLUGS</p><h3></h3><p class="product-description"></p>
      <fieldset class="color-options"><legend>Elegí tu color</legend><div class="color-buttons"></div></fieldset>
      <p class="selected-color" aria-live="polite"></p>
      <div class="product-bottom"><div><small>PRECIO · ARS</small><strong></strong></div><span class="price-note">Todos los colores<br />al mismo precio</span></div>
      <a class="product-contact button" target="_blank" rel="noopener noreferrer">Consultar por WhatsApp <span aria-hidden="true">↗</span></a>
      <a class="alternate-contact" target="_blank" rel="noopener noreferrer">Consultar al segundo WhatsApp ↗</a>
    </div>`;
    card.querySelector('.series-badge').textContent = product.series;
    card.querySelector('.pending-series').textContent = product.number;
    card.querySelector('h3').textContent = product.name;
    card.querySelector('.product-description').textContent = product.description;
    card.querySelector('strong').textContent = money.format(product.price);
    const photoButton = card.querySelector('.product-photo');
    const photo = photoButton.querySelector('img');
    const pending = card.querySelector('.photo-pending');
    const thumbnails = card.querySelector('.photo-thumbnails');
    const colorButtons = card.querySelector('.color-buttons');
    let selectedVariant = product.variants[0];
    let activeImage = null;
    function showImage(image, index) {
      activeImage = image || null;
      photoButton.hidden = !image; pending.hidden = Boolean(image);
      if (image) {
        photo.src = image.src;
        photo.alt = image.alt || `${product.name} · ${selectedVariant.name}`;
        photoButton.setAttribute('aria-label', `Ampliar foto de ${product.name}, ${selectedVariant.name}`);
      } else { photo.removeAttribute('src'); photo.alt = ''; }
      [...thumbnails.children].forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
    }
    photo.addEventListener('error', () => showImage(null, -1));
    photoButton.addEventListener('click', () => {
      if (!activeImage) return;
      photoDialogImage.src = activeImage.src; photoDialogImage.alt = photo.alt;
      photoCaption.textContent = `${product.name} · ${selectedVariant.name}`;
      photoDialog.showModal();
    });
    function selectVariant(variant) {
      selectedVariant = variant;
      card.querySelector('.selected-color').textContent = `Color elegido: ${variant.name}`;
      card.querySelector('.visual-selection').textContent = `${product.series} / ${variant.name}`;
      colorButtons.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.variant === variant.id)));
      card.querySelector('.product-contact').href = whatsappUrl(productMessage(product, variant));
      card.querySelector('.alternate-contact').href = whatsappUrl(productMessage(product, variant), business.contacts[1]);
      const images = variant.images;
      thumbnails.replaceChildren(...images.map((image, index) => {
        const button = document.createElement('button'); button.type = 'button';
        button.setAttribute('aria-label', `Ver foto ${index + 1} de ${product.name}, ${variant.name}`);
        const thumbnail = document.createElement('img'); thumbnail.src = image.src; thumbnail.alt = ''; thumbnail.loading = 'lazy';
        button.append(thumbnail); button.addEventListener('click', () => showImage(image, index));
        return button;
      }));
      thumbnails.hidden = images.length < 2;
      showImage(images[0], 0);
    }
    product.variants.forEach(variant => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'color-option'; button.dataset.variant = variant.id;
      button.setAttribute('aria-label', `${product.series}: ${variant.name}`);
      const dot = document.createElement('span'); dot.className = 'color-dot'; dot.style.backgroundColor = variant.swatch; dot.setAttribute('aria-hidden', 'true');
      button.append(dot, document.createTextNode(variant.name));
      button.addEventListener('click', () => selectVariant(variant)); colorButtons.append(button);
    });
    selectVariant(selectedVariant);
    return card;
  }));
}
renderProducts();

document.querySelectorAll('[data-series-filter]').forEach(button => button.addEventListener('click', () => {
  const selected = button.dataset.seriesFilter;
  document.querySelectorAll('[data-series-filter]').forEach(filter => filter.setAttribute('aria-pressed', String(filter === button)));
  const cards = [...document.querySelectorAll('.product-card')];
  cards.forEach(card => { card.hidden = selected !== 'all' && card.dataset.series !== selected; });
  document.querySelector('#catalog-status').textContent = selected === 'all' ? '2 series · 9 combinaciones de color' : `${cards.find(card => card.dataset.series === selected).querySelector('h3').textContent} · todos los colores a $19.000 ARS`;
}));

// Un acceso desde la portada también muestra la serie si había otro filtro activo.
document.querySelectorAll('.hero-series-links a').forEach(link => link.addEventListener('click', () => {
  const series = link.hash.slice(1);
  document.querySelector('[data-series-filter="' + series + '"]').click();
}));

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
