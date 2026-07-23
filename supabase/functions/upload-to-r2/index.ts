import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { S3Client, PutObjectCommand } from "npm:@aws-sdk/client-s3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const r2Endpoint = Deno.env.get("R2_ENDPOINT");
    const r2AccessKey = Deno.env.get("R2_ACCESS_KEY_ID");
    const r2SecretKey = Deno.env.get("R2_SECRET_ACCESS_KEY");
    const r2BucketName = Deno.env.get("R2_BUCKET_NAME");

    if (!r2Endpoint || !r2AccessKey || !r2SecretKey || !r2BucketName) {
      return new Response(
        JSON.stringify({ error: "Missing R2 configuration. Please set R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME in Supabase secrets." }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const s3Client = new S3Client({
      region: "auto",
      endpoint: r2Endpoint,
      credentials: {
        accessKeyId: r2AccessKey,
        secretAccessKey: r2SecretKey,
      },
    });

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const path = formData.get("path") as string;

    if (!file || !path) {
      return new Response(
        JSON.stringify({ error: "File and path are required" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const fileBuffer = await file.arrayBuffer();

    const uploadParams = {
      Bucket: r2BucketName,
      Key: path,
      Body: new Uint8Array(fileBuffer),
      ContentType: file.type,
    };

    await s3Client.send(new PutObjectCommand(uploadParams));

    const publicUrl = Deno.env.get("R2_PUBLIC_URL") || `${r2Endpoint}/${r2BucketName}`;
    const fileUrl = `${publicUrl}/${path}`;

    return new Response(
      JSON.stringify({ message: "Upload successful", url: fileUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
