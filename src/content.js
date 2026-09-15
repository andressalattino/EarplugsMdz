// Catálogo confirmado por el vendedor. Importes en pesos argentinos.
// Fotos originales del vendedor. Las galerías muestran la serie; el color elegido se indica por separado.
export const business = {
  name: 'Cella earplugs Mdz',
  location: 'Mendoza, Argentina',
  contacts: [
    { id: 'principal', whatsapp: '542615077131', displayPhone: '+54 261 507 7131' },
    { id: 'alternativo', whatsapp: '5492612076711', displayPhone: '+54 9 261 207-6711' },
  ],
  message: '¡Hola, Cella earplugs Mdz! Quiero consultar por sus earplugs.',
};

const serie1Photos = [
  { src: '/images/cella-serie-1-colores.png', alt: 'Cella Serie 1 en distintos colores, incluidos Blanco, Starlight y Negro', caption: 'Serie 1 · vista de colores' },
];
const serie6Photos = [
  { src: '/images/cella-serie-6-colores.png', alt: 'Seis pares Cella Serie 6 en sus estuches, en Purple, Pink, Starlight, Turquoise, Midnight Blue y Negro', caption: 'Serie 6 · todos los colores' },
  { src: '/images/cella-serie-6-purple.png', alt: 'Cella Serie 6 Purple con estuche y almohadillas', caption: 'Serie 6 · detalle en Purple', color: 'purple' },
  { src: '/images/cella-serie-6-detalle.png', alt: 'Cella Serie 6 en seis colores junto a un estuche negro', caption: 'Serie 6 · detalle de los tapones' },
  { src: '/images/cella-serie-6-estuches.png', alt: 'Cella Serie 6 con estuches y almohadillas de los seis colores', caption: 'Serie 6 · estuches y colores' },
];

export const products = [
  {
    id: 'cella-serie-1', series: 'Serie 1', number: '01', name: 'Cella · Serie 1', price: 19000,
    images: serie1Photos, galleryNote: 'La foto muestra otros colores. En esta tienda ofrecemos Blanco, Starlight y Negro.',
    description: 'Tres colores para encontrar el tuyo. Elegí tu combinación de serie y color y consultá disponibilidad con nosotros.',
    variants: [
      { id: 'blanco', name: 'Blanco', swatch: '#f5f3ee', images: [] },
      { id: 'starlight', name: 'Starlight', swatch: '#ddd3bf', images: [] },
      { id: 'negro', name: 'Negro', swatch: '#303135', images: [] },
    ],
  },
  {
    id: 'cella-serie-6', series: 'Serie 6', number: '06', name: 'Cella · Serie 6', price: 19000,
    images: serie6Photos, galleryNote: 'Galería de la Serie 6. El color de tu consulta es el que seleccionás abajo.',
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
