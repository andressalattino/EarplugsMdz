import { createProductAdmin } from './admin-products.js';
import { Chart, LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Filler } from 'chart.js';
Chart.register(LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Filler);
const $ = selector => document.querySelector(selector);
const number = value => new Intl.NumberFormat('es-AR').format(value);
const formatDate = date => new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short', timeZone: 'America/Argentina/Mendoza' }).format(new Date(`${date}T12:00:00Z`));
let range = '7d'; let chart; let pending;
const productAdmin = createProductAdmin({ api, expired: () => showLogin('Tu sesión venció. Volvé a ingresar.') });
async function api(path, options = {}) {
  const response = await fetch(path, { credentials: 'same-origin', ...options });
  let data; try { data = await response.json(); } catch { throw new Error('No se pudo conectar con el servidor.'); }
  if (!response.ok) { const error = new Error(data.error || 'No pudimos completar la solicitud.'); error.status = response.status; throw error; }
  return data;
}
function showLogin(message) {
  pending?.abort(); chart?.destroy(); chart = null; productAdmin.reset();
  $('#boot').hidden = true; $('#dashboard').hidden = true; $('#login').hidden = false;
  $('#password').value = '';
  $('#login-error').hidden = !message; $('#login-error').textContent = message || '';
}
function showDashboard() {
  $('#boot').hidden = true; $('#login').hidden = true; $('#dashboard').hidden = false;
  const productsPage = location.pathname === '/admin/productos';
  $('#stats-view').hidden = productsPage; $('#products-view').hidden = !productsPage;
  document.querySelectorAll('[data-admin-page]').forEach(link => { if ((link.dataset.adminPage === 'products') === productsPage) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current'); });
  if (productsPage) productAdmin.load(); else loadStats();
}
function rankList(selector, rows, total, country = false) {
  const regionNames = new Intl.DisplayNames(['es'], { type: 'region' });
  const list = $(selector); list.replaceChildren();
  if (!rows.length) { const p = document.createElement('p'); p.textContent = 'Sin visitas en este período.'; p.className = 'ranking-empty'; list.append(p); return; }
  for (const row of rows) {
    const item = document.createElement('div'); item.className = 'ranking-item';
    const line = document.createElement('div'); line.className = 'ranking-line';
    const label = document.createElement('span');
    label.textContent = country ? row.name === 'unknown' ? 'País no disponible' : regionNames.of(row.name) : row.name;
    const value = document.createElement('strong'); const percentage = total ? Math.round(row.count / total * 100) : 0;
    value.textContent = `${number(row.count)} · ${percentage}%`;
    line.append(label, value);
    const meter = document.createElement('div'); meter.className = 'ranking-meter';
    const fill = document.createElement('span'); fill.style.width = `${percentage}%`; meter.append(fill);
    item.append(line, meter); list.append(item);
  }
}
function renderStats(data) {
  const { summary, filtered, daily } = data;
  for (const [id, value] of Object.entries({ total: summary.totalViews, unique: summary.uniqueVisitors, today: summary.today, '7d': summary.last7Days, '30d': summary.last30Days })) $(`#metric-${id}`).textContent = number(value);
  $('#filtered-views').textContent = number(filtered.views);
  $('#filtered-visitors').textContent = `${number(filtered.visitors)} visitantes únicos aproximados`;
  $('#range-dates').textContent = `${formatDate(data.startDate)} ${data.startDate.slice(0,4)} — ${formatDate(data.endDate)} ${data.endDate.slice(0,4)}`;
  $('#empty-chart').hidden = filtered.views > 0;
  chart?.destroy();
  chart = new Chart($('#visits-chart'), {
    type: 'line', data: { labels: daily.map(row => formatDate(row.date)), datasets: [{ label: 'Visitas', data: daily.map(row => row.views), borderColor: '#8b72b4', backgroundColor: '#bca5dc26', fill: true, borderWidth: 2.5, pointRadius: daily.length <= 7 ? 4 : 0, pointHoverRadius: 5, tension: .3 }] },
    options: { responsive: true, maintainAspectRatio: false, animation: !matchMedia('(prefers-reduced-motion: reduce)').matches, interaction: { intersect: false, mode: 'index' }, plugins: { tooltip: { callbacks: { title: items => daily[items[0].dataIndex].date, label: item => ` ${number(item.raw)} visitas` }, backgroundColor: '#303b33', padding: 12 } }, scales: { y: { beginAtZero: true, suggestedMax: 5, ticks: { precision: 0, color: '#878b85', font: { size: 10 } }, grid: { color: '#f0f0eb' }, border: { display: false } }, x: { ticks: { maxTicksLimit: 8, maxRotation: 0, color: '#878b85', font: { size: 10 } }, grid: { display: false }, border: { display: false } } } },
  });
  rankList('#browsers-list', data.browsers, filtered.views);
  rankList('#countries-list', data.countries, filtered.views, true);
  $('#daily-table').replaceChildren(...daily.map(row => { const tr = document.createElement('tr'); for (const value of [row.date, number(row.views), number(row.visitors)]) { const cell = document.createElement('td'); cell.textContent = value; tr.append(cell); } return tr; }));
  $('#last-updated').textContent = `Actualizado ${new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Argentina/Mendoza' }).format(new Date(data.generatedAt))}`;
}
async function loadStats() {
  pending?.abort(); const controller = new AbortController(); pending = controller;
  $('#stats-error').hidden = true; $('#stats-loading').hidden = false;
  $('#refresh').disabled = true;
  try { const data = await api(`/api/stats?range=${range}`, { signal: controller.signal }); if (!controller.signal.aborted) renderStats(data); }
  catch (error) {
    if (error.name === 'AbortError') return;
    if (error.status === 401) return showLogin('Tu sesión venció. Volvé a ingresar.');
    $('#stats-error').textContent = `${error.message} Los datos no se actualizaron.`; $('#stats-error').hidden = false;
  } finally { if (pending === controller) { $('#stats-loading').hidden = true; $('#refresh').disabled = false; } }
}
$('#login-form').addEventListener('submit', async event => {
  event.preventDefault(); $('#login-submit').disabled = true; $('#login-error').hidden = true;
  try { await api('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: $('#username').value.trim(), password: $('#password').value }) }); $('#password').value = ''; showDashboard(); }
  catch (error) { $('#login-error').textContent = error.message; $('#login-error').hidden = false; }
  finally { $('#login-submit').disabled = false; }
});
$('#password-toggle').addEventListener('click', () => { const show = $('#password').type === 'password'; $('#password').type = show ? 'text' : 'password'; $('#password-toggle').textContent = show ? 'Ocultar' : 'Ver'; $('#password-toggle').setAttribute('aria-pressed', String(show)); $('#password-toggle').setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña'); });
$('#logout').addEventListener('click', async () => {
  $('#logout').disabled = true;
  try { await api('/api/auth', { method: 'DELETE' }); showLogin(); }
  catch (error) { const target = location.pathname === '/admin/productos' ? $('#catalog-message') : $('#stats-error'); target.textContent = `No se pudo cerrar la sesión. ${error.message}`; target.hidden = false; }
  finally { $('#logout').disabled = false; }
});
document.querySelectorAll('[data-range]').forEach(button => button.addEventListener('click', () => {
  range = button.dataset.range;
  document.querySelectorAll('[data-range]').forEach(b => { const active = b === button; b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active)); });
  loadStats();
}));
$('#refresh').addEventListener('click', loadStats);
api('/api/auth').then(data => data.authenticated ? showDashboard() : showLogin()).catch(error => showLogin(error.message));
