/**
 * Syda store — shared support-relay backend (Pages Functions helper).
 * Imported by functions/api/support/[route].js and functions/api/telegram.js.
 *
 * Storage: D1 (syda_support) — STRONG read-after-write consistency. This is the
 * fix for the >20s message-sync delay: the previous KV-only storage relies on
 * eventually-consistent cross-POP replication (up to 60s), so a reply written
 * by the Telegram webhook (one POP) stayed invisible to the visitor's poll
 * (another POP) for tens of seconds. D1 reads see committed writes immediately.
 *
 * Tables:
 *   sessions(k PK, sid, lang, page, seq, status, assignee, assignee_name, created_at, updated_at)
 *   messages(k, seq PK-composite, from_side, text, name, code, ts)
 *   staff(tg_id PK, cur_k, name, last_seen)
 *   roles(tg_id PK, role)
 *
 * Roles:
 *   superadmin (seed 5700612979) — all permissions + delegate roles (admin/coadmin)
 *   admin      — reply to any customer + assign conversations to coadmins
 *   coadmin    — customer service: reply to conversations assigned to them,
 *                may take unassigned conversations
 */

const SUPERADMIN_SEED = "5700612979";
const MSG_CAP = 200;          // messages kept per session (trimmed on insert)
const MSG_MAX_LEN = 1000;
const SESSION_IDLE_DAYS = 7;  // sessions considered expired after 7 idle days
const ROLE_AR = { superadmin: "سوبر أدمين", admin: "أدمن", coadmin: "كوأدمين", none: "بدون صلاحية" };

// ---------- small helpers ----------

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store", // polls must never be cached (fixes stale replies)
    },
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

// in-memory rate limiter (per isolate) — same approach as the chat worker
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

// ---------- D1 helpers ----------

async function dbAll(db, sql, params) {
  const res = await db.prepare(sql).bind(...(params || [])).all();
  return res.results || [];
}

async function dbRun(db, sql, params) {
  return await db.prepare(sql).bind(...(params || [])).run();
}

function db1(rows) {
  return rows && rows.length ? rows[0] : null;
}

// ---------- roles ----------

async function roleOf(db, tgId) {
  const id = String(tgId);
  if (id === SUPERADMIN_SEED) return "superadmin"; // seed superadmin is permanent
  const rows = await dbAll(db, "SELECT role FROM roles WHERE tg_id = ?", [id]);
  const r = db1(rows);
  return r ? r.role : "none";
}

async function setRole(db, tgId, role) {
  await dbRun(
    db,
    "INSERT INTO roles (tg_id, role) VALUES (?, ?) ON CONFLICT(tg_id) DO UPDATE SET role = excluded.role",
    [String(tgId), role]
  );
}

async function allStaffIds(db) {
  const rows = await dbAll(db, "SELECT tg_id, role FROM roles");
  const out = { superadmins: [SUPERADMIN_SEED], admins: [], coadmins: [] };
  for (const r of rows) {
    if (r.role === "admin") out.admins.push(r.tg_id);
    if (r.role === "coadmin") out.coadmins.push(r.tg_id);
    if (r.role === "superadmin" && r.tg_id !== SUPERADMIN_SEED) out.superadmins.push(r.tg_id);
  }
  return out;
}

// ---------- sessions ----------

function rowToSession(s) {
  return s ? {
    k: s.k, sid: s.sid, lang: s.lang, page: s.page, seq: s.seq,
    status: s.status, assignee: s.assignee, assigneeName: s.assignee_name,
    createdAt: s.created_at, updatedAt: s.updated_at,
  } : null;
}

async function getSession(db, k) {
  if (!validK(k)) return null;
  const rows = await dbAll(db, "SELECT * FROM sessions WHERE k = ?", [k]);
  return rowToSession(db1(rows));
}

async function putSession(db, sess) {
  await dbRun(
    db,
    `INSERT INTO sessions (k, sid, lang, page, seq, status, assignee, assignee_name, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(k) DO UPDATE SET sid=excluded.sid, lang=excluded.lang, page=excluded.page,
       seq=excluded.seq, status=excluded.status, assignee=excluded.assignee,
       assignee_name=excluded.assignee_name, updated_at=excluded.updated_at`,
    [sess.k, sess.sid, sess.lang || "ar", sess.page || "", sess.seq || 0,
     sess.status || "open", sess.assignee || null, sess.assigneeName || null,
     sess.createdAt || Date.now(), sess.updatedAt || Date.now()]
  );
}

async function newSid(db) {
  const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 8; attempt++) {
    let sid = "";
    const bytes = new Uint8Array(5);
    crypto.getRandomValues(bytes);
    for (const b of bytes) sid += ALPHABET[b % ALPHABET.length];
    const rows = await dbAll(db, "SELECT k FROM sessions WHERE sid = ? AND status = 'open'", [sid]);
    if (!rows.length) return sid;
  }
  return Date.now().toString(36).toUpperCase();
}

async function getOpenSessions(db) {
  const cutoff = Date.now() - SESSION_IDLE_DAYS * 86400 * 1000;
  const rows = await dbAll(
    db,
    "SELECT * FROM sessions WHERE status = 'open' AND updated_at > ? ORDER BY updated_at DESC LIMIT 200",
    [cutoff]
  );
  return rows.map(rowToSession);
}

async function findSessionBySid(db, sid) {
  const rows = await dbAll(
    db,
    "SELECT * FROM sessions WHERE sid = ? AND status = 'open' ORDER BY updated_at DESC LIMIT 1",
    [String(sid).toUpperCase()]
  );
  return rowToSession(db1(rows));
}

