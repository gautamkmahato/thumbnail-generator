// app/api/save-to-supabase/route.js

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://fdmvffppytuiuctqijvc.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkbXZmZnBweXR1aXVjdHFpanZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MjQzNjMsImV4cCI6MjA2OTIwMDM2M30.J3rKyzimWVP8-tS7nGg6OFbnnJs4PAnn9CgEq9X3pnU";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function POST(req) {
  try {
    const { base64, fileName } = await req.json();

    if (!base64 || !fileName) {
      return NextResponse.json(
        { error: "Missing required fields: base64, fileName" },
        { status: 400 }
      );
    }

    console.log("[📩] Upload request received:", { fileName });

    const bucket = "product-images";

    // ✅ Strip base64 prefix if exists
    const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    // ✅ Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, buffer, {
        contentType: "image/png", // adjust if jpeg
        upsert: true,
      });

    if (error) {
      console.error("[❌] Supabase upload error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log("[✅] Uploaded file:", data);

    // ✅ Generate public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    console.log("[🌐] Public URL:", publicUrlData.publicUrl);

    return NextResponse.json({
      success: true,
      fileName,
      bucket,
      publicUrl: publicUrlData.publicUrl,
    });
  } catch (err) {
    console.error("[❌] Route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
