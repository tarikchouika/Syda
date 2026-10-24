/**
 * Syda Chat Worker — multilingual shopping assistant for syda.pages.dev
 *
 * Anti-hallucination architecture:
 *   1. Product retrieval is DETERMINISTIC (server-side keyword search over the embedded
 *      catalog). The AI never picks products from the whole store.
 *   2. The AI only receives a shortlist and must reference only those IDs.
 *   3. Every ID the AI mentions is validated against the shortlist before being returned.
 *   4. Product links/images are built from the catalog server-side — the AI never generates URLs.
 *   5. If the AI fails, the deterministic search results are returned with a canned localized
 *      message — the bot never invents an answer.
 */

import { CATALOG } from "./catalog.js";

const MODEL = "@cf/openai/gpt-oss-120b"; // best free model available on this account
const SITE_URL = "https://syda.pages.dev";
const MAX_MESSAGE = 500;
const MAX_HISTORY = 12;
const RATE_LIMIT = 20;        // messages
const RATE_WINDOW = 5 * 60;   // per 5 minutes (per IP, per isolate)
const AI_TIMEOUT = 35000;

// ---------- catalog index (built once per isolate) ----------
const CAT_AR = {
  all_house_needs: "كل احتياجات المنزل", best_offers: "أفضل العروض", cleaning_supplies: "مستلزمات تنظيف",
  electronics: "إلكترونيات وأجهزة ذكية", fitness: "رياضة منزلية", furniture_outdoor: "أثاث خارجي",
  home_appliances: "أجهزة منزلية", home_improvement: "تحسينات منزلية", home_storage: "تخزين منزلي",
  natural_beauty: "الجمال الطبيعي", special_car: "السيارة المميزة", toys_and_games: "ألعاب للصغار والكبار",
};
const CAT_EN = {
  all_house_needs: "Home essentials", best_offers: "Best offers", cleaning_supplies: "Cleaning supplies",
  electronics: "Electronics & smart devices", fitness: "Home fitness", furniture_outdoor: "Outdoor furniture",
  home_appliances: "Home appliances", home_improvement: "Home improvement", home_storage: "Home storage",
  natural_beauty: "Natural beauty", special_car: "Car essentials", toys_and_games: "Toys & games",
};

const products = CATALOG.map((c) => ({
  id: c[0], name: c[1], nameEn: c[2], price: c[3], oldPrice: c[4],
  cat: c[5], catAr: CAT_AR[c[5]] || c[5], catEn: CAT_EN[c[5]] || c[5],
  img: c[6], desc: c[7] || "",
}));
const byId = new Map(products.map((p) => [p.id, p]));

const STOP = new Set(("من في على عن الى إلى مع هذا هذه تلك هل ما ماذا كيف اين وين ايش وش انا نحن انت انتم ابغي ابغى ابي اريد احتاج محتاج يبغي يبي هللا الله لو لكن ثم قد لقد كل بعض غير بين عند عندما حتى او أو and or the a an is are do does for with this that what where how i we you me my need want looking look please can could would should give show tell find buy price cost much many cheap best good new hi hello مرحبا السلام عليكم اهلا شكرا هدية أريد أبحث عن شيء شيء بعض أي").split(/\s+/));

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

const idx = products.map((p) => {
  const n = norm(p.name);
  const e = norm(p.nameEn);
  return {
    p,
    n, e,
    nTok: n.split(" ").filter(Boolean),
    eTok: e.split(" ").filter(Boolean),
    catN: norm(p.catAr + " " + p.catEn),
  };
});

