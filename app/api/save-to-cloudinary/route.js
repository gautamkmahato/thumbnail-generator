// app/api/save-to-supabase/route.js

// app/api/save-to-cloudinary/route.js

import { NextResponse } from "next/server";
import cloudinary from "cloudinary";

// 🔑 Configure Cloudinary (use env vars instead of hardcoding)
cloudinary.v2.config({
  cloud_name: "diehxqlx2",
  api_key: "124894181855946",
  api_secret: "rer3_wt_XNHJVekUvZRsWEHBvRI",
});

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

    // ✅ Strip base64 prefix if exists
    const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");

    // ✅ Upload to Cloudinary
    const uploadResponse = await cloudinary.v2.uploader.upload(
      `data:image/png;base64,${base64Data}`,
      {
        folder: "product-images", // optional: put in folder
        public_id: fileName.replace(/\.[^/.]+$/, ""), // remove extension if exists
        overwrite: true,
        resource_type: "image",
      }
    );

    console.log("[✅] Uploaded to Cloudinary:", uploadResponse.secure_url);

    return NextResponse.json({
      success: true,
      fileName,
      cloudinaryUrl: uploadResponse.secure_url, // use this in Fal.ai
    });
  } catch (err) {
    console.error("[❌] Cloudinary upload error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

