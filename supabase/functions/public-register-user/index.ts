import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const { email, password, displayName } = await req.json();
    const safeEmail = String(email || "").trim().toLowerCase();
    const safePassword = String(password || "");
    const safeDisplayName = String(displayName || "").trim();

    if (!safeEmail || !safePassword) {
      return json({ error: "Email and password are required." }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: "Supabase service key is not configured." }, 500);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: existing } = await admin.auth.admin.listUsers();
    const found = existing?.users?.find((user) => String(user.email || "").toLowerCase() === safeEmail);
    if (found) {
      return json({ error: "This email is already registered." }, 409);
    }

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: safeEmail,
      password: safePassword,
      email_confirm: true,
    });
    if (createError || !created.user) {
      return json({ error: createError?.message || "Unable to create user." }, 400);
    }

    await Promise.allSettled([
      admin.from("tbl_mn5wgzh0").upsert({ user_id: created.user.id, display_name: safeDisplayName }),
      admin.from("tbl_user_auth").upsert({ user_id: created.user.id, role: "user" }),
    ]);

    return json({ success: true, userId: created.user.id, email: safeEmail });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