/** Returns [{ p, score }] sorted by score desc. */
function searchScored(query, limit = 12) {
  const nq = norm(query);
  if (!nq) return [];
  const qTok = nq.split(" ").filter((t) => t.length >= 2 && !STOP.has(t));
  const scores = new Map();
  for (const it of idx) {
    let s = 0;
    for (const t of qTok) {
      const len = t.length;
      if (it.nTok.includes(t)) s += 3;
      else if (it.eTok.includes(t)) s += 3;
      else if (len >= 3 && (it.nTok.some((x) => x.startsWith(t)) || it.eTok.some((x) => x.startsWith(t)))) s += 1.5;
      if (it.catN.includes(t)) s += 1;
      if (len >= 4 && (it.n.includes(t) || it.e.includes(t)) && !it.nTok.includes(t) && !it.eTok.includes(t)) s += 1;
    }
    if (nq.length >= 6 && (it.n.includes(nq) || it.e.includes(nq))) s += 6; // whole-phrase match
    if (s > 0) scores.set(it.p.id, s);
  }
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id, score]) => ({ p: byId.get(id), score }))
    .filter((x) => x.p);
}

// ---------- helpers ----------
const rateBuckets = new Map(); // ip -> [timestamps]
function rateLimited(ip) {
  const now = Date.now() / 1000;
  let arr = rateBuckets.get(ip) || [];
  arr = arr.filter((t) => now - t < RATE_WINDOW);
  if (arr.length >= RATE_LIMIT) {
    rateBuckets.set(ip, arr);
    return true;
  }
  arr.push(now);
  rateBuckets.set(ip, arr);
  if (rateBuckets.size > 5000) rateBuckets.clear(); // safety valve
  return false;
}

function allowedOrigin(origin) {
  if (!origin) return false;
  return /^https:\/\/([a-z0-9-]+\.)?syda\.pages\.dev$/i.test(origin);
}

/** Returns the origin to echo back in CORS headers, validating Origin (or Referer fallback). */
function resolveAllowedOrigin(request) {
  const origin = request.headers.get("Origin");
  if (allowedOrigin(origin)) return origin;
  const referer = request.headers.get("Referer") || "";
  if (/^https:\/\/([a-z0-9-]+\.)?syda\.pages\.dev\//i.test(referer)) {
    try { return origin || new URL(referer).origin; } catch (e) { return null; }
  }
  return null;
}

const CORS = {
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

function card(p) {
  const save = p.oldPrice && p.oldPrice > p.price ? Math.round((1 - p.price / p.oldPrice) * 100) : null;
  return {
    id: p.id, name: p.name, nameEn: p.nameEn, price: p.price, oldPrice: p.oldPrice || null,
    save, category: p.cat, categoryAr: p.catAr, categoryEn: p.catEn,
    url: `${SITE_URL}/products/${encodeURIComponent(p.id)}.html`, image: p.img,
  };
}

function shortlistBlock(list) {
  if (!list.length) return "(no matching products found)";
  return list
    .map((p) => {
      const d = p.desc ? " — " + p.desc.slice(0, 200).replace(/\s+/g, " ") : "";
      return `[${p.id}] ${p.name} (${p.nameEn}) — ${p.price} SAR${p.oldPrice && p.oldPrice > p.price ? ` (was ${p.oldPrice})` : ""} — ${p.catAr} / ${p.catEn}${d}`;
    })
    .join("\n");
}

const SYSTEM_PROMPT = `Reasoning: low
You are the shopping assistant of "صيدة" (Syda), an online store at syda.pages.dev. You help visitors find products and answer store questions.

STORE FACTS (use ONLY these for policy questions):
- Shipping: 28 SAR, FREE for orders of 500 SAR or more.
- Payment: cash on delivery, or prepayment with a 15% discount.
- Returns: easy returns within 15 days.
- The store ships across Saudi Arabia. Prices are in Saudi Riyal (SAR).
- Contact page: ${SITE_URL}/legal/contact.html

STRICT RULES:
1. LANGUAGE (the most important rule): Reply in EXACTLY the same language as the customer's last message — English message → English reply, Arabic message → Arabic reply, French message → French reply, and so on for any language. NEVER switch to a different language, even if product names are in Arabic or English. Translate product names into the customer's language when recommending them.
2. Recommend ONLY products from the CATALOG CANDIDATES list provided in the user turn. Quote their real prices. NEVER invent products, prices, features or links.
3. If none of the candidates matches what the customer wants, say honestly that you could not find it, and mention the closest product categories (choose from the categories you see in the candidates list, or these: كل احتياجات المنزل، مستلزمات تنظيف، إلكترونيات وأجهزة ذكية، رياضة منزلية، أثاث خارجي، أجهزة منزلية، تحسينات منزلية، تخزين منزلي، الجمال الطبيعي، السيارة المميزة، ألعاب للصغار والكبار).
4. Keep the reply short, warm and helpful (1-4 sentences). Do not use markdown headings, bullet lists or links.
5. For store-policy questions (shipping, payment, returns) answer from STORE FACTS only.
6. On the very LAST line, list the products you recommend, most relevant first, copying this exact marker (never translate it):
@@PRODUCTS: id1, id2
Use only IDs from the candidates list. If you recommend nothing, output exactly: @@PRODUCTS: none`;

async function callAI(messages, maxTokens) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), AI_TIMEOUT);
  try {
    const res = await env.AI.run(MODEL, { messages, max_tokens: maxTokens, temperature: 0.3 });
    const c = res && res.choices && res.choices[0] && res.choices[0].message;
    return ((c && c.content) || (res && res.response) || "").trim();
  } finally {
    clearTimeout(timer);
  }
}

