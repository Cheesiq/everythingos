import { NextResponse } from "next/server";
import crypto from "crypto";

export async function GET(req) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const origin = process.env.APP_ORIGIN || new URL(req.url).origin;
  if (!clientId) {
    return NextResponse.redirect(`${origin}/?auth_error=server_not_configured`);
  }
  const state = crypto.randomBytes(16).toString("hex");
  const redirectUri = `${origin}/api/auth/callback`;
  const url =
    `https://github.com/login/oauth/authorize` +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=read:user&state=${state}`;
  const res = NextResponse.redirect(url);
  res.cookies.set("eos_oauth_state", state, {
    httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 300
  });
  return res;
}
