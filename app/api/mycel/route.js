import { NextResponse } from "next/server";

// Free open-source model chain via OpenRouter. IDs rotate — check
// https://openrouter.ai/models?max_price=0 if the chain starts failing.
const MODEL_CHAIN = [
  "qwen/qwen3-30b-a3b-instruct:free",
  "meta-llama/llama-3.1-8b-instruct:free",
  "google/gemma-3-27b-it:free"
];

const SYSTEM_PROMPT = `You are Mycel, the AI companion woven into The Biome —
a bioluminescent, mobile-first 3D environment built by Orangopus. Warm, brief,
a little otherworldly. This is a chat companion, not an essay generator.`;

export async function POST(req) {
  const apiKey = process.env.OPENROUTER_KEY;
  if (!apiKey) return NextResponse.json({ error: "OPENROUTER_KEY not configured" }, { status: 500 });

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const { message, history } = body || {};
  if (!message || typeof message !== "string")
    return NextResponse.json({ error: "Missing message" }, { status: 400 });

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...(Array.isArray(history) ? history.slice(-12) : []),
    { role: "user", content: message }
  ];

  let lastError = null;
  for (const model of MODEL_CHAIN) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "X-Title": "everythingOS — Mycel"
        },
        body: JSON.stringify({ model, messages, max_tokens: 500, temperature: 0.8 })
      });
      if (res.status === 429) { lastError = `${model}: rate limited`; continue; }
      if (!res.ok) { lastError = `${model}: HTTP ${res.status}`; continue; }
      const data = await res.json();
      const reply = data?.choices?.[0]?.message?.content;
      if (!reply) { lastError = `${model}: empty`; continue; }
      return NextResponse.json({ reply, model });
    } catch (e) { lastError = `${model}: ${e.message}`; }
  }
  return NextResponse.json({
    reply: "Mycel's a little quiet right now — the free tier is rate-limited or between models. Try again shortly.",
    degraded: true, error: lastError
  });
}
