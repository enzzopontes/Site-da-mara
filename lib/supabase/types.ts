export interface Profile {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  name: string
  description: string | null
  price: number
  original_price: number | null
  discount_percentage: number | null
  badge_text: string | null
  is_featured: boolean
  category: string
  image_url: string | null
  available: boolean
  created_at: string
  updated_at: string
}

export interface Order {
  id: string
  user_id: string | null
  customer_name: string
  customer_phone: string
  customer_address: string
  customer_neighborhood: string
  customer_complement: string | null
  payment_method: string
  total_amount: number
  discount_amount: number
  coupon_code: string | null
  status: string
  notes: string | null
  delivery_type: string | null
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string | null
  product_name: string
  product_price: number
  quantity: number
  notes: string | null
  adicionais: any | null
  created_at: string
}

export interface Coupon {
  id: string
  code: string
  discount_type: "percentage" | "fixed"
  discount_value: number
  min_order_value: number
  max_uses: number | null
  current_uses: number
  active: boolean
  expires_at: string | null
  created_at: string
  updated_at: string
}

export interface StoreSettings {
  id: string
  setting_key: string
  setting_value: any
  updated_at: string
}

export interface WaitTimeState {
  id: string
  base_time: number
  additional_time: number
  last_order_time: string
  updated_at: string
}
