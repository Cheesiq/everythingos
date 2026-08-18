import { NextResponse } from "next/server";
import { signSession } from "@/lib/session";

export async function GET(req) {
  const url = new URL(req.url);
  const origin = process.env.APP_ORIGIN || url.origin;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const stateCookie = req.cookies.get("eos_oauth_state")?.value;

  const fail = (reason) => NextResponse.redirect(`${origin}/?auth_error=${reason}`);

  if (!code) return fail("missing_code");
  if (!state || !stateCookie || state !== stateCookie) return fail("state_mismatch");

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const sessionSecret = process.env.SESSION_SECRET;
  if (!clientId || !clientSecret || !sessionSecret) return fail("server_not_configured");

  try {
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: clientId, client_secret: clientSecret, code,
        redirect_uri: `${origin}/api/auth/callback`
      })
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) return fail("token_exchange_failed");

    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "everythingOS"
      }
    });
    const user = await userRes.json();
    if (!user?.id) return fail("profile_fetch_failed");

    const token = signSession(
      { id: user.id, login: user.login, name: user.name || user.login, avatar: user.avatar_url, iat: Date.now() },
      sessionSecret
    );
    const res = NextResponse.redirect(`${origin}/`);
    res.cookies.set("eos_session", token, {
      httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 604800
    });
    res.cookies.set("eos_oauth_state", "", { path: "/", maxAge: 0 });
    return res;
  } catch {
    return fail("unexpected_error");
  }
}
