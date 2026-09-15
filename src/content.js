// Catálogo confirmado por el vendedor. Importes en pesos argentinos.
// Agregar fotos reales en images por variante: [{ src: '/images/...', alt: '...' }].
export const business = {
  name: 'Cella earplugs Mdz',
  location: 'Mendoza, Argentina',
  contacts: [
    { id: 'principal', whatsapp: '542615077131', displayPhone: '+54 261 507 7131' },
    { id: 'alternativo', whatsapp: '5492612076711', displayPhone: '+54 9 261 207-6711' },
  ],
  message: '¡Hola, Cella earplugs Mdz! Quiero consultar por sus earplugs.',
};

export const products = [
  {
    id: 'cella-serie-1', series: 'Serie 1', number: '01', name: 'Cella · Serie 1', price: 19000,
    description: 'Tres colores para encontrar el tuyo. Elegí tu combinación de serie y color y consultá disponibilidad con nosotros.',
    variants: [
      { id: 'blanco', name: 'Blanco', swatch: '#f5f3ee', images: [] },
      { id: 'starlight', name: 'Starlight', swatch: '#ddd3bf', images: [] },
      { id: 'negro', name: 'Negro', swatch: '#303135', images: [] },
    ],
  },
  {
    id: 'cella-serie-6', series: 'Serie 6', number: '06', name: 'Cella · Serie 6', price: 19000,
    description: 'Seis colores, una elección bien tuya. Encontrá tu favorito y escribinos para coordinar tu pedido.',
    variants: [
      { id: 'negro', name: 'Negro', swatch: '#303135', images: [] },
      { id: 'turquoise', name: 'Turquoise', swatch: '#65bfc3', images: [] },
      { id: 'purple', name: 'Purple', swatch: '#9981b7', images: [] },
      { id: 'pink', name: 'Pink', swatch: '#dfa8bb', images: [] },
      { id: 'starlight', name: 'Starlight', swatch: '#ddd3bf', images: [] },
      { id: 'midnight-blue', name: 'Midnight Blue', swatch: '#34445f', images: [] },
    ],
  },
];

export function whatsappUrl(message = business.message, contact = business.contacts[0]) {
  return `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(message)}`;
}

export function productMessage(product, variant) {
  const price = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(product.price);
  return `¡Hola, Cella earplugs Mdz! Me interesa Cella ${product.series}, color ${variant.name}, a ${price} ARS. ¿Tienen disponibilidad?`;
}
