-- Ejecutar una vez en el mismo proyecto que las estadísticas. Es idempotente.
-- No modifica visitas, usuarios ni productos existentes.
begin;
create table if not exists public.epm_products (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]{0,79}$'),
  data jsonb not null check (jsonb_typeof(data) = 'object'
    and data ?& array['name','series','description','price','variants','images']
    and jsonb_typeof(data->'variants') = 'array'
    and jsonb_typeof(data->'images') = 'array'),
  published boolean not null default false,
  sort_order integer not null default 0 check (sort_order between 0 and 9999),
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now()
);
alter table public.epm_products enable row level security;
alter table public.epm_products force row level security;
revoke all on public.epm_products from public, anon, authenticated;
grant select, insert, update on public.epm_products to service_role;
-- Lectura pública solo a través de /api/products, que filtra published=true.
-- Sin políticas de escritura pública. El servidor valida sesión y origen.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('epm-product-images', 'epm-product-images', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
-- Las fotos del catálogo son públicas. Subidas únicamente con service_role.
-- Políticas restrictivas protegen este bucket incluso si otro proyecto comparte
-- la base y tiene políticas permisivas para otros buckets.
do $$ begin
if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='epm_images_no_client_insert') then
create policy epm_images_no_client_insert on storage.objects as restrictive for insert to anon, authenticated
with check (bucket_id <> 'epm-product-images');
end if; end $$;
do $$ begin
if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='epm_images_no_client_update') then
create policy epm_images_no_client_update on storage.objects as restrictive for update to anon, authenticated
using (bucket_id <> 'epm-product-images') with check (bucket_id <> 'epm-product-images');
end if; end $$;
do $$ begin
if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='epm_images_no_client_delete') then
create policy epm_images_no_client_delete on storage.objects as restrictive for delete to anon, authenticated
using (bucket_id <> 'epm-product-images');
end if; end $$;
insert into public.epm_products (id, data, published, sort_order) values ('cella-serie-1', '{"series":"Serie 1","name":"Cella · Serie 1","price":19000,"images":[{"src":"/images/cella-serie-1-colores.png","alt":"Cella Serie 1 en distintos colores, incluidos Blanco, Starlight y Negro","caption":"Serie 1 · vista de colores"}],"galleryNote":"La foto muestra otros colores. En esta tienda ofrecemos Blanco, Starlight y Negro.","description":"Disponible en tres colores. Consultanos por WhatsApp para conocer la disponibilidad y coordinar tu pedido.","variants":[{"id":"blanco","name":"Blanco","swatch":"#f5f3ee"},{"id":"starlight","name":"Starlight","swatch":"#ddd3bf"},{"id":"negro","name":"Negro","swatch":"#303135"}]}'::jsonb, true, 0) on conflict (id) do nothing;
insert into public.epm_products (id, data, published, sort_order) values ('cella-serie-6', '{"series":"Serie 6","name":"Cella · Serie 6","price":19000,"images":[{"src":"/images/cella-serie-6-colores.png","alt":"Seis pares Cella Serie 6 en sus estuches, en Purple, Pink, Starlight, Turquoise, Midnight Blue y Negro","caption":"Serie 6 · todos los colores"},{"src":"/images/cella-serie-6-purple.png","alt":"Cella Serie 6 Purple con estuche y almohadillas","caption":"Serie 6 · detalle en Purple"},{"src":"/images/cella-serie-6-detalle.png","alt":"Cella Serie 6 en seis colores junto a un estuche negro","caption":"Serie 6 · detalle de los tapones"},{"src":"/images/cella-serie-6-estuches.png","alt":"Cella Serie 6 con estuches y almohadillas de los seis colores","caption":"Serie 6 · estuches y colores"}],"galleryNote":"Galería de la Serie 6. Consultá la disponibilidad de tu color por WhatsApp.","description":"Seis colores, una elección bien tuya. Encontrá tu favorito y escribinos para coordinar tu pedido.","variants":[{"id":"negro","name":"Negro","swatch":"#303135"},{"id":"turquoise","name":"Turquoise","swatch":"#65bfc3"},{"id":"purple","name":"Purple","swatch":"#9981b7"},{"id":"pink","name":"Pink","swatch":"#dfa8bb"},{"id":"starlight","name":"Starlight","swatch":"#ddd3bf"},{"id":"midnight-blue","name":"Midnight Blue","swatch":"#34445f"}]}'::jsonb, true, 1) on conflict (id) do nothing;
commit;
