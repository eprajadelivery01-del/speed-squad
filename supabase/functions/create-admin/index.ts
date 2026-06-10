import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Verify the caller is an admin
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({
        error:
          "Apenas administradores logados podem criar usuários. Acesso Negado.",
      }),
      {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user: caller },
  } = await supabase.auth.getUser(token);

  if (!caller) {
    return new Response(
      JSON.stringify({ error: "Sessão inválida. Acesso Negado." }),
      {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", caller.id)
    .single();

  if (callerProfile?.role !== "admin") {
    return new Response(
      JSON.stringify({ error: "Apenas administradores podem criar usuários" }),
      {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  try {
    const body = await req.json();
    const {
      email,
      password,
      fullName,
      phone,
      document,
      role,
      vehicleType,
      vehiclePlate,
      companyName,
      address,
    } = body;

    if (!email || !password || !role) {
      return new Response(
        JSON.stringify({ error: "email, password e role são obrigatórios" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const validRoles = ["admin", "driver", "company", "customer"];
    if (!validRoles.includes(role)) {
      return new Response(JSON.stringify({ error: "Role inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create user
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName || "", role: role },
      });

    if (authError) {
      return new Response(JSON.stringify({ error: authError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = authData.user.id;

    // Update profile with role (profile is auto-created by trigger)
    await supabase
      .from("profiles")
      .update({
        full_name: fullName || "",
        phone: phone || null,
        role,
      })
      .eq("id", userId);

    // Also insert into user_roles table
    await supabase.from("user_roles").insert({
      user_id: userId,
      role,
    });

    // If driver, create delivery_drivers record
    if (role === "driver") {
      await supabase.from("delivery_drivers").insert({
        user_id: userId,
        full_name: fullName || "",
        phone: phone || null,
        document: document || null,
        vehicle_type: vehicleType || "motorcycle",
        vehicle_plate: vehiclePlate || null,
        status: "active",
      });
    }

    // If company, create companies record
    if (role === "company") {
      await supabase.from("companies").insert({
        name: companyName || fullName || "",
        phone: phone || null,
        email: email,
        address: address || null,
        document: document || null,
      });
    }

    return new Response(JSON.stringify({ success: true, userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
