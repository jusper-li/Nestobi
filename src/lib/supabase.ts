import { createClient } from '@supabase/supabase-js';

function getSupabaseUrl() {
  if (typeof window === 'undefined') return import.meta.env.VITE_SUPABASE_URL;
  return `${window.location.origin}/supabase`;
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
