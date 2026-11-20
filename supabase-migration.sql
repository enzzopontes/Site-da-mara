-- =====================================================================
-- supabase-migration.sql  (idempotente, NAO destrutivo: sem DROP TABLE)
-- Rode no Supabase SQL Editor. Pode rodar varias vezes.
-- =====================================================================

-- 1) Colunas promocionais em products ---------------------------------
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS original_price NUMERIC(10,2) DEFAULT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS discount_percentage INTEGER DEFAULT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS badge_text TEXT DEFAULT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;

-- 2) adicionais --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.adicionais (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  available BOOLEAN DEFAULT TRUE,
  adicional_categoria TEXT DEFAULT 'proteinas'
);

ALTER TABLE public.adicionais ADD COLUMN IF NOT EXISTS adicional_categoria TEXT DEFAULT 'proteinas';
ALTER TABLE public.adicionais ADD COLUMN IF NOT EXISTS available BOOLEAN DEFAULT TRUE;
ALTER TABLE public.adicionais ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.adicionais ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3) Compatibilidade de tipos de ID -----------------------------------
DO $$
DECLARE
  fk RECORD;
  prod_type TEXT;
  adic_type TEXT;
  pa_exists BOOLEAN;
BEGIN
  SELECT format_type(a.atttypid, a.atttypmod) INTO prod_type
    FROM pg_attribute a
   WHERE a.attrelid = 'public.products'::regclass AND a.attname = 'id' AND NOT a.attisdropped;

  SELECT format_type(a.atttypid, a.atttypmod) INTO adic_type
    FROM pg_attribute a
   WHERE a.attrelid = 'public.adicionais'::regclass AND a.attname = 'id' AND NOT a.attisdropped;

  pa_exists := to_regclass('public.product_adicionais') IS NOT NULL;

  -- Remove FKs antigas da tabela de ligacao (so constraints, dados ficam)
  IF pa_exists THEN
    FOR fk IN
      SELECT conname FROM pg_constraint
       WHERE conrelid = 'public.product_adicionais'::regclass AND contype = 'f'
    LOOP
      EXECUTE format('ALTER TABLE public.product_adicionais DROP CONSTRAINT %I', fk.conname);
    END LOOP;
  END IF;

  -- adicionais.id: UUID -> TEXT (valores preservados como texto)
  IF adic_type = 'uuid' THEN
    ALTER TABLE public.adicionais ALTER COLUMN id DROP DEFAULT;
    ALTER TABLE public.adicionais ALTER COLUMN id TYPE TEXT USING id::text;
    ALTER TABLE public.adicionais ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
  END IF;

  -- products.id: NAO converter (order_items etc. dependem dele).
  -- Se for TEXT sem default, garante default para inserts sem id.
  IF prod_type = 'text' AND NOT EXISTS (
    SELECT 1 FROM pg_attrdef d JOIN pg_attribute a ON a.attrelid = d.adrelid AND a.attnum = d.adnum
     WHERE d.adrelid = 'public.products'::regclass AND a.attname = 'id') THEN
    ALTER TABLE public.products ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
  END IF;

  IF prod_type = 'uuid' THEN
    RAISE NOTICE 'products.id e UUID: product_adicionais.product_id sera UUID (IDs novos continuam funcionando).';
  END IF;

  IF NOT pa_exists THEN
    EXECUTE format($f$
      CREATE TABLE public.product_adicionais (
        product_id %s NOT NULL,
        adicional_id TEXT NOT NULL,
        PRIMARY KEY (product_id, adicional_id)
      )$f$, CASE WHEN prod_type = 'uuid' THEN 'UUID' ELSE 'TEXT' END);
  ELSE
    -- Ajusta tipos das colunas existentes
    IF (SELECT format_type(atttypid, atttypmod) FROM pg_attribute
         WHERE attrelid = 'public.product_adicionais'::regclass AND attname = 'adicional_id' AND NOT attisdropped) = 'uuid' THEN
      ALTER TABLE public.product_adicionais ALTER COLUMN adicional_id TYPE TEXT USING adicional_id::text;
    END IF;

    IF prod_type <> 'uuid' AND (SELECT format_type(atttypid, atttypmod) FROM pg_attribute
         WHERE attrelid = 'public.product_adicionais'::regclass AND attname = 'product_id' AND NOT attisdropped) = 'uuid' THEN
      ALTER TABLE public.product_adicionais ALTER COLUMN product_id TYPE TEXT USING product_id::text;
    END IF;

    -- Remove linhas orfas/nulas antes de recriar PK composta e FKs
    DELETE FROM public.product_adicionais WHERE product_id IS NULL OR adicional_id IS NULL;

    -- Remove duplicatas (mantem uma por par)
    DELETE FROM public.product_adicionais a USING public.product_adicionais b
     WHERE a.ctid < b.ctid AND a.product_id = b.product_id AND a.adicional_id = b.adicional_id;

    -- Troca PK antiga (id) pela composta
    IF EXISTS (SELECT 1 FROM pg_constraint
                WHERE conrelid = 'public.product_adicionais'::regclass AND contype = 'p') THEN
      EXECUTE format('ALTER TABLE public.product_adicionais DROP CONSTRAINT %I',
        (SELECT conname FROM pg_constraint
          WHERE conrelid = 'public.product_adicionais'::regclass AND contype = 'p'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'product_adicionais' AND column_name = 'id') THEN
      ALTER TABLE public.product_adicionais ALTER COLUMN id DROP NOT NULL;
    END IF;

    ALTER TABLE public.product_adicionais ALTER COLUMN product_id SET NOT NULL;
    ALTER TABLE public.product_adicionais ALTER COLUMN adicional_id SET NOT NULL;
    ALTER TABLE public.product_adicionais ADD PRIMARY KEY (product_id, adicional_id);
  END IF;

  -- Remove vinculos que apontam para itens inexistentes (senao a FK falha)
  DELETE FROM public.product_adicionais pa
   WHERE NOT EXISTS (SELECT 1 FROM public.products p WHERE p.id::text = pa.product_id::text)
      OR NOT EXISTS (SELECT 1 FROM public.adicionais ad WHERE ad.id = pa.adicional_id);

  ALTER TABLE public.product_adicionais
    ADD CONSTRAINT product_adicionais_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
  ALTER TABLE public.product_adicionais
    ADD CONSTRAINT product_adicionais_adicional_id_fkey
    FOREIGN KEY (adicional_id) REFERENCES public.adicionais(id) ON DELETE CASCADE;
END $$;

CREATE INDEX IF NOT EXISTS idx_product_adicionais_product_id ON public.product_adicionais(product_id);
CREATE INDEX IF NOT EXISTS idx_product_adicionais_adicional_id ON public.product_adicionais(adicional_id);

-- 4) RLS ---------------------------------------------------------------
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adicionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_adicionais ENABLE ROW LEVEL SECURITY;

-- SELECT publico (cardapio)
DROP POLICY IF EXISTS "public_read_products" ON public.products;
CREATE POLICY "public_read_products" ON public.products FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_read_adicionais" ON public.adicionais;
CREATE POLICY "public_read_adicionais" ON public.adicionais FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_read_product_adicionais" ON public.product_adicionais;
CREATE POLICY "public_read_product_adicionais" ON public.product_adicionais FOR SELECT TO anon, authenticated USING (true);

-- Escrita direta do navegador em product_adicionais: bloqueada.
-- Remove quaisquer policies de escrita antigas (anon/authenticated).
-- Service Role ignora RLS, entao a API /api/admin/products continua escrevendo.
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'product_adicionais' AND cmd <> 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.product_adicionais', pol.policyname);
  END LOOP;
END $$;

-- Observacao: policies de escrita antigas (somente admin) em products/adicionais
-- (scripts/015) foram mantidas para nao quebrar exclusao/edicao de adicionais
-- e delete de produto feitos direto pelo painel. Anonimos nao escrevem.

-- Recarrega cache do PostgREST
NOTIFY pgrst, 'reload schema';