async function extractKeywords(message) {
  const out = await callAI([
    { role: "system", content: "Reasoning: low\nYou convert a customer message into search keywords for an e-commerce catalog. Output ONLY a comma-separated list of 3-8 concrete Arabic AND English product keywords that express what the customer wants to buy (no stopwords, no sentences, no commentary). Translate the concepts into Arabic and English." },
    { role: "user", content: message.slice(0, MAX_MESSAGE) },
  ], 400);
  return out.replace(/^@@|^PRODUCTS:?/i, "").replace(/\n/g, " ").trim();
}

function detectScriptHint(msg) {
  const arabic = /[\u0600-\u06FF]/.test(msg);
  const latin = /[a-zA-Z]/.test(msg);
  if (arabic && !latin) return "Arabic";
  if (latin && !arabic) return "a Latin-script language (English, French, Spanish, German, ...)";
  if (arabic && latin) return "mostly Arabic with some Latin words";
  return "an unspecified language";
}

function localizedFallback(list, langHint) {
  const ar = list.length
    ? `هذه أقرب المنتجات المطابقة لطلبك في متجر صيدة:\n${list.map((p) => `• ${p.name} — ${p.price} ر.س`).join("\n")}`
    : "لم أجد منتجات مطابقة لطلبك حالياً. جرّب كلمات أخرى أو تصفح الأقسام في الصفحة الرئيسية.";
  const en = list.length
    ? `Here are the closest matches in the Syda store:\n${list.map((p) => `• ${p.nameEn || p.name} — ${p.price} SAR`).join("\n")}`
    : "I could not find matching products right now. Try other keywords or browse the categories on the home page.";
  return langHint === "en" ? en : ar;
}

const PRODUCTS_LINE = /@@\s*PRODUCTS?\s*:\s*([^\n]*)/i;
const PRODUCTS_LINE_ANY = /(?:@@\s*)?(?:PRODUCTS|PRODUITS|PRODUKTE|PRODUCTOS|PRODOTTI|PRODUCTEN|منتجات)\s*:\s*([^\n]*)/i;

// ---------- request handling ----------
let env; // bound at fetch()

