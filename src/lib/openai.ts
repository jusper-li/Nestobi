const BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/openai-proxy`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function callAI<T = unknown>(action: string, params: Record<string, unknown>): Promise<T> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, ...params }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `Request failed: ${res.status}`);
  }
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result as T;
}
