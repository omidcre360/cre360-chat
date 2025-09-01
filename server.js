const express = require("express");
const cors = require("cors");
const { OpenAI } = require("openai");
require("dotenv").config();

console.log("API KEY from .env:", process.env.OPENAI_API_KEY ? "Loaded" : "Missing");

const app = express();
app.use(cors());
app.use(express.json());

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are the CRE360 Assistant — sharp, professional, and decisive.
Tone: institutional but human. Avoid fluff.
Focus on extended-stay hotels, underwriting, CRE360 Signal insights, and development risk.
Keep answers tight: lead with the point, then 2–4 bullets of support.`;

app.post("/chat", async (req, res) => {
  try {
    const userMessage = String(req.body?.message || "").slice(0, 8000);
    if (!userMessage) return res.status(400).json({ error: "Missing message" });

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      stream: true,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      temperature: 0.4,
    });

    for await (const chunk of response) {
      const delta = chunk.choices?.[0]?.delta?.content || "";
      if (delta) res.write(delta);
    }
    res.end();
  } catch (err) {
    console.error(err);
    try { res.end(" (service error)"); } catch {}
  }
});

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => console.log(`[CRE360] Chat server listening on port ${PORT}`));
