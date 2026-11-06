/**
 * Syda store — shared support-relay backend (Pages Functions helper).
 * Imported by functions/api/support.js (visitor endpoints) and
 * functions/api/telegram.js (Telegram webhook + staff commands).
 *
 * Data model (KV namespace binding SUPPORT_KV):
 *   sess:<k>   → { k, sid, lang, page, seq, status: open|closed,
 *                  assignee: <tgChatId>|null, assigneeName, createdAt, updatedAt }
 *   msgs:<k>   → { list: [ { seq, from: visitor|staff|sys, text, name, code, ts } ] }  (cap 200)
 *   staff:<id> → { cur: <k>|null, name, lastSeen }   (per-staff current chat binding)
 *   idx:open   → { open: [k] }                        (open session keys)
 *   cfg:roles  → { superadmins:[id], admins:[id], coadmins:[id] }
 *
 * Roles:
 *   superadmin (seed 5700612979) — all permissions + delegate roles (admin/coadmin)
 *   admin      — reply to any customer + assign conversations to coadmins
 *   coadmin    — customer service: reply to conversations assigned to them,
 *                may take unassigned conversations
 */

const SUPERADMIN_SEED = "5700612979";
const MSG_CAP = 200;
const MSG_MAX_LEN = 1000;
const SESSION_TTL = 7 * 24 * 60 * 60; // seconds — refreshed on activity
const POLL_CAP = 50;
const SID_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const SID_LEN = 5;
const ROLE_AR = { superadmin: "سوبر أدمين", admin: "أدمن", coadmin: "كوأدمين", none: "بدون صلاحية" };

// ---------- small helpers ----------

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function escHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function validK(k) {
  return typeof k === "string" && /^[a-f0-9][a-f0-9-]{7,63}$/i.test(k);
}

// in-memory rate limiter (per isolate), same approach as the chat worker
const rateBuckets = new Map();
function rateLimited(id, limit, windowSec) {
  const now = Date.now() / 1000;
  let arr = rateBuckets.get(id) || [];
  arr = arr.filter((t) => now - t < windowSec);
  if (arr.length >= limit) {
    rateBuckets.set(id, arr);
    return true;
  }
  arr.push(now);
  rateBuckets.set(id, arr);
  if (rateBuckets.size > 5000) rateBuckets.clear();
  return false;
}

// ---------- KV helpers ----------

async function kvGet(KV, key) {
  if (!KV) return null;
  try {
    return (await KV.get(key, "json")) ?? null;
  } catch (e) {
    return null;
  }
}

async function kvPut(KV, key, value, ttl) {
  if (!KV) return;
  const opts = ttl && ttl > 60 ? { expirationTtl: ttl } : undefined;
  await KV.put(key, JSON.stringify(value), opts);
}

// ---------- roles ----------

async function getRoles(KV) {
  const cfg = (await kvGet(KV, "cfg:roles")) || {};
  return {
    superadmins: new Set(cfg.superadmins != null ? cfg.superadmins : [SUPERADMIN_SEED]),
    admins: new Set(cfg.admins || []),
    coadmins: new Set(cfg.coadmins || []),
  };
}

async function putRoles(KV, roles) {
  await kvPut(KV, "cfg:roles", {
    superadmins: [...roles.superadmins],
    admins: [...roles.admins],
    coadmins: [...roles.coadmins],
  });
}

async function roleOf(KV, tgId) {
  const id = String(tgId);
  const roles = await getRoles(KV);
  if (roles.superadmins.has(id)) return "superadmin";
  if (roles.admins.has(id)) return "admin";
  if (roles.coadmins.has(id)) return "coadmin";
  return "none";
}

// ---------- sessions ----------

async function getSession(KV, k) {
  if (!validK(k)) return null;
  return await kvGet(KV, "sess:" + k);
}

async function putSession(KV, sess) {
  await kvPut(KV, "sess:" + sess.k, sess, SESSION_TTL);
}

async function newSid(KV) {
  const keys = await getOpenKeys(KV);
  const open = await Promise.all(keys.slice(-100).map((k) => kvGet(KV, "sess:" + k)));
  const taken = new Set(open.filter(Boolean).map((s) => s.sid));
  for (let i = 0; i < 8; i++) {
    let sid = "";
    const bytes = new Uint8Array(SID_LEN);
    crypto.getRandomValues(bytes);
    for (let b of bytes) sid += SID_ALPHABET[b % SID_ALPHABET.length];
    if (!taken.has(sid)) return sid;
  }
  return Date.now().toString(36).toUpperCase();
}

async function getOpenKeys(KV) {
  const idx = await kvGet(KV, "idx:open");
  return (idx && Array.isArray(idx.open)) ? idx.open : [];
}

async function addToOpen(KV, k) {
  const keys = await getOpenKeys(KV);
  if (!keys.includes(k)) await kvPut(KV, "idx:open", { open: [...keys, k].slice(-500) });
}

async function removeFromOpen(KV, k) {
  const keys = await getOpenKeys(KV);
  if (keys.includes(k)) await kvPut(KV, "idx:open", { open: keys.filter((x) => x !== k) });
}

// ---------- messages ----------

async function loadMsgs(KV, k) {
  const m = await kvGet(KV, "msgs:" + k);
  return m && Array.isArray(m.list) ? m : { list: [] };
}