async function handleChat(req, corsOrigin) {
  let body;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "invalid_json" }, corsOrigin);
  }
  const message = String(body.message || "").trim();
  const history = Array.isArray(body.history) ? body.history : [];
  const langHint = body.lang === "en" ? "en" : "ar";

  if (!message) return json(400, { error: "empty_message" }, corsOrigin);
  if (message.length > MAX_MESSAGE) return json(400, { error: "message_too_long" }, corsOrigin);

  const cleanHistory = history
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-MAX_HISTORY)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 1000) }));

  // 1) deterministic retrieval
  let scored = searchScored(message, 12);
  let topScore = scored.length ? scored[0].score : 0;

  // 2) if weak, ask the AI for AR/EN keywords (handles any language) and retry
  if (scored.length < 3 || topScore < 6) {
    try {
      const kw = await extractKeywords(message);
      if (kw) {
        const retry = searchScored(kw + " " + message, 12);
        const retryTop = retry.length ? retry[0].score : 0;
        if (retry.length > scored.length || retryTop > topScore) {
          scored = retry;
          topScore = retryTop;
        }
      }
    } catch (e) { /* keep deterministic results */ }
  }
  const candidates = scored.slice(0, 10).map((s) => s.p);

  // 3) AI answer grounded on the shortlist
  let reply = "";
  let recommended = [];
  try {
    const chatMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...cleanHistory,
      {
        role: "user",
        content: `Customer message (written in ${detectScriptHint(message)} — you MUST reply in exactly this language, never in another): ${message}\n\nCATALOG CANDIDATES:\n${shortlistBlock(candidates)}\n\nRemember: reply in the customer's own language, use ONLY these candidates, and end with the @@PRODUCTS: line.`,
      },
    ];
    const raw = await callAI(chatMessages, 1100);

    const m = raw.match(PRODUCTS_LINE) || raw.match(PRODUCTS_LINE_ANY);
    reply = raw
      .replace(PRODUCTS_LINE, "")
      .replace(PRODUCTS_LINE_ANY, "")
      .replace(/@\s*@?\s*$/m, "")
      .trim();
    if (!reply) reply = raw.trim(); // model forgot the line — treat whole text as reply
    if (m) {
      const seen = new Set();
      for (const tok of m[1].split(/[,\s]+/)) {
        const id = tok.replace(/[[\]]/g, "").replace(/^@+/, "").trim();
        if (id && id.toLowerCase() !== "none" && byId.has(id) && candidates.some((c) => c.id === id) && !seen.has(id)) {
          seen.add(id);
          recommended.push(byId.get(id));
        }
      }
    }
    // safety: strip any raw URLs the model might have emitted (links are rendered from the catalog only)
    reply = reply.replace(/https?:\/\/\S+/g, "").replace(/[ \t]{2,}/g, " ").trim();
    if (!reply && recommended.length) reply = localizedFallback(recommended, langHint);
  } catch (e) {
    // 4) AI unavailable → deterministic fallback, never a made-up answer
    reply = localizedFallback(candidates.slice(0, 5), langHint);
    recommended = candidates.slice(0, 5);
  }

  const recIds = new Set(recommended.map((p) => p.id));
  return json(200, {
    reply,
    products: recommended.slice(0, 6).map(card),
    results: candidates.filter((c) => !recIds.has(c.id)).slice(0, 2).map(card),
  }, corsOrigin);
}

function json(status, body, corsOrigin) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  if (corsOrigin) headers["Access-Control-Allow-Origin"] = corsOrigin;
  return new Response(JSON.stringify(body), { status, headers });
}

export default {
  async fetch(request, _env, ctx) {
    env = _env;
    const url = new URL(request.url);
    const corsOrigin = resolveAllowedOrigin(request);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: { ...CORS, ...(corsOrigin ? { "Access-Control-Allow-Origin": corsOrigin } : {}) } });
    }

    if (url.pathname === "/health") {
      return json(200, { ok: true, products: products.length, model: MODEL });
    }

    if (url.pathname !== "/chat") {
      return json(404, { error: "not_found" }, corsOrigin);
    }

    if (!corsOrigin) {
      return json(403, { error: "origin_not_allowed" });
    }

    if (request.method !== "POST") {
      return json(405, { error: "method_not_allowed" }, corsOrigin);
    }

    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    if (rateLimited(ip)) {
      return json(429, {
        error: "rate_limited",
        reply: "لقد أرسلت رسائل كثيرة، يرجى الانتظار قليلاً ثم المحاولة مجدداً. / You have sent too many messages, please wait a moment and try again.",
        products: [],
      }, corsOrigin);
    }

    return handleChat(request, corsOrigin);
  },
};
