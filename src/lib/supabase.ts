import { createClient } from '@supabase/supabase-js';

function getSupabaseUrl() {
  return import.meta.env.VITE_SUPABASE_URL || (typeof window === 'undefined' ? '' : `${window.location.origin}/supabase`);
}

const supabaseUrl = getSupabaseUrl();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const SUPABASE_OFFLINE_KEY = 'nestobi:supabase-temporarily-offline-until';

export const isSupabaseContentEnabled = Boolean(supabaseUrl && supabaseAnonKey);
export const isSupabaseAiEnabled = isSupabaseContentEnabled;

export function isMissingSupabaseTableError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const value = error as { code?: string; message?: string; details?: string };
  return value.code === '42P01' || /relation .* does not exist|table .* not found/i.test(`${value.message || ''} ${value.details || ''}`);
}

export function isSupabaseNetworkError(error: unknown) {
  if (error instanceof TypeError) return true;
  if (!error || typeof error !== 'object') return false;
  const value = error as { message?: string; name?: string };
  return /network|fetch|timeout|timed out|abort/i.test(`${value.name || ''} ${value.message || ''}`);
}

export function isSupabaseTemporarilyOffline() {
  if (typeof window === 'undefined') return false;
  const until = Number(window.sessionStorage.getItem(SUPABASE_OFFLINE_KEY) || 0);
  return until > Date.now();
}

export function markSupabaseTemporarilyOffline(durationMs = 30_000) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(SUPABASE_OFFLINE_KEY, String(Date.now() + durationMs));
}

export type {
  UserAuth, MemberProfile, UserPreferences,
  Vendor, Property, Room, Booking,
  Category, Product, CartItem,
  Order, PurchaseRecord, Point,
  ItineraryPlan, Translation, ChatMessage,
  UserUsage, SuperAdmin, UserPermission, VerificationCode,
  StoreLocation, StoreLocationHours
} from '../types';
