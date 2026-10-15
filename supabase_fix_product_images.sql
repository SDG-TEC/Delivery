-- ==============================================================================
-- 🍕🍔 SDG DELIVERY - ATUALIZAÇÃO DE FOTOS DO CARDÁPIO (PRODUTOS & COMBOS)
-- ==============================================================================
-- Este script associa a foto correta a cada lanche, combo e pizza com base no nome.
-- ==============================================================================

BEGIN;

-- 1. BASE DE STORAGE DO SUPABASE
-- URL: https://<SEU_PROJECT_ID>.supabase.co/storage/v1/object/public/delivery-media/products/

-- COMBOS DE LANCHES (associando à foto real do lanche correspondente)
UPDATE public.products SET image = 'https://<SEU_PROJECT_ID>.supabase.co/storage/v1/object/public/delivery-media/products/x_tudo_artesanal.jpg' WHERE category_id = 'combos' AND name ILIKE '%X%TUDO%';
UPDATE public.products SET image = 'https://<SEU_PROJECT_ID>.supabase.co/storage/v1/object/public/delivery-media/products/x_bacon_especial.jpg' WHERE category_id = 'combos' AND name ILIKE '%X%BACON%';
UPDATE public.products SET image = 'https://<SEU_PROJECT_ID>.supabase.co/storage/v1/object/public/delivery-media/products/x_salada_bacon.jpg' WHERE category_id = 'combos' AND name ILIKE '%X%SALADA%BACON%';
UPDATE public.products SET image = 'https://<SEU_PROJECT_ID>.supabase.co/storage/v1/object/public/delivery-media/products/x_salada_egg.jpg' WHERE category_id = 'combos' AND name ILIKE '%X%SALADA%EGG%';
UPDATE public.products SET image = 'https://<SEU_PROJECT_ID>.supabase.co/storage/v1/object/public/delivery-media/products/x_salada_classico.jpg' WHERE category_id = 'combos' AND name ILIKE '%X%SALADA';
UPDATE public.products SET image = 'https://<SEU_PROJECT_ID>.supabase.co/storage/v1/object/public/delivery-media/products/x_burguer_cheddar.jpg' WHERE category_id = 'combos' AND name ILIKE '%X%BURGUER%';
UPDATE public.products SET image = 'https://<SEU_PROJECT_ID>.supabase.co/storage/v1/object/public/delivery-media/products/egg_burguer_chapa.jpg' WHERE category_id = 'combos' AND name ILIKE '%EGG%BURGUER%';
UPDATE public.products SET image = 'https://<SEU_PROJECT_ID>.supabase.co/storage/v1/object/public/delivery-media/products/hamburguer_simples.jpg' WHERE category_id = 'combos' AND name ILIKE '%HAMBURGUER';
UPDATE public.products SET image = 'https://<SEU_PROJECT_ID>.supabase.co/storage/v1/object/public/delivery-media/products/misto_quente_chapa.jpg' WHERE category_id = 'combos' AND name ILIKE '%MISTO%QUENTE%';
UPDATE public.products SET image = 'https://<SEU_PROJECT_ID>.supabase.co/storage/v1/object/public/delivery-media/products/mistao_recheado.jpg' WHERE category_id = 'combos' AND name ILIKE '%MISTAO%';
UPDATE public.products SET image = 'https://<SEU_PROJECT_ID>.supabase.co/storage/v1/object/public/delivery-media/products/sanduiche_especial.jpg' WHERE category_id = 'combos' AND (name ILIKE '%ESPECIAL%' OR name ILIKE '%ESPECIAIS%');
UPDATE public.products SET image = 'https://<SEU_PROJECT_ID>.supabase.co/storage/v1/object/public/delivery-media/products/macarrao_na_chapa.jpg' WHERE category_id = 'combos' AND name ILIKE '%MACARRAO%';

-- PIZZAS (associando à foto real de cada sabor específico)
UPDATE public.products SET image = 'https://<SEU_PROJECT_ID>.supabase.co/storage/v1/object/public/delivery-media/products/pizza_calabresa_artesanal.jpg' WHERE category_id = 'pizzas' AND name ILIKE '%CALABRESA%';
UPDATE public.products SET image = 'https://<SEU_PROJECT_ID>.supabase.co/storage/v1/object/public/delivery-media/products/pizza_frango_catupiry.jpg' WHERE category_id = 'pizzas' AND name ILIKE '%FRANGO%CATUPIRY%';
UPDATE public.products SET image = 'https://<SEU_PROJECT_ID>.supabase.co/storage/v1/object/public/delivery-media/products/pizza_quattro_formaggi.jpg' WHERE category_id = 'pizzas' AND name ILIKE '%4%QUEIJO%';
UPDATE public.products SET image = 'https://<SEU_PROJECT_ID>.supabase.co/storage/v1/object/public/delivery-media/products/pizza_nordestina_grande.jpg' WHERE category_id = 'pizzas' AND name ILIKE '%NORDESTINA%';
UPDATE public.products SET image = 'https://<SEU_PROJECT_ID>.supabase.co/storage/v1/object/public/delivery-media/products/pizza_a_moda_grande.jpg' WHERE category_id = 'pizzas' AND (name ILIKE '%A MODA%' OR name ILIKE '%À MODA%');
UPDATE public.products SET image = 'https://<SEU_PROJECT_ID>.supabase.co/storage/v1/object/public/delivery-media/products/pizza_4_sabores_grande.jpg' WHERE category_id = 'pizzas' AND name ILIKE '%4%SABOR%';
UPDATE public.products SET image = 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?auto=format&fit=crop&w=800&q=80' WHERE category_id = 'pizzas' AND (name ILIKE '%PORTUGUESA%' OR name ILIKE '%PORUGUESA%');
UPDATE public.products SET image = 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80' WHERE category_id = 'pizzas' AND name ILIKE '%BACON%MILHO%';
UPDATE public.products SET image = 'https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?auto=format&fit=crop&w=800&q=80' WHERE category_id = 'pizzas' AND name ILIKE '%PRESUNTO%';

COMMIT;
