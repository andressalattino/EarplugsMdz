// Un único producto. Precio de EarplugsMdz en ARS, indicado por el vendedor.
export const business = {
  name: 'EarplugsMdz',
  location: 'Mendoza, Argentina',
  whatsapp: '542615077131',
  displayPhone: '+54 261 507 7131',
  message: '¡Hola, EarplugsMdz! Quiero consultar por los Loop Experience 2.',
};

export const products = [
  { id: 'loop-experience-2', name: 'Loop Experience 2', category: 'Música, recitales y eventos · 1 par', description: 'Tapones reutilizables de alta fidelidad que filtran el ruido y mantienen la claridad de la música. Un diseño compacto para acompañarte en recitales, festivales y eventos.', price: 25000, image: '/images/loop-experience-2.jpg', color: 'lilac', tag: 'ALTA FIDELIDAD', features: ['Un par de tapones Loop Experience 2', 'Almohadillas de silicona en talles XS, S, M y L', 'Estuche para llevarlos con vos'] },
];

export function whatsappUrl(message = business.message) {
  return `https://wa.me/${business.whatsapp}?text=${encodeURIComponent(message)}`;
}
