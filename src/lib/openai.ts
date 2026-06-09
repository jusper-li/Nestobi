import { supabase } from './supabase';

const BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/openai-proxy`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function callAI<T = unknown>(action: string, params: Record<string, unknown>): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const bearerToken = sessionData.session?.access_token || ANON_KEY;
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      apikey: ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, ...params }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `Request failed: ${res.status}`);
  }
  const responseData = await res.json();
  if (responseData.error) throw new Error(responseData.error);
  return responseData.result as T;
}
