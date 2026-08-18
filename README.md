# everythingOS — Next.js fullstack MVP

A web desktop for the Orangopus ecosystem: draggable window manager, persistent
virtual filesystem + terminal, Mycel AI chat (free open-source models via
OpenRouter, or bring-your-own Claude key), GitHub login, and full-screen
VR-ready Three.js galaxy explorers.

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in the values (see below)
npm run dev                  # http://localhost:3000
```

Every env var is optional for local poking around — the app degrades
gracefully. Preview mode skips login, and Mycel tells you if the key's missing.

| Var | What for | Where to get it |
|---|---|---|
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub login | https://github.com/settings/developers — callback URL: `<origin>/api/auth/callback` |
| `SESSION_SECRET` | Signs the session cookie | `openssl rand -hex 32` |
| `OPENROUTER_KEY` | Free open-source models for Mycel | https://openrouter.ai/keys (free, no card) |
| `APP_ORIGIN` | OAuth redirect base | Your deployed URL |

## Map

- `app/page.jsx` → the desktop (`components/Desktop.jsx`)
- `app/galaxy/[slug]/page.jsx` → galaxy pages (aurelia / vorthex / mycelium), engine in `components/GalaxyScene.jsx`
- `app/api/mycel` → chat proxy with model fallback chain (IDs rotate — see file comment)
- `app/api/auth/*` → GitHub OAuth (login → callback → signed httpOnly cookie), session, logout
- `lib/galaxies.js` → add a galaxy here and it gets a page automatically

## Notes

- **M1/thermals:** pixel ratio capped at 1.5, bloom skipped on mobile, single draw call for 100k+ stars.
- **VR:** WebXR needs HTTPS + a headset browser. The camera rides a dolly; trigger-squeeze drifts along gaze.
- **BYOK:** the Claude key never touches this server — browser → Anthropic directly, stored in localStorage only.
- **Deploy:** works on Vercel/Netlify out of the box. Set the env vars in the dashboard.
