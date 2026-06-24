export interface UserAuth {
  id: string;
  user_id: string;
  role: 'user' | 'admin' | 'superadmin' | 'vendor';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MemberProfile {
  id: string;
  user_id: string;
  display_name: string;
  phone: string;
  avatar_url: string;
  bio: string;
  nationality: string;
  preferred_language: string;
  coffee_profile_key?: string | null;
  coffee_profile_label?: string | null;
  coffee_profile_summary?: string | null;
  coffee_profile_scores?: Record<string, number> | null;
  coffee_profile_answers?: Record<string, string> | null;
  coffee_quiz_completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  notifications_email: boolean;
  notifications_sms: boolean;
  theme: string;
  currency: string;
  language: string;
  updated_at: string;
}

export interface Vendor {
  id: string;
  user_id: string | null;
  name: string;
  description: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  logo_url: string;
  website: string;
  is_active: boolean;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface Property {
  id: string;
  name: string;
  location: string;
  description: string;
  image_url: string;
  price_per_share: number;
  available_shares: number;
  total_shares: number;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface Room {
  id: string;
  vendor_id: string | null;
  hotel_id?: string | null;
  name: string;
  description: string;
  room_type: string;
  capacity: number;
  min_capacity?: number;
  price_per_night: number;
  weekend_price?: number;
  floor?: string;
  image_url: string;
  images?: string[];
  amenities: string[];
  location: string;
  is_available: boolean;
  created_at: string;
  updated_at: string;
  vendors?: Vendor;
  hotels?: { id: string; name: string; city: string; star_rating?: number } | null;
}

export interface Booking {
  id: string;
  user_id: string;
  room_id: string;
  check_in_date: string;
  check_out_date: string;
  guests: number;
  total_price: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  special_requests: string;
  created_at: string;
  updated_at: string;
  tbl_rooms?: Room;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  created_at: string;
  updated_at?: string;
}

export interface ProductCategoryLink {
  product_id?: string;
  category_id: string | null;
}

export interface Product {
  id: string;
  category_id: string | null;
  vendor_id: string | null;
  store_location_id?: string | null;
  name: string;
  description: string;
  price: number;
  image_url: string;
  images?: string[];
  stock_quantity: number;
  is_active: boolean;
  sku: string;
  origin?: string;
  roast_level?: string;
  processing_method?: string;
  altitude?: string;
  variety?: string[];
  flavor_notes?: string[];
  weight_grams?: number;
  tags?: string[];
  source_url?: string;
  roast_date?: string;
  created_at: string;
  updated_at: string;
  categories?: Category;
  product_category_links?: ProductCategoryLink[];
  vendors?: Vendor;
}

export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  products?: Product;
}

export interface Order {
  id: string;
  user_id: string;
  subscription_id?: string | null;
  recurring_cycle_no?: number;
  total_amount: number;
  subtotal_amount?: number;
  points_discount?: number;
  status: 'pending' | 'processing' | 'shipped' | 'completed' | 'cancelled';
  payment_method: string;
  payment_status: 'paid' | 'unpaid' | 'refunded';
  merchant_order_no?: string | null;
  newebpay_status?: 'not_required' | 'pending' | 'success' | 'failed' | null;
  newebpay_trade_no?: string | null;
  newebpay_auth_code?: string | null;
  newebpay_card_no?: string | null;
  newebpay_respond_code?: string | null;
  newebpay_payment_type?: string | null;
  newebpay_paid_at?: string | null;
  shipping_address: Record<string, string>;
  discount_code: string;
  currency: string;
  created_at: string;
  updated_at: string;
  purchase_records?: PurchaseRecord[];
}

export interface ProductSubscription {
  id: string;
  user_id: string;
  product_id: string;
  vendor_id?: string | null;
  order_id?: string | null;
  merchant_order_no?: string | null;
  newebpay_period_no?: string | null;
  quantity: number;
  monthly_amount: number;
  period_type: string;
  period_point: string;
  period_start_type: string;
  period_times: string;
  billing_cycle_count: number;
  status: 'pending' | 'active' | 'paused' | 'cancelled' | 'expired';
  next_bill_at?: string | null;
  last_billed_at?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  expires_at?: string | null;
  shipping_address: Record<string, string>;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  newebpay_trade_no?: string | null;
  newebpay_auth_code?: string | null;
  newebpay_card_no?: string | null;
  newebpay_payment_type?: string | null;
  newebpay_respond_code?: string | null;
  newebpay_status: 'pending' | 'success' | 'failed' | 'not_required';
  newebpay_paid_at?: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface PurchaseRecord {
  id: string;
  order_id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  payment_method: string;
  shipping_address: Record<string, string>;
  status: string;
  created_at: string;
  products?: Product;
  orders?: Order;
}

export interface Point {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: 'earned' | 'spent' | 'expired' | 'manual' | 'redemption' | 'store_redemption';
  reference_id: string | null;
  source_type?: 'booking' | 'order' | 'manual' | 'redemption' | 'store_redemption' | null;
  source_id?: string | null;
  vendor_id?: string | null;
  store_location_id?: string | null;
  description: string;
  created_at: string;
}

export interface StoreLocationManager {
  id: string;
  store_location_id: string;
  user_id: string;
  role: 'manager' | 'assistant' | 'supervisor';
  can_manage_store_info: boolean;
  can_manage_products: boolean;
  can_manage_inventory: boolean;
  can_manage_points: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  store_locations?: StoreLocation;
  members?: { display_name?: string | null } | null;
}

export interface StoreInventoryMovement {
  id: string;
  store_location_id: string;
  product_id: string;
  movement_type: 'purchase' | 'sale' | 'adjustment_in' | 'adjustment_out' | 'transfer_in' | 'transfer_out' | 'writeoff';
  quantity: number;
  unit_cost: number;
  supplier_name: string;
  invoice_no: string;
  purchase_date: string;
  note: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  products?: Product | null;
  store_locations?: StoreLocation | null;
}

export interface StorePointRedemption {
  id: string;
  store_location_id: string;
  user_id: string;
  points_used: number;
  discount_amount: number;
  reference_type: string;
  reference_id: string | null;
  note: string;
  used_at: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  store_locations?: StoreLocation | null;
}

export interface ItineraryPlan {
  id: string;
  user_id: string;
  title: string;
  destination: string;
  start_date: string | null;
  end_date: string | null;
  interests: string[];
  plan_data: Record<string, unknown>;
  status: 'draft' | 'completed' | 'shared';
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Translation {
  id: string;
  user_id: string;
  source_text: string;
  translated_text: string;
  source_lang: string;
  target_lang: string;
  status: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface UserUsage {
  id: string;
  user_id: string;
  feature_type: string;
  usage_count: number;
  last_used_at: string;
}

export interface SuperAdmin {
  id: string;
  user_id: string;
  granted_by: string | null;
  granted_at: string;
}

export interface UserPermission {
  id: string;
  user_id: string;
  permission: string;
  granted: boolean;
  granted_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface VerificationCode {
  id: string;
  email: string;
  code: string;
  expires_at: string;
  used: boolean;
  attempts: number;
  created_at: string;
}

export interface StoreLocationHours {
  primary: string;
  secondary?: string;
  note?: string;
}

export interface StoreLocation {
  id: string;
  vendor_id: string | null;
  name: string;
  name_en: string;
  slug: string;
  city: string;
  district: string;
  address: string;
  phone: string;
  hours: StoreLocationHours;
  image_url: string;
  map_url: string;
  sort_order: number;
  is_active: boolean;
  source_url: string;
  source_image_url: string;
  manager_notes?: string;
  created_at: string;
  updated_at: string;
}
