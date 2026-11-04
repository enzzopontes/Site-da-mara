-- RLS Policies for profiles (idempotent)
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for products (public read, admin write)
DROP POLICY IF EXISTS "Anyone can view available products" ON products;
CREATE POLICY "Anyone can view available products"
  ON products FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view all products" ON products;
CREATE POLICY "Authenticated users can view all products"
  ON products FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for orders
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
CREATE POLICY "Users can view their own orders"
  ON orders FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own orders" ON orders;
CREATE POLICY "Users can create their own orders"
  ON orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for order_items
DROP POLICY IF EXISTS "Users can view their order items" ON order_items;
CREATE POLICY "Users can view their order items"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create order items for their orders" ON order_items;
CREATE POLICY "Users can create order items for their orders"
  ON order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- RLS Policies for coupons (public read active coupons)
DROP POLICY IF EXISTS "Anyone can view active coupons" ON coupons;
CREATE POLICY "Anyone can view active coupons"
  ON coupons FOR SELECT
  USING (active = true);

-- RLS Policies for store_settings (public read)
DROP POLICY IF EXISTS "Anyone can view store settings" ON store_settings;
CREATE POLICY "Anyone can view store settings"
  ON store_settings FOR SELECT
  USING (true);

-- RLS Policies for wait_time_state (public read)
DROP POLICY IF EXISTS "Anyone can view wait time" ON wait_time_state;
CREATE POLICY "Anyone can view wait time"
  ON wait_time_state FOR SELECT
  USING (true);

-- RLS Policies for adicionais table
DROP POLICY IF EXISTS "Anyone can view available adicionais" ON adicionais;
CREATE POLICY "Anyone can view available adicionais"
  ON adicionais FOR SELECT
  USING (true);

-- RLS Policies for product_adicionais (public read)
DROP POLICY IF EXISTS "Anyone can view product adicionais" ON product_adicionais;
CREATE POLICY "Anyone can view product adicionais"
  ON product_adicionais FOR SELECT
  USING (true);
