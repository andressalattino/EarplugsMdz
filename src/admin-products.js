const $ = selector => document.querySelector(selector);
const money = value => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value);
const el = (tag, text, className) => { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; };
const button = (text, action) => { const node = el('button', text, 'catalog-action'); node.type = 'button'; node.addEventListener('click', action); return node; };

export function createProductAdmin({ api, expired }) {
  let products = [], current = null, photos = [], dirty = false, busy = false;
  const form = $('#product-form');
  function message(text = '', error = false) {
    for (const node of [$('#catalog-message'), $('#editor-message')]) {
      node.textContent = text; node.hidden = !text;
      node.className = error ? 'error-message' : 'catalog-notice';
      node.setAttribute('role', error ? 'alert' : 'status');
    }
  }
  function fail(error) { if (error.status === 401) expired(); else message(error.message, true); }
  function lock(value) { busy = value; $('#product-fields').disabled = value; $('#new-product').disabled = value; $('#reload-products').disabled = value; $('#logout').disabled = value; $('#catalog-list').inert = value; }
  function canLeave() { return !dirty || window.confirm('Tenés cambios sin guardar. ¿Querés descartarlos?'); }
  window.addEventListener('beforeunload', event => { if (dirty || busy) { event.preventDefault(); event.returnValue = ''; } });
  form.addEventListener('input', () => { dirty = true; });

  function renderList() {
    $('#catalog-list').replaceChildren(...products.map(product => {
      const card = el('article', undefined, 'admin-product-card');
      if (product.images[0]) { const img = el('img'); img.src = product.images[0].src; img.alt = ''; img.loading = 'lazy'; card.append(img); }
      const info = el('div'); info.append(el('h2', product.name), el('p', `${product.series} · ${money(product.price)}`), el('small', `${product.variants.length} colores · ${product.images.length} fotos`));
      const state = el('span', product.published ? 'Publicado' : 'Borrador', `product-state ${product.published ? 'is-published' : ''}`);
      const edit = button('Editar', () => { if (canLeave()) open(product); }); edit.setAttribute('aria-label', `Editar ${product.name}`);
      card.append(info, state, edit); return card;
    }));
    $('#catalog-count').textContent = `${products.length} productos · ${products.filter(p => p.published).length} publicados`;
    if (!products.length) $('#catalog-list').append(el('p', 'Todavía no hay productos. Creá el primero.'));
  }
  function addColor(name = '', swatch = '#9981b7') {
    if ($('#editor-colors').children.length >= 16) return message('Podés agregar hasta 16 colores.', true);
    const row = el('div', undefined, 'editor-color');
    const sampleLabel = el('label', 'Muestra'); const sample = el('input'); sample.type = 'color'; sample.value = swatch; sample.className = 'editor-swatch'; sampleLabel.append(sample);
    const nameLabel = el('label', 'Nombre del color'); const input = el('input'); input.type = 'text'; input.value = name; input.maxLength = 40; input.required = true; input.placeholder = 'Ej. Midnight Blue'; input.className = 'editor-color-name'; nameLabel.append(input);
    const remove = button('Quitar', () => { row.remove(); dirty = true; });
    row.append(sampleLabel, nameLabel, remove); $('#editor-colors').append(row);
  }
  function renderPhotos() {
    $('#editor-photos').replaceChildren(...photos.map((photo, index) => {
      const item = el('article', undefined, 'editor-photo');
      const img = el('img'); img.src = photo.src; img.alt = photo.alt;
      const fields = el('div'); fields.append(el('strong', index === 0 ? 'Foto principal' : `Foto ${index + 1}`));
      const label = el('label', 'Descripción de la foto'); const input = el('input'); input.value = photo.caption || photo.alt || ''; input.maxLength = 200; input.required = true;
      input.addEventListener('input', () => { photo.caption = input.value; photo.alt = input.value; }); label.append(input); fields.append(label);
      const controls = el('div', undefined, 'photo-controls');
      const up = button('← Antes', () => { [photos[index - 1], photos[index]] = [photos[index], photos[index - 1]]; dirty = true; renderPhotos(); }); up.disabled = index === 0;
      const down = button('Después →', () => { [photos[index + 1], photos[index]] = [photos[index], photos[index + 1]]; dirty = true; renderPhotos(); }); down.disabled = index === photos.length - 1;
      controls.append(up, down, button('Quitar foto', () => { photos.splice(index, 1); dirty = true; renderPhotos(); }));
      fields.append(controls); item.append(img, fields); return item;
    }));
    $('#photo-count').textContent = `${photos.length}/12 fotos. La primera será la principal. Los cambios se aplican al guardar.`;
  }
  function open(product) {
    current = product ? structuredClone(product) : { id: crypto.randomUUID(), revision: 0, published: false, sortOrder: Math.min(9999, Math.max(-1, ...products.map(p => p.sortOrder)) + 1), name: '', series: '', price: 19000, description: '', galleryNote: '', variants: [], images: [] };
    form.reset();
    $('#editor-title').textContent = product ? 'Editar producto' : 'Nuevo producto';
    for (const key of ['name', 'series', 'price', 'description', 'galleryNote', 'sortOrder']) form.elements[key].value = current[key];
    form.elements.published.checked = current.published;
    $('#editor-colors').replaceChildren(); current.variants.forEach(v => addColor(v.name, v.swatch)); if (!current.variants.length) addColor();
    photos = structuredClone(current.images); renderPhotos(); dirty = false;
    $('#product-editor').hidden = false; message(); $('#product-name').focus();
  }
  async function load() {
    lock(true); message('Cargando catálogo…');
    try { products = (await api('/api/products?admin=1')).products; renderList(); message(); }
    catch (error) { fail(error); }
    finally { lock(false); }
  }
  $('#new-product').addEventListener('click', () => { if (canLeave()) open(); });
  $('#reload-products').addEventListener('click', async () => { if (!canLeave()) return; dirty = false; current = null; $('#product-editor').hidden = true; await load(); });
  $('#cancel-product').addEventListener('click', () => { if (canLeave()) { dirty = false; current = null; $('#product-editor').hidden = true; message(); } });
  $('#add-color').addEventListener('click', () => { addColor(); dirty = true; });

  $('#product-files').addEventListener('change', async event => {
    const files = [...event.target.files]; event.target.value = '';
    if (!files.length) return;
    if (photos.length + files.length > 12) return message('Cada producto admite hasta 12 fotos.', true);
    lock(true);
    try {
      for (const [index, file] of files.entries()) {
        message(`Preparando y subiendo foto ${index + 1} de ${files.length}…`);
        const base64 = await preparePhoto(file);
        const result = await api('/api/product-upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ base64 }) });
        const name = form.elements.name.value.trim() || 'Producto Cella';
        photos.push({ src: result.src, alt: name, caption: name }); dirty = true; renderPhotos();
      }
      message('Fotos cargadas. Revisá sus descripciones y guardá el producto.');
    } catch (error) { fail(error); }
    finally { lock(false); }
  });
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (busy || !current) return;
    const product = {
      name: form.elements.name.value.trim(), series: form.elements.series.value.trim(), price: Number(form.elements.price.value),
      description: form.elements.description.value.trim(), galleryNote: form.elements.galleryNote.value.trim(),
      variants: [...$('#editor-colors').children].map(row => ({ name: row.querySelector('.editor-color-name').value.trim(), swatch: row.querySelector('.editor-swatch').value })),
      images: photos,
    };
    if (!product.variants.length) return message('Agregá al menos un color.', true);
    if (form.elements.published.checked && !photos.length) return message('Agregá una foto antes de publicar.', true);
    const payload = { id: current.id, revision: current.revision, sortOrder: Number(form.elements.sortOrder.value), published: form.elements.published.checked, product };
    lock(true); message('Guardando producto…');
    try {
      const saved = (await api('/api/products', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })).product;
      products = [...products.filter(p => p.id !== saved.id), saved].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
      current = saved; dirty = false; renderList();
      message(saved.published ? 'Producto guardado y publicado. Ya está disponible al abrir la web.' : 'Borrador guardado. Este producto no se muestra en la web.');
    } catch (error) { fail(error); }
    finally { lock(false); }
  });
  return { load, reset() { dirty = false; current = null; photos = []; form.reset(); $('#product-editor').hidden = true; } };
}

async function preparePhoto(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Elegí imágenes JPG, PNG o WebP.');
  if (file.size > 20 * 1024 * 1024) throw new Error('La imagen original debe ocupar menos de 20 MB.');
  let bitmap;
  try { bitmap = await createImageBitmap(file); } catch { throw new Error('No se pudo leer esta imagen. Probá con otra foto JPG, PNG o WebP.'); }
  try {
    const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', .88));
    if (!blob || blob.size > 2 * 1024 * 1024) throw new Error('Esta foto sigue siendo demasiado pesada. Usá una versión más pequeña.');
    return await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = () => reject(new Error('No se pudo preparar la foto.')); reader.readAsDataURL(blob); });
  } finally { bitmap.close(); }
}
