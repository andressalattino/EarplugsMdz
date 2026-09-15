# Administrar el catálogo de Cella

Entrá en `/admin/productos` con el mismo usuario y contraseña del panel de estadísticas. También podés cambiar de sección con el menú del administrador.

## Crear y editar

1. Usá **Nuevo producto** o **Editar** en uno existente.
2. Completá nombre, serie, descripción, precio en pesos sin centavos y orden (los números más bajos aparecen primero).
3. Agregá los colores disponibles: cada uno lleva un nombre y una muestra. Se muestran como información, sin selección ni compra online.
4. Cargá las fotos JPG, PNG o WebP. Podés agregar hasta 12 y reordenarlas con **Antes / Después**. La primera es la portada. Escribí una descripción de lo que muestra cada foto.
5. Activá **Mostrar en la web** para publicar o dejalo desactivado para guardar un borrador. Elegí **Guardar producto** y esperá la confirmación.

Para ocultar un producto, desactivá **Mostrar en la web** y guardá. No se elimina: podés publicarlo nuevamente. Los cambios se ven al abrir o recargar la página pública; no necesitan un nuevo despliegue en Vercel.

La subida de fotos es independiente del guardado del producto. Quitar una foto del formulario quita su referencia al guardar; no elimina el archivo original de Storage. Cancelar el editor tampoco elimina las fotos ya subidas. Esto evita borrar imágenes que otro producto pueda estar usando. Solo subí fotos destinadas al catálogo público, incluso cuando el producto sea un borrador.

Si otra sesión editó el mismo producto, el guardado se rechaza para evitar sobrescribir sus cambios. Conservá lo que escribiste y usá **Recargar catálogo** para obtener la versión nueva.

## Configuración técnica

- Ejecutar `supabase/schema.sql` (estadísticas y límites, ya existente) y después **`supabase/catalog.sql`** en Supabase. La migración del catálogo es idempotente, carga las dos series originales sin sobrescribir ediciones y crea el bucket `epm-product-images`.
- No hacen falta variables nuevas: se reutilizan `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (o `SUPABASE_SERVICE_ROLE_KEY`), `APP_ORIGIN`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET` y `ANALYTICS_SECRET`.
- `epm_products` tiene RLS y no concede acceso a `anon` ni `authenticated`. Solo el backend, después de autenticar al administrador, escribe con la clave privada del servidor. La API pública devuelve únicamente los productos publicados.
- Las imágenes se guardan en un bucket público de fotos del catálogo. Las políticas restrictivas impiden escritura directa con los roles públicos, incluso si existen políticas permisivas de otros proyectos.
- El navegador optimiza cada imagen a WebP, hasta 1800 píxeles en su lado mayor. El servidor acepta únicamente JPG/PNG/WebP de hasta 2 MB y valida sesión, origen y formato; no admite SVG ni URLs externas arbitrarias.
- Las subidas pasan por una función de Vercel con un límite de 3 MB de JSON, por debajo del [límite de solicitudes de Vercel](https://vercel.com/docs/errors/function_payload_too_large). Almacenamiento mediante [Supabase Storage](https://supabase.com/docs/guides/storage/uploads/standard-uploads).
- Los IDs estables y una revisión por producto protegen contra actualizaciones concurrentes. Los borradores nunca se incluyen en la lectura pública.

Para verificar: iniciar sesión, editar un producto, guardar y recargar la web. Para verificar permisos, `/api/products?admin=1` debe responder 401 sin sesión y `/api/products` solo debe devolver publicados. `npm test` incluye pruebas de validación, autenticación, CSRF, concurrencia, publicación y RLS del catálogo.
