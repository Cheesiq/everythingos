import { NextResponse } from "next/server";
import { verifySession } from "@/lib/session";

export async function GET(req) {
  const secret = process.env.SESSION_SECRET;
  const token = req.cookies.get("eos_session")?.value;
  const user = secret ? verifySession(token, secret) : null;
  if (!user) return NextResponse.json({ authenticated: false }, { status: 401 });
  return NextResponse.json({
    authenticated: true,
    user: { login: user.login, name: user.name, avatar: user.avatar }
  });
}
