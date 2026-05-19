import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const email = "superadmin@nestobi.com";
    const password = "888888";

    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const found = existingUser?.users?.find((u: { email?: string }) => u.email === email);

    let userId: string;

    if (found) {
      userId = found.id;
      await supabaseAdmin.auth.admin.updateUserById(userId, { password });
    } else {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (error) throw error;
      userId = data.user.id;
    }

    await supabaseAdmin.from("tbl_mn5wgzh0").upsert({
      user_id: userId,
      display_name: "超級管理員",
    }, { onConflict: "user_id" });

    await supabaseAdmin.from("tbl_user_auth").upsert({
      user_id: userId,
      role: "superadmin",
    }, { onConflict: "user_id" });

    return new Response(
      JSON.stringify({ success: true, userId, email }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
