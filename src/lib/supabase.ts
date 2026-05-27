import { createClient } from '@supabase/supabase-js';

function getSupabaseUrl() {
  if (typeof window === 'undefined') return import.meta.env.VITE_SUPABASE_URL;
  const localHosts = new Set(['localhost', '127.0.0.1', '::1']);
  if (localHosts.has(window.location.hostname)) return `${window.location.origin}/supabase`;
  return import.meta.env.VITE_SUPABASE_URL;
}

const supabaseUrl = getSupabaseUrl();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type {
  UserAuth, MemberProfile, UserPreferences,
  Vendor, Property, Room, Booking,
  Category, Product, CartItem,
  Order, PurchaseRecord, Point,
  ItineraryPlan, Translation, ChatMessage,
  UserUsage, SuperAdmin, UserPermission, VerificationCode,
  StoreLocation, StoreLocationHours
} from '../types';
