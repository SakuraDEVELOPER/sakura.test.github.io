import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { verifyFirebaseIdToken } from "../_shared/firebase.ts";

type DeleteRequestBody = {
  path?: unknown;
};

function getRequiredEnv(name: string) {
  const value = Deno.env.get(name)?.trim();

  if (!value) {
    throw new Error(`Missing required secret: ${name}`);
  }

  return value;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, { status: 405 });
  }

  try {
    const authHeader = request.headers.get("Authorization") ?? "";

    if (!authHeader.startsWith("Bearer ")) {
      return jsonResponse({ error: "Missing Firebase bearer token." }, { status: 401 });
    }

    const idToken = authHeader.slice("Bearer ".length).trim();
    const firebaseProjectId = getRequiredEnv("FIREBASE_PROJECT_ID");
    const bucket = Deno.env.get("SUPABASE_STORAGE_BUCKET")?.trim() || "comment-media";
    const supabaseUrl = getRequiredEnv("SUPABASE_URL");
    const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const requester = await verifyFirebaseIdToken(idToken, firebaseProjectId);
    const body = (await request.json()) as DeleteRequestBody;
    const path = typeof body.path === "string" ? body.path.trim() : "";

    if (!path) {
      return jsonResponse({ error: "Missing storage path." }, { status: 400 });
    }

    if (!path.startsWith(`comments/${requester.uid}/`)) {
      return jsonResponse({ error: "You can only remove your own comment media." }, { status: 403 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { error } = await supabase.storage.from(bucket).remove([path]);

    if (error) {
      return jsonResponse({ error: error.message }, { status: 500 });
    }

    return jsonResponse({ ok: true, path });
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : "Unexpected deletion error.",
      },
      { status: 500 }
    );
  }
});
