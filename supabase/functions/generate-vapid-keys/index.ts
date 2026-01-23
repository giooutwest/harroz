// Edge function to generate new VAPID keys for push notifications
// This should only be called once during setup

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate VAPID keys using Web Crypto API
async function generateVapidKeys(): Promise<{ publicKey: string; privateKey: string }> {
  // Generate an ECDSA P-256 key pair
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    true,
    ["sign", "verify"],
  );

  // Export the public key in raw format
  const publicKeyBuffer = await crypto.subtle.exportKey("raw", keyPair.publicKey);
  const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKeyBuffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  // Export the private key in PKCS8 format, then extract the raw key
  const privateKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
  const privateKeyBase64 = privateKeyJwk.d!; // The 'd' parameter is the private key

  return {
    publicKey: publicKeyBase64,
    privateKey: privateKeyBase64,
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Generating new VAPID key pair...");

    const keys = await generateVapidKeys();

    console.log("VAPID keys generated successfully");

    return new Response(
      JSON.stringify({
        message: "VAPID keys generated successfully",
        publicKey: keys.publicKey,
        privateKey: keys.privateKey,
        instructions: {
          publicKey: "This key should be hardcoded in the frontend (it is safe to expose)",
          privateKey: "This key must be stored as a secret named VAPID_PRIVATE_KEY",
        },
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error: unknown) {
    console.error("Error generating VAPID keys:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }
});