async function saveMsgs(KV, k, msgs) {
  if (msgs.list.length > MSG_CAP) msgs.list = msgs.list.slice(-MSG_CAP);
  await kvPut(KV, "msgs:" + k, msgs, SESSION_TTL);
}

/** Appends a message to a session and returns it (or null when session missing). */
async function pushMsg(KV, k, from, text, extra) {
  const sess = await getSession(KV, k);
  if (!sess) return null;
  const seq = (sess.seq || 0) + 1;
  const msg = {
    seq,
    from, // visitor | staff | sys
    text: String(text || "").slice(0, MSG_MAX_LEN),
    name: extra && extra.name ? String(extra.name).slice(0, 60) : null,
    code: extra && extra.code ? String(extra.code).slice(0, 20) : null,
    ts: Date.now(),
  };
  sess.seq = seq;
  sess.updatedAt = msg.ts;
  await putSession(KV, sess);
  const msgs = await loadMsgs(KV, k);
  msgs.list.push(msg);
  await saveMsgs(KV, k, msgs);
  return msg;
}

// ---------- staff registry ----------

async function getStaff(KV, tgId) {
  const s = await kvGet(KV, "staff:" + tgId);
  return s || { cur: null, name: null, lastSeen: 0 };
}

async function putStaff(KV, tgId, staff) {
  await kvPut(KV, "staff:" + tgId, staff, 90 * 24 * 60 * 60);
}

// ---------- Telegram API ----------

function tgBase(env) {
  return (env && env.TG_API_BASE) || "https://api.telegram.org";
}

async function tgCall(env, method, payload) {
  const token = env && env.TG_BOT_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(tgBase(env) + "/bot" + token + "/" + method, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await res.json().catch(() => null);
  } catch (e) {
    return null;
  }
}

async function tgSend(env, chatId, html, opts) {
  if (!chatId) return null;
  return await tgCall(env, "sendMessage", {
    chat_id: chatId,
    text: String(html).slice(0, 4000),
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...(opts || {}),
  });
}

async function tgAnswerCallback(env, callbackId, text) {
  if (!callbackId) return null;
  return await tgCall(env, "answerCallbackQuery", { callback_query_id: callbackId, text: text || "" });
}

/** All staff ids grouped by role (from cfg:roles). */
async function allStaffIds(KV) {
  const roles = await getRoles(KV);
  return {
    superadmins: [...roles.superadmins],
    admins: [...roles.admins],
    coadmins: [...roles.coadmins],
  };
}

// ---------- staff notifications ----------

function sessLabel(sess) {
  const lang = sess.lang === "en" ? "EN" : "ع";
  return `#${escHtml(sess.sid)}`;
}

/** Notify the whole team about a new conversation (button opens it). */
async function notifyNewConversation(env, KV, sess, firstText) {
  const staff = await allStaffIds(KV);
  const ids = [...new Set([...staff.superadmins, ...staff.admins, ...staff.coadmins])];
  const text =
    `💬 <b>محادثة زائر جديدة</b> ${sessLabel(sess)}\n` +
    `🌐 اللغة: ${sess.lang === "en" ? "English" : "العربية"}\n` +
    (sess.page ? `🔗 الصفحة: ${escHtml(shortUrl(sess.page))}\n` : "") +
    (firstText ? `👤 الرسالة: ${escHtml(firstText.slice(0, 200))}\n` : "") +
    `\nللرد أرسل: <code>/open ${escHtml(sess.sid)}</code>`;
  const keyboard = { inline_keyboard: [[{ text: "👁 فتح المحادثة", callback_data: "open:" + sess.sid }]] };
  const jobs = ids.map((id) => tgSend(env, id, text, { reply_markup: keyboard }));
  await Promise.all(jobs);
}

function shortUrl(url) {
  try {
    const u = new URL(url);
    return u.host + (u.pathname.length > 34 ? u.pathname.slice(0, 34) + "…" : u.pathname);
  } catch (e) {
    return String(url).slice(0, 40);
  }
}

/** Route a visitor message to the assignee, or fan out to all staff when unassigned. */
async function notifyVisitorMessage(env, KV, sess, text) {
  if (sess.assignee) {
    return await tgSend(
      env,
      sess.assignee,
      `📨 ${sessLabel(sess)} · ${escHtml(sess.assigneeName || "وكيل")}:\n${escHtml(text.slice(0, 500))}`
    );
  }
  const staff = await allStaffIds(KV);
  const ids = [...new Set([...staff.superadmins, ...staff.admins, ...staff.coadmins])];
  const body = `📨 <b>رسالة زائر</b> ${sessLabel(sess)} (بدون وكيل):\n${escHtml(text.slice(0, 500))}`;
  const keyboard = { inline_keyboard: [[{ text: "👁 الرد الآن", callback_data: "open:" + sess.sid }]] };
  await Promise.all(ids.map((id) => tgSend(env, id, body, { reply_markup: keyboard })));
}

export {
  SUPERADMIN_SEED, MSG_CAP, POLL_CAP, ROLE_AR,
  json, escHtml, validK, rateLimited,
  kvGet, kvPut,
  getRoles, putRoles, roleOf, allStaffIds,
  getSession, putSession, newSid, getOpenKeys, addToOpen, removeFromOpen,
  loadMsgs, saveMsgs, pushMsg,
  getStaff, putStaff,
  tgCall, tgSend, tgAnswerCallback, tgBase,
  notifyNewConversation, notifyVisitorMessage, shortUrl, sessLabel,
};
