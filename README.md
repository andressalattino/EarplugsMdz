# EarplugsMdz

Web en español argentino con HTML, JavaScript, Tailwind CSS 4 y Vite. Catálogo, contacto por WhatsApp y panel privado de visitas. API serverless para Vercel y PostgreSQL en Supabase. Chart.js se utiliza porque funciona directamente con JavaScript, sin React.

## Estado de entrega

- Repositorio Git local creado. No se creó un repositorio remoto ni se publicaron cambios en una cuenta de Vercel.
- Sitio y API implementados. Para usar visitas y autenticación con tu base real, ejecutar el SQL y configurar las variables indicadas abajo.
- WhatsApp configurado: **+54 261 507 7131**.
- Logo original de EarplugsMdz: símbolo SVG y marca tipográfica.
- Un único producto: **Loop Experience 2**, con la imagen principal del enlace de Amazon indicado por el usuario. Precio indicado por el vendedor: **ARS 25.000**.
- La configuración `.env.local` de esta carpeta tiene el usuario y la contraseña solicitados, almacenada como hash. No está incluida en Git ni en el ZIP. Falta completar únicamente Supabase y ajustar el origen para producción.

## 1. Probar localmente

Necesitás Node.js 22.20 o superior dentro de la rama 22.

```sh
npm ci
npm run dev
```

Abrí `http://localhost:5173`. El servidor local sirve tanto la web como `/api/*`. El catálogo se ve sin Supabase; el login y las estadísticas necesitan Supabase configurado. Nunca se sustituyen datos faltantes por estadísticas inventadas.

Si descargaste el ZIP, copiá `.env.example` a `.env.local`. Generá las credenciales con `npm run admin:password` e ingresá la contraseña solicitada en la conversación cuando aparezca el prompt. Copiá la salida a `.env.local`. No agregues esos valores al frontend ni al repositorio. No regeneres `ANALYTICS_SECRET` si ya tenés visitas registradas: cambiarlo cambia las identidades anónimas.

## 2. SQL que debés ejecutar en Supabase

1. Abrí tu proyecto Supabase y entrá a **SQL Editor**.
2. Copiá y ejecutá **todo** `supabase/schema.sql`.
3. Confirmá la creación de las tablas `epm_visits` y `epm_rate_limits` y las funciones `epm_record_visit`, `epm_rate_limit` y `epm_stats`.
4. En la configuración de API del proyecto, copiá la URL y una clave **secret** para uso de servidor. También se admite la clave legacy `service_role` en la variable alternativa indicada abajo.

El SQL es idempotente: volver a ejecutarlo no borra las visitas. Usa el esquema `public`, accesible por la Data API habitual de Supabase, pero revoca los permisos de `anon`, `authenticated` y `PUBLIC` sobre estas tablas y funciones. RLS está activado y forzado. No hay políticas públicas que permitan leer ni escribir filas.

Los visitantes registran visitas mediante `POST /api/visit`. **No insertan directamente en Supabase**. La función de Vercel valida la solicitud y usa la clave privada del servidor. Solo `service_role` puede ejecutar las RPC. `/api/stats` exige la sesión de administrador antes de acceder a esos datos. Esta arquitectura no requiere Supabase Auth porque el repositorio nuevo no tenía autenticación previa.

## 3. Variables que debés agregar en Vercel

En **Project → Settings → Environment Variables**, configurá:

| Variable | Valor / finalidad |
| --- | --- |
| `SUPABASE_URL` | URL de tu proyecto, `https://xxxx.supabase.co` |
| `SUPABASE_SECRET_KEY` | Clave privada `sb_secret_...`, exclusivamente del servidor |
| `ADMIN_USERNAME` | `admin` |
| `ADMIN_PASSWORD_HASH` | Hash `scrypt:...` de `.env.local`, o generado por `npm run admin:password` |
| `SESSION_SECRET` | Valor aleatorio privado de `.env.local`, al menos 32 caracteres |
| `ANALYTICS_SECRET` | Otro valor aleatorio independiente, de `.env.local`, al menos 32 caracteres |
| `APP_ORIGIN` | Origen público exacto, por ejemplo `https://earplugsmdz.vercel.app`, sin barra final ni rutas |

Alternativa: si usás la clave legacy, configurá `SUPABASE_SERVICE_ROLE_KEY` en lugar de `SUPABASE_SECRET_KEY`. No necesitás `anon` ni una clave pública en el navegador. **Ningún secreto lleva el prefijo `VITE_`.**

`VERCEL_URL` y `VERCEL_BRANCH_URL` son variables de la plataforma: las URLs de preview correspondientes también se aceptan como origen. Para separar estadísticas, usá otro proyecto Supabase y otros secretos en Preview. Si querés recoger datos solo del dominio principal, redirigí los dominios alternativos a ese dominio.

