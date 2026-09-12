// Datos públicos editables. Precios ARS tomados del catálogo de referencia el 12/09/2026.
// Reemplazar por los precios de EarplugsMdz y poner referencePrices=false al confirmarlos.
export const business = {
  name: 'EarplugsMdz',
  location: 'Mendoza, Argentina',
  whatsapp: '542615077131',
  displayPhone: '+54 261 507 7131',
  message: '¡Hola, EarplugsMdz! Quiero consultar por los tapones para oídos.',
  referencePrices: true,
};

export const products = [
  { id: 'ruido', name: 'Goma Soft Expandible', category: 'Tu día, más tranquilo · 1 par', description: 'Tapones de goma expandible con cuerda para reducir el ruido del entorno. Presentación de un par. Consultá su colocación y nivel de protección.', price: 4085, image: '/images/ruido.png', color: 'lilac', tag: 'RUIDO' },
  { id: 'descanso', name: 'Silicona Moldeable', category: 'Tu momento de desconectar · 2 pares', description: 'Tapones de silicona moldeable incolora para agua y ruidos molestos. Presentación de dos pares con estuche. Consultanos por su uso durante el descanso.', price: 4170, image: '/images/descanso.png', color: 'peach', tag: 'DESCANSO' },
  { id: 'agua', name: 'Splash', category: 'Disfrutá cada chapuzón · 2 pares', description: 'Tapones de silicona moldeable verde flúo, línea Splash para actividades acuáticas. Presentación de dos pares. Seguí las instrucciones del fabricante.', price: 4170, image: '/images/agua.png', color: 'mint', tag: 'AGUA' },
];

export function whatsappUrl(message = business.message) {
  return `https://wa.me/${business.whatsapp}?text=${encodeURIComponent(message)}`;
}
