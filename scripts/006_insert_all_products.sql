-- Inserir todos os produtos do cardápio Batatop Delivery (Idempotente)
-- Este script adiciona batatas, macarrão e bebidas

-- BATATAS RECHEADAS
INSERT INTO products (name, description, price, category, image_url, available)
VALUES
  ('Strogonoff de Alcatra', 'Batata recheada com strogonoff de alcatra, requeijão cremoso, milho e batata palha', 25.99, 'batata', '/products/strogonoff-alcatra.jpg', true),
  ('Strogonoff de Frango', 'Batata recheada com strogonoff de frango, requeijão cremoso, milho e batata palha', 25.99, 'batata', '/products/strogonoff-frango.jpg', true),
  ('Calabresa Especial', 'Batata recheada com calabresa, molho especial, cebola roxa, requeijão cremoso, milho e batata palha', 24.99, 'batata', '/products/calabresa-especial.jpg', true),
  ('Pizza', 'Batata com presunto, queijo, mussarela, requeijão cremoso, milho e batata palha', 24.99, 'batata', '/products/pizza.jpg', true),
  ('Mussarela Supreme', 'Batata recheada com muito queijo mussarela, requeijão cremoso, milho e batata palha', 24.99, 'batata', '/products/mussarela-supreme.jpg', true),
  ('Filé ao Alho', 'Batata recheada com filé ao alho no molho especial, requeijão cremoso, milho, cebola roxa e batata palha', 28.99, 'batata', '/products/file-ao-alho.jpg', true),
  ('Brócolis com Bacon', 'Batata recheada com molho especial em brócolis, bacon, requeijão, mussarela e batata palha', 25.99, 'batata', '/products/brocolis-com-bacon.jpg', true),
  ('Costela', 'Batata recheada com molho especial de costela requeijão cremoso, mussarela, batata palha e pimenta biquinho', 26.99, 'batata', '/products/costela.jpg', true)
ON CONFLICT DO NOTHING;

-- MACARRÃO
INSERT INTO products (name, description, price, category, image_url, available)
VALUES
  ('Filé ao Alho Macarrão', 'Macarrão, molho especial de filé ao alho, queijo ralado e salsa verde', 28.99, 'macarrao', '/products/macarrao-file-ao-alho.jpg', true),
  ('Strogonoff de Frango Macarrão', 'Macarrão, strogonoff de frango, queijo ralado', 26.99, 'macarrao', '/products/macarrao-strogonoff-frango.jpg', true),
  ('Strogonoff de Alcatra Macarrão', 'Macarrão, strogonoff de alcatra, queijo ralado', 26.99, 'macarrao', '/products/macarrao-strogonoff-alcatra.jpg', true),
  ('Bolonhesa', 'Macarrão, molho vermelho com carne moída e queijo ralado', 26.99, 'macarrao', '/products/macarrao-bolonhesa.jpg', true),
  ('Brócolis com Bacon Macarrão', 'Macarrão e molho com brócolis, bacon, requeijão e queijo ralado', 26.99, 'macarrao', '/products/macarrao-brocolis-bacon.jpg', true),
  ('Mussarela Supreme Macarrão', 'Macarrão, molho especial, muita mussarela e queijo ralado', 26.99, 'macarrao', '/products/macarrao-mussarela-supreme.jpg', true),
  ('Mac & Cheese', 'Macarrão, molho cheddar, bacon e queijo ralado', 28.99, 'macarrao', '/products/macarrao-mac-cheese.jpg', true)
ON CONFLICT DO NOTHING;

-- BEBIDAS
INSERT INTO products (name, description, price, category, image_url, available)
VALUES
  ('Coca-Cola Lata Zero 350ml', 'Refrigerante Coca-Cola Zero lata gelada', 5.00, 'bebida', '/products/coca-cola-lata-zero.jpg', true),
  ('Coca-Cola Lata 350ml', 'Refrigerante Coca-Cola lata gelada', 5.00, 'bebida', '/products/coca-cola-lata.jpg', true),
  ('Coca-Cola 2L', 'Refrigerante Coca-Cola 2 litros gelado', 12.00, 'bebida', '/products/coca-cola-2l.jpg', true),
  ('Fanta 2L', 'Refrigerante Fanta 2 litros gelado', 12.00, 'bebida', '/products/fanta-2l.jpg', true),
  ('Coca-Cola 200ml', 'Refrigerante Coca-Cola 200ml gelado', 3.50, 'bebida', '/products/coca-cola-200ml.jpg', true)
ON CONFLICT DO NOTHING;

-- Verificar quantos produtos foram inseridos
DO $$
DECLARE
  product_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO product_count FROM products;
  RAISE NOTICE 'Total de produtos no banco: %', product_count;
END $$;