## 4. Publicar en Vercel

1. Subí este repositorio a tu GitHub y conectalo con Vercel, o importá el código mediante tu flujo habitual.
2. Si subiste la carpeta `earplugsmdz` como raíz del repo, dejá **Root Directory** en la raíz. Si la conservaste dentro de otra carpeta, elegila como Root Directory.
3. Framework: **Vite**. Build: `npm run build`. Output: `dist`. Node: **22.x**.
4. Agregá las variables y desplegá nuevamente después de cualquier cambio de configuración.
5. No subas solamente `dist`: Vercel también necesita `api/`, `server/`, `package.json`, el lockfile y `vercel.json` para crear las funciones.

`vercel.json` configura `/admin` y `/admin/estadisticas`, cabeceras de seguridad y exclusión del admin de los buscadores. No se requiere ningún servidor permanente; `scripts/dev.mjs` se usa solo en tu computadora.

## 5. Entrar al panel

Abrí **`https://TU-DOMINIO/admin/estadisticas`**. También funciona `/admin`.

- Usuario: `admin`.
- Contraseña: la que pediste en la conversación; el hash correspondiente ya está en el archivo local privado.
- No existe un enlace al admin en el sitio público.
- Sesión de 8 horas en cookie HttpOnly, SameSite=Strict y Secure en producción.
- La contraseña solo se compara en el servidor con scrypt; no se incluye en HTML, JavaScript público ni en la tabla de visitas.
- “Cerrar sesión” elimina la cookie. Cambiar `ADMIN_PASSWORD_HASH` o `SESSION_SECRET` invalida las sesiones emitidas previamente.

El HTML del formulario y la estructura vacía del dashboard son recursos estáticos. Pueden descargarse, pero **no contienen datos privados**: las estadísticas solo se obtienen con la API autenticada. Ocultar la URL no es el mecanismo de seguridad.

## 6. Métricas y privacidad

- Una carga de `/` registra una página vista, con fecha del servidor, familia del navegador, país aproximado si Vercel lo informa e identificador anonimizado mediante HMAC.
- Un UUID aleatorio en `localStorage`, válido durante 180 días, permite estimar visitantes únicos. Recargar genera otra página vista y mantiene el visitante. No hay fingerprinting.
- Los enlaces internos a Inicio, Productos y Contacto cambian el fragmento de la misma página: no generan páginas vistas adicionales. El admin nunca se cuenta.
- Si falla una petición, el cliente reintenta una vez con el mismo `eventId`. La clave primaria de PostgreSQL evita duplicarla incluso con concurrencia.
- Fechas del dashboard en `America/Argentina/Mendoza`. “7 días” es hoy y los seis días previos; “30 días” es hoy y los 29 previos. Las fechas se almacenan como `timestamptz`.
- Las cinco tarjetas superiores son métricas generales. Los filtros cambian las visitas y únicos del período, el gráfico, navegadores, países y tabla diaria.
- Los únicos del período se cuentan con `count(distinct visitor_hash)`, no sumando únicos diarios. Los agregados ocurren en PostgreSQL y no están limitados a 1.000 filas de respuesta REST.
- No se guardan IP, user-agent completo, URL con consultas, nombre, email ni ubicación exacta en las visitas.
- El país proviene del encabezado de Vercel; no se llama a geolocalizadores externos ni se solicita ubicación al navegador. Localmente figura “País no disponible”.
- La IP se usa solo en memoria para generar una clave temporal de rate limit, con HMAC diario. La tabla de rate limit no almacena la IP y se limpia al vencer sus ventanas, en solicitudes posteriores. La clave nunca se mezcla con las estadísticas.
- Bots conocidos y Do Not Track se omiten. El diálogo de privacidad permite excluir próximas visitas. El alojamiento puede mantener sus propios logs técnicos, independientes de esta base.
- Límites persistentes: 180 visitas/minuto por red, 120 por identificador; 10 intentos de login/15 minutos por red y 150 globales. Si Supabase falla, el login falla cerrado.
- Son estimaciones: cambiar de dispositivo, bloquear storage, borrar datos, incógnito, VPN y automatizaciones sofisticadas afectan las cifras. Los controles reducen abuso, no garantizan conteos de personas reales. Los bloqueadores o la exclusión de analítica pueden impedir el registro.

## 7. Cómo comprobar las visitas

