// Un único producto. Precio de EarplugsMdz en ARS, indicado por el vendedor.
export const business = {
  name: 'EarplugsMdz',
  location: 'Mendoza, Argentina',
  whatsapp: '542615077131',
  displayPhone: '+54 261 507 7131',
  message: '¡Hola, EarplugsMdz! Quiero consultar por los tapones Earplugs.',
};

export const products = [
  { id: 'earplugs', name: 'Tapones Earplugs', category: 'TAPONES PARA OÍDOS', description: 'Un pequeño cambio para tus momentos de calma. Conocé los tapones disponibles en EarplugsMdz y consultanos para elegir según el uso que necesitás.', price: 25000, image: '/images/earplugs-referencia.jpg', imageAlt: 'Foto de referencia; no corresponde al producto ofrecido', color: 'lilac', tag: 'EARPLUGSMDZ', features: ['Atención personalizada en Mendoza', 'Consultá disponibilidad y formas de entrega'], imageNote: 'Foto de referencia. No corresponde al producto ofrecido. Pedinos fotos reales por WhatsApp.' },
];

export function whatsappUrl(message = business.message) {
  return `https://wa.me/${business.whatsapp}?text=${encodeURIComponent(message)}`;
}
