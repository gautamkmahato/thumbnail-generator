import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "supersecret"; // keep in .env

export async function POST(req) {
  const { email, password } = await req.json();

  // TODO: replace with DB check
  if (email === "gkm123@gmail.com" && password === "gkm12345@") {
    const token = jwt.sign({ email }, SECRET, { expiresIn: "1h" });

    const res = NextResponse.json({ success: true });
    res.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60, // 1h
      path: "/",
    });

    return res;
  }

  return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
}