// ---------- messages ----------

/** Appends a message (atomic seq bump) and returns it; null when session missing. */
async function pushMsg(db, k, from, text, extra) {
  const sess = await getSession(db, k);
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
  await dbRun(
    db,
    "INSERT INTO messages (k, seq, from_side, text, name, code, ts) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [k, seq, msg.from, msg.text, msg.name, msg.code, msg.ts]
  );
  await dbRun(db, "UPDATE sessions SET seq = ?, updated_at = ? WHERE k = ?", [seq, msg.ts, k]);
  // trim history to the cap
  await dbRun(
    db,
    `DELETE FROM messages WHERE k = ? AND seq <= (SELECT MAX(seq) - ${MSG_CAP} FROM messages WHERE k = ?)`,
    [k, k]
  );
  return msg;
}

async function loadMsgs(db, k, afterSeq, limit) {
  const rows = await dbAll(
    db,
    "SELECT seq, from_side, text, name, code, ts FROM messages WHERE k = ? AND seq > ? ORDER BY seq ASC LIMIT ?",
    [k, Math.max(0, Number(afterSeq) || 0), Math.min(50, Number(limit) || 50)]
  );
  return rows.map((r) => ({ seq: r.seq, from: r.from_side, text: r.text, name: r.name || null, code: r.code || null, ts: r.ts }));
}

async function lastVisitorMsgs(db, k, n) {
  const rows = await dbAll(
    db,
    "SELECT text FROM messages WHERE k = ? AND from_side = 'visitor' ORDER BY seq DESC LIMIT ?",
    [k, n || 5]
  );
  return rows.reverse();
}

// ---------- staff registry ----------

async function getStaff(db, tgId) {
  const rows = await dbAll(db, "SELECT * FROM staff WHERE tg_id = ?", [String(tgId)]);
  const s = db1(rows);
  return s ? { cur: s.cur_k, name: s.name, lastSeen: s.last_seen } : { cur: null, name: null, lastSeen: 0 };
}

async function putStaff(db, tgId, staff) {
  await dbRun(
    db,
    `INSERT INTO staff (tg_id, cur_k, name, last_seen) VALUES (?, ?, ?, ?)
     ON CONFLICT(tg_id) DO UPDATE SET cur_k=excluded.cur_k, name=COALESCE(excluded.name, staff.name), last_seen=excluded.last_seen`,
    [String(tgId), staff.cur || null, staff.name || null, staff.lastSeen || Date.now()]
  );
}

// ---------- Telegram API ----------

async function tgCall(env, method, payload) {
  const token = env && env.TG_BOT_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch("https://api.telegram.org/bot" + token + "/" + method, {
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

// ---------- staff notifications ----------

function sessLabel(sess) {
  return `#${escHtml(sess.sid)}`;
}

function shortUrl(url) {
  try {
    const u = new URL(url);
    return u.host + (u.pathname.length > 34 ? u.pathname.slice(0, 34) + "…" : u.pathname);
  } catch (e) {
    return String(url).slice(0, 40);
  }
}

/** Notify the whole team about a new conversation. */
async function notifyNewConversation(env, db, sess, firstText) {
  const staff = await allStaffIds(db);
  const ids = [...new Set([...staff.superadmins, ...staff.admins, ...staff.coadmins])];
  const text =
    `💬 <b>محادثة زائر جديدة</b> ${sessLabel(sess)}\n` +
    `🌐 اللغة: ${sess.lang === "en" ? "English" : "العربية"}\n` +
    (sess.page ? `🔗 الصفحة: ${escHtml(shortUrl(sess.page))}\n` : "") +
    (firstText ? `👤 الرسالة: ${escHtml(firstText.slice(0, 200))}\n` : "") +
    `\nللرد أرسل: <code>/open ${escHtml(sess.sid)}</code>`;
  const keyboard = { inline_keyboard: [[{ text: "👁 فتح المحادثة", callback_data: "open:" + sess.sid }]] };
  await Promise.all(ids.map((id) => tgSend(env, id, text, { reply_markup: keyboard })));
}

/** Route a visitor message to the assignee, or fan out to all staff when unassigned. */
async function notifyVisitorMessage(env, db, sess, text) {
  if (sess.assignee) {
    return await tgSend(
      env,
      sess.assignee,
      `📨 ${sessLabel(sess)} · ${escHtml(sess.assigneeName || "وكيل")}:\n${escHtml(text.slice(0, 500))}`
    );
  }
  const staff = await allStaffIds(db);
  const ids = [...new Set([...staff.superadmins, ...staff.admins, ...staff.coadmins])];
  const body = `📨 <b>رسالة زائر</b> ${sessLabel(sess)} (بدون وكيل):\n${escHtml(text.slice(0, 500))}`;
  const keyboard = { inline_keyboard: [[{ text: "👁 الرد الآن", callback_data: "open:" + sess.sid }]] };
  await Promise.all(ids.map((id) => tgSend(env, id, body, { reply_markup: keyboard })));
}

export {
  SUPERADMIN_SEED, MSG_CAP, MSG_MAX_LEN, SESSION_IDLE_DAYS, ROLE_AR,
  json, escHtml, validK, rateLimited,
  dbAll, dbRun, db1,
  roleOf, setRole, allStaffIds,
  getSession, putSession, newSid, getOpenSessions, findSessionBySid,
  pushMsg, loadMsgs, lastVisitorMsgs,
  getStaff, putStaff,
  tgCall, tgSend, tgAnswerCallback,
  notifyNewConversation, notifyVisitorMessage, shortUrl, sessLabel,
};
