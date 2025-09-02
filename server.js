// server.js — CRE360 Signal (final minimal)
const express = require("express");
const cors = require("cors");
const { OpenAI } = require("openai");
require("dotenv").config();

const app = express();

// CORS (you can lock to your domain later)
app.use(cors());

// JSON body parsing
app.use(express.json());

// Serve static files from this folder (so /static/cre360-signal-panel.js works)
app.use("/static", express.static(__dirname));

// OpenAI client
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// System prompt (edit voice/rules here)
const SYSTEM_PROMPT = `You are the CRE360 Assistant — sharp, professional, and decisive.
Tone: institutional but human. Avoid fluff.
Focus on extended-stay hotels, underwriting, CRE360 Signal insights, and development risk.
Keep answers tight: lead with the point, then 2–4 bullets of support.`;

// Chat endpoint (streamed text)
app.post("/chat", async (req, res) => {
  try {
    const userMessage = String(req.body?.message || "").slice(0, 8000);
    if (!userMessage) return res.status(400).json({ error: "Missing message" });

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      stream: true,
      temperature: 0.4,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
    });

    for await (const chunk of response) {
      const delta = chunk.choices?.[0]?.delta?.content || "";
      if (delta) res.write(delta);
    }
    res.end();
  } catch (err) {
    console.error("OpenAI error:", err?.message || err);
    try { res.end(" (service error)"); } catch {}
  }
});

// Embedded console page for iframe (https://cre360-signal-api.onrender.com/console)
app.get("/console", (_req, res) => {
  res.send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CRE360 Signal Console</title>
  <style>html,body{margin:0;height:100%;background:#0B0B0B}</style>
</head>
<body>
  <div id="signal-panel" style="width:100%;height:100vh;"></div>
  <script
    src="/static/cre360-signal-panel.js"
    data-target="#signal-panel"
    data-api-base="${process.env.RENDER_EXTERNAL_URL || 'https://cre360-signal-api.onrender.com'}"
    data-endpoint="/chat"
    data-bot-name="CRE360 Signal™"
    data-primary="#BFA77A"
    data-surface="#0B0B0B"
    data-text="#FFFFFF"
    data-accent="#D9CBA2"
    data-subtitle="Operator-grade market intelligence — ask sharper questions."
    data-starters='[
      {"label":"Today’s Signal","text":"Give me today’s CRE360 Signal in 3 bullets."},
      {"label":"Underwriting","text":"Pressure-test my extended-stay underwriting."},
      {"label":"Extended-Stay","text":"Why are extended-stay hotels outperforming in 2025?"},
      {"label":"Risk Check","text":"List the top 3 execution risks on a new hotel development."}
    ]'
    defer></script>
</body>
</html>`);
});

// Health
app.get("/", (_req, res) => res.send("CRE360 Signal API up"));

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => console.log(`[CRE360] Chat server listening on port ${PORT}`));