1. Entrá al panel y anotá visitas totales y únicos.
2. Abrí el inicio en otra pestaña del mismo navegador. Revisá en Network que `POST /api/visit` responda **202** y `recorded: true`.
3. Volvé al panel y pulsá Actualizar. Debe haber una visita más. Si ese navegador ya había visitado la web, los únicos no aumentan.
4. Recargá el inicio dos veces: aumenta en dos las páginas vistas, no en dos los únicos.
5. Abrí el inicio en otro navegador o ventana de incógnito: debería sumarse un visitante único, salvo bloqueos de tracking.
6. Probá Hoy, 7 días, 30 días y Todo. Verificá el gráfico y “Ver datos por día”.
7. En una sesión sin autenticar, `/api/stats?range=all` debe responder **401**; `/admin/estadisticas` debe mostrar el login.

También se incluye una comprobación del despliegue:

```sh
npm run check:deployment -- https://TU-DOMINIO
```

Ese comando crea **una visita de prueba real**, verifica que reintentar el mismo evento no lo duplique y comprueba rechazo de estadísticas públicas y origen externo. Muestra el `event_id` para identificar esa visita en el SQL Editor. En un preview con Deployment Protection, usá un despliegue accesible o la autenticación autorizada de Vercel.

Consultas de verificación, solo desde SQL Editor:

```sql
select * from public.epm_visits order by visited_at desc limit 20;
select public.epm_stats('7d');
select relname, relrowsecurity, relforcerowsecurity
from pg_class where relname in ('epm_visits', 'epm_rate_limits');
```

## 8. Editar productos, precios, imágenes y contacto

`src/content.js` contiene todos los datos del vendedor y del catálogo. Para publicar el precio, cambiá `price` (número en ARS). `price: null` muestra “Consultar precio”. El nombre, descripción e imagen de cada tarjeta se editan en el mismo archivo. Actualizá también los textos estáticos si cambiás la empresa o su ubicación.

Las fotos están en `public/images/`; el símbolo del logo es `public/favicon.svg`. La procedencia de cada imagen se detalla en `ASSETS.md`. No se copiaron testimonios, cifras comerciales ni afirmaciones sobre la empresa de referencia.

## 9. Archivos creados y modificados

Como el directorio estaba vacío, **todos los archivos del proyecto son nuevos**. No se modificaron archivos de un proyecto previo.

| Archivos | Contenido |
| --- | --- |
| `index.html` | Inicio, beneficios, productos, preguntas frecuentes, contacto y privacidad |
| `admin.html` | Formulario de acceso y dashboard privado |
| `src/content.js`, `src/main.js`, `src/style.css` | Datos comerciales, interacciones y estilos con Tailwind |
| `src/tracking.js` | UUID local, privacidad, registro y reintentos |
| `src/admin.js`, `src/admin.css` | Autenticación del cliente, filtros, gráfico y diseño del panel |
| `api/auth.js`, `api/visit.js`, `api/stats.js` | Funciones serverless de Vercel |
| `server/security.js`, `server/db.js` | Sesiones, hash, validación y conexión privada con Supabase |
| `supabase/schema.sql` | Tablas, índices, RLS, permisos, límites y agregados |
| `scripts/dev.mjs` | Desarrollo local con API |
| `scripts/admin-password.mjs` | Generación interactiva de hash y secretos |
| `scripts/check-deployment.mjs` | Verificación del sitio desplegado |
| `tests/security.test.js`, `tests/database.test.js` | Pruebas de seguridad, API y PostgreSQL |
| `public/favicon.svg`, `public/images/*` | Logo, fotografías y arte decorativo |
| `package.json`, `package-lock.json`, `vite.config.js`, `vercel.json` | Dependencias y configuración de compilación/despliegue |
| `.gitignore`, `.env.example` | Exclusiones y plantilla de variables |
| `README.md`, `ASSETS.md` | Instrucciones y fuentes |
| `.env.local` (privado, ignorado) | Configuración local prearmada; no se incluye en el ZIP |

## Validación realizada

`npm test`: 19 pruebas pasan. Incluye ejecución del SQL real en PostgreSQL embebido (PGlite), migración repetida, permisos/RLS, rol del servidor, fechas límite de Mendoza, idempotencia, rate limits y más de 1.000 registros. Los tests de API cubren cookies, expiración, CSRF, login, anonimización y acceso privado.

`npm run build`: compilación de producción verificada. Navegación, enlace de WhatsApp, menú móvil, inicio de sesión y filtros del dashboard probados en navegador. El catálogo muestra un único producto, sin filtros de categorías. El dashboard se comprobó contra una base PostgreSQL local de prueba aislada; esos datos **no forman parte del producto ni de tu Supabase**. Falta probar el entorno real después de configurar tus variables.

Fuentes técnicas: [Tailwind con Vite](https://tailwindcss.com/docs/installation/using-vite), [RLS en Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security), [claves de Supabase](https://supabase.com/docs/guides/getting-started/api-keys), [funciones Node.js en Vercel](https://vercel.com/docs/functions/runtimes/node-js), [país aproximado en Vercel](https://vercel.com/docs/headers/request-headers).
