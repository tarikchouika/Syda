/**
 * Syda store — visitor-facing support relay API (Pages Function, same-origin).
 *
 *   POST /api/support/start { k, lang, page }   → open (or resume) a support session
 *   POST /api/support/msg   { k, text }         → visitor message → forwarded to Telegram
 *   GET  /api/support/poll?k=<k>&after=<seq>    → staff/system messages since seq
 *   POST /api/support/end   { k }               → visitor closes the conversation
 *
 * The visitor never needs a Telegram account: this relay stores the conversation
 * in D1 (strongly consistent — sync delay fix) and mirrors it both ways
 * (visitor ⇄ Telegram staff). API contract unchanged from the previous version.
 */

import {
  json, validK, rateLimited,
  getSession, putSession, newSid,
  pushMsg, loadMsgs,
  notifyNewConversation, notifyVisitorMessage, tgSend, allStaffIds,
} from "../support-lib.js";

const START_RATE = 10;      // new conversations per IP per window
const MSG_RATE = 30;        // visitor messages per session per window
const RATE_WINDOW = 5 * 60; // seconds

function originAllowed(request) {
  const origin = request.headers.get("Origin");
  if (origin) return /^https:\/\/([a-z0-9-]+\.)?syda\.pages\.dev$/i.test(origin);
  const referer = request.headers.get("Referer") || "";
  return /^https:\/\/([a-z0-9-]+\.)?syda\.pages\.dev\//i.test(referer);
}

async function readJson(request) {
  try {
    return await request.json();
  } catch (e) {
    return null;
  }
}

// ---------- POST /start ----------
async function start(env, waitUntil, body) {
  const db = env.SUPPORT_DB;
  const k = body && body.k;
  const lang = body && body.lang === "en" ? "en" : "ar";
  const page = String((body && body.page) || "").slice(0, 300);
  if (!validK(k)) return json(400, { ok: false, error: "bad_key" });

  const existing = await getSession(db, k);
  if (existing && existing.status === "open") {
    // resume: keep the same conversation (staff already pinged when it opened)
    existing.updatedAt = Date.now();
    await putSession(db, existing);
    return json(200, {
      ok: true, sid: existing.sid, seq: existing.seq || 0,
      resumed: true, assigneeName: existing.assigneeName || null,
    });
  }

  // fresh conversation (new, or previous one closed → reset the thread)
  const sess = {
    k, sid: await newSid(db), lang, page,
    seq: 0, status: "open", assignee: null, assigneeName: null,
    createdAt: Date.now(), updatedAt: Date.now(),
  };
  await putSession(db, sess);
  waitUntil(notifyNewConversation(env, db, sess, null));
  return json(200, { ok: true, sid: sess.sid, seq: 0, resumed: false, assigneeName: null });
}

// ---------- POST /msg ----------
async function msg(env, waitUntil, body) {
  const db = env.SUPPORT_DB;
  const k = body && body.k;
  const text = String((body && body.text) || "").trim();
  if (!validK(k)) return json(400, { ok: false, error: "bad_key" });
  if (!text) return json(400, { ok: false, error: "empty_message" });

  const sess = await getSession(db, k);
  if (!sess || sess.status !== "open") return json(410, { ok: false, error: "closed" });
  if (rateLimited("msg:" + k, MSG_RATE, RATE_WINDOW)) {
    return json(429, { ok: false, error: "rate_limited" });
  }

  await pushMsg(db, k, "visitor", text);
  waitUntil(notifyVisitorMessage(env, db, sess, text));
  return json(200, { ok: true });
}

// ---------- GET /poll ----------
async function poll(env, k, after) {
  const db = env.SUPPORT_DB;
  const sess = await getSession(db, k);
  if (!sess) return json(200, { ok: true, status: "none", msgs: [], assigneeName: null });

  const pending = await loadMsgs(db, k, after, 50)
    .then((list) => list.filter((m) => m.from !== "visitor"));

  return json(200, {
    ok: true,
    status: sess.status === "open" ? "open" : "closed",
    msgs: pending,
    assigneeName: sess.assigneeName || null,
  });
}

// ---------- POST /end ----------
async function end(env, waitUntil, body) {
  const db = env.SUPPORT_DB;
  const k = body && body.k;
  if (!validK(k)) return json(400, { ok: false, error: "bad_key" });
  const sess = await getSession(db, k);
  if (!sess || sess.status !== "open") return json(200, { ok: true, status: "closed" });

  sess.status = "closed";
  sess.updatedAt = Date.now();
  await putSession(db, sess);
  await pushMsg(db, k, "sys", "", { code: "closed" });

  const notify = sess.assignee
    ? tgSend(env, sess.assignee, `✅ #${sess.sid} أغلق الزائر المحادثة.`)
    : (async () => {
        const staff = await allStaffIds(db);
        const ids = [...new Set([...staff.superadmins, ...staff.admins])];
        await Promise.all(ids.map((id) => tgSend(env, id, `✅ #${sess.sid} أغلق الزائر المحادثة.`)));
      })();
  waitUntil(notify);
  return json(200, { ok: true });
}

// ---------- router ----------

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env || !env.SUPPORT_DB) return json(503, { ok: false, error: "db_unavailable" });
  if (!originAllowed(request)) return json(403, { ok: false, error: "origin_not_allowed" });

  const url = new URL(request.url);
  const route = url.pathname.replace(/^\/api\/support\/?/, "").replace(/\/$/, "");
  const body = await readJson(request);
  const waitUntil = (p) => context.waitUntil(p);

  if (route === "start") {
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    if (rateLimited("start:" + ip, START_RATE, RATE_WINDOW)) {
      return json(429, { ok: false, error: "rate_limited" });
    }
    return await start(env, waitUntil, body);
  }
  if (route === "msg") return await msg(env, waitUntil, body);
  if (route === "end") return await end(env, waitUntil, body);
  return json(404, { ok: false, error: "not_found" });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!env || !env.SUPPORT_DB) return json(503, { ok: false, error: "db_unavailable" });
  if (!originAllowed(request)) return json(403, { ok: false, error: "origin_not_allowed" });
  const url = new URL(request.url);
  const route = url.pathname.replace(/^\/api\/support\/?/, "").replace(/\/$/, "");
  if (route === "poll") {
    return await poll(env, url.searchParams.get("k"), url.searchParams.get("after"));
  }
  return json(404, { ok: false, error: "not_found" });
}

export async function onRequest() {
  return json(405, { ok: false, error: "method_not_allowed" });
}
